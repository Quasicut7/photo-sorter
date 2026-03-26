const Photo = require('../models/Photo');
const User = require('../models/User');
const Person = require('../models/Person');
const FaceCluster = require('../models/FaceCluster');
const storageService = require('../services/storageService');
const aiService = require('../services/aiService');

class PhotoController {

  /**
   * Upload photos
   * POST /api/photos/upload
   */
  async uploadPhotos(req, res) {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No files uploaded',
        });
      }

      const userId = req.user.id;
      const files = req.files;

      // Check storage limit
      const user = await User.findById(userId);
      const totalSize = files.reduce((sum, file) => sum + file.size, 0);

      if (user.storageUsed + totalSize > user.storageLimit) {
        return res.status(400).json({
          success: false,
          error: 'Storage limit exceeded. Please delete some photos or upgrade your plan.',
        });
      }

      // Upload files to Cloudinary
      const uploadResults = await storageService.uploadMultipleImages(files, userId);

      // Save photo metadata to database
      const photoPromises = files.map(async (file, index) => {
        const uploadResult = uploadResults[index];

        const photo = new Photo({
          userId,
          originalUrl: uploadResult.original,
          thumbnailUrls: uploadResult.thumbnails,
          cloudinaryId: uploadResult.publicId,
          fileName: file.originalname,
          fileSize: file.size,
          metadata: {
            width: uploadResult.width,
            height: uploadResult.height,
            format: uploadResult.format,
          },
          processedStatus: 'pending', // Will be processed by AI service later
        });

        return photo.save();
      });

      const savedPhotos = await Promise.all(photoPromises);

      // Update user storage usage
      user.storageUsed += totalSize;
      await user.save();

      // Trigger AI processing for each photo asynchronously
      savedPhotos.forEach(async (photo) => {
        try {
          await this.processPhotoAI(photo._id);
        } catch (error) {
          console.error(`Failed to process photo ${photo._id}:`, error);
        }
      });

      res.status(201).json({
        success: true,
        message: `${savedPhotos.length} photos uploaded successfully`,
        data: {
          photos: savedPhotos,
          uploadedCount: savedPhotos.length,
        },
      });

    } catch (error) {
      console.error('Photo upload error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to upload photos: ' + error.message,
      });
    }
  }

  /**
   * Get user's photos
   * GET /api/photos
   */
  async getPhotos(req, res) {
    try {
      const userId = req.user.id;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;
      const sort = req.query.sort || 'newest';
      const status = req.query.status;
      const search = req.query.search;

      // Build query
      let query = { userId };

      // Filter by processing status
      if (status && status !== 'all') {
        query.processedStatus = status;
      }

      // Search by filename
      if (search) {
        query.fileName = { $regex: search, $options: 'i' };
      }

      // Build sort options
      let sortOptions;
      switch (sort) {
        case 'oldest':
          sortOptions = { uploadedAt: 1 };
          break;
        case 'name':
          sortOptions = { fileName: 1 };
          break;
        case 'size':
          sortOptions = { fileSize: -1 };
          break;
        case 'newest':
        default:
          sortOptions = { uploadedAt: -1 };
          break;
      }

      const photos = await Photo.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit);

      const totalPhotos = await Photo.countDocuments(query);
      const totalPages = Math.ceil(totalPhotos / limit);

      res.json({
        success: true,
        data: {
          photos,
          pagination: {
            currentPage: page,
            totalPages,
            totalPhotos,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
          },
        },
      });

    } catch (error) {
      console.error('Get photos error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch photos',
      });
    }
  }

  /**
   * Get a single photo
   * GET /api/photos/:id
   */
  async getPhotoById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const photo = await Photo.findOne({ _id: id, userId });

      if (!photo) {
        return res.status(404).json({
          success: false,
          error: 'Photo not found',
        });
      }

      res.json({
        success: true,
        data: photo,
      });

    } catch (error) {
      console.error('Get photo error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch photo',
      });
    }
  }

  /**
   * Delete a photo
   * DELETE /api/photos/:id
   */
  async deletePhoto(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const photo = await Photo.findOne({ _id: id, userId });

      if (!photo) {
        return res.status(404).json({
          success: false,
          error: 'Photo not found',
        });
      }

      // Delete from Cloudinary
      await storageService.deleteImage(photo.cloudinaryId);

      // Update user storage usage
      const user = await User.findById(userId);
      user.storageUsed = Math.max(0, user.storageUsed - photo.fileSize);
      await user.save();

      // Delete from database
      await Photo.findByIdAndDelete(id);

      // Delete associated face clusters and update person counts
      const faceClusters = await FaceCluster.find({ photoId: id });

      for (const cluster of faceClusters) {
        // Update person photo count
        await Person.findByIdAndUpdate(
          cluster.personId,
          { $inc: { photoCount: -1 } }
        );
      }

      // Delete all face clusters for this photo
      await FaceCluster.deleteMany({ photoId: id });

      // Clean up empty person clusters (no photos)
      await Person.deleteMany({ userId, photoCount: { $lte: 0 } });

      res.json({
        success: true,
        message: 'Photo deleted successfully',
      });

    } catch (error) {
      console.error('Delete photo error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete photo',
      });
    }
  }

  /**
   * Process photo with AI (internal method)
   * @param {string} photoId - Photo ID to process
   */
  async processPhotoAI(photoId) {
    try {
      const photo = await Photo.findById(photoId);

      if (!photo) {
        throw new Error('Photo not found');
      }

      if (photo.processedStatus === 'processing' || photo.processedStatus === 'completed') {
        return; // Already processed or processing
      }

      // Update status to processing
      photo.processedStatus = 'processing';
      await photo.save();

      console.log(`Starting AI processing for photo: ${photoId}`);

      // Call AI service to detect faces
      const result = await aiService.detectFacesFromUrl(photo.originalUrl);

      if (result.success) {
        // Update photo with face count and processing status
        photo.faceCount = result.count;

        // Save face data and create/update person clusters
        if (result.count > 0) {
          console.log(`Detected ${result.count} faces in photo ${photoId}`);
          await this.processFaceClusters(photo.userId, photoId, result.faces);
        }

        photo.processedStatus = 'completed';
        await photo.save();
        console.log(`Successfully processed photo: ${photoId}`);
      } else {
        // Mark as failed
        photo.processedStatus = 'failed';
        await photo.save();
        console.error(`Failed to process photo ${photoId}: ${result.error}`);
      }

    } catch (error) {
      console.error(`Error processing photo ${photoId}:`, error);

      // Mark as failed
      try {
        const photo = await Photo.findById(photoId);
        if (photo) {
          photo.processedStatus = 'failed';
          await photo.save();
        }
      } catch (saveError) {
        console.error(`Failed to update photo status: ${saveError}`);
      }
    }
  }

  /**
   * Process face clusters for a photo
   * @param {string} userId - User ID
   * @param {string} photoId - Photo ID
   * @param {Array} faces - Detected faces from AI service
   */
  async processFaceClusters(userId, photoId, faces) {
    try {
      console.log(`Processing ${faces.length} face clusters for photo ${photoId}`);

      // Get existing persons for this user to cluster against
      const existingPersons = await Person.find({ userId }).lean();
      const existingEncodings = existingPersons.map(person => person.averageEncoding).filter(enc => enc);

      // For each detected face, find or create person cluster
      for (const face of faces) {
        let assignedPersonId = null;

        if (existingEncodings.length > 0) {
          // Try to assign face to existing person using AI clustering
          const clusterResult = await aiService.assignFaceToCluster(
            face.encoding,
            existingEncodings,
            0.6 // tolerance
          );

          if (clusterResult.success && clusterResult.assignedCluster >= 0) {
            // Assign to existing person
            assignedPersonId = existingPersons[clusterResult.assignedCluster]._id;
            console.log(`Assigned face to existing person: ${assignedPersonId}`);
          }
        }

        if (!assignedPersonId) {
          // Create new person cluster
          const newPerson = await Person.create({
            userId,
            representativePhotoId: photoId,
            averageEncoding: face.encoding,
            photoCount: 1
          });
          assignedPersonId = newPerson._id;
          console.log(`Created new person cluster: ${assignedPersonId}`);
        } else {
          // Update existing person
          await this.updatePersonCluster(assignedPersonId, face.encoding, photoId);
        }

        // Save face cluster data
        await FaceCluster.create({
          userId,
          personId: assignedPersonId,
          photoId,
          faceLocation: face.location,
          encoding: face.encoding,
          confidence: face.confidence || 0.9
        });
      }

    } catch (error) {
      console.error(`Error processing face clusters for photo ${photoId}:`, error);
      throw error;
    }
  }

  /**
   * Update person cluster with new face encoding
   * @param {string} personId - Person ID to update
   * @param {Array} newEncoding - New face encoding
   * @param {string} photoId - Photo ID
   */
  async updatePersonCluster(personId, newEncoding, photoId) {
    try {
      const person = await Person.findById(personId);

      if (person) {
        // Update photo count
        person.photoCount += 1;

        // Update average encoding (simple average for now)
        if (person.averageEncoding && person.averageEncoding.length === 128) {
          const alpha = 0.1; // Learning rate for updating average
          person.averageEncoding = person.averageEncoding.map((avg, i) =>
            avg * (1 - alpha) + newEncoding[i] * alpha
          );
        } else {
          person.averageEncoding = newEncoding;
        }

        // Update representative photo if this is the first photo
        if (!person.representativePhotoId) {
          person.representativePhotoId = photoId;
        }

        await person.save();
        console.log(`Updated person cluster: ${personId} (${person.photoCount} photos)`);
      }
    } catch (error) {
      console.error(`Error updating person cluster ${personId}:`, error);
      throw error;
    }
  }

  /**
   * Trigger photo processing (for AI face detection)
   * POST /api/photos/:id/process
   */
  async triggerProcessing(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const photo = await Photo.findOne({ _id: id, userId });

      if (!photo) {
        return res.status(404).json({
          success: false,
          error: 'Photo not found',
        });
      }

      if (photo.processedStatus === 'processing') {
        return res.status(400).json({
          success: false,
          error: 'Photo is already being processed',
        });
      }

      // Trigger AI processing
      this.processPhotoAI(id).catch(error => {
        console.error('Background processing error:', error);
      });

      res.json({
        success: true,
        message: 'Photo processing started',
        data: {
          photoId: photo._id,
          status: 'processing',
        },
      });

    } catch (error) {
      console.error('Trigger processing error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to trigger processing',
      });
    }
  }
}

module.exports = new PhotoController();