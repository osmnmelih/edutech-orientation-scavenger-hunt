import { useState, useCallback, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';

// Task types cycle by order — shown as info only
const TYPE_LABELS = ['Physical', 'Cognitive', 'Social', 'Creative'];
const TYPE_COLORS = ['#FF0055', '#00FFD2', '#FFC800', '#00FF88'];

const iconCache = {};

function createCpIcon(orderNum, selected = false) {
  const cacheKey = `${orderNum}_${selected}`;
  if (iconCache[cacheKey]) return iconCache[cacheKey];

  const typeIndex = (orderNum - 1) % 4;
  const color = selected ? '#00FFD2' : TYPE_COLORS[typeIndex];

  const icon = L.divIcon({
    className: '',
    iconSize: [36, 44], iconAnchor: [18, 44],
    html: `<div style="position:relative;width:36px;height:44px;">
      <svg viewBox="0 0 36 44" xmlns="http://www.w3.org/2000/svg"
           style="width:100%;height:100%;filter:drop-shadow(0 0 5px ${color}aa)">
        <path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 26 18 26S36 31.5 36 18C36 8.06 27.94 0 18 0z"
          fill="${color}" stroke="#fff" stroke-width="${selected ? 2.5 : 1.5}"/>
        <text x="18" y="22" text-anchor="middle" font-size="12" font-weight="bold"
          font-family="Orbitron,Arial,sans-serif" fill="#fff">${orderNum}</text>
      </svg></div>`,
  });
  iconCache[cacheKey] = icon;
  return icon;
}

function FlyController({ target }) {
  const map = useMap();
  const prev = useRef(null);
  useEffect(() => {
    if (target && target !== prev.current) {
      prev.current = target;
      map.flyTo([target.lat, target.lng], 17, { duration: 1.2 });
    }
  }, [target, map]);
  return null;
}

function ClickHandler({ onMapClick }) {
  useMapEvents({ click(e) { onMapClick(e.latlng); } });
  return null;
}

export default function MapPicker({ checkpoints, onAdd, onUpdate, onDelete, flyTo }) {
  const [pending, setPending] = useState(null);
  const [label, setLabel]     = useState('');
  const [adding, setAdding]   = useState(false);
  const [flyTarget, setFlyTarget] = useState(null);

  useEffect(() => {
    if (!flyTo) return;
    setFlyTarget({ lat: flyTo.lat, lng: flyTo.lng });
  }, [flyTo?._key]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMapClick = useCallback((latlng) => {
    setPending(latlng);
    setLabel('');
  }, []);

  async function handleAdd() {
    if (!pending) return;
    setAdding(true);
    try {
      await onAdd({
        lat: pending.lat,
        lng: pending.lng,
        label: label.trim() || undefined,
        order_num: checkpoints.length + 1,
      });
      setPending(null);
      setLabel('');
    } finally { setAdding(false); }
  }

  const pathCoords = [...checkpoints]
    .sort((a, b) => a.order_num - b.order_num)
    .map(cp => [cp.lat, cp.lng]);

  const centre = checkpoints.length > 0
    ? [checkpoints[0].lat, checkpoints[0].lng]
    : [51.505, -0.09];

  const nextTypeIndex = (checkpoints.length) % 4;

  return (
    <div className="relative h-full w-full">
      <MapContainer center={centre} zoom={15} style={{ height: '100%', width: '100%' }} className="cursor-crosshair">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        <ClickHandler onMapClick={handleMapClick} />
        <FlyController target={flyTarget} />

        {pathCoords.length > 1 && (
          <Polyline
            positions={pathCoords}
            pathOptions={{ color: '#00FFD2', weight: 2, dashArray: '8 6', opacity: 0.6 }}
          />
        )}
        {checkpoints.map(cp => (
          <Marker
            key={cp.id}
            position={[cp.lat, cp.lng]}
            icon={createCpIcon(cp.order_num)}
            draggable={!!onUpdate}
            eventHandlers={onUpdate ? {
              dragend: (e) => {
                const { lat, lng } = e.target.getLatLng();
                onUpdate({ id: cp.id, lat, lng });
              },
            } : undefined}
          >
            {(onDelete || onUpdate) && (
              <Popup>
                <div style={{ fontFamily: 'monospace', fontSize: 12, minWidth: 160 }}>
                  <div style={{ fontWeight: 'bold', marginBottom: 6 }}>
                    Node #{cp.order_num}{cp.label ? ` · ${cp.label}` : ''}
                  </div>
                  <div style={{ color: '#666', marginBottom: 8, fontSize: 10 }}>
                    {cp.lat.toFixed(5)}, {cp.lng.toFixed(5)}
                  </div>
                  {onUpdate && (
                    <div style={{ color: '#888', marginBottom: 8, fontSize: 10 }}>
                      Drag the pin to reposition.
                    </div>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => onDelete(cp.id)}
                      style={{
                        width: '100%', padding: '6px 8px', background: '#FF0055',
                        color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer',
                        fontWeight: 'bold', fontSize: 11, textTransform: 'uppercase',
                        letterSpacing: 1,
                      }}
                    >
                      Delete Node
                    </button>
                  )}
                </div>
              </Popup>
            )}
          </Marker>
        ))}
        {pending && (
          <Marker
            position={[pending.lat, pending.lng]}
            icon={createCpIcon(checkpoints.length + 1, true)}
            opacity={0.9}
          />
        )}
      </MapContainer>

      {/* Tip when empty */}
      {!pending && checkpoints.length === 0 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-ag-surface/90 border border-ag-border
                        rounded-xl px-4 py-2 text-xs text-ag-muted font-mono pointer-events-none z-10 whitespace-nowrap">
          Click anywhere on the map to add a sector node
        </div>
      )}

      {/* Add sector node popup */}
      {pending && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-72 max-w-[calc(100vw-16px)]
                        bg-ag-surface border border-ag-cyan rounded-2xl p-4"
             style={{ boxShadow: '0 0 20px rgba(0,255,210,0.2)' }}>
          <div className="text-xs font-mono text-ag-cyan uppercase tracking-widest mb-3 flex items-center justify-between">
            <span>Sector Node #{checkpoints.length + 1}</span>
            <span className="text-ag-muted text-[10px]">{pending.lat.toFixed(5)}, {pending.lng.toFixed(5)}</span>
          </div>

          {/* Auto-assigned task info */}
          <div className="mb-3 px-3 py-2 rounded-lg bg-ag-bg border border-ag-border">
            <p className="text-[10px] text-ag-muted uppercase tracking-wider">Auto-assigned mission type</p>
            <p className="text-xs font-bold mt-0.5" style={{ color: TYPE_COLORS[nextTypeIndex] }}>
              {TYPE_LABELS[nextTypeIndex]}
            </p>
          </div>

          <div className="space-y-2">
            <input
              type="text"
              placeholder={`Sector Node ${checkpoints.length + 1}`}
              value={label}
              onChange={e => setLabel(e.target.value)}
              className="w-full bg-ag-bg border border-ag-border rounded-lg px-3 py-2 text-sm
                         text-ag-text placeholder-ag-muted focus:outline-none focus:border-ag-cyan font-mono"
            />
            <div className="flex gap-2 pt-1">
              <button onClick={() => { setPending(null); setLabel(''); }}
                className="flex-1 border border-ag-border text-ag-muted rounded-lg py-2 text-xs hover:border-ag-cyan hover:text-ag-cyan transition-colors font-mono">
                Cancel
              </button>
              <button onClick={handleAdd} disabled={adding}
                className="flex-1 bg-ag-cyan text-ag-bg font-bold rounded-lg py-2 text-xs hover:opacity-90 disabled:opacity-50 transition-opacity font-mono uppercase tracking-wide">
                {adding ? 'Adding...' : 'Add Node'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
