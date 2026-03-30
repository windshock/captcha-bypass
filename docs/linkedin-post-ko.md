아래 내용을 LinkedIn에 그대로 복사-붙여넣기 하세요.

————————————————————————

당신이 30초간 풀었던 캡차, 해커에게는 0원짜리 자동문입니다.

Playwright + Whisper + Alibaba Page-Agent.
오픈소스 세 개를 조합해서 오디오 CAPTCHA 자동 우회 PoC를 만들었습니다. 비용 $0, 100% 로컬.

특히 Page-Agent가 인상적이었습니다. 기존 자동화는 CSS 셀렉터를 하드코딩해야 해서 UI가 바뀌면 깨졌는데, LLM 에이전트는 "오디오 버튼 눌러"라는 자연어만으로 DOM을 탐색하고 실행합니다. DOM 난독화가 더 이상 방어가 아닌 시대.

코드를 짤 줄 몰라도 됩니다. 인간 솔버 마켓은 1,000건에 $0.5, 언블로커 API는 $1.5. 실패하면 과금도 없습니다. 방어에는 수억, 공격에는 커피 한 잔 값.

NIST와 OWASP 모두 같은 결론입니다. CAPTCHA는 방어가 아니라 마찰(friction)일 뿐. 진짜 방어는 서버측 토큰 검증, 계정 단위 속도 제한, 그리고 궁극적으로 Passkey/FIDO2.

상세 분석은 블로그에 올려두었습니다. (링크는 댓글)

#CAPTCHA #InfoSec #Passkey #FIDO2 #Playwright #Whisper #PageAgent #SecurityResearch #사이버보안
