const express = require('express');
const session = require('express-session');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Config ───

const CAPTCHA_MODE = process.env.CAPTCHA_MODE || 'custom'; // 'custom' | 'recaptcha'
const RECAPTCHA_SITE_KEY =
  process.env.RECAPTCHA_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';
const RECAPTCHA_SECRET_KEY =
  process.env.RECAPTCHA_SECRET_KEY || '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe';

const DIGIT_WORDS_KO = ['영', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
const CAPTCHA_LENGTH = 6;
const LOGIN_PATH = '/auth/login/page';

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  session({
    secret: 'captcha-mock-secret',
    resave: false,
    saveUninitialized: true,
    cookie: { sameSite: 'lax' }
  })
);
app.use('/static', express.static(path.join(__dirname, 'public')));

// ─── Helpers ───

function generateDigits(len = CAPTCHA_LENGTH) {
  let digits = '';
  for (let i = 0; i < len; i++) {
    digits += Math.floor(Math.random() * 10).toString();
  }
  return digits;
}

function digitsToKorean(digits) {
  return digits
    .split('')
    .map((d) => DIGIT_WORDS_KO[parseInt(d)])
    .join(', ');
}

function generateAudioBuffer(digits) {
  const text = digitsToKorean(digits);
  const uid = crypto.randomUUID();
  const mp3File = `/tmp/captcha_${uid}.mp3`;
  const wavFile = `/tmp/captcha_${uid}.wav`;

  try {
    // Try gTTS first (natural Korean voice, needs internet)
    execFileSync('gtts-cli', [text, '-l', 'ko', '-o', mp3File], { timeout: 15000 });
    return { buf: fs.readFileSync(mp3File), contentType: 'audio/mpeg' };
  } catch {
    // Fallback to espeak-ng (offline, lower quality)
    execFileSync('espeak-ng', ['-v', 'ko', '-s', '100', '-g', '15', '-w', wavFile, text], {
      timeout: 10000
    });
    return { buf: fs.readFileSync(wavFile), contentType: 'audio/wav' };
  } finally {
    if (fs.existsSync(mp3File)) fs.unlinkSync(mp3File);
    if (fs.existsSync(wavFile)) fs.unlinkSync(wavFile);
  }
}

