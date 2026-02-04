import {Router} from 'express';
import { createReel } from '../controllers/reel.controller.js';
import { upload } from '../middlewares/multer.middleware.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { getReelById } from '../controllers/reel.controller.js';
import { getAllReels } from '../controllers/reel.controller.js';

const router = Router();

router.post("/create", verifyJWT, upload.array('photos', 20), createReel);
router.get("/my", verifyJWT, getAllReels)
router.get("/:id", verifyJWT, getReelById);

export default router;