export function timeAgo(date) {
  const s = Math.max(0, Math.round((Date.now() - new Date(date).getTime()) / 1000));
  if (s < 60) return 'just now';
  const m = Math.round(s / 60); if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60); if (h < 24) return `${h} hr ago`;
  const d = Math.round(h / 24); if (d < 30) return `${d} day${d === 1 ? '' : 's'} ago`;
  return new Date(date).toLocaleDateString();
}
export const coords = (p) => {
  const [lng, lat] = p.location.coordinates;
  return { lat, lng, text: `${lat.toFixed(5)}, ${lng.toFixed(5)}` };
};
