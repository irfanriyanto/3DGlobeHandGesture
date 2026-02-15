# 🌍 3D Globe Hand Gesture

An interactive 3D Earth globe controlled entirely by **hand gestures** through your webcam. Built with Three.js for 3D rendering and MediaPipe Hands for real-time hand tracking.

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Three.js](https://img.shields.io/badge/Three.js-000000?style=for-the-badge&logo=three.js&logoColor=white)
![MediaPipe](https://img.shields.io/badge/MediaPipe-0097A7?style=for-the-badge&logo=google&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)

---

## ✨ Features

- 🌐 **Realistic 3D Globe** — High-resolution Earth with diffuse, bump, specular, emission (night lights), and cloud textures
- 🖐️ **Hand Gesture Control** — Rotate, zoom, stop, and move the globe using natural hand gestures
- 📷 **Full-Screen Webcam Background** — Your webcam feed serves as the immersive background
- 🤲 **Two-Hand Support** — Grab and move the globe with both hands open
- 🦴 **Hand Skeleton Visualization** — Real-time hand landmark overlay on the webcam feed
- 🎨 **Premium Dark UI** — Glassmorphism HUD with smooth animations and modern design
- ⚡ **Smooth Performance** — Optimized rendering with lerped zoom and position transitions

---

## 🎮 Gesture Controls

| Gesture | Action | Description |
|---------|--------|-------------|
| ✋ **Open Hand** | Rotate | Move your open hand to rotate the globe in any direction |
| 🤏 **Pinch** | Zoom | Bring thumb and index finger together/apart to zoom in/out |
| ✊ **Fist** | Stop | Close your fist to stop rotation and enable auto-rotate |
| 🤲 **Two Hands Open** | Grab & Move | Open both hands to grab the globe and move it anywhere on screen |

### Gesture Detection Details

- **Pinch detection** uses normalized thumb-index distance relative to hand size for camera-distance independence
- **Fist detection** checks all 4 fingers (index, middle, ring, pinky) — thumb position is ignored for reliability
- **Gesture smoothing** prevents flickering between states
- **Delta clamping** prevents sudden zoom spikes during gesture transitions

---

## 🛠️ Tech Stack

| Technology | Purpose |
|-----------|---------|
| [Three.js](https://threejs.org/) | 3D globe rendering (WebGL) |
| [MediaPipe Hands](https://google.github.io/mediapipe/solutions/hands.html) | Real-time hand landmark detection |
| [TypeScript](https://www.typescriptlang.org/) | Type-safe JavaScript |
| [Vite](https://vitejs.dev/) | Fast development server & build tool |

---

## 📁 Project Structure

```
3D Globe/
├── index.html              # Main HTML with HUD overlay and webcam elements
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
├── public/
│   └── favicon.svg         # App favicon
└── src/
    ├── main.ts             # App entry point, gesture control loop
    ├── globe.ts            # Three.js scene, Earth globe, controls API
    ├── handTracking.ts     # MediaPipe hand detection & gesture recognition
    ├── handParticles.ts    # Hand particle effects
    └── style.css           # Full styling with glassmorphism HUD
```

### Key Modules

- **`globe.ts`** — Creates the 3D scene with Earth (diffuse + bump + specular + emission + clouds), ambient/directional lighting, smooth camera zoom, and position controls via `GlobeControls` API
- **`handTracking.ts`** — Initializes MediaPipe Hands (2-hand detection), processes landmarks each frame, detects gestures (open/pinch/fist), computes palm centers for both hands, and draws hand skeleton overlay
- **`main.ts`** — Connects hand tracking to globe controls. Handles single-hand rotation, pinch zoom (delta-based with clamping), fist stop, and two-hand grab & move with delta-based positioning

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- A webcam
- A modern browser (Chrome, Edge, or Firefox recommended)

### Installation

```bash
# Clone the repository
git clone https://github.com/irfanriyanto/3DGlobeHandGesture.git

# Navigate to project directory
cd 3DGlobeHandGesture

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will open at `http://localhost:5173`. Allow camera access when prompted.

### Build for Production

```bash
npm run build
npm run preview
```

---

## 📸 How It Works

1. **Webcam Capture** — The browser captures your webcam feed and displays it full-screen as the background
2. **Hand Detection** — MediaPipe Hands processes each frame to detect up to 2 hands with 21 landmarks each
3. **Gesture Recognition** — Custom logic analyzes finger positions to classify gestures (open, pinch, fist)
4. **Globe Control** — Detected gestures drive the Three.js globe: rotation, zoom, position, and auto-rotate
5. **Visual Feedback** — Hand skeleton is drawn on an overlay canvas, and the current gesture is shown in the status bar

---

## ⚙️ Configuration

Key parameters you can tweak in the source code:

| Parameter | File | Default | Description |
|-----------|------|---------|-------------|
| `maxNumHands` | `handTracking.ts` | `2` | Maximum hands to detect |
| `minDetectionConfidence` | `handTracking.ts` | `0.6` | Hand detection sensitivity |
| `normalizedPinch threshold` | `handTracking.ts` | `0.5` | Pinch detection distance |
| `GESTURE_THRESHOLD` | `handTracking.ts` | `1` | Frames needed to confirm gesture change |
| `targetZoom` range | `globe.ts` | `1.8 – 8` | Min/max zoom distance |
| `zoom multiplier` | `main.ts` | `15` | Zoom speed sensitivity |
| `move multiplier` | `globe.ts` | `5` | Globe movement speed |

---

## 🤝 Contributing

Contributions are welcome! Feel free to:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

## 🙏 Acknowledgments

- [Three.js](https://threejs.org/) — 3D rendering engine
- [MediaPipe](https://mediapipe.dev/) — Hand tracking ML model by Google
- NASA — Earth texture maps

---

<p align="center">
  Made with ❤️ using Three.js & MediaPipe
</p>
