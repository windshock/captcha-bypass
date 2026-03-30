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

async function solveCaptchaWithLocalWhisper(page) {
  const captchaFrame = page.frameLocator('#captcha');
  const audioBtn = captchaFrame.locator('.btnSound');
  const refreshBtn = captchaFrame.locator('.btnRefresh');

  try {
    // 0. Refresh captcha to get a clean start if needed
    console.log('[Info] Refreshing captcha for a new attempt...');
    await refreshBtn.click();
    await page.waitForTimeout(2000);

    await audioBtn.waitFor({ state: 'visible', timeout: 10000 });
    console.log('[Info] Audio button found.');
    
    const responsePromise = page.waitForResponse(async (res) => {
      const url = res.url();
      const contentType = res.headers()['content-type'] || '';
      if (url.includes('audio') && (contentType.includes('audio') || url.endsWith('.jsp'))) {
        try {
          const buffer = await res.body();
          return buffer.length > 5000;
        } catch (e) { return false; }
      }
      return false;
    }, { timeout: 20000 });

    await audioBtn.click();
    const response = await responsePromise;
    const audioBuffer = await response.body();
    console.log(`[Info] Audio captured (${audioBuffer.length} bytes).`);

    fs.writeFileSync(CAPTCHA_AUDIO_PATH, audioBuffer);

    const whisper = getWhisperInvocation(CAPTCHA_AUDIO_PATH, TEMP_DIR, 'ko');

    console.log(`[Info] Running Whisper via ${whisper.label}...`);
    execFileSync(whisper.command, whisper.args, { stdio: 'inherit', env: whisper.env });

    if (fs.existsSync(CAPTCHA_TEXT_PATH)) {
      const resultText = fs.readFileSync(CAPTCHA_TEXT_PATH, 'utf8');
      const digits = extractDigits(resultText);

      console.log(`[Success] Identified digits: ${digits}`);
      return digits;
    }
  } catch (error) {
    console.error('[Error] Solve attempt failed:', error.message);
  } finally {
    if (fs.existsSync(CAPTCHA_AUDIO_PATH)) fs.unlinkSync(CAPTCHA_AUDIO_PATH);
    if (fs.existsSync(CAPTCHA_TEXT_PATH)) fs.unlinkSync(CAPTCHA_TEXT_PATH);
  }
  return null;
}

async function main() {
  const id = process.env.SITE_ID;
  const password = process.env.SITE_PW;

  if (!id || !password) {
    console.error('Check .env file for credentials.');
    process.exit(1);
  }

  ensureArtifactDirs();
  const videoDir = PLAYWRIGHT_VIDEOS_DIR;

  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const context = await browser.newContext({
    recordVideo: { dir: videoDir, size: { width: 1280, height: 720 } }
  });
  
  const page = await context.newPage();
  page.on('dialog', dialog => dialog.dismiss().catch(() => {}));
  console.log(`[Info] Navigating to login...`);
  await page.goto(LOGIN_URL, { waitUntil: 'networkidle', timeout: 60000 });

  const MAX_RETRIES = 5;
  let attempt = 0;
  let loginSuccess = false;

  while (attempt < MAX_RETRIES && !loginSuccess) {
    attempt++;
    console.log(`\n--- Login Attempt ${attempt}/${MAX_RETRIES} ---`);

    await page.fill('#loginname', id);
    await page.fill('#passwd', password);

    const captcha = await solveCaptchaWithLocalWhisper(page);

    if (captcha && captcha.length >= 5) {
      try {
        const captchaFrame = page.frameLocator('#captcha');
        await captchaFrame.locator('#captchaTxt').fill(captcha);
        const loginButton = page.locator('.btnSolid.fix');
        await loginButton.click();
        console.log('[Info] Form submitted. Checking result...');

        // Wait to see if URL changes
        try {
          await page.waitForURL(url => !url.toString().includes(LOGIN_PATH_PATTERN), { timeout: 10000 });
          loginSuccess = true;
          console.log(`[Done] Login successful: ${page.url()}`);
        } catch (e) {
          console.log('[Warning] Login failed or CAPTCHA was incorrect. Retrying...');
        }
      } catch (e) {
        console.log('[Error] Interaction failed during this attempt.');
      }
    } else {
      console.log('[Warning] CAPTCHA recognition was poor. Retrying with a new one...');
    }
  }

  if (!loginSuccess) {
    console.error('[Fail] Could not log in after several attempts.');
  }

  await page.waitForTimeout(5000);
  await context.close();          // flush video before browser exits
  await page.video().saveAs(LOGIN_VIDEO_PATH);
  console.log(`[Success] Full video saved as: ${path.basename(LOGIN_VIDEO_PATH)}`);
  fs.rmSync(videoDir, { recursive: true, force: true });
  await browser.close();
}

main().catch(e => console.error(e));
