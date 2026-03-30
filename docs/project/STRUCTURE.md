# Project Structure & Architecture

이 문서는 현재 저장소를 디렉터리 기준으로 빠르게 이해하기 위한 구조 설명서입니다.

## 1. 핵심 요약

- 실제 실행 코드는 `scripts/`에 있습니다.
- 실행에 필요한 모델/바이너리는 `assets/`에 있습니다.
- 분석 문서와 핸드오프 문서는 `docs/`에 모았습니다.
- 스크린샷, 비디오, 오디오 같은 결과물은 `artifacts/`로 분리했습니다.
- 과거 번들과 레거시 파일은 `archive/`로 치웠습니다.

## 2. 최상위 구조

```text
captchaBypass/
├── AGENTS.md
├── README.md
├── package.json
├── package-lock.json
├── .env
├── assets/
│   ├── ffmpeg-bin/              # Windows용 FFmpeg 번들
│   └── models/                  # Whisper 모델
├── scripts/
│   ├── login.js             # 메인 자동화 스크립트
│   ├── runtime-tools.js         # 경로/모델/FFmpeg/Whisper 해석
│   ├── record-all.js            # 전체 화면 녹화 래퍼
│   ├── test-whisper.js          # 실행 환경 점검
│   └── generate_video.py        # 보고서 영상 생성
├── docs/
│   ├── handoff/                 # LLM/협업용 맥락 문서
│   ├── project/                 # 구조/워크로그
│   ├── reports/                 # 내부 보고서/PDF
│   └── research/                # 외부 리서치 정리본
├── artifacts/
│   ├── audio/                   # 팟캐스트/자막
│   ├── recordings/              # 실행 결과 영상
│   ├── screenshots/             # 페이지 캡처
│   ├── slides/                  # PDF에서 추출한 슬라이드
│   └── tmp/                     # 런타임 임시 파일, 재생성 가능
└── archive/
    ├── bundles/                 # 과거 handoff bundle
    ├── config/                  # 미사용 외부 설정
    └── legacy/                  # 보관용 zip
```

## 3. 실행 엔트리포인트

### `scripts/login.js`

- `.env`에서 계정 정보를 읽습니다.
- 브라우저를 띄우고 로그인 흐름을 수행합니다.
- 오디오 CAPTCHA 관련 파일은 `artifacts/tmp/`에 임시 생성합니다.
- Playwright 비디오는 `artifacts/recordings/login-demo.webm`으로 남깁니다.

### `scripts/runtime-tools.js`

- `assets/models/tiny.pt`와 `assets/ffmpeg-bin/`를 기준으로 실행 환경을 잡습니다.
- `artifacts/` 하위 표준 경로를 상수로 제공합니다.
- FFmpeg/Whisper 탐색과 전체 화면 녹화 명령 생성을 담당합니다.

### `scripts/record-all.js`

- `artifacts/recordings/full-session.mp4`를 만들기 위한 래퍼입니다.
- 백그라운드 FFmpeg 녹화 후 `scripts/login.js`를 실행합니다.

### `scripts/test-whisper.js`

- Whisper/FFmpeg 실행 가능 여부만 확인합니다.
- 실제 모델 품질 검증이나 사이트 접속은 하지 않습니다.

### `scripts/generate_video.py`

- `docs/reports/Post_CAPTCHA_Login_Defense.pdf`와 오디오 파일을 합쳐 MP4를 만듭니다.
- 기본 출력 경로는 `artifacts/recordings/output_video.mp4`입니다.

## 4. 문서 읽기 순서

새 세션에서 빠르게 맥락을 잡으려면 아래 순서를 권장합니다.

1. `../../AGENTS.md`
2. `../handoff/REPORT_CONTEXT.md`
3. `./STRUCTURE.md`
4. `./WORKLOG.md`

## 5. 현재 구조의 의도

- 루트는 진입점만 남깁니다.
- 실행 코드와 증거 산출물을 분리해 작업 중 파일 찾기 비용을 줄입니다.
- 문서 경로가 고정되어 있어 새 세션에서 참조 순서를 쉽게 안내할 수 있습니다.
