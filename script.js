import { FilesetResolver, HandLandmarker } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/vision_bundle.js";

let scene, camera, renderer, clock = new THREE.Clock();
let treeParticles, starMesh, textParticles, fireworks = [];
let handLandmarker, isCameraRunning = false;

const apiKey = ""; // 环境变量会自动注入
const state = { 
    mode: 'IDLE', 
    time: 0, 
    hasPlayedGreeting: false,
    treeColors: [0x00ff88, 0xff2d2d, 0xffcc00, 0xa0f0ff] 
};

const DOM = {
    loader: document.getElementById('loading-screen'),
    btn: document.getElementById('start-btn'),
    video: document.getElementById('webcam'),
    status: document.getElementById('gesture-status'),
    input: document.getElementById('name-input'),
    greeting: document.getElementById('greeting-text'),
    card: document.getElementById('main-card'),
    aiBtn: document.getElementById('ai-fortune-btn') || document.createElement('button'), // 兼容性检查
    aiLoading: document.getElementById('ai-loading') || document.createElement('div')
};

// --- Gemini API 集成 ---
async function fetchGeminiFortune(name) {
    DOM.aiLoading.style.display = 'block';
    if(DOM.aiBtn) DOM.aiBtn.disabled = true;
    
    const prompt = `你是一位居住在冰雪圣诞树里的魔法祭司。请为名叫"${name}"的人写一段感人、优雅且充满魔法感的圣诞祝福语（不超过60字）。
    同时，请根据这段话的意境，在回复的最后一行提供一个颜色主题代码（RED, GREEN, GOLD, BLUE 或 WHITE 之一）。`;
    
    let retries = 0;
    const maxRetries = 5;
    
    while (retries < maxRetries) {
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            });
            
            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "圣诞快乐，愿魔法永远伴随你。";
            
            // 解析颜色并更新树的颜色
            const upperText = text.toUpperCase();
            if (upperText.includes('RED')) updateTreeColor(0xff2d2d);
            else if (upperText.includes('GREEN')) updateTreeColor(0x00ff88);
            else if (upperText.includes('GOLD')) updateTreeColor(0xffcc00);
            else if (upperText.includes('BLUE')) updateTreeColor(0x00f3ff);
            else if (upperText.includes('WHITE')) updateTreeColor(0xffffff);
            
            return text.replace(/(RED|GREEN|GOLD|BLUE|WHITE)/gi, '').trim();
        } catch (error) {
            retries++;
            await new Promise(r => setTimeout(r, Math.pow(2, retries) * 1000));
        }
    }
    DOM.aiLoading.style.display = 'none';
    if(DOM.aiBtn) DOM.aiBtn.disabled = false;
    return "魔法能量不稳定，但依然祝你圣诞快乐！";
}

function updateTreeColor(baseHex) {
    if (!treeParticles) return;
    const colorAttr = treeParticles.geometry.attributes.color;
    const base = new THREE.Color(baseHex);
    const secondary = new THREE.Color(0xffffff);
    
    for (let i = 0; i < colorAttr.count; i++) {
        const i3 = i * 3;
        const mix = Math.random();
        const final = base.clone().lerp(secondary, mix * 0.4);
        colorAttr.array[i3] = final.r;
        colorAttr.array[i3+1] = final.g;
        colorAttr.array[i3+2] = final.b;
    }
    colorAttr.needsUpdate = true;
}

// --- 初始化场景 ---
function init() {
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x05080a, 0.012);
    
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
    camera.position.set(0, 18, 55);

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

