/* ── OPEN SOURCE ORCHESTRA · THE VIRTUAL SANCTUARY ─────────────────────────
   A walk-in model of the approved Devcon 8 Music Space: JIO World Convention
   Centre, Mumbai. Circular stage, no front, 25 approved backline items —
   every one of them playable. Desktop · mobile · WebXR.
   three.js r169 vendored locally · no CDN, no trackers. CC0.
   ------------------------------------------------------------------------- */
import * as THREE from './three.module.min.js';
import { VRButton } from './VRButton.js';
import * as A from './audio.js';
import { ITEMS, EXTRA } from './items.js';

const C = {
  night: 0x0b0612, deep: 0x150b22, violet: 0x2a1740, plum: 0x3d1c42,
  cream: 0xf7ecd9, gold: 0xf0c464, goldBright: 0xffd97a,
  coral: 0xff8a5c, rose: 0xe86a92, teal: 0x2dd4bf,
  wood: 0x7a4b2a, woodDark: 0x4a2c18, skin: 0xd9a06b,
  metal: 0xb9b2a6, black: 0x14121a, rug: 0x6b2340, rug2: 0x8c3a24,
};
const R_CIRCLE = 3.0;        // Ø 6 m performance circle, per rider §1
const ROOM = { w: 34, d: 26, h: 8.5 };

let renderer, scene, camera, player, clock, raycaster;
let hoverItem = null, selected = null, idleOrbit = true, orbitA = 0;
const stations = [];         // { item, group, bus, pos, hit[] }
const labels = [];
const ledRing = [], spots = [], audience = [], dust = [];
const keys = {};
const look = { yaw: 0, pitch: -0.04 };
let ptr = { down: false, x: 0, y: 0, moved: 0, t: 0, item: null, longTimer: null };
const tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3();
let flyTo = null, jamOn = false, jamTimer = null, ledMood = 0;
const controllers = [];

/* ── boot ───────────────────────────────────────────────────────────────── */
export function start(hud) {
  clock = new THREE.Clock();
  raycaster = new THREE.Raycaster();
  scene = new THREE.Scene();
  scene.background = skyTexture();
  scene.fog = new THREE.FogExp2(0x180d26, 0.014);

  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.xr.enabled = true;
  document.getElementById('stage').appendChild(renderer.domElement);

  camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.08, 220);
  player = new THREE.Group();
  player.position.set(0, 0, 8.6);
  player.add(camera);
  camera.position.set(0, 1.62, 0);
  scene.add(player);

  buildHall();
  buildCircle();
  buildStations();
  buildOps();
  buildAudience();
  buildDust();

  // VR
  const vrb = VRButton.createButton(renderer);
  vrb.classList.add('vrbtn');
  document.getElementById('vrslot').appendChild(vrb);
  for (let i = 0; i < 2; i++) {
    const c = renderer.xr.getController(i);
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]),
      new THREE.LineBasicMaterial({ color: C.goldBright, transparent: true, opacity: 0.6 }));
    line.scale.z = 5; c.add(line);
    c.addEventListener('selectstart', () => onXRSelect(c));
    player.add(c); controllers.push(c);
  }

  bindInput(hud);
  addEventListener('resize', onResize);
  renderer.setAnimationLoop(tick);
  return { stations, flyToItem, trigger, toggleJam, panicStop, setQuality, startTour, stopTour };
}

/* ── sky + hall ─────────────────────────────────────────────────────────── */
function skyTexture() {
  const cv = document.createElement('canvas'); cv.width = 16; cv.height = 256;
  const g = cv.getContext('2d').createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#1a0f2b'); g.addColorStop(0.45, '#3a1b3f');
  g.addColorStop(0.7, '#8a3f4a'); g.addColorStop(0.86, '#d9793f'); g.addColorStop(1, '#f2b06a');
  const c2 = cv.getContext('2d'); c2.fillStyle = g; c2.fillRect(0, 0, 16, 256);
  const t = new THREE.CanvasTexture(cv);
  t.mapping = THREE.EquirectangularReflectionMapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function buildHall() {
  // lights — warm house wash + the circle's own glow
  scene.add(new THREE.HemisphereLight(0x8c6aa0, 0x241a2e, 0.9));
  scene.add(new THREE.AmbientLight(0xffd9a8, 0.34));
  // two warm fills so the instruments read as objects, not silhouettes
  [[-6.5, 3.2, 2.5], [6.5, 3.2, -2.5]].forEach(p => {
    const l = new THREE.PointLight(0xffc98a, 1.5, 24, 2); l.position.set(...p); scene.add(l);
  });

  const sun = new THREE.DirectionalLight(0xffb070, 0.8);       // dusk through the glass
  sun.position.set(-14, 9, -16); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -18; sun.shadow.camera.right = 18;
  sun.shadow.camera.top = 18; sun.shadow.camera.bottom = -18;
  sun.shadow.camera.far = 70;
  scene.add(sun);

  const centre = new THREE.PointLight(C.gold, 3.1, 24, 2);
  centre.position.set(0, 3.4, 0); scene.add(centre);

  // four moving quadrant spots (the circle has no front, so neither does the light)
  [[C.rose, 1], [C.teal, 1], [C.coral, 1], [C.gold, 1]].forEach(([col], i) => {
    const s = new THREE.SpotLight(col, 16, 20, 0.5, 0.6, 1.4);
    const a = (i / 4) * Math.PI * 2;
    s.position.set(Math.cos(a) * 5.5, 6.4, Math.sin(a) * 5.5);
    s.target.position.set(0, 0.4, 0);
    scene.add(s); scene.add(s.target); spots.push({ s, a, i });
    const can = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.34, 12),
      new THREE.MeshStandardMaterial({ color: 0x24202c, roughness: 0.5, metalness: 0.7, emissive: col, emissiveIntensity: 0.25 }));
    can.position.copy(s.position); scene.add(can);
  });

  // floor — polished convention-centre stone
  const floorTex = gridTexture();
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.w, ROOM.d),
    new THREE.MeshStandardMaterial({ color: 0x1d1428, roughness: 0.28, metalness: 0.22, map: floorTex }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

  // ceiling + truss
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.w, ROOM.d),
    new THREE.MeshStandardMaterial({ color: 0x120a1c, roughness: 0.95 }));
  ceil.rotation.x = Math.PI / 2; ceil.position.y = ROOM.h; scene.add(ceil);
  const trussMat = new THREE.MeshStandardMaterial({ color: 0x2a2535, roughness: 0.6, metalness: 0.6 });
  for (let i = -2; i <= 2; i++) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(ROOM.w - 2, 0.18, 0.18), trussMat);
    t.position.set(0, ROOM.h - 0.5, i * 5); scene.add(t);
  }
  for (let i = -3; i <= 3; i++) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, ROOM.d - 2), trussMat);
    t.position.set(i * 5, ROOM.h - 0.7, 0); scene.add(t);
  }
  // house fixtures
  for (let x = -2; x <= 2; x++) for (let z = -1; z <= 1; z++) {
    const f = new THREE.Mesh(new THREE.CircleGeometry(0.5, 16),
      new THREE.MeshStandardMaterial({ color: 0xffe0b0, emissive: 0xffd9a0, emissiveIntensity: 0.9, roughness: 1 }));
    f.rotation.x = Math.PI / 2; f.position.set(x * 6.5, ROOM.h - 0.08, z * 8); scene.add(f);
  }

  // walls: three solid, one glass curtain wall (the Mumbai dusk side)
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x241732, roughness: 0.92, side: THREE.DoubleSide });
  const mkWall = (w, h, pos, rotY) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallMat);
    m.position.set(...pos); m.rotation.y = rotY; m.receiveShadow = true; scene.add(m); return m;
  };
  mkWall(ROOM.w, ROOM.h, [0, ROOM.h / 2, ROOM.d / 2], Math.PI);          // behind the entrance
  mkWall(ROOM.d, ROOM.h, [ROOM.w / 2, ROOM.h / 2, 0], -Math.PI / 2);     // DJ side
  mkWall(ROOM.d, ROOM.h, [-ROOM.w / 2, ROOM.h / 2, 0], Math.PI / 2);     // floor-seating side

  // glass curtain wall at -z with mullions + the city beyond
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.w, ROOM.h),
    new THREE.MeshStandardMaterial({ color: 0x9fd8e8, transparent: true, opacity: 0.14, roughness: 0.1, metalness: 0.1, side: THREE.DoubleSide }));
  glass.position.set(0, ROOM.h / 2, -ROOM.d / 2); scene.add(glass);
  const mull = new THREE.MeshStandardMaterial({ color: 0x3b3346, roughness: 0.5, metalness: 0.7 });
  for (let i = -8; i <= 8; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.1, ROOM.h, 0.14), mull);
    m.position.set(i * 2.1, ROOM.h / 2, -ROOM.d / 2 + 0.06); scene.add(m);
  }
  [1.2, ROOM.h * 0.55].forEach(y => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(ROOM.w, 0.1, 0.14), mull);
    m.position.set(0, y, -ROOM.d / 2 + 0.06); scene.add(m);
  });
  buildCity();

  // structural pillars
  const pm = new THREE.MeshStandardMaterial({ color: 0x2b2238, roughness: 0.8 });
  [[-11, -8], [11, -8], [-11, 8], [11, 8]].forEach(([x, z]) => {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, ROOM.h, 16), pm);
    p.position.set(x, ROOM.h / 2, z); p.castShadow = true; scene.add(p);
  });

  // signage
  sign('DEVCON  8  ·  MUMBAI', 'THE  MUSIC  SPACE  —  A  SANCTUARY', [0, 5.1, ROOM.d / 2 - 0.12], Math.PI, 9.5);
  sign('OPEN SOURCE ORCHESTRA', 'every voice is a node · the instruments are permissionless', [-ROOM.w / 2 + 0.12, 4.4, 0], Math.PI / 2, 8.5);
  sign('✅  RIDER APPROVED', 'backline confirmed · 25 line items · nov 3–6, 2026', [ROOM.w / 2 - 0.12, 4.4, 0], -Math.PI / 2, 8.5);

  // entrance carpet + check-in table (rider §1: stage-management corner, check-in)
  const carpet = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 7),
    new THREE.MeshStandardMaterial({ color: 0x3a1430, roughness: 1 }));
  carpet.rotation.x = -Math.PI / 2; carpet.position.set(0, 0.012, 9.4); scene.add(carpet);
}

