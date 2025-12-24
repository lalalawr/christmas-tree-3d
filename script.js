let scene, camera, renderer, composer;
let tree, star, snow;
let spread = 1;

init();
createTree();
createStar();
createSnow();
animate();

/* =====================
   Three.js 初始化
===================== */
function init() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    1,
    1000
  );
  camera.position.z = 320;

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    preserveDrawingBuffer: true
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // Bloom 后期
  composer = new THREE.EffectComposer(renderer);
  composer.addPass(new THREE.RenderPass(scene, camera));

  const bloom = new THREE.UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.2,
    0.6,
    0.15
  );
  composer.addPass(bloom);

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
  });
}

/* =====================
   冰蓝螺旋能量树
===================== */
function createTree() {
  const geo = new THREE.BufferGeometry();
  const count = 6000;

  const pos = [];
  const col = [];

  for (let i = 0; i < count; i++) {
    const t = i / count;
    const angle = t * Math.PI * 22;
    const radius = (1 - t) * 100;

    pos.push(
      Math.cos(angle) * radius,
      t * 240 - 120,
      Math.sin(angle) * radius
    );

    const c = new THREE.Color();
    c.setHSL(0.55 + Math.random() * 0.05, 0.6, 0.6 + Math.random() * 0.25);
    col.push(c.r, c.g, c.b);
  }

  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));

  const mat = new THREE.PointsMaterial({
    size: 2,
    vertexColors: true,
    transparent: true,
    opacity: 0.75,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  tree = new THREE.Points(geo, mat);
  scene.add(tree);
}

/* =====================
   树顶星
===================== */
function createStar() {
  const geo = new THREE.SphereGeometry(7, 32, 32);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  star = new THREE.Mesh(geo, mat);
  star.position.y = 125;
  scene.add(star);
}

/* =====================
   远景雪花
===================== */
function createSnow() {
  const geo = new THREE.BufferGeometry();
  const count = 1500;
  const pos = [];

  for (let i = 0; i < count; i++) {
    pos.push(
      (Math.random() - 0.5) * 800,
      Math.random() * 600 - 200,
      (Math.random() - 0.5) * 800
    );
  }

  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));

  const mat = new THREE.PointsMaterial({
    size: 1,
    color: 0xffffff,
    transparent: true,
    opacity: 0.35
  });

  snow = new THREE.Points(geo, mat);
  scene.add(snow);
}

/* =====================
   动画
===================== */
function animate() {
  tree.rotation.y += 0.0015;
  tree.scale.set(spread, spread, spread);

  snow.rotation.y += 0.0003;

  const t = Date.now() * 0.003;
  star.scale.setScalar(1 + Math.sin(t) * 0.35);

  composer.render();
  requestAnimationFrame(animate);
}

/* =====================
   名字祝福
===================== */
const nameInput = document.getElementById("nameInput");
const blessing = document.getElementById("blessing");

nameInput.oninput = () => {
  const n = nameInput.value.trim();
  blessing.innerHTML = n
    ? `🎄 Merry Christmas, <b>${n}</b> ✨`
    : "✨ 愿你的世界永远闪闪发光 ✨";
};

/* =====================
   手势 + 音乐
===================== */
const bgm = document.getElementById("bgm");
const gestureBtn = document.getElementById("gestureBtn");
const video = document.getElementById("video");

gestureBtn.onclick = () => {
  bgm.volume = 0.3;
  bgm.play();

  const hands = new Hands({
    locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`
  });

  hands.setOptions({
    maxNumHands: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.7
  });

  hands.onResults(res => {
    if (!res.multiHandLandmarks) return;
    const lm = res.multiHandLandmarks[0];
    const d = Math.abs(lm[0].y - lm[8].y);

    if (d > 0.18) {
      spread = Math.min(spread + 0.02, 1.5);
      bgm.volume = Math.min(bgm.volume + 0.02, 1);
    } else {
      spread = Math.max(spread - 0.02, 0.8);
      bgm.volume = Math.max(bgm.volume - 0.02, 0.1);
    }
  });

  const cam = new Camera(video, {
    onFrame: async () => await hands.send({ image: video }),
    width: 640,
    height: 480
  });
  cam.start();

  gestureBtn.innerText = "✨ 手势魔法已开启";
  gestureBtn.disabled = true;
};

/* =====================
   截图保存
===================== */
document.getElementById("shotBtn").onclick = () => {
  const a = document.createElement("a");
  a.download = "My_Ice_Blue_Christmas_Tree.png";
  a.href = renderer.domElement.toDataURL("image/png");
  a.click();
};
