# DAYMO Landing Page — Implementation Plan

## Context

현재 repo(`glb-viewer-ascii`)는 Daymo 캐릭터 GLB의 기술 리뷰용 workbench. 별도로 `~/Documents/GitHub/DAYMO`에 실제 프로덕트(B2C AI 컴패니언 데스크톱 오버레이 앱, Electron)가 Phase 1 MVP 완료 + Phase 2 개발 중 상태로 존재함. **랜딩페이지의 목적은 DAYMO 제품의 프리런치 티저/웨이트리스트 유치**이며, 이 repo에 있는 GLB 자산이 곧 그 제품의 메인 캐릭터이므로 여기에 같이 두는 것이 자연스럽다.

핵심 메시지는 DAYMO README의 한 줄 카피로 이미 준비되어 있음:

> **"처음엔 고장났지만, 대화할수록 고쳐지는 나만의 AI 친구"**

v1 목표는 **이 캐릭터를 3D로 살아 움직이게 보여주면서 한 줄 카피 + 핵심 가치 3~4개 + 웨이트리스트 CTA**까지 전달하는 가벼운 단일 페이지.

---

## Goal & Scope (v1)

**In scope**
- 새 브랜치 `feature/landing-page` 생성 (main 기준)
- `landing.html` + `landing.js` 신규 작성 (기존 `index.html` / `viewer.js`는 workbench 그대로 유지)
- Hero에 Daymo GLB 렌더 + Idle 애니메이션 루프
- 스크롤 기반 정적 섹션 4개 (Hero / Features / Growth / CTA)
- 웨이트리스트 이메일 입력 폼 (`mailto:` 또는 plain form, 백엔드 없음)
- 한국어 카피 우선, 영문 보조 (DAYMO 문서가 한국어 중심)

**Out of scope (v1에서는 의도적으로 뺀다)**
- ASCII 표정 오버레이 시스템 — viewer.js의 material binding 로직과 강결합. v1 이후 별도 스프린트
- 스크롤로 state preset 전환 (thinking/searching/done 등) — "더 화려"지만 로직 이식 비용 큼. v1 다음에 iteration
- 다국어 i18n, 라이트 모드, 모바일 제스처 interactivity — Hero 반응형만 확보
- 백엔드/분석/애널리틱스

**왜 이 범위인가**
- 사용자가 `새로 단순하게`를 명시적으로 골랐음
- ASCII 시스템은 `viewer.js` 2461~2540 라인 근처에서 material 이름(`face_2`/`face_3`) 기반 binding + frame library 참조로 얽혀 있음 → 이식하려면 여러 헬퍼까지 따라옴
- 대신 GLB의 **Idle 애니메이션 + 부드러운 회전/마우스 패럴랙스**만으로도 "살아있는 캐릭터" 임팩트는 충분히 나옴

---

## Information Architecture (4 sections)

1. **Hero (풀뷰포트)**
   - 좌: 카피 + 서브카피 + 웨이트리스트 CTA
   - 우: GLB 캐릭터(Idle 루프, 마우스 이동에 미세 회전 반응)
   - 카피: "처음엔 고장났지만, 대화할수록 고쳐지는 나만의 AI 친구"
   - 서브: "DAYMO는 당신의 데스크톱에 사는 AI 컴패니언입니다. 대화하고, 명령을 수행하고, 반응합니다."

2. **Features (3~4개 카드 그리드)**
   - **BYOK** — "Gemini · OpenAI · Claude · Codex. 내 API 키로, 내 데이터로."
   - **진짜 도구** — "파일 읽고 쓰고, 명령어 실행하고, 데스크톱을 정리합니다. 채팅이 아니라 실행입니다."
   - **자라는 친구** — "대화할수록 스킬이 늘고, 기억이 쌓이고, 성격이 자라납니다."
   - **데스크톱 오버레이** — "언제나 구석에. 필요할 때만 커집니다."

3. **Growth story (narrative 섹션)**
   - "Level 0에서 시작합니다. 어색하고, 자주 틀리고, 서툴게 굴어요."
   - "하지만 당신과의 대화 하나하나가 그를 바꿉니다."
   - 작은 캐릭터 스틸 이미지 or 동일 3D 캐릭터의 두 번째 뷰(좌/우 혹은 스크롤에 따라 움직이는)

4. **CTA / Footer**
   - "가장 먼저 만나보세요" + 이메일 입력 + 버튼
   - 소셜/GitHub 링크 (있으면)
   - copyright

---

## Visual Direction

- **톤**: 다크 모드, 글래스모피즘 살짝. DAYMO 제품이 데스크톱 오버레이에서 반투명 UI를 쓰므로 일관성.
- **색**: 기본 배경 `#0b0d10` (workbench와 동일) + 악센트 보라·블루 그라데이션 `linear-gradient(90deg, #5d7dff, #9c72ff)` (기존 CSS에서 재사용)
- **타이포**: Inter (workbench와 동일). Hero 카피는 크게, 40~56px. 한글은 Pretendard 우선 대체 fallback 추가.
- **레이아웃**: 1440px max-width 컨테이너, 모바일에서는 Hero 세로 스택.
- **Hero 3D**: 캐릭터 살짝 오른쪽에 배치, 배경은 flat + 은은한 radial 글로우 1개.
- **모션**: 캐릭터 Idle 루프 + 마우스 X/Y에 따른 ±5도 yaw 반응. 스크롤 시 Hero 캐릭터 약간 scale/opacity 페이드.

