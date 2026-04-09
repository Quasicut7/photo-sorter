import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getPhotos, deletePhoto } from '../services/photoService';
import { useDebounce } from '../hooks/useOptimization';
import OptimizedImageGrid from '../components/common/OptimizedImageGrid';
import { ImageIcon, Trash2, Eye, User, Calendar, Search, Filter, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';

function Gallery() {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [filterStatus, setFilterStatus] = useState('all');
  const [gridDensity, setGridDensity] = useState('comfortable');

  // Debounce search term for better performance
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    loadPhotos(1);
  }, [sortBy, filterStatus, debouncedSearchTerm]);

  useEffect(() => {
    if (!selectedPhoto) {
      return;
    }

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeLightbox();
      }
      if (event.key === 'ArrowRight') {
        nextPhoto();
      }
      if (event.key === 'ArrowLeft') {
        prevPhoto();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedPhoto, photos]);

  useEffect(() => {
    if (selectedPhoto) {
      setZoomLevel(1);
    }
  }, [selectedPhoto?._id]);

  const loadPhotos = async (page = 1) => {
    try {
      setLoading(page === 1);
      setError(null);

      const params = {
        page,
        limit: 24,
        sort: sortBy,
        status: filterStatus === 'all' ? undefined : filterStatus,
        search: debouncedSearchTerm || undefined
      };

      const result = await getPhotos(params);

      if (result.success) {
        setPhotos(page === 1 ? result.photos : [...photos, ...result.photos]);
        setPagination(result.pagination);
        setCurrentPage(page);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to load photos');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    loadPhotos(1);
  };

  const handleDeletePhoto = async (photoId) => {
    try {
      setDeleting(true);
      const result = await deletePhoto(photoId);

      if (result.success) {
        setPhotos(photos.filter(photo => photo._id !== photoId));
        setShowDeleteConfirm(null);
        if (selectedPhoto && selectedPhoto._id === photoId) {
          setSelectedPhoto(null);
        }
        // Refresh user data to update storage
        // refreshUser could be called here if we had access to it
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to delete photo');
    } finally {
      setDeleting(false);
    }
  };

  const openLightbox = (photo) => {
    setSelectedPhoto(photo);
    setZoomLevel(1);
  };

  const closeLightbox = () => {
    setSelectedPhoto(null);
    setZoomLevel(1);
  };

  const handleLightboxWheel = (event) => {
    event.preventDefault();
    const zoomDelta = event.deltaY < 0 ? 0.12 : -0.12;
    setZoomLevel((prev) => Math.min(4, Math.max(1, Number((prev + zoomDelta).toFixed(2)))));
  };

  const nextPhoto = () => {
    const currentIndex = photos.findIndex(p => p._id === selectedPhoto._id);
    const nextIndex = (currentIndex + 1) % photos.length;
    setSelectedPhoto(photos[nextIndex]);
  };

  const prevPhoto = () => {
    const currentIndex = photos.findIndex(p => p._id === selectedPhoto._id);
    const prevIndex = (currentIndex - 1 + photos.length) % photos.length;
    setSelectedPhoto(photos[prevIndex]);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'processing': return 'text-yellow-600';
      case 'failed': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return '✓';
      case 'processing': return '⏳';
      case 'failed': return '✗';
      default: return '○';
    }
  };

  const gridClassNameByDensity = {
    compact: 'grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3',
    comfortable: 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4',
    large: 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5',
  };

  if (loading && photos.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your photos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <ImageIcon className="h-8 w-8 text-blue-600" />
            Photo Gallery
          </h1>
          <p className="mt-2 text-gray-600">
            Browse and manage all your uploaded photos
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search photos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Search
              </button>
            </div>

            {/* Sort */}
            <div className="flex gap-4 flex-wrap">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="name">By Name</option>
                <option value="size">By Size</option>
              </select>

              {/* Filter by processing status */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Photos</option>
                <option value="completed">Processed</option>
                <option value="processing">Processing</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>

              <select
                value={gridDensity}
                onChange={(e) => setGridDensity(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                aria-label="Grid density"
              >
                <option value="compact">Compact Grid</option>
                <option value="comfortable">Comfortable Grid</option>
                <option value="large">Large Grid</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="text-red-800">{error}</span>
            </div>
          </div>
        )}

        {/* Photos Grid */}
        {photos.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <ImageIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Photos Found</h3>
            <p className="text-gray-600 mb-6">
              {searchTerm ? 'No photos match your search criteria.' : 'Upload some photos to get started.'}
            </p>
            <div className="flex gap-3 justify-center">
              {searchTerm && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    handleSearch();
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Clear Search
                </button>
              )}
              <button
                onClick={() => navigate('/upload')}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Upload Photos
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                {pagination ? `${pagination.totalPhotos} Photos` : `${photos.length} Photos`}
              </h2>
            </div>

            <div className={gridClassNameByDensity[gridDensity]}>
              {photos.map((photo) => (
                <div
                  key={photo._id}
                  className="relative group outline-none rounded-lg"
                  role="button"
                  tabIndex={0}
                  onClick={() => openLightbox(photo)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      openLightbox(photo);
                    }
                  }}
                >
                  <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                    <img
                      src={photo.thumbnailUrls?.medium || photo.originalUrl}
                      alt={`Photo ${photo.fileName}`}
                      className="w-full h-full object-cover cursor-zoom-in group-hover:scale-105 transition-transform"
                    />

                    {/* Overlay with actions */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 flex gap-2">
                        <button
                          onClick={() => openLightbox(photo)}
                          type="button"
                          className="p-2 bg-white text-gray-700 rounded-full hover:bg-gray-100 transition-colors"
                          title="View photo"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowDeleteConfirm(photo._id);
                          }}
                          className="p-2 bg-white text-red-600 rounded-full hover:bg-red-50 transition-colors"
                          title="Delete photo"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Processing Status Badge */}
                    <div className="absolute top-2 left-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-white bg-opacity-90 ${getStatusColor(photo.processedStatus)}`}>
                        {getStatusIcon(photo.processedStatus)} {photo.faceCount || 0}
                      </span>
                    </div>
                  </div>

                  {/* Photo Info */}
                  <div className="mt-2 text-sm text-gray-600">
                    <p className="font-medium truncate">{photo.fileName}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{new Date(photo.uploadedAt).toLocaleDateString()}</span>
                      <span>{Math.round(photo.fileSize / 1024)}KB</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Load More Button */}
            {pagination && pagination.hasNextPage && (
              <div className="mt-8 text-center">
                <button
                  onClick={() => loadPhotos(currentPage + 1)}
                  disabled={loading}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center gap-2 mx-auto"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    'Load More Photos'
                  )}
                </button>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Photo Lightbox */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
          <div
            className="w-full h-full px-3 py-3 md:px-6 md:py-6 flex items-center justify-center"
            onWheel={handleLightboxWheel}
          >
            <img
              src={selectedPhoto.originalUrl}
              alt={selectedPhoto.fileName}
              className="block h-[88vh] md:h-[90vh] w-auto max-w-[96vw] object-contain rounded-lg shadow-2xl"
              style={{
                transform: `scale(${zoomLevel})`,
                transition: 'transform 120ms ease-out',
                transformOrigin: 'center center',
              }}
            />

            {/* Lightbox Controls */}
            <div className="absolute top-4 right-4 flex gap-2">
              <button
                onClick={closeLightbox}
                className="w-11 h-11 bg-white text-gray-700 rounded-full hover:bg-gray-100 transition-colors flex items-center justify-center shadow-md"
              >
                ✕
              </button>
            </div>

            {/* Navigation Arrows */}
            {photos.length > 1 && (
              <>
                <button
                  onClick={prevPhoto}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-white text-gray-700 rounded-full hover:bg-gray-100 transition-colors flex items-center justify-center shadow-md"
                >
                  ←
                </button>
                <button
                  onClick={nextPhoto}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-white text-gray-700 rounded-full hover:bg-gray-100 transition-colors flex items-center justify-center shadow-md"
                >
                  →
                </button>
              </>
            )}

            {/* Photo Info */}
            <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-70 text-white p-4 rounded-lg">
              <h3 className="font-medium">{selectedPhoto.fileName}</h3>
              <div className="flex items-center gap-4 text-sm text-gray-300 mt-1">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(selectedPhoto.uploadedAt).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  {selectedPhoto.faceCount || 0} faces detected
                </span>
                <span>
                  {selectedPhoto.metadata?.width} × {selectedPhoto.metadata?.height}
                </span>
                <span>
                  {Math.round(selectedPhoto.fileSize / 1024)}KB
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Delete Photo?
            </h3>
            <p className="text-gray-600 mb-6">
              This will permanently delete this photo and remove it from any person albums. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                disabled={deleting}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeletePhoto(showDeleteConfirm)}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {deleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Gallery;