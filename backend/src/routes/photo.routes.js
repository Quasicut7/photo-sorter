const express = require('express');
const photoController = require('../controllers/photoController');
const { protect } = require('../middleware/auth.middleware');
const { uploadMultiple, handleUploadErrors } = require('../middleware/upload.middleware');

const router = express.Router();

// All photo routes require authentication
router.use(protect);

// POST /api/photos/upload - Upload multiple photos
router.post('/upload', uploadMultiple, handleUploadErrors, photoController.uploadPhotos);

// GET /api/photos - Get user's photos with pagination
router.get('/', photoController.getPhotos);

// GET /api/photos/:id - Get a specific photo
router.get('/:id', photoController.getPhotoById);

// DELETE /api/photos/:id - Delete a photo
router.delete('/:id', photoController.deletePhoto);

// POST /api/photos/:id/process - Trigger AI processing for a photo
router.post('/:id/process', photoController.triggerProcessing);

module.exports = router;