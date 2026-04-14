# Character Workbench

Three.js 기반 캐릭터 뷰어 + ASCII 블록 픽셀 표정 시스템.

## 파일 구조

- `index.html` — UI 레이아웃, 스타일, DOM
- `viewer.js` — 3D 렌더링, ASCII 표정 엔진, 상태 프리셋 전체 로직
- `assets/260414_daymo_motion.glb` — 캐릭터 에셋 (19개 애니메이션 클립 포함)
- `guid/` — 설계 문서 (상태 매핑, ASCII 가이드)

## 핵심 시스템

### ASCII 표정
- 눈 8종 / 입 6종, 모두 coverage 함수 기반 (SVG, 하드코딩 없음)
- 표정 전환: 눈은 파라미터 보간, 입은 coverage grid 블렌딩 (smoothstep easing)
- 시선 이동: atlas box 위치로만 표현 (coverage 내부 shift 금지)
- 선 두께: 2블록 균일 (큰 shape은 pixel-space SDF, 작은 shape은 단순 threshold)

### 상태 프리셋 (STATE_PRESETS)
- idle, thinking, done, searching, error, offline, talking
- 각 상태별 눈 + 입 + 바디 모션 동시 전환
- `mouthCycle` / `eyeCycle`로 상태 내 표정 순환 (talking 입 움직임 등)
- `findAnimationIndex(keyword)`로 GLB 클립명 키워드 매칭

## 실행

```bash
python3 -m http.server 8123
```

`http://127.0.0.1:8123/` 접속.

## 작업 시 주의

- `index.html`의 DOM id와 `viewer.js`의 `querySelector`가 일치해야 함
- 텍스처 교체 시 `sRGB`, `flipY = false` 처리 필요
- shape 변경 후 반드시 `node -e`로 grid 출력하여 두께 검증
- `const` 중복 선언 주의 — `node --check`로는 안 잡히지만 브라우저에서 에러
