import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../lib/adminApi';
import Logo from '../components/Logo';
import Icon from '../components/Icon';
import poster from '../assets/hero-poster.jpg';
import '../admin.css';

export default function AdminLogin() {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { document.title = 'Admin sign in | Trinetra'; }, []);

  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr('');
    try { await login(email, password); nav('/admin/dashboard'); }
    catch (ex) { setErr(ex.message); } finally { setBusy(false); }
  }

  return (
    <div className="lg">
      <aside className="lg-side" style={{ '--poster': `url(${poster})` }}>
        <div className="lg-side-in">
          <Link to="/" className="lg-brand"><Logo size={40} /><span>Trinetra</span></Link>
          <div>
            <h2>An AI that never blinks.</h2>
            <p>Review what drivers have found, verify it, send a crew and mark it fixed.</p>
            <ul>
              <li><Icon name="map" size={18} />Every report on one live map</li>
              <li><Icon name="gauge" size={18} />Severity scored from 0 to 100</li>
              <li><Icon name="shield" size={18} />Admin access only</li>
            </ul>
          </div>
        </div>
      </aside>

      <main className="lg-main">
        <i className="lg-blob b1" /><i className="lg-blob b2" /><i className="lg-blob b3" />
        <form className="lg-card" onSubmit={submit}>
          <Link to="/" className="lg-brand lg-brand-sm"><Logo size={34} /><span>Trinetra</span></Link>
          <div className="lg-head">
            <h1>Welcome back</h1>
            <p>Sign in to manage pothole reports.</p>
          </div>

          <label className="lg-field">
            <span>Email</span>
            <div className="lg-input">
              <Icon name="mail" size={18} />
              <input type="email" placeholder="you@example.com" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
          </label>

          <label className="lg-field">
            <span>Password</span>
            <div className="lg-input">
              <Icon name="lock" size={18} />
              <input type={show ? 'text' : 'password'} placeholder="Enter your password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              <button type="button" className="lg-eye" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show}>
                <Icon name={show ? 'eyeOff' : 'eye'} size={20} />
              </button>
            </div>
          </label>

          {err && <div className="lg-err" role="alert"><Icon name="alert" size={18} />{err}</div>}

          <button className="lg-btn" disabled={busy}>
            {busy ? <><i className="lg-spin" />Signing in...</> : <>Sign in<Icon name="arrow" size={18} /></>}
          </button>
          <Link to="/" className="lg-back">Back to website</Link>
        </form>
      </main>
    </div>
  );
}
