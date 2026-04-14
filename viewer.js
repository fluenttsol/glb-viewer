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

const CHARACTER_ASSET_PATH = './assets/260414_daymo_motion.glb';
const CHARACTER_ASSET_LABEL = 'assets/260414_daymo_motion.glb';
const CHARACTER_ASSET_VERSION = '20260414-workbench-1';
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
const asciiExpressionPanel = document.querySelector('#asciiExpressionPanel');
const asciiExpressionPreview = document.querySelector('#asciiExpressionPreview');
const asciiExpressionMeta = document.querySelector('#asciiExpressionMeta');
const statePresetRow = document.querySelector('#statePresetRow');
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
  ['face_2', { ...FACE_SPRITE_DEFAULTS, frameCount: 8, expressionFrame: 0, blinkFrame: 1, blinkEnabled: false }],
  ['face_3', { ...FACE_SPRITE_DEFAULTS, expressionFrame: 0, blinkFrame: 0 }],
]);
const ASCII_FRAME_LAYOUT = Object.freeze({
  columns: 4,
  rows: 4,
  frameCount: 16,
});
const ASCII_TEXTURE_RENDER = Object.freeze({
  textureSize: 1024,
  gridColumns: 32,
  gridRows: 32,
  eyeLogicalWidth: 40,
  eyeLogicalHeight: 60,
  mouthLogicalWidth: 40,
  mouthLogicalHeight: 40,
});
const EYE_REVIEW_ROW_LABELS = Object.freeze([
  'Base Mood',
  'State Shift',
  'Gaze & Alert',
  'Accent',
]);
const MOUTH_REVIEW_ROW_LABELS = Object.freeze([
  'Expression',
  'Core Viseme',
  'Speech Flow',
  'Round & Accent',
]);
const ASCII_EYE_BOXES = Object.freeze({
  left: { x: 353, y: 387, width: 70, height: 98 },
  right: { x: 602, y: 387, width: 70, height: 98 },
  mouth: { x: 440, y: 440, width: 140, height: 80 },
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
const sharedGaze = { x: 0, y: 0 };
const isFileProtocol = window.location.protocol === 'file:';
let asciiExpressionSignature = '';

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
const getAsciiLayerType = (materialOrName) => {
  const name =
    typeof materialOrName === 'string'
      ? materialOrName.trim().toLowerCase()
      : materialOrName?.name?.trim()?.toLowerCase() ?? '';
  return name === 'face_2' ? 'eyes' : 'mouth';
};
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

const EYE_FRAME_LIBRARY = Object.freeze([
  { label: 'Neutral', mood: 'neutral', open: 0.72, pupilX: 0, pupilY: 0, sparkle: 0 },
  { label: 'Blink', mood: 'blink', open: 0.03, pupilX: 0, pupilY: 0, sparkle: 0 },
  { label: 'Twinkle', mood: 'twinkle', open: 0.72, pupilX: 0, pupilY: 0, sparkle: 1 },
  { label: 'Loading', mood: 'loading', open: 0.72, pupilX: 0, pupilY: 0, sparkle: 0.24 },
  { label: 'Moving', mood: 'moving', open: 0.68, pupilX: 0, pupilY: 0, sparkle: 0 },
  { label: 'Die', mood: 'die', open: 0.28, pupilX: 0, pupilY: 0, sparkle: 0 },
  { label: 'Wink', mood: 'wink', open: 0.7, wink: 'left', pupilX: 0.12, pupilY: 0, sparkle: 0.08 },
  { label: 'Sleepy', mood: 'sleepy', open: 0.24, pupilX: 0, pupilY: 0.8, sparkle: 0 },
]);

const MOUTH_FRAME_LIBRARY = Object.freeze([
  { label: 'Rest', mood: 'rest' },
  { label: 'Smile', mood: 'smile' },
  { label: 'O', mood: 'o' },
  { label: 'Ah', mood: 'ah' },
  { label: 'Sad', mood: 'sad' },
  { label: 'Woo', mood: 'woo' },
]);

const STATE_PRESETS = Object.freeze([
  { label: 'idle', eye: 0, mouth: 1, blink: true, motion: 'idle' },
  { label: 'thinking', eye: 4, mouth: 0, blink: false, motion: 'looking behind' },
  { label: 'done', eye: 0, mouth: 1, blink: true, motion: 'jump', mouthCycle: [1, 3, 1, 1, 3, 1], eyeCycle: [0, 0, 6, 0, 0] },
  { label: 'searching', eye: 2, mouth: 0, blink: false, motion: 'searching files' },
  { label: 'error', eye: 5, mouth: 0, blink: false, motion: 'waving', mouthCycle: [0, 0, 4, 0, 0, 0, 4, 0] },
  { label: 'offline', eye: 7, mouth: 0, blink: false, motion: 'standing react death' },
  { label: 'talking', eye: 0, mouth: 3, blink: true, motion: 'talking', mouthCycle: [0, 3, 0, 2, 0, 5, 0, 3] },
]);

const findAnimationIndex = (keyword) => {
  if (!keyword || !animationClips.length) return -1;
  const kw = keyword.toLowerCase();
  return animationClips.findIndex((clip) => clip?.name?.trim()?.toLowerCase().includes(kw));
};

const ASCII_EYE_GRID = Object.freeze({
  columns: 20,
  rows: 30,
  sampleColumnsPerCell: 5,
  sampleRowsPerCell: 6,
  renderCellWidth: 1,
  renderCellHeight: 1,
});
const ASCII_MOUTH_GRID = Object.freeze({
  columns: 20,
  rows: 20,
  sampleColumnsPerCell: 4,
  sampleRowsPerCell: 4,
  renderCellWidth: 2,
  renderCellHeight: 2,
});
const ASCII_EXPRESSION_EYE_TOTAL_WIDTH = ASCII_EYE_GRID.columns;
const ASCII_EXPRESSION_EYE_TOTAL_HEIGHT = ASCII_EYE_GRID.rows;
const ASCII_EXPRESSION_EYE_GAP = '      ';
const ASCII_EXPRESSION_PREVIEW_WIDTH = ASCII_EXPRESSION_EYE_TOTAL_WIDTH * 2 + ASCII_EXPRESSION_EYE_GAP.length;
const EYE_POSE_KEYS = Object.freeze(['open', 'width', 'height', 'squeeze', 'slant', 'shiftX', 'shiftY', 'curve', 'flatness', 'capsuleBlend', 'glitch', 'tear']);
const ASCII_EYE_MASK_THRESHOLDS = Object.freeze({
  on: 0.5,
  off: 0.32,
});
const ASYMMETRIC_EYE_FRAME_LABELS = new Set(['Wink']);

const clampUnit = (value) => THREE.MathUtils.clamp(value, 0, 1);
const lerp = (start, end, alpha) => start + (end - start) * alpha;
const easeInOutSine = (value) => -(Math.cos(Math.PI * clampUnit(value)) - 1) * 0.5;
const createEyePose = (overrides = {}) => ({
  open: 0.72,
  width: 1.01,
  height: 1.8,
  squeeze: 0.01,
  slant: 0,
  shiftX: 0,
  shiftY: 0,
  curve: 0.86,
  flatness: 0.44,
  capsuleBlend: 0,
  glitch: 0,
  tear: 0,
  winkSide: null,
  label: 'Neutral',
  mood: 'neutral',
  ...overrides,
});
const cloneEyePose = (pose = {}) => ({ ...pose });
const blendEyePoses = (fromPose, toPose, alpha = 1) => {
  const from = createEyePose(fromPose);
  const to = createEyePose(toPose);
  const next = { ...to };

  EYE_POSE_KEYS.forEach((key) => {
    next[key] = lerp(from[key] ?? 0, to[key] ?? 0, alpha);
  });
  next.winkSide = to.winkSide ?? null;
  next.label = to.label ?? '';
  next.mood = to.mood ?? 'neutral';
  return next;
};
const quantizeCoverageToAscii = (coverage = 0) => (coverage >= ASCII_EYE_MASK_THRESHOLDS.on ? '█' : ' ');
const createEmptyEyeMask = () =>
  Array.from({ length: ASCII_EYE_GRID.rows }, () => Array.from({ length: ASCII_EYE_GRID.columns }, () => false));
const cloneEyeMask = (mask = createEmptyEyeMask()) => mask.map((row) => row.slice());
const mirrorEyeMaskHorizontally = (mask = createEmptyEyeMask()) => mask.map((row) => row.slice().reverse());
const isEyePresetAsymmetric = (preset = {}) => ASYMMETRIC_EYE_FRAME_LABELS.has(preset?.label ?? '');
const isEyeFrameAsymmetric = (frameIndex = 0) => isEyePresetAsymmetric(getEyePreset(frameIndex));
const createImportedEyeAsset = ({ left, right, leftHighlight = null, rightHighlight = null } = {}) => ({
  left: cloneEyeMask(left),
  right: cloneEyeMask(right),
  leftHighlight: leftHighlight ? cloneEyeMask(leftHighlight) : null,
  rightHighlight: rightHighlight ? cloneEyeMask(rightHighlight) : null,
});
const createEyeMaskFromAsciiRows = (rows = []) => {
  const mask = createEmptyEyeMask();
  const normalizedRows = rows.map((row) => row.replace(/\r/g, ''));
  const width = Math.max(0, ...normalizedRows.map((row) => row.length));
  const height = normalizedRows.length;
  const startColumn = Math.max(0, Math.floor((ASCII_EYE_GRID.columns - width) * 0.5));
  const startRow = Math.max(0, Math.floor((ASCII_EYE_GRID.rows - height) * 0.5));

  normalizedRows.forEach((row, rowIndex) => {
    [...row].forEach((character, columnIndex) => {
      if (character === ' ') return;
      const targetRow = startRow + rowIndex;
      const targetColumn = startColumn + columnIndex;
      if (mask[targetRow]?.[targetColumn] === undefined) return;
      mask[targetRow][targetColumn] = true;
    });
  });

  return mask;
};
const getImportedEyeAssetForFrame = () => null;
const quantizeEyeCoverageRows = (coverageRows = [], previousMask = null) =>
  coverageRows.map((row, rowIndex) =>
    row.map((coverage, columnIndex) => {
      const wasOn = previousMask?.[rowIndex]?.[columnIndex] ?? false;
      if (wasOn) {
        return coverage >= ASCII_EYE_MASK_THRESHOLDS.off;
      }
      return coverage >= ASCII_EYE_MASK_THRESHOLDS.on;
    }),
  );
const eyeMaskToAsciiRows = (mask = []) =>
  mask.map((row) => row.map((value) => (value ? '█' : ' ')).join(''));
const createLoadingEyeAsciiRows = (mask = [], trail = [], effectTime = 0, side = 'left') => {
  const rows = Array.from({ length: ASCII_EYE_GRID.rows }, () => Array.from({ length: ASCII_EYE_GRID.columns }, () => ' '));
  trail.forEach((cell) => {
    if (!mask[cell.rowIndex]?.[cell.columnIndex]) return;
    rows[cell.rowIndex][cell.columnIndex] = getLoadingTrailGlyph(cell, cell.alpha, effectTime, side);
  });
  return rows.map((row) => row.join(''));
};
const mapEyePresetToPose = (preset = {}) => {
  const mood = preset.mood ?? 'neutral';
  const shared = {
    open: clampUnit(preset.open ?? 0.72),
    shiftX: THREE.MathUtils.clamp((preset.pupilX ?? 0) * 0.24, -0.22, 0.22),
    shiftY: THREE.MathUtils.clamp((preset.pupilY ?? 0) * 0.14, -0.16, 0.16),
    glitch: clampUnit(preset.glitch ?? 0),
    tear: clampUnit(preset.tear ?? 0),
    winkSide: preset.wink ?? null,
    label: preset.label ?? 'Eye',
    mood,
  };

  switch (mood) {
    case 'blink':
      return createEyePose({ ...shared, open: 0.035, width: 0.98, height: 0.2, squeeze: 0.34, curve: 1.28, flatness: 0.84 });
    case 'twinkle':
      return createEyePose({ ...shared, width: 1.01, height: 1.8, squeeze: 0.01, curve: 0.86, flatness: 0.44, capsuleBlend: 1 });
    case 'loading':
      return createEyePose({ ...shared, width: 1.01, height: 1.8, squeeze: 0.01, curve: 0.86, flatness: 0.44, capsuleBlend: 1 });
    case 'moving':
      return createEyePose({ ...shared, width: 1.01, height: 1.8, squeeze: 0.01, curve: 0.86, flatness: 0.44, capsuleBlend: 1 });
    case 'die':
      return createEyePose({ ...shared, open: 0.52, width: 0.95, height: 1.2, squeeze: 0.15, curve: 0.9, flatness: 0.5, scanlineGlitch: 0.7 });
    case 'wink':
      return createEyePose({ ...shared, width: 1.01, height: 1.8, squeeze: 0.01, curve: 0.86, flatness: 0.44, capsuleBlend: 1 });
    case 'sleepy':
      return createEyePose({ ...shared, width: 1.01, height: 0.48, squeeze: 0.34, curve: 1.08, flatness: 0.74 });
    default:
      return createEyePose({ ...shared, width: 1.01, height: 1.8, squeeze: 0.01, curve: 0.86, flatness: 0.44, capsuleBlend: 1 });
  }
};
const getEyePreset = (frameIndex = 0) => EYE_FRAME_LIBRARY[clampSpriteFrame(frameIndex, EYE_FRAME_LIBRARY.length)] ?? EYE_FRAME_LIBRARY[0];
const createEyePoseFromFrame = (frameIndex = 0) => mapEyePresetToPose(getEyePreset(frameIndex));
const evaluateEyeSampleCoverage = (pose, side, sampleColumn, sampleRow, time = 0) => {
  const totalColumns = ASCII_EYE_GRID.columns * ASCII_EYE_GRID.sampleColumnsPerCell;
  const totalRows = ASCII_EYE_GRID.rows * ASCII_EYE_GRID.sampleRowsPerCell;
  const sideSign = side === 'left' ? 1 : -1;

  const normalizedX = ((sampleColumn + 0.5) / totalColumns) * 2 - 1 - (pose.shiftX ?? 0);
  const normalizedY = ((sampleRow + 0.5) / totalRows) * 2 - 1 - (pose.shiftY ?? 0);

  if (pose.mood === 'die') {
    const scale = 0.7;
    const nx = normalizedX / scale;
    const ny = normalizedY / scale;
    const thickness = 0.18;
    const diag1 = Math.abs(nx - ny) / Math.SQRT2;
    const diag2 = Math.abs(nx + ny) / Math.SQRT2;
    if (Math.abs(nx) > 1 || Math.abs(ny) > 1) return 0;
    return (diag1 <= thickness || diag2 <= thickness) ? 1 : 0;
  }

  if (pose.mood === 'loading') {
    const w = Math.max(0.35, pose.width ?? 1.01);
    const lx = normalizedX / w;
    const absLx = Math.abs(lx);
    const neutralOpen = 0.72;
    const hh = Math.max(0.06, (0.11 + neutralOpen * 0.56) * Math.max(0.22, pose.height ?? 1.8));
    const flat = THREE.MathUtils.clamp(pose.flatness ?? 0.44, 0, 0.92);
    const ly = normalizedY / hh;
    const absLy = Math.abs(ly);
    let wf = 1;
    if (absLy > flat) {
      const ct = (absLy - flat) / Math.max(0.001, 1 - flat);
      wf = Math.sqrt(Math.max(0, 1 - ct * ct));
    }
    const csq = (pose.squeeze ?? 0.01) * absLy * 0.12;
    const edge = Math.max(0, wf - csq);
    const pxPerLx = w * ASCII_EYE_GRID.columns * 0.5;
    const pxPerLy = hh * ASCII_EYE_GRID.rows * 0.5;
    const insideX = edge - absLx;
    const insideY = 1 - absLy;
    const isInside = insideX > 0 && insideY > 0;
    let pixelDist;
    if (isInside) {
      pixelDist = -Math.min(insideX * pxPerLx, insideY * pxPerLy);
    } else if (insideX <= 0 && insideY <= 0) {
      pixelDist = Math.sqrt((-insideX * pxPerLx) ** 2 + (-insideY * pxPerLy) ** 2);
    } else if (insideX <= 0) {
      pixelDist = -insideX * pxPerLx;
    } else {
      pixelDist = -insideY * pxPerLy;
    }
    const thicknessCells = 1.8;
    if (!isInside) return 0;
    if (-pixelDist > thicknessCells) return 0;
    const angle = ((Math.atan2(ly, lx) + Math.PI * 2.5) % (Math.PI * 2)) / (Math.PI * 2);
    const head = ((time * 0.38) % 1);
    let diff = angle - head;
    if (diff < 0) diff += 1;
    const segmentLen = 0.65;
    if (diff > segmentLen) return 0;
    return 1;
  }

  const effectiveWidth = Math.max(0.35, pose.width ?? 1.04);
  const localX = normalizedX / effectiveWidth;
  const winkFactor = pose.winkSide === side ? 0.08 : 1;
  const blinkFactor = 1 - clampUnit((pose.blinkClosure ?? 0) * 0.96);
  const effectiveOpen = Math.max(0.012, clampUnit(pose.open ?? 0.72) * winkFactor * blinkFactor);
  if (Math.abs(localX) > 1) return 0;
  const curve = Math.max(0.18, pose.curve ?? 0.86);
  const absLocalX = Math.abs(localX);
  const flatness = THREE.MathUtils.clamp(pose.flatness ?? 0.44, 0, 0.92);
  const capsuleBlend = clampUnit(pose.capsuleBlend ?? 0);
  let arch = 1;
  if (absLocalX > flatness) {
    const edgeT = (absLocalX - flatness) / Math.max(0.001, 1 - flatness);
    arch = Math.pow(Math.max(0, 1 - edgeT * edgeT), Math.max(0.62, curve));
  }
  const halfHeight = Math.max(0.06, (0.11 + effectiveOpen * 0.56) * Math.max(0.22, pose.height ?? 1.8));
  const slantOffset = (pose.slant ?? 0) * sideSign * localX * 0.22;
  const squeezeOffset = (pose.squeeze ?? 0) * localX * localX * 0.16;

  const blinkCurveDir = pose.mood === 'sleepy' ? -0.85 : pose.mood === 'blink' ? 0.7
    : clampUnit((clampUnit(pose.blinkClosure ?? 0) - 0.2) / 0.8) * 0.5;
  const closeFactor = clampUnit(1 - effectiveOpen / 0.15);
  const smileArc = Math.pow(Math.max(0, 1 - absLocalX * absLocalX), 0.5);
  const closedCurveY = -blinkCurveDir * (0.04 + smileArc * 0.35) * closeFactor;

  const closedSlitHalf = 0.11;
  const top = lerp(-arch * halfHeight, closedCurveY - closedSlitHalf, closeFactor) + slantOffset + squeezeOffset;
  const bottom = lerp(arch * halfHeight, closedCurveY + closedSlitHalf, closeFactor) + slantOffset - squeezeOffset;
  const archCoverage = normalizedY >= top && normalizedY <= bottom ? 1 : 0;
  const localY = (normalizedY - slantOffset - closedCurveY * closeFactor) / Math.max(halfHeight * (1 - closeFactor * 0.8), 0.02);
  const absLocalY = Math.abs(localY);
  let capsuleCoverage = 0;
  if (absLocalY <= 1) {
    let widthFactor = 1;
    if (absLocalY > flatness) {
      const capT = (absLocalY - flatness) / Math.max(0.001, 1 - flatness);
      widthFactor = Math.sqrt(Math.max(0, 1 - capT * capT));
    }
    const capsuleSqueeze = (pose.squeeze ?? 0) * absLocalY * 0.12;
    capsuleCoverage = absLocalX <= Math.max(0, widthFactor - capsuleSqueeze) ? 1 : 0;
  }

  let coverage = capsuleBlend >= 0.999 ? capsuleCoverage : archCoverage * (1 - capsuleBlend) + capsuleCoverage * capsuleBlend;
  coverage = coverage >= 0.5 ? 1 : 0;

  if (coverage > 0 && (pose.glitch ?? 0) > 0.06) {
    const noise = Math.sin((sampleColumn + 1 + time * 22) * 0.73 + (sampleRow + 1) * 1.13 + sideSign * 0.97) * 0.5 + 0.5;
    coverage *= noise > 0.16 + (1 - clampUnit(pose.glitch)) * 0.56 ? 1 : 0;
  }

  if (!coverage && (pose.tear ?? 0) > 0.06 && side === 'right') {
    const tearX = 0.62 * effectiveWidth;
    const tearY = 0.48 + clampUnit(pose.tear) * 0.08;
    const dx = (normalizedX - tearX) / 0.09;
    const dy = (normalizedY - tearY) / 0.14;
    if (dx * dx + dy * dy <= 1) {
      coverage = clampUnit(pose.tear);
    }
  }

  return coverage;
};
const rasterizeEyePoseToCoverage = (pose, side, time = 0) => {
  const coverageRows = [];

  for (let row = 0; row < ASCII_EYE_GRID.rows; row += 1) {
    const coverageRow = [];

    for (let col = 0; col < ASCII_EYE_GRID.columns; col += 1) {
      let filledSamples = 0;
      const totalSamples = ASCII_EYE_GRID.sampleColumnsPerCell * ASCII_EYE_GRID.sampleRowsPerCell;

      for (let sampleRow = 0; sampleRow < ASCII_EYE_GRID.sampleRowsPerCell; sampleRow += 1) {
        for (let sampleCol = 0; sampleCol < ASCII_EYE_GRID.sampleColumnsPerCell; sampleCol += 1) {
          const sampleColumnIndex = col * ASCII_EYE_GRID.sampleColumnsPerCell + sampleCol;
          const sampleRowIndex = row * ASCII_EYE_GRID.sampleRowsPerCell + sampleRow;
          filledSamples += evaluateEyeSampleCoverage(pose, side, sampleColumnIndex, sampleRowIndex, time);
        }
      }

      coverageRow.push(filledSamples / totalSamples);
    }

    coverageRows.push(coverageRow);
  }

  if ((pose.scanlineGlitch ?? 0) > 0) {
    applyScanlineGlitch(coverageRows, pose.scanlineGlitch, time);
  }

  return coverageRows;
};
const applyScanlineGlitch = (coverageRows, intensity, time) => {
  const columns = coverageRows[0]?.length ?? 0;
  const tick = Math.floor(time * 2.5);
  const burstSeed = ((tick * 73) % 47) / 47;
  if (burstSeed > 0.35) return;

  const rowCount = coverageRows.length;
  const glitchA = ((tick * 197) % rowCount);
  const glitchB = ((tick * 83 + 7) % rowCount);
  const glitchC = ((tick * 251 + 13) % rowCount);

  for (let row = 0; row < rowCount; row += 1) {
    if (row !== glitchA && row !== glitchB && row !== glitchC) continue;
    const dir = ((row * 53 + tick * 179) % 37) > 18 ? 1 : -1;
    const mag = 0.5;
    const shift = dir * Math.round(mag * intensity * columns * 0.35);
    const original = [...coverageRows[row]];
    for (let col = 0; col < columns; col += 1) {
      const src = col - shift;
      coverageRows[row][col] = (src >= 0 && src < columns) ? original[src] : 0;
    }
  }
};
const coverageRowsToAscii = (coverageRows = []) =>
  coverageRows.map((row) => row.map((coverage) => quantizeCoverageToAscii(coverage)).join(''));
const getAsciiExpressionEyeRows = (pose = {}, side = 'left', previousMask = null) =>
  eyeMaskToAsciiRows(quantizeEyeCoverageRows(rasterizeEyePoseToCoverage(pose, side, pose.time ?? 0), previousMask));
const getAsciiExpressionEyePreview = (pose = {}, eyeMasks = null) => {
  const effectTime = pose?.time ?? 0;
  const leftRows =
    eyeMasks?.leftTrail && eyeMasks?.left
      ? createLoadingEyeAsciiRows(eyeMasks.left, eyeMasks.leftTrail, effectTime, 'left')
      : eyeMasks?.left
        ? eyeMaskToAsciiRows(eyeMasks.left)
        : getAsciiExpressionEyeRows(pose, 'left');
  const rightRows =
    eyeMasks?.rightTrail && eyeMasks?.right
      ? createLoadingEyeAsciiRows(eyeMasks.right, eyeMasks.rightTrail, effectTime, 'left')
      : eyeMasks?.right
        ? eyeMaskToAsciiRows(eyeMasks.right)
        : leftRows;
  return Array.from({ length: ASCII_EXPRESSION_EYE_TOTAL_HEIGHT }, (_, index) => `${leftRows[index]}${ASCII_EXPRESSION_EYE_GAP}${rightRows[index]}`);
};
const createEmptyAsciiMask = (rows, columns) =>
  Array.from({ length: rows }, () => Array.from({ length: columns }, () => false));
const setAsciiMaskCell = (mask, x, y) => {
  const targetX = Math.round(x);
  const targetY = Math.round(y);
  if (
    targetX < 0 ||
    targetY < 0 ||
    targetY >= mask.length ||
    targetX >= (mask[0]?.length ?? 0)
  ) {
    return;
  }
  mask[targetY][targetX] = true;
};
const fillAsciiMaskRect = (mask, x, y, width = 1, height = 1) => {
  for (let offsetY = 0; offsetY < height; offsetY += 1) {
    for (let offsetX = 0; offsetX < width; offsetX += 1) {
      setAsciiMaskCell(mask, x + offsetX, y + offsetY);
    }
  }
};
const drawAsciiMaskLine = (mask, x0, y0, x1, y1, thickness = 1) => {
  const deltaX = Math.abs(x1 - x0);
  const deltaY = Math.abs(y1 - y0);
  const steps = Math.max(deltaX, deltaY, 1);
  const offset = Math.floor(Math.max(1, thickness) / 2);

  for (let index = 0; index <= steps; index += 1) {
    const t = index / steps;
    const x = Math.round(lerp(x0, x1, t));
    const y = Math.round(lerp(y0, y1, t));
    fillAsciiMaskRect(mask, x - offset, y - offset, thickness, thickness);
  }
};
const outlineAsciiMaskEllipse = (mask, centerX, centerY, radiusX, radiusY, thickness = 1) => {
  for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 48) {
    const x = centerX + Math.cos(angle) * radiusX;
    const y = centerY + Math.sin(angle) * radiusY;
    fillAsciiMaskRect(mask, Math.round(x), Math.round(y), thickness, thickness);
  }
};
const fillAsciiMaskEllipse = (mask, centerX, centerY, radiusX, radiusY) => {
  for (let offsetY = -radiusY; offsetY <= radiusY; offsetY += 1) {
    for (let offsetX = -radiusX; offsetX <= radiusX; offsetX += 1) {
      const sample = (offsetX * offsetX) / Math.max(radiusX * radiusX, 1) + (offsetY * offsetY) / Math.max(radiusY * radiusY, 1);
      if (sample <= 1) {
        setAsciiMaskCell(mask, centerX + offsetX, centerY + offsetY);
      }
    }
  }
};
const combineAsciiMasks = (...masks) => {
  const rows = masks.find((mask) => mask?.length)?.length ?? 0;
  const columns = masks.find((mask) => mask?.[0]?.length)?.[0]?.length ?? 0;
  const combined = createEmptyAsciiMask(rows, columns);

  masks.forEach((mask) => {
    if (!mask) return;
    mask.forEach((row, rowIndex) => {
      row.forEach((isFilled, columnIndex) => {
        if (isFilled) combined[rowIndex][columnIndex] = true;
      });
    });
  });

  return combined;
};
const asciiMaskToRows = (mask = []) => mask.map((row) => row.map((value) => (value ? '█' : ' ')).join(''));
const getAsciiMaskBounds = (mask = []) => {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  mask.forEach((row, rowIndex) => {
    row.forEach((isFilled, columnIndex) => {
      if (!isFilled) return;
      minX = Math.min(minX, columnIndex);
      minY = Math.min(minY, rowIndex);
      maxX = Math.max(maxX, columnIndex);
      maxY = Math.max(maxY, rowIndex);
    });
  });

  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return null;
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
};
const padAsciiMaskBounds = (bounds, columns, rows, padX = 1, padY = 1) => {
  if (!bounds) return null;
  const minX = Math.max(0, bounds.minX - padX);
  const minY = Math.max(0, bounds.minY - padY);
  const maxX = Math.min(columns - 1, bounds.maxX + padX);
  const maxY = Math.min(rows - 1, bounds.maxY + padY);
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
};
const trimAsciiRows = (rows = []) => {
  let start = 0;
  let end = rows.length - 1;

  while (start <= end && !rows[start].includes('█')) start += 1;
  while (end >= start && !rows[end].includes('█')) end -= 1;

  return start > end ? [''] : rows.slice(start, end + 1);
};

const createLogicalCanvas = (width, height) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
};

