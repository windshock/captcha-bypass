#!/bin/bash
# 영상 합성 스크립트 — 슬라이드 + 오디오 (자막 미포함)
# 출력: artifacts/recordings/커피_한_잔이면_뚫리는_캡차_보안.mp4
#
# 각 슬라이드를 1fps 비디오 세그먼트로 만든 뒤 concat → 오디오 합성

set -e
cd "$(dirname "$0")/.."

OUTDIR="artifacts/recordings"
TMPDIR_SEG="/tmp/captcha-video-segments"
mkdir -p "$OUTDIR" "$TMPDIR_SEG"

AUDIO="artifacts/audio/커피_한_잔이면_뚫리는_캡차_보안.m4a"
OUTPUT="$OUTDIR/커피_한_잔이면_뚫리는_캡차_보안.mp4"
SLIDES_DIR="artifacts/slides"

SLIDES=(01 02 03 04 05 06 07 08 09 10 11 12 13 14 15)
DURATIONS=(55 61 134 124 153 129 106 314 116 99 122 65 30 51 89)
ENDING_BLACK=5

SCALE="scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black"

echo "=== 슬라이드 영상 합성 시작 ==="
echo "슬라이드: ${#SLIDES[@]}장 + 엔딩 블랙"
echo "오디오: $AUDIO"
echo "출력: $OUTPUT"
echo ""

# 1) 각 슬라이드를 개별 비디오 세그먼트로 인코딩
for i in "${!SLIDES[@]}"; do
    SLIDE="$SLIDES_DIR/slide-${SLIDES[$i]}.png"
    DUR="${DURATIONS[$i]}"
    SEG="$TMPDIR_SEG/seg-${SLIDES[$i]}.ts"
    echo "[$(($i+1))/15] slide-${SLIDES[$i]}.png → ${DUR}초"
    ffmpeg -y -loop 1 -i "$SLIDE" -t "$DUR" \
        -vf "${SCALE},format=yuv420p" \
        -c:v libx264 -preset ultrafast -crf 18 -r 1 \
        -an -f mpegts "$SEG" 2>/dev/null
done

# 2) 엔딩 검정 화면 (5초)
echo "[16/16] 엔딩 블랙 → ${ENDING_BLACK}초"
ffmpeg -y -f lavfi -i "color=c=black:s=1920x1080:d=${ENDING_BLACK}:r=1" \
    -vf "format=yuv420p" \
    -c:v libx264 -preset ultrafast -crf 18 \
    -an -f mpegts "$TMPDIR_SEG/seg-black.ts" 2>/dev/null

# 3) concat 목록 생성
CONCAT_FILE="$TMPDIR_SEG/concat.txt"
> "$CONCAT_FILE"
for s in "${SLIDES[@]}"; do
    echo "file '$TMPDIR_SEG/seg-${s}.ts'" >> "$CONCAT_FILE"
done
echo "file '$TMPDIR_SEG/seg-black.ts'" >> "$CONCAT_FILE"

echo ""
echo "--- 세그먼트 합성 + 오디오 머지 중... ---"

# 4) 세그먼트 concat + 오디오 합성 → 최종 MP4
ffmpeg -y \
    -f concat -safe 0 -i "$CONCAT_FILE" \
    -i "$AUDIO" \
    -c:v libx264 -preset medium -crf 20 -r 1 \
    -c:a aac -b:a 192k \
    -shortest \
    -movflags +faststart \
    "$OUTPUT" 2>/dev/null

# 5) 임시 파일 정리
rm -rf "$TMPDIR_SEG"

echo ""
echo "=== 완료 ==="
echo "출력 파일: $OUTPUT"
ls -lh "$OUTPUT"
echo ""
DURATION=$(ffprobe -v quiet -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$OUTPUT" 2>/dev/null)
echo "영상 길이: ${DURATION}초"
echo ""
echo "자막 파일 (별도): artifacts/audio/커피_한_잔이면_뚫리는_캡차_보안.srt"
echo "YouTube 업로드 시 SRT 파일을 자막으로 첨부하세요."
