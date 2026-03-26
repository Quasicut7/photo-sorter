import api from './api';

// Upload photos
export const uploadPhotos = async (files) => {
  try {
    const formData = new FormData();

    // Append multiple files
    Array.from(files).forEach(file => {
      formData.append('photos', file);
    });

    const response = await api.post('/photos/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (response.data.success) {
      return {
        success: true,
        data: response.data.data,
        message: response.data.message,
      };
    }

    return {
      success: false,
      error: response.data.error || 'Upload failed'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Upload failed',
    };
  }
};

// Get user's photos with pagination and filters
export const getPhotos = async (params = {}) => {
  try {
    const {
      page = 1,
      limit = 20,
      sort = 'newest',
      status,
      search
    } = params;

    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      sort
    });

    if (status) queryParams.append('status', status);
    if (search) queryParams.append('search', search);

    const response = await api.get(`/photos?${queryParams}`);

    if (response.data.success) {
      return {
        success: true,
        photos: response.data.data.photos,
        pagination: response.data.data.pagination,
      };
    }

    return {
      success: false,
      error: response.data.error || 'Failed to fetch photos'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Failed to fetch photos',
    };
  }
};

// Get a single photo
export const getPhotoById = async (photoId) => {
  try {
    const response = await api.get(`/photos/${photoId}`);

    if (response.data.success) {
      return {
        success: true,
        data: response.data.data,
      };
    }

    return {
      success: false,
      error: response.data.error || 'Photo not found'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Failed to fetch photo',
    };
  }
};

// Delete a photo
export const deletePhoto = async (photoId) => {
  try {
    const response = await api.delete(`/photos/${photoId}`);

    if (response.data.success) {
      return {
        success: true,
        message: response.data.message,
      };
    }

    return {
      success: false,
      error: response.data.error || 'Failed to delete photo'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Failed to delete photo',
    };
  }
};

// Trigger photo processing
export const triggerProcessing = async (photoId) => {
  try {
    const response = await api.post(`/photos/${photoId}/process`);

    if (response.data.success) {
      return {
        success: true,
        data: response.data.data,
        message: response.data.message,
      };
    }

    return {
      success: false,
      error: response.data.error || 'Failed to start processing'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Failed to start processing',
    };
  }
};