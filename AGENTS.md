# GLB Viewer

브라우저에서 `.glb` 파일을 빠르게 확인하는 Three.js 기반 뷰어입니다.

## 용도

- 기본 GLB를 바로 열어서 프리뷰
- 애니메이션 clip 선택 / 재생 / 일시정지
- 머티리얼별 텍스처 확인
- `Base Color`, `Emissive` 텍스처 교체
- mesh / material / texture / vertex / file size 확인

## 파일 구조

- 엔트리: `glb-viewer/index.html`
- 메인 로직: `glb-viewer/viewer.js`
- 기본 모델: `glb-viewer/assets/260406_daymo_motion.glb`

## 실행

`file://` 대신 로컬 서버로 여는 것을 권장합니다.

```bash
cd glb-viewer
python3 -m http.server 8123
```

브라우저에서 `http://127.0.0.1:8123/` 접속.

## 현재 UI

- 왼쪽: 파일 선택, 애니메이션 선택, 재생 제어
- 가운데: 3D 뷰포트, drag & drop 로드
- 오른쪽: 텍스처 인스펙터, 모델 요약 정보

## 작업 시 주의

- `index.html`의 DOM id와 `viewer.js`의 `querySelector`가 맞아야 함
- 기본 모델 파일명은 `260406_daymo_motion.glb` 기준
- 텍스처 교체 시 glTF 규칙상 `sRGB`, `flipY = false` 처리가 중요함
