// backend/routes/videos.js
// Purpose: Express router mounting video-related endpoints.
// Usage: app.use('/api/videos', router)

import { Router } from 'express';
import { uploadHandler, listHandler } from '../controllers/videoController.js';

const router = Router();

router.post('/upload', uploadHandler);
router.get('/', listHandler);

export default router;