// --- 1. 高级冰雪螺旋圣诞树逻辑 ---
function createSpiralTree() {
    const count = 18000; // 增加粒子数量提升酷炫感
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const targets = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        const h = Math.random() * 32;
        // 复杂的螺旋交织算法
        const spiralIndex = i % 8; 
        const angle = h * 0.75 + (spiralIndex * (Math.PI * 2 / 8)) + (Math.random() * 0.25);
        const r = (32 - h) * 0.48;

        targets[i3] = Math.cos(angle) * r;
        targets[i3+1] = h;
        targets[i3+2] = Math.sin(angle) * r;

        // 初始散落状态
        pos[i3] = (Math.random() - 0.5) * 150;
        pos[i3+1] = Math.random() * 80;
        pos[i3+2] = (Math.random() - 0.5) * 150;

        const c = new THREE.Color(state.treeColors[i % 4]);
        colors[i3] = c.r; colors[i3+1] = c.g; colors[i3+2] = c.b;
        sizes[i] = Math.random() * 2.5 + 0.5;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.PointsMaterial({
        size: 0.45,
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

// --- 2. 魔法五角星 ---
function createStarTop() {
    const shape = new THREE.Shape();
    const outerR = 3.0, innerR = 1.3;
    for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const a = (i * Math.PI * 2) / 10 - Math.PI / 2;
        if (i === 0) shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else shape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    const geo = new THREE.ShapeGeometry(shape);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffcc00, side: THREE.DoubleSide });
    starMesh = new THREE.Mesh(geo, mat);
    starMesh.position.set(0, 33, 0);
    scene.add(starMesh);

    const light = new THREE.PointLight(0xffcc00, 2.5, 30);
    starMesh.add(light);
}

// --- 3. 粒子文字 ---
function create3DText() {
    const count = 1500;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        pos[i3] = (Math.random() - 0.5) * 40;
        pos[i3+1] = -8 + Math.random() * 3;
        pos[i3+2] = (Math.random() - 0.5) * 15;
        
        const c = new THREE.Color(i % 2 === 0 ? 0xff2d2d : 0x00ff88);
        colors[i3] = c.r; colors[i3+1] = c.g; colors[i3+2] = c.b;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    textParticles = new THREE.Points(geo, new THREE.PointsMaterial({
        size: 0.3, vertexColors: true, transparent: true, opacity: 0
    }));
    scene.add(textParticles);
}

// --- 4. 烟花特效 ---
function createFirework() {
    const color = new THREE.Color().setHSL(Math.random(), 0.9, 0.6);
    const count = 150;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const vels = new Float32Array(count * 3);
    const origin = new THREE.Vector3((Math.random() - 0.5) * 110, 25 + Math.random() * 30, -50 - Math.random() * 20);
    
    for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        pos[i3] = origin.x; pos[i3+1] = origin.y; pos[i3+2] = origin.z;
        const theta = Math.random() * Math.PI * 2, phi = Math.random() * Math.PI;
        const speed = Math.random() * 0.7 + 0.3;
        vels[i3] = Math.sin(phi) * Math.cos(theta) * speed;
        vels[i3+1] = Math.sin(phi) * Math.sin(theta) * speed;
        vels[i3+2] = Math.cos(phi) * speed;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ size: 0.5, color: color, transparent: true, blending: THREE.AdditiveBlending });
    const p = new THREE.Points(geo, mat);
    scene.add(p);
    fireworks.push({ mesh: p, vels: vels, life: 1.0 });
}

