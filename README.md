# character-workbench

Single-character browser workbench built with Three.js.

![Character Workbench preview](./docs/preview.png)

## Links

- Repository: `https://github.com/fluenttsol/glb-viewer`
- Live: `https://glb-viewer-ebon.vercel.app`

## Run

```bash
python3 -m http.server 8123
```

Open `http://127.0.0.1:8123/`.

## Features

### ASCII Expression System

Block-pixel 기반 캐릭터 얼굴 표정 시스템. 모든 표정은 coverage 함수로 생성되며 하드코딩/SVG 없이 수학 함수만으로 동작.

- **눈 8종**: Neutral, Blink, Twinkle, Loading, Moving, Die, Wink, Sleepy
- **입 6종**: Rest, Smile, O, Ah, Sad, Woo
- 표정 간 부드러운 블렌딩 전환 (smoothstep easing)
- atlas box 기반 시선 이동, scanline glitch 효과

### State Presets

시스템 상태별 눈 + 입 + 바디 모션 조합을 한 버튼으로 전환.

| 상태 | 눈 | 입 | 바디 |
|---|---|---|---|
| idle | Neutral + Blink | Smile | Idle / Happy Idle |
| thinking | Moving | Rest | Looking Behind |
| done | Neutral + Wink | Smile + Ah | Jump |
| searching | Loading | Rest | Searching Files High |
| error | Die | Rest + Sad | Waving |
| offline | Sleepy | Rest | Standing React Death Backward |
| talking | Neutral + Blink | Ah/O/Woo 순환 | Talking |

## Workflow

- Canonical character asset: `assets/260414_daymo_motion.glb`
- Reload the latest character build from the fixed asset path
- Review animation clips and playback
- Inspect replaceable textures and face sprite sheets
- Drive face overlays with live ASCII expression frames
- Test state presets for integrated eye + mouth + body mapping
