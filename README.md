# captchaBypass

브라우저 자동화, 로컬 Whisper, FFmpeg 조합을 분석하고 문서화한 연구용 작업 디렉터리입니다. 실행 코드와 보고서, 증거 산출물, 과거 핸드오프 번들을 분리해 두었습니다.

## 새 세션 시작 순서

다음에 다시 "프로젝트 이해시켜 달라"는 말을 줄이려면 아래 순서로 읽으면 됩니다.

1. `AGENTS.md`
2. `docs/handoff/REPORT_CONTEXT.md`
3. `docs/project/STRUCTURE.md`
4. 필요 시 `docs/project/WORKLOG.md`

## 현재 구조

```text
captchaBypass/
├── AGENTS.md
├── README.md
├── package.json
├── package-lock.json
├── .env
├── assets/
│   ├── ffmpeg-bin/
│   └── models/
├── scripts/
│   ├── login.js
│   ├── runtime-tools.js
│   ├── record-all.js
│   ├── test-whisper.js
│   └── generate_video.py
├── docs/
│   ├── handoff/
│   ├── project/
│   ├── reports/
│   └── research/
├── artifacts/
│   ├── audio/
│   ├── recordings/
│   ├── screenshots/
│   ├── slides/
│   └── tmp/
└── archive/
    ├── bundles/
    ├── config/
    └── legacy/
```

## 실행

루트에서 실행합니다.

```bash
npm install
npx playwright install chromium
```

```bash
npm run login
npm run record
npm run test:whisper
```

루트 `.env`에는 아래 값을 둡니다.

```env
SITE_ID=your_id
SITE_PW=your_password
```

## 로컬 테스트 (Docker Mock Site)

실제 사이트 대신 로컬 Docker 목(mock) 사이트로 테스트할 수 있습니다.

```bash
# 1. 목 사이트 실행
docker compose up -d

# 2. .env에 로컬 URL 설정
LOGIN_URL=http://localhost:3000/auth/login/page/test

# 3. 자동화 스크립트 실행
npm run login

# 4. 종료
docker compose down
```

### reCAPTCHA v2 모드

`docker-compose.yml`에서 `CAPTCHA_MODE=recaptcha`로 변경하면 Google reCAPTCHA v2 체크박스가 나타납니다. 기본값은 Google 테스트 키(항상 통과)이며, 실제 챌린지를 테스트하려면 [reCAPTCHA 관리 콘솔](https://www.google.com/recaptcha/admin)에서 발급한 키로 교체하세요.

목 사이트는 실제 사이트와 동일한 셀렉터 구조(`#loginname`, `#passwd`, `#captcha` iframe, `.btnSound`, `#captchaTxt`, `.btnSolid.fix`)를 갖고 있으며, espeak-ng로 한국어 숫자 오디오 캡차를 생성합니다. 서버 콘솔에 캡차 정답이 출력됩니다.

## 산출물 위치

- 실행 결과 비디오: `artifacts/recordings/`
- 런타임 임시 파일: `artifacts/tmp/`
- 스크린샷: `artifacts/screenshots/`
- 오디오/자막: `artifacts/audio/`

## 문서 위치

- 빠른 핸드오프: `docs/handoff/REPORT_CONTEXT.md`
- 구조 설명: `docs/project/STRUCTURE.md`
- 작업 로그: `docs/project/WORKLOG.md`
- 내부 보고서: `docs/reports/INTERNAL_REPORT.md`
- 리서치 자료: `docs/research/`

## 참고

- 모델 파일은 `assets/models/tiny.pt`에 있습니다.
- Windows용 FFmpeg 바이너리는 `assets/ffmpeg-bin/`에 있습니다.
- `artifacts/tmp/`는 재생성 가능한 임시 디렉터리라 Git에서 제외합니다.
