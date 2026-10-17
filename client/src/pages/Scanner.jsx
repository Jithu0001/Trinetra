import { useEffect, useRef, useState } from 'react';
import { loadModel, detect, computeScore, severityFromScore } from '../lib/detector';
import { Link } from 'react-router-dom';
import { enqueueUpload, pendingUploads } from '../lib/api';
import Logo from '../components/Logo';
import Icon from '../components/Icon';
import '../scanner.css';

// Tune these on real roads
const CFG = {
  conf: 0.5,            // min model confidence to show a box
  strongConf: 0.7,      // one detection this sure is saved immediately
  needHits: 2,          // otherwise: this many hits...
  windowFrames: 4,      // ...within the last N frames
  restCooldownMs: 5000, // standing still: min gap between saves
  minGapMs: 700,        // moving: min gap between saves
  rearmMisses: 4,       // frames with no pothole before the next one can be saved
  rearmMeters: 20,      // ...or distance travelled since the last save
  maxAccuracy: 30,      // ignore GPS worse than this (metres)
  maxFixAgeS: 3,        // ignore GPS fixes older than this (seconds)
  movingSpeed: 3,       // m/s (about 11 km/h) counts as "moving"
  aheadM: 0,            // optional: metres from phone to pothole when moving (try 3-5)
  ignoreTop: 0.35,      // ignore boxes centred in the top 35% (far away)
};

const toRad = (d) => (d * Math.PI) / 180;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function distM(a, b) {
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(x));
}

// GPS updates about once a second, but at 40 km/h you move ~11 m per second.
// So we push the last fix forward along the direction of travel by (speed x age).
function estimatePosition(fix, now) {
  if (!fix) return null;
  const age = (now - fix.t) / 1000;
  if (age > CFG.maxFixAgeS) return null;
  const speed = fix.speed || 0;
  const base = { lat: fix.lat, lng: fix.lng, acc: fix.acc, speed };
  if (speed < 1 || fix.heading == null || Number.isNaN(fix.heading)) return base;
  const d = speed * Math.max(0, age) + CFG.aheadM, h = toRad(fix.heading);
  return {
    ...base,
    lat: fix.lat + (d * Math.cos(h)) / 111320,
    lng: fix.lng + (d * Math.sin(h)) / (111320 * Math.cos(toRad(fix.lat))),
  };
}

function captureFrame(video, box) {
  const scale = Math.min(1, 800 / video.videoWidth);
  const c = document.createElement('canvas');
  c.width = Math.round(video.videoWidth * scale); c.height = Math.round(video.videoHeight * scale);
  const ctx = c.getContext('2d');
  ctx.drawImage(video, 0, 0, c.width, c.height);
  ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 3;
  ctx.strokeRect(box.x * scale, box.y * scale, box.w * scale, box.h * scale);
  return new Promise((res) => c.toBlob(res, 'image/jpeg', 0.7));
}

