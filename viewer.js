import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

const DEFAULT_MODEL_URL = './assets/260408_daymo_motion.glb?v=20260408';
const FLAT_BACKGROUND = new THREE.Color(0x0b0d10);
const DEFAULT_CAMERA_POSITION = new THREE.Vector3(1.8, 2, 3.2);
const LIGHTING_PRESETS = {
  neutral: {
    label: 'Neutral Studio',
    exposure: 0.94,
    hemi: { sky: 0xeaf2ff, ground: 0x13161b, intensity: 0.2 },
    key: { color: 0xffffff, intensity: 2.2, position: [1.6, 2.1, 1.8] },
    fill: { color: 0xc8d9ff, intensity: 0.48, position: [-1.8, 1.3, 2.2] },
    rim: { color: 0xfefefe, intensity: 1.0, position: [-1.2, 2.0, -2.0] },
    shadowOpacity: 0.24,
  },
  beauty: {
    label: 'Beauty Portrait',
    exposure: 0.98,
    hemi: { sky: 0xfff2e4, ground: 0x1c1510, intensity: 0.24 },
    key: { color: 0xfff4ea, intensity: 2.35, position: [1.2, 1.8, 1.9] },
    fill: { color: 0xffdcc7, intensity: 0.72, position: [-1.1, 1.1, 2.4] },
    rim: { color: 0xffffff, intensity: 1.35, position: [-1.5, 2.2, -2.1] },
    shadowOpacity: 0.2,
  },
  dramatic: {
    label: 'Dramatic Rim',
    exposure: 0.92,
    hemi: { sky: 0xa7bbff, ground: 0x090a0d, intensity: 0.1 },
    key: { color: 0xe7edff, intensity: 1.9, position: [2.0, 1.7, 1.1] },
    fill: { color: 0x7d96c7, intensity: 0.14, position: [-1.2, 0.9, 1.7] },
    rim: { color: 0xffffff, intensity: 2.75, position: [-1.8, 2.4, -2.5] },
    shadowOpacity: 0.3,
  },
  outdoor: {
    label: 'Soft Outdoor',
    exposure: 0.96,
    hemi: { sky: 0xcfe6ff, ground: 0x2e261d, intensity: 0.4 },
    key: { color: 0xfff0d8, intensity: 1.55, position: [2.3, 2.8, 1.3] },
    fill: { color: 0xd8ebff, intensity: 0.34, position: [-1.9, 1.2, 2.0] },
    rim: { color: 0xd6e7ff, intensity: 0.56, position: [-2.0, 2.6, -1.8] },
    shadowOpacity: 0.22,
  },
};
const VIEWER_DEFAULTS = {
  lightingPreset: 'neutral',
  environmentPreset: 'studio',
  rigIntensity: 1,
  exposure: LIGHTING_PRESETS.neutral.exposure,
  gamma: 1,
  environmentIntensity: 0.7,
};

const canvas = document.querySelector('#canvas');
const viewport = document.querySelector('#viewport');
const progressEl = document.querySelector('#progress');
const statusEl = document.querySelector('#status');
const bgToggle = document.querySelector('#bgToggle');
const shadowToggle = document.querySelector('#shadowToggle');
const autoRotateToggle = document.querySelector('#autoRotateToggle');
const animationSelect = document.querySelector('#animationSelect');
const animationControl = document.querySelector('#animationControl');
const animationHint = document.querySelector('#animationHint');
const animationSub = document.querySelector('#animationSub');
const toggleAnimationBtn = document.querySelector('#toggleAnimationBtn');
const resetCameraBtn = document.querySelector('#resetCameraBtn');
const clearModelBtn = document.querySelector('#clearModelBtn');
const summaryMeshes = document.querySelector('#summaryMeshes');
const summaryMaterials = document.querySelector('#summaryMaterials');
const summaryTextures = document.querySelector('#summaryTextures');
const summaryVertices = document.querySelector('#summaryVertices');
const summaryFileSize = document.querySelector('#summaryFileSize');
const inspectorEmpty = document.querySelector('#inspectorEmpty');
const textureInspectorList = document.querySelector('#textureInspectorList');
const dropzone = document.querySelector('#dropzone');
const modelInput = document.querySelector('#modelInput');
const hdrInput = document.querySelector('#hdrInput');
const modelFileName = document.querySelector('#modelFileName');
const hdrFileName = document.querySelector('#hdrFileName');
const TEXTURE_SLOTS = [
  ['map', 'Base Color'],
  ['normalMap', 'Normal'],
  ['roughnessMap', 'Roughness'],
  ['metalnessMap', 'Metalness'],
  ['aoMap', 'Ambient Occlusion'],
  ['emissiveMap', 'Emissive'],
  ['alphaMap', 'Alpha'],
  ['transmissionMap', 'Transmission'],
  ['thicknessMap', 'Thickness'],
  ['clearcoatMap', 'Clearcoat'],
  ['clearcoatNormalMap', 'Clearcoat Normal'],
  ['specularColorMap', 'Specular Color'],
  ['sheenColorMap', 'Sheen'],
];
const REPLACEABLE_TEXTURE_SLOTS = new Set(['map', 'emissiveMap']);
const TEXTURE_LABELS = new Map(TEXTURE_SLOTS);
const FACE_SPRITE_TARGET_NAMES = new Set(['face_1', 'face_2', 'face_3']);
const FACE_SPRITE_DEFAULTS = Object.freeze({
  columns: 4,
  rows: 4,
  frameCount: 16,
  expressionFrame: 0,
  blinkFrame: 4,
  fps: 8,
  playbackRow: 0,
  blinkEnabled: false,
});
const GAMMA_SHADER = {
  uniforms: {
    tDiffuse: { value: null },
    gamma: { value: 1.0 },
  },
  vertexShader: `
    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float gamma;
    varying vec2 vUv;

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      float safeGamma = max(gamma, 0.001);
      color.rgb = pow(max(color.rgb, vec3(0.0)), vec3(1.0 / safeGamma));
      gl_FragColor = color;
    }
  `,
};

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setSize(viewport.clientWidth, viewport.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = VIEWER_DEFAULTS.exposure;
renderer.shadowMap.enabled = shadowToggle.checked;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = FLAT_BACKGROUND;

const camera = new THREE.PerspectiveCamera(45, viewport.clientWidth / viewport.clientHeight, 0.1, 1000);
camera.position.copy(DEFAULT_CAMERA_POSITION);

const composer = new EffectComposer(renderer);
composer.setSize(viewport.clientWidth, viewport.clientHeight);
composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const renderPass = new RenderPass(scene, camera);
const gammaPass = new ShaderPass(GAMMA_SHADER);
gammaPass.material.toneMapped = false;
const outputPass = new OutputPass();

composer.addPass(renderPass);
composer.addPass(gammaPass);
composer.addPass(outputPass);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.minDistance = 0.6;
controls.maxDistance = 15;
controls.autoRotate = false;
controls.autoRotateSpeed = 2;
controls.target.set(0, 0.9, 0);
controls.update();

const keyTarget = new THREE.Object3D();
const fillTarget = new THREE.Object3D();
const rimTarget = new THREE.Object3D();
scene.add(keyTarget, fillTarget, rimTarget);

const hemiLight = new THREE.HemisphereLight(0xeaf2ff, 0x13161b, 0.32);
scene.add(hemiLight);

const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
keyLight.castShadow = shadowToggle.checked;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.near = 0.5;
keyLight.shadow.camera.far = 30;
keyLight.shadow.bias = -0.0002;
keyLight.target = keyTarget;
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xc8d9ff, 0.8);
fillLight.target = fillTarget;
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xffffff, 1.15);
rimLight.target = rimTarget;
scene.add(rimLight);