function buildCity() {
  // Mumbai dusk skyline beyond the glass — silhouettes + warm windows
  const g = new THREE.Group();
  const rnd = mulberry(7);
  for (let i = 0; i < 46; i++) {
    const w = 1.2 + rnd() * 3.4, h = 3 + rnd() * 17, d = 1.2 + rnd() * 3;
    const x = -34 + rnd() * 68, z = -ROOM.d / 2 - 7 - rnd() * 38;
    const col = new THREE.Color().setHSL(0.72 + rnd() * 0.1, 0.35, 0.07 + rnd() * 0.05);
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({ color: col, roughness: 0.95, emissive: 0xffb06a, emissiveIntensity: 0.035 }));
    b.position.set(x, h / 2, z); g.add(b);
  }
  // window glow sprites
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const cx = cv.getContext('2d');
  const rg = cx.createRadialGradient(32, 32, 0, 32, 32, 32);
  rg.addColorStop(0, 'rgba(255,200,130,.9)'); rg.addColorStop(1, 'rgba(255,170,90,0)');
  cx.fillStyle = rg; cx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(cv);
  for (let i = 0; i < 120; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.25 + Math.random() * 0.5 }));
    s.scale.setScalar(0.5 + Math.random() * 1.1);
    s.position.set(-34 + Math.random() * 68, 1 + Math.random() * 16, -ROOM.d / 2 - 7 - Math.random() * 34);
    g.add(s);
  }
  scene.add(g);
}

function xiTexture() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 256;
  const x = cv.getContext('2d');
  x.clearRect(0, 0, 256, 256);
  x.strokeStyle = '#ffd97a'; x.lineWidth = 11; x.lineCap = 'round'; x.lineJoin = 'round';
  // the Ξ as a diamond outline + bars: read as Ethereum without shouting
  x.beginPath(); x.moveTo(128, 26); x.lineTo(206, 128); x.lineTo(128, 230); x.lineTo(50, 128); x.closePath(); x.stroke();
  x.beginPath(); x.moveTo(60, 140); x.lineTo(128, 180); x.lineTo(196, 140); x.stroke();
  x.beginPath(); x.moveTo(128, 26); x.lineTo(128, 180); x.stroke();
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

function gridTexture() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 256;
  const x = cv.getContext('2d');
  x.fillStyle = '#1d1428'; x.fillRect(0, 0, 256, 256);
  x.strokeStyle = 'rgba(247,236,217,.055)'; x.lineWidth = 2;
  x.strokeRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(ROOM.w / 2, ROOM.d / 2);
  return t;
}

function sign(big, small, pos, rotY, w) {
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 180;
  const x = cv.getContext('2d');
  x.clearRect(0, 0, 1024, 180);
  x.fillStyle = '#ffd97a'; x.font = '600 62px ui-sans-serif, system-ui, sans-serif';
  x.textAlign = 'center'; x.letterSpacing = '6px';
  x.fillText(big, 512, 72);
  x.fillStyle = 'rgba(247,236,217,.62)'; x.font = '300 30px ui-sans-serif, system-ui, sans-serif';
  x.fillText(small, 512, 126);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 180 / 1024),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
  m.position.set(...pos); m.rotation.y = rotY; scene.add(m);
}

/* ── the circle ─────────────────────────────────────────────────────────── */
function buildCircle() {
  // rug ring (Ø6 m, defined by rugs not a riser — rider §1)
  const rug = new THREE.Mesh(new THREE.CircleGeometry(R_CIRCLE + 0.35, 64),
    new THREE.MeshStandardMaterial({ color: C.rug, roughness: 1 }));
  rug.rotation.x = -Math.PI / 2; rug.position.y = 0.014; rug.receiveShadow = true; scene.add(rug);
  const inner = new THREE.Mesh(new THREE.RingGeometry(R_CIRCLE - 1.5, R_CIRCLE - 0.2, 64),
    new THREE.MeshStandardMaterial({ color: C.rug2, roughness: 1 }));
  inner.rotation.x = -Math.PI / 2; inner.position.y = 0.018; scene.add(inner);

  // low LED ring — the only thing that marks the stage edge
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    const seg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.07),
      new THREE.MeshStandardMaterial({ color: C.teal, emissive: C.teal, emissiveIntensity: 1.6, roughness: 0.4 }));
    seg.position.set(Math.cos(a) * (R_CIRCLE + 0.5), 0.035, Math.sin(a) * (R_CIRCLE + 0.5));
    seg.rotation.y = -a; scene.add(seg); ledRing.push({ m: seg, a });
  }
  // centre marker: no conductor stands here
  const centre = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.012, 8, 48),
    new THREE.MeshStandardMaterial({ color: C.gold, emissive: C.gold, emissiveIntensity: 0.9 }));
  centre.rotation.x = Math.PI / 2; centre.position.y = 0.02; scene.add(centre);

  // Ξ — the mark of the house, inlaid in the floor and hovering over the circle
  const xi = xiTexture();
  const inlay = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5),
    new THREE.MeshBasicMaterial({ map: xi, transparent: true, opacity: 0.16, depthWrite: false }));
  inlay.rotation.x = -Math.PI / 2; inlay.position.y = 0.022; scene.add(inlay);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: xi, transparent: true, opacity: 0.22, depthWrite: false }));
  halo.scale.set(2.2, 2.2, 1); halo.position.set(0, 4.3, 0); scene.add(halo);
  scene.userData.halo = halo;

  // floor-seating cushions on the west quadrant (rider §1: essential, not decorative)
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * 0.74 + (i / 7) * Math.PI * 0.52;
    const cu = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 8),
      new THREE.MeshStandardMaterial({ color: i % 2 ? 0xb3405a : 0xd98c3a, roughness: 1 }));
    cu.scale.y = 0.42;
    cu.position.set(Math.cos(a) * (R_CIRCLE - 1.0), 0.12, Math.sin(a) * (R_CIRCLE - 1.0));
    cu.castShadow = true; scene.add(cu);
  }
  // PA: four quadrant tops on poles, aimed outward (rider §2)
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 2.1, 8),
      new THREE.MeshStandardMaterial({ color: 0x1b1824, roughness: 0.6, metalness: 0.5 }));
    pole.position.y = 1.05; g.add(pole);
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.62, 0.38),
      new THREE.MeshStandardMaterial({ color: 0x14121a, roughness: 0.7 }));
    top.position.y = 2.3; top.castShadow = true; g.add(top);
    const cone = new THREE.Mesh(new THREE.CircleGeometry(0.15, 16),
      new THREE.MeshStandardMaterial({ color: 0x3a3340, roughness: 0.9 }));
    cone.position.set(0, 2.32, 0.2); g.add(cone);
    g.position.set(Math.cos(a) * 5.4, 0, Math.sin(a) * 5.4);
    g.lookAt(Math.cos(a) * 20, 2, Math.sin(a) * 20);
    scene.add(g);
    if (i === 0) registerStation(EXTRA[0], g, g.position.clone(), [top]);
  }
}

