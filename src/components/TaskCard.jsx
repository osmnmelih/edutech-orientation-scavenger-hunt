import { playClickSound } from '../utils/audio.js';

// Auto-assigned mission type metadata
const TYPE_META = {
  physical:  { label: 'Physical Action',  color: '#FF0055', icon: '🏃' },
  cognitive: { label: 'Puzzle Solving',  color: '#00FFD2', icon: '🧠' },
  social:    { label: 'Team Play',       color: '#FFC800', icon: '👥' },
  creative:  { label: 'Creative Task',   color: '#00FF88', icon: '🎨' },
};

const THREAT_META = {
  Critical: { label: 'HIGH URGENCY', color: '#FF0055' },
  Warning:  { label: 'STANDARD',     color: '#FFC800' },
  Stable:   { label: 'LOW URGENCY',  color: '#00FF88' },
};

export default function TaskCard({ task, cpIndex = 0, selectedOptionId = null, onSelectOption = () => {}, step = 0 }) {
  const meta    = TYPE_META[task.type] || TYPE_META.physical;
  const threat  = THREAT_META[task.anomaly_level] || THREAT_META.Warning;

  // Parse transmission lines case-insensitively
  const rawLines = (task.radio_transmission || '').split('\n').filter(Boolean);
  const transmissionLines = {};
  
  rawLines.forEach(line => {
    const colonIdx = line.indexOf(':');
    if (colonIdx !== -1) {
      const key = line.substring(0, colonIdx).trim().toUpperCase();
      const val = line.substring(colonIdx + 1).trim();
      transmissionLines[key] = val;
    }
  });

  const goal = transmissionLines.GOAL || transmissionLines.OBJECTIVE || '';
  const reward = transmissionLines.REWARD || '';

  const autonomyOptions = task.sdt_mechanics?.autonomy_options || [];
  const selectedOption = autonomyOptions.find(opt => opt.id === selectedOptionId) || autonomyOptions[0];
  const activeInstruction = selectedOption ? selectedOption.instruction : task.instruction;

  return (
    <div className="space-y-5">

      {/* ── STEP 1: BRIEFING & WORKOUT SELECTION ── */}
      {step === 0 && (
        <>
          {/* Briefing */}
          <div className="ag-panel p-6 bg-gradient-to-b from-[rgba(22,12,44,0.6)] to-[rgba(10,5,25,0.7)] border border-ag-border/50 rounded-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-ag-border/30 mb-4">
              <span className="font-orbitron font-black text-sm tracking-wider uppercase text-ag-cyan">
                {task.sector_node || `STATION-${cpIndex + 1}`}
              </span>
              <span className="text-xs font-bold px-2.5 py-1 rounded font-orbitron tracking-wider border"
                    style={{ color: threat.color, borderColor: `${threat.color}35`, background: `${threat.color}08` }}>
                {threat.label}
              </span>
            </div>

            <div className="space-y-4 font-mono-cyber">
              {/* Goal */}
              {goal && (
                <div className="space-y-1">
                  <span className="text-ag-yellow font-bold uppercase text-[10px] tracking-wider">TARGET:</span>
                  <p className="text-ag-text text-base sm:text-lg font-bold leading-relaxed">
                    {goal}
                  </p>
                </div>
              )}

              {/* Reward */}
              {reward && (
                <div className="inline-flex items-center gap-1.5 bg-ag-green/10 border border-ag-green/20 rounded-lg px-3 py-1.5 text-ag-green text-xs font-bold uppercase">
                  <span>🎁 +{reward} REWARD</span>
                </div>
              )}
            </div>
          </div>

          {/* Autonomy choices selection */}
          {autonomyOptions.length > 0 && (
            <div className="ag-panel p-6 bg-[rgba(22,12,44,0.4)] border border-ag-border/40 rounded-2xl">
              <div className="text-xs font-orbitron font-bold text-ag-yellow uppercase tracking-wider mb-4">
                CHOOSE WORKOUT VARIATION:
              </div>
              <div className="grid grid-cols-1 gap-3">
                {autonomyOptions.map((opt) => {
                  const isActive = opt.id === selectedOptionId;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => {
                        try { playClickSound(); } catch (e) {}
                        onSelectOption(opt.id);
                      }}
                      type="button"
                      className={`p-4.5 rounded-xl border text-left transition-all duration-200 ${
                        isActive
                          ? 'border-ag-cyan bg-ag-cyan/15 text-ag-cyan shadow-[0_0_15px_rgba(0,255,210,0.25)] font-bold'
                          : 'border-ag-border/40 bg-ag-bg/35 text-ag-muted hover:border-ag-cyan/35 hover:text-ag-text'
                      }`}
                    >
                      <div className="text-sm uppercase font-orbitron tracking-wider">{opt.label}</div>
                      <div className="text-xs font-mono-cyber opacity-80 mt-1.5">
                        {opt.instruction}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── STEP 2: ACTIVE TASK PROTOCOL & GUIDES ── */}
      {step === 1 && (
        <div className="ag-panel p-6 bg-[rgba(22,12,44,0.4)] border border-ag-border/40 rounded-2xl">
          <div className="flex items-center justify-between pb-3 mb-4.5 border-b border-ag-border/30">
            <span className="font-orbitron font-bold text-sm tracking-wider uppercase text-ag-cyan">
              {task.protocol || 'ACTIVE CHALLENGE'}
            </span>
            {task.duration_seconds && (
              <span className="text-xs font-mono-cyber text-ag-cyan font-bold bg-ag-cyan/10 px-2.5 py-1 rounded border border-ag-cyan/30">
                {task.duration_seconds}s
              </span>
            )}
          </div>

          <div className="space-y-5">
            {/* Directive instruction with clean high contrast */}
            <div className="bg-ag-bg border border-ag-border/50 rounded-xl p-5 font-mono-cyber">
              <div className="text-ag-yellow font-bold uppercase mb-2 text-[10px] tracking-wider">YOUR DIRECTIVE:</div>
              <p className="text-ag-cyan font-black text-lg sm:text-xl leading-relaxed">
                {activeInstruction || 'Follow the task details to continue.'}
              </p>
            </div>

            {/* SDT rules */}
            <div className="space-y-3.5">
              {task.sdt_mechanics?.relatedness_rules && (
                <div className="border border-ag-purple/25 bg-ag-purple/5 rounded-xl p-4 text-xs font-mono-cyber flex items-start gap-2.5">
                  <div>
                    <span className="text-ag-purple font-bold uppercase text-[9px] tracking-wider block mb-1">TEAM SYNC RULE</span>
                    <p className="text-ag-text/95 leading-relaxed text-xs sm:text-sm">{task.sdt_mechanics.relatedness_rules}</p>
                  </div>
                </div>
              )}

              {task.sdt_mechanics?.competence_tip && (
                <div className="border border-ag-green/25 bg-ag-green/5 rounded-xl p-4 text-xs font-mono-cyber flex items-start gap-2.5">
                  <div>
                    <span className="text-ag-green font-bold uppercase text-[9px] tracking-wider block mb-1">PERFORMANCE TIP</span>
                    <p className="text-ag-text/95 leading-relaxed text-xs sm:text-sm">{task.sdt_mechanics.competence_tip}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