const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.18 }));
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.001;
ground.receiveShadow = true;
ground.visible = shadowToggle.checked;
scene.add(ground);

const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();
const clock = new THREE.Clock();
const gltfLoader = new GLTFLoader();
const rgbeLoader = new RGBELoader();
const exrLoader = new EXRLoader();
const textureLoader = new THREE.TextureLoader();

let mixer = null;
let modelRoot = null;
let envTexture = null;
let studioEnvTexture = null;
let hdrEnvTexture = null;
let currentModelUrl = DEFAULT_MODEL_URL;
let currentModelObjectUrl = null;
let currentHdrObjectUrl = null;
let lastFrame = null;
let currentRigScale = 1.75;
let currentLightingPreset = VIEWER_DEFAULTS.lightingPreset;
let currentEnvironmentPreset = VIEWER_DEFAULTS.environmentPreset;
let currentModelFileSizeBytes = null;
let hasAnimations = false;
let isAnimationPlaying = false;
let animationActions = [];
let animationClips = [];
let currentAnimationIndex = -1;
const textureOverrides = new Map();
const spriteBindings = new Map();
const isFileProtocol = window.location.protocol === 'file:';

const getMaterialName = (material) => material?.name?.trim()?.toLowerCase() ?? '';

const isFaceSpriteTarget = (material, slotKey) => slotKey === 'map' && FACE_SPRITE_TARGET_NAMES.has(getMaterialName(material));

const sanitizeInteger = (value, fallback = 0) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const sanitizeNumber = (value, fallback = 0) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const clampSpriteFrame = (value, frameCount = 1) => {
  const maxFrame = Math.max(1, sanitizeInteger(frameCount, 1));
  return THREE.MathUtils.clamp(sanitizeInteger(value, 0), 0, maxFrame - 1);
};

const randomBetween = (min, max) => {
  const safeMin = sanitizeNumber(min, 0);
  const safeMax = Math.max(safeMin, sanitizeNumber(max, safeMin));
  return safeMin + Math.random() * (safeMax - safeMin);
};

const scheduleNextBlink = (spriteState, now = performance.now() * 0.001) => {
  if (!spriteState) return;

  spriteState.isBlinking = false;
  spriteState.blinkUntil = 0;
  spriteState.nextBlinkAt = now + randomBetween(spriteState.blinkMinDelay, spriteState.blinkMaxDelay);
};

const getSpriteVisibleFrame = (spriteState) => {
  if (!spriteState) return 0;
  if (spriteState.isPlaying) return spriteState.activeFrame;
  if (spriteState.blinkEnabled && spriteState.isBlinking) return spriteState.blinkFrame;
  return spriteState.expressionFrame;
};

const normalizeSpriteState = (spriteState, texture, { now = performance.now() * 0.001 } = {}) => {
  if (!spriteState || !texture) return;

  spriteState.columns = THREE.MathUtils.clamp(sanitizeInteger(spriteState.columns, 4), 1, 16);
  spriteState.rows = THREE.MathUtils.clamp(sanitizeInteger(spriteState.rows, 4), 1, 16);
  spriteState.frameCount = THREE.MathUtils.clamp(
    sanitizeInteger(spriteState.frameCount, spriteState.columns * spriteState.rows),
    1,
    spriteState.columns * spriteState.rows,
  );
  spriteState.expressionFrame = clampSpriteFrame(spriteState.expressionFrame, spriteState.frameCount);
  spriteState.blinkFrame = clampSpriteFrame(spriteState.blinkFrame, spriteState.frameCount);
  spriteState.activeFrame = clampSpriteFrame(spriteState.activeFrame, spriteState.frameCount);
  spriteState.playbackRow = THREE.MathUtils.clamp(
    sanitizeInteger(spriteState.playbackRow, 0),
    0,
    Math.max(0, spriteState.rows - 1),
  );
  spriteState.fps = THREE.MathUtils.clamp(sanitizeNumber(spriteState.fps, 8), 0.25, 60);
  spriteState.blinkMinDelay = Math.max(0.4, sanitizeNumber(spriteState.blinkMinDelay, 2.6));
  spriteState.blinkMaxDelay = Math.max(spriteState.blinkMinDelay, sanitizeNumber(spriteState.blinkMaxDelay, 5.2));
  spriteState.blinkHoldDuration = THREE.MathUtils.clamp(sanitizeNumber(spriteState.blinkHoldDuration, 0.12), 0.04, 0.45);
  spriteState.baseRepeat ??= new THREE.Vector2(1, 1);
  spriteState.baseOffset ??= new THREE.Vector2(0, 0);

  if (!spriteState.isPlaying) {
    spriteState.activeFrame = spriteState.expressionFrame;
    if (!spriteState.blinkEnabled) {
      spriteState.isBlinking = false;
    }
  }

  if (!Number.isFinite(spriteState.nextBlinkAt) || spriteState.nextBlinkAt <= 0) {
    scheduleNextBlink(spriteState, now);
  }
};

const applySpriteFrameToTexture = (texture, spriteState, frameIndex = getSpriteVisibleFrame(spriteState)) => {
  if (!texture || !spriteState) return;

  normalizeSpriteState(spriteState, texture);

  const nextFrame = clampSpriteFrame(frameIndex, spriteState.frameCount);
  const cellWidth = spriteState.baseRepeat.x / spriteState.columns;
  const cellHeight = spriteState.baseRepeat.y / spriteState.rows;
  const col = nextFrame % spriteState.columns;
  const row = Math.floor(nextFrame / spriteState.columns);
  const textureRow = Math.max(0, spriteState.rows - row - 1);
  const insetU = Math.min(cellWidth * 0.002, 0.0015);
  const insetV = Math.min(cellHeight * 0.002, 0.0015);

  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.repeat.set(Math.max(0.00001, cellWidth - insetU * 2), Math.max(0.00001, cellHeight - insetV * 2));
  texture.offset.set(
    spriteState.baseOffset.x + col * cellWidth + insetU,
    spriteState.baseOffset.y + textureRow * cellHeight + insetV,
  );
  texture.needsUpdate = true;

  if (spriteState.displayFrame !== nextFrame) {
    spriteState.displayFrame = nextFrame;
    spriteState.onFrameChange?.();
  }
};

const createSpriteState = (texture, overrides = {}) => {
  const spriteState = {
    columns: FACE_SPRITE_DEFAULTS.columns,
    rows: FACE_SPRITE_DEFAULTS.rows,
    frameCount: FACE_SPRITE_DEFAULTS.frameCount,
    expressionFrame: FACE_SPRITE_DEFAULTS.expressionFrame,
    blinkFrame: FACE_SPRITE_DEFAULTS.blinkFrame,
    activeFrame: FACE_SPRITE_DEFAULTS.expressionFrame,
    displayFrame: -1,
    fps: FACE_SPRITE_DEFAULTS.fps,
    playbackRow: FACE_SPRITE_DEFAULTS.playbackRow,
    playbackCursor: 0,
    playbackAccumulator: 0,
    isPlaying: false,
    blinkEnabled: FACE_SPRITE_DEFAULTS.blinkEnabled,
    isBlinking: false,
    blinkUntil: 0,
    nextBlinkAt: 0,
    blinkMinDelay: 2.6,
    blinkMaxDelay: 5.2,
    blinkHoldDuration: 0.12,
    baseRepeat: new THREE.Vector2(1, 1),
    baseOffset: new THREE.Vector2(0, 0),
    onFrameChange: null,
    ...overrides,
  };

  normalizeSpriteState(spriteState, texture);
  scheduleNextBlink(spriteState);
  return spriteState;
};

