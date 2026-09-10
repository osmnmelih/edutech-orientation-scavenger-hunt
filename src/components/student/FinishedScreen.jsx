/**
 * End-of-mission success screen. Pure presentational.
 */
export default function FinishedScreen({ onOpenResults, onExit }) {
  return (
    <div className="min-h-screen bg-ag-bg flex flex-col items-center justify-center p-6 text-center relative overflow-hidden cockpit-curve animate-fade-in">
      <div className="scanlines opacity-15" />

      <div className="z-10 space-y-6 max-w-md w-full">
        <div className="w-16 h-16 mx-auto rounded-full border-2 border-ag-green bg-ag-green/10 flex items-center justify-center animate-pulse">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-ag-green">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>

        <div className="space-y-2">
          <div className="font-orbitron text-xs font-bold text-ag-green tracking-[0.25em] uppercase">
            HUNT COMPLETED
          </div>
          <h1 className="font-orbitron text-2xl font-black text-white tracking-wider uppercase">
            ALL CAMPUS LOCATIONS SECURED!
          </h1>
        </div>

        {/* ── BACK TO EDUTECH DEPARTMENT PANEL ── */}
        <div className="cockpit-panel p-6 border-2 border-ag-gold bg-ag-surface/95 space-y-3 rounded-2xl shadow-[0_0_30px_rgba(255,200,0,0.25)]">
          <div className="text-[10px] text-ag-muted font-mono-cyber uppercase tracking-widest">
            FINAL DESTINATION
          </div>
          <div className="font-orbitron font-black text-xl text-ag-gold uppercase tracking-wider">
            BACK TO EDUTECH DEPARTMENT
          </div>
          <div className="font-mono-cyber text-sm text-ag-cyan font-bold uppercase tracking-wider">
            Campus C5 4, 66123 Saarbrücken
          </div>
          <p className="text-[10px] text-ag-text/80 font-mono-cyber uppercase tracking-wider pt-3 border-t border-white/10">
            Universität des Saarlandes, MSc Educational Technology
          </p>
        </div>

        <div className="flex flex-col items-center gap-3 w-full pt-2">
          <button onClick={onOpenResults} className="cockpit-btn-secondary w-full py-4 text-xs tracking-[0.2em] uppercase font-bold">
            SCOREBOARD
          </button>
          <button onClick={onExit} className="cockpit-btn w-full py-4 text-xs tracking-[0.2em] uppercase font-bold">
            FINISH HUNT
          </button>
        </div>
      </div>
    </div>
  );
}
