# DAYMO Landing Page — Implementation Plan

## Context

현재 repo(`glb-viewer-ascii`)는 Daymo 캐릭터 GLB의 기술 리뷰용 workbench. 별도로 `~/Documents/GitHub/DAYMO`에 실제 프로덕트(B2C AI 컴패니언 데스크톱 오버레이 앱, Electron)가 Phase 1 MVP 완료 + Phase 2 개발 중 상태로 존재함. **랜딩페이지의 목적은 DAYMO 제품의 프리런치 티저/웨이트리스트 유치**이며, 이 repo에 있는 GLB 자산이 곧 그 제품의 메인 캐릭터이므로 여기에 같이 두는 것이 자연스럽다.

**핵심 메시지 (H1 + Sub)**

> **H1: "대화할수록 똑똑해지는, 내 데스크톱의 AI 동료."**
> Sub: "처음엔 고장났지만, 대화할수록 고쳐지는 나만의 AI 친구"

v1 목표는 **이 캐릭터를 3D로 살아 움직이게 + 스크롤에 반응하는 상태 전환으로 보여주면서 핵심 가치 3~4개 + 웨이트리스트 CTA**까지 전달하는 단일 페이지.

**Conversion target (가설)**: 방문자 → 이메일 등록 5~10%. cold organic 3~5%가 현실적, 10%+ 히트.

---

## Goal & Scope (v1)

**In scope**
- `landing.html` + `landing.js` 신규 작성 (기존 `index.html` / `viewer.js`는 workbench 그대로 유지)
- Hero에 Daymo GLB 렌더 + Idle 애니메이션 루프
- **Narrow state-preset scroll trigger**: `IntersectionObserver`로 섹션별 캐릭터 상태 전환 (Hero=Idle, Growth=Thinking). `STATE_PRESETS` 배열(`viewer.js:641-649`) 재사용. ~4시간 추가 작업.
- 스크롤 기반 정적 섹션 4개 (Hero / **Growth** / **Features** / CTA) — 감정 아치: 사랑 → 스펙 → 전환
- 웨이트리스트 이메일 입력 폼: **Formspree 또는 Resend** (무료 tier, 분석/디듑/드립 가능)
- 한국어 카피 우선, 영문 보조

**Out of scope (v1에서는 의도적으로 뺀다)**
- Full ASCII 표정 오버레이 시스템 (material binding 강결합). Narrow version의 body animation 전환만 포함
- 이메일 focus/submit에 캐릭터 제스처 반응 (moment-of-delight, v2 후보)
- 다국어 i18n, 라이트 모드, 모바일 제스처 interactivity
- 분석/애널리틱스 (Formspree 대시보드로 기본 수집)

---

## Information Architecture (4 sections)

1. **Hero (풀뷰포트)** — 캐릭터 state: `idle`
   - 좌: H1 + sub + 웨이트리스트 CTA (이메일 입력 + 버튼)
   - 우: GLB 캐릭터 (Idle 루프, 마우스 이동에 미세 회전 반응)
   - **F-pattern lock**: 태그라인 72px eyebrow-weight → 서브 18px → CTA pill → 캐릭터 300ms 딜레이 stagger
   - H1: "대화할수록 똑똑해지는, 내 데스크톱의 AI 동료."
   - Sub: "처음엔 고장났지만, 대화할수록 고쳐지는 나만의 AI 친구"

2. **Growth story (narrative 섹션)** — 캐릭터 state: `thinking` (IntersectionObserver trigger)
   - "Level 0에서 시작합니다. 어색하고, 자주 틀리고, 서툴게 굴어요."
   - "하지만 당신과의 대화 하나하나가 그를 바꿉니다."
   - 캐릭터가 Thinking 상태로 전환 → Growth 나레이션에 생동감 부여

3. **Features (3~4개 카드 그리드)** — 캐릭터 state: `idle` 복귀
   - **BYOK** — "Gemini · OpenAI · Claude · Codex. 내 API 키로, 내 데이터로."
   - **진짜 도구** — "파일 읽고 쓰고, 명령어 실행하고, 데스크톱을 정리합니다. 채팅이 아니라 실행입니다."
   - **자라는 친구** — "대화할수록 스킬이 늘고, 기억이 쌓이고, 성격이 자라납니다."
   - **데스크톱 오버레이** — "언제나 구석에. 필요할 때만 커집니다."
   - **카드 스펙**: `border: 1px solid rgba(255,255,255,0.08)`, `backdrop-filter: blur(14px)`, `background: rgba(6,8,12,0.6)`, `border-radius: 14px`, `padding: 24px`, 2-col@1024px / 1-col@768px. `.expression-overlay` 참조 (`index.html:637-654`)

4. **CTA / Footer**
   - "가장 먼저 만나보세요" + 이메일 입력 + 버튼
   - 소셜/GitHub 링크 (있으면)
   - copyright

---

## State Table (필수)

