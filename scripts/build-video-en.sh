#!/bin/bash
# English video build — 13 slides + audio (no burned subtitles)
# Output: artifacts/recordings/How_AI_Dismantled_the_CAPTCHA.mp4

set -e
cd "$(dirname "$0")/.."

OUTDIR="artifacts/recordings"
TMPDIR_SEG="/tmp/captcha-video-en-segments"
mkdir -p "$OUTDIR" "$TMPDIR_SEG"

AUDIO="artifacts/audio/How_AI_Dismantled_the_CAPTCHA.m4a"
OUTPUT="$OUTDIR/How_AI_Dismantled_the_CAPTCHA.mp4"
SLIDES_DIR="artifacts/slides-en"

# 13 slides — per recommended structure (PDF order)
# slide-01: 00:00 → 00:55  (55s)  Title
# slide-02: 00:55 → 02:15  (80s)  Defender's Illusion / Attacker's Reality
# slide-03: 02:15 → 03:55  (100s) 0-Cent Automated Bypass Pipeline
# slide-04: 03:55 → 05:05  (70s)  Blind AI Paradigm Shift
# slide-05: 05:05 → 07:50  (165s) Economics of Exploitation
# slide-06: 07:50 → 10:20  (150s) Omni-Bypass Reality
# slide-07: 10:20 → 11:25  (65s)  CAPTCHA is a Speed Bump
# slide-08: 11:25 → 12:50  (85s)  Why Traditional Perimeter Defenses Fail
# slide-09: 12:50 → 13:45  (55s)  Post-CAPTCHA Defense Blueprint
# slide-10: 13:45 → 15:10  (85s)  Layers 1 & 2
# slide-11: 15:10 → 16:30  (80s)  Layers 3 & 4
# slide-12: 16:30 → 17:50  (80s)  Layer 5: Ultimate Security Chain
# slide-13: 17:50 → 20:24  (154s) Strategic Mandate + closing

SLIDES=(01 02 03 04 05 06 07 08 09 10 11 12 13)
DURATIONS=(55 80 100 70 165 150 65 85 55 85 80 80 154)
ENDING_BLACK=5

SCALE="scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black"

echo "=== English Video Build ==="
echo "Slides: ${#SLIDES[@]} + ending black"
echo "Audio: $AUDIO"
echo "Output: $OUTPUT"
echo ""

# 1) Encode each slide as a video segment
for i in "${!SLIDES[@]}"; do
    SLIDE="$SLIDES_DIR/slide-${SLIDES[$i]}.png"
    DUR="${DURATIONS[$i]}"
    SEG="$TMPDIR_SEG/seg-${SLIDES[$i]}.ts"
    echo "[$(($i+1))/13] slide-${SLIDES[$i]}.png → ${DUR}s"
    ffmpeg -y -loop 1 -i "$SLIDE" -t "$DUR" \
        -vf "${SCALE},format=yuv420p" \
        -c:v libx264 -preset ultrafast -crf 18 -r 1 \
        -an -f mpegts "$SEG" 2>/dev/null
done

# 2) Ending black screen (5s)
echo "[14/14] Black ending → ${ENDING_BLACK}s"
ffmpeg -y -f lavfi -i "color=c=black:s=1920x1080:d=${ENDING_BLACK}:r=1" \
    -vf "format=yuv420p" \
    -c:v libx264 -preset ultrafast -crf 18 \
    -an -f mpegts "$TMPDIR_SEG/seg-black.ts" 2>/dev/null

# 3) Build concat list
CONCAT_FILE="$TMPDIR_SEG/concat.txt"
> "$CONCAT_FILE"
for s in "${SLIDES[@]}"; do
    echo "file '$TMPDIR_SEG/seg-${s}.ts'" >> "$CONCAT_FILE"
done
echo "file '$TMPDIR_SEG/seg-black.ts'" >> "$CONCAT_FILE"

echo ""
echo "--- Merging segments + audio... ---"

# 4) Concat + audio merge → final MP4
ffmpeg -y \
    -f concat -safe 0 -i "$CONCAT_FILE" \
    -i "$AUDIO" \
    -c:v libx264 -preset medium -crf 20 -r 1 \
    -c:a aac -b:a 192k \
    -shortest \
    -movflags +faststart \
    "$OUTPUT" 2>/dev/null

# 5) Cleanup
rm -rf "$TMPDIR_SEG"

echo ""
echo "=== Done ==="
echo "Output: $OUTPUT"
ls -lh "$OUTPUT"
echo ""
DURATION=$(ffprobe -v quiet -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$OUTPUT" 2>/dev/null)
echo "Duration: ${DURATION}s"
echo ""
echo "Subtitle (separate): artifacts/audio/How_AI_Dismantled_the_CAPTCHA.srt"
