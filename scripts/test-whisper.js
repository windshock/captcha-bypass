const { execFileSync } = require('child_process');
const {
  buildRuntimeEnv,
  resolveFfmpegCommand,
  resolveWhisperRunner
} = require('./runtime-tools');

function testWhisper() {
  console.log('--- Whisper Environment Test ---');
  const env = buildRuntimeEnv();

  try {
    const whisper = resolveWhisperRunner(env);
    const ffmpeg = resolveFfmpegCommand(env);

    console.log(`Whisper Command: ${whisper.label}`);
    console.log(`FFmpeg Command: ${ffmpeg}`);
    console.log('Testing whisper help command to verify installation...');
    execFileSync(whisper.command, whisper.checkArgs, { env, stdio: 'pipe' });
    console.log('Whisper is accessible and working.');
    
    console.log('\nTesting ffmpeg via whisper logic...');
    const ffmpegCheck = execFileSync(ffmpeg, ['-version'], { env, stdio: 'pipe' })
      .toString()
      .split('\n')[0];
    console.log(`FFmpeg identified: ${ffmpegCheck}`);
  } catch (e) {
    console.error('Environment check failed:', e.message);
  }
}

testWhisper();
