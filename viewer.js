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

const CHARACTER_ASSET_PATH = './assets/260408_daymo_motion.glb';
const CHARACTER_ASSET_LABEL = 'assets/260408_daymo_motion.glb';
const CHARACTER_ASSET_VERSION = '20260408-workbench-1';
const buildCharacterAssetUrl = ({ bustCache = false } = {}) =>
  `${CHARACTER_ASSET_PATH}?v=${bustCache ? `${CHARACTER_ASSET_VERSION}-${Date.now()}` : CHARACTER_ASSET_VERSION}`;
const DEFAULT_FLAT_BACKGROUND = '#0b0d10';
const FLAT_BACKGROUND = new THREE.Color(DEFAULT_FLAT_BACKGROUND);
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
const backgroundSwatches = [...document.querySelectorAll('[data-background-color]')];
const shadowToggle = document.querySelector('#shadowToggle');
const autoRotateToggle = document.querySelector('#autoRotateToggle');
const animationSelect = document.querySelector('#animationSelect');
const animationControl = document.querySelector('#animationControl');
const animationHint = document.querySelector('#animationHint');
const animationSub = document.querySelector('#animationSub');
const toggleAnimationBtn = document.querySelector('#toggleAnimationBtn');
const resetCameraBtn = document.querySelector('#resetCameraBtn');
const reloadCharacterBtn = document.querySelector('#reloadCharacterBtn');
const summaryMeshes = document.querySelector('#summaryMeshes');
const summaryMaterials = document.querySelector('#summaryMaterials');
const summaryTextures = document.querySelector('#summaryTextures');
const summaryVertices = document.querySelector('#summaryVertices');
const summaryFileSize = document.querySelector('#summaryFileSize');
const inspectorEmpty = document.querySelector('#inspectorEmpty');
const textureInspectorList = document.querySelector('#textureInspectorList');
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
const SPRITE_REPLACEABLE_TEXTURE_SLOTS = new Set(['map']);
const INSPECTOR_MATERIAL_ALLOWLIST = new Set(['image', 'face_1', 'face_2', 'face_3']);
const FACE_ASCII_TARGET_NAMES = new Set(['face_2', 'face_3']);
const FACE_SPRITE_TARGET_NAMES = new Set(['face', 'face_1', 'face_2', 'face_3']);
const FACE_OVERLAY_MESH_NAMES = new Set(['face_1', 'face_2', 'face_3']);
const FACE_HIDDEN_BASE_LAYER_NAMES = new Set(['face_1']);
const FACE_OVERLAY_RENDER_ORDER = new Map([
  ['face_1', 20],
  ['face_2', 21],
  ['face_3', 22],
]);
const FACE_SPRITE_DEFAULTS = {
  columns: 4,
  rows: 4,
  frameCount: 16,
  expressionFrame: 0,
  blinkFrame: 4,
};
const FACE_SPRITE_DEFAULTS_BY_MATERIAL = new Map([
  ['face', FACE_SPRITE_DEFAULTS],
  ['face_1', FACE_SPRITE_DEFAULTS],
  ['face_2', { ...FACE_SPRITE_DEFAULTS, expressionFrame: 5 }],
  ['face_3', { ...FACE_SPRITE_DEFAULTS, expressionFrame: 2 }],
]);
const FACE_ASCII_DEFAULTS_BY_MATERIAL = new Map([
  ['face_2', { ...FACE_SPRITE_DEFAULTS, expressionFrame: 5 }],
  ['face_3', { ...FACE_SPRITE_DEFAULTS, expressionFrame: 2 }],
]);
const ASCII_FRAME_LAYOUT = Object.freeze({
  columns: 4,
  rows: 4,
  frameCount: 16,
});
const ASCII_TEXTURE_RENDER = Object.freeze({
  textureSize: 1024,
  gridColumns: 28,
  gridRows: 12,
  fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
});
const ASCII_EYE_BOXES = Object.freeze({
  left: { x: 353, y: 387, width: 70, height: 98 },
  right: { x: 602, y: 387, width: 70, height: 98 },
  mouth: { x: 465, y: 459, width: 100, height: 20 },
});
const ASCII_EYE_ROW_ANCHORS = Object.freeze({
  brow: 0.18,
  accent: 0.34,
  eyeTop: 0.54,
  eyeBottom: 0.74,
  mouth: 0.5,
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
let currentModelUrl = buildCharacterAssetUrl();
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
const asciiBindings = new Map();
const isFileProtocol = window.location.protocol === 'file:';

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

const getFlatBackgroundHex = () => `#${FLAT_BACKGROUND.getHexString()}`;

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
    if (animationSub) animationSub.textContent = 'The current character asset has no animation clips.';
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

const resetTextureInspector = (message = 'Character asset details will appear here once the workbench finishes loading.') => {
  setInspectorSummary();
  inspectorEmpty.textContent = message;
  inspectorEmpty.hidden = false;
  textureInspectorList.replaceChildren();
};

const getTextureImage = (texture) => texture?.source?.data ?? texture?.image ?? null;

const getTextureImageSize = (texture) => {
  const image = getTextureImage(texture);

  return {
    width:
      image?.naturalWidth ??
      image?.videoWidth ??
      image?.displayWidth ??
      image?.width ??
      texture?.image?.width ??
      0,
    height:
      image?.naturalHeight ??
      image?.videoHeight ??
      image?.displayHeight ??
      image?.height ??
      texture?.image?.height ??
      0,
  };
};

const getTextureDimensions = (texture) => {
  const { width, height } = getTextureImageSize(texture);

  return width && height ? `${width} x ${height}` : 'Unknown size';
};

const getTextureOverrideKey = (material, slotKey) => `${material.uuid}:${slotKey}`;
const getTextureOverrideRecord = (material, slotKey) => textureOverrides.get(getTextureOverrideKey(material, slotKey)) ?? null;
const getSpriteBinding = (material, slotKey) => spriteBindings.get(getTextureOverrideKey(material, slotKey)) ?? null;
const getAsciiBinding = (material, slotKey) => asciiBindings.get(getTextureOverrideKey(material, slotKey)) ?? null;
const shouldShowMaterialInInspector = (materialName = '') => INSPECTOR_MATERIAL_ALLOWLIST.has(materialName.trim().toLowerCase());
const isFaceOverlayMesh = (mesh) => FACE_OVERLAY_MESH_NAMES.has(mesh?.name?.trim()?.toLowerCase());
const shouldHideFaceBaseLayer = (mesh) => FACE_HIDDEN_BASE_LAYER_NAMES.has(mesh?.name?.trim()?.toLowerCase());
const isFaceAsciiTarget = (material, slotKey) => {
  const name = material?.name?.trim()?.toLowerCase();
  return slotKey === 'map' && FACE_ASCII_TARGET_NAMES.has(name);
};
const isFaceSpriteTarget = (material, slotKey) => {
  const name = material?.name?.trim()?.toLowerCase();
  return slotKey === 'map' && FACE_SPRITE_TARGET_NAMES.has(name);
};
const getFaceSpriteDefaults = (material) => {
  const name = material?.name?.trim()?.toLowerCase() ?? '';
  return FACE_SPRITE_DEFAULTS_BY_MATERIAL.get(name) ?? FACE_SPRITE_DEFAULTS;
};
const getFaceAsciiDefaults = (material) => {
  const name = material?.name?.trim()?.toLowerCase() ?? '';
  return FACE_ASCII_DEFAULTS_BY_MATERIAL.get(name) ?? FACE_SPRITE_DEFAULTS;
};
const sanitizeInteger = (value, fallback = 1) => {
  const nextValue = Math.floor(Number(value));
  return Number.isFinite(nextValue) && nextValue > 0 ? nextValue : fallback;
};
const sanitizeNumber = (value, fallback = 1) => {
  const nextValue = Number(value);
  return Number.isFinite(nextValue) && nextValue > 0 ? nextValue : fallback;
};
const clampSpriteFrame = (frame, frameCount = 1) => {
  const safeFrameCount = Math.max(1, sanitizeInteger(frameCount, 1));
  const nextFrame = Math.floor(Number(frame));
  return THREE.MathUtils.clamp(Number.isFinite(nextFrame) ? nextFrame : 0, 0, safeFrameCount - 1);
};
const randomBetween = (min, max) => min + Math.random() * Math.max(0, max - min);

const guessSpriteGrid = (texture) => {
  const { width, height } = getTextureImageSize(texture);
  if (!width || !height) return { columns: 1, rows: 1 };

  const horizontalRatio = width / height;
  const verticalRatio = height / width;
  const roundedHorizontal = Math.round(horizontalRatio);
  const roundedVertical = Math.round(verticalRatio);

  if (roundedHorizontal > 1 && roundedHorizontal <= 16 && Math.abs(horizontalRatio - roundedHorizontal) < 0.04) {
    return { columns: roundedHorizontal, rows: 1 };
  }

  if (roundedVertical > 1 && roundedVertical <= 16 && Math.abs(verticalRatio - roundedVertical) < 0.04) {
    return { columns: 1, rows: roundedVertical };
  }

  return { columns: 1, rows: 1 };
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

  spriteState.columns = sanitizeInteger(spriteState.columns, 1);
  spriteState.rows = sanitizeInteger(spriteState.rows, 1);
  spriteState.frameCount = THREE.MathUtils.clamp(
    sanitizeInteger(spriteState.frameCount, spriteState.columns * spriteState.rows),
    1,
    spriteState.columns * spriteState.rows,
  );
  spriteState.expressionFrame = clampSpriteFrame(spriteState.expressionFrame, spriteState.frameCount);
  spriteState.blinkFrame = clampSpriteFrame(spriteState.blinkFrame, spriteState.frameCount);
  spriteState.activeFrame = clampSpriteFrame(spriteState.activeFrame, spriteState.frameCount);
  spriteState.fps = THREE.MathUtils.clamp(sanitizeNumber(spriteState.fps, 8), 0.25, 60);
  spriteState.blinkMinDelay = Math.max(0.4, sanitizeNumber(spriteState.blinkMinDelay, 2.6));
  spriteState.blinkMaxDelay = Math.max(spriteState.blinkMinDelay, sanitizeNumber(spriteState.blinkMaxDelay, 5.2));
  spriteState.blinkHoldDuration = THREE.MathUtils.clamp(sanitizeNumber(spriteState.blinkHoldDuration, 0.12), 0.04, 0.45);
  spriteState.baseRepeat ??= texture.repeat.clone();
  spriteState.baseOffset ??= texture.offset.clone();

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

const applyTextureTransform = (texture, repeatX, repeatY, offsetX, offsetY) => {
  if (!texture) return;

  texture.repeat.set(repeatX, repeatY);
  texture.offset.set(offsetX, offsetY);

  if (!texture.matrixAutoUpdate) {
    texture.updateMatrix();
  }

  texture.needsUpdate = true;
};

const resetTextureTransformForSprite = (texture) => {
  if (!texture) return;

  texture.rotation = 0;
  texture.center.set(0, 0);
  texture.matrixAutoUpdate = true;
  applyTextureTransform(texture, 1, 1, 0, 0);
};

const createAsciiGrid = () =>
  Array.from({ length: ASCII_TEXTURE_RENDER.gridRows }, () =>
    Array.from({ length: ASCII_TEXTURE_RENDER.gridColumns }, () => ' '),
  );

const stampAsciiText = (grid, x, y, text = '') => {
  if (!Array.isArray(grid) || !text) return;
  const row = grid[y];
  if (!row) return;

  [...text].forEach((char, index) => {
    const targetX = x + index;
    if (targetX < 0 || targetX >= row.length) return;
    row[targetX] = char;
  });
};

const asciiGridToString = (grid) => grid.map((row) => row.join('')).join('\n');

const getAsciiFramePreset = (frameIndex) => {
  const presets = [
    { brow: 'neutral', eye: 'open', pupil: 'round' },
    { brow: 'soft', eye: 'smile', pupil: 'soft' },
    { brow: 'angry', eye: 'open', pupil: 'small' },
    { brow: 'sad', eye: 'open', pupil: 'round-low' },
    { brow: 'neutral', eye: 'closed', pupil: 'none' },
    { brow: 'neutral', eye: 'wink-left', pupil: 'round' },
    { brow: 'neutral', eye: 'wide', pupil: 'tiny' },
    { brow: 'neutral', eye: 'squint', pupil: 'tiny' },
    { brow: 'neutral', eye: 'rest', pupil: 'small' },
    { brow: 'neutral', eye: 'wide', pupil: 'wide' },
    { brow: 'soft', eye: 'smile', pupil: 'small' },
    { brow: 'neutral', eye: 'round', pupil: 'wide' },
    { brow: 'neutral', eye: 'round-small', pupil: 'small' },
    { brow: 'neutral', eye: 'rest', pupil: 'tiny' },
    { brow: 'flat', eye: 'half', pupil: 'small' },
    { brow: 'surprised', eye: 'wide', pupil: 'wide' },
  ];

  return presets[clampSpriteFrame(frameIndex, presets.length)] ?? presets[0];
};

const getAsciiBrowPattern = (style, side) => {
  switch (style) {
    case 'soft':
      return side === 'left' ? '  __/ ' : ' \\__  ';
    case 'angry':
      return side === 'left' ? '   __\\' : '/__   ';
    case 'sad':
      return side === 'left' ? ' /__  ' : '  __\\ ';
    case 'surprised':
      return '  --  ';
    case 'flat':
      return ' ---- ';
    default:
      return ' ____ ';
  }
};

const getAsciiEyePattern = (style, side) => {
  const open = [' /--\\ ', ' \\__/ '];

  switch (style) {
    case 'smile':
      return [' \\__/ ', '      '];
    case 'closed':
      return [' ---- ', '      '];
    case 'squint':
      return [' =--= ', '      '];
    case 'wide':
      return [' /~~\\ ', ' \\__/ '];
    case 'rest':
      return [' /==\\ ', ' \\__/ '];
    case 'half':
      return [' /--\\ ', '  --  '];
    case 'round':
      return [' /~~\\ ', ' \\~~/ '];
    case 'round-small':
      return [' /==\\ ', ' \\==/ '];
    case 'wink-left':
      return side === 'left' ? [' ---- ', '      '] : open;
    default:
      return open;
  }
};

const getAsciiPupilPattern = (style, side, frameIndex) => {
  const isWinkClosedEye = style !== 'none' && getAsciiFramePreset(frameIndex).eye === 'wink-left' && side === 'left';
  if (isWinkClosedEye) return ['      ', '      '];

  switch (style) {
    case 'soft':
      return ['  ,,  ', '      '];
    case 'small':
      return ['  ..  ', '      '];
    case 'tiny':
      return ['   .  ', '      '];
    case 'wide':
      return ['  OO  ', '      '];
    case 'round-low':
      return ['      ', '  oo  '];
    case 'none':
      return ['      ', '      '];
    default:
      return ['  oo  ', '      '];
  }
};

const getAsciiMouthPattern = (frameIndex) => {
  const patterns = [
    '  __  ',
    '  ..  ',
    ' (__) ',
    '  --  ',
    '  ==  ',
    ' <__> ',
    ' (__) ',
    '  --  ',
    '  ah  ',
    ' /__\\ ',
    '  se  ',
    '  ==  ',
    '  oo  ',
    '  OO  ',
    '  --  ',
    '  __  ',
  ];

  return patterns[clampSpriteFrame(frameIndex, patterns.length)] ?? patterns[0];
};

const createAsciiFrameSegments = (material, frameIndex) => {
  const materialName = material?.name?.trim()?.toLowerCase() ?? '';
  const layerType = materialName === 'face_2' ? 'eyes' : 'mouth';
  const preset = getAsciiFramePreset(frameIndex);
  const segments = [];

  const pushSegment = (boxKey, row, text, offsetX = 0) => {
    if (!text || !text.trim()) return;
    segments.push({ boxKey, row, text, offsetX });
  };

  if (layerType === 'eyes') {
    pushSegment('left', 'brow', getAsciiBrowPattern(preset.brow, 'left'));
    pushSegment('right', 'brow', getAsciiBrowPattern(preset.brow, 'right'));

    const leftEye = getAsciiEyePattern(preset.eye, 'left');
    const rightEye = getAsciiEyePattern(preset.eye, 'right');
    pushSegment('left', 'eyeTop', leftEye[0]);
    pushSegment('left', 'eyeBottom', leftEye[1]);
    pushSegment('right', 'eyeTop', rightEye[0]);
    pushSegment('right', 'eyeBottom', rightEye[1]);

    const leftPupil = getAsciiPupilPattern(preset.pupil, 'left', frameIndex);
    const rightPupil = getAsciiPupilPattern(preset.pupil, 'right', frameIndex);
    pushSegment('left', 'eyeTop', leftPupil[0]);
    pushSegment('left', 'eyeBottom', leftPupil[1]);
    pushSegment('right', 'eyeTop', rightPupil[0]);
    pushSegment('right', 'eyeBottom', rightPupil[1]);

    if (preset.eye === 'wide') {
      pushSegment('left', 'accent', '.', -0.14);
      pushSegment('right', 'accent', '.', -0.14);
    }
  } else {
    pushSegment('mouth', 'mouth', getAsciiMouthPattern(frameIndex));
  }

  return segments;
};

const createAsciiFrameString = (material, frameIndex) => {
  const materialName = material?.name?.trim()?.toLowerCase() ?? '';
  const layerType = materialName === 'face_2' ? 'eyes' : 'mouth';
  const preset = getAsciiFramePreset(frameIndex);
  const grid = createAsciiGrid();
  const leftX = 4;
  const rightX = 18;
  const browY = 2;
  const eyeTopY = 5;
  const eyeBottomY = 6;
  const mouthX = 10;
  const mouthY = 9;

  if (layerType === 'eyes') {
    stampAsciiText(grid, leftX, browY, getAsciiBrowPattern(preset.brow, 'left'));
    stampAsciiText(grid, rightX, browY, getAsciiBrowPattern(preset.brow, 'right'));

    const leftEye = getAsciiEyePattern(preset.eye, 'left');
    const rightEye = getAsciiEyePattern(preset.eye, 'right');
    stampAsciiText(grid, leftX, eyeTopY, leftEye[0]);
    stampAsciiText(grid, leftX, eyeBottomY, leftEye[1]);
    stampAsciiText(grid, rightX, eyeTopY, rightEye[0]);
    stampAsciiText(grid, rightX, eyeBottomY, rightEye[1]);

    const leftPupil = getAsciiPupilPattern(preset.pupil, 'left', frameIndex);
    const rightPupil = getAsciiPupilPattern(preset.pupil, 'right', frameIndex);
    stampAsciiText(grid, leftX, eyeTopY, leftPupil[0]);
    stampAsciiText(grid, leftX, eyeBottomY, leftPupil[1]);
    stampAsciiText(grid, rightX, eyeTopY, rightPupil[0]);
    stampAsciiText(grid, rightX, eyeBottomY, rightPupil[1]);

    if (preset.eye === 'wide') {
      stampAsciiText(grid, leftX + 1, eyeTopY - 1, '.');
      stampAsciiText(grid, rightX + 1, eyeTopY - 1, '.');
    }
  } else {
    stampAsciiText(grid, mouthX, mouthY, getAsciiMouthPattern(frameIndex));
  }

  return asciiGridToString(grid);
};

const deriveAsciiForegroundColor = (texture, { brightness = 0.86, fallback = 'rgb(18, 24, 30)' } = {}) => {
  const image = getTextureImage(texture);
  if (!image) return fallback;

  const sampleCanvas = document.createElement('canvas');
  sampleCanvas.width = 32;
  sampleCanvas.height = 32;

  const context = sampleCanvas.getContext('2d', { willReadFrequently: true });
  if (!context) return fallback;

  try {
    context.clearRect(0, 0, sampleCanvas.width, sampleCanvas.height);
    context.drawImage(image, 0, 0, sampleCanvas.width, sampleCanvas.height);
    const { data } = context.getImageData(0, 0, sampleCanvas.width, sampleCanvas.height);

    let totalWeight = 0;
    let red = 0;
    let green = 0;
    let blue = 0;

    for (let index = 0; index < data.length; index += 4) {
      const alpha = data[index + 3] / 255;
      if (alpha < 0.08) continue;

      const luminance = (data[index] + data[index + 1] + data[index + 2]) / 3;
      const weight = alpha * (1.2 + ((255 - luminance) / 255) * 2.4);
      totalWeight += weight;
      red += data[index] * weight;
      green += data[index + 1] * weight;
      blue += data[index + 2] * weight;
    }

    if (totalWeight <= Number.EPSILON) return fallback;

    const toChannel = (value) => THREE.MathUtils.clamp(Math.round((value / totalWeight) * brightness), 0, 255);
    return `rgb(${toChannel(red)}, ${toChannel(green)}, ${toChannel(blue)})`;
  } catch (error) {
    console.warn('Failed to sample ASCII foreground color.', error);
    return fallback;
  }
};

const getAsciiVisibleFrame = (asciiState) => {
  if (!asciiState) return 0;
  if (asciiState.isPlaying) return asciiState.activeFrame;
  if (asciiState.blinkEnabled && asciiState.isBlinking) return asciiState.blinkFrame;
  return asciiState.expressionFrame;
};

const normalizeAsciiState = (asciiState, { now = performance.now() * 0.001 } = {}) => {
  if (!asciiState) return;

  asciiState.columns = ASCII_FRAME_LAYOUT.columns;
  asciiState.rows = ASCII_FRAME_LAYOUT.rows;
  asciiState.gridColumns = ASCII_TEXTURE_RENDER.gridColumns;
  asciiState.gridRows = ASCII_TEXTURE_RENDER.gridRows;
  asciiState.frameCount = THREE.MathUtils.clamp(
    sanitizeInteger(asciiState.frameCount, ASCII_FRAME_LAYOUT.frameCount),
    1,
    asciiState.columns * asciiState.rows,
  );
  asciiState.expressionFrame = clampSpriteFrame(asciiState.expressionFrame, asciiState.frameCount);
  asciiState.blinkFrame = clampSpriteFrame(asciiState.blinkFrame, asciiState.frameCount);
  asciiState.activeFrame = clampSpriteFrame(asciiState.activeFrame, asciiState.frameCount);
  asciiState.fps = THREE.MathUtils.clamp(sanitizeNumber(asciiState.fps, 8), 0.25, 60);
  asciiState.blinkMinDelay = Math.max(0.4, sanitizeNumber(asciiState.blinkMinDelay, 2.6));
  asciiState.blinkMaxDelay = Math.max(asciiState.blinkMinDelay, sanitizeNumber(asciiState.blinkMaxDelay, 5.2));
  asciiState.blinkHoldDuration = THREE.MathUtils.clamp(sanitizeNumber(asciiState.blinkHoldDuration, 0.12), 0.04, 0.45);
  asciiState.playbackRow = THREE.MathUtils.clamp(
    sanitizeInteger(asciiState.playbackRow + 1, 1) - 1,
    0,
    Math.max(0, asciiState.rows - 1),
  );
  asciiState.playbackMode = asciiState.playbackMode === 'sequence' ? 'sequence' : 'row';

  if (!asciiState.isPlaying) {
    asciiState.activeFrame = asciiState.expressionFrame;
    if (!asciiState.blinkEnabled) {
      asciiState.isBlinking = false;
    }
  }

  if (!Number.isFinite(asciiState.nextBlinkAt) || asciiState.nextBlinkAt <= 0) {
    scheduleNextBlink(asciiState, now);
  }
};

const getAsciiPlaybackFrames = (asciiState) => {
  if (!asciiState) return [];

  if (asciiState.playbackMode === 'sequence') {
    return Array.from({ length: asciiState.frameCount }, (_, index) => index);
  }

  const rowIndex = THREE.MathUtils.clamp(sanitizeInteger(asciiState.playbackRow + 1, 1) - 1, 0, asciiState.rows - 1);
  const frames = [];

  for (let col = 0; col < asciiState.columns; col += 1) {
    const frame = rowIndex * asciiState.columns + col;
    if (frame < asciiState.frameCount) {
      frames.push(frame);
    }
  }

  return frames;
};

const primeAsciiRowPlayback = (asciiState) => {
  const frames = getAsciiPlaybackFrames(asciiState);
  if (!frames.length) return;

  asciiState.playbackCursor = 0;
  asciiState.activeFrame = frames[0];
};

const drawAsciiSegment = (context, asciiState, segment) => {
  const box = ASCII_EYE_BOXES[segment.boxKey];
  if (!box) return;

  const anchorY = ASCII_EYE_ROW_ANCHORS[segment.row] ?? ASCII_EYE_ROW_ANCHORS.eyeTop;
  const glyphCount = Math.max(1, [...segment.text].length);
  const widthScale =
    segment.row === 'mouth' ? 0.96 : segment.row === 'accent' ? 0.22 : segment.row === 'brow' ? 0.98 : 1.04;
  const heightScale =
    segment.row === 'mouth'
      ? 0.72
      : segment.row === 'brow'
        ? 0.18
        : segment.row === 'accent'
          ? 0.13
          : segment.row === 'eyeBottom'
            ? 0.22
            : 0.24;
  const fontSize = Math.min(
    (box.width * widthScale) / (glyphCount * 0.62),
    box.height * heightScale,
  );
  const x = box.x + box.width * (0.5 + segment.offsetX);
  const y = box.y + box.height * anchorY;

  context.font = `${asciiState.fontWeight} ${fontSize}px ${ASCII_TEXTURE_RENDER.fontFamily}`;
  context.fillText(segment.text, x, y);
};

const renderAsciiFrameToTexture = (asciiState, frameIndex = getAsciiVisibleFrame(asciiState)) => {
  if (!asciiState?.context || !asciiState?.canvas || !asciiState?.texture) return;

  normalizeAsciiState(asciiState);

  const nextFrame = clampSpriteFrame(frameIndex, asciiState.frameCount);
  const frameText = asciiState.frames[nextFrame] ?? asciiState.frames[0] ?? '';
  const frameSegments = asciiState.frameSegments[nextFrame] ?? [];
  const context = asciiState.context;
  const { canvas } = asciiState;
  const frameChanged = asciiState.displayFrame !== nextFrame;

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = asciiState.foregroundColor;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.shadowColor = asciiState.foregroundColor;
  context.shadowBlur = asciiState.shadowBlur;
  context.shadowOffsetX = 0;
  context.shadowOffsetY = 0;

  if (frameSegments.length) {
    frameSegments.forEach((segment) => drawAsciiSegment(context, asciiState, segment));
  }

  asciiState.texture.needsUpdate = true;
  asciiState.displayFrame = nextFrame;
  asciiState.currentFrameText = frameText;

  if (frameChanged) {
    asciiState.onFrameChange?.();
  }
};

const createAsciiState = (material, sourceTexture, initialState = {}) => {
  const materialName = material?.name?.trim()?.toLowerCase() ?? '';
  const canvas = document.createElement('canvas');
  canvas.width = ASCII_TEXTURE_RENDER.textureSize;
  canvas.height = ASCII_TEXTURE_RENDER.textureSize;

  const context = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.name = `${material?.name || 'face'} ASCII`;
  texture.userData.asciiGenerated = true;
  texture.userData.asciiSourceTexture = sourceTexture ?? null;
  configureReplacementTexture(texture, 'map', sourceTexture);

  const asciiState = {
    columns: ASCII_FRAME_LAYOUT.columns,
    rows: ASCII_FRAME_LAYOUT.rows,
    gridColumns: ASCII_TEXTURE_RENDER.gridColumns,
    gridRows: ASCII_TEXTURE_RENDER.gridRows,
    frameCount: initialState.frameCount ?? ASCII_FRAME_LAYOUT.frameCount,
    expressionFrame: initialState.expressionFrame ?? 0,
    blinkFrame: initialState.blinkFrame ?? 4,
    activeFrame: 0,
    displayFrame: -1,
    fps: 8,
    isPlaying: false,
    blinkEnabled: false,
    blinkMinDelay: 2.6,
    blinkMaxDelay: 5.2,
    blinkHoldDuration: 0.12,
    isBlinking: false,
    nextBlinkAt: 0,
    blinkUntil: 0,
    playbackAccumulator: 0,
    playbackRow: initialState.playbackRow ?? 0,
    playbackMode: initialState.playbackMode ?? 'row',
    playbackCursor: 0,
    foregroundColor: deriveAsciiForegroundColor(sourceTexture, {
      brightness: materialName === 'face_3' ? 1.04 : 0.82,
      fallback: materialName === 'face_3' ? 'rgb(44, 52, 64)' : 'rgb(14, 18, 22)',
    }),
    fontWeight: materialName === 'face_3' ? 600 : 700,
    shadowBlur: materialName === 'face_3' ? 0 : 8,
    canvas,
    context,
    texture,
    frames: Array.from({ length: ASCII_FRAME_LAYOUT.frameCount }, (_, index) => createAsciiFrameString(material, index)),
    frameSegments: Array.from({ length: ASCII_FRAME_LAYOUT.frameCount }, (_, index) => createAsciiFrameSegments(material, index)),
    currentFrameText: '',
    onFrameChange: null,
  };

  normalizeAsciiState(asciiState);
  scheduleNextBlink(asciiState);
  renderAsciiFrameToTexture(asciiState);
  return asciiState;
};

const applySpriteFrameToTexture = (texture, spriteState, frameIndex = getSpriteVisibleFrame(spriteState)) => {
  if (!texture || !spriteState) return;

  normalizeSpriteState(spriteState, texture);

  const nextFrame = clampSpriteFrame(frameIndex, spriteState.frameCount);
  const { width, height } = getTextureImageSize(texture);
  const cellWidth = spriteState.baseRepeat.x / spriteState.columns;
  const cellHeight = spriteState.baseRepeat.y / spriteState.rows;
  const col = nextFrame % spriteState.columns;
  const row = Math.floor(nextFrame / spriteState.columns);
  const textureRow = Math.max(0, spriteState.rows - row - 1);
  const insetU = width ? Math.min(0.5 / width, cellWidth * 0.12) : 0;
  const insetV = height ? Math.min(0.5 / height, cellHeight * 0.12) : 0;
  const repeatX = Math.max(cellWidth - insetU * 2, Number.EPSILON);
  const repeatY = Math.max(cellHeight - insetV * 2, Number.EPSILON);
  const offsetX = spriteState.baseOffset.x + col * cellWidth + insetU;
  const offsetY = spriteState.baseOffset.y + textureRow * cellHeight + insetV;
  const frameChanged = spriteState.displayFrame !== nextFrame;

  applyTextureTransform(texture, repeatX, repeatY, offsetX, offsetY);
  spriteState.displayFrame = nextFrame;

  if (frameChanged) {
    spriteState.onFrameChange?.();
  }
};

const createSpriteState = (texture, initialState = {}) => {
  const guessedGrid = guessSpriteGrid(texture);
  const frameCount = initialState.frameCount ?? guessedGrid.columns * guessedGrid.rows;

  resetTextureTransformForSprite(texture);

  const spriteState = {
    columns: initialState.columns ?? guessedGrid.columns,
    rows: initialState.rows ?? guessedGrid.rows,
    frameCount,
    expressionFrame: initialState.expressionFrame ?? 0,
    blinkFrame: initialState.blinkFrame ?? (frameCount > 1 ? 1 : 0),
    activeFrame: 0,
    displayFrame: -1,
    fps: 8,
    isPlaying: false,
    blinkEnabled: false,
    blinkMinDelay: 2.6,
    blinkMaxDelay: 5.2,
    blinkHoldDuration: 0.12,
    isBlinking: false,
    nextBlinkAt: 0,
    blinkUntil: 0,
    playbackAccumulator: 0,
    playbackRow: initialState.playbackRow ?? 0,
    playbackCursor: 0,
    baseRepeat: new THREE.Vector2(1, 1),
    baseOffset: new THREE.Vector2(0, 0),
    onFrameChange: null,
  };

  normalizeSpriteState(spriteState, texture);
  scheduleNextBlink(spriteState);
  return spriteState;
};

const getSpritePlaybackFrames = (spriteState) => {
  if (!spriteState) return [];

  const rowIndex = THREE.MathUtils.clamp(sanitizeInteger(spriteState.playbackRow + 1, 1) - 1, 0, spriteState.rows - 1);
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
  spriteState.activeFrame = frames[0];
};

const bindSpriteState = (material, slotKey, texture, spriteState, { isDefault = false } = {}) => {
  if (!material || !slotKey || !texture || !spriteState) return null;

  const key = getTextureOverrideKey(material, slotKey);
  const existingBinding = spriteBindings.get(key);
  if (existingBinding?.sprite) {
    existingBinding.sprite.onFrameChange = null;
  }

  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  spriteBindings.set(key, { texture, sprite: spriteState, isDefault });
  applySpriteFrameToTexture(texture, spriteState);
  return spriteState;
};

const unbindSpriteState = (material, slotKey) => {
  const key = getTextureOverrideKey(material, slotKey);
  const binding = spriteBindings.get(key);
  if (binding?.sprite) {
    binding.sprite.onFrameChange = null;
  }
  spriteBindings.delete(key);
};

const ensureDefaultFaceSpriteState = (material, slotKey, texture) => {
  if (!isFaceSpriteTarget(material, slotKey) || !texture) return null;

  const key = getTextureOverrideKey(material, slotKey);
  const existingBinding = spriteBindings.get(key);
  if (existingBinding?.texture === texture && existingBinding?.sprite) {
    return existingBinding.sprite;
  }

  const spriteState = createSpriteState(texture, getFaceSpriteDefaults(material));
  bindSpriteState(material, slotKey, texture, spriteState, { isDefault: true });
  return spriteState;
};

const bindAsciiState = (material, slotKey, asciiState, { isDefault = false } = {}) => {
  if (!material || !slotKey || !asciiState?.texture) return null;

  const key = getTextureOverrideKey(material, slotKey);
  const existingBinding = asciiBindings.get(key);
  if (existingBinding?.ascii) {
    existingBinding.ascii.onFrameChange = null;
  }

  material[slotKey] = asciiState.texture;
  material.needsUpdate = true;
  asciiState.texture.wrapS = THREE.ClampToEdgeWrapping;
  asciiState.texture.wrapT = THREE.ClampToEdgeWrapping;
  asciiBindings.set(key, {
    texture: asciiState.texture,
    sourceTexture: asciiState.texture.userData.asciiSourceTexture ?? null,
    ascii: asciiState,
    isDefault,
  });
  renderAsciiFrameToTexture(asciiState);
  return asciiState;
};

const unbindAsciiState = (material, slotKey) => {
  const key = getTextureOverrideKey(material, slotKey);
  const binding = asciiBindings.get(key);
  if (binding?.ascii) {
    binding.ascii.onFrameChange = null;
  }
  asciiBindings.delete(key);
};

const ensureDefaultFaceAsciiState = (material, slotKey, sourceTexture) => {
  if (!isFaceAsciiTarget(material, slotKey) || !sourceTexture) return null;

  const key = getTextureOverrideKey(material, slotKey);
  const existingBinding = asciiBindings.get(key);
  if (existingBinding?.sourceTexture === sourceTexture && existingBinding?.ascii) {
    return existingBinding.ascii;
  }

  const asciiState = createAsciiState(material, sourceTexture, getFaceAsciiDefaults(material));
  bindAsciiState(material, slotKey, asciiState, { isDefault: true });
  return asciiState;
};

const stepSpriteAnimations = (delta, now = performance.now() * 0.001) => {
  spriteBindings.forEach((binding) => {
    const spriteState = binding.sprite;
    const texture = binding.texture;
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

const stepAsciiAnimations = (delta, now = performance.now() * 0.001) => {
  asciiBindings.forEach((binding) => {
    const asciiState = binding.ascii;
    if (!asciiState) return;

    normalizeAsciiState(asciiState, { now });

    if (asciiState.isPlaying) {
      const playbackFrames = getAsciiPlaybackFrames(asciiState);
      if (!playbackFrames.length) return;

      if (!playbackFrames.includes(asciiState.activeFrame)) {
        primeAsciiRowPlayback(asciiState);
      }

      asciiState.playbackAccumulator += delta * asciiState.fps;

      while (asciiState.playbackAccumulator >= 1) {
        asciiState.playbackCursor = (asciiState.playbackCursor + 1) % playbackFrames.length;
        asciiState.activeFrame = playbackFrames[asciiState.playbackCursor];
        asciiState.playbackAccumulator -= 1;
      }
    } else if (asciiState.blinkEnabled && asciiState.frameCount > 1) {
      if (!asciiState.isBlinking && now >= asciiState.nextBlinkAt) {
        asciiState.isBlinking = true;
        asciiState.blinkUntil = now + asciiState.blinkHoldDuration;
      } else if (asciiState.isBlinking && now >= asciiState.blinkUntil) {
        scheduleNextBlink(asciiState, now);
      }
    }

    renderAsciiFrameToTexture(asciiState);
  });
};

const ensureDefaultFaceBinding = (material, slotKey, texture) => {
  if (isFaceAsciiTarget(material, slotKey)) {
    return ensureDefaultFaceAsciiState(material, slotKey, texture);
  }

  return ensureDefaultFaceSpriteState(material, slotKey, texture);
};

const ensureDefaultFaceBindingSafely = (material, slotKey, texture) => {
  try {
    return ensureDefaultFaceBinding(material, slotKey, texture);
  } catch (error) {
    console.error(`Failed to initialize face binding for ${material?.name || material?.type || slotKey}.`, error);
    unbindSpriteState(material, slotKey);
    unbindAsciiState(material, slotKey);
    if (material && slotKey in material) {
      material[slotKey] = texture ?? null;
      material.needsUpdate = true;
    }
    return null;
  }
};

const copyTextureSettings = (target, source) => {
  if (!target || !source) return;

  target.mapping = source.mapping;
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
    if (record.originalTexture?.userData?.asciiGenerated) {
      disposeTexture(record.originalTexture);
      disposeTexture(record.originalTexture.userData.asciiSourceTexture);
    }
  });

  textureOverrides.clear();
};

const clearSpriteBindings = () => {
  spriteBindings.forEach((binding) => {
    if (binding?.sprite) {
      binding.sprite.onFrameChange = null;
    }
  });

  spriteBindings.clear();
};

const clearAsciiBindings = () => {
  asciiBindings.forEach((binding) => {
    if (binding?.ascii) {
      binding.ascii.onFrameChange = null;
    }

    disposeTexture(binding?.ascii?.texture);
    disposeTexture(binding?.sourceTexture);
  });

  asciiBindings.clear();
};

const configureFaceOverlayMaterial = (mesh, material) => {
  if (!mesh || !material || !isFaceOverlayMesh(mesh)) return;

  const layerName = mesh.name.trim().toLowerCase();
  mesh.renderOrder = FACE_OVERLAY_RENDER_ORDER.get(layerName) ?? 20;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.visible = !shouldHideFaceBaseLayer(mesh);

  material.transparent = true;
  material.alphaTest = Math.max(material.alphaTest ?? 0, 0.01);
  material.depthWrite = false;
  material.polygonOffset = true;
  material.polygonOffsetFactor = -2;
  material.polygonOffsetUnits = -2;
  material.needsUpdate = true;
};

const replaceMaterialTexture = async (material, slotKey, file, { useSprite = false } = {}) => {
  if (!material || !slotKey || !file || !REPLACEABLE_TEXTURE_SLOTS.has(slotKey)) return;

  const overrideKey = getTextureOverrideKey(material, slotKey);
  const currentTexture = material[slotKey] ?? null;
  const existingRecord = textureOverrides.get(overrideKey);
  const record = existingRecord ?? {
    originalTexture: currentTexture,
    replacementTexture: null,
    objectUrl: null,
    fileName: null,
    sprite: null,
  };
  const objectUrl = URL.createObjectURL(file);
  const slotLabel = TEXTURE_LABELS.get(slotKey) ?? slotKey;
  const sourceTexture = record.originalTexture ?? currentTexture;

  try {
    setStatus(`${useSprite ? 'Preparing sprite sheet' : 'Updating'} ${material.name || material.type} ${slotLabel}…`);

    const nextTexture = await textureLoader.loadAsync(objectUrl);
    nextTexture.name = file.name;
    configureReplacementTexture(nextTexture, slotKey, sourceTexture);

    let spriteState = null;
    if (useSprite) {
      const defaultSpriteState = isFaceSpriteTarget(material, slotKey) ? getFaceSpriteDefaults(material) : {};
      spriteState = createSpriteState(nextTexture, defaultSpriteState);
    }

    material[slotKey] = nextTexture;
    material.needsUpdate = true;

    unbindSpriteState(material, slotKey);
    if (record.objectUrl) URL.revokeObjectURL(record.objectUrl);
    if (record.replacementTexture && record.replacementTexture !== record.originalTexture) {
      disposeTexture(record.replacementTexture);
    }

    record.replacementTexture = nextTexture;
    record.objectUrl = objectUrl;
    record.fileName = file.name;
    record.sprite = spriteState;
    textureOverrides.set(overrideKey, record);

    unbindAsciiState(material, slotKey);
    if (spriteState) {
      bindSpriteState(material, slotKey, nextTexture, spriteState);
    }

    renderTextureInspector(modelRoot);
    setStatus(
      useSprite
        ? `Sprite sheet ready on ${material.name || material.type} ${slotLabel}.`
        : `Updated ${material.name || material.type} ${slotLabel}.`,
    );
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
  const originalTexture = record.originalTexture ?? null;

  unbindSpriteState(material, slotKey);
  unbindAsciiState(material, slotKey);
  material[slotKey] = originalTexture;
  material.needsUpdate = true;

  if (record.objectUrl) URL.revokeObjectURL(record.objectUrl);
  if (record.replacementTexture && record.replacementTexture !== record.originalTexture) {
    disposeTexture(record.replacementTexture);
  }

  textureOverrides.delete(overrideKey);
  ensureDefaultFaceBinding(material, slotKey, material[slotKey]);
  if (originalTexture?.userData?.asciiGenerated && material[slotKey] !== originalTexture) {
    disposeTexture(originalTexture);
    disposeTexture(originalTexture.userData.asciiSourceTexture);
  }
  renderTextureInspector(modelRoot);

  const slotLabel = TEXTURE_LABELS.get(slotKey) ?? slotKey;
  setStatus(`Restored ${material.name || material.type} ${slotLabel}.`);
};

const drawTexturePreview = (canvas, texture, spriteState = null) => {
  const image = getTextureImage(texture);
  const ctx = canvas.getContext('2d');

  if (!ctx || !image) {
    throw new Error('Missing drawable source');
  }

  const sourceWidth = image.naturalWidth ?? image.videoWidth ?? image.displayWidth ?? image.width;
  const sourceHeight = image.naturalHeight ?? image.videoHeight ?? image.displayHeight ?? image.height;

  if (!sourceWidth || !sourceHeight) {
    throw new Error('Missing texture dimensions');
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  let sx = 0;
  let sy = 0;
  let sw = sourceWidth;
  let sh = sourceHeight;

  if (spriteState) {
    normalizeSpriteState(spriteState, texture);
    const previewFrame = getSpriteVisibleFrame(spriteState);
    const cellWidth = sourceWidth / spriteState.columns;
    const cellHeight = sourceHeight / spriteState.rows;
    const col = previewFrame % spriteState.columns;
    const row = Math.floor(previewFrame / spriteState.columns);

    sx = col * cellWidth;
    sy = row * cellHeight;
    sw = cellWidth;
    sh = cellHeight;
  }

  const scale = Math.max(canvas.width / sw, canvas.height / sh);
  const drawWidth = sw * scale;
  const drawHeight = sh * scale;
  const offsetX = (canvas.width - drawWidth) * 0.5;
  const offsetY = (canvas.height - drawHeight) * 0.5;

  ctx.drawImage(image, sx, sy, sw, sh, offsetX, offsetY, drawWidth, drawHeight);
};

const createTexturePreview = (texture, spriteState = null) => {
  const thumb = document.createElement('div');
  thumb.className = 'texture-thumb';

  const image = getTextureImage(texture);
  if (!image) {
    const fallback = document.createElement('div');
    fallback.className = 'texture-thumb texture-thumb-fallback';
    fallback.textContent = 'No preview';
    return {
      element: fallback,
      refresh: () => {},
    };
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

const initializeDefaultSpriteBindings = (root) => {
  if (!root) return;

  root.traverse((child) => {
    if (!child.isMesh || !child.material) return;

    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => {
      if (!material) return;

      const texture = material.map ?? null;
      if (!texture) return;

      ensureDefaultFaceBindingSafely(material, 'map', texture);
    });
  });
};

const renderTextureInspector = (root) => {
  if (!root) {
    resetTextureInspector('Character asset details will appear here once the workbench finishes loading.');
    return;
  }

  const rawData = collectTextureInspectorData(root);
  const data = {
    ...rawData,
    materials: rawData.materials.filter((material) => shouldShowMaterialInInspector(material.name)),
  };
  data.textureCount = data.materials.reduce((count, material) => count + material.slots.length, 0);

  setInspectorSummary({
    meshes: rawData.meshCount,
    materials: data.materials.length,
    textures: data.textureCount,
    vertices: rawData.vertexCount,
    fileSizeBytes: currentModelFileSizeBytes,
  });
  textureInspectorList.replaceChildren();

  if (!data.materials.length) {
    inspectorEmpty.textContent = 'Allowed character materials were not found on this asset.';
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

      const asciiState = getAsciiBinding(material.materialRef, key)?.ascii ?? null;
      const spriteState = getSpriteBinding(material.materialRef, key)?.sprite ?? null;
      const previewTexture = asciiState?.texture ?? texture;
      const { element: preview, refresh: refreshPreview } = createTexturePreview(previewTexture, asciiState ? null : spriteState);

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
      const refreshTextureMeta = () => {
        const parts = [
          getTextureDimensions(texture),
          texture.colorSpace === THREE.SRGBColorSpace ? 'sRGB' : 'Linear',
          texture.flipY ? 'FlipY' : 'No FlipY',
        ];

        if (asciiState) {
          parts.push(`ASCII ${asciiState.columns} x ${asciiState.rows}`);
          parts.push(`Frame ${getAsciiVisibleFrame(asciiState) + 1}/${asciiState.frameCount}`);
        } else if (spriteState) {
          parts.push(`Sprite ${spriteState.columns} x ${spriteState.rows}`);
          parts.push(`Frame ${getSpriteVisibleFrame(spriteState) + 1}/${spriteState.frameCount}`);
        }

        metaInfo.textContent = parts.join(' · ');
      };
      refreshTextureMeta();

      body.append(slot, name, metaInfo);

      if (REPLACEABLE_TEXTURE_SLOTS.has(key)) {
        const actionRow = document.createElement('div');
        actionRow.className = 'texture-actions';

        const replaceBtn = document.createElement('button');
        replaceBtn.className = 'texture-action';
        replaceBtn.type = 'button';
        replaceBtn.textContent = 'Replace';

        const canUseSprite = SPRITE_REPLACEABLE_TEXTURE_SLOTS.has(key) && !isFaceAsciiTarget(material.materialRef, key);
        const spriteBtn = document.createElement('button');
        spriteBtn.className = 'texture-action';
        spriteBtn.type = 'button';
        spriteBtn.textContent = spriteState ? 'Swap sprite' : 'Sprite sheet';

        const resetBtn = document.createElement('button');
        resetBtn.className = 'texture-action subtle';
        resetBtn.type = 'button';
        resetBtn.textContent = 'Reset';

        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.hidden = true;

        const spriteInput = document.createElement('input');
        spriteInput.type = 'file';
        spriteInput.accept = 'image/*';
        spriteInput.hidden = true;

        const overrideKey = getTextureOverrideKey(material.materialRef, key);
        const isOverridden = textureOverrides.has(overrideKey);
        resetBtn.disabled = !isOverridden;

        const state = document.createElement('div');
        state.className = 'texture-state';
        state.textContent = asciiState ? 'ASCII active' : spriteState ? 'Sprite active' : isOverridden ? 'Custom override' : 'Original';

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

        if (canUseSprite) {
          spriteBtn.addEventListener('click', () => spriteInput.click());
          spriteInput.addEventListener('change', async (event) => {
            const [file] = event.target.files ?? [];
            event.target.value = '';
            if (!file) return;

            try {
              await replaceMaterialTexture(material.materialRef, key, file, { useSprite: true });
            } catch (error) {
              console.error(error);
            }
          });
        } else {
          spriteBtn.disabled = true;
        }

        resetBtn.addEventListener('click', () => resetMaterialTexture(material.materialRef, key));

        actionRow.append(replaceBtn);
        if (canUseSprite) actionRow.append(spriteBtn);
        actionRow.append(resetBtn, state, fileInput, spriteInput);
        body.append(actionRow);

        const createNumberField = ({ label: fieldLabel, min = 1, max = null, step = 1, value = 1 }) => {
          const field = document.createElement('label');
          field.className = 'sprite-field';

          const caption = document.createElement('span');
          caption.textContent = fieldLabel;

          const input = document.createElement('input');
          input.className = 'sprite-input';
          input.type = 'number';
          input.min = String(min);
          input.step = String(step);
          if (max !== null) input.max = String(max);
          input.value = String(value);

          field.append(caption, input);
          return { field, input };
        };

        if (asciiState) {
          const asciiPanel = document.createElement('div');
          asciiPanel.className = 'sprite-panel';

          const panelTitle = document.createElement('div');
          panelTitle.className = 'sprite-title';
          panelTitle.textContent = 'ASCII Eyes';

          const panelSub = document.createElement('div');
          panelSub.className = 'sprite-sub';
          panelSub.textContent = 'Generated live from a text grid. Frames still run left to right, top to bottom.';

          const fields = document.createElement('div');
          fields.className = 'sprite-grid';

          const framesField = createNumberField({
            label: 'Frames',
            value: asciiState.frameCount,
            max: asciiState.columns * asciiState.rows,
          });
          const expressionField = createNumberField({
            label: 'Expression',
            value: asciiState.expressionFrame + 1,
            max: asciiState.frameCount,
          });
          const playbackRowField = createNumberField({
            label: 'Play Row',
            value: asciiState.playbackRow + 1,
            max: asciiState.rows,
          });
          const blinkField = createNumberField({
            label: 'Blink',
            value: asciiState.blinkFrame + 1,
            max: asciiState.frameCount,
          });
          const fpsField = createNumberField({ label: 'FPS', value: asciiState.fps, min: 1, max: 60, step: 0.5 });

          fields.append(framesField.field, expressionField.field, playbackRowField.field, blinkField.field, fpsField.field);

          const asciiPreview = document.createElement('pre');
          asciiPreview.className = 'ascii-preview';

          const spriteControls = document.createElement('div');
          spriteControls.className = 'sprite-controls';

          const blinkToggle = document.createElement('label');
          blinkToggle.className = 'sprite-toggle';

          const blinkCheckbox = document.createElement('input');
          blinkCheckbox.type = 'checkbox';
          blinkCheckbox.checked = asciiState.blinkEnabled;

          const blinkLabel = document.createElement('span');
          blinkLabel.textContent = 'Auto blink';

          blinkToggle.append(blinkCheckbox, blinkLabel);

          const playBtn = document.createElement('button');
          playBtn.className = 'texture-action';
          playBtn.type = 'button';

          const playAllBtn = document.createElement('button');
          playAllBtn.className = 'texture-action';
          playAllBtn.type = 'button';

          const frameState = document.createElement('div');
          frameState.className = 'texture-state';

          const refreshAsciiPanel = () => {
            normalizeAsciiState(asciiState);
            framesField.input.max = String(asciiState.columns * asciiState.rows);
            framesField.input.value = String(asciiState.frameCount);
            expressionField.input.max = String(asciiState.frameCount);
            expressionField.input.value = String(asciiState.expressionFrame + 1);
            expressionField.input.disabled = asciiState.isPlaying;
            playbackRowField.input.max = String(asciiState.rows);
            playbackRowField.input.value = String(Math.min(asciiState.playbackRow + 1, asciiState.rows));
            playbackRowField.input.disabled = asciiState.frameCount <= 1;
            blinkField.input.max = String(asciiState.frameCount);
            blinkField.input.value = String(asciiState.blinkFrame + 1);
            blinkField.input.disabled = !asciiState.blinkEnabled || asciiState.isPlaying || asciiState.frameCount <= 1;
            fpsField.input.value = String(asciiState.fps);
            fpsField.input.disabled = asciiState.frameCount <= 1;
            blinkCheckbox.checked = asciiState.blinkEnabled;
            blinkCheckbox.disabled = asciiState.isPlaying || asciiState.frameCount <= 1;
            playBtn.disabled = asciiState.frameCount <= 1;
            playAllBtn.disabled = asciiState.frameCount <= 1;
            playBtn.textContent = asciiState.isPlaying && asciiState.playbackMode === 'row' ? 'Pause row' : 'Play row';
            playAllBtn.textContent = asciiState.isPlaying && asciiState.playbackMode === 'sequence' ? 'Pause all' : 'Play all';
            frameState.textContent =
              asciiState.playbackMode === 'sequence' && asciiState.isPlaying
                ? `All · Frame ${getAsciiVisibleFrame(asciiState) + 1} / ${asciiState.frameCount}`
                : `Row ${asciiState.playbackRow + 1} · Frame ${getAsciiVisibleFrame(asciiState) + 1} / ${asciiState.frameCount}`;
            asciiPreview.textContent = asciiState.currentFrameText || asciiState.frames[getAsciiVisibleFrame(asciiState)] || '';
            refreshTextureMeta();
            refreshPreview();
          };

          const commitAsciiChanges = ({ announce = false } = {}) => {
            asciiState.frameCount = framesField.input.value;
            asciiState.expressionFrame = Number(expressionField.input.value) - 1;
            asciiState.playbackRow = Number(playbackRowField.input.value) - 1;
            asciiState.blinkFrame = Number(blinkField.input.value) - 1;
            asciiState.fps = fpsField.input.value;
            normalizeAsciiState(asciiState);
            if (asciiState.isPlaying) {
              primeAsciiRowPlayback(asciiState);
            }
            renderAsciiFrameToTexture(asciiState);
            refreshAsciiPanel();

            if (announce) {
              setStatus(`ASCII eyes updated for ${material.name || material.type} ${label}.`);
            }
          };

          asciiState.onFrameChange = refreshAsciiPanel;

          [framesField.input, expressionField.input, playbackRowField.input, blinkField.input, fpsField.input].forEach((input) => {
            input.addEventListener('change', () => commitAsciiChanges({ announce: true }));
          });

          blinkCheckbox.addEventListener('change', () => {
            asciiState.blinkEnabled = blinkCheckbox.checked;
            scheduleNextBlink(asciiState);
            renderAsciiFrameToTexture(asciiState);
            refreshAsciiPanel();
            setStatus(
              asciiState.blinkEnabled
                ? `Auto blink enabled for ${material.name || material.type} ${label}.`
                : `Auto blink disabled for ${material.name || material.type} ${label}.`,
            );
          });

          playBtn.addEventListener('click', () => {
            const shouldStartRow = !asciiState.isPlaying || asciiState.playbackMode !== 'row';
            asciiState.playbackMode = 'row';
            asciiState.isPlaying = shouldStartRow;
            asciiState.playbackAccumulator = 0;
            if (asciiState.isPlaying) {
              primeAsciiRowPlayback(asciiState);
            } else {
              asciiState.activeFrame = asciiState.expressionFrame;
              scheduleNextBlink(asciiState);
            }
            renderAsciiFrameToTexture(asciiState);
            refreshAsciiPanel();
            setStatus(
              asciiState.isPlaying
                ? `ASCII row ${asciiState.playbackRow + 1} playing on ${material.name || material.type} ${label}.`
                : `ASCII row playback paused on ${material.name || material.type} ${label}.`,
            );
          });

          playAllBtn.addEventListener('click', () => {
            const shouldStartSequence = !asciiState.isPlaying || asciiState.playbackMode !== 'sequence';
            asciiState.playbackMode = 'sequence';
            asciiState.isPlaying = shouldStartSequence;
            asciiState.playbackAccumulator = 0;
            if (asciiState.isPlaying) {
              primeAsciiRowPlayback(asciiState);
            } else {
              asciiState.activeFrame = asciiState.expressionFrame;
              scheduleNextBlink(asciiState);
            }
            renderAsciiFrameToTexture(asciiState);
            refreshAsciiPanel();
            setStatus(
              asciiState.isPlaying
                ? `ASCII sequence playing on ${material.name || material.type} ${label}.`
                : `ASCII sequence playback paused on ${material.name || material.type} ${label}.`,
            );
          });

          spriteControls.append(blinkToggle, playBtn, playAllBtn, frameState);
          asciiPanel.append(panelTitle, panelSub, fields, asciiPreview, spriteControls);
          body.append(asciiPanel);
          refreshAsciiPanel();
        } else if (spriteState) {
          const spritePanel = document.createElement('div');
          spritePanel.className = 'sprite-panel';

          const panelTitle = document.createElement('div');
          panelTitle.className = 'sprite-title';
          panelTitle.textContent = 'Face Sprite';

          const panelSub = document.createElement('div');
          panelSub.className = 'sprite-sub';
          panelSub.textContent = 'Frames run left to right, top to bottom. Expression frame is the resting face.';

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
            expressionField.input.disabled = spriteState.isPlaying;
            playbackRowField.input.max = String(spriteState.rows);
            playbackRowField.input.value = String(Math.min(spriteState.playbackRow + 1, spriteState.rows));
            playbackRowField.input.disabled = spriteState.frameCount <= 1;
            blinkField.input.max = String(spriteState.frameCount);
            blinkField.input.value = String(spriteState.blinkFrame + 1);
            blinkField.input.disabled = !spriteState.blinkEnabled || spriteState.isPlaying || spriteState.frameCount <= 1;
            fpsField.input.value = String(spriteState.fps);
            fpsField.input.disabled = spriteState.frameCount <= 1;
            blinkCheckbox.checked = spriteState.blinkEnabled;
            blinkCheckbox.disabled = spriteState.isPlaying || spriteState.frameCount <= 1;
            playBtn.disabled = spriteState.frameCount <= 1;
            playBtn.textContent = spriteState.isPlaying ? 'Pause row' : 'Play row';
            frameState.textContent = `Row ${spriteState.playbackRow + 1} · Frame ${getSpriteVisibleFrame(spriteState) + 1} / ${spriteState.frameCount}`;
            refreshTextureMeta();
            refreshPreview();
          };

          const commitSpriteChanges = ({ announce = false } = {}) => {
            spriteState.columns = columnsField.input.value;
            spriteState.rows = rowsField.input.value;
            spriteState.frameCount = framesField.input.value;
            spriteState.expressionFrame = Number(expressionField.input.value) - 1;
            spriteState.playbackRow = Number(playbackRowField.input.value) - 1;
            spriteState.blinkFrame = Number(blinkField.input.value) - 1;
            spriteState.fps = fpsField.input.value;
            normalizeSpriteState(spriteState, texture);
            spriteState.playbackRow = THREE.MathUtils.clamp(spriteState.playbackRow, 0, Math.max(0, spriteState.rows - 1));
            if (spriteState.isPlaying) {
              primeSpriteRowPlayback(spriteState);
            }
            applySpriteFrameToTexture(texture, spriteState);
            refreshSpritePanel();

            if (announce) {
              setStatus(`Sprite updated for ${material.name || material.type} ${label}.`);
            }
          };

          spriteState.onFrameChange = refreshSpritePanel;

          [
            columnsField.input,
            rowsField.input,
            framesField.input,
            expressionField.input,
            playbackRowField.input,
            blinkField.input,
            fpsField.input,
          ].forEach((input) => {
            input.addEventListener('change', () => commitSpriteChanges({ announce: true }));
          });

          blinkCheckbox.addEventListener('change', () => {
            spriteState.blinkEnabled = blinkCheckbox.checked;
            scheduleNextBlink(spriteState);
            applySpriteFrameToTexture(texture, spriteState);
            refreshSpritePanel();
            setStatus(
              spriteState.blinkEnabled
                ? `Auto blink enabled for ${material.name || material.type} ${label}.`
                : `Auto blink disabled for ${material.name || material.type} ${label}.`,
            );
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
            setStatus(
              spriteState.isPlaying
                ? `Sprite row ${spriteState.playbackRow + 1} playing on ${material.name || material.type} ${label}.`
                : `Sprite row playback paused on ${material.name || material.type} ${label}.`,
            );
          });

          spriteControls.append(blinkToggle, playBtn, frameState);
          spritePanel.append(panelTitle, panelSub, fields, spriteControls);
          body.append(spritePanel);
          refreshSpritePanel();
        }
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
    if (isFaceOverlayMesh(child)) {
      child.castShadow = false;
      child.receiveShadow = false;
      return;
    }
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
  clearAsciiBindings();
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
  scene.background = FLAT_BACKGROUND;
  syncBackgroundControls();
};

const syncBackgroundControls = () => {
  const flatHex = getFlatBackgroundHex();

  backgroundSwatches.forEach((button) => {
    const swatchHex = button.dataset.backgroundColor?.toLowerCase();
    const isActive = swatchHex === flatHex;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
};

const setFlatBackgroundColor = (value, { announce = true } = {}) => {
  if (typeof value !== 'string' || !value.trim()) return;

  FLAT_BACKGROUND.set(value);
  setBackgroundState();

  if (announce) {
    setStatus(`Background color updated: ${getFlatBackgroundHex().toUpperCase()}.`);
  }
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
  try {
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
  } catch (error) {
    console.warn('Failed to apply environment preset.', error);
    currentEnvironmentPreset = 'none';
    setEnvironmentTexture(null);
    if (announce) {
      setStatus('Environment disabled after setup failure.', true);
    }
  }
};

const loadModel = async (url = currentModelUrl, { progressLabel = 'Loading character asset…' } = {}) => {
  clearCurrentModel({ preserveFileSize: true });

  const gltf = await new Promise((resolve, reject) => {
    gltfLoader.load(
      url,
      resolve,
      (event) => {
        if ((!Number.isFinite(currentModelFileSizeBytes) || currentModelFileSizeBytes <= 0) && event.total > 0) {
          currentModelFileSizeBytes = event.total;
        }
        updateProgress(event.loaded, event.total, progressLabel);
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
    if (!child.material) return;

    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => {
      configureFaceOverlayMaterial(child, material);
      material.needsUpdate = true;
    });
  });

  scene.add(modelRoot);
  frameModel(modelRoot);
  applyShadowState(shadowToggle.checked);
  initializeDefaultSpriteBindings(modelRoot);
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

const loadWorkbenchCharacter = async ({ bustCache = false, progressLabel = 'Loading character asset…' } = {}) => {
  currentModelUrl = buildCharacterAssetUrl({ bustCache });
  currentModelFileSizeBytes = null;
  modelFileName.textContent = CHARACTER_ASSET_LABEL;

  await loadModel(currentModelUrl, { progressLabel });
  progressEl.value = 100;
  resolveAndApplyModelFileSize(currentModelUrl);
};

const bootWithDefaults = async () => {
  try {
    resetTextureInspector();
    updateLightTargets();
    applyLightingPreset(currentLightingPreset);
    applyEnvironmentPreset(currentEnvironmentPreset, { announce: false });
    setGamma(VIEWER_DEFAULTS.gamma);
    modelFileName.textContent = CHARACTER_ASSET_LABEL;
    setStatus('Preparing character workbench…');

    if (isFileProtocol) {
      currentModelFileSizeBytes = null;
      progressEl.value = 0;
      setStatus('Open this workbench through a local server so the character asset can load.', true);
      return;
    }

    await loadWorkbenchCharacter();
    setStatus(`Character workbench ready. ${LIGHTING_PRESETS[currentLightingPreset].label} active.`);
  } catch (error) {
    console.warn(error);
    currentModelFileSizeBytes = null;
    progressEl.value = 0;
    setStatus(`Failed to initialize workbench: ${error.message}`, true);
  }
};

const revokeObjectUrl = (key) => {
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

const animate = () => {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

  if (mixer) mixer.update(delta);
  stepSpriteAnimations(delta);
  stepAsciiAnimations(delta);

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
backgroundSwatches.forEach((button) => {
  button.addEventListener('click', () => {
    const nextColor = button.dataset.backgroundColor;
    if (!nextColor) return;
    setFlatBackgroundColor(nextColor);
  });
});
shadowToggle.addEventListener('change', () => applyShadowState(shadowToggle.checked));
autoRotateToggle.addEventListener('change', () => {
  controls.autoRotate = autoRotateToggle.checked;
});
resetCameraBtn.addEventListener('click', resetCamera);
reloadCharacterBtn.addEventListener('click', async () => {
  try {
    setStatus('Reloading latest character asset…');
    await loadWorkbenchCharacter({ bustCache: true, progressLabel: 'Reloading character asset…' });
    setStatus(`Character reloaded from ${CHARACTER_ASSET_LABEL}.`);
  } catch (error) {
    console.error(error);
    currentModelFileSizeBytes = null;
    progressEl.value = 0;
    setStatus(`Failed to reload character asset: ${error.message}`, true);
  }
});
hdrInput.addEventListener('change', async (event) => handleHdrFile(event.target.files?.[0]));
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
