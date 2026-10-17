import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo';
import Icon from '../components/Icon';
import Reveal from '../components/Reveal';
import { clamp, useRafScroll, useInView, useCountUp } from '../hooks/useScroll';
import heroVideo from '../assets/roadway_4k_enhanced.mp4';
import heroPoster from '../assets/hero-poster.jpg';
import '../landing.css';

const NAV = [
  
  ['#about', 'About'],
  ['#how', 'How it works'],
  ['#features', 'Features'],
  ['#scoring', 'Scoring'],
  ['#faq', 'FAQ'],
];

/* a small hand-drawn arrow used with the Caveat notes */
const Squiggle = ({ className = '' }) => (
  <svg className={className} viewBox="0 0 90 60" width="90" height="60" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 8c22-6 52-2 62 22 3 8 2 15 0 22" />
    <path d="M54 44l12 8 8-12" />
  </svg>
);

/* ------------------------------------------------------------------ header */
function Header() {
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);
  const barRef = useRef(null);

  useRafScroll((y) => {
    setSolid(y > 24);
    const max = document.documentElement.scrollHeight - window.innerHeight;
    barRef.current?.style.setProperty('--sp', max > 0 ? clamp(y / max) : 0);
  });

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <header className={`nav ${solid ? 'is-solid' : ''} ${open ? 'is-open' : ''}`} >
      <div className="nav-inner">
        <a href="#top" className="nav-brand" onClick={() => setOpen(false)}>
          <Logo size={30} /><span>Trinetra</span>
        </a>
        <nav className="nav-links" aria-label="Primary">
          {NAV.map(([href, label]) => <a key={href} href={href}>{label}</a>)}
        </nav>
        <div className="nav-actions">
          <Link to="/admin" className="nav-admin">Admin</Link>
          <Link to="/scan" className="btn btn-ink btn-sm">Start reporting</Link>
          <button className="nav-toggle" aria-expanded={open} aria-controls="mobile-menu"
            aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen((o) => !o)}>
            <Icon name={open ? 'close' : 'menu'} size={22} />
          </button>
        </div>
      </div>
      <div className="nav-progress" ref={barRef} />
      <div id="mobile-menu" className="nav-drawer">
        {NAV.map(([href, label]) => <a key={href} href={href} onClick={() => setOpen(false)}>{label}</a>)}
        <Link to="/admin" onClick={() => setOpen(false)}>Admin sign in</Link>
        <Link to="/scan" className="btn btn-ink">Start reporting</Link>
      </div>
    </header>
  );
}

/* -------------------------------------------------------------------- hero */
function Hero() {
  const heroRef = useRef(null);
  const vref = useRef(null);
  const paused = useRef(false);
  const [ready, setReady] = useState(false);
  const [dip, setDip] = useState(false);
  const [playVideo, setPlayVideo] = useState(true);

  // Skip the 100 MB video for data-saver users and people who asked for less motion. The poster stays.
  useEffect(() => {
    const saveData = navigator.connection?.saveData;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (saveData || reduce) setPlayVideo(false);
  }, []);

  // Scroll-linked hero: content drifts up and fades, video eases in scale. No blur is ever applied to the footage.
  useRafScroll((y, vh) => {
    const p = clamp(y / vh);
    heroRef.current?.style.setProperty('--hp', p.toFixed(4));
    const v = vref.current;
    if (!v) return;
    const off = y > vh * 1.15; // fully covered by the page: stop decoding 4K frames
    if (off && !paused.current) { paused.current = true; v.pause(); }
    else if (!off && paused.current) { paused.current = false; v.play().catch(() => {}); }
  });

  // Soft loop: dip to dark just before the clip restarts so the jump is never visible.
  const onTime = () => {
    const v = vref.current;
    if (!v || !v.duration) return;
    setDip(v.duration - v.currentTime < 0.8 && v.currentTime > 1);
  };

  const word = 'Trinetra'.split('');

  return (
    <section className="hero" id="topSection" ref={heroRef} style={{ '--poster': `url(${heroPoster})` }}>
      <div className="hero-media">
        {playVideo && (
          <video
            ref={vref}
            className={`hero-video ${ready ? 'is-ready' : ''}`}
            src={heroVideo}
            poster={heroPoster}
            autoPlay muted loop playsInline preload="auto"
            onCanPlay={() => setReady(true)}
            onTimeUpdate={onTime}
            aria-hidden="true"
          />
        )}
        <div className={`hero-dip ${dip ? 'on' : ''}`} />
        <div className="hero-scrim" />
        <div className="hero-cover" />
      </div>

      <div className="hero-content">
        <h1 className="wordmark" aria-label="Trinetra">
          <span className="wm-mask" aria-hidden="true">
            {word.map((ch, i) => <span key={i} className="wm-l" style={{ '--i': i }}>{ch}</span>)}
          </span>
        </h1>
        <p className="hero-tag">An AI that never blinks</p>
        <p className="hero-sub">Point your phone at the road. Trinetra spots potholes, pins their location and sends them for repair.</p>
        <div className="hero-cta">
          <Link to="/scan" className="btn btn-hero">
            <Icon name="camera" size={22} />
            <span>Start reporting</span>
          </Link>
          <span className="hand hero-hand" aria-hidden="true"><Squiggle />no app to install</span>
        </div>
        <p className="hero-note">Your browser will ask for camera and location access.</p>
      </div>
      <br />

      <a href="#about" className="scroll-cue" aria-label="Scroll to learn more"><i /></a>
    </section>
  );
}

