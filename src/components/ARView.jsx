import { useRef, useEffect, useState } from 'react';
import { fmtDistance, UNLOCK_DISTANCE } from '../utils.js';
import { playUnlockSound, playSuccessSound, playClickSound } from '../utils/audio.js';

const BUILDING_SECRETS = {
  dfki: {
    icon: '🤖',
    tag: 'AI RESEARCH LAB',
    title: 'DFKI - German Research Center for AI',
    secret: 'World-renowned AI institute! Birthplace of robotics, computer vision, and neural language models on campus.',
    reward: '+50 XP AI Pioneer Badge'
  },
  mensa: {
    icon: '🍔',
    tag: 'STUDENT DINING HALL',
    title: 'Mensa Saarbrücken (Building D4 1)',
    secret: 'Voted one of Germany\'s top campus dining halls! Serves over 4,000 fresh student meals daily.',
    reward: '+50 XP Mensa Gourmet Badge'
  },
  khg: {
    icon: '☕',
    tag: 'STUDENT LOUNGE & CAFE',
    title: 'KHG Cafe (Building A3 1)',
    secret: 'Popular student lounge, espresso bar, and international student meetup venue.',
    reward: '+50 XP Social Hub Badge'
  },
  sulb: {
    icon: '📚',
    tag: 'UNIVERSITY LIBRARY',
    title: 'SULB Library (Building B1 1)',
    secret: 'Saarland State & University Library holding over 1.4 million volumes and 24/7 digital archives.',
    reward: '+50 XP Scholar Badge'
  },
  campusmarkt: {
    icon: '🛒',
    tag: 'CAMPUS MARKET',
    title: 'Campusmarkt (Building C5 5)',
    secret: 'On-campus market supplying fresh snacks, organic coffee, and daily university essentials.',
    reward: '+50 XP Campus Scout Badge'
  },
  innovation: {
    icon: '💡',
    tag: 'INNOVATION CENTER',
    title: 'Innovation Center (Building A2 1)',
    secret: 'Hub for Saarland University startups, AI spin-offs, and technology transfer labs!',
    reward: '+50 XP Tech Innovator Badge'
  }
};

function getBuildingSecret(label) {
  if (!label) return BUILDING_SECRETS.innovation;
  const l = label.toLowerCase();
  if (l.includes('dfki')) return BUILDING_SECRETS.dfki;
  if (l.includes('mensa')) return BUILDING_SECRETS.mensa;
  if (l.includes('khg')) return BUILDING_SECRETS.khg;
  if (l.includes('sulb') || l.includes('library')) return BUILDING_SECRETS.sulb;
  if (l.includes('markt') || l.includes('market')) return BUILDING_SECRETS.campusmarkt;
  return BUILDING_SECRETS.innovation;
}