---

## Architecture & Reuse

### New files
- `landing.html` — 마크업 + CSS (inline)
- `landing.js` — Three.js 모듈, Hero 캔버스 전용

### Reused from existing repo (copy-paste, NOT import)
- `viewer.js:198-211` — Renderer + Scene + Camera 초기화 패턴
- `viewer.js:240-258` — 3-light studio (Hemisphere + Key + Fill + Rim)
- `viewer.js:270, 4195-4209` — GLTFLoader + AnimationMixer 패턴
- `viewer.js:4291-4301` — Animation loop (OrbitControls 호출 제거, mixer update만 유지)
- `viewer.js:4105-4111` — `RoomEnvironment` 프로시저럴 스튜디오 (HDR 파일 불필요)
- `assets/260414_daymo_motion.glb` — 자산 그대로

### 핵심 포인트
- **Three.js는 importmap 방식으로 CDN 로드** (기존 `index.html:901-908`과 동일하게)
- **OrbitControls 안 씀** (랜딩은 카메라 고정, 마우스 패럴랙스만)
- **Post-processing 안 씀** — 랜딩 성능 우선. ACES tone mapping은 renderer 설정으로 충분
- **clip 선택**: `gltf.animations`에서 이름에 `idle` 포함된 첫 clip. 없으면 `animations[0]`

### landing.js 최소 구조

```
// 1. Scene / camera / renderer / lights
// 2. RoomEnvironment (scene.environment만 세팅, background는 null)
// 3. GLTFLoader로 assets/260414_daymo_motion.glb 로드
// 4. AnimationMixer로 idle clip 재생
// 5. 마우스 이동 리스너 → 캐릭터 root rotation.y/x 보간
// 6. 리사이즈 핸들러
// 7. animate loop: mixer.update(delta) + smooth rotation + renderer.render
```

### landing.html 구조

```
<header>       # 로고 + 간단 nav (optional)
<section.hero> # 좌: 카피+CTA, 우: <canvas id="hero-canvas">
<section.features>
<section.growth>
<section.cta>  # 이메일 폼
<footer>
```

---

## Branch & Git

- 현재 브랜치: `feature/ascii-eye-texture` (dirty: `.codex/skills/ascii-expression-generator/SKILL.md` modified)
- **주의**: 구현 시작 전에 modified 파일 처리 먼저. stash 할지, 같이 커밋할지 사용자에게 확인.
- `git checkout main && git pull` → `git checkout -b feature/landing-page` 순서.

---

## Steps (실행 순서)

1. Dirty file(`.codex/skills/.../SKILL.md`) 처리 방침 사용자 확인 (stash / commit on current branch / discard)
2. `main` 최신화 후 `feature/landing-page` 체크아웃
3. `landing.html` 스캐폴드 (4 섹션 뼈대 + CSS)
4. `landing.js` 스캐폴드 (scene + renderer + lights, canvas 연결)
5. GLB 로드 + Idle clip 재생
6. 마우스 패럴랙스 회전
7. Hero 카피/CTA, Features 카드, Growth, CTA 폼 각 섹션 내용 채우기
8. 반응형(모바일 768px 이하 세로 스택) + `prefers-reduced-motion` 대응
9. 로컬 서버로 점검 (`python3 -m http.server 8123` → `http://127.0.0.1:8123/landing.html`)
10. README 루트에 한 줄 "Landing: `/landing.html`" 메모 (선택)

---

## Verification

- 로컬: `python3 -m http.server 8123` 실행 후 `http://127.0.0.1:8123/landing.html` 접속
  - Hero에 Daymo 캐릭터가 로드되고 Idle 애니메이션이 루프되는지
  - 마우스 움직일 때 ±5도 이내로 부드럽게 회전하는지
  - 섹션 스크롤 시 레이아웃 깨지지 않는지
  - 웨이트리스트 이메일 폼이 (mailto면) 메일 앱을 여는지
- 반응형: 브라우저 리사이즈 375px/768px/1440px에서 레이아웃 확인
- 성능: DevTools Performance에서 Hero 렌더가 60fps 근처인지, GLB 1.4MB 로드 후 메모리 200MB 이하인지 간단 체크
- 접근성: 이미지 alt, form label, 포커스 아웃라인 확인

---

## Open iteration (v2 후보, 참고만)

- ASCII 표정 시스템 이식 (`viewer.js:2110-2126` `getAsciiExpressionStates`를 모듈화)
- 스크롤 기반 STATE_PRESET 전환 (`viewer.js:641-649`의 프리셋 배열 그대로 활용)
- 다국어 스위치 (한↔영)
- Vercel 배포 설정 (기존 `glb-viewer-ebon.vercel.app`와 분리할지, subpath로 추가할지)