function generateCaptchaSVG(digits) {
  const W = 200;
  const H = 60;
  let lines = '';
  for (let i = 0; i < 5; i++) {
    const x1 = Math.random() * W;
    const y1 = Math.random() * H;
    const x2 = Math.random() * W;
    const y2 = Math.random() * H;
    const color = `rgb(${rnd(100, 200)},${rnd(100, 200)},${rnd(100, 200)})`;
    lines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="1"/>`;
  }

  let chars = '';
  const spacing = W / (digits.length + 1);
  for (let i = 0; i < digits.length; i++) {
    const x = spacing * (i + 1);
    const y = 35 + (Math.random() * 10 - 5);
    const rot = Math.random() * 30 - 15;
    const color = `rgb(${rnd(0, 100)},${rnd(0, 100)},${rnd(0, 100)})`;
    chars += `<text x="${x}" y="${y}" font-size="28" font-family="monospace" fill="${color}" transform="rotate(${rot},${x},${y})" text-anchor="middle">${digits[i]}</text>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="#f0f0f0"/>
    ${lines}${chars}
  </svg>`;
}

function rnd(min, max) {
  return Math.floor(Math.random() * (max - min) + min);
}

// reCAPTCHA server-side verification
async function verifyRecaptcha(token) {
  const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `secret=${encodeURIComponent(RECAPTCHA_SECRET_KEY)}&response=${encodeURIComponent(token)}`
  });
  return res.json();
}

// ─── Login page renderer ───

function renderLoginPage(req) {
  const tpl = fs.readFileSync(path.join(__dirname, 'public', 'login.html'), 'utf8');

  if (CAPTCHA_MODE === 'recaptcha') {
    const captchaHTML = `
      <div class="captcha-area" style="padding:14px;text-align:center">
        <div class="g-recaptcha" data-sitekey="${RECAPTCHA_SITE_KEY}"></div>
      </div>`;
    const captchaScript = `<script src="https://www.google.com/recaptcha/api.js" async defer></script>`;
    const formScript = ''; // reCAPTCHA auto-injects g-recaptcha-response in form

    return tpl
      .replace('{{CAPTCHA_SECTION}}', captchaHTML)
      .replace('{{CAPTCHA_SCRIPTS}}', captchaScript)
      .replace('{{FORM_SUBMIT_SCRIPT}}', formScript)
      .replace('{{MODE_BADGE}}', 'reCAPTCHA v2');
  }

  // custom mode
  const captchaHTML = `
    <div class="captcha-area">
      <iframe id="captcha" src="/captcha"></iframe>
    </div>
    <input type="hidden" id="captchaValue" name="captcha" />`;
  const captchaScript = '';
  const formScript = `<script>
    document.getElementById('loginForm').addEventListener('submit', function () {
      try {
        var iframe = document.getElementById('captcha');
        var captchaInput = iframe.contentDocument.getElementById('captchaTxt');
        document.getElementById('captchaValue').value = captchaInput ? captchaInput.value : '';
      } catch (e) { console.warn('Could not read captcha from iframe:', e); }
    });
  </script>`;

  return tpl
    .replace('{{CAPTCHA_SECTION}}', captchaHTML)
    .replace('{{CAPTCHA_SCRIPTS}}', captchaScript)
    .replace('{{FORM_SUBMIT_SCRIPT}}', formScript)
    .replace('{{MODE_BADGE}}', 'Custom Audio');
}

// ─── Routes ───

app.get('/', (_req, res) => {
  res.redirect(`${LOGIN_PATH}/test`);
});

// Login page
app.get(`${LOGIN_PATH}/*`, (req, res) => {
  if (!req.session.captcha) {
    req.session.captcha = generateDigits();
  }
  console.log(`[Mock] Login page loaded (${CAPTCHA_MODE} mode). Captcha: ${req.session.captcha}`);
  res.send(renderLoginPage(req));
});

// ─── Custom captcha routes ───

app.get('/captcha', (req, res) => {
  if (!req.session.captcha) req.session.captcha = generateDigits();
  res.sendFile(path.join(__dirname, 'public', 'captcha.html'));
});

app.get('/captcha/image', (req, res) => {
  const digits = req.session.captcha || generateDigits();
  req.session.captcha = digits;
  res.set('Content-Type', 'image/svg+xml');
  res.set('Cache-Control', 'no-store');
  res.send(generateCaptchaSVG(digits));
});

app.get('/captcha/audio', (req, res) => {
  const digits = req.session.captcha || generateDigits();
  req.session.captcha = digits;
  console.log(`[Mock] Audio captcha requested. Digits: ${digits}`);
  try {
    const { buf, contentType } = generateAudioBuffer(digits);
    res.set('Content-Type', contentType);
    res.set('Content-Length', buf.length);
    res.set('Cache-Control', 'no-store');
    res.send(buf);
  } catch (err) {
    console.error('[Mock] Audio generation failed:', err.message);
    res.status(500).json({ error: 'Audio generation failed' });
  }
});

app.get('/captcha/refresh', (req, res) => {
  req.session.captcha = generateDigits();
  console.log(`[Mock] Captcha refreshed. New answer: ${req.session.captcha}`);
  res.json({ ok: true, hint: req.session.captcha });
});

// ─── Login submission ───

app.post(`${LOGIN_PATH}/submit`, async (req, res) => {
  const { loginname, passwd } = req.body;

  if (CAPTCHA_MODE === 'recaptcha') {
    const token = req.body['g-recaptcha-response'] || '';
    console.log(`[Mock] Login attempt (reCAPTCHA) — id: ${loginname}`);

    try {
      const result = await verifyRecaptcha(token);
      if (!result.success) {
        console.log('[Mock] reCAPTCHA verification failed:', result['error-codes']);
        return res.redirect(`${LOGIN_PATH}/test?error=captcha`);
      }
    } catch (err) {
      console.error('[Mock] reCAPTCHA API error:', err.message);
      return res.redirect(`${LOGIN_PATH}/test?error=captcha`);
    }
  } else {
    const captcha = req.body.captcha || '';
    const expected = req.session.captcha;
    console.log(`[Mock] Login attempt (custom) — id: ${loginname}, captcha: ${captcha}, expected: ${expected}`);

    if (!captcha || captcha !== expected) {
      console.log('[Mock] Captcha mismatch → back to login');
      req.session.captcha = generateDigits();
      return res.redirect(`${LOGIN_PATH}/test?error=captcha`);
    }
  }

  req.session.captcha = null;
  console.log('[Mock] Login success → dashboard');
  res.redirect('/dashboard');
});

app.get('/dashboard', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'success.html'));
});

// ─── Start ───

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  🔒  Mock CAPTCHA site running at http://localhost:${PORT}`);
  console.log(`  📄  Login: http://localhost:${PORT}${LOGIN_PATH}/test`);
  console.log(`  🧩  Mode:  ${CAPTCHA_MODE}${CAPTCHA_MODE === 'recaptcha' ? ' (site key: ' + RECAPTCHA_SITE_KEY.slice(0, 12) + '...)' : ''}\n`);
});
