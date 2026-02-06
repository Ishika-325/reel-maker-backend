import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import ffprobePath from "ffprobe-static";
import fs from "fs";
import path from "path";
import axios from "axios";
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
    const tempAudioFile = path.resolve(tempDir, `${reelId}_audio.mp3`);

    const photos = reel.photos.sort((a, b) => a.order - b.order);
    if (photos.length === 0) throw new Error("No photos found for reel");

    // 🖼️ Create concat list
    let listContent = "";
    photos.forEach((p) => {
      const absolutePath = path.resolve(p.path).replace(/\\/g, "/");
      listContent += `file '${absolutePath}'\n`;
      listContent += `duration 1\n`;
    });

    const lastPath = path
      .resolve(photos[photos.length - 1].path)
      .replace(/\\/g, "/");

    listContent += `file '${lastPath}'`;

    fs.writeFileSync(tempListFile, listContent, "utf8");

    const totalDuration = photos.length * 1;

    // 🎵 AUDIO DOWNLOAD (Audius)
    let audioFilePath = null;

    if (reel.music?.trackId) {
      const streamUrl = `https://discoveryprovider.audius.co/v1/tracks/${reel.music.trackId}/stream`;

      console.log("⬇️ Downloading audio from Audius...");

      const response = await axios({
        url: streamUrl,
        method: "GET",
        responseType: "stream",
        maxRedirects: 5, // follow Audius redirects
      });

      const writer = fs.createWriteStream(tempAudioFile);

      await new Promise((resolve, reject) => {
        response.data.pipe(writer);
        writer.on("finish", resolve);
        writer.on("error", reject);
      });

      console.log("✅ Audio downloaded:", tempAudioFile);

      audioFilePath = tempAudioFile;
    }

    // 🎬 FFmpeg render
    await new Promise((resolve, reject) => {
      const command = ffmpeg()
        .input(tempListFile.replace(/\\/g, "/"))
        .inputFormat("concat")
        .inputOptions(["-safe 0"]);

      if (audioFilePath) {
        command.input(audioFilePath).inputOptions(["-stream_loop -1"]);
      }

      command.outputOptions(
        [
          "-t " + totalDuration,
          "-pix_fmt yuv420p",
          "-vf scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2",
          "-shortest",
          "-map 0:v:0",
          "-c:v libx264",
          "-profile:v high",
          "-level 4.2",
          "-movflags +faststart",

          audioFilePath ? "-map 1:a:0" : "",
          audioFilePath ? "-c:a aac" : "",
          audioFilePath ? "-b:a 192k" : "",
        ].filter(Boolean)
      );

      command
        .on("start", (cmd) => {
          console.log("▶ FFmpeg command:\n", cmd);
        })
        .on("end", () => {
          console.log("✅ Reel created:", outputPath);

          // 🧹 CLEANUP
          try {
            if (fs.existsSync(tempListFile)) fs.unlinkSync(tempListFile);
            if (audioFilePath && fs.existsSync(audioFilePath))
              fs.unlinkSync(audioFilePath);
          } catch (e) {
            console.log("Cleanup warning:", e.message);
          }

          resolve(outputPath);
        })
        .on("error", (err) => {
          console.error("❌ FFmpeg error:", err.message);

          // 🧹 CLEANUP ON ERROR
          try {
            if (fs.existsSync(tempListFile)) fs.unlinkSync(tempListFile);
            if (audioFilePath && fs.existsSync(audioFilePath))
              fs.unlinkSync(audioFilePath);
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