/* ------------------------------------------------------ about (word reveal) */
const ABOUT =
  'Roads fail one pothole at a time, and most are reported only after the damage is done. Trinetra turns every phone into a road inspector. It watches the lane ahead, spots potholes as you travel and sends each one to the people who can fix it.';

function About() {
  const ref = useRef(null);
  const words = ABOUT.split(' ');

  useRafScroll((y, vh) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const p = clamp((vh * 0.85 - r.top) / (vh * 0.45 + r.height));
    el.style.setProperty('--p', p.toFixed(4));
  });

  return (
    <section className="sec about-sec" id="about">
      <div className="wrap about">
        <p className="about-text" ref={ref} style={{ '--n': words.length }}>
          {words.map((w, i) => (<span key={i}><span className="w" style={{ '--i': i }}>{w}</span>{' '}</span>))}
        </p>
      </div>
    </section>
  );
}

function Stat({ to, prefix = '', suffix = '', label, note }) {
  const [ref, seen] = useInView({ threshold: 0.4 });
  const n = useCountUp(to, seen);
  return (
    <div className="stat" ref={ref}>
      <b>{prefix}{n}{suffix}</b>
      <span>{label}</span>
      <small>{note}</small>
    </div>
  );
}

function Numbers() {
  return (
    <section className="numbers">
      <div className="wrap numbers-grid">
        <Reveal delay={0}><Stat to={3} label="severity levels" note="Low, Medium and High, scored 0 to 100" /></Reveal>
        <Reveal delay={90}><Stat to={30} prefix="≤ " suffix=" m" label="location accuracy" note="Weaker GPS fixes are ignored" /></Reveal>
        <Reveal delay={180}><Stat to={1} label="photo per pothole" note="Your video never leaves the phone" /></Reveal>
        <Reveal delay={270}><Stat to={20} label="upload retries" note="For when the signal drops mid-ride" /></Reveal>
      </div>
    </section>
  );
}

/* ----------------------------------------------- how it works (pinned scroll) */
const STEPS = [
  { title: 'Open Trinetra and point', body: 'Tap Start reporting. Trinetra asks for camera and location, then starts watching the road ahead. Mount the phone on your dashboard or handlebar.' },
  { title: 'The AI spots potholes', body: 'A detection model runs inside your browser and boxes every pothole it sees, frame after frame. Nothing is streamed anywhere.' },
  { title: 'Location and severity', body: 'Each confirmed pothole is pinned to your GPS position, adjusted for your speed, and scored from 0 to 100 by its size and the model’s confidence.' },
  { title: 'The report reaches the admin', body: 'A photo with the box, the location and the severity is sent. Nearby duplicates merge into one record with a higher report count.' },
];

