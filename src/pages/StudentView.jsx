import { useState, useEffect, useRef } from 'react';
import { useNavigate } from '../router-compat.jsx';
import { sessions, tasks, hints as hintsApi, completions, locations } from '../api.js';
import StudentMap from '../components/StudentMap.jsx';
import HintPanel from '../components/HintPanel.jsx';
import ARView from '../components/ARView.jsx';
import PhotoUploadTask from '../components/PhotoUploadTask.jsx';
import StarRewardOverlay from '../components/student/StarRewardOverlay.jsx';
import RankingsOverlay from '../components/student/RankingsOverlay.jsx';
import FinishedScreen from '../components/student/FinishedScreen.jsx';
import { useAudioStatus } from '../hooks/useAudioStatus.js';
import { useGpsWatcher } from '../hooks/useGpsWatcher.js';
import { haversine, fmtDistance, TASK_META, DIFF_META, UNLOCK_DISTANCE } from '../utils.js';
import { playClickSound, playUnlockSound, playSuccessSound, playPingSound, startAmbientSpaceMusic, stopAmbientSpaceMusic, startTenseMissionMusic, stopTenseMissionMusic } from '../utils/audio.js';

const PHASE = { JOIN: 'join', MAP: 'map', TASK: 'task', SUBMIT: 'submit', FINISHED: 'finished' };
const LS_KEY = 'orienteering_student_session';

function saveStudentSession(data) {
  try { localStorage.setItem(LS_KEY, JSON.stringify({ ...data, savedAt: new Date().toISOString() })); }
  catch { /* ignore */ }
}
function loadStudentSession() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || 'null'); }
  catch { return null; }
}
function clearStudentSession() {
  try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
}

