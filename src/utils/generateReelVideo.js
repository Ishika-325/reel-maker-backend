import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import ffprobePath from "ffprobe-static";
import fs from "fs";
import path from "path";
import Reel from "../models/reel.model.js";

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath.path);

export const generateReelVideo = async (reelId) => {
  try {
    const reel = await Reel.findById(reelId);
    if (!reel) throw new Error("Reel not found");

    const outputDir = path.resolve(process.cwd(), "uploads", "reels");
    const tempDir = path.resolve(process.cwd(), "uploads", "temp");

    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const outputPath = path.resolve(outputDir, `${reelId}.mp4`);
    const tempListFile = path.resolve(tempDir, `${reelId}_list.txt`);

    const photos = reel.photos.sort((a, b) => a.order - b.order);
    if (photos.length === 0) throw new Error("No photos found for reel");

    // ✅ FIX: Concat demuxer for images requires duration in the text file
    // We tell FFmpeg how long to show each image directly in the list
    let listContent = "";
    photos.forEach((p) => {
      const absolutePath = path.resolve(p.path).replace(/\\/g, "/");
      listContent += `file '${absolutePath}'\n`;
      listContent += `duration 1\n`; // Show each image for 1 second
    });
    const totalDuration = photos.length * 1; // 1 second per image
    let audioStreamUrl = null;
if (reel.music?.trackId) {
  audioStreamUrl = `https://discoveryprovider.audius.co/v1/tracks/${reel.music.trackId}/stream`;
}
    
    // FFmpeg requirement: the last file must be repeated or listed without duration
    const lastPath = path.resolve(photos[photos.length - 1].path).replace(/\\/g, "/");
    listContent += `file '${lastPath}'`;

    fs.writeFileSync(tempListFile, listContent, "utf8");

    await new Promise((resolve, reject) => {
      const command = ffmpeg()
      .input(tempListFile.replace(/\\/g, "/"))
      .inputFormat("concat")
      .inputOptions(["-safe 0"]);
      if (audioStreamUrl) {
        command
          .input(audioStreamUrl)
          .inputOptions(["-stream_loop -1"]); // loop audio if too short
      }
      command.outputOptions([
    "-t " + totalDuration,          // trim final output length
    "-pix_fmt yuv420p",
    "-vf scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2",
    "-shortest",                    // stop when video ends
    "-map 0:v:0",
    "-c:v libx264",
    "-profile:v high",
    "-level 4.2",
    "-movflags +faststart",

    audioStreamUrl ? "-map 1:a:0" : "",
    audioStreamUrl ? "-c:a aac" : "",
    audioStreamUrl ? "-b:a 192k" : "",
  ].filter(Boolean));

      
        command.on("start", (cmd) => {
          console.log("▶ FFmpeg command executed:\n", cmd);
        })
        .on("end", () => {
          console.log("✅ Reel video created:", outputPath);
          try { if (fs.existsSync(tempListFile)) fs.unlinkSync(tempListFile); } catch (e) {}
          resolve(outputPath);
        })
        .on("error", (err) => {
        console.error("❌ FFmpeg error:", err.message);
        try {
          if (fs.existsSync(tempListFile)) fs.unlinkSync(tempListFile);
        } catch {}
        reject(err);
})
        .save(outputPath);
    });

    return outputPath;

  } catch (err) {
    console.error("❌ Generation error:", err.message);
    throw err;
  }
};