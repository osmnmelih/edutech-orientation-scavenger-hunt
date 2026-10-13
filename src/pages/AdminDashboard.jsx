import { useState, useEffect, useRef } from 'react';
import { useNavigate } from '../router-compat.jsx';
import { sessions, checkpoints as cpApi } from '../api.js';
import MapPicker from '../components/MapPicker.jsx';
import QRDisplay from '../components/QRDisplay.jsx';
import CockpitFrame from '../components/CockpitFrame.jsx';

const STEPS = ['LOBBY NAME', 'MAP PATH', 'LAUNCH GAME'];
const LS_KEY = 'orienteering_teacher_sessions';

// Mission type labels (cycle by order index)
const MISSION_TYPES = [
  { label: 'Physical',  color: '#FF0055', icon: '🏃' },
  { label: 'Cognitive', color: '#00FFD2', icon: '🧠' },
  { label: 'Social',    color: '#FFC800', icon: '👥' },
  { label: 'Creative',  color: '#00FF88', icon: '✦'  },
];

function loadSavedSessions() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; }
}
function saveSessionToHistory(s) {
  try {
    const existing = loadSavedSessions().filter(x => x.id !== s.id);
    const updated  = [{ id: s.id, name: s.name, join_code: s.join_code, saved_at: new Date().toISOString() }, ...existing].slice(0, 10);
    localStorage.setItem(LS_KEY, JSON.stringify(updated));
  } catch { /* ignore */ }
}
function removeSessionFromHistory(id) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(loadSavedSessions().filter(x => x.id !== id)));
  } catch { /* ignore */ }
}

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [isAdminAuth, setIsAdminAuth] = useState(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('edutech_admin_authenticated') === 'true';
  });
  const [adminPasscode, setAdminPasscode] = useState('');
  const [adminPasscodeError, setAdminPasscodeError] = useState('');

  const [step, setStep]               = useState(0);
  const [sessionName, setSessionName] = useState('');
  const [session, setSession]         = useState(null);
  const [checkpoints, setCheckpoints] = useState([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');

  const [savedSessions, setSavedSessions] = useState([]);
  const [rejoinCode, setRejoinCode]       = useState('');
  const [rejoining, setRejoining]         = useState(false);
  const [rejoinError, setRejoinError]     = useState('');

  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError]     = useState('');
  const [mapFlyTo, setMapFlyTo]     = useState(null);

  useEffect(() => { setSavedSessions(loadSavedSessions()); }, []);

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminPasscode.trim() === 'tya00') {
      sessionStorage.setItem('edutech_admin_authenticated', 'true');
      setIsAdminAuth(true);
      setAdminPasscodeError('');
    } else {
      setAdminPasscodeError('INVALID ADMIN PASSCODE');
      setAdminPasscode('');
    }
  };

  const handleAdminLogout = () => {
    sessionStorage.removeItem('edutech_admin_authenticated');
    setIsAdminAuth(false);
  };

  function handleUseMyLocation() {
    if (!navigator.geolocation) { setGpsError('GPS not supported'); return; }
    setGpsLoading(true); setGpsError('');
    navigator.geolocation.getCurrentPosition(
      pos => { setMapFlyTo({ lat: pos.coords.latitude, lng: pos.coords.longitude, _key: Date.now() }); setGpsLoading(false); },
      () => { setGpsError('Could not get location'); setGpsLoading(false); }
    );
  }

  async function handleConnectLobby() {
    setLoading(true); setError('');
    const orientationName = '2026-2027 Winter Semester MSc Educational Technology Orientation';
    try {
      let sessionData = null;
      try {
        const { data } = await sessions.getByCode('EDUTECH26');
        if (data && data.id) {
          sessionData = data;
        }
      } catch (err) {
        console.warn("Lobby lookup by code:", err);
      }
      if (!sessionData) {
        sessionData = {
          id: 10,
          name: orientationName,
          join_code: 'EDUTECH26'
        };
      }
      saveSessionToHistory(sessionData);
      setSavedSessions(loadSavedSessions());
      setSession(sessionData);
      navigate(`/admin/session/${sessionData.id}`);
    } catch (err) {
      console.error(err);
      navigate('/admin/session/10');
    } finally {
      setLoading(false);
    }
  }

  async function handleRejoinSaved(saved) {
    try {
      const targetId = (saved.join_code === 'EDUTECH26' || String(saved.id).startsWith('edutech_host')) ? 10 : saved.id;
      const { data } = await sessions.getById(targetId);
      saveSessionToHistory(data);
      setSavedSessions(loadSavedSessions());
      navigate(`/admin/session/${data.id}`);
    } catch {
      navigate('/admin/session/10');
    }
  }

  function handleRemoveSaved(e, id) {
    e.stopPropagation();
    removeSessionFromHistory(id);
    setSavedSessions(loadSavedSessions());
  }

  async function handleAddCheckpoint(cpData) {
    setError('');
    try {
      const { data } = await cpApi.add({ ...cpData, session_id: session.id });
      setCheckpoints(prev => [...prev, data]);
    } catch (err) { setError(err.response?.data?.error || 'Failed to add checkpoint'); }
  }

  async function handleDeleteCheckpoint(id) {
    try {
      await cpApi.remove(id);
      setCheckpoints(prev => prev.filter(cp => cp.id !== id));
    } catch (err) { setError(err.response?.data?.error || 'Failed to delete'); }
  }

  async function handleUpdateCheckpoint({ id, lat, lng }) {
    // Optimistic update
    setCheckpoints(prev => prev.map(cp => cp.id === id ? { ...cp, lat, lng } : cp));
    try {
      await cpApi.update(id, { lat, lng });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to move node');
    }
  }

  function fmtDate(iso) {
    try { return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return ''; }
  }

  if (!isAdminAuth) {
    return (
      <CockpitFrame rail={[]} actions={null} title={null}>
        <div className="min-h-screen bg-ag-bg flex items-center justify-center p-6 select-none font-orbitron">
          <div className="cockpit-panel p-8 sm:p-10 max-w-md w-full border-2 border-ag-gold/40 space-y-6 text-center shadow-[0_0_35px_rgba(255,200,0,0.15)] relative">
            <div className="w-12 h-12 rounded-full border-2 border-ag-gold bg-ag-gold/10 flex items-center justify-center mx-auto text-ag-gold font-black text-xl">
              🔐
            </div>
            <div className="space-y-1.5">
              <h2 className="font-orbitron font-black text-lg text-ag-gold uppercase tracking-[0.2em]">
                ADMIN CONTROL ACCESS
              </h2>
              <p className="font-mono-cyber text-[11px] text-ag-muted uppercase">
                ENTER SECRET ADMIN PASSCODE
              </p>
            </div>

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <input
                type="password"
                placeholder="PASSCODE"
                value={adminPasscode}
                onChange={e => { setAdminPasscode(e.target.value); setAdminPasscodeError(''); }}
                className="cyber-input w-full h-12 text-center text-sm font-mono-cyber uppercase tracking-[0.3em]"
                autoFocus
                required
              />

              {adminPasscodeError && (
                <div className="text-ag-red text-xs font-mono-cyber font-bold animate-pulse">
                  {adminPasscodeError}
                </div>
              )}

              <button
                type="submit"
                className="cockpit-btn w-full py-3.5 text-xs tracking-[0.25em] font-black border-ag-gold text-ag-gold bg-ag-gold/15 hover:bg-ag-gold/25"
              >
                UNLOCK ADMIN DASHBOARD ➔
              </button>
            </form>

            <button
              onClick={() => navigate('/')}
              className="cockpit-btn-secondary w-full py-3.5 text-xs tracking-[0.2em] font-orbitron font-bold border border-ag-cyan/40 bg-ag-cyan/10 hover:bg-ag-cyan/20 text-ag-cyan rounded-xl transition-all shadow-md uppercase block"
            >
              ← RETURN TO STUDENT HOME
            </button>
          </div>
        </div>
      </CockpitFrame>
    );
  }

  return (
    <CockpitFrame rail={[]} actions={null} title={null}>
    <div className="cockpit-grid relative">
      <div className="scanlines opacity-20" />

      {/* ── Admin Dashboard title ── */}
      <div className="px-6 pt-6 pb-2 relative z-10 flex flex-col items-center gap-3">
        <div className="cockpit-panel px-8 py-3">
          <h1 className="font-orbitron text-xl md:text-2xl font-black text-ag-gold tracking-[0.3em] uppercase text-center">
            Admin Dashboard
          </h1>
        </div>
        {session && (
          <p className="text-[10px] text-ag-muted font-mono-cyber uppercase tracking-[0.25em] text-center">
            {session.name} · PIN: <span className="text-ag-gold font-bold">{session.join_code}</span>
          </p>
        )}
      </div>

      {error && (
        <div className="mx-5 mt-3 bg-ag-red/10 border border-ag-red/40 text-ag-red text-sm px-4 py-2 rounded-xl relative z-10">
          {error}
        </div>
      )}

      {/* ══ Step 0: Auto-Configured Connect Lobby Card ══ */}
      {step === 0 && (
        <div className="max-w-2xl mx-auto p-6 mt-6 relative z-10">
          <div className="ag-panel p-8 sm:p-10 space-y-6 text-center border-2 border-ag-gold/40 shadow-[0_0_30px_rgba(255,200,0,0.2)]">
            <div className="space-y-3 pt-2">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-ag-gold/15 border border-ag-gold/40 text-ag-gold font-orbitron font-black text-xs uppercase tracking-widest">
                EVENT LOBBY PIN: <span className="text-ag-cyan font-bold tracking-[0.25em] text-sm">EDUTECH26</span>
              </div>

              <h2 className="font-orbitron font-black text-xl sm:text-2xl text-ag-yellow uppercase tracking-wider leading-tight pt-2">
                2026-2027 Winter Semester<br />MSc Educational Technology Orientation
              </h2>
            </div>

            <div className="pt-4 space-y-3">
              <button
                onClick={handleConnectLobby}
                disabled={loading}
                className="cockpit-btn w-full py-5 text-sm sm:text-base tracking-[0.3em] font-black shadow-[0_0_25px_rgba(0,255,136,0.35)] bg-gradient-to-r from-ag-green/20 via-ag-cyan/30 to-ag-green/20 border-ag-green text-ag-green"
              >
                {loading ? 'CONNECTING LOBBY...' : 'CONNECT LOBBY ➔'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Step 1: Map — place sector nodes ══ */}
      {step === 1 && session && (
        <div className="flex flex-col lg:flex-row relative z-10" style={{ height: 'calc(100vh - 57px)' }}>
          <aside className="w-full lg:w-72 bg-ag-surface border-r border-ag-border flex flex-col overflow-hidden">
            <div className="p-4 border-b border-ag-border space-y-3">
              <h3 className="font-orbitron font-bold text-ag-cyan text-[11px] tracking-widest uppercase">
                Sector Nodes <span className="text-ag-muted">({checkpoints.length})</span>
              </h3>

              <button onClick={handleUseMyLocation} disabled={gpsLoading}
                className="w-full h-13 flex items-center justify-center gap-2.5 rounded-xl border-2 border-ag-green/45 bg-ag-green/5 text-ag-green text-sm font-orbitron font-black hover:bg-ag-green/10 transition-all disabled:opacity-50 tracking-widest">
                {gpsLoading ? (
                  <><div className="w-4 h-4 border-2 border-ag-green border-t-transparent rounded-full animate-spin" />LOCATING...</>
                ) : (
                  <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="9"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/></svg>USE MY LOCATION</>
                )}
              </button>
              {gpsError && <p className="text-xs text-ag-red font-mono-cyber">{gpsError}</p>}
              <p className="text-[10px] text-ag-muted font-mono-cyber uppercase tracking-wider">Click the map to drop sector nodes. Mission types are auto-assigned.</p>
            </div>

            <ul className="flex-1 overflow-y-auto p-3 space-y-1">
              {checkpoints.length === 0 && (
                <li className="text-center text-ag-muted text-xs py-10 px-4 font-mono-cyber">
                  <div className="w-10 h-10 mx-auto mb-3 rounded-full border border-ag-border flex items-center justify-center text-ag-dim font-orbitron font-bold text-sm">0</div>
                  NO NODES PLACED. CLICK THE MAP TO DROP.
                </li>
              )}
              {checkpoints.map((cp, i) => {
                const m = MISSION_TYPES[i % 4];
                return (
                  <li key={cp.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-ag-border hover:border-ag-cyan/30 transition-all">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center font-orbitron font-bold text-[10px] flex-shrink-0"
                         style={{ background: `${m.color}18`, border: `1px solid ${m.color}50`, color: m.color }}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-ag-text text-xs truncate uppercase font-mono-cyber">{cp.label}</div>
                      <div className="text-[10px] mt-0.5 font-bold uppercase font-orbitron" style={{ color: m.color }}>{m.icon} {m.label}</div>
                    </div>
                    <button onClick={() => handleDeleteCheckpoint(cp.id)}
                      className="text-ag-dim hover:text-ag-red transition-colors text-base leading-none px-1">×</button>
                  </li>
                );
              })}
            </ul>

            <div className="p-4 border-t border-ag-border">
              <button onClick={() => setStep(2)} disabled={checkpoints.length < 2}
                className="cockpit-btn-secondary w-full px-8 py-5 text-xs tracking-[0.25em]">
                {checkpoints.length < 2
                  ? `ADD ${2 - checkpoints.length} MORE NODE${2 - checkpoints.length !== 1 ? 'S' : ''}`
                  : `CONTINUE WITH ${checkpoints.length} NODES ➔`}
              </button>
            </div>
          </aside>

          <div className="flex-1 min-h-64">
            <MapPicker
              checkpoints={checkpoints}
              onAdd={handleAddCheckpoint}
              onUpdate={handleUpdateCheckpoint}
              onDelete={handleDeleteCheckpoint}
              flyTo={mapFlyTo}
            />
          </div>
        </div>
      )}

      {/* ══ Step 2: Launch ══ */}
      {step === 2 && session && (
        <div className="max-w-xl mx-auto p-6 mt-8 relative z-10">
          <div className="ag-panel p-8">
            <div className="text-center mb-6">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl border border-ag-green/40 bg-ag-green/5 flex items-center justify-center">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-ag-green">
                  <circle cx="12" cy="15" r="2.5" fill="currentColor" stroke="none"/>
                  <path d="M7 11.5 Q12 7.5 17 11.5"/><path d="M3.5 8 Q12 2 20.5 8"/>
                </svg>
              </div>
              <h2 className="font-orbitron text-xl font-black text-ag-cyan tracking-wider uppercase">{session.name}</h2>
              <p className="text-ag-muted text-xs mt-1">{checkpoints.length} sector nodes · Ready to launch</p>
            </div>

            <QRDisplay sessionId={session.id} joinCode={session.join_code} />

            {/* Mission sequence */}
            <div className="grid grid-cols-2 gap-2 mt-6">
              {checkpoints.map((cp, i) => {
                const m = MISSION_TYPES[i % 4];
                return (
                  <div key={cp.id} className="ag-panel p-3 text-center">
                    <div className="font-orbitron font-bold text-ag-cyan text-xs">Node #{i + 1}</div>
                    <div className="text-ag-muted text-[10px] truncate mt-0.5">{cp.label}</div>
                    <div className="text-[10px] font-bold mt-1" style={{ color: m.color }}>{m.icon} {m.label}</div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col gap-3 mt-6">
              <button onClick={() => navigate(`/admin/session/${session.id}`)}
                className="cockpit-btn-secondary w-full px-8 py-5 text-sm tracking-[0.25em]">
                LAUNCH MISSION 🚀
              </button>
              <button onClick={() => setStep(1)} className="cockpit-btn-secondary w-full px-8 py-5 text-sm tracking-[0.25em]">
                ← EDIT MAP
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom: Return to Student Home ── */}
      <div className="relative z-10 px-6 py-6 flex justify-center">
        <button
          onClick={() => navigate('/')}
          className="cockpit-btn-secondary w-full max-w-md px-8 py-4 text-xs sm:text-sm tracking-[0.25em] font-orbitron font-bold uppercase rounded-xl border border-ag-cyan/40 bg-ag-cyan/10 hover:bg-ag-cyan/20 text-ag-cyan transition-all shadow-lg"
        >
          ← RETURN TO STUDENT HOME
        </button>
      </div>
    </div>
    </CockpitFrame>
  );
}