const clearLogicalCanvas = (context) => {
  context.clearRect(0, 0, context.canvas.width, context.canvas.height);
  context.imageSmoothingEnabled = false;
};

const plotPixel = (context, x, y, color, alpha = 1) => {
  const targetX = Math.round(x);
  const targetY = Math.round(y);
  if (
    targetX < 0 ||
    targetY < 0 ||
    targetX >= context.canvas.width ||
    targetY >= context.canvas.height
  ) {
    return;
  }

  const previousAlpha = context.globalAlpha;
  context.globalAlpha = alpha;
  context.fillStyle = color;
  context.fillRect(targetX, targetY, 1, 1);
  context.globalAlpha = previousAlpha;
};

const plotBlock = (context, x, y, width, height, color, alpha = 1) => {
  for (let offsetY = 0; offsetY < height; offsetY += 1) {
    for (let offsetX = 0; offsetX < width; offsetX += 1) {
      plotPixel(context, x + offsetX, y + offsetY, color, alpha);
    }
  }
};
const getEyeMaskCells = (mask = []) => {
  const cells = [];
  mask.forEach((row, rowIndex) => {
    row.forEach((isFilled, columnIndex) => {
      if (isFilled) cells.push({ rowIndex, columnIndex });
    });
  });
  return cells;
};
const getEyeMaskCenter = (mask = []) => {
  const cells = getEyeMaskCells(mask);
  if (!cells.length) return null;

  const total = cells.reduce(
    (accumulator, cell) => ({
      x: accumulator.x + cell.columnIndex,
      y: accumulator.y + cell.rowIndex,
    }),
    { x: 0, y: 0 },
  );

  return {
    columnIndex: Math.round(total.x / cells.length),
    rowIndex: Math.round(total.y / cells.length),
  };
};
const getEyeMaskBounds = (mask = []) => {
  const cells = getEyeMaskCells(mask);
  if (!cells.length) return null;

  const columns = cells.map((cell) => cell.columnIndex);
  const rows = cells.map((cell) => cell.rowIndex);
  return {
    minColumn: Math.min(...columns),
    maxColumn: Math.max(...columns),
    minRow: Math.min(...rows),
    maxRow: Math.max(...rows),
    width: Math.max(...columns) - Math.min(...columns) + 1,
    height: Math.max(...rows) - Math.min(...rows) + 1,
  };
};
const createEyeOutlineMask = (mask = [], thickness = 1) => {
  const boundaryMask = mask.map((row, rowIndex) =>
    row.map((isFilled, columnIndex) => {
      if (!isFilled) return false;
      const neighbors = [
        mask[rowIndex - 1]?.[columnIndex],
        mask[rowIndex + 1]?.[columnIndex],
        mask[rowIndex]?.[columnIndex - 1],
        mask[rowIndex]?.[columnIndex + 1],
      ];
      return neighbors.some((neighbor) => !neighbor);
    }),
  );
  if (thickness <= 1) return boundaryMask;

  return mask.map((row, rowIndex) =>
    row.map((isFilled, columnIndex) => {
      if (!isFilled) return false;
      for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          if (!boundaryMask[rowIndex + offsetY]?.[columnIndex + offsetX]) continue;
          return true;
        }
      }
      return false;
    }),
  );
};
const getLoadingStrokeCells = (mask = [], effectTime = 0, side = 'left') => {
  const outlineMask = createEyeOutlineMask(mask, 2);
  const outlineCells = getEyeMaskCells(outlineMask);
  const center = getEyeMaskCenter(mask);
  const bounds = getEyeMaskBounds(mask);
  if (!outlineCells.length || !center || !bounds) {
    return { outlineMask, segmentMask: outlineMask, trail: [] };
  }

  const normalizedCells = outlineCells
    .map((cell) => {
      const x = (cell.columnIndex - center.columnIndex) / Math.max(1, bounds.width * 0.5);
      const y = (cell.rowIndex - center.rowIndex) / Math.max(1, bounds.height * 0.5);
      const angle = (Math.atan2(y, x) + Math.PI * 0.5 + Math.PI * 2) % (Math.PI * 2);
      return { ...cell, angle };
    })
    .sort((a, b) => a.angle - b.angle);

  const total = normalizedCells.length;
  const head = Math.floor((((effectTime * 0.38) + (side === 'left' ? 0.04 : 0.54)) % 1) * total);
  const segmentLength = Math.max(12, Math.round(total * 1));
  const segmentMask = createEmptyEyeMask();
  const trail = [];

  for (let index = 0; index < segmentLength; index += 1) {
    const cell = normalizedCells[(head + index) % total];
    const alpha = THREE.MathUtils.lerp(1, 0.3, (segmentLength - 1 - index) / Math.max(1, segmentLength - 1));
    segmentMask[cell.rowIndex][cell.columnIndex] = true;
    trail.push({ ...cell, alpha });
  }

  return { outlineMask, segmentMask, trail };
};
const createLoadingEyeAsset = ({ left, right } = {}, effectTime = 0) => {
  const leftStroke = getLoadingStrokeCells(left, effectTime, 'left');
  const rightStroke = getLoadingStrokeCells(right, effectTime, 'left');
  return {
    left: leftStroke.segmentMask,
    right: rightStroke.segmentMask,
    leftTrail: leftStroke.trail,
    rightTrail: rightStroke.trail,
  };
};
const getLoadingTrailVariant = (cell, baseAlpha = 1, effectTime = 0, side = 'left') => {
  const clampedBase = THREE.MathUtils.clamp(baseAlpha, 0.8, 1);
  if (clampedBase >= 0.96) return 'solid';
  if (clampedBase >= 0.9) return 'dense';
  const sideOffset = side === 'left' ? 11 : 23;
  const phase = Math.floor(effectTime * 10);
  const hash = Math.abs(((cell.columnIndex + sideOffset) * 17 + (cell.rowIndex + phase) * 31 + sideOffset * 7) % 5);
  const stepped = Math.round(((clampedBase - 0.8) / 0.2) * 2);
  const biased = THREE.MathUtils.clamp(stepped + (hash === 0 ? -1 : hash >= 3 ? 1 : 0), 0, 2);
  if (biased >= 2) return 'solid';
  if (biased === 1) return 'dense';
  return 'light';
};
const shouldRenderLoadingTrailCell = (cell, variant = 'solid', effectTime = 0, side = 'left') => {
  const sideOffset = side === 'left' ? 5 : 9;
  const phase = Math.floor(effectTime * 10);
  const hash = Math.abs(((cell.columnIndex + sideOffset) * 13 + (cell.rowIndex + phase) * 19 + sideOffset * 3) % 4);
  if (variant === 'solid') return true;
  if (variant === 'dense') return hash !== 0;
  return hash === 0 || hash === 2;
};
const getLoadingTrailGlyph = (cell, baseAlpha = 1, effectTime = 0, side = 'left') => {
  const variant = getLoadingTrailVariant(cell, baseAlpha, effectTime, side);
  if (variant === 'solid') return '█';
  if (variant === 'dense') return '▓';
  return '▒';
};
const getSparkleStarOffsets = (phase = 0) => {
  if (phase <= 0) return [];
  if (phase === 1) {
    return [
      { x: 0, y: 0, alpha: 1 },
      { x: -1, y: 0, alpha: 1 },
      { x: 1, y: 0, alpha: 1 },
      { x: 0, y: -1, alpha: 1 },
      { x: 0, y: 1, alpha: 1 },
    ];
  }
  if (phase === 2) {
    return [
      { x: 0, y: 0, alpha: 1 },
      { x: -1, y: 0, alpha: 1 },
      { x: 1, y: 0, alpha: 1 },
      { x: 0, y: -1, alpha: 1 },
      { x: 0, y: 1, alpha: 1 },
      { x: -2, y: 0, alpha: 0.94 },
      { x: 2, y: 0, alpha: 0.94 },
      { x: 0, y: -2, alpha: 0.94 },
      { x: 0, y: 2, alpha: 0.94 },
      { x: -1, y: -1, alpha: 0.82 },
      { x: 1, y: -1, alpha: 0.82 },
      { x: -1, y: 1, alpha: 0.82 },
      { x: 1, y: 1, alpha: 0.82 },
    ];
  }
  if (phase === 3) {
    return [
      { x: 0, y: 0, alpha: 1 },
      { x: -1, y: 0, alpha: 1 },
      { x: 1, y: 0, alpha: 1 },
      { x: 0, y: -1, alpha: 1 },
      { x: 0, y: 1, alpha: 1 },
      { x: -2, y: 0, alpha: 0.96 },
      { x: 2, y: 0, alpha: 0.96 },
      { x: 0, y: -2, alpha: 0.96 },
      { x: 0, y: 2, alpha: 0.96 },
      { x: -3, y: 0, alpha: 0.78 },
      { x: 3, y: 0, alpha: 0.78 },
      { x: 0, y: -3, alpha: 0.78 },
      { x: 0, y: 3, alpha: 0.78 },
      { x: -1, y: -1, alpha: 0.86 },
      { x: 1, y: -1, alpha: 0.86 },
      { x: -1, y: 1, alpha: 0.86 },
      { x: 1, y: 1, alpha: 0.86 },
    ];
  }
  return [
    { x: 0, y: 0, alpha: 1 },
    { x: -1, y: 0, alpha: 1 },
    { x: 1, y: 0, alpha: 1 },
    { x: 0, y: -1, alpha: 1 },
    { x: 0, y: 1, alpha: 1 },
    { x: -2, y: 0, alpha: 0.96 },
    { x: 2, y: 0, alpha: 0.96 },
    { x: 0, y: -2, alpha: 0.96 },
    { x: 0, y: 2, alpha: 0.96 },
    { x: -3, y: 0, alpha: 0.82 },
    { x: 3, y: 0, alpha: 0.82 },
    { x: 0, y: -3, alpha: 0.82 },
    { x: 0, y: 3, alpha: 0.82 },
    { x: -1, y: -1, alpha: 0.88 },
    { x: 1, y: -1, alpha: 0.88 },
    { x: -1, y: 1, alpha: 0.88 },
    { x: 1, y: 1, alpha: 0.88 },
    { x: -2, y: -1, alpha: 0.68 },
    { x: 2, y: -1, alpha: 0.68 },
    { x: -2, y: 1, alpha: 0.68 },
    { x: 2, y: 1, alpha: 0.68 },
    { x: -1, y: -2, alpha: 0.68 },
    { x: 1, y: -2, alpha: 0.68 },
    { x: -1, y: 2, alpha: 0.68 },
    { x: 1, y: 2, alpha: 0.68 },
  ];
};
const plotEyeMaskCell = (context, startX, startY, cellWidth, cellHeight, columnIndex, rowIndex, color, alpha = 1) => {
  plotBlock(context, startX + columnIndex * cellWidth, startY + rowIndex * cellHeight, cellWidth, cellHeight, color, alpha);
};
const renderLoadingEyeHighlight = (context, asciiState, eyeMask, startX, startY, cellWidth, cellHeight, effectTime = 0, side = 'left') => {
  const bounds = getEyeMaskBounds(eyeMask);
  if (!bounds) return;

  const centerX = bounds.minColumn + (bounds.width - 1) * 0.5;
  const centerY = bounds.minRow + (bounds.height - 1) * 0.5;
  const radiusX = Math.max(2, Math.round(bounds.width * 0.36));
  const radiusY = Math.max(2, Math.round(bounds.height * 0.36));
  const baseAngle = effectTime * 4.8 + (side === 'left' ? 0.24 : 0.72);
  const trail = [0, -0.34, -0.68];

  trail.forEach((offset, index) => {
    const angle = baseAngle + offset;
    const columnIndex = THREE.MathUtils.clamp(Math.round(centerX + Math.cos(angle) * radiusX), 0, ASCII_EYE_GRID.columns - 1);
    const rowIndex = THREE.MathUtils.clamp(Math.round(centerY + Math.sin(angle) * radiusY), 0, ASCII_EYE_GRID.rows - 1);
    plotEyeMaskCell(context, startX, startY, cellWidth, cellHeight, columnIndex, rowIndex, asciiState.highlightColor, 1 - index * 0.28);
  });
};
const renderTwinkleEyeHighlight = (
  context,
  asciiState,
  eyeMask,
  startX,
  startY,
  cellWidth,
  cellHeight,
  effectTime = 0,
  side = 'left',
  orientationSide = side,
) => {
  const bounds = getEyeMaskBounds(eyeMask);
  if (!bounds) return;

  const renderSparkle = (anchorX, anchorY, flashBand) => {
    if (flashBand <= 0) return;
    getSparkleStarOffsets(flashBand).forEach((offset) => {
      const columnIndex = THREE.MathUtils.clamp(anchorX + offset.x, 0, ASCII_EYE_GRID.columns - 1);
      const rowIndex = THREE.MathUtils.clamp(anchorY + offset.y, 0, ASCII_EYE_GRID.rows - 1);
      if (!eyeMask[rowIndex]?.[columnIndex]) return;
      plotEyeMaskCell(context, startX, startY, cellWidth, cellHeight, columnIndex, rowIndex, asciiState.highlightColor, offset.alpha ?? 1);
    });
  };
  const primaryAnchorX =
    orientationSide === 'left'
      ? bounds.minColumn + Math.round(bounds.width * 0.62)
      : bounds.minColumn + Math.round(bounds.width * 0.38);
  const primaryAnchorY = bounds.minRow + Math.round(bounds.height * 0.54);
  const secondaryAnchorX =
    orientationSide === 'left'
      ? bounds.minColumn + Math.round(bounds.width * 0.34)
      : bounds.minColumn + Math.round(bounds.width * 0.66);
  const secondaryAnchorY = bounds.minRow + Math.round(bounds.height * 0.24);
  const primaryTwinklePhase = Math.sin(effectTime * 9.2 + (orientationSide === 'left' ? 0.22 : 0.58)) * 0.5 + 0.5;
  const secondaryTwinklePhase = Math.sin(effectTime * 9.2 + (orientationSide === 'left' ? 1.18 : 1.54)) * 0.5 + 0.5;
  const getFlashBand = (phase) =>
    phase > 0.86
      ? 3
      : phase > 0.68
        ? 2
        : phase > 0.5
          ? 1
          : 0;
  const secondaryFlashBand = getFlashBand(secondaryTwinklePhase);

  const primaryFlashBand = getFlashBand(primaryTwinklePhase);

  renderSparkle(primaryAnchorX, primaryAnchorY, primaryFlashBand > 0 ? Math.min(4, primaryFlashBand + 1) : 0);
  renderSparkle(secondaryAnchorX, secondaryAnchorY, secondaryFlashBand > 0 ? Math.max(1, secondaryFlashBand - 1) : 0);
};
const renderAnimatedEyeHighlight = (
  context,
  asciiState,
  eyeMask,
  highlightMask,
  startX,
  startY,
  cellWidth,
  cellHeight,
  { preset = null, side = 'left', effectTime = 0 } = {},
) => {
  const isTwinkle = preset?.label === 'Twinkle' && (preset?.sparkle ?? 0) > 0.4;
  if (isTwinkle && eyeMask) {
    const orientationSide = isEyePresetAsymmetric(preset) ? side : 'left';
    renderTwinkleEyeHighlight(context, asciiState, eyeMask, startX, startY, cellWidth, cellHeight, effectTime, side, orientationSide);
  }
  if (!highlightMask) return;

  highlightMask.forEach((row, rowIndex) => {
    row.forEach((isFilled, columnIndex) => {
      if (!isFilled) return;
      plotEyeMaskCell(context, startX, startY, cellWidth, cellHeight, columnIndex, rowIndex, asciiState.highlightColor, 1);
    });
  });
};

