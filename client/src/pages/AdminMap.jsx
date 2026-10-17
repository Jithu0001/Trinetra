import { useCallback, useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import PotholeMap from '../components/PotholeMap';
import Icon from '../components/Icon';
import { getToken, listPotholes } from '../lib/adminApi';

export default function AdminMap() {
  const [filters, setFilters] = useState({ severity: '', status: '' });
  const [data, setData] = useState({ items: [], total: 0 });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!getToken()) return;
    setLoading(true); setErr('');
    try {
      const q = { page: 1, limit: 100, ...filters };
      Object.keys(q).forEach((k) => q[k] === '' && delete q[k]);
      setData(await listPotholes(q));
    } catch (e) { setErr(e.message); } finally { setLoading(false); }
  }, [filters]);
  useEffect(() => { load(); }, [load]);

  const set = (k, v) => setFilters((f) => ({ ...f, [k]: v }));

  return (
    <AdminLayout title="Map" subtitle="Every reported pothole, colour-coded by severity"
      actions={<button type="button" className="a-btn" onClick={load} disabled={loading}><Icon name="refresh" size={18} className={loading ? 'spin' : ''} />Refresh</button>}>
      <div className="a-filters">
        <label>Severity
          <select value={filters.severity} onChange={(e) => set('severity', e.target.value)}>
            <option value="">All severity</option><option>HIGH</option><option>MEDIUM</option><option>LOW</option>
          </select>
        </label>
        <label>Status
          <select value={filters.status} onChange={(e) => set('status', e.target.value)}>
            <option value="">All status</option><option value="new">New</option><option value="verified">Verified</option><option value="fixed">Fixed</option>
          </select>
        </label>
        <ul className="legend" aria-label="Legend">
          <li><i style={{ background: '#ef4444' }} />High</li>
          <li><i style={{ background: '#f97316' }} />Medium</li>
          <li><i style={{ background: '#22c55e' }} />Low</li>
        </ul>
      </div>

      {err && <div className="a-err" role="alert"><Icon name="alert" size={18} />{err}</div>}

      <div className="map-card">
        <PotholeMap items={data.items} />
        {loading && <div className="map-loading"><i className="lg-spin dark" />Loading...</div>}
      </div>
      <p className="a-note">Showing up to 100 of the latest matching records ({data.total} total).</p>
    </AdminLayout>
  );
}
