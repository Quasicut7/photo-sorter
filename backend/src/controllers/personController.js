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

      const person = await Person.findOne({ _id: id, userId })
        .populate('representativePhotoId', 'originalUrl thumbnailUrls')
        .populate('manualPhotoIds', 'originalUrl thumbnailUrls uploadedAt fileSize metadata fileName faceCount processedStatus');

      if (!person) {
        return res.status(404).json({
          success: false,
          error: 'Person not found',
        });
      }

      // Get photos for this person via face clusters
      const faceClusters = await FaceCluster.find({ personId: id, userId })
        .populate('photoId', 'originalUrl thumbnailUrls uploadedAt fileSize metadata')
        .sort({ createdAt: -1 });

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

      // Add manually attached photos (if not already present via face clusters)
      (person.manualPhotoIds || []).forEach((photo) => {
        if (photo && !photoMap.has(photo._id.toString())) {
          photoMap.set(photo._id.toString(), {
            ...photo.toObject(),
            manuallyAdded: true,
          });
        }
      });

      const photos = Array.from(photoMap.values())
        .sort((a, b) => new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0));
      const totalPhotos = photos.length;
      const totalPages = Math.max(1, Math.ceil(totalPhotos / limit));
      const paginatedPhotos = photos.slice((page - 1) * limit, page * limit);

      res.json({
        success: true,
        data: {
          person,
          photos: paginatedPhotos,
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

      // Merge manual photo selections without duplicates
      const mergedManual = new Set([
        ...(primaryPerson.manualPhotoIds || []).map((id) => id.toString()),
        ...(secondaryPerson.manualPhotoIds || []).map((id) => id.toString()),
      ]);
      primaryPerson.manualPhotoIds = Array.from(mergedManual);

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

  /**
   * Manually add/remove photos from a person album
   * PUT /api/persons/:id/photos
   */
  async updatePersonPhotos(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { addPhotoIds = [], removePhotoIds = [] } = req.body;

      if (!Array.isArray(addPhotoIds) || !Array.isArray(removePhotoIds)) {
        return res.status(400).json({
          success: false,
          error: 'addPhotoIds and removePhotoIds must be arrays',
        });
      }

      const person = await Person.findOne({ _id: id, userId });
      if (!person) {
        return res.status(404).json({
          success: false,
          error: 'Person not found',
        });
      }

      const requestedIds = Array.from(new Set([...addPhotoIds, ...removePhotoIds]));
      const validPhotos = await Photo.find({
        _id: { $in: requestedIds },
        userId,
      }).select('_id');
      const validIdSet = new Set(validPhotos.map((p) => p._id.toString()));

      const addSet = new Set(addPhotoIds.filter((pid) => validIdSet.has(pid.toString())).map(String));
      const removeSet = new Set(removePhotoIds.filter((pid) => validIdSet.has(pid.toString())).map(String));

      const currentManual = new Set((person.manualPhotoIds || []).map((pid) => pid.toString()));
      addSet.forEach((pid) => currentManual.add(pid));
      removeSet.forEach((pid) => currentManual.delete(pid));
      person.manualPhotoIds = Array.from(currentManual);

      // Recalculate photo count as unique photos from face clusters + manual additions.
      const clusteredPhotoIds = await FaceCluster.distinct('photoId', { personId: id, userId });
      const allAlbumPhotoIds = new Set([
        ...clusteredPhotoIds.map((pid) => pid.toString()),
        ...person.manualPhotoIds.map((pid) => pid.toString()),
      ]);
      person.photoCount = allAlbumPhotoIds.size;

      if (!person.representativePhotoId && person.manualPhotoIds.length > 0) {
        person.representativePhotoId = person.manualPhotoIds[0];
      }

      await person.save();

      const updated = await Person.findById(person._id)
        .populate('representativePhotoId', 'originalUrl thumbnailUrls')
        .populate('manualPhotoIds', 'originalUrl thumbnailUrls uploadedAt fileSize metadata fileName faceCount processedStatus');

      res.json({
        success: true,
        message: 'Person album updated successfully',
        data: {
          person: updated,
          addedCount: addSet.size,
          removedCount: removeSet.size,
        },
      });
    } catch (error) {
      console.error('Update person photos error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update person album photos',
      });
    }
  }
}

module.exports = new PersonController();