const drawRasterLine = (context, x0, y0, x1, y1, color, thickness = 1, alpha = 1) => {
  const deltaX = Math.abs(x1 - x0);
  const deltaY = Math.abs(y1 - y0);
  const steps = Math.max(deltaX, deltaY, 1);

  for (let index = 0; index <= steps; index += 1) {
    const t = index / steps;
    const x = Math.round(lerp(x0, x1, t));
    const y = Math.round(lerp(y0, y1, t));
    plotBlock(context, x, y, thickness, thickness, color, alpha);
  }
};

const fillRasterEllipse = (context, centerX, centerY, radiusX, radiusY, color, alpha = 1) => {
  for (let offsetY = -radiusY; offsetY <= radiusY; offsetY += 1) {
    for (let offsetX = -radiusX; offsetX <= radiusX; offsetX += 1) {
      const sample = (offsetX * offsetX) / Math.max(radiusX * radiusX, 1) + (offsetY * offsetY) / Math.max(radiusY * radiusY, 1);
      if (sample <= 1) {
        plotPixel(context, centerX + offsetX, centerY + offsetY, color, alpha);
      }
    }
  }
};

const outlineRasterEllipse = (context, centerX, centerY, radiusX, radiusY, color, alpha = 1) => {
  for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 48) {
    const x = centerX + Math.cos(angle) * radiusX;
    const y = centerY + Math.sin(angle) * radiusY;
    plotPixel(context, x, y, color, alpha);
  }
};