const getSpritePlaybackFrames = (spriteState) => {
  if (!spriteState) return [];

  const rowIndex = THREE.MathUtils.clamp(sanitizeInteger(spriteState.playbackRow, 0), 0, spriteState.rows - 1);
  const frames = [];
  for (let col = 0; col < spriteState.columns; col += 1) {
    const frame = rowIndex * spriteState.columns + col;
    if (frame < spriteState.frameCount) {
      frames.push(frame);
    }
  }
  return frames;
};

const primeSpriteRowPlayback = (spriteState) => {
  const frames = getSpritePlaybackFrames(spriteState);
  if (!frames.length) return;

  spriteState.playbackCursor = 0;
  spriteState.playbackAccumulator = 0;
  spriteState.activeFrame = frames[0];
};

const getSpriteBinding = (material, slotKey) => spriteBindings.get(getTextureOverrideKey(material, slotKey)) ?? null;

const bindSpriteState = (material, slotKey, texture, spriteState) => {
  if (!material || !slotKey || !texture || !spriteState) return null;

  const key = getTextureOverrideKey(material, slotKey);
  const existingBinding = spriteBindings.get(key);
  if (existingBinding?.sprite) {
    existingBinding.sprite.onFrameChange = null;
  }

  spriteBindings.set(key, { texture, sprite: spriteState });
  applySpriteFrameToTexture(texture, spriteState);
  return spriteState;
};

const clearSpriteBinding = (material, slotKey) => {
  const key = getTextureOverrideKey(material, slotKey);
  const binding = spriteBindings.get(key);
  if (binding?.sprite) {
    binding.sprite.onFrameChange = null;
  }
  spriteBindings.delete(key);
};

const clearSpriteBindings = () => {
  spriteBindings.forEach((binding) => {
    if (binding?.sprite) {
      binding.sprite.onFrameChange = null;
    }
  });
  spriteBindings.clear();
};

const ensureDefaultFaceSpriteState = (material, slotKey, texture) => {
  if (!isFaceSpriteTarget(material, slotKey) || !texture) return null;

  const key = getTextureOverrideKey(material, slotKey);
  const existingBinding = spriteBindings.get(key);
  if (existingBinding?.texture === texture && existingBinding?.sprite) {
    return existingBinding.sprite;
  }

  const spriteState = createSpriteState(texture);
  bindSpriteState(material, slotKey, texture, spriteState);
  return spriteState;
};

const ensureDefaultFaceSpriteBindings = (root) => {
  if (!root) return;

  root.traverse((child) => {
    if (!child.isMesh || !child.material) return;

    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => {
      if (!material?.map) return;
      ensureDefaultFaceSpriteState(material, 'map', material.map);
    });
  });
};

const stepSpriteAnimations = (delta) => {
  if (!spriteBindings.size) return;

  const now = performance.now() * 0.001;
  spriteBindings.forEach((binding) => {
    const spriteState = binding?.sprite;
    const texture = binding?.texture;
    if (!spriteState || !texture) return;

    normalizeSpriteState(spriteState, texture, { now });

    if (spriteState.isPlaying) {
      const playbackFrames = getSpritePlaybackFrames(spriteState);
      if (!playbackFrames.length) return;

      if (!playbackFrames.includes(spriteState.activeFrame)) {
        primeSpriteRowPlayback(spriteState);
      }

      spriteState.playbackAccumulator += delta * spriteState.fps;
      while (spriteState.playbackAccumulator >= 1) {
        spriteState.playbackCursor = (spriteState.playbackCursor + 1) % playbackFrames.length;
        spriteState.activeFrame = playbackFrames[spriteState.playbackCursor];
        spriteState.playbackAccumulator -= 1;
      }
    } else if (spriteState.blinkEnabled && spriteState.frameCount > 1) {
      if (!spriteState.isBlinking && now >= spriteState.nextBlinkAt) {
        spriteState.isBlinking = true;
        spriteState.blinkUntil = now + spriteState.blinkHoldDuration;
      } else if (spriteState.isBlinking && now >= spriteState.blinkUntil) {
        scheduleNextBlink(spriteState, now);
      }
    }

    applySpriteFrameToTexture(texture, spriteState);
  });
};

const setStatus = (text, isError = false) => {
  statusEl.textContent = text;
  statusEl.classList.toggle('error', isError);
};

const formatNumber = (value = 0) => new Intl.NumberFormat().format(value);

const formatFileSize = (bytes) => {
  if (!Number.isFinite(bytes) || bytes < 0) return '-';

  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  const digits = unitIndex === 0 ? 0 : size >= 100 ? 0 : size >= 10 ? 1 : 2;
  return `${size.toFixed(digits)} ${units[unitIndex]}`;
};

const setGamma = (value = VIEWER_DEFAULTS.gamma) => {
  const safeValue = Math.max(value, 0.01);
  gammaPass.uniforms.gamma.value = safeValue;
  gammaPass.enabled = Math.abs(safeValue - 1) > 0.001;
};

const setInspectorSummary = ({ meshes = 0, materials = 0, textures = 0, vertices = 0, fileSizeBytes = null } = {}) => {
  summaryMeshes.textContent = formatNumber(meshes);
  summaryMaterials.textContent = formatNumber(materials);
  summaryTextures.textContent = formatNumber(textures);
  summaryVertices.textContent = formatNumber(vertices);
  summaryFileSize.textContent = formatFileSize(fileSizeBytes);
};

const getAnimationLabel = (clip, index) => {
  const name = clip?.name?.trim();
  return name ? name : `Animation ${index + 1}`;
};

const getDefaultAnimationIndex = (clips = []) => {
  const tposeIndex = clips.findIndex((clip) => clip?.name?.trim()?.toLowerCase() === 'tpose');
  return tposeIndex >= 0 ? tposeIndex : 0;
};

const syncAnimationMeta = () => {
  const count = animationClips.length;
  const hasClipOptions = count > 0;

  animationControl?.setAttribute('data-state', hasClipOptions ? 'ready' : 'empty');

  if (!hasClipOptions) {
    if (animationHint) animationHint.textContent = 'No clips';
    if (animationSub) animationSub.textContent = 'Load an animated GLB to choose a clip here.';
    return;
  }

  if (animationHint) {
    animationHint.textContent = `${count} clip${count > 1 ? 's' : ''}`;
  }

  const selectedLabel =
    currentAnimationIndex >= 0 ? getAnimationLabel(animationClips[currentAnimationIndex], currentAnimationIndex) : null;

  if (animationSub) {
    animationSub.textContent = selectedLabel
      ? `Open the dropdown to switch clips. Current: ${selectedLabel}.`
      : 'Open the dropdown to switch between loaded animation clips.';
  }
};

