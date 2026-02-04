import mongoose, {Schema} from "mongoose";
const photoSchema = new mongoose.Schema({
  url: { type: String },
  order: { type: Number, required: true },
  path: {
          type: String, // Local path (temporary)
        },
});

const reelSchema = new Schema(
    {
        userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        },

        title: {
            type: String,
            required: true,
        },

        photos: [
            photoSchema
        ],

        music: {
        trackId: String,
        title: String,
        artist: String,
        previewUrl: String,
        artwork: String,
        },

        videoUrl: {
        type: String,
        },

        status: {
        type: String,
        enum: ["draft", "processing", "completed", "failed"],
        default: "processing",
        },


    },{timestamps: true}
)

const Reel = mongoose.model("Reel", reelSchema);
export default Reel;