export default function ARView({ userPos, currentCp, distance, canUnlock, onUnlock, onClose, taskLoading, onCameraReady }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  const [cameraError, setCameraError] = useState('');
  const [cameraReady, setCameraReady] = useState(false);
  const [initProgress, setInitProgress] = useState(0);
  const [initStage, setInitStage] = useState('REQUESTING CAMERA ACCESS');

  // Captured photo preview state
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [photoNote, setPhotoNote] = useState('');
  const [submittingPhoto, setSubmittingPhoto] = useState(false);
  const [arToast, setArToast] = useState('');

  const triggerArToast = (msg) => {
    setArToast(msg);
    setTimeout(() => setArToast(''), 3200);
  };

  // Interactive 3D AR Beacon secret modal state
  const [showSecretModal, setShowSecretModal] = useState(false);
  const secretInfo = getBuildingSecret(currentCp?.label);

  const handleTapARBeacon = () => {
    if (!canUnlock) {
      triggerArToast(`LOCATION LOCK REQUIRED: Walk within 20m of ${currentCp?.label || 'the station'} to touch 3D Beacon.`);
      return;
    }
    try { playUnlockSound(); } catch (e) {}
    setShowSecretModal(true);
  };

  // Smoothly tick progress up to 100% while initializing camera
  useEffect(() => {
    if (cameraReady) {
      setInitProgress(100);
      setInitStage('AR SCANNER & CAMERA ONLINE');
      return;
    }
    const id = setInterval(() => {
      setInitProgress(p => (p < 95 ? Math.min(95, p + (95 - p) * 0.08 + 0.6) : p));
    }, 120);
    return () => clearInterval(id);
  }, [cameraReady]);

  // Camera stream initialization
  useEffect(() => {
    let isMounted = true;
    async function start() {
      let stream = null;
      try {
        setInitStage('REQUESTING CAMERA ACCESS');
        if (!navigator?.mediaDevices?.getUserMedia) {
          throw new Error('Camera access not supported or disabled on HTTP origin.');
        }

        let constraints = { video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false };
        try {
          if (navigator.mediaDevices.enumerateDevices) {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const backCam = devices?.filter(d => d.kind === 'videoinput')?.find(d =>
              d.label?.toLowerCase().includes('back') ||
              d.label?.toLowerCase().includes('rear') ||
              d.label?.toLowerCase().includes('environment')
            );
            if (backCam) {
              constraints.video = { deviceId: { exact: backCam.deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } };
            }
          }
        } catch (e) { /* fallback */ }

        setInitStage('STARTING CAMERA STREAM');
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (err) {
          if (navigator.mediaDevices.getUserMedia) {
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          }
        }

        if (stream && isMounted) {
          streamRef.current = stream;
          setInitStage('ATTACHING AR HUD');
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
          setCameraReady(true);
          onCameraReady?.();
        } else {
          throw new Error('Could not obtain video stream.');
        }
      } catch (err) {
        console.warn('Camera startup warning:', err);
        if (isMounted) {
          setCameraError(err.message || 'Camera access restricted. You can upload/take a photo from your file gallery.');
          setCameraReady(true);
          onCameraReady?.();
        }
      }
    }
    start();
    return () => {
      isMounted = false;
      streamRef.current?.getTracks()?.forEach(t => t.stop());
    };
  }, [onCameraReady]);

  // Draw AR Target Reticle Overlay on Canvas
  useEffect(() => {
    let animId;

    function draw() {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;

      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h * 0.42;

      // Color scheme: Violet (navigating) -> Gold (unlocked/reached)
      const neonColor = canUnlock ? '#FFC800' : '#B14EFF';

      // ─── CAMERA TARGET LOCK RETICLE ───
      const boxSize = Math.min(w, h) * 0.36;
      const half = boxSize / 2;
      const len = 28;

      ctx.strokeStyle = neonColor;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 4;

      // Top-Left
      ctx.beginPath(); ctx.moveTo(cx - half, cy - half + len); ctx.lineTo(cx - half, cy - half); ctx.lineTo(cx - half + len, cy - half); ctx.stroke();
      // Top-Right
      ctx.beginPath(); ctx.moveTo(cx + half, cy - half + len); ctx.lineTo(cx + half, cy - half); ctx.lineTo(cx + half - len, cy - half); ctx.stroke();
      // Bottom-Left
      ctx.beginPath(); ctx.moveTo(cx - half, cy + half - len); ctx.lineTo(cx - half, cy + half); ctx.lineTo(cx - half + len, cy + half); ctx.stroke();
      // Bottom-Right
      ctx.beginPath(); ctx.moveTo(cx + half, cy + half - len); ctx.lineTo(cx + half, cy + half); ctx.lineTo(cx + half - len, cy + half); ctx.stroke();

      // Pulsing Center Target Ring
      const timeSec = Date.now() / 1000;
      const pulseR  = 16 + Math.sin(timeSec * 4) * 4;
      ctx.strokeStyle = neonColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, pulseR, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = neonColor;
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fill();

      animId = requestAnimationFrame(draw);
    }

    animId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animId);
  }, [canUnlock, currentCp]);

  // Capture Frame directly from AR Camera Video Stream
  const handleTakePhotoFromStream = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      fileInputRef.current?.click();
      return;
    }

    const captureCanvas = document.createElement('canvas');
    captureCanvas.width = video.videoWidth;
    captureCanvas.height = video.videoHeight;

    const ctx = captureCanvas.getContext('2d');
    ctx.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);

    // Scale canvas to max 800px width for fast lightweight upload & storage
    const maxW = 800;
    let w = video.videoWidth;
    let h = video.videoHeight;
    if (w > maxW) {
      h = Math.round((h * maxW) / w);
      w = maxW;
    }
    const scaledCanvas = document.createElement('canvas');
    scaledCanvas.width = w;
    scaledCanvas.height = h;
    const sCtx = scaledCanvas.getContext('2d');
    if (sCtx) {
      sCtx.drawImage(captureCanvas, 0, 0, w, h);
      setCapturedPhoto(scaledCanvas.toDataURL('image/jpeg', 0.70));
    } else {
      setCapturedPhoto(captureCanvas.toDataURL('image/jpeg', 0.70));
    }
  };

  // Fallback photo file upload
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCapturedPhoto(reader.result);
    reader.readAsDataURL(file);
  };

  // Submit captured photo to task handler
  const handleSubmitCapturedPhoto = () => {
    if (!capturedPhoto || submittingPhoto) return;
    setSubmittingPhoto(true);
    onUnlock?.({ photo: capturedPhoto, note: photoNote });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black overflow-hidden select-none font-orbitron">
      {/* Non-blocking Cyber Toast Overlay */}
      {arToast && (
        <div className="absolute top-20 left-4 right-4 z-50 max-w-md mx-auto ag-fade-in pointer-events-none">
          <div className="cockpit-panel border-2 border-ag-yellow bg-ag-bg/95 backdrop-blur-md px-4 py-3 text-center shadow-[0_0_25px_rgba(255,200,0,0.4)]">
            <span className="font-orbitron font-bold text-xs text-ag-yellow uppercase tracking-wider block">
              {arToast}
            </span>
          </div>
        </div>
      )}

      {/* Hidden file input for upload fallback */}
      <input
        type="file"
        accept="image/*"
        capture="environment"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Camera feed */}
      {!capturedPhoto && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          onLoadedMetadata={() => { setCameraReady(true); onCameraReady?.(); }}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Captured Photo Preview overlay */}
      {capturedPhoto && (
        <div className="absolute inset-0 z-20 bg-black flex flex-col items-center justify-center p-4">
          <div className="relative w-full max-w-md rounded-2xl overflow-hidden border-2 border-ag-gold shadow-[0_0_30px_rgba(255,200,0,0.3)] bg-ag-surface">
            <img src={capturedPhoto} alt="Station Submission" className="w-full max-h-[60vh] object-contain mx-auto" />
            <div className="absolute top-3 left-3 bg-ag-bg/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-ag-gold text-ag-gold font-orbitron font-black text-[10px] tracking-wider uppercase">
              ✓ AR PHOTO CAPTURED
            </div>
          </div>
        </div>
      )}

      {/* AR Reticle Overlay (when no photo captured yet) */}
      {!capturedPhoto && (
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-10" />
      )}

      {/* ── INTERACTIVE 3D AR LANDMARK BEACON OVER CAMERA STREAM ── */}
      {!capturedPhoto && cameraReady && (
        <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center">
          <div className="relative flex flex-col items-center pointer-events-auto -mt-16">
            
            {/* Outer Orbiting Holographic Ring */}
            <div className={`w-44 h-44 sm:w-52 sm:h-52 rounded-full border-2 border-dashed ${canUnlock ? 'border-ag-gold animate-[spin_15s_linear_infinite]' : 'border-ag-violet-glow animate-[spin_25s_linear_infinite]'} opacity-75 flex items-center justify-center`} />

            {/* Interactive 3D Beacon Core Button */}
            <button
              onClick={handleTapARBeacon}
              className={`absolute inset-0 m-auto w-28 h-28 sm:w-32 sm:h-32 rounded-full flex flex-col items-center justify-center text-center p-2 shadow-2xl transition-transform transform active:scale-90 hover:scale-105 cursor-pointer ${
                canUnlock
                  ? 'bg-gradient-to-tr from-ag-gold/30 via-ag-violet/40 to-ag-gold/30 border-2 border-ag-gold text-ag-gold animate-bounce shadow-[0_0_25px_rgba(255,200,0,0.4)]'
                  : 'bg-ag-bg/80 border border-ag-violet-glow/60 text-ag-violet-glow'
              }`}
            >
              <span className="text-2xl sm:text-3xl mb-0.5">{secretInfo.icon}</span>
              <span className="font-orbitron font-black text-[9px] sm:text-[10px] uppercase tracking-wider leading-none text-ag-text">
                {currentCp?.label?.split('(')[0]?.trim() || 'BUILDING'}
              </span>
              <span className="font-mono-cyber text-[8px] text-ag-gold uppercase mt-1 font-bold">
                {canUnlock ? 'TOUCH 3D BEACON ⚡' : 'LOCKED (20M)'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* ── INTERACTIVE 3D AR LANDMARK SECRET MODAL ── */}
      {showSecretModal && (
        <div className="absolute inset-0 z-40 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 ag-fade-in">
          <div className="cockpit-panel w-full max-w-md p-6 space-y-5 border-2 border-ag-gold text-center relative shadow-[0_0_30px_rgba(255,200,0,0.3)]">
            
            {/* Top Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-ag-gold/15 border border-ag-gold/40 text-ag-gold text-[10px] font-orbitron font-black uppercase tracking-widest">
              <span>{secretInfo.icon}</span>
              <span>{secretInfo.tag}</span>
            </div>

            <div className="space-y-2">
              <h3 className="font-orbitron font-black text-xl text-ag-yellow uppercase tracking-wider">
                {secretInfo.title}
              </h3>
              <p className="font-mono-cyber text-xs text-ag-text/90 leading-relaxed uppercase bg-ag-bg/60 p-4 rounded-xl border border-ag-border/50">
                "{secretInfo.secret}"
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 text-ag-green font-orbitron font-black text-xs uppercase tracking-wider">
              <span>⚡ REWARD:</span>
              <span>{secretInfo.reward}</span>
            </div>

            <div className="space-y-2.5 pt-2">
              <button
                onClick={() => {
                  try { playSuccessSound(); } catch (e) {}
                  setShowSecretModal(false);
                  handleTakePhotoFromStream();
                }}
                className="cockpit-btn w-full py-4 text-xs tracking-[0.25em] shadow-[0_0_20px_rgba(0,255,136,0.4)] bg-gradient-to-r from-ag-green/20 via-ag-cyan/30 to-ag-green/20 border-ag-green text-ag-green font-black"
              >
                ⚡ COLLECT 3D AR CORE & SNAP PHOTO 📸
              </button>

              <button
                onClick={() => setShowSecretModal(false)}
                className="cockpit-btn-secondary w-full py-3 text-xs tracking-[0.2em] text-ag-muted"
              >
                ✕ CLOSE AR DISCOVERY
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Warm-up progress overlay */}
      {!cameraReady && !cameraError && !capturedPhoto && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-ag-bg/85 backdrop-blur-sm px-6">
          <div className="cockpit-panel w-full max-w-sm px-6 py-7 text-center space-y-5">
            <div className="flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-ag-cyan animate-pulse" />
              <span className="font-orbitron font-black text-ag-cyan text-sm tracking-[0.3em]">
                INITIALIZING AR CAMERA
              </span>
            </div>

            <div className="space-y-2">
              <div className="h-2 w-full rounded-full bg-[rgba(0,255,210,0.08)] border border-ag-cyan/30 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-ag-cyan to-ag-yellow transition-[width] duration-150 ease-out"
                  style={{ width: `${Math.round(initProgress)}%`, boxShadow: '0 0 12px rgba(0,255,210,0.6)' }}
                />
              </div>
              <div className="flex justify-between font-mono-cyber text-[10px] uppercase tracking-widest">
                <span className="text-ag-text/70">{initStage}</span>
                <span className="text-ag-yellow font-black">{Math.round(initProgress)}%</span>
              </div>
            </div>

            <p className="font-mono-cyber text-[10px] text-ag-muted uppercase tracking-wider leading-relaxed">
              [ POINT CAMERA AT STATION BUILDING OR LANDMARK ]
            </p>
          </div>
        </div>
      )}

      {/* Top HUD Header */}
      <div
        className="absolute top-0 left-0 right-0 px-4 pt-safe-top pb-6 flex items-start justify-center z-30"
        style={{ background: 'linear-gradient(to bottom, rgba(10,3,20,0.92) 0%, transparent 100%)' }}
      >
        <div className="cockpit-panel px-6 py-3 flex items-center gap-4 max-w-md w-full border-b border-ag-cyan/30">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-ag-cyan animate-ping" />
              <span className="font-orbitron font-black text-ag-cyan text-xs sm:text-sm tracking-[0.2em] uppercase">
                AR STATION SCANNER
              </span>
            </div>
            {currentCp && (
              <div className="font-mono-cyber text-[11px] text-ag-gold uppercase tracking-wider font-bold leading-snug truncate">
                {currentCp.label}
                {currentCp.address && (
                  <div className="text-[10px] text-ag-cyan mt-0.5 tracking-normal font-normal truncate">
                    {currentCp.address}
                  </div>
                )}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="cockpit-btn-secondary px-4 py-2 text-xs tracking-[0.2em] shrink-0"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Bottom Control Panel */}
      <div
        className="absolute bottom-0 left-0 right-0 px-4 pb-8 pt-4 z-30"
        style={{ background: 'linear-gradient(to top, rgba(10,3,20,0.95) 0%, transparent 100%)' }}
      >
        <div className="max-w-md mx-auto space-y-3">
          {!capturedPhoto ? (
            <>
              <button
                onClick={() => {
                  if (!canUnlock) {
                    triggerArToast(`LOCATION LOCK REQUIRED: Walk within 20m of ${currentCp?.label || 'the station'} to take photo.`);
                    return;
                  }
                  handleTakePhotoFromStream();
                }}
                disabled={!canUnlock || taskLoading}
                className={`cockpit-btn w-full px-8 py-4 text-xs sm:text-sm tracking-[0.25em] ${
                  canUnlock
                    ? 'shadow-[0_0_30px_rgba(0,255,136,0.5)] bg-gradient-to-r from-ag-green/20 via-ag-cyan/30 to-ag-green/20 border-ag-green text-ag-green font-black'
                    : 'opacity-60 cursor-not-allowed border-ag-yellow text-ag-yellow bg-ag-bg/90 shadow-none'
                }`}
              >
                {!canUnlock ? `LOCATION LOCK REQUIRED (${userPos ? fmtDistance(distance) : 'SEARCHING...'} / 20M)` : 'TAKE PHOTO'}
              </button>

              <div className="flex justify-between items-center px-1 text-[10px] font-mono-cyber text-ag-muted">
                <span>DISTANCE: {distance != null ? fmtDistance(distance) : 'SEARCHING...'}</span>
                <span className={canUnlock ? 'text-ag-green font-bold' : 'text-ag-yellow font-bold'}>
                  {canUnlock ? 'WITHIN 20M RANGE' : `WALK WITHIN ${UNLOCK_DISTANCE}M`}
                </span>
              </div>
            </>
          ) : (
            <>
              <input
                type="text"
                value={photoNote}
                onChange={e => setPhotoNote(e.target.value)}
                placeholder="ADD NOTE OR CAPTION (OPTIONAL)..."
                className="cyber-input w-full h-11 text-xs font-mono-cyber text-center"
              />

              <button
                onClick={handleSubmitCapturedPhoto}
                disabled={submittingPhoto}
                className="cockpit-btn w-full px-8 py-4 text-xs sm:text-sm tracking-[0.25em] shadow-[0_0_30px_rgba(0,255,136,0.4)]"
              >
                {submittingPhoto ? 'SUBMITTING...' : 'SUBMIT PHOTO'}
              </button>

              <button
                onClick={() => setCapturedPhoto(null)}
                disabled={submittingPhoto}
                className="cockpit-btn-secondary w-full py-3 text-xs tracking-[0.2em] text-ag-magenta border-ag-magenta/40"
              >
                RETAKE PHOTO
              </button>
            </>
          )}

          <button
            onClick={onClose}
            disabled={submittingPhoto}
            className="cockpit-btn-secondary w-full px-8 py-3 text-xs tracking-[0.25em]"
          >
            RETURN TO MAP
          </button>
        </div>
      </div>
    </div>
  );
}