// --- 核心动画循环 ---
function loop() {
    requestAnimationFrame(loop);
    const delta = clock.getDelta();
    state.time += delta;

    if (treeParticles) {
        const pos = treeParticles.geometry.attributes.position.array;
        const center = new THREE.Vector3(0, 16, 0);
        for (let i = 0; i < pos.length / 3; i++) {
            const i3 = i * 3;
            if (state.mode === 'GATHER') {
                window.treeVels[i3] += (center.x - pos[i3]) * 0.018;
                window.treeVels[i3+1] += (center.y - pos[i3+1]) * 0.018;
                window.treeVels[i3+2] += (center.z - pos[i3+2]) * 0.018;
                window.treeVels[i3] *= 0.8; window.treeVels[i3+1] *= 0.8; window.treeVels[i3+2] *= 0.8;
            } else {
                const tx = window.treeTargets[i3], ty = window.treeTargets[i3+1], tz = window.treeTargets[i3+2];
                window.treeVels[i3] += (tx - pos[i3]) * 0.005;
                window.treeVels[i3+1] += (ty - pos[i3+1]) * 0.005;
                window.treeVels[i3+2] += (tz - pos[i3+2]) * 0.005;
                window.treeVels[i3] *= 0.92; window.treeVels[i3+1] *= 0.92; window.treeVels[i3+2] *= 0.92;
            }
            pos[i3] += window.treeVels[i3]; pos[i3+1] += window.treeVels[i3+1]; pos[i3+2] += window.treeVels[i3+2];
        }
        treeParticles.geometry.attributes.position.needsUpdate = true;
        treeParticles.rotation.y += 0.008;
    }

    if (starMesh) {
        starMesh.rotation.y += 0.06;
        starMesh.scale.setScalar(1 + Math.sin(state.time * 4) * 0.15);
    }

    if (state.hasPlayedGreeting && textParticles) {
        textParticles.material.opacity = Math.min(textParticles.material.opacity + 0.01, 0.95);
        textParticles.position.y = Math.sin(state.time * 1.2) * 0.7;
    }

    if (Math.random() < 0.03) createFirework();
    fireworks.forEach((f, idx) => {
        const p = f.mesh.geometry.attributes.position.array;
        for (let i = 0; i < p.length / 3; i++) {
            const i3 = i * 3;
            p[i3] += f.vels[i3]; p[i3+1] += f.vels[i3+1]; p[i3+2] += f.vels[i3+2];
            f.vels[i3+1] -= 0.005;
        }
        f.mesh.geometry.attributes.position.needsUpdate = true;
        f.life -= 0.012;
        f.mesh.material.opacity = f.life;
        if (f.life <= 0) {
            scene.remove(f.mesh);
            fireworks.splice(idx, 1);
        }
    });

    if (handLandmarker && isCameraRunning) detectHands();
    renderer.render(scene, camera);
}

// --- 交互触发 ---
async function startMagic(customText = null) {
    const name = DOM.input.value || "朋友";
    const text = customText || `🎄 冰雪魔法开启, ${name}! 圣诞快乐! ✨`;
    DOM.greeting.innerHTML = '';
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
            setTimeout(() => DOM.card.classList.add('card-hidden'), 6000);
        }
    }, 80);
}

// 事件监听
if(DOM.aiBtn) {
    DOM.aiBtn.addEventListener('click', async () => {
        const name = DOM.input.value.trim();
        if(!name) return;
        const fortune = await fetchGeminiFortune(name);
        DOM.aiLoading.style.display = 'none';
        DOM.aiBtn.disabled = false;
        startMagic(fortune);
    });
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
        if(!state.hasPlayedGreeting) startMagic();
    } catch (e) {
        DOM.loader.style.display = 'none';
        startMagic();
    }
});

function detectHands() {
    const results = handLandmarker.detectForVideo(DOM.video, performance.now());
    if (results.landmarks && results.landmarks.length > 0) {
        const lm = results.landmarks[0];
        const wrist = lm[0], middle = lm[12];
        const dist = Math.sqrt(Math.pow(wrist.x - middle.x, 2) + Math.pow(wrist.y - middle.y, 2));
        
        if (dist < 0.14) {
            state.mode = 'GATHER';
            DOM.status.innerText = "✊ 魔法聚能中...";
        } else if (state.mode === 'GATHER') {
            state.mode = 'EXPLODE';
            DOM.status.innerText = "✋ 魔法释放！";
            const pos = treeParticles.geometry.attributes.position.array;
            for (let i = 0; i < pos.length / 3; i++) {
                const i3 = i * 3;
                window.treeVels[i3] = (Math.random() - 0.5) * 8;
                window.treeVels[i3+1] = (Math.random() - 0.5) * 8;
                window.treeVels[i3+2] = (Math.random() - 0.5) * 8;
            }
            setTimeout(() => {
                state.mode = 'IDLE';
                DOM.status.innerText = "等待魔法手势...";
            }, 2500);
        }
    }
}

init();
setupAI();
