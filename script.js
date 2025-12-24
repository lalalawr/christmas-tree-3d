import { FilesetResolver, HandLandmarker } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/vision_bundle.js";

let scene, camera, renderer, clock = new THREE.Clock();
let treeParticles, starMesh, textParticles, fireworks = [];
let handLandmarker, isCameraRunning = false;

const state = { mode: 'IDLE', time: 0, hasPlayedGreeting: false };
const DOM = {
    loader: document.getElementById('loading-screen'),
    btn: document.getElementById('start-btn'),
    video: document.getElementById('webcam'),
    status: document.getElementById('gesture-status'),
    input: document.getElementById('name-input'),
    greeting: document.getElementById('greeting-text'),
    card: document.getElementById('main-card')
};

// --- 初始化场景 ---
function init() {
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x05080a, 0.015);
    
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
    camera.position.set(0, 15, 55);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    createSpiralTree();
    createStarTop();
    create3DText();
    
    window.addEventListener('resize', onWindowResize);
    loop();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// --- 1. 冰雪螺旋圣诞树逻辑 ---
function createSpiralTree() {
    const count = 15000;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const targets = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    const palette = [
        new THREE.Color(0x00ff88), // 圣诞绿
        new THREE.Color(0xff2d2d), // 圣诞红
        new THREE.Color(0xffcc00), // 流光金
        new THREE.Color(0xa0f0ff)  // 冰雪蓝
    ];

    for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        const h = Math.random() * 30;
        const spiralIndex = i % 6; // 6条主螺旋轨道
        const angle = h * 0.7 + (spiralIndex * (Math.PI * 2 / 6)) + (Math.random() * 0.3);
        const r = (30 - h) * 0.45;

        targets[i3] = Math.cos(angle) * r;
        targets[i3+1] = h;
        targets[i3+2] = Math.sin(angle) * r;

        pos[i3] = (Math.random() - 0.5) * 120;
        pos[i3+1] = Math.random() * 60;
        pos[i3+2] = (Math.random() - 0.5) * 120;

        const c = palette[i % palette.length];
        colors[i3] = c.r; colors[i3+1] = c.g; colors[i3+2] = c.b;
        sizes[i] = Math.random() * 2 + 0.5;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.PointsMaterial({
        size: 0.5,
        vertexColors: true,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    treeParticles = new THREE.Points(geo, mat);
    scene.add(treeParticles);
    window.treeTargets = targets;
    window.treeVels = new Float32Array(count * 3);
}

// --- 2. 顶部五角星 ---
function createStarTop() {
    const shape = new THREE.Shape();
    const outerR = 2.8, innerR = 1.2;
    for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const a = (i * Math.PI * 2) / 10 - Math.PI / 2;
        if (i === 0) shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else shape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    const geo = new THREE.ShapeGeometry(shape);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffcc00, side: THREE.DoubleSide });
    starMesh = new THREE.Mesh(geo, mat);
    starMesh.position.set(0, 31, 0);
    scene.add(starMesh);

    const light = new THREE.PointLight(0xffcc00, 2, 25);
    starMesh.add(light);
}

// --- 3. 底部粒子文字 (Merry Xmas) ---
function create3DText() {
    const count = 1200;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        pos[i3] = (Math.random() - 0.5) * 35;
        pos[i3+1] = -6 + Math.random() * 2.5;
        pos[i3+2] = (Math.random() - 0.5) * 12;
        
        const c = new THREE.Color(i % 2 === 0 ? 0xff2d2d : 0x00ff88);
        colors[i3] = c.r; colors[i3+1] = c.g; colors[i3+2] = c.b;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    textParticles = new THREE.Points(geo, new THREE.PointsMaterial({
        size: 0.35, vertexColors: true, transparent: true, opacity: 0
    }));
    scene.add(textParticles);
}

// --- 4. 烟花特效 ---
function createFirework() {
    const color = new THREE.Color().setHSL(Math.random(), 0.8, 0.6);
    const count = 120;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const vels = new Float32Array(count * 3);
    const origin = new THREE.Vector3((Math.random() - 0.5) * 100, 20 + Math.random() * 25, -40 - Math.random() * 20);
    
    for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        pos[i3] = origin.x; pos[i3+1] = origin.y; pos[i3+2] = origin.z;
        const theta = Math.random() * Math.PI * 2, phi = Math.random() * Math.PI;
        const speed = Math.random() * 0.6 + 0.2;
        vels[i3] = Math.sin(phi) * Math.cos(theta) * speed;
        vels[i3+1] = Math.sin(phi) * Math.sin(theta) * speed;
        vels[i3+2] = Math.cos(phi) * speed;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ size: 0.45, color: color, transparent: true, blending: THREE.AdditiveBlending });
    const p = new THREE.Points(geo, mat);
    scene.add(p);
    fireworks.push({ mesh: p, vels: vels, life: 1.0 });
}