| State | 트리거 | UI 표현 |
|---|---|---|
| **GLB loading** | 페이지 로드~GLB ready | 캔버스 영역에 shimmer + poster PNG fallback (스틸 렌더) |
| **GLB load fail** | 네트워크 실패 | poster PNG 유지, CTA 숨기지 않음, 에러 메시지 숨김 |
| **WebGL unsupported** | `WEBGL.isWebGLAvailable()` false | poster PNG + 동일 카피/CTA. 3D 안 보여도 CTA는 살림 |
| **Form empty** | 이메일 미입력 + submit | 인라인 안내: "이메일을 입력해 주세요" |
| **Form invalid** | 형식 틀림 | 인라인 안내: "이메일 형식을 확인해 주세요" |
| **Form success** | Formspree 200 응답 | 폼 → 성공 카드 전환: "등록 완료! 가장 먼저 알려드릴게요." |
| **Form error** | Formspree 4xx/5xx | 인라인 안내: "잠시 후 다시 시도해 주세요" |
| **Reduced motion** | `prefers-reduced-motion: reduce` | 첫 Idle 프레임 freeze, parallax 비활성, scroll-scale 비활성 |
| **Slow network** | partial load (>3s) | poster 유지 + "캐릭터 준비 중..." 텍스트 |

---

## Visual Direction

- **톤**: 다크 모드. 글래스모피즘은 **조건부** — flat `#0b0d10` 위에선 blur가 무의미하므로, 카드 뒤에 subtle grain/noise 텍스처 또는 radial glow가 있을 때만 glass 적용.
- **색**: 기본 배경 `#0b0d10` + 악센트 `linear-gradient(90deg, #5d7dff, #9c72ff)`. CTA 버튼은 AI slop 주의 — mono off-white CTA + gradient accent dot 고려.
- **타이포**: **Pretendard Variable을 `@font-face`로 primary 로드** (`font-display: swap`). Inter는 Latin co-line용. Hero 카피 `font-size: clamp(36px, 5vw, 56px)`, `word-break: keep-all; line-break: strict;`, 태그라인에 수동 `<br>` (wrapping 제어).
- **레이아웃**: 1440px max-width 컨테이너, 모바일에서는 Hero 세로 스택.
- **Hero 3D**: 캐릭터 살짝 오른쪽에 배치, 배경은 flat + radial 글로우 1개.
- **모션**: 캐릭터 Idle 루프 + 마우스 X/Y에 따른 ±5도 yaw 반응. 스크롤 시 Hero 캐릭터 약간 scale/opacity 페이드. Growth 진입 시 Thinking 전환.
- **접근성**: focus ring `0 0 0 3px rgba(122,162,255,0.4)` (workbench 재사용), min touch target 44×44, 키보드에서 parallax 비활성, `aria-live` on form status.
- **Design tokens** (landing.html `:root`에 선언):
  ```css
  --bg: #0b0d10;
  --text: #f3f5f7;
  --muted: rgba(243,245,247,0.5);
  --accent: #7aa2ff;
  --radius-card: 14px;
  --blur-glass: 14px;
  --font-kr: "Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  --font-en: Inter, ui-sans-serif, system-ui, sans-serif;
  ```

### AI Slop 체크리스트 (피할 것)
- [x] 보라→블루 그라데이션 CTA 일색 → 대안 고려 (mono off-white, 단일 accent dot)
- [x] 3~4 카드 그리드만 → 캐릭터 micro-animation 연동 시도
- [x] Glass on flat 배경 → grain 없이 glass 쓰지 않기
- [x] "자라는 AI" 카피만 → 시각적 before/after or level 넘버로 증명

---

## Architecture & Reuse

### New files
- `landing.html` — 마크업 + CSS (inline) + Formspree form
- `landing.js` — Three.js 모듈, Hero 캔버스 전용 + IntersectionObserver state trigger

### Reused from existing repo (copy-paste, NOT import)
- `viewer.js:198-211` — Renderer + Scene + Camera 초기화 패턴
- `viewer.js:240-258` — 3-light studio (Hemisphere + Key + Fill + Rim)
- `viewer.js:270, 4195-4209` — GLTFLoader + AnimationMixer 패턴
- `viewer.js:4291-4301` — Animation loop (mixer update만 유지)
- `viewer.js:4105-4111` — `RoomEnvironment` 프로시저럴 스튜디오
- `viewer.js:641-649` — **STATE_PRESETS** 배열 (idle/thinking 프리셋 데이터)
- `assets/260414_daymo_motion.glb` — 자산 그대로

### landing.js 구조

```
// 1. WebGL availability check → fallback poster if unsupported
// 2. Scene / camera / renderer / lights
// 3. RoomEnvironment (scene.environment만 세팅, background는 null)
// 4. GLTFLoader로 assets/260414_daymo_motion.glb 로드 (progress callback → shimmer → ready)
// 5. AnimationMixer로 idle clip 재생
// 6. STATE_PRESETS 정의 (viewer.js:641-649에서 idle/thinking만 추출)
// 7. IntersectionObserver: growth section 진입 → thinking preset, 이탈 → idle preset
// 8. 마우스 이동 리스너 → 캐릭터 root rotation.y/x 보간 (키보드 사용 시 비활성)
// 9. 리사이즈 핸들러
// 10. animate loop: mixer.update(delta) + smooth rotation + renderer.render
// 11. prefers-reduced-motion 체크 → freeze + parallax off
```