const rebuildAnimationOptions = () => {
  animationSelect.replaceChildren();

  if (!animationClips.length) {
    const option = document.createElement('option');
    option.textContent = 'No animations';
    animationSelect.append(option);
    animationSelect.disabled = true;
    animationSelect.selectedIndex = 0;
    syncAnimationMeta();
    return;
  }

  animationClips.forEach((clip, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = getAnimationLabel(clip, index);
    animationSelect.append(option);
  });

  animationSelect.disabled = false;
  animationSelect.value = currentAnimationIndex >= 0 ? String(currentAnimationIndex) : '0';
  syncAnimationMeta();
};

const syncAnimationControl = () => {
  rebuildAnimationOptions();

  if (!hasAnimations || !mixer || currentAnimationIndex < 0) {
    toggleAnimationBtn.disabled = true;
    toggleAnimationBtn.textContent = 'No animation';
    return;
  }

  toggleAnimationBtn.disabled = false;
  toggleAnimationBtn.textContent = isAnimationPlaying ? 'Pause animation' : 'Play animation';
  mixer.timeScale = isAnimationPlaying ? 1 : 0;
};

const setActiveAnimation = (index, { restart = true } = {}) => {
  if (!hasAnimations || !mixer || !animationActions.length) return;
  if (index < 0 || index >= animationActions.length) return;

  animationActions.forEach((action, actionIndex) => {
    if (!action) return;

    if (actionIndex === index) {
      action.enabled = true;
      action.reset();
      action.paused = false;
      action.play();
      if (!restart) {
        action.time = Math.min(action.time, action.getClip().duration);
      }
      return;
    }

    action.stop();
    action.enabled = false;
  });

  currentAnimationIndex = index;
  animationSelect.value = String(index);
  mixer.setTime(0);
  syncAnimationMeta();
  syncAnimationControl();
};

const refreshInspectorSummary = () => {
  if (!modelRoot) {
    setInspectorSummary({ fileSizeBytes: currentModelFileSizeBytes });
    return;
  }

  renderTextureInspector(modelRoot);
};

const resetTextureInspector = (message = 'GLB를 로드하면 여기서 머티리얼별 텍스처를 확인할 수 있습니다.') => {
  setInspectorSummary();
  inspectorEmpty.textContent = message;
  inspectorEmpty.hidden = false;
  textureInspectorList.replaceChildren();
};

const getTextureImage = (texture) => texture?.source?.data ?? texture?.image ?? null;

const getTextureDimensions = (texture) => {
  const image = getTextureImage(texture);
  const width =
    image?.naturalWidth ??
    image?.videoWidth ??
    image?.displayWidth ??
    image?.width ??
    texture?.image?.width;
  const height =
    image?.naturalHeight ??
    image?.videoHeight ??
    image?.displayHeight ??
    image?.height ??
    texture?.image?.height;

  return width && height ? `${width} x ${height}` : 'Unknown size';
};

const getTextureOverrideKey = (material, slotKey) => `${material.uuid}:${slotKey}`;

const copyTextureSettings = (target, source) => {
  if (!target || !source) return;

  target.wrapS = source.wrapS;
  target.wrapT = source.wrapT;
  target.magFilter = source.magFilter;
  target.minFilter = source.minFilter;
  target.anisotropy = source.anisotropy;
  target.rotation = source.rotation;
  target.matrixAutoUpdate = source.matrixAutoUpdate;
  target.offset.copy(source.offset);
  target.repeat.copy(source.repeat);
  target.center.copy(source.center);

  if ('channel' in target && 'channel' in source) {
    target.channel = source.channel;
  }

  if (!target.matrixAutoUpdate) {
    target.matrix.copy(source.matrix);
  } else {
    target.updateMatrix();
  }
};

const configureReplacementTexture = (texture, slotKey, sourceTexture) => {
  copyTextureSettings(texture, sourceTexture);
  texture.flipY = false;
  texture.colorSpace = ['map', 'emissiveMap'].includes(slotKey) ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.needsUpdate = true;
};

const disposeTexture = (texture) => {
  texture?.dispose?.();
};

const disposeMaterialTextures = (material) => {
  if (!material) return;

  const textures = new Set();
  TEXTURE_SLOTS.forEach(([slotKey]) => {
    const texture = material[slotKey];
    if (texture) textures.add(texture);
  });

  textures.forEach((texture) => disposeTexture(texture));
};

const clearTextureOverrides = () => {
  textureOverrides.forEach((record) => {
    if (record.objectUrl) URL.revokeObjectURL(record.objectUrl);
    if (record.replacementTexture && record.replacementTexture !== record.originalTexture) {
      disposeTexture(record.replacementTexture);
    }
  });

  textureOverrides.clear();
};

const replaceMaterialTexture = async (material, slotKey, file) => {
  if (!material || !slotKey || !file || !REPLACEABLE_TEXTURE_SLOTS.has(slotKey)) return;

  const overrideKey = getTextureOverrideKey(material, slotKey);
  const currentTexture = material[slotKey] ?? null;
  const existingRecord = textureOverrides.get(overrideKey);
  const record = existingRecord ?? {
    originalTexture: currentTexture,
    replacementTexture: null,
    objectUrl: null,
    fileName: null,
  };
  const objectUrl = URL.createObjectURL(file);
  const slotLabel = TEXTURE_LABELS.get(slotKey) ?? slotKey;

  try {
    setStatus(`Updating ${material.name || material.type} ${slotLabel}…`);

    const nextTexture = await textureLoader.loadAsync(objectUrl);
    nextTexture.name = file.name;
    configureReplacementTexture(nextTexture, slotKey, currentTexture ?? record.originalTexture);

    material[slotKey] = nextTexture;
    material.needsUpdate = true;

    if (isFaceSpriteTarget(material, slotKey)) {
      bindSpriteState(material, slotKey, nextTexture, createSpriteState(nextTexture));
    } else {
      clearSpriteBinding(material, slotKey);
    }

    if (record.objectUrl) URL.revokeObjectURL(record.objectUrl);
    if (record.replacementTexture && record.replacementTexture !== record.originalTexture) {
      disposeTexture(record.replacementTexture);
    }

    record.replacementTexture = nextTexture;
    record.objectUrl = objectUrl;
    record.fileName = file.name;
    textureOverrides.set(overrideKey, record);

    renderTextureInspector(modelRoot);
    setStatus(`Updated ${material.name || material.type} ${slotLabel}.`);
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    setStatus(`Failed to replace ${slotLabel}: ${error.message}`, true);
    throw error;
  }
};

const resetMaterialTexture = (material, slotKey) => {
  if (!material || !slotKey) return;

  const overrideKey = getTextureOverrideKey(material, slotKey);
  const record = textureOverrides.get(overrideKey);
  if (!record) return;

  material[slotKey] = record.originalTexture ?? null;
  material.needsUpdate = true;

  if (isFaceSpriteTarget(material, slotKey) && record.originalTexture) {
    ensureDefaultFaceSpriteState(material, slotKey, record.originalTexture);
  } else {
    clearSpriteBinding(material, slotKey);
  }

  if (record.objectUrl) URL.revokeObjectURL(record.objectUrl);
  if (record.replacementTexture && record.replacementTexture !== record.originalTexture) {
    disposeTexture(record.replacementTexture);
  }

  textureOverrides.delete(overrideKey);
  renderTextureInspector(modelRoot);

  const slotLabel = TEXTURE_LABELS.get(slotKey) ?? slotKey;
  setStatus(`Restored ${material.name || material.type} ${slotLabel}.`);
};

