# MeetSpace - Enterprise Video Conferencing Platform

A full-stack, enterprise-grade video conferencing web application inspired by Google Meet, Zoom, and Microsoft Teams. Built with React 19, TypeScript, Vite, Tailwind CSS, WebRTC, Socket.IO, Google Gemini AI, and Firebase (Authentication & Firestore).

---

## 🌟 Key Features

1. **Instant Video Meetings & Shareable URLs**:
   - Start an instant conference call with unguessable 9-character tokens (`xxx-yyyy-zzz`).
   - Shareable links: `?meeting=<code-id>` automatically brings invitees directly into the pre-join screen.

2. **Real-time Live Audio Transcription (Gemini 3.5 Transcribe)**:
   - Microphone speech is recorded in live chunks and transcribed verbatim with punctuation using `gemini-3.5-transcribe`.
   - Live subtitles appear in real time on the conference screen with speaker attribution.
   - Searchable transcript panel with instant `.txt` file export.

3. **AI Meeting Executive Summaries & Action Items (Gemini 3.8)**:
   - One-click meeting intelligence: extracts executive summary, key discussion decisions, and actionable task checklists from meeting speech and chat history.
   - Export summary as a Markdown (`.md`) report or copy directly to clipboard.

4. **WebRTC HD Video & Peer-to-Peer Communication**:
   - Multi-party peer connection manager with public STUN servers for NAT traversal.
   - Dynamic track replacement for seamless switching between webcam and screen sharing.
   - Active speaker detection with glowing audio level indicators.

5. **Screen Sharing & Presentation View**:
   - Share entire desktop displays, application windows, or browser tabs with system audio.
   - Automatic presentation mode with large presentation view and participant side strip.

6. **Host Controls & Moderation**:
   - Waiting room support with host admit and deny controls.
   - Meeting lock/unlock toggle to prevent uninvited entries.
   - Mute participants and remove/kick participants.
   - End meeting for all participants.

7. **Real-Time Collaboration**:
   - Persistent Firestore chat synchronized via Socket.IO for zero-latency peer messaging.
   - File attachment and safe link sharing.
   - Floating emoji reactions with smooth physics (👏, ❤️, 👍, 😂, 😮, 🎉).
   - Raise Hand queue (✋) with host lowering options.

8. **Pre-Join Screen (Green Room)**:
   - Live camera preview with mirror mode.
   - Audio input level visualizer.
   - Microphone, camera, and speaker device selection.
   - Speaker chime audio test button.

9. **Meeting Scheduling & Calendar Integration**:
   - Schedule future meetings with title, agenda, date, time, and duration.
   - Download `.ics` calendar files compatible with Google Calendar, Microsoft Outlook, and Apple Calendar.
   - Persisted in Firebase Firestore.

10. **Contacts Directory**:
    - Save collaborator contacts.
    - 1-click email invitation generation.

11. **Firebase Authentication & Firestore Zero-Trust Security**:
    - Google Sign-In with Firebase Auth.
    - Zero-trust hardened `firestore.rules` adhering to the 8 security pillars with strict type validation and PII isolation.

---

## 🚀 Architecture

```
meetspace/
├── server/
│   ├── api.ts              # HTTP endpoints for audio transcription & AI summary
│   ├── gemini.ts           # @google/genai client (gemini-3.5-transcribe & gemini-3.8-flash)
│   └── socket.ts           # Socket.IO WebRTC signaling & real-time room state
├── src/
│   ├── components/         # Reusable video tiles, modals, controls, and dashboard
│   ├── contexts/           # AuthContext (Firebase) & MeetingContext (WebRTC & state)
│   ├── lib/                # webrtc.ts, transcription.ts, firebase.ts, firestoreService.ts
│   ├── types/              # Comprehensive TypeScript domain types
│   ├── App.tsx             # Root router and state coordination
│   └── main.tsx            # React 19 entry point
├── firestore.rules         # Hardened Firestore security rules
├── firebase-blueprint.json # Schema specification
└── server.ts               # Full-stack production server
```

---

## 🛠️ Local Development & Running

### 1. Install dependencies
```bash
npm install
```

### 2. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Production Build & Start
```bash
npm run build
npm start
```