/* ── stations ───────────────────────────────────────────────────────────── */
const ZONE_ARC = {
  dj:    { from: -1.92, to: -1.22, r: 4.05 },   // far side (−z)
  amped: { from: -1.05, to: 0.42,  r: 4.0  },   // the amped quadrant (+x)
  hands: { from: 0.58,  to: 2.0,   r: 3.7  },   // hand percussion (+z, by the entrance)
  floor: { from: 2.18,  to: 4.1,   r: 3.25 },   // floor seating (−x)
};

function buildStations() {
  const byZone = {};
  ITEMS.forEach(it => (byZone[it.zone] = byZone[it.zone] || []).push(it));
  Object.entries(byZone).forEach(([zone, list]) => {
    const arc = ZONE_ARC[zone];
    if (!arc) return;
    list.forEach((it, i) => {
      const t = list.length === 1 ? 0.5 : i / (list.length - 1);
      const a = arc.from + (arc.to - arc.from) * t;
      const pos = new THREE.Vector3(Math.cos(a) * arc.r, 0, Math.sin(a) * arc.r);
      const g = new THREE.Group();
      g.position.copy(pos);
      g.lookAt(0, 0, 0);
      const hit = (BUILDERS[it.id] || buildGeneric)(g, it) || [];
      scene.add(g);
      registerStation(it, g, pos, hit.length ? hit : g.children.filter(c => c.isMesh));
    });
  });
}

function registerStation(item, group, pos, hit) {
  const bus = () => {
    if (!group.userData._bus) group.userData._bus = A.bus(item.zone === 'floor' ? 0.34 : 0.22, [pos.x, 1, pos.z], A.TRIM[item.id] || 1);
    return group.userData._bus;
  };
  const st = { item, group, pos, hit, bus };
  group.userData.station = st;
  hit.forEach(h => (h.userData.station = st));
  stations.push(st);
  labels.push(makeLabel(item, pos, group));
}

function makeLabel(item, pos, group) {
  const cv = document.createElement('canvas'); cv.width = 620; cv.height = 150;
  const x = cv.getContext('2d');
  const round = (a, b, w, h, r) => { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); };
  x.fillStyle = 'rgba(11,6,18,.84)'; round(4, 4, 612, 142, 24); x.fill();
  x.strokeStyle = 'rgba(240,196,100,.55)'; x.lineWidth = 2.5; x.stroke();
  x.fillStyle = '#ffd97a'; x.font = '600 40px ui-sans-serif, system-ui, sans-serif'; x.textAlign = 'left';
  x.fillText(`${item.emoji || '🎵'}  ${item.name.slice(0, 26)}`, 28, 60);
  x.fillStyle = 'rgba(247,236,217,.72)'; x.font = '300 26px ui-sans-serif, system-ui, sans-serif';
  x.fillText(item.spec.slice(0, 44), 30, 100);
  x.fillStyle = '#2dd4bf'; x.font = '600 22px ui-sans-serif, system-ui, sans-serif';
  x.fillText((item.hint || 'click to play').toUpperCase(), 30, 132);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.0, depthTest: false }));
  sp.scale.set(1.5, 0.363, 1);
  sp.position.set(pos.x, 1.78, pos.z);
  sp.renderOrder = 10;
  scene.add(sp);
  return { sp, group, base: 1.78 };
}

/* ── geometry helpers ───────────────────────────────────────────────────── */
const M = {
  black: (r = 0.6) => new THREE.MeshStandardMaterial({ color: 0x15131c, roughness: r, metalness: 0.35 }),
  wood: (c = C.wood, r = 0.75) => new THREE.MeshStandardMaterial({ color: c, roughness: r }),
  metal: (c = C.metal) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.3, metalness: 0.85 }),
  skin: () => new THREE.MeshStandardMaterial({ color: 0xf2e3c8, roughness: 0.85 }),
  paint: (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.35, metalness: 0.2 }),
  glow: (c, i = 1.2) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: i, roughness: 0.4 }),
};
function add(g, geo, mat, [x, y, z], rot) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  if (rot) m.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0);
  m.castShadow = true; g.add(m); return m;
}
function stand(g, h = 0.62, spread = 0.26) {
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const leg = add(g, new THREE.CylinderGeometry(0.018, 0.018, h, 6), M.metal(0x55505c),
      [Math.cos(a) * spread * 0.5, h / 2, Math.sin(a) * spread * 0.5]);
    leg.rotation.z = Math.cos(a) * 0.2; leg.rotation.x = -Math.sin(a) * 0.2;
  }
}
function drumShell(g, r, h, y, col, headCol = 0xf0e6d2) {
  const shell = add(g, new THREE.CylinderGeometry(r, r * 0.97, h, 24), M.wood(col, 0.6), [0, y, 0]);
  add(g, new THREE.CircleGeometry(r * 1.01, 24), new THREE.MeshStandardMaterial({ color: headCol, roughness: 0.65 }), [0, y + h / 2 + 0.002, 0], [-Math.PI / 2, 0, 0]);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    add(g, new THREE.BoxGeometry(0.03, h * 0.9, 0.03), M.metal(), [Math.cos(a) * r * 1.0, y, Math.sin(a) * r * 1.0]);
  }
  return shell;
}

