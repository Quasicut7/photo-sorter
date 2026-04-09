import api from '../services/api';

// Get all persons for the user
export const getPersons = async (page = 1, limit = 20) => {
  try {
    const response = await api.get(`/persons?page=${page}&limit=${limit}`);

    if (response.data.success) {
      return {
        success: true,
        persons: response.data.data.persons,
        pagination: response.data.data.pagination,
      };
    }

    return { success: false, error: 'Failed to fetch persons' };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to fetch persons',
    };
  }
};

// Get a single person with their photos
export const getPersonById = async (personId, page = 1, limit = 20) => {
  try {
    const response = await api.get(`/persons/${personId}?page=${page}&limit=${limit}`);

    if (response.data.success) {
      return {
        success: true,
        person: response.data.data.person,
        photos: response.data.data.photos,
        pagination: response.data.data.pagination,
      };
    }

    return { success: false, error: 'Failed to fetch person' };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to fetch person',
    };
  }
};

// Update person name
export const updatePersonName = async (personId, name) => {
  try {
    const response = await api.put(`/persons/${personId}`, { name });

    if (response.data.success) {
      return {
        success: true,
        person: response.data.data,
        message: response.data.message,
      };
    }

    return { success: false, error: 'Failed to update person name' };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to update person name',
    };
  }
};

// Manually add/remove photos from a person album
export const updatePersonPhotos = async (personId, addPhotoIds = [], removePhotoIds = []) => {
  try {
    const response = await api.put(`/persons/${personId}/photos`, {
      addPhotoIds,
      removePhotoIds,
    });

    if (response.data.success) {
      return {
        success: true,
        person: response.data.data.person,
        addedCount: response.data.data.addedCount,
        removedCount: response.data.data.removedCount,
        message: response.data.message,
      };
    }

    return { success: false, error: 'Failed to update person album photos' };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to update person album photos',
    };
  }
};

// Delete a person cluster
export const deletePerson = async (personId) => {
  try {
    const response = await api.delete(`/persons/${personId}`);

    if (response.data.success) {
      return {
        success: true,
        message: response.data.message,
      };
    }

    return { success: false, error: 'Failed to delete person' };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to delete person',
    };
  }
};

// Merge two person clusters
export const mergePersons = async (primaryPersonId, secondaryPersonId) => {
  try {
    const response = await api.post('/persons/merge', {
      primaryPersonId,
      secondaryPersonId,
    });

    if (response.data.success) {
      return {
        success: true,
        person: response.data.data,
        message: response.data.message,
      };
    }

    return { success: false, error: 'Failed to merge persons' };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to merge persons',
    };
  }
};

// Get person statistics
export const getPersonStats = async () => {
  try {
    const response = await api.get('/persons/stats');

    if (response.data.success) {
      return {
        success: true,
        stats: response.data.data,
      };
    }

    return { success: false, error: 'Failed to fetch person statistics' };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to fetch person statistics',
    };
  }
};