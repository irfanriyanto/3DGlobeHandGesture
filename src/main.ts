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

function showGlobe() {
  loadingScreen.classList.add('hidden');
  hudOverlay.classList.add('visible');
}

// ========== Initialize Globe ==========
function initGlobe() {
  const { controls } = createGlobeScene(canvas, (progress) => {
    const pct = Math.min(progress, 100);
    loaderProgress.style.width = `${pct}%`;

    if (pct < 50) loaderSubtitle.textContent = 'Memuat tekstur bumi...';
    else if (pct < 75) loaderSubtitle.textContent = 'Memuat detail permukaan...';
    else if (pct < 100) loaderSubtitle.textContent = 'Memuat lapisan awan...';

    if (progress >= 100) {
      loaderSubtitle.textContent = 'Siap!';
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
    statusText.textContent = 'Hand tracking gagal';
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
      // ✋ TANGAN TERBUKA → PUTAR GLOBE
      globeControls.setAutoRotate(false);

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

    case 'peace': {
      // ✌️ DUA JARI → ZOOM IN/OUT
      globeControls.setAutoRotate(false);

      if (palm && prevPalmY !== null) {
        const dy = palm.y - prevPalmY;
        if (Math.abs(dy) > 0.003) {
          const currentZoom = globeControls.getZoom();
          // Tangan naik (dy negatif) = zoom in (distance berkurang)
          // Tangan turun (dy positif) = zoom out (distance bertambah)
          globeControls.setZoom(currentZoom + dy * 10);
        }
      }

      if (palm) {
        prevPalmX = palm.x;
        prevPalmY = palm.y;
      }
      isGestureActive = true;
      break;
    }

    case 'fist': {
      // ✊ KEPAL → BERHENTI, AUTO ROTATE
      globeControls.setAutoRotate(true);
      smoothRotX = 0;
      smoothRotY = 0;
      prevPalmX = null;
      prevPalmY = null;
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
      break;
    }
  }

  requestAnimationFrame(gestureControlLoop);
}

// ========== Start ==========
initGlobe();
