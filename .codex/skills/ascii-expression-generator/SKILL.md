---
name: ascii-expression-generator
description: 블록 픽셀 기반 캐릭터 얼굴 표정을 설계하고 개선한다. 눈/입 shape 생성, 모션 설계, 두께 균일성, 표정 전환 블렌딩이 필요할 때 사용한다. coverage 함수로 새 표정 추가, 기존 표정 튜닝, 글리치 같은 효과 구현 시 활용.
---

# ASCII Expression Generator

## 핵심 원칙

1. **모든 표정은 coverage 함수 기반**. SVG, 하드코딩 mask, 문자열 패턴 금지.
2. **상태 전환은 연속 블렌딩**. `if (open <= threshold)` 같은 하드 분기 금지. `closeFactor` 등으로 보간.
3. **모션은 수학 함수**. `sin`, `pow`, `lerp` 조합. keyframe 배열 금지.
4. **선 두께 2블록 균일**. 방향/위치에 관계없이 모든 스트로크가 시각적으로 동일 두께.
5. **감정의 맥락 반영**. 눈웃음(양수 곡선) vs 무거운 눈꺼풀(음수 곡선) 등 감정에 맞는 shape.

## 새 표정 추가

### 눈
1. `EYE_FRAME_LIBRARY`에 항목 추가
2. `mapEyePresetToPose`에 case 추가 — neutral 파라미터를 기본으로
3. 특수 shape이면 `evaluateEyeSampleCoverage`에 mood 분기 추가
4. 모션 필요 시 `applyEyePresetMotion`에 case 추가
5. `node -e`로 grid 출력 → 두께 검증 → `node --check` → 브라우저 확인

### 입
1. `MOUTH_FRAME_LIBRARY`에 항목 추가
2. `evaluateMouthSampleCoverage`에 case + 전용 함수 작성
3. 동일 검증 절차

## 두께 규칙

- 그리드 크기가 바뀌면 **모든 두께 값을 재검증** (`node -e`로 grid 출력)
- 큰 shape(캡슐 아웃라인): 픽셀 공간 SDF — `pxPerLx/pxPerLy`로 변환 후 `thicknessCells ≈ 1.8`
- 작은 타원(O, Woo): 단순 threshold — `Math.abs(dist - 1) <= thickness`
- 직선(rest, smile): 고정 half-thickness
- 스트로크는 **안쪽 방향으로만** (캔버스 밖 잘림 방지)

## 눈 감김 곡선

`blinkCurveDir` 값으로 감정 맥락 표현:
- **양수** (blink, wink): 아래로 볼록 = 눈웃음
- **음수** (sleepy, sad): 위로 볼록 = 무거운 눈꺼풀

## 시선 이동

- coverage 내부 `shiftX/Y = 0` 유지 (잘림 방지)
- atlas box 위치 이동으로만 시선 표현
- 입은 눈 gaze의 50% 비율로 따라감

## 변경 전 체크리스트

1. shape / motion / placement 중 무엇을 바꾸는지 구분
2. `node -e`로 grid 출력하여 두께 검증
3. `node --check viewer.js`
4. 브라우저에서 모든 표정 전환 테스트 (특수 mood → 다른 mood 전환 시 잔존 확인)
