import * as ort from 'onnxruntime-web';

// Must match the pinned version in package.json
ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/';
ort.env.wasm.numThreads = 1;

const SIZE = 416; // must equal the imgsz used when exporting best.onnx
const off = typeof document !== 'undefined' ? document.createElement('canvas') : null;
if (off) { off.width = off.height = SIZE; }
const octx = off && off.getContext('2d', { willReadFrequently: true });

export const loadModel = (url) => ort.InferenceSession.create(url, { executionProviders: ['wasm'] });

export const severityFromScore = (s) => (s < 35 ? 'LOW' : s < 65 ? 'MEDIUM' : 'HIGH');

// Score 0-100 from how big the pothole looks + how sure the model is. Calibrate on real roads.
export function computeScore(box, vw, vh) {
  const area = (box.w * box.h) / (vw * vh);
  const size = Math.min(area / 0.15, 1);
  return Math.round(100 * (0.7 * size + 0.3 * box.conf));
}

const iouOf = (a, b) => {
  const x1 = Math.max(a.x, b.x), y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.w, b.x + b.w), y2 = Math.min(a.y + a.h, b.y + b.h);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  return inter / (a.w * a.h + b.w * b.h - inter || 1);
};

export function nms(boxes, thr = 0.45) {
  const sorted = [...boxes].sort((a, b) => b.conf - a.conf), keep = [];
  for (const b of sorted) if (keep.every((k) => iouOf(k, b) < thr)) keep.push(b);
  return keep;
}

// Returns boxes in the video's own pixel coordinates: [{x, y, w, h, conf}]
export async function detect(session, video, conf = 0.5) {
  const vw = video.videoWidth, vh = video.videoHeight;
  if (!vw || !vh) return [];
  // letterbox: keep aspect ratio, pad with grey (same as training)
  const r = Math.min(SIZE / vw, SIZE / vh);
  const nw = Math.round(vw * r), nh = Math.round(vh * r);
  const dx = Math.floor((SIZE - nw) / 2), dy = Math.floor((SIZE - nh) / 2);
  octx.fillStyle = 'rgb(114,114,114)'; octx.fillRect(0, 0, SIZE, SIZE);
  octx.drawImage(video, dx, dy, nw, nh);
  const { data } = octx.getImageData(0, 0, SIZE, SIZE);
  const n = SIZE * SIZE, input = new Float32Array(3 * n);
  for (let i = 0; i < n; i++) {
    input[i] = data[i * 4] / 255; input[n + i] = data[i * 4 + 1] / 255; input[2 * n + i] = data[i * 4 + 2] / 255;
  }
  const out = await session.run({ [session.inputNames[0]]: new ort.Tensor('float32', input, [1, 3, SIZE, SIZE]) });
  const o = out[session.outputNames[0]];
  if (o.dims[1] !== 5) throw new Error('Unexpected model output shape: ' + o.dims.join('x'));
  const N = o.dims[2], d = o.data, boxes = [];
  for (let i = 0; i < N; i++) {
    const s = d[4 * N + i];
    if (s < conf) continue;
    const cx = d[i], cy = d[N + i], w = d[2 * N + i], h = d[3 * N + i];
    const x = Math.max(0, (cx - w / 2 - dx) / r), y = Math.max(0, (cy - h / 2 - dy) / r);
    boxes.push({ x, y, w: Math.min(vw - x, w / r), h: Math.min(vh - y, h / r), conf: s });
  }
  return nms(boxes);
}
