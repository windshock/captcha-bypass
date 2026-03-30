/**
 * login-agent.js
 *
 * 하이브리드: page-agent(최상위 페이지, 셀렉터 탐색) + Playwright(조작)
 *
 * page-agent는 메인 페이지에 주입되어 UI 패널을 우측에 표시하고,
 * 처음 한 번만 호출해서 캡차 iframe 내 버튼 셀렉터를 찾는다.
 * 이후 모든 클릭/입력은 Playwright가 직접 수행.
 *
 * 사용법:
 *   LOGIN_URL=http://localhost:3000/auth/login/page/test \
 *   LOGIN_PATH_PATTERN=/auth/login/page/ \
 *   SITE_ID=testuser SITE_PW=testpass \
 *   node scripts/login-agent.js
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { chromium } = require('playwright');
const {
  CAPTCHA_AUDIO_PATH,
  CAPTCHA_TEXT_PATH,
  LOGIN_VIDEO_PATH,
  PLAYWRIGHT_VIDEOS_DIR,
  TEMP_DIR,
  getWhisperInvocation,
  ensureArtifactDirs,
  extractDigits
} = require('./runtime-tools');

const LOGIN_URL = process.env.LOGIN_URL ||
  'http://localhost:3000/auth/login/page';
const LOGIN_PATH_PATTERN = process.env.LOGIN_PATH_PATTERN || '/auth/login/';

const PAGE_AGENT_CDN =
  'https://cdn.jsdelivr.net/npm/page-agent@1.6.2/dist/iife/page-agent.demo.js';
const PAGE_AGENT_MODEL = process.env.PAGE_AGENT_MODEL || 'qwen3.5-plus';
const PAGE_AGENT_BASE_URL =
  process.env.PAGE_AGENT_BASE_URL ||
  'https://page-ag-testing-ohftxirgbn.cn-shanghai.fcapp.run';
const PAGE_AGENT_API_KEY = process.env.PAGE_AGENT_API_KEY || 'NA';

// page-agent UI panel side: 'right' or 'left'
const AGENT_PANEL_SIDE = process.env.AGENT_PANEL_SIDE || 'right';

// ─── Page-Agent: top-level injection ───

async function injectPageAgent(page) {
  console.log('[Agent] Injecting page-agent into main page...');
  await page.addScriptTag({ url: PAGE_AGENT_CDN });
  await page.waitForTimeout(3000);

  await page.evaluate(
    ({ model, baseURL, apiKey, side }) => {
      window._agent = new window.PageAgent({ model, baseURL, apiKey, language: 'ko-KR' });

      // Move the page-agent panel to left or right
      setTimeout(() => {
        const panels = document.querySelectorAll('[class*="page-agent"], [id*="page-agent"], [class*="PageAgent"]');
        panels.forEach(el => {
          el.style.position = 'fixed';
          el.style.top = '0';
          el.style.zIndex = '99999';
          el.style.maxWidth = '360px';
          el.style.height = '100vh';
          el.style.overflow = 'auto';
          if (side === 'left') {
            el.style.left = '0';
            el.style.right = 'auto';
          } else {
            el.style.right = '0';
            el.style.left = 'auto';
          }
        });

        // Push page content away from the panel
        document.body.style.marginRight = side === 'right' ? '370px' : '0';
        document.body.style.marginLeft = side === 'left' ? '370px' : '0';
      }, 1000);
    },
    { model: PAGE_AGENT_MODEL, baseURL: PAGE_AGENT_BASE_URL, apiKey: PAGE_AGENT_API_KEY, side: AGENT_PANEL_SIDE }
  );
  console.log(`[Agent] Initialized. UI panel → ${AGENT_PANEL_SIDE} side.`);
}

async function agentExecute(page, instruction) {
  console.log(`[Agent] → "${instruction}"`);
  const result = await page.evaluate(async (cmd) => {
    try {
      const res = await window._agent.execute(cmd);
      return { success: res.success, data: res.data || '', steps: res.history?.length || 0 };
    } catch (err) {
      return { success: false, data: err.message, steps: 0 };
    }
  }, instruction);
  console.log(`[Agent] ← success=${result.success}, steps=${result.steps}`);
  return result;
}

// ─── Whisper recognition ───

function recognizeAudio() {
  const whisper = getWhisperInvocation(CAPTCHA_AUDIO_PATH, TEMP_DIR, 'ko');
  console.log(`[Info] Running Whisper via ${whisper.label}...`);
  execFileSync(whisper.command, whisper.args, { stdio: 'inherit', env: whisper.env });

  if (fs.existsSync(CAPTCHA_TEXT_PATH)) {
    const text = fs.readFileSync(CAPTCHA_TEXT_PATH, 'utf8');
    const digits = extractDigits(text);
    console.log(`[Success] Identified digits: ${digits}`);
    return digits;
  }
  return null;
}

// ─── Main ───

async function main() {
  const id = process.env.SITE_ID;
  const password = process.env.SITE_PW;

  if (!id || !password) {
    console.error('Check .env file for credentials.');
    process.exit(1);
  }

  ensureArtifactDirs();
  const videoDir = PLAYWRIGHT_VIDEOS_DIR;

  // Wider viewport to accommodate agent panel on the side
  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const context = await browser.newContext({
    viewport: { width: 1600, height: 900 },
    recordVideo: { dir: videoDir, size: { width: 1600, height: 900 } }
  });

  const page = await context.newPage();
  page.on('dialog', (dialog) => dialog.dismiss().catch(() => {}));

  console.log(`[Info] Navigating to ${LOGIN_URL}...`);
  await page.goto(LOGIN_URL, { waitUntil: 'networkidle', timeout: 60000 });

  // ─── Phase 1: Inject page-agent at top level ───

  console.log('\n=== Phase 1: page-agent Setup ===');
  await injectPageAgent(page);

  // Ask page-agent to identify the audio button inside the captcha area
  console.log('\n=== Phase 2: Selector Discovery ===');
  await agentExecute(page, '이 페이지의 captcha iframe 안에 있는 음성듣기 버튼을 찾아서 클릭해줘');
  // page-agent may or may not succeed with the iframe — that's OK,
  // we use it for demonstration. Actual clicks go through Playwright.

  // ─── Phase 3: Automation via Playwright ───

  console.log('\n=== Phase 3: Automation (Playwright) ===');
  const captchaFrame = page.frameLocator('#captcha');
  const MAX_RETRIES = 5;
  let attempt = 0;
  let loginSuccess = false;

  while (attempt < MAX_RETRIES && !loginSuccess) {
    attempt++;
    console.log(`\n--- Login Attempt ${attempt}/${MAX_RETRIES} ---`);

    await page.fill('#loginname', id);
    await page.fill('#passwd', password);

    // Refresh captcha
    console.log('[Info] Refreshing captcha...');
    await captchaFrame.locator('.btnRefresh').click();
    await page.waitForTimeout(2000);

    // Audio intercept + click
    await captchaFrame.locator('.btnSound').waitFor({ state: 'visible', timeout: 10000 });

    const responsePromise = page.waitForResponse(async (res) => {
      const url = res.url();
      const ct = res.headers()['content-type'] || '';
      if (url.includes('audio') && (ct.includes('audio') || url.endsWith('.jsp'))) {
        try {
          const buf = await res.body();
          return buf.length > 5000;
        } catch { return false; }
      }
      return false;
    }, { timeout: 20000 });

    console.log('[Info] Clicking audio button...');
    await captchaFrame.locator('.btnSound').click();

    try {
      const response = await responsePromise;
      const audioBuffer = await response.body();
      console.log(`[Info] Audio captured (${audioBuffer.length} bytes).`);
      fs.writeFileSync(CAPTCHA_AUDIO_PATH, audioBuffer);

      const captcha = recognizeAudio();

      if (captcha && captcha.length >= 5) {
        await captchaFrame.locator('#captchaTxt').fill(captcha);
        await page.locator('.btnSolid.fix').click();
        console.log('[Info] Form submitted. Checking result...');

        try {
          await page.waitForURL(
            (url) => !url.toString().includes(LOGIN_PATH_PATTERN),
            { timeout: 10000 }
          );
          loginSuccess = true;
          console.log(`[Done] Login successful: ${page.url()}`);
        } catch {
          console.log('[Warning] Login failed or CAPTCHA incorrect. Retrying...');
          await page.waitForTimeout(2000);
        }
      } else {
        console.log('[Warning] CAPTCHA recognition was poor. Retrying...');
      }
    } catch (err) {
      console.log(`[Error] Audio capture failed: ${err.message}`);
    } finally {
      if (fs.existsSync(CAPTCHA_AUDIO_PATH)) fs.unlinkSync(CAPTCHA_AUDIO_PATH);
      if (fs.existsSync(CAPTCHA_TEXT_PATH)) fs.unlinkSync(CAPTCHA_TEXT_PATH);
    }
  }

  if (!loginSuccess) {
    console.error('[Fail] Could not log in after several attempts.');
  }

  await page.waitForTimeout(3000);
  await context.close();
  await page.video().saveAs(LOGIN_VIDEO_PATH);
  console.log(`[Success] Video saved as: ${path.basename(LOGIN_VIDEO_PATH)}`);
  fs.rmSync(videoDir, { recursive: true, force: true });
  await browser.close();
}

main().catch((e) => console.error(e));
