import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cors from 'cors';
import cookieParser from 'cookie-parser';
const app = express();
dotenv.config({
    path: './.env'
});
app.set("trust proxy", 1);
app.use(cors({
  origin: process.env.FRONTEND,
  credentials: true // allow cookies
}))
const PORT = process.env.PORT || 5000;

app.use(express.json({limit: "16kb"}));
app.use(cookieParser())


import userRoutes from './routes/user.routes.js';
import reelRoutes from './routes/reel.routes.js'
app.use('/api/users', userRoutes);
app.use('/api/reels', reelRoutes);
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});



const connectDB = async () => {
    try {
        await mongoose.connect(`${process.env.MONGO_URI}`)
        console.log('MongoDB connected');
    }
    catch (error){
        console.log("Mongo connection error :", error) ;
        process.exit(1);
    }
}


connectDB()
.then(() => { 
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
})
.catch((error) => {
    console.log("Mongo connection failed:", error);
});