/* ── the 25 builders ────────────────────────────────────────────────────── */
const BUILDERS = {
  drumkit(g) {
    const hit = [];
    add(g, new THREE.BoxGeometry(0.9, 0.05, 0.6), M.black(), [0, 0.02, 0]);
    // pads on a rack
    [[-0.3, 0.72, 0.1, 0.17], [0, 0.78, -0.02, 0.15], [0.3, 0.72, 0.1, 0.15]].forEach(([x, y, z, r]) => {
      const p = add(g, new THREE.CylinderGeometry(r, r, 0.05, 20), M.paint(0x2b2a33), [x, y, z], [0.22, 0, 0]);
      hit.push(p);
    });
    const kick = add(g, new THREE.BoxGeometry(0.42, 0.34, 0.2), M.paint(0x1d1b24), [0, 0.2, 0.3], [0.1, 0, 0]);
    hit.push(kick);
    [[-0.55, 0.92, 0.0], [0.55, 0.9, 0.0]].forEach(([x, y, z]) => {
      const cy = add(g, new THREE.CylinderGeometry(0.22, 0.22, 0.012, 20), M.metal(0xc9a44a), [x, y, z], [0.14, 0, 0.1]);
      hit.push(cy);
    });
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      add(g, new THREE.CylinderGeometry(0.02, 0.02, 0.8, 6), M.metal(0x4a4652), [Math.cos(a) * 0.4, 0.4, Math.sin(a) * 0.3]);
    }
    const mod = add(g, new THREE.BoxGeometry(0.24, 0.12, 0.08), M.glow(C.teal, 0.5), [0.7, 0.78, 0.18], [0.3, 0, 0]);
    hit.push(mod);
    return hit;
  },
  strat(g) {
    stand(g, 0.5);
    const body = add(g, new THREE.BoxGeometry(0.34, 0.46, 0.06), M.paint(0xd94f3d), [0, 0.72, 0], [0, 0, 0.12]);
    body.geometry = new THREE.CapsuleGeometry(0.17, 0.2, 6, 14);
    body.rotation.set(0.04, 0, 0.12);
    const neck = add(g, new THREE.BoxGeometry(0.055, 0.78, 0.04), M.wood(0xc8a16a, 0.5), [0.1, 1.28, 0], [0, 0, 0.12]);
    add(g, new THREE.BoxGeometry(0.1, 0.17, 0.035), M.wood(0x2c1b12, 0.5), [0.2, 1.72, 0], [0, 0, 0.12]);
    for (let i = 0; i < 6; i++) add(g, new THREE.CylinderGeometry(0.002, 0.002, 1.2, 4), M.metal(0xe8e3d8), [0.05 + i * 0.009, 1.1, 0.025], [0, 0, 0.12]);
    add(g, new THREE.BoxGeometry(0.1, 0.03, 0.06), M.metal(0xd8d2c4), [-0.02, 0.66, 0.035], [0, 0, 0.12]);
    return [body, neck];
  },
  twin(g) { return BUILDERS.twinAmp(g); },
  twinreverb(g) { return BUILDERS.twinAmp(g); },
  twinAmp(g) {
    const cab = add(g, new THREE.BoxGeometry(1.0, 0.56, 0.32), M.wood(0x191714, 0.85), [0, 0.5, 0]);
    add(g, new THREE.BoxGeometry(0.92, 0.42, 0.02), new THREE.MeshStandardMaterial({ color: 0xb9a884, roughness: 0.95 }), [0, 0.5, 0.17]);
    [[-0.22], [0.22]].forEach(([x]) => add(g, new THREE.CircleGeometry(0.17, 18), M.paint(0x2a2118), [x, 0.5, 0.175]));
    add(g, new THREE.BoxGeometry(1.0, 0.1, 0.32), M.metal(0xc8b88a), [0, 0.82, 0]);
    for (let i = 0; i < 6; i++) add(g, new THREE.CylinderGeometry(0.015, 0.015, 0.04, 8), M.metal(0x2a2630), [-0.3 + i * 0.12, 0.84, 0.1], [Math.PI / 2, 0, 0]);
    add(g, new THREE.BoxGeometry(1.04, 0.14, 0.36), M.black(0.9), [0, 0.14, 0]);
    const jewel = add(g, new THREE.SphereGeometry(0.02, 8, 8), M.glow(C.rose, 2), [0.42, 0.84, 0.12]);
    return [cab, jewel];
  },
  taylor(g) {
    stand(g, 0.44);
    const body = add(g, new THREE.CapsuleGeometry(0.21, 0.16, 6, 16), M.wood(0x120f14, 0.45), [0, 0.68, 0], [0.04, 0, 0.1]);
    body.scale.z = 0.42;
    add(g, new THREE.TorusGeometry(0.055, 0.008, 8, 20), M.wood(0xd9b06a, 0.4), [0.03, 0.74, 0.09], [Math.PI / 2 + 0.04, 0, 0]);
    const neck = add(g, new THREE.BoxGeometry(0.05, 0.72, 0.04), M.wood(0x3a2a1c, 0.5), [0.09, 1.2, 0], [0, 0, 0.1]);
    add(g, new THREE.BoxGeometry(0.09, 0.16, 0.03), M.wood(0x1c1410, 0.4), [0.17, 1.6, 0], [0, 0, 0.1]);
    return [body, neck];
  },
  bass(g) {
    const cab = add(g, new THREE.BoxGeometry(0.66, 0.66, 0.44), M.black(0.85), [0, 0.38, 0]);
    for (let i = 0; i < 4; i++) {
      const a = [[-0.15, 0.52], [0.15, 0.52], [-0.15, 0.22], [0.15, 0.22]][i];
      add(g, new THREE.CircleGeometry(0.13, 16), M.paint(0x24201c), [a[0], a[1], 0.225]);
    }
    const head = add(g, new THREE.BoxGeometry(0.62, 0.14, 0.4), M.paint(0xe8a22a), [0, 0.79, 0]);
    add(g, new THREE.BoxGeometry(0.4, 0.05, 0.02), M.glow(0x111111, 0), [0, 0.79, 0.21]);
    // the bass itself on a stand beside the cab
    stand(g, 0.42);
    const body = add(g, new THREE.CapsuleGeometry(0.15, 0.2, 6, 14), M.paint(0x2b3d66), [0.6, 0.62, 0.1], [0.04, 0, 0.14]);
    body.scale.z = 0.35;
    add(g, new THREE.BoxGeometry(0.05, 0.9, 0.035), M.wood(0xc8a16a, 0.5), [0.7, 1.18, 0.1], [0, 0, 0.14]);
    return [cab, head, body];
  },
  clp785(g) {
    const legs = add(g, new THREE.BoxGeometry(1.42, 0.06, 0.42), M.wood(0x1a1620, 0.6), [0, 0.6, 0]);
    [[-0.66], [0.66]].forEach(([x]) => add(g, new THREE.BoxGeometry(0.08, 0.6, 0.38), M.wood(0x1a1620, 0.6), [x, 0.3, 0]));
    add(g, new THREE.BoxGeometry(1.3, 0.1, 0.34), M.black(0.5), [0, 0.66, 0]);
    const keys = add(g, new THREE.BoxGeometry(1.22, 0.035, 0.26), new THREE.MeshStandardMaterial({ color: 0xf5f2ea, roughness: 0.4 }), [0, 0.72, 0.03]);
    for (let i = 0; i < 26; i++) add(g, new THREE.BoxGeometry(0.022, 0.03, 0.17), M.black(0.3), [-0.58 + i * 0.047, 0.742, -0.02]);
    add(g, new THREE.BoxGeometry(1.3, 0.22, 0.06), M.wood(0x120f18, 0.5), [0, 0.84, -0.16]);
    return [keys];
  },
  montage(g) {
    stand(g, 0.72, 0.6);
    add(g, new THREE.BoxGeometry(1.1, 0.04, 0.34), M.metal(0x3b3744), [0, 0.74, 0]);
    const body = add(g, new THREE.BoxGeometry(1.06, 0.1, 0.32), M.black(0.4), [0, 0.8, 0]);
    const keys = add(g, new THREE.BoxGeometry(0.98, 0.03, 0.2), new THREE.MeshStandardMaterial({ color: 0xf2efe6, roughness: 0.45 }), [0, 0.855, 0.05]);
    for (let i = 0; i < 22; i++) add(g, new THREE.BoxGeometry(0.02, 0.028, 0.13), M.black(0.3), [-0.46 + i * 0.044, 0.875, 0.01]);
    const screen = add(g, new THREE.BoxGeometry(0.3, 0.015, 0.14), M.glow(0x5fc8ff, 0.7), [0, 0.862, -0.08]);
    for (let i = 0; i < 8; i++) add(g, new THREE.CylinderGeometry(0.014, 0.014, 0.03, 10), M.glow(C.coral, 0.4), [-0.42 + i * 0.07, 0.868, -0.12]);
    return [body, keys, screen];
  },
  impulse(g) {
    stand(g, 0.68, 0.46);
    const body = add(g, new THREE.BoxGeometry(0.72, 0.07, 0.26), M.black(0.45), [0, 0.74, 0]);
    for (let i = 0; i < 16; i++) add(g, new THREE.BoxGeometry(0.03, 0.02, 0.03), M.glow(i % 4 === 0 ? C.rose : C.teal, 0.5), [-0.3 + i * 0.04, 0.78, -0.07]);
    const keys = add(g, new THREE.BoxGeometry(0.64, 0.025, 0.14), new THREE.MeshStandardMaterial({ color: 0xece8de, roughness: 0.5 }), [0, 0.785, 0.06]);
    return [body, keys];
  },
  drummachine(g) {
    stand(g, 0.66, 0.38);
    const body = add(g, new THREE.BoxGeometry(0.44, 0.07, 0.32), M.paint(0x1f2330), [0, 0.72, 0], [0.18, 0, 0]);
    const pads = [];
    for (let i = 0; i < 8; i++) {
      const p = add(g, new THREE.BoxGeometry(0.07, 0.02, 0.07), M.glow(i % 2 ? C.coral : C.gold, 0.45),
        [-0.17 + (i % 4) * 0.115, 0.76 + (i > 3 ? -0.012 : 0.012), (i > 3 ? 0.08 : -0.03)], [0.18, 0, 0]);
      pads.push(p);
    }
    return [body, ...pads];
  },
  djembe(g) {
    const b = add(g, new THREE.CylinderGeometry(0.19, 0.11, 0.62, 20), M.wood(0x8a5a32, 0.8), [0, 0.31, 0]);
    add(g, new THREE.CircleGeometry(0.2, 20), new THREE.MeshStandardMaterial({ color: 0xe6d3b0, roughness: 0.7 }), [0, 0.622, 0], [-Math.PI / 2, 0, 0]);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      add(g, new THREE.CylinderGeometry(0.004, 0.004, 0.5, 4), new THREE.MeshStandardMaterial({ color: 0xd8cbb0 }), [Math.cos(a) * 0.17, 0.4, Math.sin(a) * 0.17], [0.14, 0, 0]);
    }
    return [b];
  },
  cajon(g) {
    const b = add(g, new THREE.BoxGeometry(0.33, 0.48, 0.33), M.wood(0x6b4426, 0.7), [0, 0.24, 0]);
    add(g, new THREE.BoxGeometry(0.3, 0.44, 0.012), new THREE.MeshStandardMaterial({ color: 0xc89a5e, roughness: 0.55 }), [0, 0.24, 0.17]);
    add(g, new THREE.CircleGeometry(0.05, 16), M.black(0.9), [0, 0.24, -0.166]);
    return [b];
  },
  congas(g) {
    const hit = [];
    [[-0.32, 0.165, 0.72], [0, 0.185, 0.78], [0.32, 0.205, 0.84]].forEach(([x, r, h], i) => {
      const s = add(g, new THREE.CylinderGeometry(r, r * 0.74, h, 20), M.paint([0x9c3b2a, 0xb8642c, 0x7d4a9c][i]), [x, h / 2 + 0.16, 0]);
      add(g, new THREE.CircleGeometry(r * 1.02, 20), new THREE.MeshStandardMaterial({ color: 0xead9bb, roughness: 0.65 }), [x, h + 0.163, 0], [-Math.PI / 2, 0, 0]);
      add(g, new THREE.TorusGeometry(r * 1.03, 0.014, 8, 20), M.metal(), [x, h + 0.16, 0], [Math.PI / 2, 0, 0]);
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * Math.PI * 2;
        add(g, new THREE.CylinderGeometry(0.014, 0.014, 0.16, 6), M.metal(0x5a5660), [x + Math.cos(a) * 0.12, 0.08, Math.sin(a) * 0.12], [Math.cos(a) * 0.2, 0, -Math.sin(a) * 0.2]);
      }
      hit.push(s);
    });
    return hit;
  },
  tambourine(g) {
    stand(g, 0.56, 0.3);
    const t = add(g, new THREE.TorusGeometry(0.15, 0.035, 10, 26), M.wood(0x8a6236, 0.7), [0, 0.66, 0], [Math.PI / 2, 0, 0.2]);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      add(g, new THREE.CylinderGeometry(0.025, 0.025, 0.006, 10), M.metal(0xd8c47a), [Math.cos(a) * 0.15, 0.66 + Math.sin(a) * 0.15 * 0.2, Math.sin(a) * 0.02], [Math.PI / 2, 0, 0]);
    }
    // a pair of shakers in a basket
    const basket = add(g, new THREE.CylinderGeometry(0.12, 0.1, 0.1, 14, 1, true), M.wood(0xa37d4a, 0.9), [0.3, 0.06, 0]);
    [0, 1].forEach(i => add(g, new THREE.CapsuleGeometry(0.03, 0.08, 4, 10), M.paint(0xd98c3a), [0.28 + i * 0.06, 0.12, 0], [0.4, 0, 0.3]));
    return [t, basket];
  },
  kartal(g) {
    const rugp = add(g, new THREE.CircleGeometry(0.42, 24), new THREE.MeshStandardMaterial({ color: 0x8c3a24, roughness: 1 }), [0, 0.016, 0], [-Math.PI / 2, 0, 0]);
    const hit = [];
    [[-0.1, 0.1], [0.1, -0.05]].forEach(([x, z], i) => {
      const b = add(g, new THREE.BoxGeometry(0.1, 0.035, 0.3), M.wood(0x9c6b3a, 0.6), [x, 0.035, z], [0, i * 0.5, 0]);
      for (let k = 0; k < 2; k++) add(g, new THREE.CylinderGeometry(0.022, 0.022, 0.005, 10), M.metal(0xd8c47a), [x, 0.058, z - 0.08 + k * 0.16], [0, i * 0.5, 0]);
      hit.push(b);
    });
    return hit.concat([rugp]);
  },
  manjira(g) {
    const hit = [];
    [[-0.07, 0], [0.07, 0.03]].forEach(([x, z]) => {
      const c = add(g, new THREE.SphereGeometry(0.055, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.metal(0xc8a44a), [x, 0.03, z], [Math.PI, 0, 0]);
      hit.push(c);
    });
    add(g, new THREE.CylinderGeometry(0.004, 0.004, 0.14, 6), new THREE.MeshStandardMaterial({ color: 0xb33a4a }), [0, 0.03, 0.02], [0, 0, Math.PI / 2]);
    return hit;
  },
  shruti(g) {
    const b = add(g, new THREE.BoxGeometry(0.42, 0.18, 0.3), M.wood(0x7a4b2a, 0.65), [0, 0.1, 0]);
    add(g, new THREE.BoxGeometry(0.4, 0.02, 0.26), M.wood(0x3a2415, 0.5), [0, 0.2, 0]);
    for (let i = 0; i < 9; i++) add(g, new THREE.BoxGeometry(0.02, 0.012, 0.08), M.metal(0xd8cbb0), [-0.16 + i * 0.04, 0.21, 0.08]);
    const bellows = add(g, new THREE.BoxGeometry(0.4, 0.07, 0.26), M.paint(0x8c2f3a), [0, 0.045, 0]);
    return [b, bellows];
  },
  harmonium(g) {
    const body = add(g, new THREE.BoxGeometry(0.62, 0.3, 0.36), M.wood(0x6b3f22, 0.6), [0, 0.17, 0]);
    add(g, new THREE.BoxGeometry(0.6, 0.03, 0.2), new THREE.MeshStandardMaterial({ color: 0xf2eade, roughness: 0.4 }), [0, 0.33, 0.07]);
    for (let i = 0; i < 14; i++) add(g, new THREE.BoxGeometry(0.014, 0.025, 0.12), M.black(0.3), [-0.26 + i * 0.04, 0.348, 0.03]);
    add(g, new THREE.BoxGeometry(0.6, 0.12, 0.08), M.wood(0x4a2a16, 0.6), [0, 0.3, -0.14]);
    for (let i = 0; i < 7; i++) add(g, new THREE.CylinderGeometry(0.012, 0.012, 0.03, 8), M.metal(0xd8c47a), [-0.22 + i * 0.075, 0.37, -0.14]);
    const bellow = add(g, new THREE.BoxGeometry(0.58, 0.1, 0.3), M.paint(0x8c2f3a), [0, 0.07, -0.02]);
    return [body, bellow];
  },
  tabla(g) {
    const hit = [];
    // dayan (small, right) + bayan (bass, left) on their rings
    [[-0.22, 0.105, 0.3, 0x8a5a32], [0.2, 0.135, 0.26, 0xb08a4a]].forEach(([x, r, h, col], i) => {
      const ring = add(g, new THREE.TorusGeometry(r * 0.95, 0.03, 8, 18), M.wood(0x3a2415, 0.9), [x, 0.03, 0], [Math.PI / 2, 0, 0]);
      const b = add(g, i === 0 ? new THREE.CylinderGeometry(r, r * 0.86, h, 20) : new THREE.SphereGeometry(r, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.62),
        i === 0 ? M.wood(col, 0.6) : M.paint(0x6b5a4a), [x, i === 0 ? h / 2 + 0.05 : 0.06 + r * 0.2, 0], i === 0 ? null : [Math.PI, 0, 0]);
      const head = add(g, new THREE.CircleGeometry(r * 0.98, 22), new THREE.MeshStandardMaterial({ color: 0xeee2c8, roughness: 0.6 }), [x, i === 0 ? h + 0.052 : 0.06 + r * 0.2 + 0.002, 0], [-Math.PI / 2, 0, 0]);
      add(g, new THREE.CircleGeometry(r * 0.42, 18), new THREE.MeshStandardMaterial({ color: 0x15120f, roughness: 0.85 }), [x, (i === 0 ? h + 0.054 : 0.06 + r * 0.2 + 0.004), 0], [-Math.PI / 2, 0, 0]); // the syahi
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2;
        add(g, new THREE.CylinderGeometry(0.003, 0.003, i === 0 ? h * 0.9 : 0.14, 4), new THREE.MeshStandardMaterial({ color: 0xd8cbb0 }),
          [x + Math.cos(a) * r * 0.97, i === 0 ? h / 2 + 0.05 : 0.1, Math.sin(a) * r * 0.97]);
      }
      hit.push(b, head);
    });
    return hit;
  },
  bansuri(g) {
    stand(g, 0.4, 0.2);
    const f = add(g, new THREE.CylinderGeometry(0.019, 0.016, 0.82, 12), M.wood(0xc89a5e, 0.55), [0, 0.5, 0], [0, 0, Math.PI / 2 - 0.25]);
    for (let i = 0; i < 6; i++) add(g, new THREE.CylinderGeometry(0.005, 0.005, 0.04, 8), M.black(0.9), [-0.2 + i * 0.08, 0.5 + (0.2 - i * 0.08) * 0.25, 0.016], [Math.PI / 2, 0, 0]);
    for (let i = 0; i < 3; i++) add(g, new THREE.TorusGeometry(0.021, 0.004, 6, 14), M.metal(0xd8c47a), [-0.3 + i * 0.3, 0.5 + (0.3 - i * 0.3) * 0.25, 0], [0, Math.PI / 2 - 0.25, Math.PI / 2]);
    return [f];
  },
  dhol(g) {
    const b = add(g, new THREE.CylinderGeometry(0.2, 0.2, 0.52, 22), M.wood(0x7d4a22, 0.6), [0, 0.72, 0], [0, 0, Math.PI / 2]);
    [-0.26, 0.26].forEach(x => {
      add(g, new THREE.CircleGeometry(0.2, 22), new THREE.MeshStandardMaterial({ color: x < 0 ? 0xe8dcc0 : 0xd8c9a8, roughness: 0.65 }), [x, 0.72, 0], [0, Math.PI / 2 * Math.sign(x), 0]);
      add(g, new THREE.TorusGeometry(0.2, 0.012, 8, 22), M.metal(), [x, 0.72, 0], [0, Math.PI / 2 * Math.sign(x), 0]);
    });
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      add(g, new THREE.CylinderGeometry(0.003, 0.003, 0.52, 4), new THREE.MeshStandardMaterial({ color: 0xd8cbb0 }), [0, 0.72 + Math.sin(a) * 0.2, Math.cos(a) * 0.2], [0, 0, Math.PI / 2]);
    }
    // strap + stand
    add(g, new THREE.TorusGeometry(0.3, 0.012, 6, 20), M.paint(0xb33a4a), [0, 0.78, 0], [Math.PI / 2, 0.4, 0]);
    add(g, new THREE.CylinderGeometry(0.02, 0.26, 0.46, 10, 1, true), M.metal(0x4a4652), [0, 0.23, 0]);
    // two sticks
    add(g, new THREE.CylinderGeometry(0.008, 0.012, 0.34, 6), M.wood(0xa37d4a, 0.6), [0.1, 1.02, 0.1], [0.4, 0, 0.3]);
    add(g, new THREE.CylinderGeometry(0.006, 0.006, 0.3, 6), M.wood(0xa37d4a, 0.6), [-0.1, 1.02, 0.1], [0.4, 0, -0.3]);
    return [b];
  },
  kanjira(g) {
    stand(g, 0.44, 0.24);
    const fr = add(g, new THREE.CylinderGeometry(0.11, 0.11, 0.07, 20), M.wood(0x8a5a32, 0.7), [0, 0.52, 0], [Math.PI / 2 - 0.3, 0, 0]);
    add(g, new THREE.CircleGeometry(0.105, 20), new THREE.MeshStandardMaterial({ color: 0xd8c9a8, roughness: 0.7 }), [0, 0.52, 0.036], [-0.3, 0, 0]);
    add(g, new THREE.CylinderGeometry(0.028, 0.028, 0.005, 12), M.metal(0xd8c47a), [0.09, 0.52, 0], [Math.PI / 2, 0, 0.2]);
    return [fr];
  },
  dholak(g) {
    const b = add(g, new THREE.CylinderGeometry(0.17, 0.17, 0.54, 20), M.wood(0x6b4426, 0.7), [0, 0.3, 0], [0, 0, Math.PI / 2]);
    [-0.27, 0.27].forEach(x => add(g, new THREE.CircleGeometry(0.17, 20), new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.65 }), [x, 0.3, 0], [0, Math.PI / 2 * Math.sign(x), 0]));
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      add(g, new THREE.CylinderGeometry(0.003, 0.003, 0.54, 4), new THREE.MeshStandardMaterial({ color: 0xd8cbb0 }), [0, 0.3 + Math.sin(a) * 0.17, Math.cos(a) * 0.17], [0, 0, Math.PI / 2]);
    }
    add(g, new THREE.BoxGeometry(0.5, 0.06, 0.3), M.wood(0x3a2415, 0.9), [0, 0.03, 0]);
    return [b];
  },
  cdj(g) {
    // two CDJ-3000 + DJM-A9 on the LED table
    const hit = [];
    [[-0.44, 0], [0.44, 0]].forEach(([x, z]) => {
      const d = add(g, new THREE.BoxGeometry(0.4, 0.07, 0.48), M.black(0.4), [x, 0.97, z]);
      const platter = add(g, new THREE.CylinderGeometry(0.12, 0.12, 0.018, 28), M.metal(0xd8d2c4), [x, 1.012, z - 0.04]);
      add(g, new THREE.CylinderGeometry(0.03, 0.03, 0.022, 20), M.glow(C.coral, 0.8), [x, 1.02, z - 0.04]);
      add(g, new THREE.BoxGeometry(0.2, 0.012, 0.11), M.glow(0x6fd6ff, 0.8), [x, 1.012, z + 0.15]);
      add(g, new THREE.BoxGeometry(0.03, 0.01, 0.12), M.glow(C.gold, 0.6), [x + 0.14, 1.012, z + 0.02]);
      hit.push(d, platter);
    });
    const mixer = add(g, new THREE.BoxGeometry(0.4, 0.08, 0.46), M.black(0.35), [0, 0.975, 0]);
    for (let i = 0; i < 4; i++) {
      add(g, new THREE.BoxGeometry(0.03, 0.012, 0.14), M.metal(0xb9b2a6), [-0.12 + i * 0.08, 1.018, 0.1]);
      for (let k = 0; k < 3; k++) add(g, new THREE.CylinderGeometry(0.012, 0.012, 0.022, 10), M.glow(k === 0 ? C.rose : C.teal, 0.4), [-0.12 + i * 0.08, 1.026, -0.05 - k * 0.055]);
    }
    const xf = add(g, new THREE.BoxGeometry(0.16, 0.012, 0.04), M.metal(0xe8e3d8), [0, 1.02, 0.19]);
    hit.push(mixer, xf);
    return hit;
  },
  ledtable(g) {
    const top = add(g, new THREE.BoxGeometry(1.9, 0.06, 0.72), M.black(0.35), [0, 0.92, 0]);
    [[-0.86], [0.86]].forEach(([x]) => add(g, new THREE.BoxGeometry(0.1, 0.9, 0.66), M.black(0.6), [x, 0.46, 0]));
    const panel = add(g, new THREE.BoxGeometry(1.76, 0.56, 0.04), M.glow(C.violet, 1.0), [0, 0.6, 0.36]);
    const bars = [];
    for (let i = 0; i < 18; i++) {
      const b = add(g, new THREE.BoxGeometry(0.07, 0.4, 0.02), M.glow(i % 3 === 0 ? C.rose : i % 3 === 1 ? C.teal : C.gold, 1.6), [-0.8 + i * 0.094, 0.6, 0.39]);
      bars.push(b); g.userData.bars = bars;
    }
    return [top, panel];
  },
  cables(g) {
    const crate = add(g, new THREE.BoxGeometry(0.8, 0.44, 0.56), M.black(0.8), [0, 0.22, 0]);
    add(g, new THREE.BoxGeometry(0.84, 0.05, 0.6), M.metal(0x6a6472), [0, 0.46, 0]);
    [[-0.4, 0.28], [0.4, 0.28], [-0.4, -0.28], [0.4, -0.28]].forEach(([x, z]) =>
      add(g, new THREE.CylinderGeometry(0.03, 0.03, 0.05, 10), M.metal(0x4a4652), [x, 0.03, z]));
    // coiled cables
    for (let i = 0; i < 4; i++) {
      const col = [0xe86a92, 0x2dd4bf, 0xf0c464, 0xff8a5c][i];
      add(g, new THREE.TorusGeometry(0.12 - i * 0.012, 0.016, 8, 22), new THREE.MeshStandardMaterial({ color: col, roughness: 0.7 }),
        [-0.16 + (i % 2) * 0.32, 0.5 + Math.floor(i / 2) * 0.04, (i % 2 ? 0.1 : -0.1)], [Math.PI / 2 + 0.2, 0.3 * i, 0]);
    }
    const tape = add(g, new THREE.CylinderGeometry(0.07, 0.07, 0.05, 16), M.paint(0x1c1c22), [0.24, 0.52, -0.18], [Math.PI / 2, 0, 0]);
    return [crate, tape];
  },
};
function buildGeneric(g, it) {
  const b = add(g, new THREE.BoxGeometry(0.4, 0.4, 0.4), M.paint(0x6b4a7a), [0, 0.2, 0]);
  return [b];
}

