const { execFileSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const {
  FULL_SESSION_VIDEO_PATH,
  PROJECT_ROOT,
  ensureArtifactDirs,
  getScreenRecordingCommand
} = require('./runtime-tools');

const OUTPUT_FILE = FULL_SESSION_VIDEO_PATH;

async function recordAndRun() {
  console.log('[Recorder] Preparing to record full screen (Terminal + Browser)...');

  ensureArtifactDirs();
  if (fs.existsSync(OUTPUT_FILE)) {
    try { fs.unlinkSync(OUTPUT_FILE); } catch (e) {}
  }

  const recording = getScreenRecordingCommand(OUTPUT_FILE);

  console.log(`[Recorder] Using ${recording.description}.`);

  // 1. Start FFmpeg in the background and ignore its logs
  const ffmpeg = spawn(recording.command, recording.args, { 
    // stdin: 'pipe' to send 'q' later
    // stdout/stderr: 'ignore' to hide FFmpeg noisy logs
    stdio: ['pipe', 'ignore', 'ignore'],
    env: recording.env
  });

  ffmpeg.on('error', (error) => {
    console.error(`[Recorder] Failed to start recorder: ${error.message}`);
  });

  console.log('[Recorder] Screen recording started in background.');
  console.log('[Recorder] Launching login script...\n');

  // Wait 2 seconds for recorder to stabilize
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // 2. Run the actual login script (this one WILL show logs)
  try {
    execFileSync(process.execPath, [path.join(__dirname, 'login.js')], {
      cwd: PROJECT_ROOT,
      stdio: 'inherit'
    });
    console.log('\n[Recorder] Login script execution finished.');
  } catch (error) {
    console.error('\n[Recorder] Login script was interrupted.');
  }

  // 3. Stop FFmpeg gracefully
  console.log(`[Recorder] Finalizing video file (${path.basename(OUTPUT_FILE)})...`);
  ffmpeg.stdin.write('q');

  ffmpeg.on('close', () => {
    console.log('[Success] Video saved. Recording process terminated.');
    console.log(`[Info] You can now share "${path.basename(OUTPUT_FILE)}" for review.`);
  });
}

recordAndRun().catch(e => console.error(e));
