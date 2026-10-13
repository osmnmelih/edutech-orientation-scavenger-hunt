// Haversine distance in metres between two lat/lng points
export function haversine(lat1, lon1, lat2, lon2) {
  const R = 6_371_000;
  const toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Calculate compass bearing from point 1 to point 2 in degrees (0..360)
export function calculateBearing(lat1, lon1, lat2, lon2) {
  const toRad = d => (d * Math.PI) / 180;
  const toDeg = r => (r * 180) / Math.PI;

  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δλ = toRad(lon2 - lon1);

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

  const θ = Math.atan2(y, x);
  return (toDeg(θ) + 360) % 360;
}

export function fmtDistance(m) {
  if (m == null || isNaN(m)) return '--';
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

export function fmtTime(seconds) {
  if (!seconds) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export const TASK_META = {
  physical:  { label: 'RUN & MOVE 🏃‍♂️',    tag: 'RUN', color: 'bg-red-500/10    text-red-400    border border-red-500/40'    },
  cognitive: { label: 'BRAIN PUZZLE 🧠', tag: 'BRAIN', color: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/40' },
  social:    { label: 'TEAM MISSION 👥', tag: 'TEAM', color: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/40' },
  creative:  { label: 'CREATIVE TASK 🎨',   tag: 'CREAT', color: 'bg-pink-500/10   text-pink-400   border border-pink-500/40'   },
};

export const DIFF_META = {
  easy:   { label: 'Easy Level',      color: 'text-emerald-400 bg-emerald-500/10', stars: 1 },
  medium: { label: 'Medium Level', color: 'text-amber-400   bg-amber-500/10',   stars: 2 },
  hard:   { label: 'Hard Level',     color: 'text-red-400     bg-red-500/10',     stars: 3 },
};

export const MARKER_COLOR = {
  physical:  '#FF245A',
  cognitive: '#00F0FF',
  social:    '#FFB800',
  creative:  '#7A5CFF',
};

export const UNLOCK_DISTANCE = 65; // metres (increased from 20 to 65 for reliable campus GPS accuracy)

// Saarland University (Saarbrücken Campus) Preset Locations for EduTech Orientation Scavenger Hunt
export const SAARLAND_EDUTECH_PRESETS = {
  OPTION_A: {
    id: 'option_a',
    title: 'Option A: Innovation & AI Research Route',
    tagline: 'Innovation Center, DFKI & Mensa Loop',
    description: 'Starts at Department (Building C5 4); loops through Innovation Center, DFKI and Mensa before returning.',
    color: '#00e5ff',
    badge: 'OPTION A',
    startLocation: {
      label: 'Department (Building C5 4)',
      address: 'Campus C5 4, 66123 Saarbrücken',
      lat: 49.2543,
      lng: 7.0456
    },
    finishLocation: {
      label: 'Return to Department (Building C5 4)',
      address: 'Campus C5 4, 66123 Saarbrücken',
      lat: 49.2543,
      lng: 7.0456
    },
    checkpoints: [
      {
        order_index: 1,
        label: 'Innovation Center (Building A2 1)',
        address: 'Campus Gebäude A2 1, 66123 Saarbrücken',
        lat: 49.2561823689412,
        lng: 7.039560666277779,
        challenge: 'Arrive at Innovation Center (Building A2 1) and snap a team photo outside the entrance!',
        task_type: 'creative',
        points: 150,
      },
      {
        order_index: 2,
        label: 'DFKI - AI Research Center (Building D3 2)',
        address: 'Campus D3 2, 66123 Saarbrücken',
        lat: 49.25683583979205,
        lng: 7.042080028748619,
        challenge: 'Locate DFKI (Building D3 2). Upload a photo at the DFKI entrance!',
        task_type: 'cognitive',
        points: 200,
      },
      {
        order_index: 3,
        label: 'Mensa Saarbrücken (Building D4 1)',
        address: 'Campus Geb D4 1, 66123 Saarbrücken',
        lat: 49.257438241914784,
        lng: 7.043267895585894,
        challenge: 'Find the Mensa building (D4 1)! Snap a photo of the main entrance or square!',
        task_type: 'social',
        points: 250,
      }
    ],
  },
  OPTION_B: {
    id: 'option_b',
    title: 'Option B: Campus Life & Student Hub Route',
    tagline: 'KHG Cafe, SULB Library & Campusmarkt Loop',
    description: 'Starts at Department (Building C5 4); loops through KHG Cafe, SULB Library and Campusmarkt before returning.',
    color: '#ff2d78',
    badge: 'OPTION B',
    startLocation: {
      label: 'Department (Building C5 4)',
      address: 'Campus C5 4, 66123 Saarbrücken',
      lat: 49.2543,
      lng: 7.0456
    },
    finishLocation: {
      label: 'Return to Department (Building C5 4)',
      address: 'Campus C5 4, 66123 Saarbrücken',
      lat: 49.2543,
      lng: 7.0456
    },
    checkpoints: [
      {
        order_index: 1,
        label: 'KHG Cafe (Building A3 1)',
        address: 'Campus A3 1, 66123 Saarbrücken',
        lat: 49.25554960173438,
        lng: 7.04021389568439,
        challenge: 'Arrive at KHG Cafe (Building A3 1). Snap a photo at the cafe entrance!',
        task_type: 'social',
        points: 150,
      },
      {
        order_index: 2,
        label: 'Saarland University Library - SULB (Building B1 1)',
        address: 'Campus B1 1, 66123 Saarbrücken',
        lat: 49.253355666410755,
        lng: 7.03892742497059,
        challenge: 'Visit SULB Library (Building B1 1) and snap a photo of the main entrance!',
        task_type: 'creative',
        points: 200,
      },
      {
        order_index: 3,
        label: 'Campusmarkt (Building C5 5)',
        address: 'Campus C5 5, 66123 Saarbrücken',
        lat: 49.25473930005053,
        lng: 7.042555178106456,
        challenge: 'Locate Campusmarkt (Building C5 5) and snap a photo outside the market!',
        task_type: 'cognitive',
        points: 250,
      }
    ],
  },
};

