const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const ASSETS_DIR = path.join(PROJECT_ROOT, 'assets');
const ARTIFACTS_DIR = path.join(PROJECT_ROOT, 'artifacts');
const FFMPEG_BIN_DIR = path.join(ASSETS_DIR, 'ffmpeg-bin');
const MODEL_PATH = path.join(ASSETS_DIR, 'models', 'tiny.pt');
const RECORDINGS_DIR = path.join(ARTIFACTS_DIR, 'recordings');
const SCREENSHOTS_DIR = path.join(ARTIFACTS_DIR, 'screenshots');
const SLIDES_DIR = path.join(ARTIFACTS_DIR, 'slides');
const AUDIO_DIR = path.join(ARTIFACTS_DIR, 'audio');
const TEMP_DIR = path.join(ARTIFACTS_DIR, 'tmp');
const PLAYWRIGHT_VIDEOS_DIR = path.join(TEMP_DIR, 'playwright-videos');
const CAPTCHA_AUDIO_PATH = path.join(TEMP_DIR, 'temp_captcha.wav');
const CAPTCHA_TEXT_PATH = path.join(TEMP_DIR, 'temp_captcha.txt');
const LOGIN_VIDEO_PATH = path.join(RECORDINGS_DIR, 'login-demo.webm');
const FULL_SESSION_VIDEO_PATH = path.join(RECORDINGS_DIR, 'full-session.mp4');

