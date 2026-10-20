# 📍 Campus AR Scavenger Hunt: EduTech Orientation Platform

[![React 18](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev/)
[![TanStack Start](https://img.shields.io/badge/TanStack-Start%20%26%20Router-FF4154?style=flat)](https://tanstack.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat&logo=supabase&logoColor=white)](https://supabase.com/)
[![Leaflet](https://img.shields.io/badge/Leaflet-GPS%20Mapping-199900?style=flat&logo=leaflet&logoColor=white)](https://leafletjs.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS%204-06B6D4?style=flat&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![University](https://img.shields.io/badge/Universität%20des%20Saarlandes-Campus%20Deployment-002F6C?style=flat)](https://www.uni-saarland.de/)

> A full-stack, GPS-powered location-based learning and orientation platform engineered for the **M.Sc. Educational Technology orientation at Saarland University (Universität des Saarlandes)**. Showcased to researchers and faculty at the **XR Education Day** (including DFKI researchers).

---

## 🎯 Overview & Real-World Campus Deployment

Transitioning to a new university campus presents significant navigational and social friction for incoming graduate students. The **Campus AR Scavenger Hunt** transforms traditional campus tours into an interactive, collaborative outdoor quest.

Students form tactical teams, navigate physical coordinates across the Saarbrücken campus using real-time GPS telemetry and a diegetic cockpit HUD, solve context-adaptive challenges at university landmarks, and upload photo proofs evaluated in real time.

### 🏛️ Official Saarbrücken Campus Routes:
- **Option A: Innovation & AI Research Route**
  - **Start / Finish:** Department HQ (Building C5 4)
  - **Checkpoint 1:** Innovation Center (Building A2 1)
  - **Checkpoint 2:** DFKI — German Research Center for Artificial Intelligence (Building D3 2)
  - **Checkpoint 3:** Mensa Saarbrücken (Building D4 1)
- **Option B: Campus Life & Student Hub Route**
  - Highlighting key administrative, social, and library landmarks across campus.

---

## ✨ Core Features & Technical Architecture

### 1. 🧭 Real-Time GPS & Compass Telemetry
- Precise coordinate tracking utilizing the **HTML5 Geolocation API**.
- Sub-meter **Haversine formula** implementation calculates distance to targeted checkpoints.
- Mathematical bearing algorithms (`atan2`) dynamically orient the navigational radar toward targeted stations.
- Configurable **geofenced unlocking radius (65m)** with intelligent fallback bypasses for campus dead-zones.

### 2. 🎮 Diegetic Cockpit HUD & Audio Immersion
- Cyberpunk-inspired tactical HUD interface with live speed, distance, bearing, and mission timer metrics.
- Integrated ambient space soundscape and real-time audio feedback cues via the **Web Audio API**.
- Designed according to **Cognitive Load Theory (CLT)** principles to minimize extraneous cognitive load during physical navigation.

### 3. 📸 Mission Checkpoint Validation & Media Capture
- Camera feed integration via the **HTML5 MediaDevices API** for instant team photo verification.
- Context-adaptive challenge prompts spanning cognitive puzzles, physical tasks, team collaboration, and creative missions.
- Fallback photo upload pipelines ensuring seamless execution regardless of mobile device OS constraints.

### 4. 🎛️ Mission Control Admin Dashboard & Live Session Monitor
- Centralized real-time instructor cockpit (`/admin` & `/session/:id/monitor`).
- Live tracking of participating teams, unlocked checkpoints, submission timestamps, and uploaded team photos.
- Granular administrative controls: live session status toggling, team management, and database reset endpoints.

### 5. 📱 QR Code Automated Onboarding
- Zero-friction team onboarding via poster QR codes with automatic URL route parameters (`?track=a` / `?track=b`).
- Instant role selection and team callsign registration with zero app store installation required (Mobile Web PWA experience).

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | React 18, TanStack Start (SSR), TanStack Router, TanStack Query |
| **UI & Styling** | Tailwind CSS 4, Radix UI primitives, Lucide Icons |
| **Geospatial & Mapping** | Leaflet, HTML5 Geolocation API, Haversine Distance & Bearing Algorithms |
| **Backend & Database** | Supabase (PostgreSQL), RESTful API endpoints (`/api/sessions`, `/api/checkpoints`, `/api/complete`, `/api/location`, `/api/teams`) |
| **Media & Audio** | HTML5 MediaDevices API (Camera Capture), Web Audio API (Soundscapes & SFX) |
| **Tooling & Build** | Vite, TypeScript, Bun / Node.js |

---

## 📁 Project Structure

```bash
edutech-orientation-scavenger-hunt/
├── src/
│   ├── api.js                # Centralized Axios client & API endpoints
│   ├── GameApp.jsx           # Core game container & session state router
│   ├── components/           # Reusable UI components & Cockpit HUD
│   │   ├── CockpitFrame.jsx  # Diegetic HUD container
│   │   ├── RadarDisplay.jsx  # Real-time compass & bearing radar
│   │   └── ...
│   ├── pages/                # High-level route views
│   │   ├── Home.jsx          # Splash screen, QR onboarding, callsign registration
│   │   ├── StudentView.jsx   # Active quest interface, mission tasks, photo proof
│   │   ├── AdminDashboard.jsx# Instructor mission setup & route configuration
│   │   ├── SessionMonitor.jsx# Real-time live team telemetry & photo feed
│   │   └── Presentation.jsx  # Stage presentation mode with live leaderboard
│   ├── routes/api/           # REST API endpoints (checkpoints, completions, teams, sessions)
│   ├── utils.js              # Geolocation math, Haversine, bearing, UdS campus presets
│   └── utils/audio.js        # Ambient soundscapes & audio cue engine
├── package.json
└── vite.config.ts
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+) or [Bun](https://bun.sh/)
- Modern mobile browser with Geolocation & Camera permissions enabled (iOS Safari / Android Chrome)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/osmnmelih/edutech-orientation-scavenger-hunt.git
   cd edutech-orientation-scavenger-hunt
   ```

2. **Install dependencies:**
   ```bash
   npm install
   # or with bun:
   bun install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run Development Server:**
   ```bash
   npm run dev
   # or with bun:
   bun dev
   ```
   Open `http://localhost:3000` in your browser.

---

## 🎓 Academic & Institutional Context

- **Institution:** Universität des Saarlandes (Saarbrücken, Germany)
- **Program:** M.Sc. in Educational Technology (Human-Computer Interaction & Interactive Systems)
- **Course Context:** Supervised by Dr. Kristin Altmeyer; featured at the **XR Education Day**.
- **Developer & Architect:** [Osman Melih Cabik](https://osmnmelih.github.io) (Student Teaching Assistant / Tutor — Programming)

---

## 📄 License
This project is licensed under the MIT License — see the LICENSE file for details.
