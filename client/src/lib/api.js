const API = import.meta.env.VITE_API_URL || ''; // '' in dev (Vite proxies /api), Render URL in production

export async function uploadPothole({ blob, lat, lng, accuracy, score, confidence, bbox }) {
  const fd = new FormData();
  fd.append('image', blob, 'pothole.jpg');
  fd.append('lat', lat); fd.append('lng', lng); fd.append('accuracy', Math.round(accuracy));
  fd.append('score', score); fd.append('confidence', confidence.toFixed(3));
  fd.append('bbox', JSON.stringify(bbox.map(Math.round)));
  const res = await fetch(`${API}/api/potholes`, { method: 'POST', body: fd });
  if (!res.ok) {
    const err = new Error((await res.json().catch(() => ({}))).error || `Upload failed (${res.status})`);
    // 4xx (except busy/timeout) means the data itself is bad: retrying will not help
    err.fatal = res.status >= 400 && res.status < 500 && res.status !== 429 && res.status !== 408;
    throw err;
  }
  return res.json();
}

// Upload queue: while riding, mobile data drops. Detections wait here and are retried (in memory).
const queue = [];
let running = false;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const pendingUploads = () => queue.length;

export function enqueueUpload(item, onDone) {
  if (queue.length >= 50) queue.shift(); // keep memory bounded: drop the oldest
  queue.push({ item, onDone, tries: 0 });
  run();
}

async function run() {
  if (running) return;
  running = true;
  while (queue.length) {
    const job = queue[0];
    try {
      const r = await uploadPothole(job.item);
      queue.shift(); job.onDone?.({ ok: true, merged: !!r.merged });
    } catch (e) {
      job.tries += 1;
      if (e.fatal || job.tries >= 20) { queue.shift(); job.onDone?.({ ok: false, error: e.message }); }
      else await sleep(Math.min(30000, 2000 * job.tries));
    }
  }
  running = false;
}