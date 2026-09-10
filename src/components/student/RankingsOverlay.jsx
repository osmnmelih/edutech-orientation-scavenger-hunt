import { useMemo } from 'react';

function StarSymbol({ filled }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`w-4 h-4 sm:w-5 sm:h-5 inline-block transition-all ${
        filled ? 'text-ag-gold fill-current drop-shadow-[0_0_8px_rgba(255,200,0,0.85)]' : 'text-white/20 fill-current'
      }`}
    >
      <path d="M12 1.5l3.09 6.26L22 8.77l-5 4.87 1.18 6.88L12 17.27l-6.18 3.25L7 13.64 2 8.77l6.91-1.01L12 1.5z" />
    </svg>
  );
}

/**
 * Full-screen rankings overlay shown while the student is mid-mission.
 * Supports displaying real student teams from both Option A and Option B routes with structured columns and vector star icons.
 */
export default function RankingsOverlay({
  resultsData,
  resultsLoading: _resultsLoading,
  session,
  team,
  checkpointCount = 3,
  onClose,
}) {
  const teamsList = useMemo(() => {
    // 1. If backend data available, use real student teams
    if (resultsData?.teams && Array.isArray(resultsData.teams) && resultsData.teams.length > 0) {
      return resultsData.teams.map((t, idx) => ({
        id: t.id || `team_${idx}`,
        name: t.name || t.team_name || `STUDENT ${idx + 1}`,
        done: Array.isArray(t.completions) ? t.completions.length : (t.completed_count || 0),
        selected_option: t.selected_option || ((t.name || t.team_name || '').includes('Option B') ? 'option_b' : 'option_a')
      })).sort((a, b) => b.done - a.done);
    }

    // 2. Local orientation play: build list from real student session + saved local completions
    let history = [];
    try {
      if (typeof window !== 'undefined') {
        history = JSON.parse(localStorage.getItem('edutech_orientation_completions') || '[]');
      }
    } catch (e) { history = []; }

    const myDone = Array.isArray(history) ? history.length : 0;
    const teamNameStr = team?.team_name || team?.name || 'STUDENT';
    const myTrack = team?.selected_option || (teamNameStr.includes('Option B') ? 'option_b' : 'option_a');

    if (team || myDone > 0) {
      return [
        {
          id: team?.id || 'me',
          name: teamNameStr,
          done: myDone,
          selected_option: myTrack,
          isMe: true
        }
      ];
    }

    return [];
  }, [resultsData, team]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ag-bg font-orbitron select-none">
      <div className="scanlines opacity-20 pointer-events-none" />

      {/* Header */}
      <div className="bg-ag-surface border-b border-ag-border px-4 py-4 flex items-center justify-between z-10">
        <div>
          <h2 className="font-orbitron font-black text-ag-cyan text-sm sm:text-base tracking-widest uppercase">SCOREBOARD & RANKINGS</h2>
          <p className="text-[10px] text-ag-gold font-mono-cyber uppercase font-bold mt-0.5 tracking-wider">
            ALL TRACKS · OPTION A & OPTION B LEADERBOARD
          </p>
        </div>
        <button
          onClick={onClose}
          className="cockpit-btn-secondary px-3.5 py-1.5 text-xs tracking-wider font-bold text-ag-muted hover:text-white"
        >
          ✕
        </button>
      </div>

      {/* Table Content */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3 z-10 max-w-4xl mx-auto w-full">
        {/* Table Column Headers Frame */}
        <div className="cockpit-panel px-4 py-3 grid grid-cols-12 gap-2 items-center text-[10px] font-mono-cyber text-ag-cyan uppercase tracking-widest font-bold border-ag-cyan/40 bg-ag-surface/90 shadow-md">
          <div className="col-span-6 sm:col-span-6 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-ag-cyan animate-pulse" />
            <span>STUDENT NAME</span>
          </div>
          <div className="col-span-4 sm:col-span-4 text-center">STARS COLLECTED</div>
          <div className="col-span-2 sm:col-span-2 text-right">ROUTE</div>
        </div>

        {/* Rows or Empty State */}
        {teamsList.length === 0 ? (
          <div className="cockpit-panel p-8 text-center text-ag-muted text-xs font-mono-cyber uppercase border-ag-border/40 bg-ag-surface/30 space-y-2">
            <div className="text-ag-yellow font-bold tracking-wider">NO ACTIVE RANKINGS LOGGED YET.</div>
            <p className="text-[10px] text-ag-muted font-normal">Real student players will populate here as they join and complete campus stations.</p>
          </div>
        ) : (
          teamsList.map((t, idx) => {
            const isMe = t.isMe || t.id === team?.id;
            const rawName = t.name ? String(t.name) : 'STUDENT';
            const isOptB = t.selected_option === 'option_b' || rawName.includes('Option B') || rawName.includes('[Option B]');
            const cleanName = rawName.replace(/\s*\[.*?\]|\s*\(.*?\)/gi, '').trim() || 'STUDENT';

            return (
              <div
                key={t.id || idx}
                className={`grid grid-cols-12 gap-2 items-center px-4 py-3.5 rounded-xl border transition-all ${
                  isMe
                    ? 'bg-ag-surface/95 border-ag-cyan shadow-[0_0_20px_rgba(0,255,210,0.25)]'
                    : 'bg-ag-surface/40 border-ag-border/50 hover:border-ag-border'
                }`}
              >
                {/* Name */}
                <div className="col-span-6 sm:col-span-6 min-w-0 flex items-center gap-2.5">
                  <div className="font-orbitron font-black text-xs sm:text-sm text-ag-yellow shrink-0">
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}`}
                  </div>
                  <div className="min-w-0">
                    <div className={`font-bold text-xs sm:text-sm truncate ${isMe ? 'text-ag-cyan font-black' : 'text-ag-text'}`}>
                      {cleanName} {isMe && <span className="text-[9px] text-ag-gold ml-1 font-mono-cyber uppercase">(YOU)</span>}
                    </div>
                  </div>
                </div>

                {/* Score & Stars (Only Star Icons, No PTS text) */}
                <div className="col-span-4 sm:col-span-4 flex items-center justify-center">
                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: checkpointCount }).map((_, sIdx) => (
                      <StarSymbol key={sIdx} filled={sIdx < (t.done || 0)} />
                    ))}
                  </div>
                </div>

                {/* Route Option Badge */}
                <div className="col-span-2 sm:col-span-2 text-right">
                  <span
                    className={`inline-block text-[8.5px] sm:text-[9.5px] font-mono-cyber font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                      isOptB
                        ? 'bg-pink-500/20 text-pink-400 border-pink-500/50 shadow-[0_0_8px_rgba(255,0,85,0.2)]'
                        : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 shadow-[0_0_8px_rgba(0,255,210,0.2)]'
                    }`}
                  >
                    {isOptB ? 'OPTION B' : 'OPTION A'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="p-4 z-10 max-w-4xl mx-auto w-full">
        <button
          onClick={onClose}
          className="cockpit-btn w-full py-3.5 font-orbitron text-xs tracking-[0.25em] uppercase shadow-[0_0_20px_rgba(0,255,210,0.3)]"
        >
          BACK TO MAP
        </button>
      </div>
    </div>
  );
}