function Phone({ step }) {
  return (
    <div className="phone" data-step={step} aria-hidden="true">
      <div className="phone-screen">
        <svg className="scene" viewBox="0 0 300 560" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="sc-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#d9dde3" />
              <stop offset="1" stopColor="#f6e4d3" />
            </linearGradient>
            <linearGradient id="sc-road" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#5a5f69" />
              <stop offset="1" stopColor="#1b1d22" />
            </linearGradient>
          </defs>
          <rect width="300" height="560" fill="#8f9399" />
          <rect width="300" height="206" fill="url(#sc-sky)" />
          <polygon points="0,206 300,206 300,560 0,560" fill="#9a9d94" />
          <polygon points="140,205 160,205 340,560 -40,560" fill="url(#sc-road)" />
          <line className="dash" x1="140" y1="205" x2="-40" y2="560" />
          <line className="dash" x1="160" y1="205" x2="340" y2="560" />
          <line className="dash mid" x1="150" y1="205" x2="150" y2="560" />
          <g className="approach">
            <path d="M135 418c6-14 30-20 48-12 16 7 24 20 12 28-14 10-44 10-58 0-5-4-5-10-2-16z" fill="#0b0c0f" stroke="#3b3f47" strokeWidth="2" />
            <g className={`det ${step >= 1 ? 'show' : ''}`} fill="none" stroke="#ff5a1f" strokeWidth="2.5">
              <rect x="124" y="394" width="82" height="52" rx="3" vectorEffect="non-scaling-stroke" />
            </g>
          </g>
        </svg>

        <div className="ph-top"><span className="ph-dot" />Scanning<em className={step >= 1 ? 'show' : ''}>1 pothole · 0.87</em></div>
        <div className={`ph-reticle ${step === 0 ? 'show' : ''}`}><i /><i /><i /><i /></div>
        <div className={`ph-card ph-gps ${step >= 2 ? 'show' : ''}`}>
          <Icon name="pin" size={16} /><span>28.61390, 77.20900</span>
          <span className="chip MEDIUM">MEDIUM</span><b>52</b>
        </div>
        <div className={`ph-card ph-toast ${step >= 3 ? 'show' : ''}`}>
          <Icon name="check" size={16} /><span>Report sent. Admin notified.</span>
        </div>
      </div>
    </div>
  );
}

