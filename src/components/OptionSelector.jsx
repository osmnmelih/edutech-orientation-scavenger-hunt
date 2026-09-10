export default function OptionSelector({ selectedOption, onSelectOption }) {
  return (
    <div className="w-full">
      <div className="grid grid-cols-2 gap-4">
        {/* OPTION A BUTTON */}
        <button
          type="button"
          onClick={() => onSelectOption('option_a')}
          className={`cockpit-panel p-6 text-center transition-all duration-200 border-2 cursor-pointer ${
            selectedOption === 'option_a'
              ? 'border-ag-cyan bg-ag-cyan/20 shadow-[0_0_25px_rgba(0,229,255,0.4)] scale-[1.02]'
              : 'border-ag-cyan/30 hover:border-ag-cyan/60 hover:bg-ag-cyan/5 opacity-70'
          }`}
        >
          <div className="font-orbitron font-black text-lg text-ag-cyan tracking-wider uppercase">
            OPTION A
          </div>
          {selectedOption === 'option_a' && (
            <span className="inline-block mt-2 font-orbitron text-[10px] font-bold text-black bg-ag-cyan px-2.5 py-0.5 rounded tracking-wider">
              ✓ SELECTED
            </span>
          )}
        </button>

        {/* OPTION B BUTTON */}
        <button
          type="button"
          onClick={() => onSelectOption('option_b')}
          className={`cockpit-panel p-6 text-center transition-all duration-200 border-2 cursor-pointer ${
            selectedOption === 'option_b'
              ? 'border-ag-magenta bg-ag-magenta/20 shadow-[0_0_25px_rgba(255,45,120,0.4)] scale-[1.02]'
              : 'border-ag-magenta/30 hover:border-ag-magenta/60 hover:bg-ag-magenta/5 opacity-70'
          }`}
        >
          <div className="font-orbitron font-black text-lg text-ag-magenta tracking-wider uppercase">
            OPTION B
          </div>
          {selectedOption === 'option_b' && (
            <span className="inline-block mt-2 font-orbitron text-[10px] font-bold text-white bg-ag-magenta px-2.5 py-0.5 rounded tracking-wider">
              ✓ SELECTED
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
