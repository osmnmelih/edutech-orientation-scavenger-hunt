import { useState, useRef } from 'react';

export default function PhotoUploadTask({ checkpoint, onUploadComplete, isSubmitting }) {
  const [photoPreview, setPhotoPreview] = useState(null);
  const [note, setNote] = useState('');
  const fileInputRef = useRef(null);

  const compressImage = (dataUrl, maxWidth = 800, maxHeight = 800, quality = 0.7) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } else {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const raw = reader.result;
      const compressed = await compressImage(raw);
      setPhotoPreview(compressed);
    };
    reader.readAsDataURL(file);
  };

  const handleClearPhoto = () => {
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!photoPreview) return;
    onUploadComplete({ photo: photoPreview, note });
  };

  return (
    <div className="cockpit-panel p-6 space-y-5 border-2 border-ag-gold/40 relative bg-ag-bg/90">
      <div className="flex items-center justify-between border-b border-ag-gold/20 pb-3">
        <div className="flex items-center gap-2">
          <div>
            <h3 className="font-orbitron font-bold text-sm text-ag-gold uppercase tracking-wider">
              LOCATION PHOTO MISSION
            </h3>
            <p className="font-mono-cyber text-[11px] text-ag-muted uppercase">
              [ VERIFY ARRIVAL AT {checkpoint?.label || 'STATION'} ]
            </p>
          </div>
        </div>
        <span className="font-orbitron font-black text-xs px-2.5 py-1 rounded bg-ag-gold/20 text-ag-gold border border-ag-gold/40">
          +150 PTS
        </span>
      </div>

      <div className="p-4 rounded bg-ag-bg/80 border border-ag-cyan/30 text-xs font-mono-cyber text-ag-text space-y-2">
        <div className="text-ag-cyan font-orbitron font-bold tracking-wider uppercase text-[11px]">
          CHALLENGE INSTRUCTION:
        </div>
        <p className="text-sm font-sans text-ag-text/95 leading-relaxed">
          {checkpoint?.challenge || `Take a clear photo at ${checkpoint?.label || 'this location'} showing your team or building entrance!`}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Photo Input Area */}
        <div>
          <label className="block font-orbitron text-[10px] text-ag-cyan tracking-[0.2em] uppercase mb-2">
            TAKE PHOTO / UPLOAD IMAGE *
          </label>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            id="photo-file-input"
          />

          {!photoPreview ? (
            <label
              htmlFor="photo-file-input"
              className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-ag-cyan/40 hover:border-ag-cyan rounded-lg bg-ag-cyan/5 cursor-pointer transition-all duration-200 group text-center space-y-3"
            >
              <div>
                <div className="font-orbitron text-xs text-ag-cyan font-bold tracking-wider">
                  TAP TO CAPTURE OR UPLOAD PHOTO
                </div>
                <p className="font-mono-cyber text-[10px] text-ag-muted mt-1">
                  [ CAMERA & GALLERY SUPPORTED ]
                </p>
              </div>
            </label>
          ) : (
            <div className="relative rounded-lg overflow-hidden border-2 border-ag-gold/60 bg-black/60">
              <img
                src={photoPreview}
                alt="Captured Mission Location"
                className="w-full max-h-64 object-contain mx-auto"
              />
              <div className="absolute top-3 right-3 flex gap-2">
                <button
                  type="button"
                  onClick={handleClearPhoto}
                  className="cockpit-btn-secondary px-3 py-1.5 text-xs text-ag-magenta border-ag-magenta/60 hover:bg-ag-magenta/20 backdrop-blur-md"
                >
                  ✕ RETAKE PHOTO
                </button>
              </div>
              <div className="absolute bottom-0 inset-x-0 p-2 bg-black/75 backdrop-blur-md font-mono-cyber text-[10px] text-ag-gold text-center">
                ✓ PHOTO READY FOR VERIFICATION
              </div>
            </div>
          )}
        </div>

        {/* Optional Team Note */}
        <div>
          <label className="block font-orbitron text-[10px] text-ag-magenta tracking-[0.2em] uppercase mb-1">
            TEAM NOTES / ANSWERS (OPTIONAL)
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="E.g. Group selfie at CS department entrance!"
            className="cyber-input w-full h-11 text-xs font-mono-cyber"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!photoPreview || isSubmitting}
          className="cockpit-btn w-full py-4 text-xs tracking-[0.25em] disabled:opacity-50"
        >
          {isSubmitting ? 'TRANSMITTING MISSION DATA...' : 'SUBMIT LOCATION PHOTO'}
        </button>
      </form>
    </div>
  );
}
