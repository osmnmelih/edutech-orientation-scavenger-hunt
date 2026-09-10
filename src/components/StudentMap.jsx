import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { UNLOCK_DISTANCE } from '../utils.js';

// Animated Pulse Marker for User Location
const userIcon = L.divIcon({
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  html: `<div style="position:relative;width:28px;height:28px;">
    <div style="position:absolute;inset:0;border-radius:50%;background:#B14EFF;opacity:0.4;animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
    <div style="position:absolute;inset:4px;border-radius:50%;background:#B14EFF;border:2.5px solid #FFFFFF;box-shadow:0 2px 8px rgba(0,0,0,0.5);"></div>
  </div>`,
});

const iconCache = {};

function createCpIcon(orderNum, label, status) {
  const cacheKey = `${orderNum}_${label}_${status}`;
  if (iconCache[cacheKey]) return iconCache[cacheKey];

  const color =
    status === 'completed' ? '#00FF88' :
    status === 'current'   ? '#FFC800' :
    '#B14EFF';

  const glow = 'drop-shadow(0 2px 6px rgba(0,0,0,0.5))';
  const opacity = status === 'future' ? 0.85 : 1;
  const shortName = label ? label.split('(')[0].trim() : `Station ${orderNum}`;

  const icon = L.divIcon({
    className: '',
    iconSize: [120, 68],
    iconAnchor: [60, 68],
    html: `<div style="opacity:${opacity};width:120px;height:68px;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;">
      <!-- Floating Label Badge -->
      <div style="background:rgba(10,3,20,0.92);border:1px solid ${color};color:#FFFFFF;padding:2px 8px;border-radius:6px;font-family:Orbitron,monospace;font-size:9px;font-weight:700;letter-spacing:0.05em;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.5);margin-bottom:4px;">
        ${shortName}
      </div>

      <!-- Station SVG Pin -->
      <svg viewBox="0 0 36 44" xmlns="http://www.w3.org/2000/svg" style="width:36px;height:44px;filter:${glow}">
        <path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 26 18 26S36 31.5 36 18C36 8.06 27.94 0 18 0z"
          fill="${color}" stroke="#06060F" stroke-width="2.5"/>
        <text x="18" y="22" text-anchor="middle" font-size="13" font-weight="900"
          font-family="Orbitron,sans-serif" fill="#06060F">
          ${status === 'completed' ? '✓' : orderNum}
        </text>
      </svg>
    </div>`,
  });

  iconCache[cacheKey] = icon;
  return icon;
}

function AutoCenter({ userPos, currentCp, focusTrigger }) {
  const map = useMap();
  const prevKey = useRef(null);

  useEffect(() => {
    if (!userPos && !currentCp) return;

    const key = focusTrigger
      ? `${focusTrigger}_${Date.now()}`
      : userPos
      ? `${userPos.lat.toFixed(4)},${userPos.lng.toFixed(4)}`
      : `${currentCp?.id}`;

    if (key !== prevKey.current) {
      prevKey.current = key;
      if (focusTrigger === 'user' && userPos) {
        map.flyTo([userPos.lat, userPos.lng], 17, { duration: 1.2 });
      } else if (focusTrigger === 'target' && currentCp) {
        map.flyTo([currentCp.lat, currentCp.lng], 17.5, { duration: 1.2 });
      } else if (userPos) {
        map.flyTo([userPos.lat, userPos.lng], Math.max(16.5, map.getZoom()), { duration: 1 });
      } else if (currentCp) {
        map.flyTo([currentCp.lat, currentCp.lng], 17, { duration: 1 });
      }
    }
  }, [userPos, currentCp, focusTrigger, map]);

  return null;
}

export default function StudentMap({ userPos, checkpoints, currentCp, focusTrigger }) {
  const centre = userPos
    ? [userPos.lat, userPos.lng]
    : currentCp ? [currentCp.lat, currentCp.lng] : [49.2543, 7.0456];

  const cpIndex = checkpoints.findIndex(cp => cp.id === currentCp?.id);

  function getStatus(cp, i) {
    if (i < cpIndex) return 'completed';
    if (cp.id === currentCp?.id) return 'current';
    return 'future';
  }

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={centre}
        zoom={17}
        style={{ height: '100%', width: '100%', background: '#0A0314' }}
        zoomControl={false}
      >
        {/* OpenStreetMap Standard Free Tile Layer (Dark theme via CSS filter in styles.css) */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        <AutoCenter userPos={userPos} currentCp={currentCp} focusTrigger={focusTrigger} />

        {/* Animated Walking Route Line from User to Current Station */}
        {userPos && currentCp && (
          <Polyline
            positions={[
              [userPos.lat, userPos.lng],
              [currentCp.lat, currentCp.lng],
            ]}
            pathOptions={{
              color: '#B14EFF',
              weight: 3,
              dashArray: '6, 6',
              opacity: 0.8,
            }}
          />
        )}

        {/* User live position marker */}
        {userPos && (
          <>
            <Marker position={[userPos.lat, userPos.lng]} icon={userIcon} />
            <Circle
              center={[userPos.lat, userPos.lng]}
              radius={UNLOCK_DISTANCE}
              pathOptions={{ color: '#B14EFF', fillColor: '#B14EFF', fillOpacity: 0.12, weight: 1.5, dashArray: '4 4' }}
            />
          </>
        )}

        {/* Campus Checkpoint Station Markers */}
        {checkpoints.map((cp, i) => (
          <Marker
            key={cp.id}
            position={[cp.lat, cp.lng]}
            icon={createCpIcon(cp.order_num || i + 1, cp.label, getStatus(cp, i))}
          />
        ))}

        {/* Radius indicator around current target checkpoint */}
        {currentCp && (
          <Circle
            center={[currentCp.lat, currentCp.lng]}
            radius={UNLOCK_DISTANCE}
            pathOptions={{ color: '#FFC800', fillColor: '#FFC800', fillOpacity: 0.15, weight: 2, dashArray: '6 4' }}
          />
        )}
      </MapContainer>
    </div>
  );
}
