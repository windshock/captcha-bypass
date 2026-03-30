# LLM Prompt Template

아래 프롬프트를 그대로 복사해 외부 LLM에 붙여 넣고, 이 번들에 포함된 파일들을 함께 제공하면 됩니다.

```text
You are reviewing a small research codebase related to browser automation and audio CAPTCHA handling.

Your task is to write a report based only on the files provided in this bundle. Do not assume capabilities that are not explicitly supported by the code or evidence. When making claims, ground them in the supplied files and reference filenames.

Please produce a report with the following sections:

1. Executive Summary
2. Project Goal And Scope
3. Architecture Overview
4. End-To-End Execution Flow
5. File-By-File Responsibilities
6. Environment And Dependency Assumptions
7. Reliability Constraints And Failure Modes
8. Evidence Review
9. Documentation vs Code Consistency Check
10. Defensive / Detection Considerations
11. Limitations Of The Current Evidence
12. Recommended Next Experiments

Important instructions:

- Use only the supplied files as evidence.
- Do not invent success-rate numbers.
- Distinguish between implemented behavior, inferred behavior, and unverified assumptions.
- Treat this as a technical analysis and reporting task, not an operational guide.
- If something is not shown in code or artifacts, say that it is unknown.
- Highlight where the implementation is tightly coupled to a specific DOM structure, network response pattern, or local runtime setup.
- Note any unused dependencies or unrelated artifacts present in the repository.

Primary files to rely on first:

- docs/handoff/REPORT_CONTEXT.md
- docs/handoff/ENV_CHECK.md
- README.md
- AGENTS.md
- docs/project/STRUCTURE.md
- docs/project/WORKLOG.md
- scripts/login.js
- scripts/runtime-tools.js
- scripts/record-all.js
- scripts/test-whisper.js
- package.json

Secondary evidence:

- artifacts/screenshots/login-page.png
- artifacts/screenshots/login-page-debug.png
- artifacts/recordings/login-demo.webm
```

## Recommended Usage

- 먼저 `docs/handoff/REPORT_CONTEXT.md`를 읽게 하고
- 그 다음 핵심 코드 파일을 읽게 하고
- 마지막으로 스크린샷/비디오를 증거 자료로 보게 하면 결과가 가장 안정적입니다.
