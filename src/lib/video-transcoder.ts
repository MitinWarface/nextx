/**
 * Video transcoder — converts uploaded videos to HLS format using FFmpeg.
 * Falls back to direct file serving if FFmpeg is not available.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, writeFile, readdir, unlink } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";

const execFileAsync = promisify(execFile);

const HLS_DIR = path.join(process.cwd(), "public", "uploads", "hls");
const SEGMENT_DURATION = 4; // seconds per segment

export interface TranscodeResult {
  playlistUrl: string;
  duration: number;
  qualities: Array<{ label: string; playlistUrl: string }>;
}

let ffmpegAvailable: boolean | null = null;

async function isFFmpegAvailable(): Promise<boolean> {
  if (ffmpegAvailable !== null) return ffmpegAvailable;
  try {
    await execFileAsync("ffmpeg", ["-version"]);
    ffmpegAvailable = true;
  } catch {
    ffmpegAvailable = false;
  }
  return ffmpegAvailable;
}

/**
 * Transcode a video file to HLS with multiple quality levels.
 * @param inputPath - Path to the source video file
 * @param outputId - Unique ID for the output directory
 */
export async function transcodeToHLS(
  inputPath: string,
  outputId: string,
): Promise<TranscodeResult | null> {
  if (!(await isFFmpegAvailable())) {
    return null;
  }

  const outputDir = path.join(HLS_DIR, outputId);
  await mkdir(outputDir, { recursive: true });

  const qualities = [
    { label: "1080p", height: 1080, bitrate: "5000k" },
    { label: "720p", height: 720, bitrate: "2800k" },
    { label: "480p", height: 480, bitrate: "1400k" },
  ];

  const playlistPaths: Array<{ label: string; playlistUrl: string }> = [];

  for (const q of qualities) {
    const playlistName = `${q.label}.m3u8`;
    const segmentPattern = `${q.label}_%03d.ts`;
    const playlistPath = path.join(outputDir, playlistName);

    try {
      await execFileAsync("ffmpeg", [
        "-i", inputPath,
        "-vf", `scale=-2:${q.height}`,
        "-c:v", "libx264",
        "-b:v", q.bitrate,
        "-c:a", "aac",
        "-b:a", "128k",
        "-hls_time", String(SEGMENT_DURATION),
        "-hls_playlist_type", "vod",
        "-hls_segment_filename", path.join(outputDir, segmentPattern),
        "-f", "hls",
        playlistPath,
      ], { timeout: 120_000 });

      playlistPaths.push({
        label: q.label,
        playlistUrl: `/uploads/hls/${outputId}/${playlistName}`,
      });
    } catch {
      // Skip this quality level
    }
  }

  if (playlistPaths.length === 0) return null;

  // Get duration
  let duration = 0;
  try {
    const { stdout } = await execFileAsync("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      inputPath,
    ]);
    duration = parseFloat(stdout.trim()) || 0;
  } catch {
    // ignore
  }

  // Create master playlist
  const masterContent = playlistPaths
    .map((p) => {
      const bandwidth = p.label === "1080p" ? 5000000 : p.label === "720p" ? 2800000 : 1400000;
      return `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${p.label === "1080p" ? "1920x1080" : p.label === "720p" ? "1280x720" : "854x480"}\n${p.playlistUrl}`;
    })
    .join("\n");

  const masterPlaylist = `#EXTM3U\n#EXT-X-VERSION:3\n${masterContent}`;
  const masterPath = path.join(outputDir, "master.m3u8");
  await writeFile(masterPath, masterPlaylist);

  return {
    playlistUrl: `/uploads/hls/${outputId}/master.m3u8`,
    duration,
    qualities: playlistPaths,
  };
}

/**
 * Extract a thumbnail from a video at 1 second mark.
 */
export async function extractVideoThumbnail(
  inputPath: string,
  outputDir: string,
  outputName: string,
): Promise<string | null> {
  if (!(await isFFmpegAvailable())) return null;

  const thumbPath = path.join(outputDir, outputName);
  try {
    await execFileAsync("ffmpeg", [
      "-i", inputPath,
      "-ss", "00:00:01",
      "-vframes", "1",
      "-vf", "scale=300:-2",
      "-q:v", "5",
      thumbPath,
    ], { timeout: 30_000 });
    return `/uploads/hls/${outputName}`;
  } catch {
    return null;
  }
}

/**
 * Clean up old HLS segments (older than 24 hours).
 */
export async function cleanupHlsSegments(): Promise<void> {
  try {
    const dirs = await readdir(HLS_DIR);
    const now = Date.now();
    for (const dir of dirs) {
      const dirPath = path.join(HLS_DIR, dir);
      const stat = await import("node:fs").then((fs) => fs.promises.stat(dirPath));
      if (now - stat.mtimeMs > 24 * 60 * 60 * 1000) {
        const files = await readdir(dirPath);
        for (const f of files) {
          await unlink(path.join(dirPath, f)).catch(() => {});
        }
        await import("node:fs").then((fs) => fs.promises.rmdir(dirPath));
      }
    }
  } catch {
    // ignore
  }
}
