import { useEffect, useState } from 'react';
import { Link, NavLink, Navigate, useNavigate } from 'react-router-dom';
import Logo from './Logo';
import Icon from './Icon';
import { getToken, logout } from '../lib/adminApi';
import '../admin.css';

const MENU = [
  ['/admin/dashboard', 'Dashboard', 'dashboard'],
  ['/admin/reports', 'Reports', 'list'],
  ['/admin/map', 'Map', 'map'],
];

export default function AdminLayout({ title, subtitle, actions, children }) {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.title = `${title} | Trinetra Admin`;
    document.body.style.overflow = open ? 'hidden' : '';
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey); };
  }, [open, title]);

  if (!getToken()) return <Navigate to="/admin" replace />;

  const out = () => { logout(); nav('/admin'); };

  return (
    <div className="admin-shell">
      <aside className={`a-side ${open ? 'open' : ''}`} aria-label="Admin menu">
        <Link to="/" className="a-brand" onClick={() => setOpen(false)}>
          <Logo size={34} /><span>Trinetra</span><small>Admin</small>
        </Link>
        <nav className="a-menu">
          {MENU.map(([to, label, icon]) => (
            <NavLink key={to} to={to} onClick={() => setOpen(false)} className={({ isActive }) => `a-nav ${isActive ? 'active' : ''}`}>
              <Icon name={icon} size={20} /><span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="a-side-foot">
          <Link to="/scan" className="a-nav"><Icon name="scan" size={20} /><span>Open scanner</span></Link>
          <Link to="/" className="a-nav"><Icon name="external" size={20} /><span>View website</span></Link>
          <button type="button" className="a-nav" onClick={out}><Icon name="logout" size={20} /><span>Log out</span></button>
        </div>
      </aside>
      {open && <button type="button" className="a-scrim" aria-label="Close menu" onClick={() => setOpen(false)} />}

      <div className="a-main">
        <header className="a-top">
          <button type="button" className="a-burger" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)}>
            <Icon name="menu" size={22} />
          </button>
          <div className="a-title">
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <div className="a-top-actions">{actions}</div>
        </header>
        <main className="a-content">{children}</main>
      </div>
    </div>
  );
}