/* ── ops corner: storage, FOH, check-in (rider §1 / §7) ─────────────────── */
function buildOps() {
  const g = new THREE.Group(); g.position.set(-11.5, 0, 7.5); scene.add(g);
  // lockable overnight instrument storage
  const box = add(g, new THREE.BoxGeometry(2.6, 1.5, 1.1), M.black(0.8), [0, 0.75, 0]);
  add(g, new THREE.BoxGeometry(2.64, 0.08, 1.14), M.metal(0x6a6472), [0, 1.52, 0]);
  add(g, new THREE.BoxGeometry(0.12, 0.2, 0.06), M.glow(C.teal, 0.8), [0.9, 0.9, 0.56]);
  signSmall(g, '🔒 OVERNIGHT INSTRUMENT STORAGE', [0, 1.78, 0], 2.4);
  // stage-management / FOH desk
  const d = new THREE.Group(); d.position.set(9.5, 0, 8.4); d.rotation.y = -0.5; scene.add(d);
  add(d, new THREE.BoxGeometry(2.0, 0.07, 0.8), M.wood(0x2a2234, 0.6), [0, 0.78, 0]);
  [[-0.9], [0.9]].forEach(([x]) => add(d, new THREE.BoxGeometry(0.08, 0.78, 0.7), M.black(0.7), [x, 0.39, 0]));
  add(d, new THREE.BoxGeometry(0.7, 0.04, 0.4), M.glow(0x5fc8ff, 0.5), [0, 0.82, 0]);
  add(d, new THREE.BoxGeometry(0.5, 0.3, 0.03), M.glow(0x9fd8e8, 0.35), [0.6, 1.0, -0.2], [0, -0.3, 0]);
  signSmall(d, '🎚️ STAGE MANAGEMENT · FOH', [0, 1.35, 0], 2.0);
}
function signSmall(parent, text, pos, w) {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 64;
  const x = cv.getContext('2d');
  x.fillStyle = 'rgba(247,236,217,.72)'; x.font = '500 30px ui-sans-serif, system-ui, sans-serif'; x.textAlign = 'center';
  x.fillText(text, 256, 42);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 64 / 512), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
  m.position.set(...pos); parent.add(m);
}

