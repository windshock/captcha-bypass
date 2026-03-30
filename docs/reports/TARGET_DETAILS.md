# 대상 서비스 상세 정보 (Target-Specific Details)

> **⚠️ 이 문서는 PoC 대상 서비스를 특정할 수 있는 정보를 분리한 별첨 문서입니다.**
> **GitHub 등 외부 공개 저장소에 이 문서를 포함하지 마십시오.**
> **실제 대상 정보는 로컬 `.env` 파일과 비공개 채널에서만 관리합니다.**

---

## 대상 서비스

- **서비스명:** (비공개)
- **대상 페이지:** 로그인 페이지

---

## 로그인 URL

환경변수 `LOGIN_URL`로 설정합니다. 기본값은 로컬 테스트 서버(`http://localhost:3000/auth/login/page`)입니다.

---

## DOM 구조 (서비스 고유 셀렉터)

| 요소 | 셀렉터 |
|---|---|
| 아이디 입력 | `#loginname` |
| 비밀번호 입력 | `#passwd` |
| CAPTCHA iframe | `iframe#captcha` |
| 오디오 버튼 | `.btnSound` |
| 새로고침 버튼 | `.btnRefresh` |
| CAPTCHA 입력란 | `#captchaTxt` |
| 로그인 버튼 | `.btnSolid.fix` |

---

## CAPTCHA 구현 특성

- CAPTCHA UI는 메인 문서가 아닌 `iframe#captcha` 내부에 위치
- 메인 문서에 숨겨진 `input[name="captchaTxt"]` 필드가 존재
- 제출 흐름에서 iframe 값을 메인 폼의 hidden 필드로 복사 후 전송
- 오디오 CAPTCHA 응답은 URL에 `audio` 포함 또는 특정 확장자를 가진 네트워크 응답으로 전달
- CAPTCHA 형식: **숫자 5자리 이상** (한국어 음성)

---

## 환경 변수 매핑

| 변수 | 용도 |
|---|---|
| `SITE_ID` | 대상 서비스 로그인 아이디 |
| `SITE_PW` | 대상 서비스 로그인 비밀번호 |
| `LOGIN_URL` | 대상 로그인 페이지 URL |
| `LOGIN_PATH_PATTERN` | 로그인 URL 패턴 (성공 판정 기준) |

---

## 코드 파일 매핑

| 파일 | 서비스 특정 내용 |
|---|---|
| `scripts/login.js` | `LOGIN_URL` 환경변수로 대상 지정 (기본값: 로컬 테스트 서버) |
| `scripts/login-agent.js` | page-agent 하이브리드 버전. 동일하게 `LOGIN_URL` 환경변수 지원 |
| `.env` | `SITE_ID`, `SITE_PW` 키 사용 |

---

## 증거 자료 (서비스 특정)

> 아래 파일은 `.gitignore`로 제외되어 있으며 공개 저장소에 포함되지 않습니다.

| 파일 | 내용 |
|---|---|
| `artifacts/screenshots/login-page.png` | 로그인 페이지 스크린샷 |
| `artifacts/screenshots/login-page-debug.png` | DOM 디버깅 스크린샷 |
| `artifacts/recordings/login-demo.webm` | 로그인 성공 과정 브라우저 녹화 |
| `artifacts/recordings/output_video.mp4` | 전체 화면 녹화 |
