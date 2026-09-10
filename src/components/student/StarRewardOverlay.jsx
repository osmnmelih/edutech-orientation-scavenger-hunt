import { useEffect } from 'react';
import { playSuccessSound } from '../../utils/audio.js';

export default function StarRewardOverlay({ starsEarned, totalStars, nextCheckpointLabel, onContinue }) {
  useEffect(() => {
    try { playSuccessSound(); } catch (e) {}
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-6 ag-fade-in font-orbitron">
      <div className="cockpit-panel max-w-sm w-full p-8 text-center space-y-6 border-2 border-ag-gold relative overflow-hidden bg-ag-bg/95 shadow-[0_0_50px_rgba(255,200,0,0.4)]">
        {/* Ambient starburst background glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-ag-gold/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-ag-cyan/20 rounded-full blur-3xl pointer-events-none" />

        {/* Animated Big Gold Star */}
        <div className="relative mx-auto w-28 h-28 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-4 border-ag-gold/50 animate-ping" style={{ animationDuration: '2s' }} />
          <div className="text-7xl animate-bounce" style={{ animationDuration: '1.2s' }}>
            ⭐
          </div>
        </div>

        {/* Title */}
        <div className="space-y-1">
          <div className="text-xs text-ag-gold tracking-[0.3em] font-black uppercase animate-pulse">
            MISSION CHALLENGE COMPLETED!
          </div>
          <h2 className="text-2xl font-black text-white tracking-wider uppercase bg-gradient-to-r from-ag-gold via-ag-yellow to-ag-cyan bg-clip-text text-transparent">
            +1 STAR UNLOCKED!
          </h2>
        </div>

        {/* Star Badge Count Display */}
        <div className="p-4 rounded-xl bg-ag-gold/10 border border-ag-gold/40 flex items-center justify-center gap-3">
          <div className="flex gap-1.5 text-2xl">
            {Array.from({ length: totalStars || 4 }).map((_, idx) => (
              <span
                key={idx}
                className={`transition-all duration-300 ${
                  idx < starsEarned
                    ? 'text-ag-gold scale-110 drop-shadow-[0_0_8px_rgba(255,200,0,0.8)]'
                    : 'text-white/20'
                }`}
              >
                ★
              </span>
            ))}
          </div>
          <span className="font-mono-cyber text-xs text-ag-gold font-bold">
            ({starsEarned} / {totalStars || 4})
          </span>
        </div>

        {/* Next Location Preview */}
        {nextCheckpointLabel ? (
          <div className="text-[11px] font-mono-cyber text-ag-text/90 uppercase tracking-wider bg-black/50 p-3 rounded-lg border border-ag-cyan/30">
            <span className="text-ag-cyan font-bold block mb-0.5">NEXT LOCATION:</span>
            <span className="text-ag-yellow font-bold truncate block">{nextCheckpointLabel}</span>
          </div>
        ) : (
          <div className="text-[11px] font-mono-cyber text-ag-green uppercase tracking-wider bg-ag-green/10 p-3 rounded-lg border border-ag-green/40 font-bold">
            ALL CAMPUS LOCATIONS COMPLETED!
          </div>
        )}

        {/* Continue Button */}
        <button
          onClick={onContinue}
          className="cockpit-btn w-full py-4 text-xs tracking-[0.25em] shadow-[0_0_20px_rgba(255,200,0,0.4)]"
        >
          CONTINUE HUNT
        </button>
      </div>
    </div>
  );
}
