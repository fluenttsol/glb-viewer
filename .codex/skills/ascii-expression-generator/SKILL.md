---
name: ascii-expression-generator
description: ASCII 캐릭터의 눈/입 표정을 프로덕션 수준으로 설계하고 개선한다. 감정 표현 생성, 깜빡임, 시선 이동, 대칭 규칙, 브라우저/캔버스/텍스처 파이프라인에서의 표정 로직이 필요할 때 사용한다.
---

# ASCII Expression Generator

ASCII 캐릭터의 얼굴 표정을 의도된 형태와 캐릭터성을 가진 프로덕션 수준으로 만드는 스킬.
형태, 모션 품질, 수정 가능성에 집중한다.

## 작업 순서

1. 고정형 쉐이프인지, 동적 모션인지 확인한다.
2. 라인형인지, neutral 모양을 활용하는 건지 확인한다.
3. 드로잉 영역을 정한다.
   - 기본: `40 x 60`
   - 작게 뜬 눈 / 감은 눈: `40 x 10` 또는 사용자 요청에 따라 조정

## Quality Rules

- 선명한 흑백 블록만 사용한다.
- 모션 보간 시 값을 보간한 후 결과를 흑백 블록으로 양자화한다.
- 소프트 알파 대신 임계값 기반 마스크를 사용한다.
- 그라디언트 및 블러 금지 (특수한 상황 제외).
- 기본은 좌우 동일 모양이며, 필요한 경우에만 명시적으로 미러를 사용한다.

## Eye Design Rules

- Neutral 눈이 기준 스타일이며, 동그랗게 뜨고 있는 눈은 이 모양을 활용해야 한다.
- 캡슐형 눈: 중앙은 일정 두께를 유지하고, 위/아래는 둥근 형태로 마무리한다 (다이아/육각형 금지).
- 반짝임/하이라이트는 사용자가 명시적으로 허용하지 않는 한 흑백 구조를 유지한다.
- 라인형 눈: 선 두께가 항상 일정해야 하며, 부분적으로 두껍거나 얇은 곳이 없어야 한다.

## Motion Rules

- 깜빡임 타이밍, 닫히는 속도, 시선 이동, 표정 보간은 각각 독립적으로 조정 가능해야 한다.
- 자연스러운 시선은 짧은 이동(saccade)과 정지의 조합으로 표현한다.
- 정적 자산 사용 시, 모션을 절차적 요소에만 적용할지 마스크에도 변형을 적용할지 명확히 결정한다.

## Rendering Pipeline

눈 한쪽을 오프스크린 logical canvas에 그린 뒤, texture atlas canvas에 복사하고, `THREE.CanvasTexture`로 변환하여 얼굴 머티리얼의 `map`으로 사용한다.

핵심 수치는 코드(`viewer.js`)에서 직접 확인하되, 구조는 다음과 같다:

- **eye logical canvas** → **eye render grid** → **texture atlas eye box**
- logical canvas 내부에서 grid를 중앙 정렬한 뒤, atlas eye box 안에 비율 유지(contain) 상태로 다시 중앙 정렬한다.
- atlas eye box 좌표는 좌상단 기준 `(x, y, width, height)`이다.


## Distortion Rules

- atlas eye box로 복사 시 가로/세로를 따로 늘리지 않는다 (uniform fit scale).
- 눈이 찌그러져 보이면 복사 단계의 비율 보존 여부를 먼저 확인한다.
- 형태가 거칠면 eye box를 늘리기 전에 render grid 세로 해상도 증가를 먼저 검토한다.

## 변경 전 체크리스트

1. 바꾸려는 것이 **shape** / **motion** / **placement** 중 무엇인지 구분한다.
2. shape/motion 문제면 `pose`, `mask`, `grid` 단계에서 해결 가능한지 먼저 본다.
3. placement 문제일 때만 atlas eye box를 조정한다.
4. grid 해상도를 바꾸면 logical canvas 크기와 중앙 정렬 계산이 맞는지 확인한다.
5. 변경 후 `node --check viewer.js`를 실행한다.
6. 브라우저에서 eye box 안의 세로/가로 눌림 여부를 확인한다.
