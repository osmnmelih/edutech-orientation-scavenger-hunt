import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

export const OPTION_A_CHECKPOINTS = [
  { id: 'a1', option: 'Option A', orderNum: 1, label: 'Innovation Center (Building A2 1)', shortName: 'A1. Innovation Center', lat: 49.256182, lng: 7.039560, color: '#00FFD2' },
  { id: 'a2', option: 'Option A', orderNum: 2, label: 'DFKI - AI Research Center (Building D3 2)', shortName: 'A2. DFKI AI Center', lat: 49.256835, lng: 7.042080, color: '#00FFD2' },
  { id: 'a3', option: 'Option A', orderNum: 3, label: 'Mensa Saarbrücken (Building D4 1)', shortName: 'A3. Mensa Saarbrücken', lat: 49.257438, lng: 7.043267, color: '#00FFD2' },
];

export const OPTION_B_CHECKPOINTS = [
  { id: 'b1', option: 'Option B', orderNum: 1, label: 'KHG Cafe (Building A3 1)', shortName: 'B1. KHG Cafe', lat: 49.255549, lng: 7.040213, color: '#FF2D78' },
  { id: 'b2', option: 'Option B', orderNum: 2, label: 'Saarland University Library - SULB (Building B1 1)', shortName: 'B2. SULB Library', lat: 49.253355, lng: 7.038927, color: '#FF2D78' },
  { id: 'b3', option: 'Option B', orderNum: 3, label: 'Campusmarkt (Building C5 5)', shortName: 'B3. Campusmarkt', lat: 49.254739, lng: 7.042555, color: '#FF2D78' },
];

export const START_LOCATION = {
  label: 'Department HQ (Building C5 4)',
  shortName: 'HQ C5 4',
  lat: 49.2543,
  lng: 7.0456,
  color: '#FFC800'
};

// Custom Marker for Student Live Locations with Floating Name Badge
function createStudentMarkerIcon(studentName, stars = 1, isOptionB = false) {
  const safeName = studentName ? studentName.toUpperCase() : 'STUDENT';
  const themeColor = isOptionB ? '#FF2D78' : '#00FFD2';

  return L.divIcon({
    className: '',
    iconSize: [160, 56],
    iconAnchor: [80, 52],
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:flex-end;">
        <div style="background:rgba(10,3,20,0.95);border:1.5px solid ${themeColor};color:#FFFFFF;padding:4px 10px;border-radius:8px;font-family:Orbitron,monospace;font-size:10px;font-weight:900;letter-spacing:0.05em;white-space:nowrap;box-shadow:0 0 14px ${themeColor}60;display:flex;align-items:center;gap:6px;">
          <span style="color:#FFC800;">★ ${stars}</span>
          <span style="color:${themeColor};">${safeName}</span>
        </div>
        <div style="width:2px;height:12px;background:${themeColor};box-shadow:0 0 6px ${themeColor};"></div>
        <div style="position:relative;width:16px;height:16px;">
          <div style="position:absolute;inset:0;border-radius:50%;background:${themeColor};opacity:0.6;animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
          <div style="position:absolute;inset:2px;border-radius:50%;background:${themeColor};border:2px solid #FFFFFF;box-shadow:0 0 8px ${themeColor};"></div>
        </div>
      </div>
    `,
  });
}

// Station Checkpoint Marker Icon
function createStationMarkerIcon(label, color, badgeText) {
  return L.divIcon({
    className: '',
    iconSize: [150, 60],
    iconAnchor: [75, 56],
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:flex-end;">
        <div style="background:rgba(10,3,20,0.92);border:1.5px solid ${color};color:${color};padding:3px 8px;border-radius:6px;font-family:Orbitron,monospace;font-size:9px;font-weight:800;letter-spacing:0.05em;white-space:nowrap;box-shadow:0 2px 10px rgba(0,0,0,0.8);">
          [${badgeText}] ${label}
        </div>
        <div style="width:2px;height:8px;background:${color};"></div>
        <div style="width:12px;height:12px;border-radius:50%;background:${color};border:2px solid #06060F;box-shadow:0 0 8px ${color}aa;"></div>
      </div>
    `,
  });
}

function MapFitController({ students }) {
  const map = useMap();
  useEffect(() => {
    const allCheckpoints = [...OPTION_A_CHECKPOINTS, ...OPTION_B_CHECKPOINTS, START_LOCATION];
    const points = [
      ...allCheckpoints.map(s => [s.lat, s.lng]),
      ...students.map(s => [s.lat || 49.255, s.lng || 7.042])
    ];
    if (points.length > 0) {
      map.fitBounds(points, { padding: [50, 50], maxZoom: 16 });
    }
  }, [students, map]);
  return null;
}