/* ── the people: every voice is a node ──────────────────────────────────── */
function buildAudience() {
  const palette = [0xe86a92, 0x2dd4bf, 0xf0c464, 0xff8a5c, 0x9f7fd8, 0x7fd8a0];
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2 + 0.11;
    const r = 4.6 + (i % 3) * 0.75;
    const g = new THREE.Group();
    const col = palette[i % palette.length];
    const mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.85, transparent: true, opacity: 0.5 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.62, 4, 10), mat);
    body.position.y = 0.78; g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), mat);
    head.position.y = 1.32; g.add(head);
    g.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    g.lookAt(0, 1, 0);
    g.userData.ph = Math.random() * 6.28;
    scene.add(g); audience.push(g);
  }
}
function buildDust() {
  const geo = new THREE.BufferGeometry();
  const n = 420, p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    p[i * 3] = (Math.random() - 0.5) * 20;
    p[i * 3 + 1] = Math.random() * 6 + 0.2;
    p[i * 3 + 2] = (Math.random() - 0.5) * 18;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffd9a0, size: 0.035, transparent: true, opacity: 0.5, depthWrite: false }));
  scene.add(pts); dust.push(pts);
}

/* ── interaction ────────────────────────────────────────────────────────── */
function trigger(st, alt = false) {
  A.init();
  const it = st.item;
  const vname = alt && it.altVoice ? it.altVoice : it.voice;
  const fn = A.voices[vname];
  if (!fn) return;
  const b = st.bus();
  const res = A.TOGGLES.has(vname) ? fn(b, it.id + (alt ? '-alt' : '')) : fn(b);
  // visual kick
  st.group.userData.pulse = 1;
  if (it.id === 'ledtable') { ledMood = (ledMood + 1) % 4; }
  const running = res === true;
  if (res === false || res === true) st.group.userData.running = running;
  dispatchEvent(new CustomEvent('oso-played', { detail: { item: it, alt, running: res === true, toggled: typeof res === 'boolean' } }));
}