const drawTexturePreview = (canvas, texture, spriteState = null) => {
  const ctx = canvas.getContext('2d');
  const image = getTextureImage(texture);
  const sourceWidth = image?.naturalWidth ?? image?.videoWidth ?? image?.displayWidth ?? image?.width;
  const sourceHeight = image?.naturalHeight ?? image?.videoHeight ?? image?.displayHeight ?? image?.height;

  if (!ctx || !image || !sourceWidth || !sourceHeight) {
    throw new Error('Missing drawable source');
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (spriteState) {
    normalizeSpriteState(spriteState, texture);
    const previewFrame = getSpriteVisibleFrame(spriteState);
    const cellWidth = sourceWidth / spriteState.columns;
    const cellHeight = sourceHeight / spriteState.rows;
    const col = previewFrame % spriteState.columns;
    const row = Math.floor(previewFrame / spriteState.columns);
    const sx = col * cellWidth;
    const sy = row * cellHeight;
    ctx.drawImage(image, sx, sy, cellWidth, cellHeight, 0, 0, canvas.width, canvas.height);
    return;
  }

  const scale = Math.max(canvas.width / sourceWidth, canvas.height / sourceHeight);
  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;
  const offsetX = (canvas.width - drawWidth) * 0.5;
  const offsetY = (canvas.height - drawHeight) * 0.5;
  ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
};

const createTexturePreview = (texture, spriteState = null) => {
  const thumb = document.createElement('div');
  thumb.className = 'texture-thumb';

  const image = getTextureImage(texture);
  if (!image) {
    const fallback = document.createElement('div');
    fallback.className = 'texture-thumb texture-thumb-fallback';
    fallback.textContent = 'No preview';
    return fallback;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 72;
  canvas.height = 72;

  try {
    drawTexturePreview(canvas, texture, spriteState);
    thumb.append(canvas);
    return {
      element: thumb,
      refresh: () => drawTexturePreview(canvas, texture, spriteState),
    };
  } catch (error) {
    const fallback = document.createElement('div');
    fallback.className = 'texture-thumb texture-thumb-fallback';
    fallback.textContent = texture.isCompressedTexture ? 'Compressed texture' : 'Preview unavailable';
    return {
      element: fallback,
      refresh: () => {},
    };
  }
};

const collectTextureInspectorData = (root) => {
  const materials = new Map();
  const textures = new Set();
  let meshCount = 0;
  let vertexCount = 0;

  root.traverse((child) => {
    if (!child.isMesh) return;

    meshCount += 1;
    vertexCount += child.geometry?.attributes?.position?.count ?? 0;
    const meshMaterials = Array.isArray(child.material) ? child.material : [child.material];

    meshMaterials.forEach((material, materialIndex) => {
      if (!material) return;

      let entry = materials.get(material.uuid);
      if (!entry) {
        entry = {
          uuid: material.uuid,
          materialRef: material,
          name: material.name || `${material.type} ${materials.size + 1}`,
          type: material.type,
          meshes: new Set(),
          slots: [],
          slotKeys: new Set(),
        };
        materials.set(material.uuid, entry);
      }

      entry.meshes.add(child.name || `${child.type} ${meshCount}.${materialIndex + 1}`);

      TEXTURE_SLOTS.forEach(([key, label]) => {
        const texture = material[key];
        if (!texture || entry.slotKeys.has(key)) return;

        entry.slotKeys.add(key);
        entry.slots.push({ key, label, texture });
        textures.add(texture.uuid);
      });
    });
  });

  return {
    meshCount,
    textureCount: textures.size,
    vertexCount,
    materials: [...materials.values()].map((entry) => ({
      ...entry,
      meshes: [...entry.meshes],
    })),
  };
};

const renderTextureInspector = (root) => {
  if (!root) {
    resetTextureInspector('GLB를 로드하면 여기서 머티리얼별 텍스처를 확인할 수 있습니다.');
    return;
  }

  const data = collectTextureInspectorData(root);
  setInspectorSummary({
    meshes: data.meshCount,
    materials: data.materials.length,
    textures: data.textureCount,
    vertices: data.vertexCount,
    fileSizeBytes: currentModelFileSizeBytes,
  });
  textureInspectorList.replaceChildren();

  if (!data.materials.length) {
    inspectorEmpty.textContent = '이 모델에는 읽을 수 있는 머티리얼 정보가 없습니다.';
    inspectorEmpty.hidden = false;
    return;
  }

  inspectorEmpty.hidden = data.textureCount > 0;
  if (!data.textureCount) {
    inspectorEmpty.textContent = '머티리얼은 있지만 텍스처 맵은 연결되어 있지 않습니다.';
  }

  data.materials.forEach((material) => {
    const card = document.createElement('section');
    card.className = 'material-card';

    const head = document.createElement('div');
    head.className = 'material-head';

    const title = document.createElement('div');
    title.className = 'material-title';
    title.textContent = material.name;

    const meta = document.createElement('div');
    meta.className = 'material-meta';
    meta.textContent = `${material.type} · ${material.meshes.length} mesh`;

    const pills = document.createElement('div');
    pills.className = 'pill-row';
    material.meshes.slice(0, 4).forEach((meshName) => {
      const pill = document.createElement('div');
      pill.className = 'pill';
      pill.textContent = meshName;
      pills.append(pill);
    });
    if (material.meshes.length > 4) {
      const pill = document.createElement('div');
      pill.className = 'pill';
      pill.textContent = `+${material.meshes.length - 4} more`;
      pills.append(pill);
    }

    head.append(title, meta, pills);
    card.append(head);

    const textures = document.createElement('div');
    textures.className = 'texture-list';

    if (!material.slots.length) {
      const empty = document.createElement('div');
      empty.className = 'texture-meta';
      empty.textContent = 'No texture slots on this material.';
      textures.append(empty);
    }

    material.slots.forEach(({ key, label, texture }) => {
      const item = document.createElement('article');
      item.className = 'texture-item';

      const spriteState = getSpriteBinding(material.materialRef, key)?.sprite ?? null;
      const { element: preview, refresh: refreshPreview } = createTexturePreview(texture, spriteState);

      const body = document.createElement('div');
      body.className = 'texture-body';
      const slot = document.createElement('div');
      slot.className = 'texture-slot';
      slot.textContent = label;

      const name = document.createElement('div');
      name.className = 'texture-name';
      name.textContent = texture.name || texture.source?.data?.currentSrc || texture.source?.data?.src || texture.uuid;

      const metaInfo = document.createElement('div');
      metaInfo.className = 'texture-meta';
      const metaParts = [
        getTextureDimensions(texture),
        texture.colorSpace === THREE.SRGBColorSpace ? 'sRGB' : 'Linear',
        texture.flipY ? 'FlipY' : 'No FlipY',
      ];
      if (spriteState) {
        metaParts.push(`Sprite ${spriteState.columns} x ${spriteState.rows}`);
        metaParts.push(`Frame ${getSpriteVisibleFrame(spriteState) + 1}/${spriteState.frameCount}`);
      }
      metaInfo.textContent = metaParts.join(' · ');

      body.append(slot, name, metaInfo);

      if (REPLACEABLE_TEXTURE_SLOTS.has(key)) {
        const actionRow = document.createElement('div');
        actionRow.className = 'texture-actions';

        const replaceBtn = document.createElement('button');
        replaceBtn.className = 'texture-action';
        replaceBtn.type = 'button';
        replaceBtn.textContent = spriteState ? 'Swap sprite' : 'Replace';

        const resetBtn = document.createElement('button');
        resetBtn.className = 'texture-action subtle';
        resetBtn.type = 'button';
        resetBtn.textContent = 'Reset';

        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.hidden = true;

        const overrideKey = getTextureOverrideKey(material.materialRef, key);
        const isOverridden = textureOverrides.has(overrideKey);
        resetBtn.disabled = !isOverridden;

        const state = document.createElement('div');
        state.className = 'texture-state';
        state.textContent = spriteState ? (isOverridden ? 'Custom sprite' : 'Sprite active') : isOverridden ? 'Custom override' : 'Original';

        replaceBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', async (event) => {
          const [file] = event.target.files ?? [];
          event.target.value = '';
          if (!file) return;

          try {
            await replaceMaterialTexture(material.materialRef, key, file);
          } catch (error) {
            console.error(error);
          }
        });
        resetBtn.addEventListener('click', () => resetMaterialTexture(material.materialRef, key));

        actionRow.append(replaceBtn, resetBtn, state, fileInput);
        body.append(actionRow);
      }

      if (spriteState) {
        const createNumberField = ({ label: fieldLabel, value, min = 1, max = 16, step = 1 }) => {
          const field = document.createElement('label');
          field.className = 'sprite-field';

          const text = document.createElement('span');
          text.textContent = fieldLabel;

          const input = document.createElement('input');
          input.className = 'sprite-input';
          input.type = 'number';
          input.min = String(min);
          input.max = String(max);
          input.step = String(step);
          input.value = String(value);

          field.append(text, input);
          return { field, input };
        };

        const spritePanel = document.createElement('div');
        spritePanel.className = 'sprite-panel';

        const panelTitle = document.createElement('div');
        panelTitle.className = 'sprite-title';
        panelTitle.textContent = 'Sprite Sheet';

        const panelSub = document.createElement('div');
        panelSub.className = 'sprite-sub';
        panelSub.textContent = 'Frames run left to right, top to bottom. The face layers default to a 4 x 4 grid.';

        const fields = document.createElement('div');
        fields.className = 'sprite-grid';

        const columnsField = createNumberField({ label: 'Cols', value: spriteState.columns, max: 16 });
        const rowsField = createNumberField({ label: 'Rows', value: spriteState.rows, max: 16 });
        const framesField = createNumberField({
          label: 'Frames',
          value: spriteState.frameCount,
          max: spriteState.columns * spriteState.rows,
        });
        const expressionField = createNumberField({
          label: 'Expression',
          value: spriteState.expressionFrame + 1,
          max: spriteState.frameCount,
        });
        const playbackRowField = createNumberField({
          label: 'Play Row',
          value: spriteState.playbackRow + 1,
          max: spriteState.rows,
        });
        const blinkField = createNumberField({
          label: 'Blink',
          value: spriteState.blinkFrame + 1,
          max: spriteState.frameCount,
        });
        const fpsField = createNumberField({ label: 'FPS', value: spriteState.fps, min: 1, max: 60, step: 0.5 });

        fields.append(
          columnsField.field,
          rowsField.field,
          framesField.field,
          expressionField.field,
          playbackRowField.field,
          blinkField.field,
          fpsField.field,
        );

        const spriteControls = document.createElement('div');
        spriteControls.className = 'sprite-controls';

        const blinkToggle = document.createElement('label');
        blinkToggle.className = 'sprite-toggle';
        const blinkCheckbox = document.createElement('input');
        blinkCheckbox.type = 'checkbox';
        blinkCheckbox.checked = spriteState.blinkEnabled;
        const blinkLabel = document.createElement('span');
        blinkLabel.textContent = 'Auto blink';
        blinkToggle.append(blinkCheckbox, blinkLabel);

        const playBtn = document.createElement('button');
        playBtn.className = 'texture-action';
        playBtn.type = 'button';

        const frameState = document.createElement('div');
        frameState.className = 'texture-state';

        const refreshSpritePanel = () => {
          normalizeSpriteState(spriteState, texture);
          columnsField.input.value = String(spriteState.columns);
          rowsField.input.value = String(spriteState.rows);
          framesField.input.max = String(spriteState.columns * spriteState.rows);
          framesField.input.value = String(spriteState.frameCount);
          expressionField.input.max = String(spriteState.frameCount);
          expressionField.input.value = String(spriteState.expressionFrame + 1);
          playbackRowField.input.max = String(spriteState.rows);
          playbackRowField.input.value = String(spriteState.playbackRow + 1);
          blinkField.input.max = String(spriteState.frameCount);
          blinkField.input.value = String(spriteState.blinkFrame + 1);
          fpsField.input.value = String(spriteState.fps);
          blinkCheckbox.checked = spriteState.blinkEnabled;
          playBtn.textContent = spriteState.isPlaying ? 'Pause row' : 'Play row';
          frameState.textContent = `Row ${spriteState.playbackRow + 1} · Frame ${getSpriteVisibleFrame(spriteState) + 1} / ${spriteState.frameCount}`;
          refreshPreview();
        };

        const commitSpriteChanges = () => {
          spriteState.columns = columnsField.input.value;
          spriteState.rows = rowsField.input.value;
          spriteState.frameCount = framesField.input.value;
          spriteState.expressionFrame = Number(expressionField.input.value) - 1;
          spriteState.playbackRow = Number(playbackRowField.input.value) - 1;
          spriteState.blinkFrame = Number(blinkField.input.value) - 1;
          spriteState.fps = fpsField.input.value;
          normalizeSpriteState(spriteState, texture);
          if (spriteState.isPlaying) {
            primeSpriteRowPlayback(spriteState);
          } else {
            spriteState.activeFrame = spriteState.expressionFrame;
          }
          applySpriteFrameToTexture(texture, spriteState);
          refreshSpritePanel();
        };

        [columnsField, rowsField, framesField, expressionField, playbackRowField, blinkField, fpsField].forEach(({ input }) => {
          input.addEventListener('change', commitSpriteChanges);
        });

        blinkCheckbox.addEventListener('change', () => {
          spriteState.blinkEnabled = blinkCheckbox.checked;
          scheduleNextBlink(spriteState);
          applySpriteFrameToTexture(texture, spriteState);
          refreshSpritePanel();
        });

        playBtn.addEventListener('click', () => {
          spriteState.isPlaying = !spriteState.isPlaying;
          spriteState.playbackAccumulator = 0;

          if (spriteState.isPlaying) {
            primeSpriteRowPlayback(spriteState);
          } else {
            spriteState.activeFrame = spriteState.expressionFrame;
            scheduleNextBlink(spriteState);
          }

          applySpriteFrameToTexture(texture, spriteState);
          refreshSpritePanel();
        });

        spriteState.onFrameChange = refreshSpritePanel;
        refreshSpritePanel();

        spriteControls.append(blinkToggle, playBtn, frameState);
        spritePanel.append(panelTitle, panelSub, fields, spriteControls);
        body.append(spritePanel);
      }

      item.append(preview, body);
      textures.append(item);
    });

    card.append(textures);
    textureInspectorList.append(card);
  });
};

