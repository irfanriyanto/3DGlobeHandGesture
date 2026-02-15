/**
 * 3D Globe – Kontrol Gerakan Tangan
 * Main Application Entry Point
 */

import './style.css';
import { createGlobeScene, GlobeControls } from './globe';
import { createHandTracker, HandTracker } from './handTracking';

// ========== DOM Elements ==========
const canvas = document.getElementById('globe-canvas') as HTMLCanvasElement;
const loadingScreen = document.getElementById('loading-screen')!;
const loaderProgress = document.getElementById('loader-progress')!;
const loaderSubtitle = document.getElementById('loader-subtitle')!;
const hudOverlay = document.getElementById('hud-overlay')!;
const statusDot = document.getElementById('status-dot')!;
const statusText = document.getElementById('status-text')!;
const webcamVideo = document.getElementById('webcam-video') as HTMLVideoElement;
const handOverlayCanvas = document.getElementById('hand-overlay-canvas') as HTMLCanvasElement;

// ========== State ==========
let globeControls: GlobeControls | null = null;
let handTracker: HandTracker | null = null;
let prevPalmX: number | null = null;
let prevPalmY: number | null = null;
let isGestureActive = false;

// Smoothed deltas
let smoothRotX = 0;
let smoothRotY = 0;
let prevPinchDist: number | null = null;

function showGlobe() {
  loadingScreen.classList.add('hidden');
  hudOverlay.classList.add('visible');
}

// ========== Initialize Globe ==========
function initGlobe() {
  const { controls } = createGlobeScene(canvas, (progress) => {
    const pct = Math.min(progress, 100);
    loaderProgress.style.width = `${pct}%`;

    if (pct < 50) loaderSubtitle.textContent = 'Loading Earth textures...';
    else if (pct < 75) loaderSubtitle.textContent = 'Loading surface details...';
    else if (pct < 100) loaderSubtitle.textContent = 'Loading cloud layers...';

    if (progress >= 100) {
      loaderSubtitle.textContent = 'Ready!';
      setTimeout(() => {
        showGlobe();
        initHandTracking(controls);
      }, 600);
    }
  });

  globeControls = controls;
}

// ========== Initialize Hand Tracking ==========
async function initHandTracking(controls: GlobeControls) {
  try {
    handTracker = createHandTracker(
      webcamVideo,
      handOverlayCanvas,
      (status, message) => {
        statusText.textContent = message;
        statusDot.className = 'status-dot';

        if (status === 'active') {
          statusDot.classList.add('active');
        } else if (status === 'error') {
          statusDot.classList.add('error');
        }
      }
    );

    await handTracker.start();
    requestAnimationFrame(gestureControlLoop);
  } catch (err) {
    console.error('Hand tracking failed:', err);
    statusText.textContent = 'Hand tracking failed';
    statusDot.className = 'status-dot error';
  }
}

// ========== Gesture Control Loop ==========
function gestureControlLoop() {
  if (!handTracker || !globeControls) {
    requestAnimationFrame(gestureControlLoop);
    return;
  }

  const state = handTracker.getState();
  const palm = state.palmCenter;

  switch (state.gesture) {
    case 'open': {
      // ✋ OPEN HAND → ROTATE GLOBE
      globeControls.setAutoRotate(false);
      prevPinchDist = null; // reset pinch tracking

      if (palm && prevPalmX !== null && prevPalmY !== null) {
        const dx = palm.x - prevPalmX;
        const dy = palm.y - prevPalmY;

        if (Math.abs(dx) > 0.002 || Math.abs(dy) > 0.002) {
          smoothRotY += (-dx * 5 - smoothRotY) * 0.4;
          smoothRotX += (dy * 5 - smoothRotX) * 0.4;
          globeControls.rotateY(smoothRotY);
          globeControls.rotateX(smoothRotX);
        } else {
          smoothRotX *= 0.8;
          smoothRotY *= 0.8;
        }
      }

      if (palm) {
        prevPalmX = palm.x;
        prevPalmY = palm.y;
      }
      isGestureActive = true;
      break;
    }

    case 'pinch': {
      // 🤏 PINCH → ZOOM using pinch distance change
      globeControls.setAutoRotate(false);

      const currentPinchDist = state.pinchDistance;
      if (prevPinchDist !== null) {
        const delta = currentPinchDist - prevPinchDist;
        // Fingers spreading apart (delta > 0) = zoom out (increase distance)
        // Fingers closing (delta < 0) = zoom in (decrease distance)
        if (Math.abs(delta) > 0.005) {
          const currentZoom = globeControls.getZoom();
          globeControls.setZoom(currentZoom + delta * 15);
        }
      }
      prevPinchDist = currentPinchDist;

      if (palm) {
        prevPalmX = palm.x;
        prevPalmY = palm.y;
      }
      isGestureActive = true;
      break;
    }

    case 'fist': {
      // ✊ FIST → STOP, AUTO ROTATE
      globeControls.setAutoRotate(true);
      smoothRotX = 0;
      smoothRotY = 0;
      prevPalmX = null;
      prevPalmY = null;
      prevPinchDist = null;
      isGestureActive = false;
      break;
    }

    case 'none':
    default: {
      if (isGestureActive) {
        smoothRotX *= 0.85;
        smoothRotY *= 0.85;
        if (Math.abs(smoothRotX) < 0.0001 && Math.abs(smoothRotY) < 0.0001) {
          globeControls.setAutoRotate(true);
          isGestureActive = false;
        }
      } else {
        globeControls.setAutoRotate(true);
      }
      prevPalmX = null;
      prevPalmY = null;
      prevPinchDist = null;
      break;
    }
  }

  // Show detected gesture + pinch distance on status (debug)
  const pd = state.pinchDistance.toFixed(2);
  const gestureLabels: Record<string, string> = {
    open: `✋ Open hand – Rotating`,
    pinch: `🤏 Pinch (${pd}) – Zooming`,
    fist: `✊ Fist – Stopped`,
    none: `Waiting... (pinch: ${pd})`,
  };
  statusText.textContent = gestureLabels[state.gesture] || 'Hand tracking active';

  requestAnimationFrame(gestureControlLoop);
}

// ========== Start ==========
initGlobe();
