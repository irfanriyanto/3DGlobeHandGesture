/**
 * Hand Tracking Module
 * Uses MediaPipe Hands for real-time hand gesture recognition
 * Detects: Open Palm (rotate), Peace/2 fingers (zoom), Fist (stop)
 */

import { Hands, Results, NormalizedLandmark } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';

export type GestureType = 'open' | 'pinch' | 'fist' | 'none';

export interface HandState {
    gesture: GestureType;
    palmCenter: { x: number; y: number } | null;
    landmarks: NormalizedLandmark[] | null;
    pinchDistance: number; // 0 = fully pinched, 1 = fully open
}

export interface HandTracker {
    start: () => Promise<void>;
    getState: () => HandState;
    dispose: () => void;
}

export function createHandTracker(
    videoElement: HTMLVideoElement,
    overlayCanvas: HTMLCanvasElement,
    onStatusChange: (status: 'loading' | 'active' | 'error', message: string) => void
): HandTracker {
    let state: HandState = {
        gesture: 'none',
        palmCenter: null,
        landmarks: null,
        pinchDistance: 1,
    };

    let mediaCamera: Camera | null = null;
    // Gesture smoothing: require N consecutive frames of the same gesture
    let gestureBuffer: GestureType = 'none';
    let gestureCount = 0;
    const GESTURE_THRESHOLD = 2; // frames required to confirm gesture switch
    const ctx = overlayCanvas.getContext('2d')!;

    const hands = new Hands({
        locateFile: (file) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.5,
    });

    hands.onResults(onResults);

    function onResults(results: Results) {
        overlayCanvas.width = overlayCanvas.clientWidth;
        overlayCanvas.height = overlayCanvas.clientHeight;
        ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const landmarks = results.multiHandLandmarks[0];
            state.landmarks = landmarks;

            drawHandVisualization(ctx, landmarks, overlayCanvas.width, overlayCanvas.height);

            const detected = detectGesture(landmarks);
            state.pinchDistance = detected.pinchDist;

            // Gesture smoothing: require consecutive frames to confirm switch
            if (detected.gesture === gestureBuffer) {
                gestureCount++;
            } else {
                gestureBuffer = detected.gesture;
                gestureCount = 1;
            }
            if (gestureCount >= GESTURE_THRESHOLD) {
                state.gesture = gestureBuffer;
            }

            // Palm center
            const palmIndices = [0, 5, 9, 13, 17];
            let cx = 0, cy = 0;
            palmIndices.forEach((idx) => {
                cx += landmarks[idx].x;
                cy += landmarks[idx].y;
            });
            state.palmCenter = {
                x: cx / palmIndices.length,
                y: cy / palmIndices.length,
            };
        } else {
            state.gesture = 'none';
            state.palmCenter = null;
            state.landmarks = null;
            state.pinchDistance = 1;
        }
    }

    function isFingerExtended(landmarks: NormalizedLandmark[], tipIdx: number, pipIdx: number): boolean {
        return landmarks[tipIdx].y < landmarks[pipIdx].y;
    }

    function detectGesture(landmarks: NormalizedLandmark[]): { gesture: GestureType; pinchDist: number } {
        const wrist = landmarks[0];
        const thumbTip = landmarks[4];
        const thumbIp = landmarks[3];
        const indexTip = landmarks[8];
        const middleMcp = landmarks[9];

        // Hand size: distance from wrist to middle finger base (for normalization)
        const handSize = Math.hypot(wrist.x - middleMcp.x, wrist.y - middleMcp.y);
        if (handSize < 0.01) return { gesture: 'none', pinchDist: 1 }; // hand too small/not detected

        // Check each finger
        const indexUp = isFingerExtended(landmarks, 8, 6);
        const middleUp = isFingerExtended(landmarks, 12, 10);
        const ringUp = isFingerExtended(landmarks, 16, 14);
        const pinkyUp = isFingerExtended(landmarks, 20, 18);

        // Thumb: compare x-distance from wrist
        const thumbUp = Math.abs(thumbTip.x - wrist.x) > Math.abs(thumbIp.x - wrist.x);

        const fingersUp = [indexUp, middleUp, ringUp, pinkyUp].filter(Boolean).length;

        // Pinch distance normalized by hand size (0 = touching, ~1 = far apart)
        const rawPinchDist = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);
        const normalizedPinch = rawPinchDist / handSize;

        // ✊ FIST: check FIRST — all fingers curled, thumb down
        // In a fist, thumb and index are naturally close, so we must check this before pinch
        if (fingersUp <= 1 && !thumbUp) {
            return { gesture: 'fist', pinchDist: normalizedPinch };
        }

        // 🤏 PINCH: thumb and index close together, BUT at least one must be extended
        // This prevents fist from triggering pinch
        if (normalizedPinch < 0.5 && (thumbUp || indexUp)) {
            return { gesture: 'pinch', pinchDist: normalizedPinch };
        }

        // ✋ OPEN: 3+ fingers extended
        if (fingersUp >= 3) {
            return { gesture: 'open', pinchDist: normalizedPinch };
        }

        return { gesture: 'none', pinchDist: normalizedPinch };
    }

    function drawHandVisualization(
        ctx: CanvasRenderingContext2D,
        landmarks: NormalizedLandmark[],
        w: number,
        h: number
    ) {
        const connections = [
            [0, 1], [1, 2], [2, 3], [3, 4],
            [0, 5], [5, 6], [6, 7], [7, 8],
            [0, 9], [9, 10], [10, 11], [11, 12],
            [0, 13], [13, 14], [14, 15], [15, 16],
            [0, 17], [17, 18], [18, 19], [19, 20],
            [5, 9], [9, 13], [13, 17],
        ];

        // Lines
        ctx.strokeStyle = 'rgba(109, 121, 147, 0.6)';
        ctx.lineWidth = 2.5;
        connections.forEach(([a, b]) => {
            ctx.beginPath();
            ctx.moveTo(landmarks[a].x * w, landmarks[a].y * h);
            ctx.lineTo(landmarks[b].x * w, landmarks[b].y * h);
            ctx.stroke();
        });

        // Dots
        landmarks.forEach((lm, i) => {
            const x = lm.x * w;
            const y = lm.y * h;
            const isTip = [4, 8, 12, 16, 20].includes(i);
            const r = isTip ? 5 : 3;

            // Glow
            const grad = ctx.createRadialGradient(x, y, 0, x, y, r * 2.5);
            grad.addColorStop(0, 'rgba(109, 121, 147, 0.7)');
            grad.addColorStop(1, 'rgba(109, 121, 147, 0)');
            ctx.beginPath();
            ctx.arc(x, y, r * 2.5, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();

            // Dot
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fillStyle = isTip ? '#8a9bb5' : '#6D7993';
            ctx.fill();
        });
    }

    async function start() {
        try {
            onStatusChange('loading', 'Loading hand tracking model...');

            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user',
                },
            });

            videoElement.srcObject = stream;
            await videoElement.play();

            mediaCamera = new Camera(videoElement, {
                onFrame: async () => {
                    await hands.send({ image: videoElement });
                },
                width: 640,
                height: 480,
            });

            await mediaCamera.start();
            onStatusChange('active', 'Hand tracking active');
        } catch (err) {
            console.error('Hand tracking error:', err);
            onStatusChange('error', 'Camera access denied');
        }
    }

    function dispose() {
        mediaCamera?.stop();
        hands.close();
        const stream = videoElement.srcObject as MediaStream;
        stream?.getTracks().forEach((t) => t.stop());
    }

    return {
        start,
        getState: () => state,
        dispose,
    };
}
