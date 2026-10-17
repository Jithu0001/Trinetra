import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import Icon from '../components/Icon';
import { useCountUp } from '../hooks/useScroll';
import { getToken, listPotholes, getStats, setStatus, mapsLink } from '../lib/adminApi';
import { coords, timeAgo } from '../lib/format';

const C = 2 * Math.PI * 34; // ring circumference

function ScoreCard({ tone, icon, label, value, total }) {
  const n = useCountUp(value ?? 0, value != null);
  const pct = value != null && total ? Math.round((value / total) * 100) : 0;
  return (
    <div className={`sc sc-${tone} ${value == null ? 'is-loading' : ''}`}>
      <div className="sc-top"><span className="sc-icon"><Icon name={icon} size={20} /></span><span>{label}</span></div>
      <b className="sc-num">{value == null ? '-' : n}</b>
      <div className="sc-foot">
        <div className="sc-bar"><i style={{ width: `${tone === 'total' ? 100 : pct}%` }} /></div>
        <small>{tone === 'total' ? 'All reports' : `${pct}% of all reports`}</small>
      </div>
    </div>
  );
}

function Ring({ label, value, total, tone }) {
  const [on, setOn] = useState(false);
  useEffect(() => { const r = requestAnimationFrame(() => setOn(true)); return () => cancelAnimationFrame(r); }, []);
  const pct = value != null && total ? value / total : 0;
  return (
    <div className={`ring ring-${tone}`}>
      <svg viewBox="0 0 84 84" width="84" height="84" aria-hidden="true">
        <circle cx="42" cy="42" r="34" className="ring-bg" />
        <circle cx="42" cy="42" r="34" className="ring-fg" strokeDasharray={`${on ? pct * C : 0} ${C}`} transform="rotate(-90 42 42)" />
      </svg>
      <div><b>{value ?? '-'}</b><span>{label}</span><small>{Math.round(pct * 100)}%</small></div>
    </div>
  );
}

