#!/usr/bin/env python3
"""
오디오 CAPTCHA 보고서 영상 생성기
PDF 슬라이드 + 오디오 파일을 결합해 mp4 영상으로 출력합니다.

사용법:
    python scripts/generate_video.py \
        --audio artifacts/audio/해커에게_0원짜리_자동문이_된_캡차.m4a \
        --pdf docs/reports/Post_CAPTCHA_Login_Defense.pdf \
        --output artifacts/recordings/output_video.mp4

필요 도구:
    macOS : brew install ffmpeg poppler
    Linux : sudo apt install ffmpeg poppler-utils
"""

import subprocess
import os
import sys
import json
import shutil
import argparse
from pathlib import Path

# ─────────────────────────────────────────────────────────
# 슬라이드 타이밍 설정
# (시작 초, 슬라이드 번호(1-based))  — SRT 내용 기반으로 추출
# ─────────────────────────────────────────────────────────
SLIDE_TIMINGS = [
    # (시작 초, PDF 슬라이드 번호)  — PDF 페이지 순서 그대로
    (0,    1),   # 타이틀
    (60,   2),   # 핵심 테제 (CAPTCHA = Friction)
    (108,  3),   # 검증 포함/제외 범위
    (169,  4),   # 5.42초 공격 파이프라인 (Playwright + Whisper)
    (248,  5),   # 붕괴된 방어 경제학 ROI
    (336,  6),   # 글로벌 CAPTCHA 우회 생태계 마켓맵
    (509,  7),   # 최신 공격 파이프라인의 4대 해킹 기법
    (569,  8),   # 타겟 분석 (오디오 접근성 남용·DOM 셀렉터)
    (769,  9),   # '가짜 보안'의 함정 (클라이언트 검증 한계)
    (830, 10),   # 패러다임 전환 (Gate → Friction)
    (890, 11),   # 단기 방어 로드맵
    (972, 12),   # 중기 로드맵 (계정 단위 Rate Limiting·Step-up 인증)  ← 16:12 시작
    (1020, 13),  # 장기 로드맵 (Passkeys / FIDO2)                      ← 17:00 시작 (중기 48초 확보)
    (1158, 14),  # PoC 후속 과제
    (1194, 15),  # 클로징
]

# ─────────────────────────────────────────────────────────
# 유틸리티
# ─────────────────────────────────────────────────────────

def check_deps():
    missing = []
    for cmd in ['ffmpeg', 'ffprobe', 'pdftoppm']:
        if not shutil.which(cmd):
            missing.append(cmd)
    if missing:
        print("❌ 필수 도구가 없습니다:", ", ".join(missing))
        print("   macOS : brew install ffmpeg poppler")
        print("   Linux : sudo apt install ffmpeg poppler-utils")
        sys.exit(1)
    print("✅ 의존성 확인 완료")


def convert_pdf_to_images(pdf_path: Path, output_dir: Path) -> list[Path]:
    """PDF를 고해상도 PNG 이미지(144 DPI)로 변환"""
    output_dir.mkdir(parents=True, exist_ok=True)
    prefix = str(output_dir / "slide")
    cmd = ["pdftoppm", "-r", "144", "-png", str(pdf_path), prefix]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print("❌ PDF 변환 오류:", result.stderr)
        sys.exit(1)

    images = sorted(output_dir.glob("slide-*.png"))
    if not images:
        images = sorted(output_dir.glob("slide*.png"))
    print(f"✅ 슬라이드 이미지 {len(images)}장 변환 완료")
    return images


def get_audio_duration(audio_path: Path) -> float:
    cmd = [
        "ffprobe", "-v", "quiet",
        "-print_format", "json",
        "-show_format",
        str(audio_path),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, check=True)
    info = json.loads(result.stdout)
    return float(info["format"]["duration"])


# ─────────────────────────────────────────────────────────
# 메인 빌드 함수
# ─────────────────────────────────────────────────────────