function panicStop() { A.stopAll(); jamOn = false; if (jamTimer) clearInterval(jamTimer); jamTimer = null; stations.forEach(s => (s.group.userData.running = false)); dispatchEvent(new CustomEvent('oso-stopped')); }

function toggleJam() {
  A.init();
  jamOn = !jamOn;
  const by = id => stations.find(s => s.item.id === id);
  if (jamOn) {
    ['drummachine', 'shruti', 'cdj'].forEach(id => { const s = by(id); if (s && !s.group.userData.running) trigger(s, id === 'cdj'); });
    const perc = ['djembe', 'cajon', 'congas', 'tabla', 'dholak', 'kanjira', 'tambourine', 'manjira', 'kartal'];
    jamTimer = setInterval(() => {
      const s = by(perc[Math.floor(Math.random() * perc.length)]);
      if (s) trigger(s);
      if (Math.random() > 0.78) { const m = by(Math.random() > 0.5 ? 'bansuri' : 'harmonium'); if (m) trigger(m); }
    }, 1500);
  } else {
    panicStop();
  }
  return jamOn;
}

let tour = null;
function startTour(onStep) {
  if (tour) { stopTour(); return false; }
  const order = stations.filter(s => s.item.n).sort((a, b) => a.item.n - b.item.n);
  let i = 0;
  const step = () => {
    const st = order[i % order.length];
    flyToItem(st.item.id);
    setTimeout(() => { if (tour) { trigger(st); onStep && onStep(st.item, i + 1, order.length); } }, 1500);
    i++;
    if (i >= order.length) { tour.last = true; }
  };
  step();
  tour = { iv: setInterval(() => { if (tour && tour.last) { stopTour(); onStep && onStep(null); return; } step(); }, 4200) };
  return true;
}
function stopTour() { if (tour) { clearInterval(tour.iv); tour = null; } }

function pickAt(nx, ny) {
  raycaster.setFromCamera(new THREE.Vector2(nx, ny), camera);
  const hits = raycaster.intersectObjects(stations.flatMap(s => s.hit), true);
  if (!hits.length) return null;
  let o = hits[0].object;
  while (o && !o.userData.station) o = o.parent;
  return o ? o.userData.station : null;
}

function onXRSelect(c) {
  tmpV.set(0, 0, -1).applyQuaternion(c.getWorldQuaternion(new THREE.Quaternion()));
  raycaster.set(c.getWorldPosition(new THREE.Vector3()), tmpV);
  const hits = raycaster.intersectObjects(stations.flatMap(s => s.hit), true);
  if (hits.length) {
    let o = hits[0].object;
    while (o && !o.userData.station) o = o.parent;
    if (o) trigger(o.userData.station);
  }
}

function bindInput(hud) {
  const el = renderer.domElement;
  el.addEventListener('pointerdown', (e) => {
    idleOrbit = false; flyTo = null; stopTour();
    ptr = { down: true, x: e.clientX, y: e.clientY, moved: 0, t: performance.now(), longTimer: null };
    const st = pickAt((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    ptr.item = st;
    if (st && st.item.altVoice) {
      ptr.longTimer = setTimeout(() => { if (ptr.down && ptr.moved < 8) { trigger(st, true); ptr.item = null; } }, 420);
    }
    el.setPointerCapture?.(e.pointerId);
  });
  el.addEventListener('pointermove', (e) => {
    if (ptr.down) {
      const dx = e.clientX - ptr.x, dy = e.clientY - ptr.y;
      ptr.moved += Math.abs(dx) + Math.abs(dy);
      look.yaw -= dx * 0.0042;
      look.pitch = Math.max(-0.8, Math.min(0.6, look.pitch - dy * 0.0034));
      ptr.x = e.clientX; ptr.y = e.clientY;
    } else {
      const st = pickAt((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
      setHover(st);
    }
  });
  const up = () => {
    if (ptr.longTimer) clearTimeout(ptr.longTimer);
    if (ptr.down && ptr.moved < 9 && ptr.item) trigger(ptr.item);
    ptr.down = false; ptr.item = null;
  };
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  el.addEventListener('pointerleave', () => { ptr.down = false; });
  addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) { idleOrbit = false; flyTo = null; }
    if (e.code === 'Space') { e.preventDefault(); const st = pickAt(0, 0); if (st) trigger(st); }
    if (e.code === 'Escape') panicStop();
  });
  addEventListener('keyup', (e) => (keys[e.code] = false));
  // touch d-pad from the HUD
  hud?.pad?.forEach(([btn, code]) => {
    const on = (v) => (e) => { e.preventDefault(); keys[code] = v; idleOrbit = false; flyTo = null; };
    btn.addEventListener('pointerdown', on(true));
    btn.addEventListener('pointerup', on(false));
    btn.addEventListener('pointerleave', on(false));
  });
}

function setHover(st) {
  if (hoverItem === st) return;
  hoverItem = st;
  renderer.domElement.style.cursor = st ? 'pointer' : 'grab';
  dispatchEvent(new CustomEvent('oso-hover', { detail: { item: st ? st.item : null } }));
}

function flyToItem(id) {
  const st = stations.find(s => s.item.id === id);
  if (!st) return;
  idleOrbit = false;
  const dir = st.pos.clone().setY(0).normalize();
  const target = st.pos.clone().add(dir.clone().multiplyScalar(2.9)).setY(0);
  flyTo = { to: target, lookAt: st.pos.clone(), t: 0 };
  selected = st;
}

/* ── loop ───────────────────────────────────────────────────────────────── */
function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  if (qPR) renderer.setPixelRatio(qPR);
  renderer.setSize(innerWidth, innerHeight);
}

