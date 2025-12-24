/**
 * 圣诞树核心交互逻辑
 */

// --- 变量定义 ---
let scene, camera, renderer, particles, star, snowflakes;
const particleCount = 6000;
const colors = [0xff4d6d, 0xffcfdf, 0xffd700, 0x00ff88, 0x00d2ff, 0xbd93f9];
let currentThemeIndex = 0;
let expansionFactor = 1.0;

// --- 初始化函数 ---
function init() {
    initThree();
    setupEventListeners();
}

function initThree() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    createTree();
    createStar();
    createSnow();

    animate();
    document.getElementById('loader').style.display = 'none';
}

// --- 圣诞树构建 ---
function createTree() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const pColors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
        const r = Math.pow(Math.random(), 1.5) * 2;
        const theta = Math.random() * 2 * Math.PI;
        const h = Math.random() * 4 - 2;
        const currentRadius = r * (1 - (h + 2) / 4.5);
        
        positions[i * 3] = Math.cos(theta) * currentRadius;
        positions[i * 3 + 1] = h;
        positions[i * 3 + 2] = Math.sin(theta) * currentRadius;

        const color = new THREE.Color(colors[Math.floor(Math.random() * colors.length)]);
        pColors[i * 3] = color.r;
        pColors[i * 3 + 1] = color.g;
        pColors[i * 3 + 2] = color.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(pColors, 3));
    
    const material = new THREE.PointsMaterial({
        size: 0.04,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
    });

    particles = new THREE.Points(geometry, material);
    scene.add(particles);
}

function createStar() {
    const geometry = new THREE.SphereGeometry(0.15, 16, 16);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffaa });
    star = new THREE.Mesh(geometry, material);
    star.position.y = 2.1;
    scene.add(star);
}

function createSnow() {
    const snowGeo = new THREE.BufferGeometry();
    const snowPos = new Float32Array(3000);
    for(let i=0; i<3000; i++) { snowPos[i] = (Math.random() - 0.5) * 10; }
    snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
    snowflakes = new THREE.Points(snowGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.02 }));
    scene.add(snowflakes);
}

// --- 交互功能 ---
function setupEventListeners() {
    const nameInput = document.getElementById('nameInput');
    const wishDisplay = document.getElementById('wishDisplay');
    const startBtn = document.getElementById('startCamera');
    const bgm = document.getElementById('bgm');

    // 名字输入响应
    nameInput.addEventListener('input', (e) => {
        const name = e.target.value.trim();
        wishDisplay.innerText = name ? `🎄 Merry Christmas, ${name}！` : `🎄 Merry Christmas!`;
    });

    // 启动摄像头、音乐和手势识别
    startBtn.addEventListener('click', () => {
        // 尝试播放音乐 (兼容移动端静音策略)
        bgm.play().catch(e => {
            console.log("需要用户交互才能播放音乐，正在切换备用链接...");
            bgm.src = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"; 
            bgm.play();
        });

        initGesture();
        startBtn.innerText = "✨ 正在享受魔法";
        startBtn.disabled = true;
        startBtn.style.opacity = "0.5";
    });
}

// --- 手势识别 ---
async function initGesture() {
    const videoElement = document.getElementById('webcam');
    const hint = document.getElementById('gesture-hint');
    const hands = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.7
    });

    let lastX = 0;
    hands.onResults((results) => {
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const landmarks = results.multiHandLandmarks[0];
            const indexFingerTip = landmarks[8];
            const wrist = landmarks[0];
            const distance = Math.sqrt(Math.pow(indexFingerTip.x - wrist.x, 2) + Math.pow(indexFingerTip.y - wrist.y, 2));

            // 张开/握拳判定
            if (distance > 0.4) {
                expansionFactor = 2.5;
                hint.innerText = "✋ 绽放：灵感迸发！";
            } else {
                expansionFactor = 0.5;
                hint.innerText = "✊ 聚合：温暖凝聚";
            }

            // 挥手判定
            if (Math.abs(indexFingerTip.x - lastX) > 0.15) {
                changeTheme();
                hint.innerText = "👉 变色：换一种心情";
            }
            lastX = indexFingerTip.x;
            hint.style.opacity = 1;
        } else {
            expansionFactor = 1.0;
            hint.style.opacity = 0;
        }
    });

    const cameraProvider = new Camera(videoElement, {
        onFrame: async () => { await hands.send({image: videoElement}); },
        width: 640, height: 480
    });
    cameraProvider.start();
}

function changeTheme() {
    currentThemeIndex = (currentThemeIndex + 1) % colors.length;
    const colorAttr = particles.geometry.attributes.color;
    const targetColor = new THREE.Color(colors[currentThemeIndex]);
    for (let i = 0; i < particleCount; i++) {
        if(Math.random() > 0.3) {
            colorAttr.array[i * 3] = targetColor.r;
            colorAttr.array[i * 3 + 1] = targetColor.g;
            colorAttr.array[i * 3 + 2] = targetColor.b;
        }
    }
    colorAttr.needsUpdate = true;
}

// --- 渲染循环 ---
function animate() {
    requestAnimationFrame(animate);
    const time = Date.now() * 0.001;
    
    particles.rotation.y += 0.005;
    particles.scale.lerp(new THREE.Vector3(expansionFactor, expansionFactor, expansionFactor), 0.1);
    
    star.scale.setScalar(1 + Math.sin(time * 3) * 0.1);
    snowflakes.position.y -= 0.01;
    if (snowflakes.position.y < -5) snowflakes.position.y = 5;

    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

window.onload = init;