def build_video(audio_path: Path, images: list[Path], output_path: Path):
    total_dur = get_audio_duration(audio_path)
    print(f"🎵 오디오 길이: {int(total_dur)//60:02d}:{int(total_dur)%60:02d}")
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # 슬라이드별 표시 구간 계산
    extended = list(SLIDE_TIMINGS) + [(int(total_dur), None)]
    segments: list[tuple[Path, int]] = []

    print("\n📋 슬라이드 타이밍:")
    for i, (start, slide_idx) in enumerate(SLIDE_TIMINGS):
        end      = extended[i + 1][0]
        duration = end - start
        img_path = images[slide_idx - 1]  # 1-based → 0-based
        segments.append((img_path, duration))
        mm_s, ss_s = divmod(start, 60)
        mm_e, ss_e = divmod(end,   60)
        print(f"  Slide {slide_idx:2d}: {mm_s:02d}:{ss_s:02d} ~ {mm_e:02d}:{ss_e:02d}  ({duration}s)  {img_path.name}")

    # ffmpeg concat 목록 파일 생성
    work_dir    = output_path.parent
    concat_file = work_dir / "_concat_list.txt"
    tmp_video   = work_dir / "_tmp_slides.mp4"

    with open(concat_file, "w", encoding="utf-8") as f:
        for img_path, duration in segments:
            f.write(f"file '{img_path.resolve()}'\n")
            f.write(f"duration {duration}\n")
        # ffmpeg concat 마지막 프레임 유지 트릭
        f.write(f"file '{segments[-1][0].resolve()}'\n")

    # ── 슬라이드 영상 렌더링 ──────────────────────────────
    print("\n🎬 슬라이드 영상 렌더링 중...")
    vf = (
        "scale=1920:1080:force_original_aspect_ratio=decrease,"
        "pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=white"
    )
    cmd_video = [
        "ffmpeg", "-y",
        "-f", "concat", "-safe", "0", "-i", str(concat_file),
        "-vf", vf,
        "-r", "1",                     # 슬라이드이므로 1fps 충분
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "18",
        "-pix_fmt", "yuv420p",
        str(tmp_video),
    ]
    subprocess.run(cmd_video, check=True)

    # ── 오디오 합성 ───────────────────────────────────────
    print("🔊 오디오 합성 중...")
    cmd_merge = [
        "ffmpeg", "-y",
        "-i", str(tmp_video),
        "-i", str(audio_path),
        "-c:v", "copy",
        "-c:a", "aac", "-b:a", "192k",
        "-shortest",
        str(output_path),
    ]
    subprocess.run(cmd_merge, check=True)

    # ── 임시 파일 정리 ────────────────────────────────────
    tmp_video.unlink(missing_ok=True)
    concat_file.unlink(missing_ok=True)

    size_mb = output_path.stat().st_size / 1_048_576
    print(f"\n✅ 완료!  →  {output_path}  ({size_mb:.1f} MB)")


# ─────────────────────────────────────────────────────────
# CLI 엔트리포인트
# ─────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="PDF 슬라이드 + 오디오 → MP4 영상 생성"
    )
    parser.add_argument("--audio",   required=True,              help="오디오 파일 (.mp3/.wav/.m4a)")
    parser.add_argument("--pdf",     required=True,              help="PDF 슬라이드 파일")
    parser.add_argument("--output",  default="./artifacts/recordings/output_video.mp4", help="출력 MP4 파일명")
    parser.add_argument("--tmp-dir", default="./artifacts/slides",                       help="임시 이미지 저장 폴더")
    args = parser.parse_args()

    check_deps()

    audio_path  = Path(args.audio)
    pdf_path    = Path(args.pdf)
    output_path = Path(args.output)
    tmp_dir     = Path(args.tmp_dir)

    for p, label in [(audio_path, "오디오"), (pdf_path, "PDF")]:
        if not p.exists():
            print(f"❌ {label} 파일을 찾을 수 없습니다: {p}")
            sys.exit(1)

    images = convert_pdf_to_images(pdf_path, tmp_dir)

    if len(images) != 15:
        print(f"⚠️  슬라이드가 15장이 아닙니다 ({len(images)}장). "
              "SLIDE_TIMINGS 배열을 수정하거나 슬라이드 인덱스를 확인하세요.")

    build_video(audio_path, images, output_path)


if __name__ == "__main__":
    main()