const formatEffectSummary = (parts) => parts.filter(Boolean).join(' · ');

const getPixelFrameLibrary = (layerType) => (layerType === 'eyes' ? EYE_FRAME_LIBRARY : MOUTH_FRAME_LIBRARY);
const centerAsciiRow = (text = '', width = 9) => {
  const chars = [...String(text)];
  if (chars.length >= width) return chars.slice(0, width).join('');

  const padding = width - chars.length;
  const leftPadding = Math.floor(padding / 2);
  const rightPadding = padding - leftPadding;
  return `${' '.repeat(leftPadding)}${chars.join('')}${' '.repeat(rightPadding)}`;
};
const MOUTH_COVERAGE_THRESHOLD = 0.5;

const evaluateMouthSampleCoverage = (mood, sampleCol, sampleRow) => {
  const totalCols = ASCII_MOUTH_GRID.columns * ASCII_MOUTH_GRID.sampleColumnsPerCell;
  const totalRows = ASCII_MOUTH_GRID.rows * ASCII_MOUTH_GRID.sampleRowsPerCell;
  const nx = ((sampleCol + 0.5) / totalCols) * 2 - 1;
  const ny = ((sampleRow + 0.5) / totalRows) * 2 - 1;

  switch (mood) {
    case 'rest':
      return evaluateMouthRest(nx, ny);
    case 'smile':
      return evaluateMouthSmile(nx, ny);
    case 'o':
      return evaluateMouthO(nx, ny);
    case 'ah':
      return evaluateMouthAh(nx, ny);
    case 'sad':
      return evaluateMouthSad(nx, ny);
    case 'woo':
      return evaluateMouthWoo(nx, ny);
    default:
      return evaluateMouthRest(nx, ny);
  }
};

const MOUTH_HALF_THICKNESS_CELLS = 1.2;
const MOUTH_PX_PER_NX = ASCII_MOUTH_GRID.columns * 0.5;
const MOUTH_PX_PER_NY = ASCII_MOUTH_GRID.rows * 0.5;

const mouthStrokePixel = (dist, gradNx, gradNy) => {
  const gLen = Math.sqrt((gradNx * MOUTH_PX_PER_NX) ** 2 + (gradNy * MOUTH_PX_PER_NY) ** 2);
  const pixelDist = Math.abs(dist) * (gLen > 0.001 ? gLen : MOUTH_PX_PER_NY);
  return pixelDist <= MOUTH_HALF_THICKNESS_CELLS ? 1 : 0;
};

const evaluateMouthRest = (nx, ny) => {
  const ax = Math.abs(nx);
  if (ax > 0.85) return 0;
  return Math.abs(ny) <= 0.09 ? 1 : 0;
};

const evaluateMouthSmile = (nx, ny) => {
  const ax = Math.abs(nx);
  if (ax > 0.72) return 0;
  const t = ax / 0.72;
  const arc = Math.pow(Math.max(0, 1 - t * t), 0.7);
  const curveY = -0.18 + arc * 0.42;
  const edgeThicken = t > 0.7 ? 0.04 : 0;
  return Math.abs(ny - curveY) <= 0.09 + edgeThicken ? 1 : 0;
};

const evaluateMouthO = (nx, ny) => {
  const rx = 0.38;
  const ry = 0.72;
  const dx = nx / rx;
  const dy = ny / ry;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const thickness = 0.3;
  return Math.abs(dist - 1) <= thickness ? 1 : 0;
};

