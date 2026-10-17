import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import Icon from '../components/Icon';
import { getToken, listPotholes, setStatus, removePothole, mapsLink } from '../lib/adminApi';
import { coords } from '../lib/format';

export default function AdminReports() {
  const [params, setParams] = useSearchParams();
  const filters = { severity: params.get('severity') || '', status: params.get('status') || '' };
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0, pages: 1 });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!getToken()) return;
    setLoading(true); setErr('');
    try {
      const q = { page, limit: 15, severity: filters.severity, status: filters.status };
      Object.keys(q).forEach((k) => q[k] === '' && delete q[k]);
      setData(await listPotholes(q));
    } catch (e) { setErr(e.message); } finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filters.severity, filters.status]);
  useEffect(() => { load(); }, [load]);

  const filter = (k, v) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v); else next.delete(k);
    setParams(next, { replace: true }); setPage(1);
  };
  const changeStatus = async (id, s) => { try { await setStatus(id, s); load(); } catch (e) { setErr(e.message); } };
  const del = async (id) => { if (confirm('Delete this pothole record?')) { try { await removePothole(id); load(); } catch (e) { setErr(e.message); } } };

  return (
    <AdminLayout title="Reports" subtitle={`${data.total} report${data.total === 1 ? '' : 's'} match your filters`}
      actions={<button type="button" className="a-btn" onClick={load} disabled={loading}><Icon name="refresh" size={18} className={loading ? 'spin' : ''} />Refresh</button>}>
      <div className="a-filters">
        <label>Severity
          <select value={filters.severity} onChange={(e) => filter('severity', e.target.value)}>
            <option value="">All severity</option><option>HIGH</option><option>MEDIUM</option><option>LOW</option>
          </select>
        </label>
        <label>Status
          <select value={filters.status} onChange={(e) => filter('status', e.target.value)}>
            <option value="">All status</option><option value="new">New</option><option value="verified">Verified</option><option value="fixed">Fixed</option>
          </select>
        </label>
      </div>

      {err && <div className="a-err" role="alert"><Icon name="alert" size={18} />{err}</div>}

      <div className="panel table-panel">
        <table className="a-table">
          <thead><tr><th>Photo</th><th>Location</th><th>Severity</th><th>Score</th><th>Reports</th><th>Status</th><th>Seen</th><th>Actions</th></tr></thead>
          <tbody>
            {data.items.map((p) => {
              const c = coords(p);
              return (
                <tr key={p._id}>
                  <td data-label="Photo"><a href={p.imageUrl} target="_blank" rel="noreferrer"><img className="thumb" src={p.imageUrl} alt="pothole" /></a></td>
                  <td data-label="Location">{c.text}</td>
                  <td data-label="Severity"><span className={`chip ${p.severity}`}>{p.severity}</span></td>
                  <td data-label="Score">{p.score}</td>
                  <td data-label="Reports">{p.reports}</td>
                  <td data-label="Status">
                    <select className={`st st-${p.status}`} value={p.status} onChange={(e) => changeStatus(p._id, e.target.value)}>
                      <option value="new">New</option><option value="verified">Verified</option><option value="fixed">Fixed</option>
                    </select>
                  </td>
                  <td data-label="Seen">{new Date(p.createdAt).toLocaleString()}</td>
                  <td data-label="Actions" className="a-actions">
                    <a className="a-btn primary" href={mapsLink(c.lat, c.lng)} target="_blank" rel="noreferrer"><Icon name="navigate" size={16} />Navigate</a>
                    <button type="button" className="a-btn danger" onClick={() => del(p._id)}><Icon name="trash" size={16} />Delete</button>
                  </td>
                </tr>
              );
            })}
            {!data.items.length && !loading && <tr className="empty"><td colSpan="8" className="a-empty">No reports match these filters.</td></tr>}
          </tbody>
        </table>
        {loading && <div className="a-loading"><i className="lg-spin dark" />Loading...</div>}
      </div>

      <div className="a-pager">
        <button type="button" className="a-btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
        <span>Page {data.page || 1} of {data.pages || 1}</span>
        <button type="button" className="a-btn" disabled={page >= (data.pages || 1)} onClick={() => setPage(page + 1)}>Next</button>
      </div>
    </AdminLayout>
  );
}
