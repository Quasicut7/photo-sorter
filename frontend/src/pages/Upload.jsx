import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { uploadPhotos } from '../services/photoService';
import PhotoDropzone from '../components/upload/PhotoDropzone';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

function Upload() {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();

  const handleFilesSelect = (files) => {
    setSelectedFiles(files);
    setUploadResult(null); // Clear previous upload results
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setUploadResult({
        success: false,
        message: 'Please select at least one photo to upload',
      });
      return;
    }

    setUploading(true);
    setUploadResult(null);

    try {
      const result = await uploadPhotos(selectedFiles);

      if (result.success) {
        setUploadResult({
          success: true,
          message: result.message,
          data: result.data,
        });

        // Refresh user data to update storage usage
        await refreshUser();

        // Clear selected files after successful upload
        setSelectedFiles([]);

        // Redirect to gallery after a short delay
        setTimeout(() => {
          // For now, redirect to home (will be gallery later)
          navigate('/');
        }, 2000);
      } else {
        setUploadResult({
          success: false,
          message: result.error,
        });
      }
    } catch (error) {
      setUploadResult({
        success: false,
        message: 'Upload failed. Please try again.',
      });
    } finally {
      setUploading(false);
    }
  };

  const formatStorageUsage = (bytes) => {
    const mb = bytes / (1024 * 1024);
    const gb = bytes / (1024 * 1024 * 1024);

    if (gb >= 1) {
      return `${gb.toFixed(2)} GB`;
    }
    return `${mb.toFixed(1)} MB`;
  };

  const storagePercentage = user ? (user.storageUsed / user.storageLimit) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Upload Photos</h1>
          <p className="mt-2 text-gray-600">
            Select photos to organize with AI-powered face detection
          </p>

          {/* Storage Usage */}
          {user && (
            <div className="mt-4 p-4 bg-white rounded-lg shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Storage Usage</span>
                <span className="text-sm text-gray-500">
                  {formatStorageUsage(user.storageUsed)} / {formatStorageUsage(user.storageLimit)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    storagePercentage > 90 ? 'bg-red-500' :
                    storagePercentage > 75 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(storagePercentage, 100)}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* Upload Form */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          {/* Photo Dropzone */}
          <PhotoDropzone onFilesSelect={handleFilesSelect} />

          {/* Upload Button */}
          {selectedFiles.length > 0 && (
            <div className="mt-6 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                {selectedFiles.length} photo{selectedFiles.length !== 1 ? 's' : ''} selected
              </div>

              <button
                onClick={handleUpload}
                disabled={uploading || selectedFiles.length === 0}
                className={`
                  px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-colors
                  ${uploading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }
                `}
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  'Upload Photos'
                )}
              </button>
            </div>
          )}

          {/* Upload Result */}
          {uploadResult && (
            <div className={`
              mt-6 p-4 rounded-lg flex items-start gap-3
              ${uploadResult.success
                ? 'bg-green-50 text-green-800'
                : 'bg-red-50 text-red-800'
              }
            `}>
              {uploadResult.success ? (
                <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              )}

              <div>
                <p className="font-medium">{uploadResult.message}</p>
                {uploadResult.success && uploadResult.data && (
                  <p className="mt-1 text-sm">
                    {uploadResult.data.uploadedCount} photos uploaded successfully.
                    Redirecting to gallery...
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Tips */}
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Tips:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Upload photos with clear faces for best results</li>
              <li>• Supported formats: JPEG, PNG, GIF, WebP</li>
              <li>• Maximum 10 photos per upload</li>
              <li>• Photos will be automatically processed for face detection</li>
            </ul>
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/')}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

export default Upload;