### landing.html 구조

```
<header>         # 로고 + 간단 nav (optional)
<section.hero>   # 좌: H1+Sub+CTA (Formspree form), 우: <canvas id="hero-canvas">
<section.growth> # 성장 나레이션 (캐릭터 → thinking)
<section.features> # 4 cards
<section.cta>    # 이메일 폼 (hero와 동일 Formspree action, 또는 anchor link to hero form)
<footer>
```

### Formspree 통합
- `<form action="https://formspree.io/f/{FORM_ID}" method="POST">`
- `<input type="email" name="email" required>`
- JS에서 fetch로 submit → inline success/error 상태 전환 (페이지 리로드 방지)
- Formspree 무료 tier: 50건/월 (초기 티저에 충분), 유료 전환 시 Resend으로 마이그레이션

---

## Branch & Git

- 브랜치: `feature/landing-page` (이미 생성 완료, origin/main 기준)
- SKILL.md 변경분은 stash 처리 완료 (`feature/ascii-eye-texture`용)
- 현재 커밋: `8f96423 chore: add gstack skill routing rules to CLAUDE.md`

---

## Steps (실행 순서)

1. `landing.html` 스캐폴드 (4 섹션 뼈대 + CSS tokens + Pretendard `@font-face`)
2. `landing.js` 스캐폴드 (scene + renderer + lights + WebGL guard + poster fallback)
3. GLB 로드 + progress shimmer + Idle clip 재생
4. 마우스 패럴랙스 회전 (keyboard fallback off)
5. STATE_PRESETS 추출 + `IntersectionObserver` growth ↔ idle 전환
6. Hero 카피(H1+Sub) + CTA(Formspree form) + stagger animation
7. Growth 나레이션 + Features 카드 (카드 스펙 적용)
8. CTA / Footer 섹션
9. State table 구현 (loading/error/success/reduced-motion)
10. 반응형 (375px: canvas 1:1 square, parallax off, copy below, tagline 28-36px clamp)
11. 접근성 (focus ring, touch target, aria-live, skip-link)
12. 로컬 서버 점검 (`python3 -m http.server 8123` → `http://127.0.0.1:8123/landing.html`)
13. Poster PNG 제작 (GLB의 Idle 첫 프레임 캡처, WebGL fallback용)

---

## Verification

- 로컬: `http://127.0.0.1:8123/landing.html` 접속
  - Hero에 Daymo 캐릭터가 로드되고 Idle 애니메이션 루프
  - Growth 섹션 스크롤 진입 시 캐릭터가 Thinking으로 전환되는지
  - 이메일 폼 submit → Formspree 응답 → 인라인 success/error 표시
  - WebGL 끈 상태에서 poster PNG fallback + CTA 정상 표시
  - `prefers-reduced-motion` 시뮬레이션 시 freeze + parallax off
- 반응형: 375px / 768px / 1440px에서 레이아웃 확인
  - 375px에서 캔버스 1:1 square, parallax off, 카피 below
- 성능: DevTools Performance에서 60fps, GLB 로드 후 메모리 200MB 이하
- 접근성: Tab 이동 focus ring, form label, `aria-live` 확인
- Conversion: Formspree 대시보드에서 test submission 확인

---

## Open iteration (v2 후보)

- Moment-of-delight: 이메일 focus 시 캐릭터가 커서 쳐다봄 + submit 시 one-shot 글리치→복구 제스처
- Full ASCII 표정 오버레이 이식 (`viewer.js:2110-2126` 모듈화)
- 추가 state-preset 확장 (searching, done, error 등 더 많은 섹션 연동)
- 다국어 스위치 (한↔영)
- Vercel 배포 설정
- CTA 보라 그라데이션 → mono off-white 대안 A/B 테스트
- 분석 (Plausible or Umami, 프라이버시 퍼스트)

---

## Review log

**CEO review** (2026-04-16, Claude subagent)
- Premise challenge: mailto: 백엔드 없음 → Formspree로 변경 ✅
- ASCII/state-preset 제외 → Narrow 2-state scroll trigger 추가 ✅
- Tagline "고장났다" → H1 카테고리 명확화, 원래는 sub으로 ✅
- Conversion target 부재 → 5-10% 가설 추가 ✅

**Design review** (2026-04-16, Claude subagent)
- Info hierarchy 6/10 → F-pattern lock + stagger entry ✅
- Emotional arc 5/10 → Growth ↔ Features swap ✅
- Specificity 3/10 → 카드 스펙 + design tokens 명시 ✅
- Missing states 2/10 → State table 섹션 추가 ✅
- Accessibility 4/10 → focus ring, touch target, keyboard fallback ✅
- Responsive 4/10 → 375px 모바일 스펙 추가 ✅
- Design system 6/10 → Pretendard primary + CSS tokens ✅
