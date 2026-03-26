const Person = require('../models/Person');
const FaceCluster = require('../models/FaceCluster');
const Photo = require('../models/Photo');

class PersonController {

  /**
   * Get all persons for a user
   * GET /api/persons
   */
  async getPersons(req, res) {
    try {
      const userId = req.user.id;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;

      const persons = await Person.find({ userId })
        .populate('representativePhotoId', 'originalUrl thumbnailUrls')
        .sort({ photoCount: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const totalPersons = await Person.countDocuments({ userId });
      const totalPages = Math.ceil(totalPersons / limit);

      res.json({
        success: true,
        data: {
          persons,
          pagination: {
            currentPage: page,
            totalPages,
            totalPersons,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
          },
        },
      });

    } catch (error) {
      console.error('Get persons error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch persons',
      });
    }
  }

  /**
   * Get a single person with their photos
   * GET /api/persons/:id
   */
  async getPersonById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;

      const person = await Person.findOne({ _id: id, userId })
        .populate('representativePhotoId', 'originalUrl thumbnailUrls');

      if (!person) {
        return res.status(404).json({
          success: false,
          error: 'Person not found',
        });
      }

      // Get photos for this person via face clusters
      const faceClusters = await FaceCluster.find({ personId: id, userId })
        .populate('photoId', 'originalUrl thumbnailUrls uploadedAt fileSize metadata')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      // Extract unique photos (in case multiple faces of same person in one photo)
      const photoMap = new Map();
      faceClusters.forEach(cluster => {
        if (cluster.photoId && !photoMap.has(cluster.photoId._id.toString())) {
          photoMap.set(cluster.photoId._id.toString(), {
            ...cluster.photoId.toObject(),
            faceLocation: cluster.faceLocation
          });
        }
      });

      const photos = Array.from(photoMap.values());
      const totalClusters = await FaceCluster.countDocuments({ personId: id, userId });

      res.json({
        success: true,
        data: {
          person,
          photos,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(totalClusters / limit),
            totalPhotos: photos.length,
            hasNextPage: page < Math.ceil(totalClusters / limit),
            hasPrevPage: page > 1,
          },
        },
      });

    } catch (error) {
      console.error('Get person error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch person',
      });
    }
  }

  /**
   * Update person name
   * PUT /api/persons/:id
   */
  async updatePersonName(req, res) {
    try {
      const { id } = req.params;
      const { name } = req.body;
      const userId = req.user.id;

      // Validate name
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Please provide a valid name',
        });
      }

      const trimmedName = name.trim();

      if (trimmedName.length > 100) {
        return res.status(400).json({
          success: false,
          error: 'Name must be 100 characters or less',
        });
      }

      const person = await Person.findOneAndUpdate(
        { _id: id, userId },
        { name: trimmedName },
        { new: true, runValidators: true }
      ).populate('representativePhotoId', 'originalUrl thumbnailUrls');

      if (!person) {
        return res.status(404).json({
          success: false,
          error: 'Person not found',
        });
      }

      res.json({
        success: true,
        message: 'Person name updated successfully',
        data: person,
      });

    } catch (error) {
      console.error('Update person name error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update person name',
      });
    }
  }

  /**
   * Delete a person cluster
   * DELETE /api/persons/:id
   */
  async deletePerson(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const person = await Person.findOne({ _id: id, userId });

      if (!person) {
        return res.status(404).json({
          success: false,
          error: 'Person not found',
        });
      }

      // Delete all face clusters for this person
      await FaceCluster.deleteMany({ personId: id, userId });

      // Delete the person
      await Person.findByIdAndDelete(id);

      res.json({
        success: true,
        message: 'Person deleted successfully',
      });

    } catch (error) {
      console.error('Delete person error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete person',
      });
    }
  }

  /**
   * Merge two person clusters
   * POST /api/persons/merge
   */
  async mergePersons(req, res) {
    try {
      const { primaryPersonId, secondaryPersonId } = req.body;
      const userId = req.user.id;

      if (!primaryPersonId || !secondaryPersonId) {
        return res.status(400).json({
          success: false,
          error: 'Please provide both primary and secondary person IDs',
        });
      }

      if (primaryPersonId === secondaryPersonId) {
        return res.status(400).json({
          success: false,
          error: 'Cannot merge person with themselves',
        });
      }

      // Find both persons
      const [primaryPerson, secondaryPerson] = await Promise.all([
        Person.findOne({ _id: primaryPersonId, userId }),
        Person.findOne({ _id: secondaryPersonId, userId })
      ]);

      if (!primaryPerson || !secondaryPerson) {
        return res.status(404).json({
          success: false,
          error: 'One or both persons not found',
        });
      }

      // Move all face clusters from secondary to primary
      await FaceCluster.updateMany(
        { personId: secondaryPersonId, userId },
        { personId: primaryPersonId }
      );

      // Update primary person stats
      primaryPerson.photoCount += secondaryPerson.photoCount;

      // Keep the name from primary person (unless empty, then use secondary's name)
      if (!primaryPerson.name && secondaryPerson.name) {
        primaryPerson.name = secondaryPerson.name;
      }

      await primaryPerson.save();

      // Delete secondary person
      await Person.findByIdAndDelete(secondaryPersonId);

      res.json({
        success: true,
        message: 'Persons merged successfully',
        data: primaryPerson,
      });

    } catch (error) {
      console.error('Merge persons error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to merge persons',
      });
    }
  }

  /**
   * Get person statistics
   * GET /api/persons/stats
   */
  async getPersonStats(req, res) {
    try {
      const userId = req.user.id;

      const totalPersons = await Person.countDocuments({ userId });
      const namedPersons = await Person.countDocuments({ userId, name: { $ne: null } });
      const unnamedPersons = totalPersons - namedPersons;

      // Get person with most photos
      const topPerson = await Person.findOne({ userId })
        .sort({ photoCount: -1 })
        .populate('representativePhotoId', 'originalUrl thumbnailUrls');

      // Get total face detections
      const totalFaces = await FaceCluster.countDocuments({ userId });

      res.json({
        success: true,
        data: {
          totalPersons,
          namedPersons,
          unnamedPersons,
          totalFaces,
          topPerson,
        },
      });

    } catch (error) {
      console.error('Get person stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch person statistics',
      });
    }
  }
}

module.exports = new PersonController();