let qFrames = 0, qAccum = 0, qStep = 0, qPR = 0, lowQ = false;
function setQuality(low) {
  lowQ = low;
  renderer.shadowMap.enabled = !low;
  renderer.setPixelRatio(low ? Math.min(devicePixelRatio, 1.25) : Math.min(devicePixelRatio, 2));
  spots.forEach(({ s }, i) => { s.visible = !low || i < 2; s.intensity = low ? 20 : 16; });
  dust.forEach(d => (d.visible = !low));
  scene.traverse(o => { if (o.isMesh && low) o.castShadow = false; });
  renderer.setSize(innerWidth, innerHeight);
  dispatchEvent(new CustomEvent('oso-quality', { detail: { low } }));
}

function tick() {
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  // rolling honesty check: measure every 2 s, step the quality down if the room stutters
  qAccum += dt; qFrames++;
  if (qAccum >= 2 && qStep < 2) {
    const fps = qFrames / qAccum;
    if (fps < 22) {
      qStep++;
      if (qStep === 1) setQuality(true);
      else { qPR = 0.62; renderer.setPixelRatio(qPR); renderer.setSize(innerWidth, innerHeight); }
    } else if (qFrames > 40) qStep = 3;   // hardware is fine — stop watching
    qAccum = 0; qFrames = 0;
  } else if (qAccum >= 2) { qAccum = 0; qFrames = 0; }

  // movement
  if (!renderer.xr.isPresenting) {
    const sp = (keys.ShiftLeft || keys.ShiftRight ? 5.2 : 2.6) * dt;
    const f = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
    const s = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
    if (f || s) {
      tmpV.set(Math.sin(look.yaw) * -f + Math.cos(look.yaw) * s, 0, -Math.cos(look.yaw) * f - Math.sin(look.yaw) * s);
      player.position.addScaledVector(tmpV, sp);
    }
    if (flyTo) {
      flyTo.t = Math.min(1, flyTo.t + dt * 0.9);
      const e = flyTo.t < 0.5 ? 2 * flyTo.t * flyTo.t : 1 - Math.pow(-2 * flyTo.t + 2, 2) / 2;
      player.position.lerp(flyTo.to, e * 0.14);
      const want = Math.atan2(-(flyTo.lookAt.x - player.position.x), -(flyTo.lookAt.z - player.position.z));
      let d = ((want - look.yaw + Math.PI) % (Math.PI * 2)) - Math.PI;
      look.yaw += d * 0.08;
      look.pitch += (-0.06 - look.pitch) * 0.06;
      if (flyTo.t >= 1) flyTo = null;
    }
    if (idleOrbit) {
      orbitA += dt * 0.055;
      player.position.set(Math.sin(orbitA) * 9.4, 0, Math.cos(orbitA) * 9.4);
      look.yaw = Math.atan2(-player.position.x, -player.position.z) + Math.PI;
      look.pitch = -0.05 + Math.sin(t * 0.2) * 0.02;
    }
    player.position.x = Math.max(-ROOM.w / 2 + 1.2, Math.min(ROOM.w / 2 - 1.2, player.position.x));
    player.position.z = Math.max(-ROOM.d / 2 + 1.2, Math.min(ROOM.d / 2 - 1.2, player.position.z));
    camera.rotation.order = 'YXZ';
    camera.rotation.set(look.pitch, look.yaw, 0);
  } else {
    // VR locomotion: left stick
    const sess = renderer.xr.getSession();
    if (sess) for (const src of sess.inputSources) {
      const gp = src.gamepad;
      if (!gp || !gp.axes || gp.axes.length < 4) continue;
      const ax = gp.axes[2] || 0, ay = gp.axes[3] || 0;
      if (Math.abs(ax) > 0.15 || Math.abs(ay) > 0.15) {
        const q = new THREE.Quaternion();
        camera.getWorldQuaternion(q);
        tmpV.set(ax, 0, ay).applyQuaternion(q); tmpV.y = 0;
        player.position.addScaledVector(tmpV, dt * 2.6);
      }
    }
  }

  // audio listener follows the head
  camera.getWorldPosition(tmpV);
  camera.getWorldDirection(tmpV2);
  if (A.state.ready) A.listener([tmpV.x, tmpV.y, tmpV.z], [tmpV2.x, tmpV2.y, tmpV2.z]);

  // labels: the two nearest only — eight plaques at once is a wall of text, not a room
  const near = [];
  stations.forEach((st, i) => {
    const d = tmpV.distanceTo(st.pos);
    if (d < 3.6 && d > 1.0) near.push([d, i]);
  });
  near.sort((a, b) => a[0] - b[0]);
  const show = new Set(near.slice(0, 2).map(n => n[1]));
  labels.forEach((l, i) => {
    const st = stations[i];
    const d = tmpV.distanceTo(st.pos);
    const want = (hoverItem === st || selected === st) ? 1
      : st.group.userData.running ? 0.8
      : show.has(i) ? 0.8 : 0;
    l.sp.material.opacity += (want - l.sp.material.opacity) * 0.14;
    l.sp.position.y = l.base + Math.sin(t * 1.3 + i) * 0.02 + (st.group.userData.running ? 0.12 : 0);
    const sc = (1 + (st.group.userData.running ? 0.06 : 0)) * Math.min(1, Math.max(0.55, d / 2.6));
    l.sp.scale.set(1.5 * sc, 0.363 * sc, 1);
  });

  // station pulses + running glow
  stations.forEach(st => {
    const u = st.group.userData;
    if (u.pulse > 0) {
      u.pulse = Math.max(0, u.pulse - dt * 3.4);
      const s = 1 + u.pulse * 0.07;
      st.group.scale.setScalar(s);
    } else if (u.running) {
      st.group.scale.setScalar(1 + Math.sin(t * 6.2) * 0.012);
    } else st.group.scale.setScalar(1);
    st.hit.forEach(h => {
      if (!h.material || !h.material.emissive) return;
      const target = (hoverItem === st ? 0.55 : u.running ? 0.35 : 0);
      if (h.userData._base === undefined) h.userData._base = h.material.emissiveIntensity || 0;
      h.material.emissiveIntensity += (h.userData._base + target - h.material.emissiveIntensity) * 0.15;
      if (hoverItem === st || u.running) h.material.emissive.setHex(hoverItem === st ? 0xffd97a : 0x2dd4bf);
    });
  });

  // LED ring + spots + LED table
  const beat = (Math.sin(t * Math.PI * 2 * (126 / 60) / 2) + 1) / 2;
  ledRing.forEach((l, i) => {
    const ph = (Math.sin(t * 1.6 + l.a * 3) + 1) / 2;
    const c = [C.teal, C.rose, C.gold, C.coral][ledMood];
    l.m.material.emissiveIntensity = 0.7 + ph * 1.5 * (0.6 + beat * 0.6);
    l.m.material.emissive.setHex(c);
    l.m.material.color.setHex(c);
  });
  spots.forEach(({ s, i }) => {
    const a = (i / 4) * Math.PI * 2 + t * 0.12;
    s.position.set(Math.cos(a) * 5.5, 6.4, Math.sin(a) * 5.5);
    s.target.position.set(Math.sin(t * 0.4 + i) * 1.4, 0.3, Math.cos(t * 0.31 + i) * 1.4);
    s.intensity = 10 + beat * 9;
  });
  const lt = stations.find(s => s.item.id === 'ledtable');
  if (lt && lt.group.userData.bars) {
    lt.group.userData.bars.forEach((b, i) => {
      const v = (Math.sin(t * 3 + i * 0.6) + 1) / 2;
      b.material.emissiveIntensity = 0.5 + v * 2.2;
      b.scale.y = 0.4 + v * 0.9;
      if (ledMood) b.material.emissive.setHex([C.teal, C.rose, C.gold, C.coral][(i + ledMood) % 4]);
    });
  }
  // people sway
  audience.forEach((p, i) => {
    p.position.y = Math.abs(Math.sin(t * 1.4 + p.userData.ph)) * 0.035;
    p.rotation.z = Math.sin(t * 1.1 + p.userData.ph) * 0.045;
  });
  dust.forEach(d => { d.rotation.y = t * 0.012; });
  if (scene.userData.halo) {
    const h = scene.userData.halo;
    h.position.y = 4.3 + Math.sin(t * 0.5) * 0.12;
    h.material.opacity = 0.17 + ((Math.sin(t * 0.9) + 1) / 2) * 0.12;
  }

  renderer.render(scene, camera);
}
