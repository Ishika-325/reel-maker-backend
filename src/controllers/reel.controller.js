import Reel from "../models/reel.model.js";
import asyncHandler from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { generateReelVideo } from "../utils/generateReelVideo.js";
import fs from "fs";

const createReel = asyncHandler(async (req, res) => {
  console.log("🚀 Reel controller invoked");

  const { title, timezone } = req.body;
  const music = req.body.music
  ? JSON.parse(req.body.music)
  : null;

  if (music && !music.trackId) {
  return res.status(400).json({
    message: "Invalid music data provided",
  });
}


  let reelTitle = title?.trim();
  if (!reelTitle) {
    const formatter = new Intl.DateTimeFormat("en-IN", {
      timeZone: timezone || "UTC",
      dateStyle: "medium",
      timeStyle: "short",
    });
    reelTitle = `Reel • ${formatter.format(new Date())}`;
  }

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      message: "At least one photo is required to create a reel.",
    });
  }

  const localPhotos = req.files.map((file, index) => ({
    path: file.path,
    order: index,
  }));

  // Create Reel record
  const reel = await Reel.create({
    title: reelTitle,
    photos: localPhotos,
    userId: req.user._id,
     music: music
    ? {
        trackId: music.trackId,
        title: music.title,
        artist: music.artist,
        previewUrl: music.previewUrl,
        artwork: music.artwork,
      }
    : undefined,
    status: "processing",
    
  });

  try {
    // Pass ID as a string explicitly
    
    const videoPath = await generateReelVideo(reel._id.toString());

    const uploadedPhotos = [];
    for (const photo of localPhotos) {
      const result = await uploadOnCloudinary(photo.path);
      if (!result) throw new Error("Cloudinary upload failed for a photo");

      uploadedPhotos.push({
        url: result.secure_url,
        order: photo.order,
      });

      if (fs.existsSync(photo.path)) fs.unlinkSync(photo.path);
    }

    const uploadedVideo = await uploadOnCloudinary(videoPath);
    if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);

    // Final Update
    reel.photos = uploadedPhotos;
    reel.videoUrl = uploadedVideo.secure_url;
    reel.status = "completed";
    await reel.save();

    res.status(201).json({ success: true, reel });

  } catch (err) {
    console.error("❌ Reel creation failed:", err.message);
    
    // Safety check: only update if reel was actually created
    if (reel?._id) {
      reel.status = "failed";
      await reel.save();
    }

    res.status(500).json({
      success: false,
      message: "Failed to create reel",
      error: err.message,
    });
  }
});

const getReelById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // ✅ PREVENT CAST ERROR: Check if ID exists and is a valid 24-char hex string
  if (!id || id === "undefined" || id.length !== 24) {
    return res.status(400).json({ message: "A valid Reel ID is required" });
  }

  const reel = await Reel.findById(id);
  

  if (!reel) {
    return res.status(404).json({ message: "Reel not found" });
  }

  res.status(200).json({ success: true, reel });
});

const getAllReels = asyncHandler(async (req, res) => {
  try {
        const userId = req.user._id;
        
        // 1. Log to verify exactly what we are sending to MongoDB
        console.log("Querying Reels for userId:", userId);

        // 2. Perform the find
        // Use .lean() to get a plain JS object (faster and avoids Mongoose internal errors)
        const reels = await Reel.find({ userId: userId }).lean().sort({ createdAt: -1 });

        // 3. Log the result count
        console.log(`Found ${reels.length} reels for this user.`);

        // 4. Return response
        return res.status(200).json({
            success: true,
            data: reels
        });

    }
 catch (error) {
    res.status(500).json({ message: "Failed to fetch reels" });
  }
})
export { createReel, getReelById, getAllReels };