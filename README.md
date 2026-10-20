# 📍 Campus Orientation: GPS Scavenger Hunt

[![React 18](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev/)
[![Live Demo](https://img.shields.io/badge/Live_Demo-Vercel-black?style=flat&logo=vercel)](https://edutech-orientation-scavenger-hunt.vercel.app)
[![TanStack Start](https://img.shields.io/badge/TanStack-Start%20%26%20Router-FF4154?style=flat)](https://tanstack.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat&logo=supabase&logoColor=white)](https://supabase.com/)
[![Leaflet](https://img.shields.io/badge/Leaflet-GPS%20Mapping-199900?style=flat&logo=leaflet&logoColor=white)](https://leafletjs.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS%204-06B6D4?style=flat&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![University](https://img.shields.io/badge/Universität%20des%20Saarlandes-Official%20Orientation%20Day-002F6C?style=flat)](https://www.uni-saarland.de/)

> An interactive, full-stack, GPS-guided campus exploration and onboarding web platform engineered specifically for the official **M.Sc. Educational Technology Orientation Day** at **Universität des Saarlandes (Saarbrücken Campus)**.
> 
> 🔗 **Live Demo:** [edutech-orientation-scavenger-hunt.vercel.app](https://edutech-orientation-scavenger-hunt.vercel.app)

---

## 📸 Application Screenshots

<div align="center">
  <img src="screenshots/mobile_view.png" width="280" alt="Student Mobile Interface" />
  &nbsp;&nbsp;&nbsp;&nbsp;
  <img src="screenshots/admin_dashboard.png" width="540" alt="Mission Control Admin Dashboard" />
</div>

---

## 🎯 Purpose & Real-World Orientation Deployment

Arriving at a new university campus can be overwhelming for incoming international and local master's students. The **EduTech Campus Orientation Scavenger Hunt** was created to replace traditional passive campus walkthroughs with an active, collaborative discovery game.

On the official M.Sc. Educational Technology Orientation Day (Winter Semester 2026/27), incoming students formed teams, scanned poster QR codes to launch their missions, and navigated the Saarbrücken campus using real-time GPS telemetry to locate and explore key academic, research, and student life landmarks.

---

## 🏛️ Official Saarbrücken Campus Routes & Landmarks

The platform features pre-configured campus routes designed around the daily academic life of an EduTech student:

### 🚀 Route A: Innovation & AI Research Route
1. **Starting Point:** Department Headquarters (Building C5 4)
2. **Station 1: Innovation Center (Building A2 1)** — Campus startup incubator and tech transfer hub.
3. **Station 2: DFKI (German Research Center for Artificial Intelligence - Building D3 2)** — Introducing students to the leading AI research institute on campus.
4. **Station 3: Mensa Saarbrücken (Building D4 1)** — Campus dining hall and central social square.
5. **Finish:** Return to Department (Building C5 4) for debriefing.

### 🌿 Route B: Campus Life & Student Facilities
- Alternate loop focusing on central library resources, administration, and student advisory services.

---

## ✨ Key Features & Technical Architecture

### 1. 🧭 Real-Time GPS Geolocation & Bearing Radar
- Calculates physical proximity using the **Haversine formula** via the **HTML5 Geolocation API**.
- Dynamically computes compass bearings (`atan2`) to guide teams toward physical coordinates across campus.
- **Geofenced Checkpoint Unlocking:** Stations automatically unlock when students arrive within 65 meters, with manual bypass fallbacks for GPS dead-zones.

### 2. 📸 Camera Verification & Mission Challenges
- Integrated camera capture (**HTML5 MediaDevices API**) requiring teams to upload photo proofs at landmark checkpoints (e.g., DFKI entrance, Innovation Center).
- Scaffolds cognitive puzzles, physical tasks, and team bonding challenges at each landmark.

### 3. 🎛️ Live Session Monitor & Instructor Cockpit
- Real-time administrative dashboard (`/session/:id/monitor`) allowing orientation organizers to track team locations, completion progress, and incoming photos live.
- Granular administrative controls: session state toggling, station resets, and team management endpoints.

### 4. ⚡ Zero-Install QR Onboarding
- Instant mobile access via poster QR codes (`?track=a` or `?track=b`) with zero app store installation required.
- Implements responsive mobile-web architecture with an immersive cockpit HUD and spatial audio cues.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | React 18, TanStack Start (SSR), TanStack Router, TanStack Query |
| **UI & Styling** | Tailwind CSS 4, Radix UI primitives, Lucide Icons |
| **Geospatial & Mapping** | Leaflet, HTML5 Geolocation API, Haversine Distance & Bearing math |
| **Backend & Database** | Supabase (PostgreSQL), RESTful API endpoints (`/api/sessions`, `/api/checkpoints`, `/api/complete`, `/api/location`, `/api/teams`) |
| **Media & Audio** | HTML5 MediaDevices API, Web Audio API soundscapes |
| **Tooling & Build** | Vite, TypeScript, Bun / Node.js |

---

## 📁 Repository Structure

```bash
edutech-orientation-scavenger-hunt/
├── src/
│   ├── api.js                # Centralized Axios client & API endpoints
│   ├── GameApp.jsx           # Core game container & session state router
│   ├── components/           # Cockpit HUD, RadarDisplay, OptionSelector
│   ├── pages/
│   │   ├── Home.jsx          # QR onboarding, route selection & callsign entry
│   │   ├── StudentView.jsx   # Live student quest interface & photo proof upload
│   │   ├── AdminDashboard.jsx# Route creation & session configuration
│   │   ├── SessionMonitor.jsx# Live real-time instructor telemetry & photo feed
│   │   └── Presentation.jsx  # Stage presentation mode & live leaderboard
│   ├── routes/api/           # REST endpoints for teams, checkpoints & completions
│   ├── utils.js              # Geolocation math & UdS Saarbrücken campus presets
│   └── utils/audio.js        # Ambient soundscapes & audio cue engine
├── package.json
└── vite.config.ts
```

---

## 🚀 Getting Started

```bash
# Clone the repository
git clone https://github.com/osmnmelih/edutech-orientation-scavenger-hunt.git
cd edutech-orientation-scavenger-hunt

# Install dependencies
npm install

# Run development server
npm run dev
```

---

## 🎓 Academic & Institutional Context

- **Institution:** Universität des Saarlandes (Saarbrücken, Germany)
- **Degree Program:** M.Sc. in Educational Technology
- **Occasion:** Official Orientation Day (Winter Semester 2026/27)
- **Developer:** [Osman Melih Cabik](https://osmnmelih.github.io) (Student Teaching Assistant / Tutor — Programming)

---

## 📄 License
This project is licensed under the MIT License — see the LICENSE file for details.
