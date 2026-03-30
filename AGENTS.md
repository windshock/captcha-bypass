# Project Orientation

이 저장소는 새 세션에서 빠르게 맥락을 복원할 수 있도록 아래 순서로 읽으면 됩니다.

## Start Here

1. `README.md`
2. `docs/handoff/REPORT_CONTEXT.md`
3. `docs/project/STRUCTURE.md`
4. 필요 시 `docs/project/WORKLOG.md`

## Repo Map

- `scripts/`: 실제 실행 코드
- `assets/`: 모델과 번들 바이너리
- `docs/`: 구조 문서, 핸드오프 문서, 보고서, 리서치
- `artifacts/`: 스크린샷, 녹화본, 오디오, 슬라이드
- `archive/`: 과거 번들 및 레거시 파일

## Runtime Entry Points

- `npm run login`: 메인 자동화 스크립트
- `npm run record`: 화면 녹화 포함 실행
- `npm run test:whisper`: Whisper/FFmpeg 경로 진단

## Important Notes

- 자격 증명은 루트 `.env`에만 둡니다.
- 런타임 임시 파일은 `artifacts/tmp/` 아래에 생성됩니다.
- 실행 결과 비디오는 `artifacts/recordings/`에 저장됩니다.
- 구조 설명과 핸드오프 문서를 우선 신뢰하고, 세부 구현은 `scripts/`에서 확인합니다.