function fileExists(filePath) {
  return Boolean(filePath) && fs.existsSync(filePath);
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function runCheck(command, args, env) {
  const result = spawnSync(command, args, {
    env,
    stdio: 'ignore'
  });

  return !result.error && result.status === 0;
}

function prependToPath(entries, env = process.env) {
  const validEntries = entries.filter(Boolean);
  if (!validEntries.length) return { ...env };

  const nextEnv = { ...env };
  const currentPath = nextEnv.PATH || '';
  nextEnv.PATH = currentPath
    ? `${validEntries.join(path.delimiter)}${path.delimiter}${currentPath}`
    : validEntries.join(path.delimiter);
  return nextEnv;
}

function getBundledExecutable(toolName) {
  const extension = process.platform === 'win32' ? '.exe' : '';
  const candidate = path.join(FFMPEG_BIN_DIR, `${toolName}${extension}`);
  return fileExists(candidate) ? candidate : null;
}

function ensureArtifactDirs() {
  [
    ARTIFACTS_DIR,
    RECORDINGS_DIR,
    SCREENSHOTS_DIR,
    SLIDES_DIR,
    AUDIO_DIR,
    TEMP_DIR,
    PLAYWRIGHT_VIDEOS_DIR
  ].forEach(ensureDir);
}

function buildRuntimeEnv() {
  const extraPaths = [];
  const bundledFfmpeg = getBundledExecutable('ffmpeg');

  if (process.env.FFMPEG_BIN_DIR) {
    extraPaths.push(process.env.FFMPEG_BIN_DIR);
  }

  if (bundledFfmpeg) {
    extraPaths.push(FFMPEG_BIN_DIR);
  }

  return prependToPath(extraPaths);
}

function resolveFfmpegCommand(env = buildRuntimeEnv()) {
  const candidates = [];

  if (process.env.FFMPEG_BIN) {
    candidates.push(process.env.FFMPEG_BIN);
  }

  const bundled = getBundledExecutable('ffmpeg');
  if (bundled) {
    candidates.push(bundled);
  }

  candidates.push('ffmpeg');

  for (const candidate of candidates) {
    if (runCheck(candidate, ['-version'], env)) {
      return candidate;
    }
  }

  throw new Error(
    'FFmpeg executable was not found. Install ffmpeg or set FFMPEG_BIN/FFMPEG_BIN_DIR.'
  );
}

function resolveWhisperRunner(env = buildRuntimeEnv()) {
  const candidates = [];

  if (process.env.WHISPER_BIN) {
    candidates.push({
      command: process.env.WHISPER_BIN,
      baseArgs: [],
      label: `WHISPER_BIN (${process.env.WHISPER_BIN})`,
      checkArgs: ['--help']
    });
  }

  candidates.push({
    command: 'whisper',
    baseArgs: [],
    label: 'whisper CLI',
    checkArgs: ['--help']
  });

  candidates.push({
    command: 'python3',
    baseArgs: ['-m', 'whisper'],
    label: 'python3 -m whisper',
    checkArgs: ['-m', 'whisper', '--help']
  });

  candidates.push({
    command: 'python',
    baseArgs: ['-m', 'whisper'],
    label: 'python -m whisper',
    checkArgs: ['-m', 'whisper', '--help']
  });

  if (process.platform === 'win32') {
    candidates.push({
      command: 'py',
      baseArgs: ['-m', 'whisper'],
      label: 'py -m whisper',
      checkArgs: ['-m', 'whisper', '--help']
    });
  }

  for (const candidate of candidates) {
    if (runCheck(candidate.command, candidate.checkArgs, env)) {
      return candidate;
    }
  }

  throw new Error(
    'Whisper executable was not found. Install openai-whisper so `whisper` works in PATH, or set WHISPER_BIN.'
  );
}

function ensureModelExists() {
  if (!fileExists(MODEL_PATH)) {
    throw new Error(`Whisper model file is missing: ${MODEL_PATH}`);
  }
}

function getWhisperInvocation(audioPath, outputDir, language = 'ko') {
  ensureModelExists();

  const env = buildRuntimeEnv();
  const runner = resolveWhisperRunner(env);
  const args = [
    ...runner.baseArgs,
    audioPath,
    '--model',
    MODEL_PATH,
    '--language',
    language,
    '--output_dir',
    outputDir,
    '--output_format',
    'txt'
  ];

  return { ...runner, args, env };
}

function getScreenRecordingCommand(outputFile) {
  const env = buildRuntimeEnv();
  const command = resolveFfmpegCommand(env);
  const framerate = process.env.FFMPEG_FRAMERATE || '15';

  if (process.platform === 'win32') {
    return {
      command,
      args: [
        '-f',
        'gdigrab',
        '-framerate',
        framerate,
        '-i',
        'desktop',
        '-c:v',
        'libx264',
        '-preset',
        'ultrafast',
        '-pix_fmt',
        'yuv420p',
        '-y',
        outputFile
      ],
      env,
      description: 'Windows gdigrab desktop capture'
    };
  }

  if (process.platform === 'darwin') {
    const screenDevice = process.env.FFMPEG_SCREEN_DEVICE || 'Capture screen 0';
    const audioDevice = process.env.FFMPEG_AUDIO_DEVICE || 'none';

    return {
      command,
      args: [
        '-f',
        'avfoundation',
        '-capture_cursor',
        '1',
        '-framerate',
        framerate,
        '-i',
        `${screenDevice}:${audioDevice}`,
        '-c:v',
        'libx264',
        '-preset',
        'ultrafast',
        '-pix_fmt',
        'yuv420p',
        '-y',
        outputFile
      ],
      env,
      description: `macOS avfoundation capture (${screenDevice})`
    };
  }

  throw new Error(
    `Screen recording is not configured for platform "${process.platform}".`
  );
}

// Korean number words → digit mapping
const KO_DIGIT_MAP = {
  '영': '0', '공': '0', '빵': '0',
  '일': '1', '하나': '1',
  '이': '2', '둘': '2',
  '삼': '3', '셋': '3',
  '사': '4', '넷': '4',
  '오': '5', '다섯': '5', '우': '5',
  '육': '6', '여섯': '6', '륙': '6',
  '칠': '7', '일곱': '7',
  '팔': '8', '여덟': '8',
  '구': '9', '아홉': '9',
};

/**
 * Whisper 출력 텍스트에서 숫자를 추출한다.
 * 아라비아 숫자(0-9)와 한글 숫자 단어(영·일·이…팔·구)를 모두 인식.
 */
function extractDigits(text) {
  let result = '';
  // 긴 단어부터 먼저 매칭 (하나, 여섯 등이 '이', '여'에 먼저 걸리지 않게)
  const sortedWords = Object.keys(KO_DIGIT_MAP).sort((a, b) => b.length - a.length);
  const koPattern = sortedWords.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const regex = new RegExp(`(\\d|${koPattern})`, 'g');
  let match;
  while ((match = regex.exec(text)) !== null) {
    const token = match[1];
    if (/\d/.test(token)) {
      result += token;
    } else if (KO_DIGIT_MAP[token] !== undefined) {
      result += KO_DIGIT_MAP[token];
    }
  }
  return result;
}

module.exports = {
  ARTIFACTS_DIR,
  AUDIO_DIR,
  CAPTCHA_AUDIO_PATH,
  CAPTCHA_TEXT_PATH,
  FULL_SESSION_VIDEO_PATH,
  FFMPEG_BIN_DIR,
  LOGIN_VIDEO_PATH,
  MODEL_PATH,
  PLAYWRIGHT_VIDEOS_DIR,
  PROJECT_ROOT,
  RECORDINGS_DIR,
  SCREENSHOTS_DIR,
  SLIDES_DIR,
  TEMP_DIR,
  buildRuntimeEnv,
  ensureArtifactDirs,
  ensureDir,
  extractDigits,
  getScreenRecordingCommand,
  getWhisperInvocation,
  resolveFfmpegCommand,
  resolveWhisperRunner
};
