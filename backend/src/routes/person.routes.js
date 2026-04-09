const express = require('express');
const personController = require('../controllers/personController');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

// All person routes require authentication
router.use(protect);

// GET /api/persons - Get all persons for user
router.get('/', personController.getPersons);

// GET /api/persons/stats - Get person statistics
router.get('/stats', personController.getPersonStats);

// POST /api/persons/merge - Merge two person clusters
router.post('/merge', personController.mergePersons);

// PUT /api/persons/:id/photos - Manually add/remove photos in a person album
router.put('/:id/photos', personController.updatePersonPhotos);

// GET /api/persons/:id - Get person with their photos
router.get('/:id', personController.getPersonById);

// PUT /api/persons/:id - Update person name
router.put('/:id', personController.updatePersonName);

// DELETE /api/persons/:id - Delete person cluster
router.delete('/:id', personController.deletePerson);

module.exports = router;