const updateProgress = (loaded, total, label = 'Loading…') => {
  if (total > 0) {
    const value = Math.round((loaded / total) * 100);
    progressEl.value = value;
    setStatus(`${label} ${value}%`);
  } else {
    progressEl.removeAttribute('value');
    setStatus(label);
  }
};

const updateLightTargets = (height = 0.9) => {
  keyTarget.position.set(0, height, 0);
  fillTarget.position.set(0, height * 0.9, 0);
  rimTarget.position.set(0, height * 1.05, 0);
};

const updateShadowCamera = () => {
  const extent = Math.max(currentRigScale * 1.75, 2.4);
  keyLight.shadow.camera.left = -extent;
  keyLight.shadow.camera.right = extent;
  keyLight.shadow.camera.top = extent;
  keyLight.shadow.camera.bottom = -extent;
  keyLight.shadow.camera.far = extent * 5;
  keyLight.shadow.camera.updateProjectionMatrix();
};

const applyShadowState = (enabled) => {
  renderer.shadowMap.enabled = enabled;
  keyLight.castShadow = enabled;
  ground.visible = enabled;

  if (!modelRoot) return;

  modelRoot.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = enabled;
    child.receiveShadow = enabled;
  });
};

const positionDirectionalLight = (light, target, config) => {
  const [x, y, z] = config.position;
  light.position.set(x * currentRigScale, y * currentRigScale, z * currentRigScale);
  light.position.add(target.position);
  light.color.setHex(config.color);
  light.intensity = config.intensity * VIEWER_DEFAULTS.rigIntensity;
};

