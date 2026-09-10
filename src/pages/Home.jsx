import { useState, useEffect } from 'react';
import { useNavigate } from '../router-compat.jsx';
import { sessions } from '../api.js';
import { playClickSound, playSuccessSound, startAmbientSpaceMusic, stopAmbientSpaceMusic } from '../utils/audio.js';
import CockpitFrame from '../components/CockpitFrame.jsx';
import OptionSelector from '../components/OptionSelector.jsx';
import { SAARLAND_EDUTECH_PRESETS } from '../utils.js';

export default function Home() {
  const navigate = useNavigate();
  const initialStage = (typeof window !== 'undefined' && window.location.hash === '#role') ? 'role' : 'splash';
  const [stage, setStage] = useState(initialStage); // 'splash' | 'role' | 'register'

  const [callsign, setCallsign]               = useState('');
  const [selectedOption, setSelectedOption]   = useState('option_a'); // 'option_a' | 'option_b'
  const [joinCode]                            = useState('EDUTECH26');
  const [joining, setJoining]                 = useState(false);
  const [joinError, setJoinError]             = useState('');

  const click   = () => { try { playClickSound();   } catch (e) {} };
  const success = () => { try { playSuccessSound(); } catch (e) {} };

  // Direct QR Code Auto-fill if query parameter present
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const trackParam = params.get('track');
      if (trackParam === 'b') setSelectedOption('option_b');
      else if (trackParam === 'a') setSelectedOption('option_a');
    }
  }, []);

  function handleBeginMission() {
    click();
    try { startAmbientSpaceMusic(); } catch (e) {}

    // Request browser geolocation permission
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => console.log("Location permission granted."),
        (err) => {
          console.warn("Location permission error:", err);
          if (err.code === 1) {
            alert("Please allow location permission in your browser. Location access is required for the campus orientation scavenger hunt.");
          }
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    }
    setStage('role');
  }

  function navigateToGame(path) {
    try { stopAmbientSpaceMusic(); } catch (e) {}
    navigate(path);
  }

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!callsign.trim() || !joinCode.trim()) return;
    click();
    setJoining(true);
    setJoinError('');

    const combinedName = callsign.trim().toUpperCase();

    try {
      let sessionData = null;
      let teamData = null;

      try {
        const joinPromise = sessions.join(joinCode.trim().toUpperCase(), combinedName);
        const fastFallback = new Promise((_, reject) => setTimeout(() => reject(new Error('Fast local fallback')), 600));
        const { data } = await Promise.race([joinPromise, fastFallback]);
        sessionData = data.session;
        teamData = data.team;
      } catch (err) {
        // Instant fallback for standalone orientation day play (creates local preset session)
        console.warn("Fast local EduTech preset session active:", err);
        const preset = SAARLAND_EDUTECH_PRESETS[selectedOption.toUpperCase()] || SAARLAND_EDUTECH_PRESETS.OPTION_A;
        sessionData = {
          id: `edutech_local_${Date.now()}`,
          name: `Universität des Saarlandes, MSc Educational Technology (${preset.badge})`,
          join_code: joinCode.trim().toUpperCase(),
          checkpoints: preset.checkpoints.map((cp, idx) => ({
            id: idx + 1,
            label: cp.label,
            address: cp.address,
            lat: cp.lat,
            lng: cp.lng,
            challenge: cp.challenge,
            task_type: cp.task_type,
            points: cp.points,
            order_index: cp.order_index
          }))
        };
        teamData = {
          id: `team_${Date.now()}`,
          team_name: combinedName,
          score: 0,
          current_checkpoint: 1,
          selected_option: selectedOption
        };
      }

      success();
      const cps = sessionData.checkpoints || SAARLAND_EDUTECH_PRESETS[selectedOption.toUpperCase()].checkpoints;
      const cp  = cps.find(c => c.id === teamData.current_checkpoint) || cps[0];

      localStorage.setItem('orienteering_student_session', JSON.stringify({
        team: teamData,
        session: { id: sessionData.id, name: sessionData.name, join_code: joinCode.trim().toUpperCase() },
        checkpoints: cps,
        currentCpId: cp ? cp.id : -1,
        selectedOption: selectedOption,
        savedAt: new Date().toISOString()
      }));

      try {
        const activeStudentEntry = {
          id: teamData.id,
          name: teamData.team_name,
          routeOption: selectedOption === 'b' ? 'Option B' : 'Option A',
          currentStation: 1,
          currentLocation: cp ? cp.label : 'Innovation Center (Building A2 1)',
          completedCount: 0,
          stars: 0,
          lat: cp ? cp.lat : (selectedOption === 'b' ? 49.25625 : 49.25618),
          lng: cp ? cp.lng : (selectedOption === 'b' ? 7.03960 : 7.03956),
          registeredAt: new Date().toISOString()
        };
        const existingList = JSON.parse(localStorage.getItem('edutech_active_students') || '[]');
        const updatedList = [activeStudentEntry, ...existingList.filter(s => s.id !== activeStudentEntry.id && s.name !== activeStudentEntry.name)];
        localStorage.setItem('edutech_active_students', JSON.stringify(updatedList));

        try {
          const bc = new BroadcastChannel('edutech_scavenger_hunt');
          bc.postMessage({ type: 'STUDENT_REGISTERED', student: activeStudentEntry });
          bc.close();
        } catch (e) {}
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new CustomEvent('edutech_student_update'));
      } catch (e) {}

      try { stopAmbientSpaceMusic(); } catch (e) {}
      navigate('/student');
    } catch (err) {
      setJoinError('Connection error. Please try again.');
    } finally {
      setJoining(false);
    }
  };

  return (
    <CockpitFrame rail={[]} actions={null} title={null}>
      <div className="flex flex-col relative select-none min-h-screen">

        {/* ══════════════ SPLASH / WELCOME ══════════════ */}
        {stage === 'splash' && (
          <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 gap-7 py-8 ag-fade-in z-10 text-center max-w-4xl mx-auto w-full">

            {/* Main Visual Hero Section - Premium Glassmorphic Gold Container */}
            <div className="w-full relative py-8 px-6 flex flex-col items-center justify-center rounded-3xl bg-gradient-to-b from-ag-gold/10 via-ag-surface/60 to-transparent border border-ag-gold/30 shadow-[0_0_40px_rgba(255,200,0,0.15)] backdrop-blur-md">
              
              {/* Main Title - Multi-layered Glowing Gold Typography */}
              <h1 className="relative font-orbitron font-black uppercase tracking-wider text-center flex flex-col items-center z-10">
                <span className="block text-5xl sm:text-7xl md:text-8xl bg-gradient-to-r from-[#FFF0A0] via-[#FFC800] to-[#E6A100] bg-clip-text text-transparent drop-shadow-[0_0_35px_rgba(255,200,0,0.5)] leading-none">
                  EDUTECH
                </span>
                
                {/* Premium Gold Subtitle Pill Badge */}
                <div className="mt-4 inline-flex items-center justify-center px-5 py-1.5 rounded-full bg-ag-gold/15 border border-ag-gold/50 shadow-[0_0_20px_rgba(255,200,0,0.25)]">
                  <span className="text-xs sm:text-sm md:text-base font-orbitron font-black tracking-[0.35em] text-ag-gold uppercase">
                    ORIENTATION SCAVENGER HUNT
                  </span>
                </div>
              </h1>

              {/* Single-Sentence Fun Student Tagline */}
              <p className="relative z-10 font-mono-cyber text-xs sm:text-sm text-ag-text/90 max-w-xl mx-auto tracking-wider mt-6 leading-relaxed font-medium">
                Step onto campus, unlock interactive AR secrets, and turn your orientation into an unforgettable quest!
              </p>
            </div>

            {/* 3 Visual Feature Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl px-2">
              <div className="cockpit-panel p-4 flex flex-col items-center gap-1.5 border-ag-gold/30 bg-ag-surface/70 backdrop-blur-md shadow-md rounded-2xl">
                <span className="font-orbitron font-bold text-xs text-ag-gold tracking-wider uppercase">CAMPUS MAP</span>
                <span className="font-mono-cyber text-[10px] text-ag-muted tracking-wider">GPS Navigation</span>
              </div>

              <div className="cockpit-panel p-4 flex flex-col items-center gap-1.5 border-ag-gold/40 bg-ag-surface/80 backdrop-blur-md shadow-lg rounded-2xl">
                <span className="font-orbitron font-bold text-xs text-ag-gold tracking-wider uppercase">AR CAMERA</span>
                <span className="font-mono-cyber text-[10px] text-ag-muted tracking-wider">Photo Challenges</span>
              </div>

              <div className="cockpit-panel p-4 flex flex-col items-center gap-1.5 border-ag-gold/30 bg-ag-surface/70 backdrop-blur-md shadow-md rounded-2xl">
                <span className="font-orbitron font-bold text-xs text-ag-gold tracking-wider uppercase">SCOREBOARD</span>
                <span className="font-mono-cyber text-[10px] text-ag-muted tracking-wider">Live Rankings</span>
              </div>
            </div>

            {/* Glowing Golden Start Button */}
            <button
              id="btn-begin-mission"
              onClick={handleBeginMission}
              className="cockpit-btn px-10 py-5 text-sm sm:text-base tracking-[0.3em] font-black border-2 border-ag-gold text-ag-gold bg-gradient-to-r from-ag-gold/20 via-yellow-400/20 to-ag-gold/20 hover:bg-ag-gold hover:text-black shadow-[0_0_30px_rgba(255,200,0,0.35)] transform hover:scale-105 transition-all duration-300 rounded-2xl"
            >
              START CAMPUS HUNT ≫
            </button>
          </main>
        )}

        {/* ══════════════ ROLE SELECTION ══════════════ */}
        {stage === 'role' && (
          <main className="flex-1 flex flex-col items-center justify-center px-6 gap-8 py-10 ag-fade-in relative z-10">

            <div className="cockpit-panel px-8 py-3 relative border-2 border-ag-gold/40 text-center">
              <h2 className="font-orbitron text-xl font-black text-ag-gold tracking-[0.25em] uppercase">
                ORIENTATION MODE
              </h2>
            </div>

            <div className="w-full max-w-md flex flex-col gap-5 relative">
              <button
                id="btn-role-scavenger"
                onClick={() => { click(); setStage('register'); }}
                className="cockpit-btn w-full px-8 py-6 text-sm tracking-[0.25em] shadow-[0_0_25px_rgba(0,229,255,0.35)]"
              >
                STUDENT PLAYER ≫ ENTER HUNT
              </button>

              <button
                id="btn-role-operator"
                onClick={() => { success(); navigateToGame('/admin'); }}
                className="cockpit-btn w-full px-8 py-6 text-sm tracking-[0.25em] shadow-[0_0_25px_rgba(138,43,226,0.35)]"
              >
                ADMIN DASHBOARD ≫
              </button>

              <button
                onClick={() => { click(); setStage('splash'); }}
                className="cockpit-btn-secondary w-full px-8 py-4 text-xs tracking-[0.25em] text-ag-muted"
              >
                ← BACK TO WELCOME SCREEN
              </button>
            </div>

          </main>
        )}

        {/* ══════════════ STUDENT REGISTRATION & OPTION A/B SELECTION ══════════════ */}
        {stage === 'register' && (
          <main className="flex-1 flex flex-col items-center justify-center px-6 gap-6 py-8 ag-fade-in z-10 max-w-2xl mx-auto w-full">
            <div className="cockpit-panel px-8 py-3 relative border-2 border-ag-gold/40 text-center">
              <h2 className="font-orbitron text-xl font-black text-ag-gold tracking-[0.25em] uppercase">
                STUDENT REGISTRATION
              </h2>
            </div>

            <form onSubmit={handleJoin} className="w-full flex flex-col gap-5 relative">
              <div>
                <label className="block font-orbitron text-[10px] text-ag-gold tracking-[0.25em] uppercase mb-1.5 text-center">
                  STUDENT NAME / CALLSIGN *
                </label>
                <input
                  type="text"
                  placeholder="E.G. ALEX"
                  value={callsign}
                  onChange={e => setCallsign(e.target.value)}
                  className="cyber-input w-full h-12 text-xs uppercase tracking-wide font-mono-cyber text-center max-w-md mx-auto block"
                  autoComplete="off"
                  required
                />
              </div>

              {/* ── OPTION A VS OPTION B SELECTION BUTTONS ── */}
              <OptionSelector
                selectedOption={selectedOption}
                onSelectOption={(opt) => { click(); setSelectedOption(opt); }}
              />

              <div>
                <label className="block font-orbitron text-[10px] text-ag-gold tracking-[0.25em] uppercase mb-1.5 text-center">
                  ORIENTATION EVENT LOBBY PIN
                </label>
                <input
                  type="text"
                  value="EDUTECH26"
                  readOnly
                  tabIndex={-1}
                  className="cyber-input w-full h-12 text-sm text-ag-gold text-center tracking-[0.3em] uppercase font-black font-mono-cyber max-w-xs mx-auto block cursor-default bg-ag-gold/10 border-ag-gold/60 shadow-[0_0_15px_rgba(255,200,0,0.15)] select-none"
                />
              </div>

              {joinError && (
                <p className="text-ag-magenta text-xs text-center uppercase tracking-[0.25em] font-orbitron">{joinError}</p>
              )}

              <button
                id="btn-join"
                type="submit"
                disabled={joining || !callsign.trim()}
                className="cockpit-btn w-full py-5 text-sm tracking-[0.25em] shadow-[0_0_25px_rgba(0,229,255,0.4)]"
              >
                {joining ? 'STARTING CAMPUS NAVIGATION...' : 'START HUNT'}
              </button>

              <button
                type="button"
                onClick={() => { click(); setStage('role'); }}
                className="cockpit-btn-secondary w-full py-4 text-xs tracking-[0.25em]"
              >
                ← BACK TO ROLE SELECTION
              </button>
            </form>
          </main>
        )}

      </div>
    </CockpitFrame>
  );
}
