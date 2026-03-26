const { cloudinary } = require('../config/cloudinary');

class CloudinaryService {

  /**
   * Upload a single image to Cloudinary
   * @param {Buffer} fileBuffer - The file buffer from multer
   * @param {string} fileName - Original filename
   * @param {string} userId - User ID for organizing uploads
   * @returns {Promise<Object>} Cloudinary upload result
   */
  async uploadImage(fileBuffer, fileName, userId) {
    try {
      // Convert buffer to base64
      const base64String = fileBuffer.toString('base64');
      const dataUri = `data:image/jpeg;base64,${base64String}`;

      const result = await cloudinary.uploader.upload(dataUri, {
        folder: `facefolio/users/${userId}`, // Organize by user
        public_id: `${Date.now()}_${fileName.split('.')[0]}`, // Unique filename
        resource_type: 'image',
        // Generate multiple transformations for different sizes
        eager: [
          { width: 200, height: 200, crop: 'fill', quality: 'auto' }, // small thumbnail
          { width: 400, height: 400, crop: 'fill', quality: 'auto' }, // medium thumbnail
        ],
        eager_async: false, // Generate transformations immediately
      });

      return result;
    } catch (error) {
      throw new Error(`Cloudinary upload failed: ${error.message}`);
    }
  }

  /**
   * Delete an image from Cloudinary
   * @param {string} publicId - Cloudinary public ID
   * @returns {Promise<Object>} Deletion result
   */
  async deleteImage(publicId) {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result;
    } catch (error) {
      throw new Error(`Failed to delete image: ${error.message}`);
    }
  }

  /**
   * Get optimized URLs from Cloudinary response
   * @param {Object} cloudinaryResult - Result from Cloudinary upload
   * @returns {Object} Formatted URLs
   */
  formatImageUrls(cloudinaryResult) {
    const thumbnails = {};

    // Extract thumbnail URLs if eager transformations exist
    if (cloudinaryResult.eager && cloudinaryResult.eager.length > 0) {
      thumbnails.small = cloudinaryResult.eager[0].secure_url;
      thumbnails.medium = cloudinaryResult.eager[1].secure_url;
    }

    return {
      original: cloudinaryResult.secure_url,
      thumbnails,
      publicId: cloudinaryResult.public_id,
      width: cloudinaryResult.width,
      height: cloudinaryResult.height,
      format: cloudinaryResult.format,
      size: cloudinaryResult.bytes,
    };
  }

  /**
   * Upload multiple images concurrently
   * @param {Array} files - Array of file objects from multer
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of upload results
   */
  async uploadMultipleImages(files, userId) {
    if (!files || files.length === 0) {
      throw new Error('No files provided for upload');
    }

    const uploadPromises = files.map(file =>
      this.uploadImage(file.buffer, file.originalname, userId)
    );

    try {
      const results = await Promise.all(uploadPromises);
      return results.map(result => this.formatImageUrls(result));
    } catch (error) {
      throw new Error(`Batch upload failed: ${error.message}`);
    }
  }
}

module.exports = new CloudinaryService();