const applyLightingPreset = (presetName = currentLightingPreset, { syncExposure = true } = {}) => {
  const preset = LIGHTING_PRESETS[presetName] ?? LIGHTING_PRESETS.neutral;

  currentLightingPreset = presetName;

  hemiLight.color.setHex(preset.hemi.sky);
  hemiLight.groundColor.setHex(preset.hemi.ground);
  hemiLight.intensity = preset.hemi.intensity * VIEWER_DEFAULTS.rigIntensity;

  positionDirectionalLight(keyLight, keyTarget, preset.key);
  positionDirectionalLight(fillLight, fillTarget, preset.fill);
  positionDirectionalLight(rimLight, rimTarget, preset.rim);

  ground.material.opacity = preset.shadowOpacity;
  updateShadowCamera();
  applyShadowState(shadowToggle.checked);

  if (!syncExposure) return;

  renderer.toneMappingExposure = preset.exposure;
};

const resetCamera = () => {
  if (!lastFrame) {
    camera.position.copy(DEFAULT_CAMERA_POSITION);
    controls.target.set(0, 0.9, 0);
    controls.update();
    return;
  }

  camera.position.copy(lastFrame.position);
  controls.target.copy(lastFrame.target);
  controls.update();
};

const frameModel = (root) => {
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  root.position.sub(center);
  root.position.y += size.y * 0.5;

  const maxSize = Math.max(size.x, size.y, size.z) || 1;
  const fitDistance = maxSize / (2 * Math.tan((Math.PI * camera.fov) / 360));
  const targetHeight = size.y * 0.5;
  const cameraHeightOffset = Math.max(size.y * 0.05, 0.08);

  camera.near = Math.max(maxSize / 100, 0.01);
  camera.far = maxSize * 20;
  camera.updateProjectionMatrix();

  const nextPosition = new THREE.Vector3(0, targetHeight + cameraHeightOffset, fitDistance * 1.8);
  const nextTarget = new THREE.Vector3(0, targetHeight, 0);
  camera.position.copy(nextPosition);
  controls.target.copy(nextTarget);
  controls.update();

  lastFrame = { position: nextPosition.clone(), target: nextTarget.clone() };
  currentRigScale = Math.max(maxSize, 1.35);

  updateLightTargets(targetHeight);
  applyLightingPreset(currentLightingPreset, { syncExposure: false });
};

const clearCurrentModel = ({ preserveFileSize = false } = {}) => {
  if (!preserveFileSize) {
    currentModelFileSizeBytes = null;
  }

  if (!modelRoot) {
    clearSpriteBindings();
    mixer = null;
    hasAnimations = false;
    isAnimationPlaying = false;
    animationActions = [];
    animationClips = [];
    currentAnimationIndex = -1;
    syncAnimationControl();
    return;
  }

  clearSpriteBindings();
  clearTextureOverrides();
  scene.remove(modelRoot);
  modelRoot.traverse((child) => {
    if (child.geometry) child.geometry.dispose?.();
    if (!child.material) return;

    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => {
      disposeMaterialTextures(material);
      material.dispose?.();
    });
  });

  modelRoot = null;
  mixer = null;
  hasAnimations = false;
  isAnimationPlaying = false;
  animationActions = [];
  animationClips = [];
  currentAnimationIndex = -1;
  syncAnimationControl();
  renderTextureInspector(null);
};

