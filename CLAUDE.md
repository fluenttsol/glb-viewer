# glb-viewer-ascii

Three.js 기반 Daymo 캐릭터 GLB workbench. ASCII expression system (눈 8종 + 입 6종) 포함. 별도 DAYMO 제품(`~/Documents/GitHub/DAYMO`)의 마스코트 캐릭터.

## Run

```bash
python3 -m http.server 8123
```

- Workbench: `http://127.0.0.1:8123/`
- Landing (in progress on `feature/landing-page`): `http://127.0.0.1:8123/landing.html`

## Key files

- `index.html` / `viewer.js` — character workbench (4353 lines)
- `assets/260414_daymo_motion.glb` — canonical character asset (1.4MB)
- `docs/landing-plan.md` — DAYMO landing page implementation plan

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health