export default function StudentView() {
  const navigate = useNavigate();
  const audioStatus = useAudioStatus();

  const [joinCode, setJoinCode]       = useState(() => {
    if (typeof window === 'undefined') return '';
    try {
      const c = new URLSearchParams(window.location.search).get('code');
      return c ? c.toUpperCase() : '';
    } catch { return ''; }
  });
  const [callsign, setCallsign]       = useState('');
  const [crewNameInput, setCrewNameInput] = useState('');
  const [joinError, setJoinError]     = useState('');
  const [joining, setJoining]         = useState(false);

  const [phase, setPhase]             = useState(PHASE.JOIN);
  const [team, setTeam]               = useState(null);
  const [session, setSession]         = useState(null);
  const [checkpoints, setCheckpoints] = useState([]);
  const [currentCp, setCurrentCp]     = useState(null);

  const { userPos, gpsError, isLocating, locateUser, startGPS, stopGPS } = useGpsWatcher();
  const [distance, setDistance]       = useState(null);

  const [task, setTask]               = useState(null);
  const [taskLoading, setTaskLoading] = useState(false);
  const [taskStartTime, setTaskStartTime] = useState(null);

  const [hintsList, setHintsList]     = useState([]);
  const [hintsUsed, setHintsUsed]     = useState(0);
  const [showHints, setShowHints]     = useState(false);
  const [hintLoading, setHintLoading] = useState(false);

  const [answer, setAnswer]           = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [submitResult, setSubmitResult] = useState(null);

  const [showResults, setShowResults]   = useState(false);
  const [resultsData, setResultsData]   = useState(null);
  const [resultsLoading, setResultsLoading] = useState(false);

  const [showAR, setShowAR] = useState(false);
  const [arInitializing, setArInitializing] = useState(false);
  const [focusTrigger, setFocusTrigger] = useState(null);
  const [manualUnlocked, setManualUnlocked] = useState(false);

  const [studentToast, setStudentToast] = useState('');
  const lastLocationPingRef = useRef(0);
  const triggerStudentToast = (msg) => {
    setStudentToast(msg);
    setTimeout(() => setStudentToast(''), 3500);
  };

  useEffect(() => {
    const saved = loadStudentSession();
    if (saved) {
      setTeam(saved.team);
      setSession(saved.session);
      setCheckpoints(saved.checkpoints);
      if (saved.currentCpId === -1) {
        setPhase(PHASE.FINISHED);
      } else {
        const cp = saved.checkpoints.find(c => c.id === saved.currentCpId) || saved.checkpoints[0];
        setCurrentCp(cp);
        setPhase(PHASE.MAP);
        startGPS();
      }
    } else {
      navigate('/');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-sync team with Supabase backend so student appears in Admin Dashboard across all devices
  useEffect(() => {
    async function syncSupabaseTeam() {
      if (!team) return;
      const tName = team.team_name || team.name;
      if (!tName) return;
      if (typeof team.id === 'string' && team.id.startsWith('team_')) {
        try {
          const { data } = await sessions.join('EDUTECH26', tName);
          if (data && data.team) {
            setTeam(data.team);
            const saved = loadStudentSession();
            if (saved) {
              saveStudentSession({ ...saved, team: data.team, session: data.session || saved.session });
            }
          }
        } catch (e) {
          console.warn("Could not sync local team to Supabase:", e);
        }
      }
    }
    syncSupabaseTeam();
  }, [team]);

  useEffect(() => {
    if (phase === PHASE.MAP) {
      try { startAmbientSpaceMusic(); } catch (e) {}
    }
  }, [phase]);

  useEffect(() => {
    const playMusicOnGesture = () => {
      try {
        startAmbientSpaceMusic();
      } catch (e) {}
      window.removeEventListener('touchstart', playMusicOnGesture);
      window.removeEventListener('click', playMusicOnGesture);
    };
    window.addEventListener('touchstart', playMusicOnGesture);
    window.addEventListener('click', playMusicOnGesture);
    return () => {
      window.removeEventListener('touchstart', playMusicOnGesture);
      window.removeEventListener('click', playMusicOnGesture);
      try { stopAmbientSpaceMusic(); } catch (e) {}
      try { stopTenseMissionMusic(); } catch (e) {}
    };
  }, []);

  // Compute live distance between user position and target checkpoint station & broadcast position
  useEffect(() => {
    if (userPos && currentCp) {
      const dist = haversine(userPos.lat, userPos.lng, currentCp.lat, currentCp.lng);
      setDistance(dist);

      try {
        const activeStudents = JSON.parse(localStorage.getItem('edutech_active_students') || '[]');
        const teamId = team?.id;
        const teamName = team?.team_name || team?.name;
        const idx = activeStudents.findIndex(s => (teamId && s.id === teamId) || (teamName && s.name === teamName));
        if (idx >= 0) {
          activeStudents[idx].lat = userPos.lat;
          activeStudents[idx].lng = userPos.lng;
          activeStudents[idx].lastActive = new Date().toISOString();
          localStorage.setItem('edutech_active_students', JSON.stringify(activeStudents));
        } else if (teamName) {
          activeStudents.push({
            id: teamId || `team_${Date.now()}`,
            name: teamName,
            routeOption: 'Option A',
            currentStation: currentCp?.id || 1,
            currentLocation: currentCp?.label || 'Station 1',
            completedCount: 0,
            stars: 0,
            lat: userPos.lat,
            lng: userPos.lng,
            registeredAt: new Date().toISOString()
          });
          localStorage.setItem('edutech_active_students', JSON.stringify(activeStudents));
        }

        try {
          const bc = new BroadcastChannel('edutech_scavenger_hunt');
          bc.postMessage({ type: 'LOCATION_UPDATE', teamId, lat: userPos.lat, lng: userPos.lng });
          bc.close();
        } catch (e) {}
        window.dispatchEvent(new CustomEvent('edutech_student_update'));

        // Broadcast to backend so Admin Live Location Map gets real-time position across devices
        const now = Date.now();
        if (!lastLocationPingRef.current || now - lastLocationPingRef.current > 8000) {
          lastLocationPingRef.current = now;
          locations.update({
            teamId: team?.id,
            teamName: team?.team_name || team?.name,
            checkpointId: currentCp?.id,
            lat: userPos.lat,
            lng: userPos.lng
          }).catch(() => {});
        }
      } catch (e) {}
    }
  }, [userPos, currentCp, team]);

  useEffect(() => {
    if (task && task.ui_theme) {
      const { background, primary_neon_text, alarm_border, timer_color } = task.ui_theme;
      if (background) document.documentElement.style.setProperty('--cyber-bg', background);
      if (primary_neon_text) document.documentElement.style.setProperty('--cyber-cyan', primary_neon_text);
      if (alarm_border) document.documentElement.style.setProperty('--cyber-border', alarm_border);
      if (timer_color) document.documentElement.style.setProperty('--cyber-pink', timer_color);
    } else {
      document.documentElement.style.setProperty('--cyber-bg', '#0A0314');
      document.documentElement.style.setProperty('--cyber-cyan', '#00FFD2');
      document.documentElement.style.setProperty('--cyber-border', 'rgba(0,255,210,0.18)');
      document.documentElement.style.setProperty('--cyber-pink', '#FF0055');
    }
  }, [task]);

  async function handleJoin(e) {
    e.preventDefault();
    if (!joinCode.trim() || !callsign.trim() || !crewNameInput.trim()) return;
    playClickSound();
    setJoining(true); setJoinError('');
    const combinedTeamName = `${callsign.trim().toUpperCase()} (${crewNameInput.trim()})`;
    try {
      const { data } = await sessions.join(joinCode.trim().toUpperCase(), combinedTeamName);
      setTeam(data.team);
      setSession(data.session);
      const cps = data.session.checkpoints;
      setCheckpoints(cps);
      playSuccessSound();

      if (data.team.current_checkpoint === -1) {
        saveStudentSession({
          team: data.team,
          session: { id: data.session.id, name: data.session.name, join_code: joinCode.trim() },
          checkpoints: cps,
          currentCpId: -1,
        });
        setPhase(PHASE.FINISHED);
      } else {
        const cp = cps.find(c => c.id === data.team.current_checkpoint) || cps[0];
        setCurrentCp(cp);
        saveStudentSession({
          team: data.team,
          session: { id: data.session.id, name: data.session.name, join_code: joinCode.trim() },
          checkpoints: cps,
          currentCpId: cp.id,
        });
        setPhase(PHASE.MAP);
        startGPS();
      }
    } catch (err) {
      setJoinError('Flight Code not matching.');
    } finally { setJoining(false); }
  }

  function handleResume() {
    playClickSound();
    const saved = loadStudentSession();
    if (!saved) return;
    setTeam(saved.team);
    setSession(saved.session);
    setCheckpoints(saved.checkpoints);
    if (saved.currentCpId === -1) {
      setPhase(PHASE.FINISHED);
    } else {
      const cp = saved.checkpoints.find(c => c.id === saved.currentCpId) || saved.checkpoints[0];
      setCurrentCp(cp);
      setPhase(PHASE.MAP);
      startGPS();
    }
  }

  function handleStartFresh() {
    playClickSound();
    clearStudentSession();
  }

  async function openResults() {
    playClickSound();
    setShowResults(true);
    if (!session?.id || resultsData) return;
    setResultsLoading(true);
    try {
      const { data } = await sessions.getById(session.id);
      if (data) setResultsData(data);
    } catch (e) {
      console.warn("Using local orientation scoreboard data:", e);
    } finally {
      setResultsLoading(false);
    }
  }

  function handleUnlockTask() {
    if (!currentCp?.id) return;
    if (!canUnlock) {
      triggerStudentToast(`LOCATION LOCK REQUIRED: Please walk within 20 meters of ${currentCp.label} to start the AR camera task.`);
      return;
    }
    try { playUnlockSound(); } catch (e) {}
    setTaskStartTime(Date.now());
    setArInitializing(true);
    setShowAR(true);
  }

  async function handleRequestHint() {
    if (!team?.id || !currentCp?.id) return;
    if (hintsUsed >= 3 || hintLoading) return;
    playClickSound();
    setHintLoading(true);
    try {
      const { data } = await hintsApi.get({ teamId: team.id, checkpointId: currentCp.id, taskJson: task });
      setHintsList(prev => [...prev, data]);
      setHintsUsed(data.hintsUsed);
      setShowHints(true);
    } catch (err) { console.error(err); }
    finally { setHintLoading(false); }
  }

const LOCAL_COMPLETIONS_KEY = 'edutech_orientation_completions';
function saveCompletionToHistory(entry) {
  try {
    const list = JSON.parse(localStorage.getItem(LOCAL_COMPLETIONS_KEY) || '[]');
    list.unshift(entry);
    localStorage.setItem(LOCAL_COMPLETIONS_KEY, JSON.stringify(list));
  } catch (e) {}
}

  async function handleComplete(submissionData = {}) {
    if (!team?.id || !currentCp?.id) return;
    setSubmitting(true);
    const timeTaken = taskStartTime ? Math.round((Date.now() - taskStartTime) / 1000) : 0;

    const completionEntry = {
      id: `comp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      sessionId: session?.id || 'edutech_local',
      teamId: team?.id || 'team_local',
      teamName: team?.team_name || team?.name || 'STUDENT CREW',
      checkpointId: currentCp?.id,
      checkpointLabel: currentCp?.label,
      checkpointAddress: currentCp?.address,
      taskType: currentCp?.task_type || 'creative',
      timeTaken,
      score: currentCp?.points || 150,
      answer: submissionData.note || answer || 'Station Verified via AR Camera Photo',
      photo: submissionData.photo || null,
      submittedAt: new Date().toISOString(),
      lat: userPos?.lat || currentCp?.lat,
      lng: userPos?.lng || currentCp?.lng
    };
    saveCompletionToHistory(completionEntry);

    try {
      const activeStudents = JSON.parse(localStorage.getItem('edutech_active_students') || '[]');
      const teamId = team?.id;
      const teamName = team?.team_name || team?.name;
      const idx = activeStudents.findIndex(s => (teamId && s.id === teamId) || (teamName && s.name === teamName));
      if (idx >= 0) {
        activeStudents[idx].completedCount = Math.max(activeStudents[idx].completedCount || 0, currentCp?.id || 1);
        activeStudents[idx].stars = activeStudents[idx].completedCount;
        activeStudents[idx].currentStation = Math.min(3, activeStudents[idx].completedCount + 1);
        if (currentCp?.label) activeStudents[idx].currentLocation = currentCp.label;
        if (userPos) { activeStudents[idx].lat = userPos.lat; activeStudents[idx].lng = userPos.lng; }
        localStorage.setItem('edutech_active_students', JSON.stringify(activeStudents));
      }
      try {
        const bc = new BroadcastChannel('edutech_scavenger_hunt');
        bc.postMessage({ type: 'TASK_COMPLETED', completion: completionEntry });
        bc.close();
      } catch (e) {}
      window.dispatchEvent(new CustomEvent('edutech_student_update'));
    } catch (e) {}

    try {
      let resData = null;
      try {
        const { data } = await completions.submit({
          teamId: team.id,
          teamName: team.team_name || team.name,
          checkpointId: currentCp.id,
          timeTaken,
          answer: submissionData.note || answer,
          photo: submissionData.photo || null
        });
        resData = data;
      } catch (err) {
        // Fallback for local session / EduTech orientation play
        const currIdx = checkpoints.findIndex(c => c.id === currentCp.id);
        const nextCp = checkpoints[currIdx + 1];
        resData = {
          success: true,
          scoreGained: currentCp.points || 150,
          nextCheckpoint: nextCp ? { id: nextCp.id, label: nextCp.label } : null,
          finished: !nextCp
        };
      }

      setSubmitResult(resData);
      try { stopTenseMissionMusic(); startAmbientSpaceMusic(); } catch(e) {}
      playSuccessSound();
      if (resData.finished) { setPhase(PHASE.FINISHED); stopGPS(); }
      else { setPhase(PHASE.SUBMIT); }
    } catch (err) { console.error(err); }
    finally { setSubmitting(false); }
  }

  function handleAdvance() {
    playClickSound();
    try { stopTenseMissionMusic(); startAmbientSpaceMusic(); } catch(e) {}
    setManualUnlocked(false);
    if (!submitResult?.nextCheckpoint) return;
    const nextCp = checkpoints.find(cp => cp.id === submitResult.nextCheckpoint.id);
    setCurrentCp(nextCp);
    setFocusTrigger('target');
    const saved = loadStudentSession();
    if (saved && nextCp) saveStudentSession({ ...saved, currentCpId: nextCp.id });
    setTask(null); setPhase(PHASE.MAP);
  }

  const cpIndex   = checkpoints.findIndex(cp => cp.id === currentCp?.id);
  const canUnlock = manualUnlocked || (distance !== null && distance <= UNLOCK_DISTANCE);
  let taskType = currentCp?.task_type;
  if (taskType === 'auto' && currentCp) {
    const autoTypes = ['physical', 'cognitive', 'social', 'creative'];
    taskType = autoTypes[(currentCp.order_num - 1) % autoTypes.length];
  }
  const meta      = currentCp ? (TASK_META[taskType] || TASK_META.physical) : null;

  function adjustFrequency(val) {
    playClickSound();
    setBypassFrequency(prev => {
      const newVal = prev + val;
      if (newVal === targetFrequency) {
        setBypassUnlocked(true);
        playUnlockSound();
      } else {
        setBypassUnlocked(false);
      }
      return newVal;
    });
  }

  // ── AR VIEW ──
  if (showAR && phase === PHASE.MAP) {
    return (
      <ARView
        userPos={userPos}
        currentCp={currentCp}
        distance={distance}
        canUnlock={canUnlock}
        onManualUnlock={() => setManualUnlocked(true)}
        taskLoading={taskLoading}
        onClose={() => { setShowAR(false); setArInitializing(false); }}
        onUnlock={(photoPayload) => {
          setShowAR(false);
          setArInitializing(false);
          handleComplete(photoPayload || {});
        }}
        onCameraReady={() => setArInitializing(false)}
      />
    );
  }

  // ── RANKINGS ──
  if (showResults) {
    return (
      <RankingsOverlay
        resultsData={resultsData}
        resultsLoading={resultsLoading}
        session={session}
        team={team}
        checkpointCount={checkpoints.length}
        onClose={() => setShowResults(false)}
      />
    );
  }


  // ── MAP ──
  if (phase === PHASE.MAP) {

    return (
      <div className="h-[100dvh] w-full flex flex-col bg-ag-bg select-none overflow-hidden">
        <div className="scanlines opacity-15 pointer-events-none" />

        {/* Non-blocking Cyber Toast Notification Overlay */}
        {studentToast && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 max-w-sm w-[90%] p-3.5 bg-ag-surface/95 border-2 border-ag-gold text-ag-gold font-mono-cyber text-xs text-center rounded-2xl shadow-[0_0_30px_rgba(255,200,0,0.4)] backdrop-blur-md ag-fade-in flex items-center justify-center gap-2">
            <span>⚠️</span>
            <span className="font-bold uppercase tracking-wider">{studentToast}</span>
          </div>
        )}
        
        {/* Navigation HUD header */}
        <header className="px-3 py-2 bg-ag-surface/95 backdrop-blur-md border-b border-ag-border/60 flex items-center justify-between gap-2 z-30 shrink-0 shadow-lg">
          {/* Scoreboard Button */}
          <button
            onClick={openResults}
            className="cockpit-btn px-3 py-1.5 text-[11px] sm:text-xs tracking-wider font-black shadow-[0_0_12px_rgba(0,243,255,0.25)] flex items-center gap-1 shrink-0"
          >
            <span>SCOREBOARD</span>
          </button>

          {/* Stars Collected Display */}
          <div className="flex items-center gap-1.5 font-orbitron font-black text-ag-gold text-xs sm:text-sm tracking-wider shrink-0">
            <span className="text-[9px] text-ag-gold/80 font-mono-cyber uppercase tracking-widest font-bold hidden xs:inline">STARS</span>
            <span>⭐ {Math.max(0, cpIndex)} / {checkpoints.length}</span>
          </div>

          {/* Student Name */}
          {team?.name && (
            <span className="font-orbitron font-black text-ag-yellow text-xs tracking-wider uppercase truncate max-w-[110px] sm:max-w-[200px] shrink-0 text-right">
              {team.name.replace(/\s*\[.*?\]|\s*\(.*?\)/gi, '').trim()}
            </span>
          )}
        </header>

        {/* ── Responsive Mobile & Desktop Layout ── */}
        <div className="flex-1 flex flex-col lg:flex-row min-h-0 relative z-10 overflow-hidden">

          {/* Map Area */}
          <div className="flex-1 relative min-h-0 w-full lg:h-full z-0 overflow-hidden">
            <StudentMap userPos={userPos} checkpoints={checkpoints} currentCp={currentCp} focusTrigger={focusTrigger} />

            {/* Compact Map Controls (Top Right Corner of Map) */}
            <div className="absolute top-2.5 right-2.5 z-20 flex flex-col gap-2">
              <button
                onClick={() => { setFocusTrigger('user'); locateUser(); }}
                disabled={isLocating}
                className="cockpit-btn-secondary px-3 py-1.5 text-[10px] tracking-wider text-ag-cyan border-ag-cyan/60 bg-ag-bg/90 backdrop-blur-md uppercase font-orbitron font-bold shadow-lg"
              >
                {isLocating ? 'LOCATING...' : 'MY LOCATION'}
              </button>

              {currentCp && (
                <button
                  onClick={() => setFocusTrigger('target')}
                  className="cockpit-btn-secondary px-3 py-1.5 text-[10px] tracking-wider text-ag-yellow border-ag-yellow/60 bg-ag-bg/90 backdrop-blur-md uppercase font-orbitron font-bold shadow-lg"
                >
                  TARGET
                </button>
              )}
            </div>
          </div>

          {/* Bottom Panel (Mobile) / Side Panel (Desktop) */}
          {currentCp && (
            <div className="shrink-0 w-full lg:w-[380px] bg-ag-surface/95 backdrop-blur-md border-t lg:border-t-0 lg:border-l border-ag-border/60 p-3 sm:p-4 z-20 shadow-2xl space-y-2.5">
              
              {/* Station Info & Distance */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 truncate">
                  <span className="px-2 py-0.5 bg-ag-yellow/15 border border-ag-yellow/40 text-ag-yellow font-orbitron font-black text-[10px] rounded uppercase shrink-0">
                    STATION #{currentCp.id}
                  </span>
                  <h3 className="font-orbitron font-bold text-xs sm:text-sm text-ag-yellow uppercase truncate">
                    {currentCp.label}
                  </h3>
                </div>

                <div className="shrink-0 text-right px-2.5 py-1 bg-ag-bg/80 border border-ag-border/50 rounded">
                  <span className="text-[8px] text-ag-muted font-mono-cyber uppercase block font-bold">DIST</span>
                  <span className={`font-orbitron font-black text-xs sm:text-sm ${canUnlock ? 'text-ag-green' : 'text-ag-yellow'}`}>
                    {canUnlock ? 'REACHED ✓' : (userPos ? fmtDistance(distance) : 'SEARCHING...')}
                  </span>
                </div>
              </div>

              {/* Manual Station Unlock Fallback (for indoor / GPS jitter) */}
              {!canUnlock && (
                <button
                  type="button"
                  onClick={() => {
                    try { playUnlockSound(); } catch (e) {}
                    setManualUnlocked(true);
                    triggerStudentToast('📍 STATION MANUALLY VERIFIED & UNLOCKED!');
                  }}
                  className="w-full py-2 px-3 rounded-xl border border-ag-yellow/60 bg-ag-yellow/15 hover:bg-ag-yellow/25 text-ag-yellow font-orbitron font-bold text-[10px] tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(255,200,0,0.15)] active:scale-95"
                >
                  <span>📍 I'M AT THIS STATION (TAP TO UNLOCK)</span>
                </button>
              )}

              {/* Primary Action Button: AR CAMERA VIEW */}
              <button
                onClick={() => {
                  try { playClickSound(); } catch (e) {}
                  setTaskStartTime(Date.now());
                  setArInitializing(true);
                  setShowAR(true);
                }}
                disabled={arInitializing}
                className="cockpit-btn w-full py-3 text-xs tracking-[0.2em] font-black shadow-[0_0_20px_rgba(0,243,255,0.3)] border-ag-cyan text-ag-cyan bg-ag-cyan/15 hover:bg-ag-cyan/25"
              >
                {arInitializing ? 'INITIALIZING AR CAMERA...' : 'AR CAMERA VIEW'}
              </button>

              {/* Secondary Actions Row */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={locateUser}
                  disabled={isLocating}
                  className="cockpit-btn-secondary py-2.5 text-[10px] tracking-wider text-ag-violet-glow border-ag-violet/40 uppercase font-orbitron font-bold truncate"
                >
                  {isLocating ? 'LOCATING...' : 'USE MY GPS'}
                </button>

                <button
                  onClick={() => { clearStudentSession(); navigate('/'); }}
                  className="cockpit-btn-secondary py-2.5 text-[10px] tracking-wider text-ag-muted hover:text-white uppercase font-orbitron truncate"
                >
                  EXIT HUNT
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    );
  }

  // ── STAR REWARD OVERLAY ON TASK COMPLETION ──
  if (phase === PHASE.SUBMIT && submitResult) {
    const starsEarned = Math.min(checkpoints.length, (cpIndex >= 0 ? cpIndex + 1 : 1));
    return (
      <StarRewardOverlay
        starsEarned={starsEarned}
        totalStars={checkpoints.length || 4}
        nextCheckpointLabel={submitResult.nextCheckpoint?.label}
        onContinue={() => {
          if (submitResult.finished) {
            setPhase(PHASE.FINISHED);
            stopGPS();
          } else {
            handleAdvance();
          }
        }}
      />
    );
  }

  // ── TASK INTERFACE (Unified Task & Decryption Input) ──
  if (phase === PHASE.TASK) {
    const hasResult = !!submitResult;

    return (
      <div className="min-h-screen bg-ag-bg flex flex-col cockpit-curve">
        <div className="scanlines opacity-15" />

        <header className="bg-ag-surface border-b border-ag-border px-4 py-3 z-10 flex flex-col gap-2.5">
          <div className="flex items-center justify-between w-full">
            <div>
              <div className="font-orbitron font-bold text-ag-cyan text-xs uppercase tracking-wider">{task?.ui_theme?.terminal_title || 'STATION CHALLENGE'}</div>
              <div className="text-[9px] text-ag-muted font-mono-cyber uppercase tracking-wider mt-0.5">Station {cpIndex+1} of {checkpoints.length}</div>
            </div>
            <button onClick={openResults} className="text-[9px] font-orbitron font-bold px-3 py-1.5 rounded-lg border border-ag-cyan/35 text-ag-cyan bg-ag-cyan/5 hover:bg-ag-cyan/10 transition-colors uppercase tracking-wider">
              LEADERBOARD
            </button>
          </div>
          {/* Progress Indicators */}
          {!hasResult && (
            <div className="flex items-center justify-between w-full text-[9px] font-mono-cyber px-1 pt-1.5 border-t border-ag-border/30">
              <span className={`flex items-center gap-1 ${taskStep === 0 ? 'text-ag-cyan font-bold' : 'text-ag-muted'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${taskStep === 0 ? 'bg-ag-cyan shadow-[0_0_6px_#00FFD2]' : 'bg-ag-border'}`} /> BRIEF & CHOOSE
              </span>
              <div className="h-0.5 flex-1 mx-3 bg-ag-border/20 rounded" />
              <span className={`flex items-center gap-1 ${taskStep === 1 ? 'text-ag-cyan font-bold' : 'text-ag-muted'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${taskStep === 1 ? 'bg-ag-cyan shadow-[0_0_6px_#00FFD2]' : 'bg-ag-border'}`} /> ACTIVE TIMER
              </span>
              <div className="h-0.5 flex-1 mx-3 bg-ag-border/20 rounded" />
              <span className={`flex items-center gap-1 ${taskStep === 2 ? 'text-ag-cyan font-bold' : 'text-ag-muted'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${taskStep === 2 ? 'bg-ag-cyan shadow-[0_0_6px_#00FFD2]' : 'bg-ag-border'}`} /> TUNER & SUBMIT
              </span>
            </div>
          )}
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 z-10">
          {!hasResult ? (
            <>
              {/* Step 1: Briefing & Selection */}
              {taskStep === 0 && task && (
                <TaskCard 
                  task={task} 
                  cpIndex={cpIndex} 
                  selectedOptionId={selectedOptionId} 
                  onSelectOption={setSelectedOptionId} 
                  step={0}
                />
              )}

              {/* Step 2: Protocol Instruction & Tips */}
              {taskStep === 1 && task && (
                <TaskCard 
                  task={task} 
                  cpIndex={cpIndex} 
                  selectedOptionId={selectedOptionId} 
                  onSelectOption={setSelectedOptionId} 
                  step={1}
                />
              )}

              {/* Step 3: Tuner and Submission */}
              {taskStep === 2 && (
                <>
                  {showHints && hintsList.length > 0 && <HintPanel hints={hintsList} />}

                  {/* Step 1: Frequency Tuner Slider */}
                  <div className="ag-panel p-4 border-ag-border/50 bg-[rgba(22,12,44,0.6)] rounded-2xl">
                    <div className="text-[11px] font-orbitron font-bold text-ag-yellow uppercase tracking-wider mb-3 text-center">
                      [ STEP 1: CONNECT TO SIGNAL ]
                    </div>
                    
                    <div className="bg-ag-bg/60 p-4 rounded-xl border border-ag-border/40 space-y-3">
                      <div className="flex justify-between items-center text-xs font-mono-cyber">
                        <span className="text-ag-muted">YOUR RADIO DIAL:</span>
                        <span className={`font-bold text-sm ${bypassUnlocked ? 'text-ag-green animate-pulse' : 'text-ag-cyan'}`}>
                          {bypassFrequency} GHz
                        </span>
                      </div>

                      <input
                        type="range"
                        min={Math.max(50, targetFrequency - 20)}
                        max={Math.min(150, targetFrequency + 20)}
                        step="1"
                        value={bypassFrequency}
                        onChange={e => {
                          const val = parseInt(e.target.value);
                          setBypassFrequency(val);
                          if (val === targetFrequency) {
                            setBypassUnlocked(true);
                            try { playUnlockSound(); } catch (err) {}
                          } else {
                            setBypassUnlocked(false);
                          }
                        }}
                        className="w-full accent-ag-yellow bg-ag-surface h-2 rounded-lg appearance-none cursor-pointer border border-ag-border/50"
                      />

                      <div className="flex justify-between text-[10px] font-mono-cyber uppercase tracking-wider">
                        <span>Target Frequency: {targetFrequency} GHz</span>
                        <span className={bypassUnlocked ? 'text-ag-green font-bold' : 'text-ag-yellow animate-pulse'}>
                          {bypassUnlocked ? '✔ SIGNAL CONNECTED!' : 'SLIDE TO MATCH TARGET'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Step 2: Decryption Key Input */}
                  {task?.answer_prompt && (
                    <div className="ag-panel p-4 border-ag-green/30 bg-[rgba(22,12,44,0.6)] rounded-2xl">
                      <div className="text-[11px] font-orbitron font-bold text-ag-green uppercase tracking-wider mb-2">
                        [ STEP 2: ENTER MISSION CODE KEY ]
                      </div>
                      <p className="text-ag-text text-xs leading-relaxed font-mono-cyber mb-3 bg-ag-bg/50 p-3 rounded-xl border border-ag-border/50">
                        {task.answer_prompt}
                      </p>
                      <input
                        type="text"
                        value={answer}
                        onChange={e => setAnswer(e.target.value)}
                        placeholder="Type the secret keycode here..."
                        className="cyber-input w-full h-12 text-sm uppercase font-mono-cyber tracking-wide rounded-xl"
                        autoComplete="off"
                        required
                      />
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            /* System Recovery Report (Shown on completion success) */
            <div className="ag-panel p-6 text-center border-ag-green/40 space-y-5 bg-ag-elevated/20">
              <div className="w-10 h-10 mx-auto mb-2 rounded-full border border-ag-green bg-ag-green/5 flex items-center justify-center animate-pulse">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-ag-green">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <div className="font-orbitron text-xs font-black text-ag-green uppercase tracking-wider">CHALLENGE COMPLETED & STATION SECURED!</div>
              
              <div className="space-y-3 max-w-xs mx-auto text-left font-mono-cyber text-[10px]">
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-ag-cyan font-bold">CAMPUS ORIENTATION SCORE</span>
                    <span className="text-ag-green font-bold">+150 PTS</span>
                  </div>
                  <div className="h-1 bg-ag-elevated rounded-full overflow-hidden"><div className="h-full bg-ag-cyan" style={{ width: '100%' }} /></div>
                </div>
              </div>

              <div className="text-ag-muted text-[9px] font-mono-cyber uppercase tracking-wider mt-2 animate-pulse">
                {submitResult.nextCheckpoint
                  ? `NEXT STATION TO VISIT: ${submitResult.nextCheckpoint.label}`
                  : 'ALL LOBBY STATIONS SECURED!'}
              </div>
            </div>
          )}
        </div>

        <div className="bg-ag-surface border-t border-ag-border px-4 pt-3.5 pb-6 space-y-4 z-10">
          {!hasResult ? (
            <>
              {/* Step Navigation Details */}
              {taskStep === 0 && (
                <button
                  onClick={() => {
                    try { playClickSound(); } catch(e){}
                    setTaskStep(1);
                  }}
                  className="ag-btn-solid w-full h-14 font-orbitron text-sm tracking-wider uppercase font-black"
                >
                  LOCK SELECTION ➔
                </button>
              )}

              {taskStep === 1 && (
                <div className="flex gap-4">
                  <button
                    onClick={() => {
                      try { playClickSound(); } catch(e){}
                      setProtocolTimeLeft(task?.duration_seconds || 45);
                      setProtocolTimerActive(true);
                    }}
                    className="flex-1 h-14 border border-ag-purple bg-ag-purple/5 text-ag-purple hover:bg-ag-purple/10 font-orbitron text-sm tracking-wider uppercase rounded-xl font-black transition-colors"
                  >
                    START TIMER
                  </button>
                  <button
                    onClick={() => {
                      try { playClickSound(); } catch(e){}
                      setTaskStep(2);
                    }}
                    disabled={!timerCompleted}
                    className={`flex-1 h-14 font-orbitron text-sm font-black tracking-wider rounded-xl transition-all
                      ${timerCompleted
                        ? 'bg-ag-cyan text-ag-bg hover:opacity-90 shadow-[0_0_10px_rgba(0,255,210,0.35)] cursor-pointer'
                        : 'bg-ag-bg/40 border border-ag-border/30 text-ag-muted cursor-not-allowed opacity-50'
                      }`}
                  >
                    NEXT: CONNECT SIGNAL ➔
                  </button>
                </div>
              )}

              {taskStep === 2 && (
                <>
                  {/* Hint request buttons */}
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => {
                        try { playClickSound(); } catch(e){}
                        setShowHints(v => !v);
                      }}
                      disabled={hintsList.length === 0}
                      className="text-xs text-ag-muted underline font-mono-cyber disabled:opacity-40 uppercase tracking-wider"
                    >
                      {hintsList.length > 0 ? `${showHints ? 'Hide' : 'Show'} Hints (${hintsList.length})` : 'No hints used'}
                    </button>
                    <button
                      onClick={() => {
                        try { playClickSound(); } catch(e){}
                        handleRequestHint();
                      }}
                      disabled={hintsUsed >= 3 || hintLoading}
                      className="h-10 px-4 rounded-lg border border-ag-yellow text-ag-yellow bg-ag-yellow/5 hover:bg-ag-yellow/10 text-xs font-orbitron tracking-wider uppercase transition-colors"
                    >
                      {hintLoading ? 'DECRYPTING...' : `GET HINT (${3 - hintsUsed})`}
                    </button>
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={() => {
                        try { playClickSound(); } catch(e){}
                        setTaskStep(1);
                      }}
                      className="w-1/4 h-14 border border-ag-border/50 text-ag-muted font-orbitron text-xs tracking-wider uppercase rounded-xl transition-colors"
                    >
                      ← BACK
                    </button>
                    <button
                      onClick={() => {
                        try { playClickSound(); } catch(e){}
                        handleComplete();
                      }}
                      disabled={submitting || !bypassUnlocked || !answer.trim()}
                      className={`flex-1 h-14 font-orbitron text-sm font-black uppercase tracking-wider rounded-xl transition-all
                        ${(bypassUnlocked && answer.trim())
                          ? 'bg-ag-green text-ag-bg hover:opacity-90 shadow-[0_0_12px_rgba(0,255,136,0.35)] cursor-pointer' 
                          : 'bg-ag-bg/60 border border-ag-border/50 text-ag-muted cursor-not-allowed'}`}
                    >
                      {submitting ? 'SUBMITTING...' : 'SUBMIT ANSWER'}
                    </button>
                  </div>
                </>
              )}
            </>
          ) : submitResult?.nextCheckpoint ? (
            <button onClick={handleAdvance} className="ag-btn-solid w-full h-12 font-orbitron text-xs tracking-wider uppercase">
              GO TO NEXT STATION ➔
            </button>
          ) : (
            <button onClick={() => setPhase(PHASE.FINISHED)} className="ag-btn-solid w-full h-12 font-orbitron text-xs tracking-wider uppercase">
              SHOW RESULTS ➔
            </button>
          )}
        </div>

        {/* Screen 9: TIMER SCREEN (PROTOCOL ACTIVE) */}
        {protocolTimerActive && (
          <ProtocolTimerOverlay
            task={task}
            selectedOptionId={selectedOptionId}
            protocolTimeLeft={protocolTimeLeft}
            onAbort={() => setProtocolTimerActive(false)}
          />
        )}
      </div>
    );
  }


  // ── FINISHED ──
  if (phase === PHASE.FINISHED) {
    return (
      <FinishedScreen
        onOpenResults={openResults}
        onExit={() => { clearStudentSession(); navigate('/'); }}
      />
    );
  }


  return null;
}
