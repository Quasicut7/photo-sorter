const multer = require('multer');
const path = require('path');

// File filter for image uploads
const fileFilter = (req, file, cb) => {
  // Check if file is an image
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Not an image! Please upload image files only.'), false);
  }
};

// Multer configuration for memory storage (for Cloudinary upload)
const uploadConfig = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
    files: parseInt(process.env.MAX_FILES) || 10, // 10 files max
  },
  fileFilter,
});

// Middleware for single photo upload
const uploadSingle = uploadConfig.single('photo');

// Middleware for multiple photos upload
const uploadMultiple = uploadConfig.array('photos', parseInt(process.env.MAX_FILES) || 10);

// Error handling middleware for multer
const handleUploadErrors = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: `File too large. Maximum size allowed is ${(parseInt(process.env.MAX_FILE_SIZE) || 10485760) / (1024 * 1024)}MB`,
      });
    }

    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: `Too many files. Maximum ${parseInt(process.env.MAX_FILES) || 10} files allowed`,
      });
    }

    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        error: 'Unexpected field name. Use "photo" for single upload or "photos" for multiple uploads',
      });
    }
  }

  if (error.message === 'Not an image! Please upload image files only.') {
    return res.status(400).json({
      success: false,
      error: 'Invalid file type. Only image files (JPEG, PNG, GIF, WebP) are allowed',
    });
  }

  return res.status(500).json({
    success: false,
    error: 'File upload error: ' + error.message,
  });
};

module.exports = {
  uploadSingle,
  uploadMultiple,
  handleUploadErrors,
};