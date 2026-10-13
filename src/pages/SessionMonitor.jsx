import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from '../router-compat.jsx';
import { sessions as sessionsApi } from '../api.js';
import CockpitFrame from '../components/CockpitFrame.jsx';
import LiveLocationMap from '../components/LiveLocationMap.jsx';

const LOCAL_COMPLETIONS_KEY = 'edutech_orientation_completions';

function loadSavedCompletions() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_COMPLETIONS_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveCompletions(list) {
  try {
    localStorage.setItem(LOCAL_COMPLETIONS_KEY, JSON.stringify(list));
  } catch {}
}

function loadActiveStudents() {
  const list = [];
  try {
    const active = JSON.parse(localStorage.getItem('edutech_active_students') || '[]');
    if (Array.isArray(active)) list.push(...active);
  } catch {}

  try {
    const currentStudentSession = JSON.parse(localStorage.getItem('orienteering_student_session') || 'null');
    if (currentStudentSession && currentStudentSession.team) {
      const team = currentStudentSession.team;
      const option = currentStudentSession.selectedOption === 'b' ? 'Option B' : 'Option A';
      const cpId = currentStudentSession.currentCpId || 1;
      const cpObj = (currentStudentSession.checkpoints || []).find(c => c.id === cpId);

      const existing = list.find(s => s.id === team.id || s.name === team.team_name);
      if (!existing) {
        list.push({
          id: team.id || `team_${Date.now()}`,
          name: team.team_name || team.name || 'STUDENT PLAYER',
          routeOption: option,
          currentStation: cpId === -1 ? 3 : cpId,
          currentLocation: cpObj ? cpObj.label : `Station ${cpId}`,
          completedCount: cpId === -1 ? 3 : Math.max(0, cpId - 1),
          stars: cpId === -1 ? 3 : Math.max(0, cpId - 1),
          lat: team.lat || (cpObj ? cpObj.lat : 49.25618),
          lng: team.lng || (cpObj ? cpObj.lng : 7.03956),
          registeredAt: new Date().toISOString()
        });
      }
    }
  } catch {}

  return list;
}

const MISSION_TYPES = [
  { label: 'Physical',  color: '#FF0055', bg: 'rgba(255,0,85,0.10)'    },
  { label: 'Cognitive', color: '#00FFD2', bg: 'rgba(0,255,210,0.10)'   },
  { label: 'Social',    color: '#FFC800', bg: 'rgba(255,200,0,0.10)'   },
  { label: 'Creative',  color: '#00FF88', bg: 'rgba(0,255,136,0.10)'   },
];