function HowItWorks() {
  const ref = useRef(null);
  const [active, setActive] = useState(0);
  const [pinned, setPinned] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 900px)');
    const on = () => setPinned(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  // Small screens: no pinning, the phone simply cycles through the story.
  useEffect(() => {
    if (pinned) return undefined;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return undefined;
    const t = setInterval(() => setActive((a) => (a + 1) % STEPS.length), 2600);
    return () => clearInterval(t);
  }, [pinned]);

  useRafScroll((y, vh) => {
    const el = ref.current;
    if (!el || !pinned) return;
    const r = el.getBoundingClientRect();
    const p = clamp(-r.top / Math.max(1, r.height - vh));
    el.style.setProperty('--fp', p.toFixed(4));
    setActive(Math.min(STEPS.length - 1, Math.floor(p * STEPS.length)));
  });

  const jump = (i) => {
    const el = ref.current;
    if (!el || !pinned) { setActive(i); return; }
    const total = el.offsetHeight - window.innerHeight;
    const top = el.getBoundingClientRect().top + window.scrollY + (i / STEPS.length) * total + 6;
    window.scrollTo({ top, behavior: 'smooth' });
  };

  return (
    <section className="how" id="how" ref={ref} style={{ '--steps': STEPS.length }}>
      <div className="how-sticky">
        <div className="wrap how-inner">
          <Reveal as="h2" variant="clip" className="h2 how-h2">From a camera frame to a repair ticket in four steps</Reveal>
          <div className="how-grid">
            <ol className="how-steps">
              {STEPS.map((s, i) => (
                <li key={s.title} className={i === active ? 'on' : i < active ? 'done' : ''}>
                  <button type="button" onClick={() => jump(i)} aria-current={i === active ? 'step' : undefined}>
                    <span className="how-n">{i + 1}</span>
                    <span className="how-copy">
                      <h3>{s.title}</h3>
                      <span className="how-body"><span>{s.body}</span></span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
            <div className="how-visual">
              <Phone step={active} />
              <span className={`hand how-note ${active >= 1 ? 'show' : ''}`} aria-hidden="true">that’s a pothole!<Squiggle /></span>
            </div>
          </div>
          <div className="how-bar" aria-hidden="true"><i /></div>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------- features grid */
function Features() {
  return (
    <section className="sec features" id="features">
      <div className="wrap">
        <Reveal as="h2" variant="clip" className="h2">Everything between the pothole and the repair</Reveal>
        <Reveal className="spec" delay={80}>
          <article className="cell c7">
            <div className="mini-frame" aria-hidden="true"><i className="mini-box" /><i className="mini-scan" /></div>
            <Icon name="scan" size={24} />
            <h3>Detection that runs on your phone</h3>
            <p>The AI model works inside the browser, so potholes are found in real time without sending your camera feed to a server.</p>
          </article>
          <article className="cell c5">
            <Icon name="gauge" size={24} />
            <h3>Severity you can act on</h3>
            <p>Every report carries a 0 to 100 score and a Low, Medium or High label, so crews know where to go first.</p>
            <div className="dots" aria-hidden="true"><i className="LOW" /><i className="MEDIUM" /><i className="HIGH" /></div>
          </article>
          <article className="cell c4">
            <Icon name="layers" size={24} />
            <h3>One pothole, one record</h3>
            <p>Report the same spot twice and the records merge. The report count goes up instead of the list getting longer.</p>
          </article>
          <article className="cell c4">
            <Icon name="wifi" size={24} />
            <h3>Built for weak signal</h3>
            <p>If the connection drops, detections wait in a queue and retry on their own.</p>
          </article>
          <article className="cell c4">
            <Icon name="phone" size={24} />
            <h3>Screen stays awake</h3>
            <p>Where the browser allows it, Trinetra keeps the display on so a long ride is never cut short.</p>
          </article>
          <article className="cell c12 cell-row">
            <div>
              <Icon name="map" size={24} />
              <h3>Admin map and dashboard</h3>
              <p>Admins see every report on a live map, filter by severity or status, and open turn-by-turn directions in one tap.</p>
            </div>
            <div className="mini-map" aria-hidden="true"><i className="d1" /><i className="d2" /><i className="d3" /><i className="d4" /></div>
          </article>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------- scoring playground */
const sevOf = (s) => (s < 35 ? 'LOW' : s < 65 ? 'MEDIUM' : 'HIGH');

function Scoring() {
  const [size, setSize] = useState(12); // % of the frame the pothole covers
  const [conf, setConf] = useState(82); // model confidence, %
  const area = size / 100;
  const score = Math.round(100 * (0.7 * Math.min(area / 0.15, 1) + 0.3 * (conf / 100)));
  const sev = sevOf(score);
  const side = Math.sqrt(area) * 100;

  return (
    <section className="sec scoring" id="scoring">
      <div className="wrap">
        <Reveal as="h2" variant="clip" className="h2">See how Trinetra scores a pothole</Reveal>
        <Reveal as="p" className="lead">Bigger and more certain means higher priority. Move the sliders to see the score and severity a report would get.</Reveal>

        <div className="score-grid">
          <Reveal variant="left" className="score-frame" aria-hidden="true">
            <div className="frame">
              <div className="frame-road" />
              <div className={`frame-box ${sev}`} style={{ width: `${side}%`, height: `${side}%` }}><span>{conf}%</span></div>
            </div>
          </Reveal>

          <Reveal variant="right" className="score-panel">
            <div className="score-read">
              <b className="score-num">{score}</b>
              <span className={`chip ${sev}`}>{sev}</span>
            </div>
            <div className="meter" aria-hidden="true">
              <i style={{ left: `${score}%` }} />
            </div>
            <label className="slider">
              <span>Pothole size in frame <b>{size}%</b></span>
              <input type="range" min="1" max="30" value={size} onChange={(e) => setSize(+e.target.value)} />
            </label>
            <label className="slider">
              <span>Model confidence <b>{conf}%</b></span>
              <input type="range" min="50" max="100" value={conf} onChange={(e) => setConf(+e.target.value)} />
            </label>
          </Reveal>
        </div>

        <Reveal as="ul" className="sev-list">
          <li><i className="LOW" /><b>Low</b><span>0 to 34</span><p>Small or uncertain. Logged for routine review.</p></li>
          <li><i className="MEDIUM" /><b>Medium</b><span>35 to 64</span><p>Clearly visible. Worth scheduling a repair.</p></li>
          <li><i className="HIGH" /><b>High</b><span>65 to 100</span><p>Large and confident. Check these first.</p></li>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- admin teaser */
function AdminTeaser() {
  const ref = useRef(null);
  useRafScroll((y, vh) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const p = clamp((vh - r.top) / (vh + r.height * 0.4));
    el.style.setProperty('--tp', p.toFixed(4));
  });
  return (
    <section className="sec admin-teaser">
      <div className="wrap teaser-grid">
        <div>
          <Reveal as="h2" variant="clip" className="h2">A control room for every report</Reveal>
          <Reveal as="p" className="lead">Review new reports, verify them, navigate to the spot and mark each one fixed. The dashboard shows how many are waiting and how bad they are.</Reveal>
          <Reveal as="ul" className="ticks">
            <li><Icon name="check" size={18} />Filter by severity and status</li>
            <li><Icon name="check" size={18} />See every pothole on one map</li>
            <li><Icon name="check" size={18} />Open directions in Google Maps</li>
          </Reveal>
          <Reveal><Link to="/admin" className="btn btn-ghost">Open the admin panel<Icon name="arrow" size={18} /></Link></Reveal>
        </div>
        <div className="mock" ref={ref} aria-hidden="true">
          <div className="mock-bar"><i /><i /><i /></div>
          <div className="mock-body">
            <div className="mock-cards">
              <div className="mc"><span>Total</span><b>128</b></div>
              <div className="mc"><span><i className="HIGH" />High</span><b>21</b></div>
              <div className="mc"><span><i className="MEDIUM" />Medium</span><b>47</b></div>
              <div className="mc"><span><i className="LOW" />Low</span><b>60</b></div>
            </div>
            <div className="mock-chart">
              {[38, 62, 45, 78, 52, 90, 66, 84].map((h, i) => <i key={i} style={{ '--h': `${h}%`, '--i': i }} />)}
            </div>
            <div className="mock-rows"><i /><i /><i /></div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------------- faq */
const FAQ = [
  ['Do I need to install an app?', 'No. Trinetra runs in your mobile browser. Open the site, tap Start reporting and allow camera and location access.'],
  ['Is my camera video uploaded?', 'No. Detection happens on your device. Only a single still photo of each detected pothole is uploaded, along with its location and score.'],
  ['What happens if my signal drops?', 'Detections wait in a queue and are retried automatically. Keep the page open until the queue is empty.'],
  ['How accurate is the location?', 'Trinetra ignores GPS fixes worse than 30 metres or older than 3 seconds, and it adjusts the position for your speed and direction.'],
  ['Why does the screen stay on?', 'Where your browser supports it, Trinetra asks to keep the screen awake so scanning does not stop in the middle of a ride.'],
  ['Who sees the reports?', 'Signed-in admins see them on the dashboard and the map, where they can verify a report and mark it fixed.'],
];

function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <section className="sec faq" id="faq">
      <div className="wrap faq-grid">
        <div>
          <Reveal as="h2" variant="clip" className="h2">Questions, answered</Reveal>
          <Reveal as="p" className="lead">Still unsure? Open the scanner and try it. It takes one tap.</Reveal>
        </div>
        <div className="faq-list">
          {FAQ.map(([q, a], i) => (
            <Reveal key={q} className={`qa ${open === i ? 'open' : ''}`} delay={i * 50}>
              <button type="button" aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)}>
                <span>{q}</span><Icon name="chevron" size={20} />
              </button>
              <div className="qa-a"><p>{a}</p></div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- cta+footer */
function Cta() {
  return (
    <section className="cta">
      <div className="wrap">
        <Reveal variant="scale" className="cta-card">
          <Logo size={50} />
          <h2 className="cta-h">Every pothole you pass is one you can report</h2>
          <p>It takes a tap. Trinetra does the watching.</p>
          <div className="hero-cta">
            <Link to="/scan" className="btn btn-hero btn-light"><Icon name="camera" size={22} /><span>Start reporting</span></Link>
            <span className="hand cta-hand" aria-hidden="true"><Squiggle />go on, try it</span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="wrap footer-grid">
        <div className="footer-brand">
          <a href="#topSection" className="nav-brand"><Logo size={30} /><span>Trinetra</span></a>
          <p>An AI that never blinks.</p>
        </div>
        <nav aria-label="Explore">
          <h4>Explore</h4>
          {NAV.map(([href, label]) => <a key={href} href={href}>{label}</a>)}
        </nav>
        <nav aria-label="Get started">
          <h4>Get started</h4>
          <Link to="/scan">Start reporting</Link>
          <Link to="/admin">Admin sign in</Link>
        </nav>
      </div>
      <div className="wrap footer-base">
        <span>© {new Date().getFullYear()} Trinetra. Safer roads, one report at a time.</span>
        <a href="#top">Back to top</a>
      </div>
      <div className="footer-mark" aria-hidden="true">Trinetra</div>
    </footer>
  );
}

/* -------------------------------------------------------------------- page */
export default function Landing() {
  useEffect(() => { document.title = 'Trinetra | An AI that never blinks'; }, []);
  return (
    <div className="landing">
      <Header />
      <main>
        <Hero />
        <div className="page">
          <About />
          <Numbers />
          <HowItWorks />
          <Features />
          <Scoring />
          <AdminTeaser />
          <Faq />
          <Cta />
          <Footer />
        </div>
      </main>
    </div>
  );
}
