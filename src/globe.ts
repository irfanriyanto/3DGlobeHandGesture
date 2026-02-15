/**
 * Globe Scene – Three.js 3D Globe with Galaxy Background
 * Creates a realistic Earth globe with subtle atmosphere and stars
 */

import * as THREE from 'three';

// Multiple CDN fallbacks for Earth textures
const TEXTURE_SOURCES = [
    {
        earth: 'https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg',
        bump: 'https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png',
        spec: 'https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-water.png',
        clouds: 'https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-clouds.png',
    },
    {
        earth: 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg',
        bump: 'https://unpkg.com/three-globe/example/img/earth-topology.png',
        spec: 'https://unpkg.com/three-globe/example/img/earth-water.png',
        clouds: 'https://unpkg.com/three-globe/example/img/earth-clouds.png',
    },
    {
        earth: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg',
        bump: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_normal_2048.jpg',
        spec: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_specular_2048.jpg',
        clouds: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_clouds_1024.png',
    },
];

export interface GlobeControls {
    rotateX: (angle: number) => void;
    rotateY: (angle: number) => void;
    setZoom: (distance: number) => void;
    getZoom: () => number;
    setAutoRotate: (enabled: boolean) => void;
    movePosition: (dx: number, dy: number) => void;
    resetPosition: () => void;
}

/**
 * Try loading a texture from multiple URLs. Returns first successful one.
 */
function loadTextureWithFallback(
    loader: THREE.TextureLoader,
    urls: string[],
    onSuccess: (tex: THREE.Texture) => void,
    onAllFailed: () => void
) {
    let attempt = 0;

    function tryNext() {
        if (attempt >= urls.length) {
            onAllFailed();
            return;
        }
        const url = urls[attempt];
        attempt++;
        loader.load(url, onSuccess, undefined, () => {
            console.warn(`Failed to load: ${url}, trying next URL...`);
            tryNext();
        });
    }

    tryNext();
}

