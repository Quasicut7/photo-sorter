const axios = require('axios');

class AIService {
  constructor() {
    this.baseURL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000, // 30 second timeout
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('AI Service error:', error.response?.data || error.message);
        throw error;
      }
    );
  }

  /**
   * Check if AI service is healthy
   */
  async healthCheck() {
    try {
      const response = await this.client.get('/health');
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Detect faces in an image from URL
   * @param {string} imageUrl - Cloudinary URL of the image
   * @returns {Object} Face detection results
   */
  async detectFacesFromUrl(imageUrl) {
    try {
      console.log('Detecting faces from URL:', imageUrl);

      const response = await this.client.post('/api/detect/url', {
        image_url: imageUrl,
      });

      if (response.data.success) {
        console.log(`Detected ${response.data.count} faces in image`);
        return {
          success: true,
          faces: response.data.faces,
          count: response.data.count,
          imageDimensions: response.data.image_dimensions,
        };
      } else {
        throw new Error('Face detection failed');
      }
    } catch (error) {
      console.error('Face detection error:', error.message);
      return {
        success: false,
        error: error.response?.data?.detail || error.message,
      };
    }
  }

  /**
   * Detect faces in base64 encoded image
   * @param {string} base64Data - Base64 encoded image
   * @returns {Object} Face detection results
   */
  async detectFacesFromBase64(base64Data) {
    try {
      console.log('Detecting faces from base64 data');

      const response = await this.client.post('/api/detect/base64', {
        image_data: base64Data,
      });

      if (response.data.success) {
        console.log(`Detected ${response.data.count} faces in image`);
        return {
          success: true,
          faces: response.data.faces,
          count: response.data.count,
          imageDimensions: response.data.image_dimensions,
        };
      } else {
        throw new Error('Face detection failed');
      }
    } catch (error) {
      console.error('Face detection error:', error.message);
      return {
        success: false,
        error: error.response?.data?.detail || error.message,
      };
    }
  }

  /**
   * Cluster face encodings
   * @param {Array} encodings - Array of 128-dimensional face encodings
   * @param {number} tolerance - Clustering tolerance (0.1-1.0)
   * @returns {Object} Clustering results
   */
  async clusterFaces(encodings, tolerance = 0.6) {
    try {
      console.log(`Clustering ${encodings.length} faces with tolerance ${tolerance}`);

      const response = await this.client.post('/api/cluster', {
        encodings,
        tolerance,
      });

      if (response.data.success) {
        console.log(`Created ${response.data.cluster_count} clusters`);
        return {
          success: true,
          clusters: response.data.clusters,
          clusterCount: response.data.cluster_count,
          noisePoints: response.data.noise_points,
          assignments: response.data.assignments,
        };
      } else {
        throw new Error('Face clustering failed');
      }
    } catch (error) {
      console.error('Face clustering error:', error.message);
      return {
        success: false,
        error: error.response?.data?.detail || error.message,
      };
    }
  }

  /**
   * Assign a single face to existing clusters
   * @param {Array} faceEncoding - 128-dimensional face encoding
   * @param {Array} clusterCentroids - Array of cluster centroid encodings
   * @param {number} tolerance - Assignment tolerance
   * @returns {Object} Assignment results
   */
  async assignFaceToCluster(faceEncoding, clusterCentroids, tolerance = 0.6) {
    try {
      console.log('Assigning face to existing clusters');

      const response = await this.client.post('/api/assign', {
        face_encoding: faceEncoding,
        cluster_centroids: clusterCentroids,
        tolerance,
      });

      if (response.data.success) {
        return {
          success: true,
          assignedCluster: response.data.assigned_cluster,
          distance: response.data.distance,
          toleranceMet: response.data.tolerance_met,
          message: response.data.message,
        };
      } else {
        throw new Error('Face assignment failed');
      }
    } catch (error) {
      console.error('Face assignment error:', error.message);
      return {
        success: false,
        error: error.response?.data?.detail || error.message,
      };
    }
  }

  /**
   * Compare a face with known encodings
   * @param {Array} knownEncodings - Array of known face encodings
   * @param {Array} faceEncoding - Face encoding to compare
   * @param {number} tolerance - Comparison tolerance
   * @returns {Object} Comparison results
   */
  async compareFaces(knownEncodings, faceEncoding, tolerance = 0.6) {
    try {
      console.log(`Comparing face with ${knownEncodings.length} known faces`);

      const response = await this.client.post('/api/compare', {
        known_encodings: knownEncodings,
        face_encoding: faceEncoding,
        tolerance,
      });

      if (response.data.success) {
        return {
          success: true,
          matches: response.data.matches,
          matchCount: response.data.match_count,
          totalCompared: response.data.total_compared,
        };
      } else {
        throw new Error('Face comparison failed');
      }
    } catch (error) {
      console.error('Face comparison error:', error.message);
      return {
        success: false,
        error: error.response?.data?.detail || error.message,
      };
    }
  }

  /**
   * Get AI service status
   */
  async getStatus() {
    try {
      const response = await this.client.get('/api/status');
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

// Singleton instance
const aiService = new AIService();

module.exports = aiService;