export default function LiveLocationMap({ students = [] }) {
  const defaultCenter = [49.2555, 7.0425];

  return (
    <div className="w-full h-[550px] rounded-2xl overflow-hidden border border-ag-cyan/40 shadow-[0_0_30px_rgba(0,255,210,0.15)] relative">
      <MapContainer
        center={defaultCenter}
        zoom={16}
        scrollWheelZoom={true}
        style={{ width: '100%', height: '100%', background: '#06060f' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        <MapFitController students={students} />

        {/* Department HQ Start Location Marker */}
        <Marker
          position={[START_LOCATION.lat, START_LOCATION.lng]}
          icon={createStationMarkerIcon(START_LOCATION.shortName, START_LOCATION.color, 'START/FINISH')}
        >
          <Popup className="ag-map-popup">
            <div className="font-mono-cyber text-xs p-1">
              <div className="font-orbitron font-bold text-ag-gold uppercase">Department HQ</div>
              <div className="text-ag-text mt-1">{START_LOCATION.label}</div>
            </div>
          </Popup>
        </Marker>

        {/* Option A Station Checkpoints */}
        {OPTION_A_CHECKPOINTS.map((st) => (
          <Marker
            key={st.id}
            position={[st.lat, st.lng]}
            icon={createStationMarkerIcon(st.shortName, st.color, 'OPTION A')}
          >
            <Popup className="ag-map-popup">
              <div className="font-mono-cyber text-xs p-1">
                <div className="font-orbitron font-bold text-ag-cyan uppercase">Option A — Station {st.orderNum}</div>
                <div className="text-ag-text mt-1 font-bold">{st.label}</div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Option B Station Checkpoints */}
        {OPTION_B_CHECKPOINTS.map((st) => (
          <Marker
            key={st.id}
            position={[st.lat, st.lng]}
            icon={createStationMarkerIcon(st.shortName, st.color, 'OPTION B')}
          >
            <Popup className="ag-map-popup">
              <div className="font-mono-cyber text-xs p-1">
                <div className="font-orbitron font-bold text-[#FF2D78] uppercase">Option B — Station {st.orderNum}</div>
                <div className="text-ag-text mt-1 font-bold">{st.label}</div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Real-Time Connected Student Markers */}
        {students.map((std, idx) => {
          const isOptionB = (std.routeOption || '').toLowerCase().includes('option b');
          const lat = std.lat || (49.2550 + (idx * 0.0006));
          const lng = std.lng || (7.0415 + (idx * 0.0008));
          return (
            <Marker
              key={`std_${std.id || idx}`}
              position={[lat, lng]}
              icon={createStudentMarkerIcon(std.name, std.stars || 1, isOptionB)}
            >
              <Popup className="ag-map-popup">
                <div className="font-mono-cyber text-xs p-2 space-y-1">
                  <div className="font-orbitron font-black text-ag-yellow text-sm uppercase">
                    {std.name}
                  </div>
                  <div className="text-ag-gold font-bold">★ {std.stars || 1} Stars Earned</div>
                  <div className="text-ag-cyan font-bold text-[11px]">{std.routeOption || 'Option A'}</div>
                  <div className="text-ag-text text-[11px]">Location: {std.currentLocation || 'Campus Route'}</div>
                  <div className="text-[10px] text-ag-muted">Station Progress: {std.completedCount || 0} / 3</div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Map Legend Overlay */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-black/85 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-ag-cyan/30 text-[10px] font-mono-cyber text-ag-text space-y-1.5 shadow-lg">
        <div className="font-orbitron font-bold text-ag-cyan text-[11px] uppercase tracking-wider">ORIENTATIONS MAP LEGEND</div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#00FFD2]"></span>
          <span className="text-[#00FFD2] font-bold">Option A Stations (A1, A2, A3)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#FF2D78]"></span>
          <span className="text-[#FF2D78] font-bold">Option B Stations (B1, B2, B3)</span>
        </div>
        <div className="flex items-center gap-2 pt-0.5 border-t border-ag-border/50">
          <span className="w-2.5 h-2.5 rounded-full bg-[#0099FF] shadow-[0_0_8px_#0099FF]"></span>
          <span className="text-[#0099FF] font-bold">Student Live Location Marker</span>
        </div>
      </div>
    </div>
  );
}