function Donut({ stats }) {
  const [on, setOn] = useState(false);
  useEffect(() => { const r = requestAnimationFrame(() => setOn(true)); return () => cancelAnimationFrame(r); }, []);
  const parts = [['HIGH', '#ef4444'], ['MEDIUM', '#f97316'], ['LOW', '#22c55e']].map(([k, c]) => [k, c, stats?.severity?.[k] || 0]);
  const sum = parts.reduce((a, p) => a + p[2], 0);
  let acc = 0;
  return (
    <div className="donut">
      <svg viewBox="0 0 120 120" width="150" height="150" role="img" aria-label="Severity mix">
        <circle cx="60" cy="60" r="46" fill="none" stroke="#e6ecf7" strokeWidth="16" />
        {sum > 0 && parts.map(([k, c, v]) => {
          const len = (v / sum) * 2 * Math.PI * 46, off = acc; acc += len;
          return <circle key={k} cx="60" cy="60" r="46" fill="none" stroke={c} strokeWidth="16" strokeDasharray={`${on ? len : 0} ${2 * Math.PI * 46}`} strokeDashoffset={-off} transform="rotate(-90 60 60)" className="donut-seg" />;
        })}
        <text x="60" y="58" textAnchor="middle" className="donut-n">{sum}</text>
        <text x="60" y="74" textAnchor="middle" className="donut-l">reports</text>
      </svg>
      <ul>{parts.map(([k, c, v]) => <li key={k}><i style={{ background: c }} />{k[0] + k.slice(1).toLowerCase()}<b>{v}</b></li>)}</ul>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [sc, setSc] = useState(null);
  const [recent, setRecent] = useState([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!getToken()) return;
    setLoading(true); setErr('');
    try {
      const [s, r, n, v, f] = await Promise.all([
        getStats(), listPotholes({ page: 1, limit: 6 }),
        listPotholes({ status: 'new', limit: 1 }), listPotholes({ status: 'verified', limit: 1 }), listPotholes({ status: 'fixed', limit: 1 }),
      ]);
      setStats(s); setRecent(r.items || []);
      setSc({ new: n.total ?? 0, verified: v.total ?? 0, fixed: f.total ?? 0 });
    } catch (e) { setErr(e.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const changeStatus = async (id, s) => { try { await setStatus(id, s); load(); } catch (e) { setErr(e.message); } };
  const sev = (k) => (stats ? stats.severity?.[k] || 0 : null);
  const total = stats?.total ?? null;
  const statusTotal = sc ? sc.new + sc.verified + sc.fixed : 0;

  return (
    <AdminLayout
      title="Dashboard"
      subtitle="Where reports stand right now"
      actions={<button type="button" className="a-btn" onClick={load} disabled={loading}><Icon name="refresh" size={18} className={loading ? 'spin' : ''} />Refresh</button>}
    >
      {err && <div className="a-err" role="alert"><Icon name="alert" size={18} />{err}</div>}

      <section className="sc-grid" aria-label="Reports by severity">
        <ScoreCard tone="total" icon="layers" label="Total reports" value={total} total={total} />
        <ScoreCard tone="high" icon="alert" label="High severity" value={sev('HIGH')} total={total} />
        <ScoreCard tone="medium" icon="gauge" label="Medium severity" value={sev('MEDIUM')} total={total} />
        <ScoreCard tone="low" icon="check" label="Low severity" value={sev('LOW')} total={total} />
      </section>

      <div className="d-grid">
        <section className="panel">
          <header className="panel-h"><h2>Report status</h2><Link to="/admin/reports" className="a-link">View all</Link></header>
          <div className="rings">
            <Ring tone="new" label="New" value={sc?.new} total={statusTotal} />
            <Ring tone="verified" label="Verified" value={sc?.verified} total={statusTotal} />
            <Ring tone="fixed" label="Fixed" value={sc?.fixed} total={statusTotal} />
          </div>
          <div className="pipe" aria-hidden="true">
            <i className="p-new" style={{ flexGrow: sc?.new || 0 }} /><i className="p-verified" style={{ flexGrow: sc?.verified || 0 }} /><i className="p-fixed" style={{ flexGrow: sc?.fixed || 0 }} />
          </div>
        </section>

        <section className="panel">
          <header className="panel-h"><h2>Severity mix</h2></header>
          <Donut stats={stats} />
        </section>
      </div>

      <div className="d-grid d-grid-2">
        <section className="panel">
          <header className="panel-h"><h2>Latest reports</h2><Link to="/admin/reports" className="a-link">Open reports</Link></header>
          <ul className="recent">
            {recent.map((p) => {
              const c = coords(p);
              return (
                <li key={p._id}>
                  <a href={p.imageUrl} target="_blank" rel="noreferrer" aria-label="Open pothole photo"><img className="thumb" src={p.imageUrl} alt="pothole" /></a>
                  <div className="recent-info">
                    <div><span className={`chip ${p.severity}`}>{p.severity}</span> <small>score {p.score} · {p.reports} report{p.reports === 1 ? '' : 's'}</small></div>
                    <span>{c.text}</span>
                    <small><Icon name="clock" size={13} /> {timeAgo(p.createdAt)}</small>
                  </div>
                  <select className={`st st-${p.status}`} value={p.status} onChange={(e) => changeStatus(p._id, e.target.value)} aria-label="Change status">
                    <option value="new">New</option><option value="verified">Verified</option><option value="fixed">Fixed</option>
                  </select>
                  <a className="a-icon" href={mapsLink(c.lat, c.lng)} target="_blank" rel="noreferrer" aria-label="Navigate in Google Maps"><Icon name="navigate" size={18} /></a>
                </li>
              );
            })}
            {!recent.length && !loading && <li className="a-empty">No reports yet. They will show up here as soon as someone starts scanning.</li>}
          </ul>
        </section>

        <section className="panel quick">
          <header className="panel-h"><h2>Quick actions</h2></header>
          <Link to="/admin/reports?status=new" className="q q-blue"><Icon name="list" size={22} /><span><b>Review new reports</b><small>Verify what was just found</small></span><Icon name="arrow" size={18} /></Link>
          <Link to="/admin/map" className="q q-violet"><Icon name="map" size={22} /><span><b>Open the map</b><small>See every pothole in place</small></span><Icon name="arrow" size={18} /></Link>
          <Link to="/scan" className="q q-teal"><Icon name="camera" size={22} /><span><b>Start scanning</b><small>Report from this device</small></span><Icon name="arrow" size={18} /></Link>
        </section>
      </div>
    </AdminLayout>
  );
}
