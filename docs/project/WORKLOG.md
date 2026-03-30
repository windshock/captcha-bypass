# Login Automation Worklog

## 2026-03-30 — 저장소 구조 재정리

- 루트 혼잡도를 줄이기 위해 실행 코드, 자산, 문서, 산출물, 보관 파일을 디렉터리별로 분리
- 실행 코드 이동
  - `scripts/login.js`
  - `scripts/runtime-tools.js`
  - `scripts/record-all.js`
  - `scripts/test-whisper.js`
  - `scripts/generate_video.py`
- 실행 자산 이동
  - `assets/models/tiny.pt`
  - `assets/ffmpeg-bin/`
- 문서 이동
  - `docs/handoff/`
  - `docs/project/`
  - `docs/reports/`
  - `docs/research/`
- 증거 산출물 이동
  - `artifacts/screenshots/`
  - `artifacts/recordings/`
  - `artifacts/audio/`
  - `artifacts/slides/`
- 과거 번들과 미사용 파일은 `archive/` 아래로 이동
- 새 세션용 시작 문서 `AGENTS.md` 추가
- 런타임 임시 파일을 `artifacts/tmp/`로 고정

## 2026-03-25 — 초기 구현

- `.env`에 `SITE_ID`, `SITE_PW`를 설정하고 프로젝트를 초기화
- Playwright + dotenv를 설치하고 Chromium 런타임 구성
- 대상 로그인 페이지 DOM 구조 파악 (`#loginname`, `#passwd`, `iframe#captcha`)
- CAPTCHA 입력 UI가 iframe 내부에 위치하며, 제출 시 메인 폼의 hidden 필드로 값이 복사되는 흐름 확인
- `login.js` 첫 버전 작성 (수동 CAPTCHA 입력 방식)
- 로그인 버튼 셀렉터를 한글 텍스트 기반에서 CSS 클래스(`.btnSolid.fix`)로 변경하여 인코딩 문제 해결

## 2026-03-26 — 오디오 CAPTCHA 자동화 및 macOS 지원

- Whisper + FFmpeg 로컬 환경 탐색 유틸리티 `runtime-tools.js` 구현
  - `whisper`, `python3 -m whisper`, `python -m whisper` 등 순차 탐색
  - `FFMPEG_BIN`, 번들 `ffmpeg-bin`, 시스템 ffmpeg 순차 탐색
  - macOS `avfoundation` / Windows `gdigrab` 기반 화면 녹화 명령 생성
- 오디오 CAPTCHA 네트워크 응답 가로채기 + Whisper ASR 자동 인식 파이프라인 완성
  - 오디오 버튼 클릭 → 네트워크 응답 대기 → `temp_captcha.wav` 저장 → Whisper 호출 → 숫자 추출 → 자동 입력
- 최대 5회 재시도 루프 구현
- `record-all.js` (FFmpeg 전체 화면 녹화 래퍼) 구현
- `test-whisper.js` (환경 검증 스크립트) 구현
- macOS 환경 직접 테스트 완료
  - `test-whisper.js` 통과 (Whisper CLI + FFmpeg 7.1.1 탐지 성공)
  - `login.js` 1회차 시도에서 로그인 성공 (숫자 `72230` 인식)
- `login-demo.webm` (Playwright 녹화) 및 `full-session.mp4` (화면 녹화) 생성
- `login-demo.mp4`로 변환
- 프로젝트 문서 정리
  - `README.md` — 설치 가이드, macOS 참고사항, 환경 변수 설명
  - `STRUCTURE.md` — LLM/개발자용 프로젝트 구조 설명
  - `REPORT_CONTEXT.md` — LLM 핸드오프용 분석 맥락 문서
  - `INTERNAL_REPORT.md` — 내부 보안 평가 보고서 (외부 리서치 매핑 포함)
  - `TARGET_DETAILS.md` — 대상 서비스 특정 정보 별첨
  - `deep-research-report-4-ko.md` — 외부 리서치 한글 번역본
- `package.json`에서 미사용 `openai` 의존성 제거
- `generate_video.py` — PDF 슬라이드 + 오디오 팟캐스트 → MP4 영상 생성 스크립트 추가

## Notes

- 실제 계정 정보는 `.env`에만 존재하며 `.gitignore`로 추적에서 제외
- 성공률 정량 통계는 아직 수집하지 않음 (후속 과제)
