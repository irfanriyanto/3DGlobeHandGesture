/**
 * Hand Particles – Animated particles emanating from hand landmarks
 * Creates glowing convergent particle effects on the Three.js scene
 * that follow the hand position
 */

import * as THREE from 'three';
import type { NormalizedLandmark } from '@mediapipe/hands';

interface Particle {
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    life: number;
    maxLife: number;
    size: number;
}

export class HandParticles {
    private scene: THREE.Scene;
    private camera: THREE.Camera;
    private particles: Particle[] = [];
    private geometry: THREE.BufferGeometry;
    private material: THREE.ShaderMaterial;
    private points: THREE.Points;
    private maxParticles = 200;
    private positions: Float32Array;
    private sizes: Float32Array;
    private opacities: Float32Array;
    private active = false;

    constructor(scene: THREE.Scene, camera: THREE.Camera) {
        this.scene = scene;
        this.camera = camera;

        this.positions = new Float32Array(this.maxParticles * 3);
        this.sizes = new Float32Array(this.maxParticles);
        this.opacities = new Float32Array(this.maxParticles);

        this.geometry = new THREE.BufferGeometry();
        this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
        this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));
        this.geometry.setAttribute('opacity', new THREE.BufferAttribute(this.opacities, 1));

        this.material = new THREE.ShaderMaterial({
            uniforms: {
                uColor1: { value: new THREE.Color(0x4fc3f7) },
                uColor2: { value: new THREE.Color(0x7c4dff) },
            },
            vertexShader: `
        attribute float size;
        attribute float opacity;
        varying float vOpacity;
        void main() {
          vOpacity = opacity;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (200.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
            fragmentShader: `
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        varying float vOpacity;
        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;
          float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
          alpha *= alpha;
          vec3 color = mix(uColor1, uColor2, dist * 2.0);
          gl_FragColor = vec4(color, alpha * vOpacity);
        }
      `,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });

        this.points = new THREE.Points(this.geometry, this.material);
        this.scene.add(this.points);
    }

    /**
     * Convert screen-space hand coordinates to world-space
     */
    private screenToWorld(x: number, y: number): THREE.Vector3 {
        // Convert from [0,1] to NDC [-1,1]
        const ndcX = (1 - x) * 2 - 1; // Mirror x for mirrored webcam
        const ndcY = -(y * 2 - 1);

        const vec = new THREE.Vector3(ndcX, ndcY, 0.5);
        vec.unproject(this.camera);

        const dir = vec.sub(this.camera.position).normalize();
        const distance = 2; // Place particles at reasonable depth
        return this.camera.position.clone().add(dir.multiplyScalar(distance));
    }

    /**
     * Spawn particles from hand tip positions converging to palm center
     */
    update(landmarks: NormalizedLandmark[] | null, gesture: string) {
        if (landmarks && gesture !== 'none') {
            this.active = true;

            // Fingertip positions
            const tipIndices = [4, 8, 12, 16, 20];
            const palmCenter = this.screenToWorld(
                landmarks[9].x, // Middle finger base ≈ palm center
                landmarks[9].y
            );

            // Spawn particles from fingertips
            if (Math.random() < 0.6) {
                tipIndices.forEach((idx) => {
                    if (Math.random() < 0.4) {
                        const tipPos = this.screenToWorld(
                            landmarks[idx].x,
                            landmarks[idx].y
                        );

                        // Direction towards palm center
                        const dir = palmCenter.clone().sub(tipPos).normalize();
                        const speed = 0.01 + Math.random() * 0.02;

                        this.particles.push({
                            position: tipPos.clone(),
                            velocity: dir.multiplyScalar(speed).add(
                                new THREE.Vector3(
                                    (Math.random() - 0.5) * 0.005,
                                    (Math.random() - 0.5) * 0.005,
                                    (Math.random() - 0.5) * 0.005
                                )
                            ),
                            life: 0,
                            maxLife: 40 + Math.random() * 30,
                            size: 2 + Math.random() * 4,
                        });
                    }
                });

                // Spawn some from palm center outward
                if (gesture === 'open') {
                    for (let i = 0; i < 2; i++) {
                        this.particles.push({
                            position: palmCenter.clone(),
                            velocity: new THREE.Vector3(
                                (Math.random() - 0.5) * 0.015,
                                (Math.random() - 0.5) * 0.015,
                                (Math.random() - 0.5) * 0.015
                            ),
                            life: 0,
                            maxLife: 30 + Math.random() * 20,
                            size: 1 + Math.random() * 3,
                        });
                    }
                }
            }
        } else {
            this.active = false;
        }

        // Cap particles
        while (this.particles.length > this.maxParticles) {
            this.particles.shift();
        }

        // Update existing particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life++;
            p.position.add(p.velocity);

            if (p.life >= p.maxLife) {
                this.particles.splice(i, 1);
            }
        }

        // Update buffers
        for (let i = 0; i < this.maxParticles; i++) {
            if (i < this.particles.length) {
                const p = this.particles[i];
                const i3 = i * 3;
                this.positions[i3] = p.position.x;
                this.positions[i3 + 1] = p.position.y;
                this.positions[i3 + 2] = p.position.z;
                this.sizes[i] = p.size * (1 - p.life / p.maxLife);
                this.opacities[i] = 1 - p.life / p.maxLife;
            } else {
                this.sizes[i] = 0;
                this.opacities[i] = 0;
            }
        }

        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.attributes.size.needsUpdate = true;
        this.geometry.attributes.opacity.needsUpdate = true;
    }

    dispose() {
        this.scene.remove(this.points);
        this.geometry.dispose();
        this.material.dispose();
    }
}
