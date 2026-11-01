# Metaverse Audit — AlumniConnect Integration

Source audited: `metaverse/` (vanilla JS + Three.js r128), served from `apps/web/public/metaverse/` at `/metaverse/`.

Runtime entry point (per `index.html`): `app_clean_v2.js` + `avatar-system.js` + `environment.js` + `notifications.js`. Note: `app.js` (180 KB) is **not** loaded by `index.html` and is dead code; the larger feature set it describes (voice chat, multiplayer, gamification, screen sharing) is **not** in the running build.

## Genuinely live (works in the shipped runtime)

- 3D rendering: Three.js r128 + WebGL, antialias, PCFSoft shadows, sky-blue scene
- Room environments: GLB models loaded via GLTFLoader from `assets/environments/{mentor-room,career-hall,innovation-lab}.glb` (large: 74/38/34 MB)
- Fallback room geometry when GLB fails to load (box table + 4 chairs)
- Avatar selection UI (avatar-system.js): preset SVG avatars, 3D model presets, photo upload (FileReader preview), Ready Player Me iframe creator (`https://demo.readyplayer.me/avatar?frameApi`), Avaturn GLB upload
- Movement: WASD + Shift (run) + Space (jump) with gravity, collision against walls/furniture
- Camera: first-person, third-person, free-look; pointer lock; mouse look
- Sitting/standing on chairs, object interaction (click)
- Loading screen, error notifications, room switching
- localStorage persists only `selectedRoom`
- Room entry/exit flow

## Simulated / demo only (not live)

- **Multiplayer avatars**: `simulateOtherUsers()` creates 3 hard-coded fake avatars locally. No WebSocket, no signaling server, no real peer sync.
- **Voice chat / microphone**: No `getUserMedia`, no `RTCPeerConnection`, no WebRTC in the runtime. Microphone toggle UI exists but captures/transmits nothing.
- **Text-to-speech character voices**: `speechSynthesis` is NOT used in the runtime (0 references). Character "conversations" are simulated.
- **Screen sharing**: no `getDisplayMedia` / WebRTC in runtime.
- **Whiteboard drawing**: UI present; no canvas drawing sync.
- **Gamification (points, leaderboard, avatar unlocks)**: Not present in the runtime build (only in the larger unused `app.js`).
- **Ready Player Me avatar in 3D scene**: avatar-system.js stores the RPM URL and `window.selectedAvatar`, but `app_clean_v2.js` only consumes `AppState.selectedAvatar` of type `3d-model` (set by its own preset-3D path). RPM-selected avatars are not loaded into the scene; a geometric avatar is used instead.
- **Avatar persistence**: only `selectedRoom` is persisted; selected avatar is lost on reload.
- **0-byte PNG placeholders** in `assets/3d-avatars/` (female/male business/casual) — broken image assets.

## Needs backend infrastructure (not yet built)

- Authenticated user identity linking (AlumniConnect user ↔ metaverse avatar)
- Real-time signaling server for WebRTC voice/video
- Multiplayer state sync (avatar positions, room presence)
- Challenge/portfolio/mentorship data APIs consumed by 3D objects
- Avatar URL persistence per user account
- Room/certificate/leaderboard records

## Integration approach chosen

- Serve the existing metaverse unchanged as a static app under `/metaverse/` (Vite `public/`), reachable from the landing page "Enter virtual campus" button.
- Added a non-destructive "Back to AlumniConnect" floating link.
- Did **not** rewrite the Three.js implementation or move it into React, per the preservation rule.
- Rooms (Mentor Room, Innovation Lab, Career Hall) remain the three live GLB environments; Challenge Arena and Wall of Recognition are not yet present as rooms and would be new additions later.

## Honest capability summary (for product copy)

The metaverse is a **single-user, browser-based 3D environment** with real movement, camera controls, collision, room GLB loading, and avatar selection UI. Multiplayer, voice chat, screen sharing, whiteboard, gamification, and Ready Player Me rendering into the scene are **not** live in the shipped build and must not be advertised as such. They are candidates for the backend phase.