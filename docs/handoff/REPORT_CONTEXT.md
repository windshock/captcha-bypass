# LLM Report Context

## 1. Purpose

이 문서는 새 세션의 사람/모델이 저장소를 빠르게 파악하도록 만든 루트 핸드오프입니다. 전체 문서를 다 훑기 전에 이 문서 하나로 구조, 주요 파일, 읽기 순서를 이해할 수 있게 하는 것이 목적입니다.

## 2. Recommended Reading Order

1. `../../AGENTS.md`
2. `../../README.md`
3. `../project/STRUCTURE.md`
4. `../project/WORKLOG.md`
5. `../../scripts/login.js`
6. `../../scripts/runtime-tools.js`

## 3. Repo Snapshot

핵심 실행 코드:

- `scripts/login.js`
- `scripts/runtime-tools.js`
- `scripts/record-all.js`
- `scripts/test-whisper.js`
- `scripts/generate_video.py`

실행 자산:

- `assets/models/tiny.pt`
- `assets/ffmpeg-bin/`

핵심 문서:

- `README.md`
- `AGENTS.md`
- `docs/project/STRUCTURE.md`
- `docs/project/WORKLOG.md`

보고서/리서치:

- `docs/reports/INTERNAL_REPORT.md`
- `docs/reports/TARGET_DETAILS.md`
- `docs/research/deep-research-report-4.md`
- `docs/research/deep-research-report-4-ko.md`

증거 산출물:

- `artifacts/screenshots/`
- `artifacts/recordings/`
- `artifacts/audio/`

보관 자료:

- `archive/bundles/`
- `archive/legacy/`
- `archive/config/`

## 4. What The Code Does At A High Level

- 브라우저 자동화는 `scripts/login.js`가 담당합니다.
- 외부 실행기와 모델 경로 해석은 `scripts/runtime-tools.js`가 담당합니다.
- 전체 화면 녹화는 `scripts/record-all.js`가 별도 래핑합니다.
- 실행 환경 점검은 `scripts/test-whisper.js`가 수행합니다.
- 보고서용 영상 렌더링은 `scripts/generate_video.py`가 맡습니다.

## 5. Runtime Locations

- 루트 환경 파일: `.env`
- 모델: `assets/models/tiny.pt`
- Windows FFmpeg: `assets/ffmpeg-bin/`
- 런타임 임시 파일: `artifacts/tmp/`
- 실행 결과 녹화: `artifacts/recordings/`

## 6. Constraints

- 저장소는 깔끔한 제품 코드 저장소라기보다 실험 코드와 보고서, 산출물이 함께 있는 작업 디렉터리입니다.
- 루트 혼잡도를 줄이기 위해 2026-03-30 기준으로 코드, 문서, 산출물, 보관 파일을 디렉터리별로 재정리했습니다.
- 새 세션에서는 이 문서와 `AGENTS.md`를 먼저 읽으면 전체 맥락 복원 비용이 가장 낮습니다.