const evaluateMouthAh = (nx, ny) => {
  const rx = 0.82;
  const halfH = 0.92;
  const cy = ny + 0.08;
  if (Math.abs(nx) > rx || cy < -halfH * 0.25 || cy > halfH) return 0;
  if (cy <= 0) return 1;
  const dx = nx / rx;
  const dy = cy / halfH;
  return (dx * dx + dy * dy <= 1) ? 1 : 0;
};

const evaluateMouthSad = (nx, ny) => {
  const ax = Math.abs(nx);
  if (ax > 0.62) return 0;
  const t = ax / 0.62;
  const arc = Math.pow(Math.max(0, 1 - t * t), 0.7);
  const curveY = 0.22 - arc * 0.36;
  const edgeThicken = t > 0.65 ? 0.06 : 0;
  return Math.abs(ny - curveY) <= 0.09 + edgeThicken ? 1 : 0;
};

const evaluateMouthWoo = (nx, ny) => {
  const rx = 0.32;
  const ry = 0.48;
  const dx = nx / rx;
  const dy = ny / ry;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const thickness = 0.38;
  return Math.abs(dist - 1) <= thickness ? 1 : 0;
};

const rasterizeMouthCoverage = (mood) => {
  const coverageRows = [];
  const { columns, rows, sampleColumnsPerCell, sampleRowsPerCell } = ASCII_MOUTH_GRID;
  const totalSamples = sampleColumnsPerCell * sampleRowsPerCell;

  for (let row = 0; row < rows; row += 1) {
    const coverageRow = [];
    for (let col = 0; col < columns; col += 1) {
      let filled = 0;
      for (let sr = 0; sr < sampleRowsPerCell; sr += 1) {
        for (let sc = 0; sc < sampleColumnsPerCell; sc += 1) {
          filled += evaluateMouthSampleCoverage(
            mood,
            col * sampleColumnsPerCell + sc,
            row * sampleRowsPerCell + sr,
          );
        }
      }
      coverageRow.push(filled / totalSamples);
    }
    coverageRows.push(coverageRow);
  }
  return coverageRows;
};

const quantizeMouthCoverageToMask = (coverageRows) =>
  coverageRows.map((row) => row.map((c) => c >= MOUTH_COVERAGE_THRESHOLD));

const blendMouthCoverage = (fromCoverage, toCoverage, alpha) => {
  const { rows, columns } = ASCII_MOUTH_GRID;
  const result = [];
  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < columns; c++) {
      const from = fromCoverage?.[r]?.[c] ?? 0;
      const to = toCoverage?.[r]?.[c] ?? 0;
      row.push(lerp(from, to, alpha));
    }
    result.push(row);
  }
  return result;
};

const ensureMouthMotionState = (asciiState) => {
  if (!asciiState || asciiState.layerType !== 'mouth') return null;
  if (!asciiState.mouthMotion) {
    const mood = MOUTH_FRAME_LIBRARY[asciiState.expressionFrame]?.mood ?? 'rest';
    const coverage = rasterizeMouthCoverage(mood);
    asciiState.mouthMotion = {
      currentMood: mood,
      fromCoverage: coverage,
      toCoverage: coverage,
      blendAlpha: 1,
    };
  }
  return asciiState.mouthMotion;
};

const updateMouthMotionState = (asciiState, delta) => {
  const motion = ensureMouthMotionState(asciiState);
  if (!motion) return;
  const frameIndex = getAsciiVisibleFrame(asciiState);
  const targetMood = MOUTH_FRAME_LIBRARY[clampSpriteFrame(frameIndex, MOUTH_FRAME_LIBRARY.length)]?.mood ?? 'rest';

  if (targetMood !== motion.currentMood) {
    motion.fromCoverage = motion.blendAlpha >= 1
      ? motion.toCoverage
      : blendMouthCoverage(motion.fromCoverage, motion.toCoverage, motion.blendAlpha);
    motion.toCoverage = rasterizeMouthCoverage(targetMood);
    motion.currentMood = targetMood;
    motion.blendAlpha = 0;
  }

  if (motion.blendAlpha < 1) {
    const cyclePreset = activeStatePreset >= 0 ? STATE_PRESETS[activeStatePreset] : null;
    const blendSpeed = cyclePreset?.mouthCycle
      ? (cyclePreset.label === 'talking' ? 5 : 2.2)
      : 8;
    motion.blendAlpha = Math.min(1, motion.blendAlpha + delta * blendSpeed);
  }
  motion.blendEased = motion.blendAlpha < 1
    ? motion.blendAlpha * motion.blendAlpha * (3 - 2 * motion.blendAlpha)
    : 1;
};

const getCurrentMouthMask = (asciiState) => {
  const motion = ensureMouthMotionState(asciiState);
  if (!motion) {
    const frameIndex = getAsciiVisibleFrame(asciiState);
    const mood = MOUTH_FRAME_LIBRARY[clampSpriteFrame(frameIndex, MOUTH_FRAME_LIBRARY.length)]?.mood ?? 'rest';
    return quantizeMouthCoverageToMask(rasterizeMouthCoverage(mood));
  }
  const t = motion.blendEased ?? motion.blendAlpha;
  if (t >= 1) {
    return quantizeMouthCoverageToMask(motion.toCoverage);
  }
  return quantizeMouthCoverageToMask(blendMouthCoverage(motion.fromCoverage, motion.toCoverage, t));
};

const createAsciiMouthMasks = (preset = {}) => {
  const mood = preset.mood ?? 'rest';
  const coverage = rasterizeMouthCoverage(mood);
  const outlineMask = quantizeMouthCoverageToMask(coverage);
  const softMask = createEmptyAsciiMask(ASCII_MOUTH_GRID.rows, ASCII_MOUTH_GRID.columns);
  const highlightMask = createEmptyAsciiMask(ASCII_MOUTH_GRID.rows, ASCII_MOUTH_GRID.columns);
  return { outlineMask, softMask, highlightMask };
};
const getAsciiExpressionMouthRows = (preset = {}, effectTime = 0) => {
  const { outlineMask, softMask, highlightMask } = createAsciiMouthMasks(preset);
  return trimAsciiRows(asciiMaskToRows(combineAsciiMasks(outlineMask, softMask, highlightMask)));
};
const createAsciiExpressionPreview = ({ eyeFrame = 0, mouthFrame = 0, eyePose = null, eyeMasks = null, effectTime = 0 } = {}) => {
  const resolvedEyePose = eyePose ? createEyePose(eyePose) : createEyePoseFromFrame(eyeFrame);
  const resolvedEyeMasks = eyeMasks ?? null;
  const mouthPreset = MOUTH_FRAME_LIBRARY[clampSpriteFrame(mouthFrame, MOUTH_FRAME_LIBRARY.length)] ?? MOUTH_FRAME_LIBRARY[0];
  const mouthRows = getAsciiExpressionMouthRows(mouthPreset, effectTime);

  return [
    ...getAsciiExpressionEyePreview(resolvedEyePose, resolvedEyeMasks),
    ...mouthRows.map((row) => centerAsciiRow(row, ASCII_EXPRESSION_PREVIEW_WIDTH)),
  ].join('\n');
};

const getPixelFramePreset = (asciiState, frameIndex) => {
  const library = getPixelFrameLibrary(asciiState.layerType);
  return library[clampSpriteFrame(frameIndex, library.length)] ?? library[0];
};

const createFrameSummary = (asciiState, frameIndex) => {
  const preset = getPixelFramePreset(asciiState, frameIndex);
  if (asciiState.layerType === 'eyes') {
    return [
      preset.label,
      formatEffectSummary([
        preset.mood,
        ['twinkle', 'loading', 'moving', 'sleepy'].includes(preset.mood) ? 'motion' : '',
        preset.label === 'Wink' ? 'asym' : '',
      ]),
    ].filter(Boolean).join('\n');
  }

  return [preset.label, formatEffectSummary([preset.mood ?? ''])].filter(Boolean).join('\n');
};
const getLoopPhase = (time = 0, period = 2, phase = 0) => {
  const safePeriod = Math.max(0.001, period);
  return (((time + phase) % safePeriod) + safePeriod) % safePeriod;
};
const getLoopBlinkClosure = (time = 0, { period = 2.8, phase = 0, closeDuration = 0.04, holdDuration = 0.05, openDuration = 0.06 } = {}) => {
  const loopTime = getLoopPhase(time, period, phase);
  if (loopTime < closeDuration) {
    return easeInOutSine(loopTime / closeDuration);
  }
  if (loopTime < closeDuration + holdDuration) {
    return 1;
  }
  if (loopTime < closeDuration + holdDuration + openDuration) {
    return 1 - easeInOutSine((loopTime - closeDuration - holdDuration) / openDuration);
  }
  return 0;
};
const getMovingEyeShiftX = (time = 0, phase = 0) => {
  const loop = getLoopPhase(time, 4.0, phase);
  if (loop < 0.40) return -0.22;
  if (loop < 0.52) return lerp(-0.22, 0.20, easeInOutSine((loop - 0.40) / 0.12));
  if (loop < 0.96) return 0.20;
  if (loop < 1.08) return lerp(0.20, -0.04, easeInOutSine((loop - 0.96) / 0.12));
  if (loop < 1.38) return -0.04;
  if (loop < 1.48) return lerp(-0.04, 0.26, easeInOutSine((loop - 1.38) / 0.10));
  if (loop < 1.92) return 0.26;
  if (loop < 2.04) return lerp(0.26, -0.16, easeInOutSine((loop - 1.92) / 0.12));
  if (loop < 2.46) return -0.16;
  if (loop < 2.58) return lerp(-0.16, 0.10, easeInOutSine((loop - 2.46) / 0.12));
  if (loop < 2.96) return 0.10;
  if (loop < 3.10) return lerp(0.10, -0.24, easeInOutSine((loop - 2.96) / 0.14));
  if (loop < 3.54) return -0.24;
  if (loop < 3.70) return lerp(-0.24, 0, easeInOutSine((loop - 3.54) / 0.16));
  return 0;
};
const getMovingEyeShiftY = (time = 0, phase = 0) => {
  const loop = getLoopPhase(time, 4.0, phase + 0.7);
  if (loop < 0.50) return -0.08;
  if (loop < 0.62) return lerp(-0.08, 0.10, easeInOutSine((loop - 0.50) / 0.12));
  if (loop < 1.10) return 0.10;
  if (loop < 1.22) return lerp(0.10, -0.05, easeInOutSine((loop - 1.10) / 0.12));
  if (loop < 1.80) return -0.05;
  if (loop < 1.92) return lerp(-0.05, 0.12, easeInOutSine((loop - 1.80) / 0.12));
  if (loop < 2.40) return 0.12;
  if (loop < 2.54) return lerp(0.12, -0.08, easeInOutSine((loop - 2.40) / 0.14));
  if (loop < 3.10) return -0.08;
  if (loop < 3.26) return lerp(-0.08, 0.04, easeInOutSine((loop - 3.10) / 0.16));
  if (loop < 3.70) return 0.04;
  if (loop < 3.86) return lerp(0.04, 0, easeInOutSine((loop - 3.70) / 0.16));
  return 0;
};
const applyEyePresetMotion = (pose, preset = {}, time = 0) => {
  if (!pose) return pose;

  const mood = preset.mood ?? 'neutral';
  const phase = clampSpriteFrame(EYE_FRAME_LIBRARY.indexOf(preset), EYE_FRAME_LIBRARY.length) * 0.17;

  switch (mood) {
    case 'twinkle':
      break;
    case 'loading':
      break;
    case 'moving':
      pose.shiftX = getMovingEyeShiftX(time, phase);
      pose.shiftY = getMovingEyeShiftY(time, phase);
      break;
    case 'die':
      pose.scanlineGlitch = 0.5 + Math.abs(Math.sin(time * 2.6 + phase)) * 0.3;
      break;
    case 'sleepy': {
      const wave = (Math.sin(time * 0.9 + phase) + 1) * 0.5;
      const drowsy = clampUnit(Math.pow(wave, 0.4) * 1.15 - 0.1);
      const awake = Math.pow(1 - clampUnit(drowsy), 2);
      pose.open = lerp(0.08, 0.72, awake);
      pose.height = lerp(0.3, 1.8, awake);
      pose.capsuleBlend = lerp(0, 1, awake);
      pose.curve = lerp(1.08, 0.86, awake);
      pose.flatness = lerp(0.74, 0.44, awake);
      pose.squeeze = lerp(0.34, 0.01, awake);
      const nodY = drowsy * 0.06 + (drowsy > 0.8 ? 0.03 : 0);
      pose.shiftY += nodY;
      pose.blinkClosure = Math.max(
        clampUnit(pose.blinkClosure ?? 0),
        clampUnit(drowsy),
      );
      break;
    }
    default:
      break;
  }

  pose.time = time;
  return pose;
};
const getReviewLoopPoseForFrame = (frameIndex = 0, time = 0) => {
  const pose = cloneEyePose(createEyePoseFromFrame(frameIndex));
  const preset = getEyePreset(frameIndex);
  pose.blinkClosure = 0;
  return applyEyePresetMotion(pose, preset, time);
};
const getAsciiFramesForRow = (asciiState, rowIndex = 0) => {
  if (!asciiState) return [];
  const safeRow = THREE.MathUtils.clamp(rowIndex, 0, Math.max(0, asciiState.rows - 1));
  const frames = [];

  for (let col = 0; col < asciiState.columns; col += 1) {
    const frame = safeRow * asciiState.columns + col;
    if (frame < asciiState.frameCount) {
      frames.push(frame);
    }
  }

  return frames;
};
const getAsciiReviewFrames = (asciiState) => {
  if (!asciiState) return [];
  if (asciiState.layerType === 'eyes') {
    return Array.from({ length: Math.min(asciiState.frameCount, EYE_FRAME_LIBRARY.length) }, (_, index) => index);
  }
  if (asciiState.layerType === 'mouth') {
    return Array.from({ length: Math.min(asciiState.frameCount, MOUTH_FRAME_LIBRARY.length) }, (_, index) => index);
  }
  return getAsciiFramesForRow(asciiState, asciiState.playbackRow);
};
const getAsciiReviewRowLabel = (asciiState, rowIndex = 0) => {
  if (asciiState?.layerType === 'eyes') {
    return EYE_REVIEW_ROW_LABELS[rowIndex] ?? `Row ${rowIndex + 1}`;
  }
  if (asciiState?.layerType === 'mouth') {
    return MOUTH_REVIEW_ROW_LABELS[rowIndex] ?? `Row ${rowIndex + 1}`;
  }
  return `Row ${rowIndex + 1}`;
};
const createAsciiEyePreviewText = (frameIndex = 0, time = 0) => {
  const preset = getEyePreset(frameIndex);
  const importedAsset = getImportedEyeAssetForFrame(frameIndex);
  if (importedAsset) {
    return getAsciiExpressionEyePreview(createEyePoseFromFrame(frameIndex), importedAsset).join('\n');
  }
  const pose = getReviewLoopPoseForFrame(frameIndex, time);
  if (preset.label === 'Loading') {
    const baseMasks = {
      left: quantizeEyeCoverageRows(rasterizeEyePoseToCoverage(pose, 'left', pose.time ?? time)),
      right: null,
    };
    baseMasks.right = cloneEyeMask(baseMasks.left);
    return getAsciiExpressionEyePreview(pose, createLoadingEyeAsset(baseMasks, time)).join('\n');
  }
  return getAsciiExpressionEyePreview(pose).join('\n');
};
const createAsciiMouthPreviewText = (frameIndex = 0, time = 0) => {
  const preset = MOUTH_FRAME_LIBRARY[clampSpriteFrame(frameIndex, MOUTH_FRAME_LIBRARY.length)] ?? MOUTH_FRAME_LIBRARY[0];
  return getAsciiExpressionMouthRows(preset, time).join('\n');
};