const resolveModelFileSize = async (url) => {
  try {
    const headResponse = await fetch(url, { method: 'HEAD' });
    const contentLength = Number(headResponse.headers.get('content-length'));
    if (headResponse.ok && Number.isFinite(contentLength) && contentLength >= 0) {
      return contentLength;
    }
  } catch (error) {
    console.warn('Failed to read model size via HEAD request.', error);
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Unable to read model file size: ${response.status}`);
  }

  const blob = await response.blob();
  return blob.size;
};

const resolveAndApplyModelFileSize = async (url) => {
  try {
    const bytes = await resolveModelFileSize(url);
    if (url !== currentModelUrl) return;

    currentModelFileSizeBytes = bytes;
    refreshInspectorSummary();
  } catch (error) {
    console.warn('Failed to resolve model file size.', error);
  }
};

const setBackgroundState = () => {
  scene.background = bgToggle.checked && envTexture ? envTexture : FLAT_BACKGROUND;
};

const ensureStudioEnvironment = () => {
  if (studioEnvTexture) return studioEnvTexture;

  const room = new RoomEnvironment(renderer);
  studioEnvTexture = pmremGenerator.fromScene(room, 0.04).texture;
  room.dispose?.();
  return studioEnvTexture;
};

const setEnvironmentTexture = (texture) => {
  envTexture = texture;
  scene.environment = envTexture;
  scene.environmentIntensity = VIEWER_DEFAULTS.environmentIntensity;
  setBackgroundState();
};

const applyEnvironmentPreset = (mode = currentEnvironmentPreset, { announce = true } = {}) => {
  currentEnvironmentPreset = mode;

  if (mode === 'none') {
    setEnvironmentTexture(null);
    if (announce) setStatus('Environment disabled.');
    return;
  }

  if (mode === 'hdr-file') {
    if (!hdrEnvTexture) {
      currentEnvironmentPreset = 'studio';
      setEnvironmentTexture(ensureStudioEnvironment());
      if (announce) setStatus('No HDRI loaded yet. Using procedural studio environment.');
      return;
    }

    setEnvironmentTexture(hdrEnvTexture);
    if (announce) setStatus(`Environment updated: ${hdrFileName.textContent}`);
    return;
  }

  setEnvironmentTexture(ensureStudioEnvironment());
  if (announce) setStatus('Procedural studio environment ready.');
};

const loadModel = async (url = currentModelUrl) => {
  clearCurrentModel({ preserveFileSize: true });

  const gltf = await new Promise((resolve, reject) => {
    gltfLoader.load(
      url,
      resolve,
      (event) => {
        if ((!Number.isFinite(currentModelFileSizeBytes) || currentModelFileSizeBytes <= 0) && event.total > 0) {
          currentModelFileSizeBytes = event.total;
        }
        updateProgress(event.loaded, event.total, 'Loading model…');
      },
      reject,
    );
  });

  modelRoot = gltf.scene;
  modelRoot.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = true;
    child.receiveShadow = true;
    child.frustumCulled = true;
    if (child.material) child.material.needsUpdate = true;
  });

  scene.add(modelRoot);
  frameModel(modelRoot);
  applyShadowState(shadowToggle.checked);
  ensureDefaultFaceSpriteBindings(modelRoot);
  renderTextureInspector(modelRoot);

  hasAnimations = Boolean(gltf.animations?.length);
  isAnimationPlaying = false;
  animationClips = gltf.animations ? [...gltf.animations] : [];
  animationActions = [];
  currentAnimationIndex = hasAnimations ? getDefaultAnimationIndex(animationClips) : -1;

  if (hasAnimations) {
    mixer = new THREE.AnimationMixer(modelRoot);
    animationActions = animationClips.map((clip) => {
      const action = mixer.clipAction(clip);
      action.clampWhenFinished = false;
      action.enabled = false;
      return action;
    });
    setActiveAnimation(currentAnimationIndex);
  }

  syncAnimationControl();
};

const bootWithDefaults = async () => {
  resetTextureInspector();
  updateLightTargets();
  applyLightingPreset(currentLightingPreset);
  applyEnvironmentPreset(currentEnvironmentPreset, { announce: false });
  setGamma(VIEWER_DEFAULTS.gamma);

  if (isFileProtocol) {
    currentModelFileSizeBytes = null;
    progressEl.value = 0;
    setStatus('Open this viewer through a local server, or choose a .glb file manually.', true);
    dropzone.classList.remove('hidden');
    modelFileName.textContent = 'none';
    return;
  }

  try {
    await loadModel(DEFAULT_MODEL_URL);
    resolveAndApplyModelFileSize(DEFAULT_MODEL_URL);
    modelFileName.textContent = 'assets/260408_daymo_motion.glb';
    progressEl.value = 100;
    setStatus(`${LIGHTING_PRESETS[currentLightingPreset].label} ready.`);
  } catch (error) {
    console.warn(error);
    currentModelFileSizeBytes = null;
    progressEl.value = 0;
    setStatus('No default GLB found. Drop a model to start.');
    dropzone.classList.remove('hidden');
  }
};

const revokeObjectUrl = (key) => {
  if (key === 'model' && currentModelObjectUrl) {
    URL.revokeObjectURL(currentModelObjectUrl);
    currentModelObjectUrl = null;
  }

  if (key === 'hdr' && currentHdrObjectUrl) {
    URL.revokeObjectURL(currentHdrObjectUrl);
    currentHdrObjectUrl = null;
  }
};

const loadEnvironmentFromFile = async (file) => {
  const extension = file.name.toLowerCase().split('.').pop();
  const loader = extension === 'exr' ? exrLoader : rgbeLoader;

  setStatus(`Loading ${file.name}…`);
  const sourceTexture = await loader.loadAsync(currentHdrObjectUrl);
  const nextEnv = pmremGenerator.fromEquirectangular(sourceTexture).texture;

  hdrEnvTexture?.dispose?.();
  hdrEnvTexture = nextEnv;
  sourceTexture.dispose?.();

  currentEnvironmentPreset = 'hdr-file';
  setEnvironmentTexture(hdrEnvTexture);
};

const handleModelFile = async (file) => {
  if (!file) return;

  revokeObjectUrl('model');
  currentModelObjectUrl = URL.createObjectURL(file);
  currentModelUrl = currentModelObjectUrl;
  currentModelFileSizeBytes = file.size;
  modelFileName.textContent = file.name;

  try {
    await loadModel(currentModelUrl);
    progressEl.value = 100;
    setStatus(`Loaded ${file.name}`);
    dropzone.classList.add('hidden');
  } catch (error) {
    console.error(error);
    currentModelFileSizeBytes = null;
    progressEl.value = 0;
    setStatus(`Failed to load model: ${error.message}`, true);
  }
};

const handleHdrFile = async (file) => {
  if (!file) return;

  revokeObjectUrl('hdr');
  currentHdrObjectUrl = URL.createObjectURL(file);
  hdrFileName.textContent = file.name;

  try {
    await loadEnvironmentFromFile(file);
    setStatus(`Environment updated: ${file.name}`);
  } catch (error) {
    console.error(error);
    setStatus(`Failed to load HDRI: ${error.message}`, true);
  }
};

const handleFiles = async (files) => {
  const list = [...files];
  const model = list.find((file) => file.name.toLowerCase().endsWith('.glb'));
  const hdr = list.find((file) => /\.(hdr|exr)$/i.test(file.name));

  if (hdr) await handleHdrFile(hdr);
  if (model) await handleModelFile(model);
};

const animate = () => {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

  if (mixer) mixer.update(delta);
  stepSpriteAnimations(delta);

  controls.update();
  composer.render();
};

toggleAnimationBtn.addEventListener('click', () => {
  if (!hasAnimations || !mixer) return;

  isAnimationPlaying = !isAnimationPlaying;
  syncAnimationControl();
  setStatus(isAnimationPlaying ? 'Animation playing.' : 'Animation paused.');
});
animationSelect.addEventListener('change', (event) => {
  const nextIndex = Number(event.target.value);
  if (!Number.isInteger(nextIndex)) return;

  isAnimationPlaying = true;
  setActiveAnimation(nextIndex);
  setStatus(`Animation selected: ${getAnimationLabel(animationClips[nextIndex], nextIndex)}.`);
});
bgToggle.addEventListener('change', setBackgroundState);
shadowToggle.addEventListener('change', () => applyShadowState(shadowToggle.checked));
autoRotateToggle.addEventListener('change', () => {
  controls.autoRotate = autoRotateToggle.checked;
});
resetCameraBtn.addEventListener('click', resetCamera);
clearModelBtn.addEventListener('click', () => {
  clearCurrentModel();
  modelFileName.textContent = 'none';
  progressEl.value = 0;
  dropzone.classList.remove('hidden');
  setStatus('Model cleared. Drop another .glb file.');
});
modelInput.addEventListener('change', async (event) => handleModelFile(event.target.files?.[0]));
hdrInput.addEventListener('change', async (event) => handleHdrFile(event.target.files?.[0]));

['dragenter', 'dragover'].forEach((type) => {
  window.addEventListener(type, (event) => {
    event.preventDefault();
    dropzone.classList.add('dragover');
  });
});
['dragleave', 'dragend'].forEach((type) => {
  window.addEventListener(type, () => dropzone.classList.remove('dragover'));
});
window.addEventListener('drop', async (event) => {
  event.preventDefault();
  dropzone.classList.remove('dragover');
  if (event.dataTransfer?.files?.length) await handleFiles(event.dataTransfer.files);
});

dropzone.addEventListener('dragover', (event) => event.preventDefault());
window.addEventListener('resize', () => {
  camera.aspect = viewport.clientWidth / viewport.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(viewport.clientWidth, viewport.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  composer.setSize(viewport.clientWidth, viewport.clientHeight);
  composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

bootWithDefaults();
animate();