// --- 动画循环 ---
function loop() {
    requestAnimationFrame(loop);
    const delta = clock.getDelta();
    state.time += delta;

    if (treeParticles) {
        const pos = treeParticles.geometry.attributes.position.array;
        const center = new THREE.Vector3(0, 15, 0);
        for (let i = 0; i < pos.length / 3; i++) {
            const i3 = i * 3;
            if (state.mode === 'GATHER') {
                window.treeVels[i3] += (center.x - pos[i3]) * 0.012;
                window.treeVels[i3+1] += (center.y - pos[i3+1]) * 0.012;
                window.treeVels[i3+2] += (center.z - pos[i3+2]) * 0.012;
                window.treeVels[i3] *= 0.82; window.treeVels[i3+1] *= 0.82; window.treeVels[i3+2] *= 0.82;
            } else {
                const tx = window.treeTargets[i3], ty = window.treeTargets[i3+1], tz = window.treeTargets[i3+2];
                window.treeVels[i3] += (tx - pos[i3]) * 0.0035;
                window.treeVels[i3+1] += (ty - pos[i3+1]) * 0.0035;
                window.treeVels[i3+2] += (tz - pos[i3+2]) * 0.0035;
                window.treeVels[i3] *= 0.94; window.treeVels[i3+1] *= 0.94; window.treeVels[i3+2] *= 0.94;
            }
            pos[i3] += window.treeVels[i3]; pos[i3+1] += window.treeVels[i3+1]; pos[i3+2] += window.treeVels[i3+2];
        }
        treeParticles.geometry.attributes.position.needsUpdate = true;
        treeParticles.rotation.y += 0.006;
    }

    if (starMesh) {
        starMesh.rotation.y += 0.05;
        starMesh.scale.setScalar(1 + Math.sin(state.time * 3) * 0.12);
    }

    if (state.hasPlayedGreeting && textParticles) {
        textParticles.material.opacity = Math.min(textParticles.material.opacity + 0.01, 0.9);
        textParticles.position.y = Math.sin(state.time * 0.8) * 0.6;
    }

    if (Math.random() < 0.02) createFirework();
    fireworks.forEach((f, idx) => {
        const p = f.mesh.geometry.attributes.position.array;
        for (let i = 0; i < p.length / 3; i++) {
            const i3 = i * 3;
            p[i3] += f.vels[i3]; p[i3+1] += f.vels[i3+1]; p[i3+2] += f.vels[i3+2];
            f.vels[i3+1] -= 0.004; // Gravity
        }
        f.mesh.geometry.attributes.position.needsUpdate = true;
        f.life -= 0.01;
        f.mesh.material.opacity = f.life;
        if (f.life <= 0) {
            scene.remove(f.mesh);
            fireworks.splice(idx, 1);
        }
    });

    if (handLandmarker && isCameraRunning) detectHands();
    renderer.render(scene, camera);
}

function triggerExplosion() {
    state.mode = 'EXPLODE';
    const pos = treeParticles.geometry.attributes.position.array;
    for (let i = 0; i < pos.length / 3; i++) {
        const i3 = i * 3;
        window.treeVels[i3] = (Math.random() - 0.5) * 6;
        window.treeVels[i3+1] = (Math.random() - 0.5) * 6;
        window.treeVels[i3+2] = (Math.random() - 0.5) * 6;
    }
    setTimeout(() => state.mode = 'IDLE', 2000);
}

function playGreeting() {
    if (state.hasPlayedGreeting) return;
    const name = DOM.input.value || "你";
    const text = `🎄 冰雪魔法开启, ${name}! 圣诞快乐! ✨`;
    let i = 0;
    const timer = setInterval(() => {
        if (i < text.length) {
            const s = document.createElement('span');
            s.className = 'char-pop';
            s.textContent = text[i];
            DOM.greeting.appendChild(s);
            i++;
        } else {
            clearInterval(timer);
            state.hasPlayedGreeting = true;
            setTimeout(() => DOM.card.classList.add('card-hidden'), 4000);
        }
    }, 100);
}

async function setupAI() {
    const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm");
    handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task", delegate: "GPU" },
        runningMode: "VIDEO", numHands: 1
    });
    DOM.btn.style.display = 'block';
}

DOM.btn.addEventListener('click', async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        DOM.video.srcObject = stream;
        isCameraRunning = true;
        DOM.loader.style.opacity = '0';
        setTimeout(() => DOM.loader.style.display = 'none', 1000);
        playGreeting();
    } catch (e) {
        DOM.loader.style.display = 'none';
        playGreeting();
    }
});

function detectHands() {
    const results = handLandmarker.detectForVideo(DOM.video, performance.now());
    if (results.landmarks && results.landmarks.length > 0) {
        const lm = results.landmarks[0];
        const wrist = lm[0], middle = lm[12];
        const dist = Math.sqrt(Math.pow(wrist.x - middle.x, 2) + Math.pow(wrist.y - middle.y, 2));
        if (dist < 0.15) {
            state.mode = 'GATHER';
            DOM.status.innerText = "✊ 魔法聚能中...";
        } else if (state.mode === 'GATHER') {
            triggerExplosion();
            DOM.status.innerText = "✋ 魔法绽放！";
            setTimeout(() => DOM.status.innerText = "等待魔法手势...", 2000);
        }
    }
}

init();
setupAI();