export default function Scanner() {
  const videoRef = useRef(null), overlayRef = useRef(null), gpsRef = useRef(null);
  const [status, setStatus] = useState('Loading AI model...');
  const [error, setError] = useState('');
  const [gps, setGps] = useState(null);
  const [last, setLast] = useState(null);
  const [count, setCount] = useState(0);
  const [fps, setFps] = useState(0);
  const [pending, setPending] = useState(0);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let stop = false, stream, watchId, wake;
    const getWake = async () => { try { wake = await navigator.wakeLock?.request('screen'); } catch { /* not supported */ } };
    const onVisible = () => { if (document.visibilityState === 'visible') getWake(); };

    (async () => {
      try {
        setError(''); setStatus('Loading AI model...');
        const session = await loadModel('/model/best.onnx');
        if (stop) return;
        setStatus('Starting camera...');
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
          audio: false,
        });
        if (stop) { stream.getTracks().forEach((t) => t.stop()); return; }
        const v = videoRef.current; v.srcObject = stream; await v.play();

        getWake(); document.addEventListener('visibilitychange', onVisible); // keep screen on while riding
        watchId = navigator.geolocation.watchPosition(
          (p) => {
            const c = p.coords;
            const fix = { lat: c.latitude, lng: c.longitude, acc: c.accuracy, speed: c.speed, heading: c.heading, t: p.timestamp };
            gpsRef.current = fix; setGps(fix);
          },
          (e) => setError('Location error: ' + e.message),
          { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
        );
        setStatus('Scanning');

        // detection state
        const hits = [];
        let armed = true, misses = 0, lastSent = 0, lastPos = null;

        const tick = async () => {
          const dets = (await detect(session, v, CFG.conf)).filter((d) => d.y + d.h / 2 > v.videoHeight * CFG.ignoreTop);

          // draw boxes
          const oc = overlayRef.current; oc.width = v.videoWidth; oc.height = v.videoHeight;
          const ctx = oc.getContext('2d'); ctx.clearRect(0, 0, oc.width, oc.height);
          ctx.lineWidth = Math.max(3, oc.width / 200); ctx.strokeStyle = '#ef4444'; ctx.fillStyle = '#ef4444';
          ctx.font = `${Math.max(14, oc.width / 40)}px sans-serif`;
          for (const d of dets) { ctx.strokeRect(d.x, d.y, d.w, d.h); ctx.fillText(`pothole ${d.conf.toFixed(2)}`, d.x, Math.max(16, d.y - 6)); }

          const now = Date.now();
          const pos = estimatePosition(gpsRef.current, now);
          const moving = !!pos && pos.speed >= CFG.movingSpeed;

          hits.push(dets.length > 0); if (hits.length > CFG.windowFrames) hits.shift();
          misses = dets.length ? 0 : misses + 1;

          // one save per pothole "appearance": re-arm once it is gone, we moved on, or (standing still) time passed
          if (!armed && (misses >= CFG.rearmMisses ||
              (pos && lastPos && distM(pos, lastPos) > CFG.rearmMeters) ||
              (!moving && now - lastSent > CFG.restCooldownMs))) armed = true;

          const strong = dets.some((d) => d.conf >= CFG.strongConf);
          const confirmed = strong || hits.filter(Boolean).length >= CFG.needHits;
          const gapOk = now - lastSent > (moving ? CFG.minGapMs : CFG.restCooldownMs);

          if (armed && dets.length && confirmed && gapOk && pos && pos.acc <= CFG.maxAccuracy) {
            armed = false; lastSent = now; lastPos = pos; hits.length = 0;
            const best = dets.reduce((a, b) => (b.conf > a.conf ? b : a));
            const score = computeScore(best, v.videoWidth, v.videoHeight);
            const severity = severityFromScore(score);
            const blob = await captureFrame(v, best);
            const id = now;
            setLast({ id, severity, score, state: 'saving' });
            enqueueUpload(
              { blob, lat: pos.lat, lng: pos.lng, accuracy: pos.acc, score, confidence: best.conf, bbox: [best.x, best.y, best.w, best.h] },
              (r) => {
                if (r.ok) setCount((c) => c + 1);
                setLast((l) => (l && l.id === id ? { ...l, state: r.ok ? (r.merged ? 'merged' : 'saved') : 'failed' } : l));
              }
            );
          }
        };

        // run as fast as the phone allows (no fixed delay), skip duplicate frames
        let lastT = -1, frames = 0, fpsT = performance.now();
        while (!stop) {
          if (v.currentTime === lastT) { await sleep(8); continue; }
          lastT = v.currentTime;
          try { await tick(); } catch (e) { setError(e.message); await sleep(500); }
          frames += 1;
          const t = performance.now();
          if (t - fpsT >= 1000) { setFps((frames * 1000) / (t - fpsT)); setPending(pendingUploads()); frames = 0; fpsT = t; }
          await sleep(0);
        }
      } catch (e) { if (!stop) { setError(e.message || String(e)); setStatus('Stopped'); } }
    })();

    return () => {
      stop = true;
      document.removeEventListener('visibilitychange', onVisible);
      wake?.release?.().catch(() => {});
      stream?.getTracks().forEach((t) => t.stop());
      if (watchId != null) navigator.geolocation.clearWatch(watchId);
    };
  }, [attempt]);

  const kmh = gps && gps.speed != null ? Math.round(gps.speed * 3.6) : null;
  const stateText = { saving: '(saving...)', saved: '(saved)', merged: '(already reported nearby, count +1)', failed: '(upload failed)' };
  const live = status === 'Scanning';
  const stopped = status === 'Stopped';
  const booting = !live && !stopped;

  return (
    <div className="scan">
      <video ref={videoRef} className="layer" playsInline muted />
      <canvas ref={overlayRef} className="layer" style={{ background: 'transparent' }} />

      <header className="scan-top">
        <Link to="/" className="scan-brand" aria-label="Trinetra home"><Logo size={26} /><span>Trinetra</span></Link>
        <div className={`scan-pill ${live ? 'live' : ''}`}><i />{status}<em>{fps.toFixed(1)} fps</em></div>
        <Link to="/" className="scan-exit" aria-label="Stop scanning and leave"><Icon name="close" size={20} /></Link>
      </header>

      {booting && (
        <div className="scan-boot" role="status">
          <Logo size={76} />
          <p>{status}</p>
          <small>Allow camera and location when your browser asks.</small>
        </div>
      )}

      {stopped && (
        <div className="scan-boot scan-stopped" role="alert">
          <Icon name="alert" size={38} />
          <p>Scanning stopped</p>
          <small>{error || 'Something went wrong.'}</small>
          <div className="scan-actions">
            <button type="button" className="scan-btn" onClick={() => setAttempt((a) => a + 1)}>Try again</button>
            <Link to="/" className="scan-btn ghost">Back to home</Link>
          </div>
        </div>
      )}

      <footer className="scan-hud">
        {error && !stopped && (
          <div className="scan-alert" role="alert">
            <Icon name="alert" size={18} /><span>{error}</span>
            <button type="button" onClick={() => setAttempt((a) => a + 1)}>Retry</button>
          </div>
        )}
        {fps > 0 && fps < 6 && gps && (gps.speed || 0) > 7 && (
          <div className="scan-alert" role="status"><Icon name="alert" size={18} /><span>Scanning is slow ({fps.toFixed(1)} fps): potholes may be missed at this speed.</span></div>
        )}
        <div className="hud-tiles">
          <div className="hud-tile"><span>Speed</span><b>{kmh != null ? kmh : '-'}<small> km/h</small></b></div>
          <div className="hud-tile"><span>GPS accuracy</span><b>{gps ? `±${Math.round(gps.acc)}` : '...'}<small> m</small></b></div>
          <div className="hud-tile"><span>Saved</span><b>{count}</b></div>
        </div>
        <div className="hud-line"><Icon name="pin" size={15} />{gps ? `${gps.lat.toFixed(5)}, ${gps.lng.toFixed(5)}` : 'Waiting for location...'}</div>
        {last && <div className="hud-line">Last: <span className={`chip ${last.severity}`}>{last.severity}</span> score {last.score} {stateText[last.state]}</div>}
        {pending > 0 && <div className="hud-line">Waiting to upload: {pending}</div>}
      </footer>
    </div>
  );
}
