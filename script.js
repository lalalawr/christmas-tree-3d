let scene, camera, renderer, tree;
let spread = 1;

initThree();
createTree();
animate();

function initThree() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    1,
    1000
  );
  camera.position.z = 300;

  renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

function createTree() {
  const geometry = new THREE.BufferGeometry();
  const count = 3000;
  const positions = [];
  const colors = [];

  for (let i = 0; i < count; i++) {
    const t = Math.random();
    const radius = (1 - t) * 80 * Math.random();
    const angle = Math.random() * Math.PI * 2;

    positions.push(
      Math.cos(angle) * radius,
      t * 180 - 90,
      Math.sin(angle) * radius
    );

    const color = new THREE.Color(`hsl(${Math.random() * 360},80%,60%)`);
    colors.push(color.r, color.g, color.b);
  }

  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 2,
    vertexColors: true,
    transparent: true,
    opacity: 0.9
  });

  tree = new THREE.Points(geometry, material);
  scene.add(tree);
}

function animate() {
  tree.rotation.y += 0.002;
  tree.scale.set(spread, spread, spread);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
const nameInput = document.getElementById("nameInput");
const blessing = document.getElementById("blessing");

nameInput.addEventListener("input", () => {
  const n = nameInput.value.trim();
  blessing.innerHTML = n
    ? `🎄 Merry Christmas, <b>${n}</b> ✨`
    : "✨ Merry Christmas ✨";
});
const bgm = document.getElementById("bgm");
const gestureBtn = document.getElementById("gestureBtn");
const video = document.getElementById("video");

let hands, cameraMP;

gestureBtn.onclick = () => {
  bgm.volume = 0.3;
  bgm.play();

  hands = new Hands({
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

    // 张开 → 音量 & 树放大
    if (d > 0.18) {
      bgm.volume = Math.min(bgm.volume + 0.02, 1);
      spread = Math.min(spread + 0.02, 1.6);
    } else {
      bgm.volume = Math.max(bgm.volume - 0.02, 0.1);
      spread = Math.max(spread - 0.02, 0.7);
    }
  });

  cameraMP = new Camera(video, {
    onFrame: async () => await hands.send({ image: video }),
    width: 640,
    height: 480
  });

  cameraMP.start();
};
document.getElementById("shotBtn").onclick = () => {
  const link = document.createElement("a");
  link.download = "My_Christmas_Tree.png";
  link.href = renderer.domElement.toDataURL("image/png");
  link.click();
};