const ensureEyeMotionState = (asciiState) => {
  if (!asciiState) return null;
  asciiState.eyeMotion ??= {
    currentPose: null,
    blinkElapsed: 0,
    blinkClosure: 0,
    masks: {
      left: createEmptyEyeMask(),
      right: createEmptyEyeMask(),
    },
  };
  return asciiState.eyeMotion;
};
const getCurrentEyePose = (asciiState, frameIndex = getAsciiVisibleFrame(asciiState)) => {
  const motion = ensureEyeMotionState(asciiState);
  if (motion?.currentPose) return motion.currentPose;

  const pose = createEyePoseFromFrame(frameIndex);
  if (motion) motion.currentPose = pose;
  return pose;
};
const getCurrentEyeMasks = (asciiState, frameIndex = getAsciiVisibleFrame(asciiState)) => {
  const motion = ensureEyeMotionState(asciiState);
  return motion?.masks ?? null;
};
const updateEyeMotionState = (asciiState, delta, now = performance.now() * 0.001) => {
  if (!asciiState || asciiState.layerType !== 'eyes') return;

  const motion = ensureEyeMotionState(asciiState);
  const visibleFrame = getAsciiVisibleFrame(asciiState);
  const targetPose = createEyePoseFromFrame(visibleFrame);
  const preset = getEyePreset(visibleFrame);
  const shouldDuplicateMasks = !isEyeFrameAsymmetric(visibleFrame);

  if (asciiState.blinkEnabled && !asciiState.isBlinking && now >= asciiState.nextBlinkAt) {
    asciiState.isBlinking = true;
    motion.blinkElapsed = 0;
  }

  if (asciiState.isBlinking) {
    const closeDuration = 0.03;
    const holdDuration = Math.max(0.03, asciiState.blinkHoldDuration);
    const openDuration = 0.03;
    const totalDuration = closeDuration + holdDuration + openDuration;

    motion.blinkElapsed += delta;

    if (motion.blinkElapsed < closeDuration) {
      motion.blinkClosure = easeInOutSine(motion.blinkElapsed / closeDuration);
    } else if (motion.blinkElapsed < closeDuration + holdDuration) {
      motion.blinkClosure = 1;
    } else if (motion.blinkElapsed < totalDuration) {
      motion.blinkClosure = 1 - easeInOutSine((motion.blinkElapsed - closeDuration - holdDuration) / openDuration);
    } else {
      motion.blinkElapsed = 0;
      motion.blinkClosure = 0;
      scheduleNextBlink(asciiState, now);
    }
  } else {
    motion.blinkElapsed = 0;
    motion.blinkClosure = 0;
  }

  if (!motion.currentPose) {
    motion.currentPose = cloneEyePose(targetPose);
  } else {
    const smoothing = 1 - Math.exp(-Math.max(0.001, delta) * (asciiState.isPlaying ? 20 : 16));
    motion.currentPose = blendEyePoses(motion.currentPose, targetPose, smoothing);
  }

  motion.currentPose.blinkClosure = motion.blinkClosure;
  applyEyePresetMotion(motion.currentPose, preset, asciiState.effectTime ?? 0);
  motion.currentPose.blinkClosure = Math.max(clampUnit(motion.currentPose.blinkClosure ?? 0), motion.blinkClosure);

  const rasterPose = { ...motion.currentPose, shiftX: 0, shiftY: 0 };
  const skipHysteresis = (rasterPose.scanlineGlitch ?? 0) > 0;
  motion.masks.left = quantizeEyeCoverageRows(
    rasterizeEyePoseToCoverage(rasterPose, 'left', rasterPose.time ?? 0),
    skipHysteresis ? null : motion.masks.left,
  );
  motion.masks.right = shouldDuplicateMasks
    ? cloneEyeMask(motion.masks.left)
    : quantizeEyeCoverageRows(
        rasterizeEyePoseToCoverage(rasterPose, 'right', rasterPose.time ?? 0),
        skipHysteresis ? null : motion.masks.right,
      );
};

const renderEyePixels = (context, asciiState, pose, side, mask = null, highlightMask = null, preset = null) => {
  clearLogicalCanvas(context);

  const ink = asciiState.foregroundColor;
  const eyeMask = mask ?? quantizeEyeCoverageRows(rasterizeEyePoseToCoverage(pose, side, pose?.time ?? 0));
  const cellWidth = ASCII_EYE_GRID.renderCellWidth;
  const cellHeight = ASCII_EYE_GRID.renderCellHeight;
  const gridWidth = ASCII_EXPRESSION_EYE_TOTAL_WIDTH * cellWidth;
  const gridHeight = ASCII_EXPRESSION_EYE_TOTAL_HEIGHT * cellHeight;
  const startX = Math.round((context.canvas.width - gridWidth) * 0.5);
  const startY = Math.round((context.canvas.height - gridHeight) * 0.5);
  eyeMask.forEach((row, rowIndex) => {
    row.forEach((isFilled, columnIndex) => {
      if (!isFilled) return;
      plotBlock(context, startX + columnIndex * cellWidth, startY + rowIndex * cellHeight, cellWidth, cellHeight, ink);
    });
  });

  renderAnimatedEyeHighlight(context, asciiState, eyeMask, highlightMask, startX, startY, cellWidth, cellHeight, {
    preset,
    side,
    effectTime: asciiState.effectTime ?? 0,
  });

  return {
    sourceX: startX,
    sourceY: startY,
    sourceWidth: gridWidth,
    sourceHeight: gridHeight,
  };
};

