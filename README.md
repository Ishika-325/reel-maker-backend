# 🎬 Reel Maker Backend

Backend service for the Reel Maker application that generates short video reels from photos and music.

It handles:

- Photo uploads
- Audio fetching (Audius API)
- Reel video generation (FFmpeg)
- User authentication
- Cloudinary media storage & retrieval

Built using Node.js, Express, MongoDB, Cloudinary, and FFmpeg.

---

## 🚀 Features

- Upload multiple photos
- Fetch & attach music from Audius
- Auto-generate reels using FFmpeg
- Audio looping to match reel duration
- User authentication & management
- Cloudinary storage for images & reels
- Deployed on Render

---

## 🛠 Tech Stack

- Node.js
- Express.js
- MongoDB + Mongoose
- FFmpeg (via fluent-ffmpeg)
- Audius API
- Cloudinary 

---

## 🎬 Reel Generation Flow

1. **Receive:** Accept multi-part photo uploads from the client.  
2. **Buffer:** Store photos temporarily in a local processing directory.  
3. **Fetch:** Retrieve the selected music stream from the Audius API.  
4. **Sync:** Download and loop the audio to match the total image duration.  
5. **Compute:** Generate an FFmpeg concatenation list and render the `.mp4` reel.  
6. **Upload:** Upload the generated reel to **Cloudinary**.  
7. **Record:** Save Cloudinary reel URL + metadata to MongoDB.  
8. **Cleanup:** Remove all temporary local files to maintain server health.  

---

## 📡 API Endpoints

### Health Check
GET /api/health

### Users
POST /api/users/register  
POST /api/users/login  
GET /api/users/logout  

### Reels
POST /api/reels/create  
GET /api/reels/my  
GET /api/reels/:id  

---

## ☁️ Deployment (Render)

Backend deployed on Render:

https://reel-maker-backend.onrender.com

---

## ⏱️ Uptime Monitoring

An uptime monitor is configured to ping the backend every **10–14 minutes** using:

GET /api/health

This prevents the service from going idle on Render’s free tier.


