const API = import.meta.env.VITE_API_URL || '';
const KEY = 'pothole_admin_token';
export const getToken = () => localStorage.getItem(KEY);
export const logout = () => localStorage.removeItem(KEY);

async function call(path, opts = {}) {
  const token = getToken();
  const res = await fetch(`${API}/api${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (res.status === 401 && path !== '/auth/login') { logout(); window.location.href = '/admin'; throw new Error('Session expired'); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export async function login(email, password) {
  const { token } = await call('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  localStorage.setItem(KEY, token);
}
export const listPotholes = (params) => call('/potholes?' + new URLSearchParams(params));
export const getStats = () => call('/stats');
export const setStatus = (id, status) => call(`/potholes/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
export const removePothole = (id) => call(`/potholes/${id}`, { method: 'DELETE' });
export const mapsLink = (lat, lng) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