export default function SessionMonitor() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [isAdminAuth, setIsAdminAuth] = useState(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('edutech_admin_authenticated') === 'true';
  });
  const [adminPasscode, setAdminPasscode] = useState('');
  const [adminPasscodeError, setAdminPasscodeError] = useState('');

  const [session, setSession]               = useState(null);
  const [error, setError]                   = useState('');
  const [activeTab, setActiveTab]           = useState('overview'); // 'overview' | 'status' | 'live-location' | 'photos'
  const [savedPhotos, setSavedPhotos]       = useState([]);
  const [activeStudents, setActiveStudents] = useState(() => loadActiveStudents());
  const [isRefreshing, setIsRefreshing]     = useState(false);

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

  // Refresh saved photos & active students from localStorage
  const refreshData = useCallback(() => {
    setSavedPhotos(loadSavedCompletions());
    setActiveStudents(loadActiveStudents());
  }, []);

  useEffect(() => {
    refreshData();
  }, [activeTab, refreshData]);

  const handleDeletePhoto = (photoId) => {
    const updated = savedPhotos.filter((p, idx) => (p.id ? p.id !== photoId : idx !== photoId));
    setSavedPhotos(updated);
    saveCompletions(updated);
  };

  const handleClearAllPhotos = () => {
    setSavedPhotos([]);
    saveCompletions([]);
  };

  const handleDeleteParticipant = (targetIdOrName) => {
    try {
      const active = JSON.parse(localStorage.getItem('edutech_active_students') || '[]');
      const updatedActive = active.filter(s => s.id !== targetIdOrName && s.name !== targetIdOrName);
      localStorage.setItem('edutech_active_students', JSON.stringify(updatedActive));

      const studentSession = JSON.parse(localStorage.getItem('orienteering_student_session') || 'null');
      if (studentSession && studentSession.team && (studentSession.team.id === targetIdOrName || studentSession.team.team_name === targetIdOrName)) {
        localStorage.removeItem('orienteering_student_session');
      }

      const photos = loadSavedCompletions();
      const updatedPhotos = photos.filter(p => p.teamId !== targetIdOrName && p.teamName !== targetIdOrName);
      saveCompletions(updatedPhotos);

      refreshData();
      try {
        const bc = new BroadcastChannel('edutech_scavenger_hunt');
        bc.postMessage({ type: 'PARTICIPANT_DELETED', id: targetIdOrName });
        bc.close();
      } catch (e) {}
      window.dispatchEvent(new CustomEvent('edutech_student_update'));
    } catch (e) {}
  };

  const handleClearAllParticipants = () => {
    try {
      localStorage.removeItem('edutech_active_students');
      localStorage.removeItem('orienteering_student_session');
      saveCompletions([]);
      refreshData();
      try {
        const bc = new BroadcastChannel('edutech_scavenger_hunt');
        bc.postMessage({ type: 'ALL_PARTICIPANTS_CLEARED' });
        bc.close();
      } catch (e) {}
      window.dispatchEvent(new CustomEvent('edutech_student_update'));
    } catch (e) {}
  };

  const fetchSession = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const { data } = await sessionsApi.getById(id);
      if (data) {
        setSession(data);
        setError('');
      }
    } catch (err) {
      const savedHistory = JSON.parse(localStorage.getItem('orienteering_teacher_sessions') || '[]');
      const currentSaved = savedHistory.find(s => s.id === id) || savedHistory[0];

      const localSessionData = {
        id: id || 'edutech_host_local',
        name: currentSaved?.name || '2026-2027 Winter Semester MSc Educational Technology Orientation',
        join_code: currentSaved?.join_code || 'EDUTECH26',
        checkpoints: [
          { id: 1, label: 'Innovation Center (Building A2 1)', lat: 49.25618, lng: 7.03956 },
          { id: 2, label: 'DFKI - AI Research Center (Building D3 2)', lat: 49.25683, lng: 7.04208 },
          { id: 3, label: 'Mensa Saarbrücken (Building D4 1)', lat: 49.25743, lng: 7.04326 },
        ],
        teams: [] // Real-time only
      };
      setSession(localSessionData);
      setError('');
    } finally {
      refreshData();
      setTimeout(() => setIsRefreshing(false), 400);
    }
  }, [id, refreshData]);

  useEffect(() => {
    fetchSession();
    const iv = setInterval(() => {
      fetchSession();
      refreshData();
    }, 2500); // 2.5-second live polling for students & completions across all devices

    let bc;
    try {
      bc = new BroadcastChannel('edutech_scavenger_hunt');
      bc.onmessage = () => {
        refreshData();
      };
    } catch (e) {}

    const handleStorageChange = () => {
      refreshData();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('edutech_student_update', handleStorageChange);

    return () => {
      clearInterval(iv);
      if (bc) bc.close();
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('edutech_student_update', handleStorageChange);
    };
  }, [fetchSession, refreshData]);

  if (!session) {
    return (
      <div className="min-h-screen bg-ag-bg flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-ag-cyan border-t-transparent rounded-full animate-spin mx-auto" />
          <div className="font-orbitron text-ag-muted text-[10px] tracking-[0.25em] uppercase">Connecting Admin Dashboard...</div>
        </div>
      </div>
    );
  }

  // Derive real active students/teams strictly from live session, active students registry and saved completions
  const completionsList = savedPhotos;
  const mergedTeamsMap = new Map();

  // 1. Backend session teams (if present)
  (session.teams || []).forEach(t => {
    const compCount = t.completions?.length || 0;
    mergedTeamsMap.set(t.id || t.name, {
      id: t.id || t.name,
      name: t.name || 'Student Player',
      routeOption: t.route_option || 'Option A',
      currentLocation: t.current_location || (compCount > 0 ? `Station ${compCount}` : 'Campus Entrance'),
      currentStation: Math.min(3, compCount + 1),
      completedCount: compCount,
      stars: t.stars || compCount,
      lat: t.lat || 49.255,
      lng: t.lng || 7.042,
      completions: t.completions || []
    });
  });

  // 2. Local active registered students
  activeStudents.forEach((st, idx) => {
    const key = st.id || st.name || `student_reg_${idx}`;
    const existing = mergedTeamsMap.get(key);
    if (existing) {
      if (st.lat && st.lng) { existing.lat = st.lat; existing.lng = st.lng; }
      if (st.currentStation) existing.currentStation = st.currentStation;
      if (st.routeOption) existing.routeOption = st.routeOption;
      if (st.completedCount) existing.completedCount = Math.max(existing.completedCount, st.completedCount);
      if (st.stars) existing.stars = Math.max(existing.stars, st.stars);
    } else {
      mergedTeamsMap.set(key, {
        id: key,
        name: st.name || 'STUDENT PLAYER',
        routeOption: st.routeOption || 'Option A',
        currentLocation: st.currentLocation || `Station ${st.currentStation || 1}`,
        currentStation: st.currentStation || 1,
        completedCount: st.completedCount || 0,
        stars: st.stars || 0,
        lat: st.lat || (st.routeOption === 'Option B' ? 49.25625 : 49.25618),
        lng: st.lng || (st.routeOption === 'Option B' ? 7.03960 : 7.03956),
        completions: []
      });
    }
  });

  // 3. Completions & photos submitted
  completionsList.forEach((c, idx) => {
    const key = c.teamId || c.teamName || `student_${idx}`;
    const existing = mergedTeamsMap.get(key);
    if (existing) {
      existing.completedCount = Math.max(existing.completedCount, c.checkpointId || 1);
      existing.stars = Math.max(existing.stars, existing.completedCount);
      existing.currentStation = Math.min(3, existing.completedCount + 1);
      if (c.checkpointLabel) existing.currentLocation = c.checkpointLabel;
      if (c.lat && c.lng) {
        existing.lat = c.lat;
        existing.lng = c.lng;
      }
      if (!existing.completions) existing.completions = [];
      existing.completions.push(c);
    } else {
      mergedTeamsMap.set(key, {
        id: key,
        name: c.teamName || 'STUDENT PLAYER',
        routeOption: c.routeOption || 'Option A',
        currentLocation: c.checkpointLabel || 'Station 1',
        currentStation: Math.min(3, (c.checkpointId || 1) + 1),
        completedCount: c.checkpointId || 1,
        stars: c.checkpointId || 1,
        lat: c.lat || (49.2555 + (idx * 0.0008)),
        lng: c.lng || (7.0420 + (idx * 0.0012)),
        completions: [c]
      });
    }
  });

  const allTeamsList = Array.from(mergedTeamsMap.values());
  const leaderboardList = [...allTeamsList].sort((a, b) => b.stars - a.stars);

  const totalCps = 6; // 6 Total Orientation Stations across Option A (3) and Option B (3)
  const totalCompletedTasks = allTeamsList.reduce((acc, t) => acc + t.completedCount, 0);
  const totalStarsAwarded = allTeamsList.reduce((acc, t) => acc + t.stars, 0);
  const allDone = allTeamsList.length > 0 && allTeamsList.every(t => t.completedCount >= 3);

  const TABS = [
    { id: 'overview',      label: 'OVERVIEW' },
    { id: 'status',        label: 'STATUS' },
    { id: 'live-location', label: 'LIVE LOCATION' },
    { id: 'photos',        label: `SUBMITTED PHOTOS (${savedPhotos.length})` },
  ];

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
                UNLOCK ADMIN MONITOR ➔
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
    <div className="flex flex-col min-h-screen relative">
      <div className="scanlines opacity-15 fixed inset-0 pointer-events-none z-50" />

      {/* ══ Mobile-First Top Navigation Bar ══ */}
      <header className="sticky top-0 z-30 bg-ag-surface/95 backdrop-blur-md border-b border-ag-border px-4 py-2.5 flex items-center justify-between gap-3 shadow-lg">
        {/* Left: Back Button */}
        <button
          onClick={() => navigate('/admin')}
          className="h-9 px-3 rounded-xl border border-ag-cyan/40 bg-ag-cyan/10 hover:bg-ag-cyan/20 text-ag-cyan font-orbitron font-bold text-xs flex items-center gap-1.5 transition-all flex-shrink-0"
        >
          <span className="text-sm">←</span>
          <span className="hidden sm:inline tracking-wider">BACK</span>
        </button>

        {/* Center: Compact Title & PIN Badge */}
        <div className="flex-1 min-w-0 text-center flex items-center justify-center gap-2">
          <h1 className="font-orbitron font-black text-xs sm:text-sm text-ag-yellow truncate tracking-wider uppercase">
            EDUTECH ORIENTATION '26
          </h1>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-ag-gold/15 border border-ag-gold/40 text-[9px] font-mono-cyber font-bold text-ag-gold uppercase flex-shrink-0">
            PIN: <span className="text-ag-cyan font-black ml-1 tracking-wider">{session.join_code}</span>
          </span>
        </div>

        {/* Right: Refresh & Lock Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={fetchSession}
            className="h-9 px-3 rounded-xl border border-ag-gold/40 bg-ag-gold/10 hover:bg-ag-gold/20 text-ag-gold font-orbitron font-bold text-xs flex items-center gap-1.5 transition-all flex-shrink-0 active:scale-95"
          >
            <span className={`text-sm inline-block transition-transform duration-500 ${isRefreshing ? 'animate-spin' : ''}`}>↺</span>
            <span className="hidden sm:inline tracking-wider">REFRESH</span>
          </button>
          <button
            onClick={handleAdminLogout}
            className="h-9 px-2.5 rounded-xl border border-ag-magenta/40 bg-ag-magenta/10 hover:bg-ag-magenta/20 text-ag-magenta font-orbitron font-bold text-xs flex items-center gap-1 transition-all flex-shrink-0"
            title="Lock Admin Panel"
          >
            <span className="text-xs">🔒</span>
            <span className="hidden sm:inline tracking-wider">LOCK</span>
          </button>
        </div>
      </header>

      {error && (
        <div className="mx-4 mt-3 bg-ag-red/10 border border-ag-red/35 text-ag-red text-xs px-4 py-2 rounded-xl relative z-10 font-mono-cyber">{error}</div>
      )}

      {/* ── Mobile Tab Navigation Bar ── */}
      <nav className="bg-ag-surface/80 backdrop-blur-md border-b border-ag-border px-3 flex gap-1 relative z-10 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-3 text-[11px] sm:text-xs font-orbitron font-black tracking-wider uppercase transition-all border-b-2 -mb-px whitespace-nowrap flex-1 text-center
              ${activeTab === t.id
                ? 'border-ag-cyan text-ag-cyan bg-ag-cyan/5'
                : 'border-transparent text-ag-muted hover:text-ag-text'}`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto relative z-10">

        {/* ══ OVERVIEW TAB ══ */}
        {activeTab === 'overview' && (
          <div className="max-w-5xl mx-auto p-5 space-y-6">

            {/* KPI Row (6 Total Stations) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Active Students', val: allTeamsList.length, color: 'var(--ag-cyan)' },
                { label: 'Total Stations',  val: 6,                  color: 'var(--ag-muted)' },
                { label: 'Completed Tasks', val: totalCompletedTasks,color: 'var(--ag-green)' },
                { label: 'Stars Earned',    val: `${totalStarsAwarded} STARS`, color: 'var(--ag-gold)' },
              ].map(({ label, val, color }) => (
                <div key={label} className="ag-panel p-5 text-center border-ag-cyan/30">
                  <div className="font-orbitron font-black text-2xl sm:text-3xl" style={{ color }}>{val}</div>
                  <div className="text-xs text-ag-muted uppercase tracking-wider mt-1 font-mono-cyber">{label}</div>
                </div>
              ))}
            </div>

            {/* Leadership Table (Stars Only - Clean Numbers 1, 2, 3) */}
            <div className="ag-panel p-6 space-y-4 border-ag-gold/40 max-w-3xl mx-auto">
              <div className="flex items-center justify-between border-b border-ag-border/50 pb-3">
                <h2 className="font-orbitron font-black text-sm text-ag-gold tracking-widest uppercase">
                  ORIENTATION LEADERSHIP TABLE
                </h2>
                <span className="text-[10px] text-ag-green font-mono-cyber animate-pulse font-bold">● LIVE RANKINGS</span>
              </div>

              {leaderboardList.length === 0 ? (
                <div className="text-ag-muted text-xs text-center py-10 font-mono-cyber">
                  NO ACTIVE STUDENTS CONNECTED YET.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {leaderboardList.map((team, idx) => (
                    <div key={team.id} className="flex items-center justify-between p-3.5 rounded-xl border border-ag-border bg-ag-surface/60 font-mono-cyber">
                      <div className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center font-orbitron font-black text-xs ${idx === 0 ? 'bg-ag-gold text-black' : idx === 1 ? 'bg-ag-cyan text-black' : 'bg-ag-elevated text-ag-text'}`}>
                          {idx + 1}
                        </div>
                        <div>
                          <div className="font-bold text-xs text-ag-text uppercase">{team.name}</div>
                          <div className="text-[9px] text-ag-muted">{team.currentLocation}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-ag-gold font-orbitron font-bold text-xs bg-ag-gold/10 px-3 py-1 rounded-lg border border-ag-gold/30">
                          {team.stars} STARS
                        </div>
                        <span className={`text-[9px] px-2.5 py-1 rounded font-orbitron font-bold ${team.completedCount >= 3 ? 'bg-ag-green/20 text-ag-green border border-ag-green/40' : 'bg-ag-yellow/15 text-ag-yellow'}`}>
                          {team.completedCount >= 3 ? 'COMPLETED' : `STATION ${team.completedCount}/3`}
                        </span>
                        <button
                          onClick={() => handleDeleteParticipant(team.id)}
                          className="px-2 py-1 text-[9px] font-orbitron font-bold rounded bg-ag-red/15 text-ag-red border border-ag-red/30 hover:bg-ag-red/30 transition-all uppercase"
                          title="Delete Participant"
                        >
                          DELETE
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* ══ STATUS TAB (Real Progress Only) ══ */}
        {activeTab === 'status' && (
          <div className="max-w-4xl mx-auto p-5 space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-2 border-b border-ag-cyan/20 pb-3">
              <div>
                <h2 className="font-orbitron font-black text-sm text-ag-cyan tracking-widest uppercase">
                  STUDENT & PLAYER ORIENTATION STATUS
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-orbitron font-bold text-xs px-3 py-1 rounded bg-ag-cyan/15 text-ag-cyan border border-ag-cyan/30">
                  {allTeamsList.length} CONNECTED
                </span>
                {allTeamsList.length > 0 && (
                  <button
                    onClick={handleClearAllParticipants}
                    className="px-3 py-1 text-[10px] font-orbitron font-bold rounded bg-ag-red/15 text-ag-red border border-ag-red/40 hover:bg-ag-red/30 transition-all uppercase"
                  >
                    CLEAR ALL PARTICIPANTS
                  </button>
                )}
              </div>
            </div>

            {allTeamsList.length === 0 ? (
              <div className="ag-panel p-12 text-center space-y-2">
                <p className="text-ag-muted text-xs font-mono-cyber uppercase">No active students connected yet.</p>
              </div>
            ) : (
              allTeamsList.map(team => {
                const done = team.completedCount;
                return (
                  <div key={team.id} className="ag-panel p-5 space-y-4 border-ag-cyan/30">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-ag-border">
                      <div className="space-y-1 font-mono-cyber">
                        <div className="font-orbitron font-black text-base text-ag-gold uppercase flex items-center gap-2">
                          {team.name}
                          <span className="text-[10px] font-mono-cyber font-normal text-ag-muted px-2 py-0.5 rounded bg-ag-elevated border border-ag-border">
                            {team.routeOption}
                          </span>
                        </div>
                        <div className="text-xs text-ag-cyan flex items-center gap-2">
                          Real-Time Location: <span className="font-bold text-ag-text">{team.currentLocation}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="text-center bg-ag-gold/10 border border-ag-gold/30 px-3 py-1.5 rounded-xl">
                          <div className="font-orbitron font-bold text-ag-gold text-sm">{team.stars}</div>
                          <div className="text-[8px] text-ag-muted uppercase font-mono-cyber">STARS</div>
                        </div>
                        <div className="text-center bg-ag-cyan/10 border border-ag-cyan/30 px-3 py-1.5 rounded-xl">
                          <div className="font-orbitron font-bold text-ag-cyan text-sm">{team.completedCount} / 3</div>
                          <div className="text-[8px] text-ag-muted uppercase font-mono-cyber">STATIONS</div>
                        </div>
                        <button
                          onClick={() => handleDeleteParticipant(team.id)}
                          className="px-3 py-2 text-[10px] font-orbitron font-bold rounded-xl bg-ag-red/15 text-ag-red border border-ag-red/30 hover:bg-ag-red/30 transition-all uppercase"
                        >
                          DELETE
                        </button>
                      </div>
                    </div>

                    {/* Real Station Progress List */}
                    <div className="space-y-2 pt-1 font-mono-cyber">
                      <div className="text-[10px] font-orbitron font-bold text-ag-muted uppercase">REAL STATION PROGRESS</div>
                      {session.checkpoints.map((cp, idx) => {
                        const isDone = idx < done;
                        const m = MISSION_TYPES[idx % 4];
                        return (
                          <div key={cp.id} className="flex items-center justify-between text-xs py-2 px-3.5 rounded-xl border border-ag-border bg-ag-bg/40 font-mono-cyber">
                            <div className="flex items-center gap-3">
                              <div className="w-6 h-6 rounded flex items-center justify-center font-bold text-[10px]"
                                   style={{ background: isDone ? m.bg : 'transparent', color: isDone ? m.color : 'gray', border: `1px solid ${isDone ? m.color : 'rgba(255,255,255,0.2)'}` }}>
                                {idx + 1}
                              </div>
                              <span className={isDone ? 'text-ag-text font-bold' : 'text-ag-muted'}>{cp.label}</span>
                            </div>
                            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded ${isDone ? 'bg-ag-green/15 text-ag-green border border-ag-green/30' : 'bg-ag-elevated text-ag-muted'}`}>
                              {isDone ? 'COMPLETED' : 'INCOMPLETE'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ══ LIVE LOCATION MAP TAB ══ */}
        {activeTab === 'live-location' && (
          <div className="max-w-5xl mx-auto p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-ag-cyan/20 pb-3">
              <div>
                <h2 className="font-orbitron font-black text-sm text-ag-cyan uppercase tracking-widest">
                  LIVE STUDENT LOCATION MAP
                </h2>
              </div>
              <span className="font-orbitron font-bold text-xs px-3 py-1 rounded bg-ag-cyan/15 text-ag-cyan border border-ag-cyan/30">
                {allTeamsList.length} LOCATIONS ACTIVE
              </span>
            </div>

            <LiveLocationMap students={allTeamsList} />
          </div>
        )}

        {/* ══ SUBMITTED PHOTOS TAB ══ */}
        {activeTab === 'photos' && (
          <div className="max-w-5xl mx-auto p-5 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-ag-cyan/20 pb-3">
              <div>
                <h2 className="font-orbitron font-black text-sm text-ag-gold uppercase tracking-widest">
                  LIVE STUDENT SUBMITTED PHOTOS GALLERY
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-orbitron font-bold text-xs px-3 py-1.5 rounded bg-ag-gold/15 text-ag-gold border border-ag-gold/30">
                  {savedPhotos.length} TOTAL PHOTOS
                </span>
                {savedPhotos.length > 0 && (
                  <button
                    onClick={handleClearAllPhotos}
                    className="px-3.5 py-1.5 bg-ag-red/20 hover:bg-ag-red/35 border border-ag-red/50 text-ag-red font-orbitron text-xs font-bold rounded-xl tracking-wider transition-all"
                  >
                    CLEAR ALL PHOTOS
                  </button>
                )}
              </div>
            </div>

            {savedPhotos.length === 0 ? (
              <div className="ag-panel p-10 text-center space-y-3">
                <div className="font-orbitron font-bold text-ag-cyan text-sm uppercase tracking-wider">
                  NO SUBMITTED PHOTOS YET
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {savedPhotos.map((item, idx) => (
                  <div key={item.id || idx} className="cockpit-panel p-4 space-y-3 border border-ag-cyan/30 rounded-2xl bg-ag-surface/90 hover:border-ag-gold transition-all flex flex-col justify-between">
                    <div className="space-y-3">
                      {/* Student Sender Name Header */}
                      <div className="flex items-center justify-between border-b border-ag-border pb-2 font-mono-cyber">
                        <div className="font-orbitron font-black text-xs text-ag-yellow uppercase tracking-wider">
                          {item.teamName || 'STUDENT CREW'}
                        </div>
                        <span className="text-[9px] text-ag-gold font-bold px-2 py-0.5 rounded bg-ag-gold/10 border border-ag-gold/30">
                          +1 STAR
                        </span>
                      </div>

                      {/* Photo Image */}
                      {item.photo ? (
                        <div className="relative rounded-xl overflow-hidden border border-ag-border bg-black aspect-video flex items-center justify-center">
                          <img src={item.photo} alt={item.checkpointLabel || 'Station photo'} className="w-full h-full object-cover" />
                          <div className="absolute bottom-2 left-2 right-2 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded text-[9px] font-mono-cyber text-ag-gold truncate">
                            AR VERIFIED PHOTO
                          </div>
                        </div>
                      ) : (
                        <div className="w-full aspect-video rounded-xl bg-ag-bg/80 border border-ag-border flex items-center justify-center font-mono-cyber text-[10px] text-ag-muted">
                          [ AR TASK COMPLETED ]
                        </div>
                      )}

                      <div className="space-y-1 font-mono-cyber">
                        <div className="text-[11px] text-ag-cyan font-bold uppercase truncate">
                          {item.checkpointLabel || `Station ${item.checkpointId || 1}`}
                        </div>
                        {item.checkpointAddress && (
                          <div className="text-[9px] text-ag-muted truncate">{item.checkpointAddress}</div>
                        )}
                      </div>
                    </div>

                    {/* Delete Photo Button */}
                    <div className="pt-2 border-t border-ag-border/50">
                      <button
                        onClick={() => handleDeletePhoto(item.id || idx)}
                        className="w-full py-2 px-3 bg-ag-red/15 hover:bg-ag-red/30 border border-ag-red/40 rounded-xl text-ag-red font-orbitron font-bold text-xs uppercase tracking-wider flex items-center justify-center transition-all"
                      >
                        DELETE PHOTO
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
    </CockpitFrame>
  );
}