const renderMouthPixels = (context, asciiState, preset) => {
  clearLogicalCanvas(context);

  const ink = asciiState.foregroundColor;
  const mask = getCurrentMouthMask(asciiState);
  const cellWidth = ASCII_MOUTH_GRID.renderCellWidth;
  const cellHeight = ASCII_MOUTH_GRID.renderCellHeight;
  const gridWidth = ASCII_MOUTH_GRID.columns * cellWidth;
  const gridHeight = ASCII_MOUTH_GRID.rows * cellHeight;
  const startX = Math.round((context.canvas.width - gridWidth) * 0.5);
  const startY = Math.round((context.canvas.height - gridHeight) * 0.5);

  mask.forEach((row, rowIndex) => {
    row.forEach((isFilled, columnIndex) => {
      if (!isFilled) return;
      plotBlock(context, startX + columnIndex * cellWidth, startY + rowIndex * cellHeight, cellWidth, cellHeight, ink);
    });
  });

  return {
    sourceX: startX,
    sourceY: startY,
    sourceWidth: gridWidth,
    sourceHeight: gridHeight,
  };
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
const getAsciiExpressionStates = () => {
  let eyes = null;
  let mouth = null;

  asciiBindings.forEach((binding) => {
    const asciiState = binding?.ascii;
    if (!asciiState) return;

    if (asciiState.layerType === 'eyes' && !eyes) {
      eyes = asciiState;
    } else if (asciiState.layerType === 'mouth' && !mouth) {
      mouth = asciiState;
    }
  });

  return { eyes, mouth };
};
const updateAsciiExpressionOverlay = () => {
  if (!asciiExpressionPanel || !asciiExpressionPreview || !asciiExpressionMeta) return;

  const { eyes, mouth } = getAsciiExpressionStates();
  if (!eyes && !mouth) {
    asciiExpressionPanel.hidden = true;
    asciiExpressionPreview.textContent = '';
    asciiExpressionMeta.textContent = '';
    asciiExpressionSignature = '';
    return;
  }

  const eyeFrame = getAsciiVisibleFrame(eyes);
  const mouthFrame = getAsciiVisibleFrame(mouth);
  const eyePreset = eyes ? getPixelFramePreset(eyes, eyeFrame) : EYE_FRAME_LIBRARY[0];
  const mouthPreset = mouth ? getPixelFramePreset(mouth, mouthFrame) : MOUTH_FRAME_LIBRARY[0];
  const previewText = createAsciiExpressionPreview({
    eyeFrame,
    mouthFrame,
    eyePose: eyes ? getCurrentEyePose(eyes, eyeFrame) : null,
    eyeMasks: eyes ? getCurrentEyeMasks(eyes) : null,
    effectTime: mouth?.effectTime ?? eyes?.effectTime ?? 0,
  });
  const metaText = [`Eyes ${eyePreset.label}`, `Mouth ${mouthPreset.label}`].join(' · ');
  const signature = `${previewText}\n${metaText}`;

  if (signature === asciiExpressionSignature) return;

  asciiExpressionPanel.hidden = false;
  asciiExpressionPreview.textContent = previewText;
  asciiExpressionMeta.textContent = metaText;
  asciiExpressionSignature = signature;
};

let activeStatePreset = -1;
let mouthCycleTime = 0;
let mouthCycleIndex = 0;
let mouthCycleNextSwitch = 0;
let eyeCycleTime = 0;
let eyeCycleIndex = 0;
let eyeCycleNextSwitch = 0;

const MOUTH_CYCLE_SPEEDS = { idle: 1.2, done: 0.6, error: 1.0, talking: 0.22 };
const EYE_CYCLE_SPEEDS = { done: 1.0 };

const updateMouthCycle = (mouth, delta) => {
  if (activeStatePreset < 0) return;
  const preset = STATE_PRESETS[activeStatePreset];
  if (!preset?.mouthCycle) return;
  if (!mouth) return;
  mouthCycleTime += delta;
  const motion = mouth.mouthMotion;
  if (mouthCycleTime < mouthCycleNextSwitch) return;
  if (motion && motion.blendAlpha < 1) return;
  const baseInterval = MOUTH_CYCLE_SPEEDS[preset.label] ?? 0.5;
  const interval = baseInterval + Math.sin(mouthCycleTime * 1.4) * (baseInterval * 0.3);
  mouthCycleNextSwitch = mouthCycleTime + interval;
  mouthCycleIndex = (mouthCycleIndex + 1) % preset.mouthCycle.length;
  mouth.expressionFrame = preset.mouthCycle[mouthCycleIndex];
};

const updateEyeCycle = (eyes, delta) => {
  if (activeStatePreset < 0) return;
  const preset = STATE_PRESETS[activeStatePreset];
  if (!preset?.eyeCycle) return;
  if (!eyes) return;
  eyeCycleTime += delta;
  if (eyeCycleTime < eyeCycleNextSwitch) return;
  const baseInterval = EYE_CYCLE_SPEEDS[preset.label] ?? 1.0;
  const interval = baseInterval + Math.sin(eyeCycleTime * 0.9) * (baseInterval * 0.25);
  eyeCycleNextSwitch = eyeCycleTime + interval;
  eyeCycleIndex = (eyeCycleIndex + 1) % preset.eyeCycle.length;
  eyes.expressionFrame = preset.eyeCycle[eyeCycleIndex];
};
const applyStatePreset = (presetIndex) => {
  const preset = STATE_PRESETS[presetIndex];
  if (!preset) return;
  const { eyes, mouth } = getAsciiExpressionStates();
  if (eyes) {
    eyes.isPlaying = false;
    eyes.playbackAccumulator = 0;
    eyes.expressionFrame = preset.eye;
    eyes.activeFrame = preset.eye;
    eyes.blinkEnabled = preset.blink;
    if (preset.blink) scheduleNextBlink(eyes);
    renderAsciiFrameToTexture(eyes);
    if (eyes.onFrameChange) eyes.onFrameChange();
  }
  if (mouth) {
    mouth.isPlaying = false;
    mouth.playbackAccumulator = 0;
    mouth.expressionFrame = preset.mouth;
    mouth.activeFrame = preset.mouth;
    renderAsciiFrameToTexture(mouth);
    if (mouth.onFrameChange) mouth.onFrameChange();
  }
  if (preset.motion) {
    const clipIndex = findAnimationIndex(preset.motion);
    if (clipIndex >= 0) {
      isAnimationPlaying = true;
      setActiveAnimation(clipIndex);
    }
  }
  mouthCycleTime = 0;
  mouthCycleIndex = 0;
  mouthCycleNextSwitch = 0;
  eyeCycleTime = 0;
  eyeCycleIndex = 0;
  eyeCycleNextSwitch = 0;
  activeStatePreset = presetIndex;
  updateStatePresetButtons();
  setStatus(`State: ${preset.label}`);
};

const statePresetButtons = [];
const buildStatePresetButtons = () => {
  if (!statePresetRow) return;
  statePresetRow.replaceChildren();
  statePresetButtons.length = 0;
  STATE_PRESETS.forEach((preset, index) => {
    const btn = document.createElement('button');
    btn.className = 'state-preset-btn';
    btn.type = 'button';
    btn.textContent = preset.label;
    btn.addEventListener('click', () => applyStatePreset(index));
    statePresetRow.append(btn);
    statePresetButtons.push(btn);
  });
  statePresetRow.hidden = false;
};

const updateStatePresetButtons = () => {
  statePresetButtons.forEach((btn, i) => {
    btn.classList.toggle('is-active', i === activeStatePreset);
  });
};

const normalizeAsciiState = (asciiState, { now = performance.now() * 0.001 } = {}) => {
  if (!asciiState) return;

  asciiState.columns = ASCII_FRAME_LAYOUT.columns;
  asciiState.rows = ASCII_FRAME_LAYOUT.rows;
  asciiState.gridColumns = ASCII_TEXTURE_RENDER.gridColumns;
  asciiState.gridRows = ASCII_TEXTURE_RENDER.gridRows;
  const defaultFrameCount =
    asciiState.layerType === 'eyes' ? EYE_FRAME_LIBRARY.length : ASCII_FRAME_LAYOUT.frameCount;
  asciiState.frameCount = THREE.MathUtils.clamp(
    sanitizeInteger(asciiState.frameCount, defaultFrameCount),
    1,
    asciiState.layerType === 'eyes' ? EYE_FRAME_LIBRARY.length : asciiState.columns * asciiState.rows,
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

const renderAsciiFrameToTexture = (asciiState, frameIndex = getAsciiVisibleFrame(asciiState)) => {
  if (!asciiState?.context || !asciiState?.canvas || !asciiState?.texture) return;

  normalizeAsciiState(asciiState);

  const nextFrame = clampSpriteFrame(frameIndex, asciiState.frameCount);
  const frameText = asciiState.frames[nextFrame] ?? asciiState.frames[0] ?? '';
  const preset = getPixelFramePreset(asciiState, nextFrame);
  const context = asciiState.context;
  const { canvas } = asciiState;
  const frameChanged = asciiState.displayFrame !== nextFrame;

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingEnabled = false;

  if (asciiState.layerType === 'eyes') {
    const eyePose = getCurrentEyePose(asciiState, nextFrame);
    const eyeMasks = getCurrentEyeMasks(asciiState, nextFrame);
    const renderPose = { ...eyePose, shiftX: 0, shiftY: 0 };
    const leftFrameBounds = renderEyePixels(
      asciiState.eyeContexts.left,
      asciiState,
      renderPose,
      'left',
      eyeMasks?.left ?? null,
      eyeMasks?.leftHighlight ?? null,
      preset,
    );
    const rightFrameBounds = renderEyePixels(
      asciiState.eyeContexts.right,
      asciiState,
      renderPose,
      'right',
      eyeMasks?.right ?? null,
      eyeMasks?.rightHighlight ?? null,
      preset,
    );

    const leftBox = ASCII_EYE_BOXES.left;
    const rightBox = ASCII_EYE_BOXES.right;
    const gazeOffsetX = Math.round((eyePose.shiftX ?? 0) * leftBox.width * 2.4);
    const gazeOffsetY = Math.round((eyePose.shiftY ?? 0) * leftBox.height * 2.0);
    sharedGaze.x = gazeOffsetX;
    sharedGaze.y = gazeOffsetY;

    if (leftFrameBounds) {
      const fitScale = Math.min(
        (leftBox.width * 0.98) / leftFrameBounds.sourceWidth,
        (leftBox.height * 0.98) / leftFrameBounds.sourceHeight,
      );
      const destWidth = Math.max(1, Math.round(leftFrameBounds.sourceWidth * fitScale));
      const destHeight = Math.max(1, Math.round(leftFrameBounds.sourceHeight * fitScale));
      const destX = leftBox.x + Math.round((leftBox.width - destWidth) * 0.5) + gazeOffsetX;
      const destY = leftBox.y + Math.round((leftBox.height - destHeight) * 0.5) + gazeOffsetY;

      context.drawImage(
        asciiState.eyeCanvases.left,
        leftFrameBounds.sourceX,
        leftFrameBounds.sourceY,
        leftFrameBounds.sourceWidth,
        leftFrameBounds.sourceHeight,
        destX,
        destY,
        destWidth,
        destHeight,
      );
    }

    if (rightFrameBounds) {
      const fitScale = Math.min(
        (rightBox.width * 0.98) / rightFrameBounds.sourceWidth,
        (rightBox.height * 0.98) / rightFrameBounds.sourceHeight,
      );
      const destWidth = Math.max(1, Math.round(rightFrameBounds.sourceWidth * fitScale));
      const destHeight = Math.max(1, Math.round(rightFrameBounds.sourceHeight * fitScale));
      const destX = rightBox.x + Math.round((rightBox.width - destWidth) * 0.5) + gazeOffsetX;
      const destY = rightBox.y + Math.round((rightBox.height - destHeight) * 0.5) + gazeOffsetY;

      context.drawImage(
        asciiState.eyeCanvases.right,
        rightFrameBounds.sourceX,
        rightFrameBounds.sourceY,
        rightFrameBounds.sourceWidth,
        rightFrameBounds.sourceHeight,
        destX,
        destY,
        destWidth,
        destHeight,
      );
    }
  } else {
    const mouthFrameBounds = renderMouthPixels(asciiState.mouthContext, asciiState, preset);

    const mouthBox = ASCII_EYE_BOXES.mouth;
    if (mouthFrameBounds) {
      const fitScale = Math.min(
        (mouthBox.width * 0.98) / mouthFrameBounds.sourceWidth,
        (mouthBox.height * 0.98) / mouthFrameBounds.sourceHeight,
      );
      const destWidth = Math.max(1, Math.round(mouthFrameBounds.sourceWidth * fitScale));
      const destHeight = Math.max(1, Math.round(mouthFrameBounds.sourceHeight * fitScale));
      const mouthGazeX = Math.round(sharedGaze.x * 0.5);
      const mouthGazeY = Math.round(sharedGaze.y * 0.5);
      const destX = mouthBox.x + Math.round((mouthBox.width - destWidth) * 0.5) + mouthGazeX;
      const destY = mouthBox.y + Math.round((mouthBox.height - destHeight) * 0.5) + mouthGazeY;

      context.drawImage(
        asciiState.mouthCanvas,
        mouthFrameBounds.sourceX,
        mouthFrameBounds.sourceY,
        mouthFrameBounds.sourceWidth,
        mouthFrameBounds.sourceHeight,
        destX,
        destY,
        destWidth,
        destHeight,
      );
    }
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
  const layerType = getAsciiLayerType(materialName);
  const canvas = document.createElement('canvas');
  canvas.width = ASCII_TEXTURE_RENDER.textureSize;
  canvas.height = ASCII_TEXTURE_RENDER.textureSize;

  const context = canvas.getContext('2d');
  const eyeLeftCanvas = createLogicalCanvas(ASCII_TEXTURE_RENDER.eyeLogicalWidth, ASCII_TEXTURE_RENDER.eyeLogicalHeight);
  const eyeRightCanvas = createLogicalCanvas(ASCII_TEXTURE_RENDER.eyeLogicalWidth, ASCII_TEXTURE_RENDER.eyeLogicalHeight);
  const mouthCanvas = createLogicalCanvas(ASCII_TEXTURE_RENDER.mouthLogicalWidth, ASCII_TEXTURE_RENDER.mouthLogicalHeight);
  const eyeLeftContext = eyeLeftCanvas.getContext('2d');
  const eyeRightContext = eyeRightCanvas.getContext('2d');
  const mouthContext = mouthCanvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.name = `${material?.name || 'face'} ASCII`;
  texture.userData.asciiGenerated = true;
  texture.userData.asciiSourceTexture = sourceTexture ?? null;
  configureReplacementTexture(texture, 'map', sourceTexture);

  const asciiState = {
    layerType,
    columns: ASCII_FRAME_LAYOUT.columns,
    rows: ASCII_FRAME_LAYOUT.rows,
    gridColumns: ASCII_TEXTURE_RENDER.gridColumns,
    gridRows: ASCII_TEXTURE_RENDER.gridRows,
    frameCount: initialState.frameCount ?? (layerType === 'eyes' ? EYE_FRAME_LIBRARY.length : MOUTH_FRAME_LIBRARY.length),
    expressionFrame: initialState.expressionFrame ?? 0,
    blinkFrame: initialState.blinkFrame ?? 4,
    activeFrame: 0,
    displayFrame: -1,
    fps: 8,
    isPlaying: false,
    blinkEnabled: initialState.blinkEnabled ?? false,
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
    effectTime: 0,
    foregroundColor: 'rgb(0, 0, 0)',
    softColor: 'rgb(0, 0, 0)',
    highlightColor: 'rgb(255, 255, 255)',
    canvas,
    context,
    texture,
    eyeCanvases: { left: eyeLeftCanvas, right: eyeRightCanvas },
    eyeContexts: { left: eyeLeftContext, right: eyeRightContext },
    mouthCanvas,
    mouthContext,
    frames: Array.from({ length: layerType === 'eyes' ? EYE_FRAME_LIBRARY.length : MOUTH_FRAME_LIBRARY.length }, (_, index) => createFrameSummary({ layerType }, index)),
    currentFrameText: '',
    eyeMotion:
      layerType === 'eyes'
        ? {
            currentPose: null,
            blinkElapsed: 0,
            blinkClosure: 0,
            masks: {
              left: createEmptyEyeMask(),
              right: createEmptyEyeMask(),
            },
          }
        : null,
    onFrameChange: null,
  };

  context.imageSmoothingEnabled = false;
  eyeLeftContext.imageSmoothingEnabled = false;
  eyeRightContext.imageSmoothingEnabled = false;
  mouthContext.imageSmoothingEnabled = false;
  normalizeAsciiState(asciiState);
  if (layerType === 'eyes') {
    // SVG imports removed — all expressions use coverage functions
  }
  scheduleNextBlink(asciiState);
  if (layerType === 'eyes') {
    asciiState.eyeMotion.currentPose = createEyePoseFromFrame(asciiState.expressionFrame);
    asciiState.eyeMotion.currentPose.time = 0;
    asciiState.eyeMotion.currentPose.blinkClosure = 0;
    asciiState.eyeMotion.masks.left = quantizeEyeCoverageRows(
      rasterizeEyePoseToCoverage(asciiState.eyeMotion.currentPose, 'left', 0),
      asciiState.eyeMotion.masks.left,
    );
    asciiState.eyeMotion.masks.right = quantizeEyeCoverageRows(
      rasterizeEyePoseToCoverage(asciiState.eyeMotion.currentPose, 'right', 0),
      asciiState.eyeMotion.masks.right,
    );
  }
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
    existingBinding.ascii.onVisualUpdate = null;
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
  updateAsciiExpressionOverlay();
  return asciiState;
};

const unbindAsciiState = (material, slotKey) => {
  const key = getTextureOverrideKey(material, slotKey);
  const binding = asciiBindings.get(key);
  if (binding?.ascii) {
    binding.ascii.onFrameChange = null;
    binding.ascii.onVisualUpdate = null;
  }
  asciiBindings.delete(key);
  updateAsciiExpressionOverlay();
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
    asciiState.effectTime = (asciiState.effectTime ?? 0) + delta;

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
    } else if (asciiState.layerType !== 'eyes' && asciiState.blinkEnabled && asciiState.frameCount > 1) {
      if (!asciiState.isBlinking && now >= asciiState.nextBlinkAt) {
        asciiState.isBlinking = true;
        asciiState.blinkUntil = now + asciiState.blinkHoldDuration;
      } else if (asciiState.isBlinking && now >= asciiState.blinkUntil) {
        scheduleNextBlink(asciiState, now);
      }
    }

    if (asciiState.layerType === 'eyes') {
      updateEyeCycle(asciiState, delta);
      updateEyeMotionState(asciiState, delta, now);
    } else if (asciiState.layerType === 'mouth') {
      updateMouthCycle(asciiState, delta);
      updateMouthMotionState(asciiState, delta);
    }

    renderAsciiFrameToTexture(asciiState);
    asciiState.onVisualUpdate?.();
  });

  updateAsciiExpressionOverlay();
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
      binding.ascii.onVisualUpdate = null;
    }

    disposeTexture(binding?.ascii?.texture);
    disposeTexture(binding?.sourceTexture);
  });

  asciiBindings.clear();
  updateAsciiExpressionOverlay();
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
          const asciiLayerLabel = asciiState.layerType === 'eyes' ? 'eyes' : 'mouth';

          const panelTitle = document.createElement('div');
          panelTitle.className = 'sprite-title';
          panelTitle.textContent = asciiState.layerType === 'eyes' ? 'ASCII Eyes' : 'ASCII Mouth';

          const panelSub = document.createElement('div');
          panelSub.className = 'sprite-sub';
          panelSub.textContent =
            asciiState.layerType === 'eyes'
              ? 'Select an eye expression to preview on the model.'
              : 'Select a mouth expression to preview on the model.';

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

          if (asciiState.layerType === 'eyes') {
            fields.append(expressionField.field, blinkField.field);
          } else {
            fields.append(expressionField.field);
          }

          const asciiPreview = document.createElement('pre');
          asciiPreview.className = 'ascii-preview';

          const reviewStrip = document.createElement('div');
          reviewStrip.className = 'ascii-review-strip';

          const reviewHead = document.createElement('div');
          reviewHead.className = 'ascii-review-head';

          const reviewLabel = document.createElement('div');
          reviewLabel.className = 'ascii-review-label';

          const reviewSub = document.createElement('div');
          reviewSub.className = 'ascii-review-sub';

          reviewHead.append(reviewLabel, reviewSub);

          const reviewGrid = document.createElement('div');
          reviewGrid.className = 'ascii-review-grid';

          reviewStrip.append(reviewHead, reviewGrid);

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

          const reviewCards = [];
          const reviewCardCount = asciiState.layerType === 'eyes' ? EYE_FRAME_LIBRARY.length : MOUTH_FRAME_LIBRARY.length;
          reviewGrid.style.gridTemplateColumns = asciiState.layerType === 'eyes' ? 'repeat(4, minmax(0, 1fr))' : 'repeat(3, minmax(0, 1fr))';
          for (let slotIndex = 0; slotIndex < reviewCardCount; slotIndex += 1) {
            const card = document.createElement('button');
            card.className = 'ascii-review-card';
            card.type = 'button';

            const cardTitle = document.createElement('div');
            cardTitle.className = 'ascii-review-card-title';

            const cardMeta = document.createElement('div');
            cardMeta.className = 'ascii-review-card-meta';

            card.append(cardTitle);
            reviewGrid.append(card);
            reviewCards.push({ card, cardTitle, cardMeta });
          }

          const updateAsciiReviewMotion = () => {
            const { eyes, mouth } = getAsciiExpressionStates();
            const eyeSource = eyes ?? (asciiState.layerType === 'eyes' ? asciiState : null);
            const mouthSource = mouth ?? (asciiState.layerType === 'mouth' ? asciiState : null);
            const eyeFrame = getAsciiVisibleFrame(eyeSource);
            const mouthFrame = getAsciiVisibleFrame(mouthSource);
            asciiPreview.textContent = createAsciiExpressionPreview({
              eyeFrame,
              mouthFrame,
              eyePose: eyeSource ? getCurrentEyePose(eyeSource, eyeFrame) : null,
              eyeMasks: eyeSource ? getCurrentEyeMasks(eyeSource) : null,
              effectTime: mouthSource?.effectTime ?? eyeSource?.effectTime ?? 0,
            });

            const reviewFrames = getAsciiReviewFrames(asciiState);
            reviewCards.forEach((entry, slotIndex) => {
              const frame = reviewFrames[slotIndex];
              if (frame === undefined) return;
              entry.card.classList.toggle('is-active', asciiState.expressionFrame === frame);
            });
          };

          const refreshAsciiPanel = () => {
            normalizeAsciiState(asciiState);
            framesField.input.max = String(asciiState.columns * asciiState.rows);
            framesField.input.value = String(asciiState.frameCount);
            framesField.input.disabled = asciiState.layerType === 'eyes';
            expressionField.input.max = String(asciiState.frameCount);
            expressionField.input.value = String(asciiState.expressionFrame + 1);
            expressionField.input.disabled = asciiState.isPlaying;
            playbackRowField.input.max = String(asciiState.rows);
            playbackRowField.input.value = String(Math.min(asciiState.playbackRow + 1, asciiState.rows));
            playbackRowField.input.disabled = asciiState.layerType === 'eyes' || asciiState.frameCount <= 1;
            blinkField.input.max = String(asciiState.frameCount);
            blinkField.input.value = String(asciiState.blinkFrame + 1);
            blinkField.input.disabled =
              asciiState.layerType === 'eyes' || !asciiState.blinkEnabled || asciiState.isPlaying || asciiState.frameCount <= 1;
            fpsField.input.value = String(asciiState.fps);
            fpsField.input.disabled = asciiState.frameCount <= 1;
            blinkCheckbox.checked = asciiState.blinkEnabled;
            blinkCheckbox.disabled = asciiState.isPlaying || asciiState.frameCount <= 1;
            playBtn.disabled = asciiState.layerType === 'eyes' || asciiState.frameCount <= 1;
            playBtn.hidden = asciiState.layerType === 'eyes';
            playAllBtn.disabled = asciiState.frameCount <= 1;
            playBtn.textContent = asciiState.isPlaying && asciiState.playbackMode === 'row' ? 'Pause row' : 'Play row';
            playAllBtn.textContent =
              asciiState.layerType === 'eyes'
                ? asciiState.isPlaying && asciiState.playbackMode === 'sequence'
                  ? 'Pause states'
                  : 'Play states'
                : asciiState.isPlaying && asciiState.playbackMode === 'sequence'
                  ? 'Pause all'
                  : 'Play all';
            frameState.textContent =
              asciiState.layerType === 'eyes'
                ? `${getPixelFramePreset(asciiState, getAsciiVisibleFrame(asciiState)).label} · Frame ${getAsciiVisibleFrame(asciiState) + 1} / ${asciiState.frameCount}`
                : asciiState.playbackMode === 'sequence' && asciiState.isPlaying
                  ? `All · Frame ${getAsciiVisibleFrame(asciiState) + 1} / ${asciiState.frameCount}`
                  : `Row ${asciiState.playbackRow + 1} · Frame ${getAsciiVisibleFrame(asciiState) + 1} / ${asciiState.frameCount}`;
            const reviewFrames = getAsciiReviewFrames(asciiState);
            reviewLabel.textContent = asciiState.layerType === 'eyes' ? 'Eye States' : 'Mouth States';
            reviewSub.textContent = `${reviewFrames.length} expressions`;

            reviewCards.forEach((entry, slotIndex) => {
              const frame = reviewFrames[slotIndex];
              if (frame === undefined) {
                entry.card.hidden = true;
                entry.card.disabled = true;
                return;
              }

              const preset = getPixelFramePreset(asciiState, frame);
              entry.card.hidden = false;
              entry.card.disabled = false;
              entry.cardTitle.textContent = preset.label;
              entry.cardMeta.textContent = '';
            });
            updateAsciiReviewMotion();
            refreshTextureMeta();
            refreshPreview();
            updateAsciiExpressionOverlay();
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
              setStatus(`ASCII ${asciiLayerLabel} updated for ${material.name || material.type} ${label}.`);
            }
          };

          asciiState.onFrameChange = refreshAsciiPanel;
          asciiState.onVisualUpdate = updateAsciiReviewMotion;

          [framesField.input, expressionField.input, playbackRowField.input, blinkField.input, fpsField.input].forEach((input) => {
            input.addEventListener('change', () => commitAsciiChanges({ announce: true }));
          });

          reviewCards.forEach((entry, slotIndex) => {
            entry.card.addEventListener('click', () => {
              const reviewFrames = getAsciiReviewFrames(asciiState);
              const frame = reviewFrames[slotIndex];
              if (frame === undefined) return;

              asciiState.isPlaying = false;
              asciiState.playbackAccumulator = 0;
              asciiState.expressionFrame = frame;
              asciiState.activeFrame = frame;
              expressionField.input.value = String(frame + 1);
              renderAsciiFrameToTexture(asciiState);
              refreshAsciiPanel();
              setStatus(`Reviewing ${asciiLayerLabel} frame ${frame + 1}: ${getPixelFramePreset(asciiState, frame).label}.`);
            });
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
                ? `ASCII ${asciiLayerLabel} row ${asciiState.playbackRow + 1} playing on ${material.name || material.type} ${label}.`
                : `ASCII ${asciiLayerLabel} row playback paused on ${material.name || material.type} ${label}.`,
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
                ? `ASCII ${asciiLayerLabel} sequence playing on ${material.name || material.type} ${label}.`
                : `ASCII ${asciiLayerLabel} sequence playback paused on ${material.name || material.type} ${label}.`,
            );
          });

	          if (asciiState.layerType === 'eyes') {
	            spriteControls.append(blinkToggle, playAllBtn, frameState);
	          } else {
	            spriteControls.append(playAllBtn, frameState);
	          }
	          asciiPanel.append(panelTitle, panelSub, reviewStrip, spriteControls);
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
  buildStatePresetButtons();
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