export function createGlobeScene(
    canvas: HTMLCanvasElement,
    onProgress: (pct: number) => void
): { controls: GlobeControls; scene: THREE.Scene; camera: THREE.Camera; dispose: () => void } {
    // ========== Renderer ==========
    const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.setClearColor(0x000000, 0); // Fully transparent

    // ========== Scene ==========
    const scene = new THREE.Scene();
    // No scene.background – transparent to show webcam behind

    // ========== Camera ==========
    const camera = new THREE.PerspectiveCamera(
        50,
        window.innerWidth / window.innerHeight,
        0.1,
        2000
    );
    camera.position.set(0, 0, 3.5);

    // ========== Lights ==========
    // Strong ambient so the globe is always visible
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambientLight);

    // Hemisphere light: sky blue from top, dark blue from bottom
    const hemiLight = new THREE.HemisphereLight(0x88bbff, 0x223344, 1.0);
    scene.add(hemiLight);

    // Main sunlight
    const sunLight = new THREE.DirectionalLight(0xfff8f0, 2.5);
    sunLight.position.set(5, 3, 5);
    scene.add(sunLight);

    // Fill light for dark side (so back is not pure black)
    const fillLight = new THREE.DirectionalLight(0x4488cc, 0.8);
    fillLight.position.set(-5, -2, -5);
    scene.add(fillLight);

    // Extra side light
    const sideLight = new THREE.DirectionalLight(0xffffff, 0.5);
    sideLight.position.set(-3, 2, 3);
    scene.add(sideLight);

    // ========== Globe Group ==========
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    // ========== Texture Loading ==========
    const textureLoader = new THREE.TextureLoader();
    textureLoader.crossOrigin = 'anonymous';
    let loadedCount = 0;
    const totalTextures = 4;
    let progressCompleted = false;

    function trackLoad() {
        if (progressCompleted) return;
        loadedCount++;
        const pct = (loadedCount / totalTextures) * 100;
        onProgress(pct);
        if (pct >= 100) progressCompleted = true;
    }

    // Timeout: force complete after 10s
    setTimeout(() => {
        if (!progressCompleted) {
            console.warn('Timeout: forced completion');
            progressCompleted = true;
            onProgress(100);
        }
    }, 10000);

    // ========== Earth ==========
    const earthGeometry = new THREE.SphereGeometry(1, 128, 128);
    const earthMaterial = new THREE.MeshPhongMaterial({
        color: 0xffffff, // White base so textures display at full brightness
        shininess: 20,
        specular: new THREE.Color(0x444444),
    });

    const earth = new THREE.Mesh(earthGeometry, earthMaterial);
    globeGroup.add(earth);

    // Earth main texture
    const earthUrls = TEXTURE_SOURCES.map((s) => s.earth);
    loadTextureWithFallback(
        textureLoader,
        earthUrls,
        (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            earthMaterial.map = tex;
            earthMaterial.needsUpdate = true;
            trackLoad();
        },
        trackLoad
    );

    // Bump map
    const bumpUrls = TEXTURE_SOURCES.map((s) => s.bump);
    loadTextureWithFallback(
        textureLoader,
        bumpUrls,
        (tex) => {
            earthMaterial.bumpMap = tex;
            earthMaterial.bumpScale = 0.03;
            earthMaterial.needsUpdate = true;
            trackLoad();
        },
        trackLoad
    );

    // Specular map
    const specUrls = TEXTURE_SOURCES.map((s) => s.spec);
    loadTextureWithFallback(
        textureLoader,
        specUrls,
        (tex) => {
            earthMaterial.specularMap = tex;
            earthMaterial.needsUpdate = true;
            trackLoad();
        },
        trackLoad
    );

    // ========== Clouds ==========
    const cloudGeometry = new THREE.SphereGeometry(1.012, 96, 96);
    const cloudMaterial = new THREE.MeshPhongMaterial({
        transparent: true,
        opacity: 0.25,
        depthWrite: false,
        color: 0xffffff,
    });

    const clouds = new THREE.Mesh(cloudGeometry, cloudMaterial);
    globeGroup.add(clouds);

    const cloudUrls = TEXTURE_SOURCES.map((s) => s.clouds);
    loadTextureWithFallback(
        textureLoader,
        cloudUrls,
        (tex) => {
            cloudMaterial.map = tex;
            cloudMaterial.alphaMap = tex;
            cloudMaterial.needsUpdate = true;
            trackLoad();
        },
        trackLoad
    );


    // Stars removed – webcam is the background now

    // ========== State ==========
    let autoRotate = true;
    let targetZoom = 3.5;
    let currentZoom = 3.5;
    let disposed = false;
    let targetX = 0, targetY = 0;
    let currentX = 0, currentY = 0;

    // ========== Animation Loop ==========
    function animate() {
        if (disposed) return;
        requestAnimationFrame(animate);

        if (autoRotate) {
            globeGroup.rotation.y += 0.001;
        }

        clouds.rotation.y += 0.0003;

        currentZoom += (targetZoom - currentZoom) * 0.08;
        camera.position.z = currentZoom;

        // Smooth position movement
        currentX += (targetX - currentX) * 0.12;
        currentY += (targetY - currentY) * 0.12;
        globeGroup.position.x = currentX;
        globeGroup.position.y = currentY;

        renderer.render(scene, camera);
    }
    animate();

    // ========== Resize ==========
    function handleResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
    window.addEventListener('resize', handleResize);

    // ========== Controls API ==========
    const controls: GlobeControls = {
        rotateX(angle: number) {
            globeGroup.rotation.x += angle;
            globeGroup.rotation.x = Math.max(
                -Math.PI / 2,
                Math.min(Math.PI / 2, globeGroup.rotation.x)
            );
        },
        rotateY(angle: number) {
            globeGroup.rotation.y += angle;
        },
        setZoom(distance: number) {
            targetZoom = Math.max(1.8, Math.min(8, distance));
        },
        getZoom() {
            return targetZoom;
        },
        setAutoRotate(enabled: boolean) {
            autoRotate = enabled;
        },
        movePosition(dx: number, dy: number) {
            // Move globe by delta (normalized coords → 3D space)
            // Mirror X because webcam is mirrored
            targetX += -dx * 5;
            targetY += -dy * 5;
        },
        resetPosition() {
            targetX = 0;
            targetY = 0;
        },
    };

    function dispose() {
        disposed = true;
        window.removeEventListener('resize', handleResize);
        renderer.dispose();
        earthGeometry.dispose();
        earthMaterial.dispose();
        cloudGeometry.dispose();
        cloudMaterial.dispose();
    }

    return { controls, scene, camera, dispose };
}
