import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getPersonById, updatePersonName, deletePerson } from '../services/personService';
import { deletePhoto } from '../services/photoService';
import { User, Camera, Edit3, Trash2, ArrowLeft, Loader2, CheckCircle, X, Eye } from 'lucide-react';

function PersonDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [person, setPerson] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Name editing state
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [savingName, setSavingName] = useState(false);

  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Photo deletion state
  const [showPhotoDeleteConfirm, setShowPhotoDeleteConfirm] = useState(null);
  const [deletingPhoto, setDeletingPhoto] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  useEffect(() => {
    if (id) {
      loadPersonData();
    }
  }, [id]);

  const loadPersonData = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await getPersonById(id, 1, 24);

      if (result.success) {
        setPerson(result.person);
        setPhotos(result.photos);
        setPagination(result.pagination);
        setNewName(result.person.name || '');
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to load person data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveName = async () => {
    if (!newName.trim()) {
      setEditingName(false);
      setNewName(person.name || '');
      return;
    }

    try {
      setSavingName(true);
      const result = await updatePersonName(id, newName.trim());

      if (result.success) {
        setPerson(result.person);
        setEditingName(false);
      } else {
        setError(result.error);
        setNewName(person.name || '');
      }
    } catch (err) {
      setError('Failed to update name');
      setNewName(person.name || '');
    } finally {
      setSavingName(false);
    }
  };

  const handleDeletePerson = async () => {
    try {
      setDeleting(true);
      const result = await deletePerson(id);

      if (result.success) {
        navigate('/albums', {
          state: { message: 'Person deleted successfully' }
        });
      } else {
        setError(result.error);
        setShowDeleteConfirm(false);
      }
    } catch (err) {
      setError('Failed to delete person');
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleDeletePhoto = async (photoId) => {
    try {
      setDeletingPhoto(true);
      const result = await deletePhoto(photoId);

      if (result.success) {
        // Remove the photo from the local state
        setPhotos(photos.filter(photo => photo._id !== photoId));
        setShowPhotoDeleteConfirm(null);

        // Close lightbox if the deleted photo was selected
        if (selectedPhoto && selectedPhoto._id === photoId) {
          setSelectedPhoto(null);
        }

        // Reload person data to update photo count
        setTimeout(() => {
          loadPersonData();
        }, 1000);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to delete photo');
    } finally {
      setDeletingPhoto(false);
    }
  };

  const openLightbox = (photo) => {
    setSelectedPhoto(photo);
  };

  const closeLightbox = () => {
    setSelectedPhoto(null);
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

  const handlePhotoClick = (photo) => {
    openLightbox(photo);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading person details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
            <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Person</h3>
            <p className="text-red-600">{error}</p>
            <div className="mt-4 flex gap-3 justify-center">
              <button
                onClick={loadPersonData}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => navigate('/albums')}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Back to Albums
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!person) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Person Not Found</h3>
          <button
            onClick={() => navigate('/albums')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Back to Albums
          </button>
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
            onClick={() => navigate('/albums')}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Albums
          </button>

          <div className="flex items-start justify-between">
            <div className="flex items-start gap-6">
              {/* Representative Photo */}
              <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                {person.representativePhotoId?.thumbnailUrls?.medium ? (
                  <img
                    src={person.representativePhotoId.thumbnailUrls.medium}
                    alt={person.displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="h-8 w-8 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Person Info */}
              <div>
                {editingName ? (
                  <div className="flex items-center gap-3 mb-2">
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveName();
                        if (e.key === 'Escape') {
                          setEditingName(false);
                          setNewName(person.name || '');
                        }
                      }}
                      className="text-2xl font-bold text-gray-900 border-2 border-blue-500 rounded px-3 py-1 min-w-0"
                      placeholder="Enter person's name..."
                      autoFocus
                      disabled={savingName}
                    />
                    <button
                      onClick={handleSaveName}
                      disabled={savingName}
                      className="p-2 text-green-600 hover:text-green-800 disabled:text-gray-400"
                    >
                      {savingName ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle className="h-5 w-5" />}
                    </button>
                    <button
                      onClick={() => {
                        setEditingName(false);
                        setNewName(person.name || '');
                      }}
                      disabled={savingName}
                      className="p-2 text-red-600 hover:text-red-800 disabled:text-gray-400"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-2xl font-bold text-gray-900">
                      {person.name || person.displayName}
                    </h1>
                    <button
                      onClick={() => setEditingName(true)}
                      className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Edit name"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Camera className="h-4 w-4" />
                    {person.photoCount} photo{person.photoCount !== 1 ? 's' : ''}
                  </span>
                  <span>
                    Created {new Date(person.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                title="Delete person"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Photos Grid */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Photos ({photos.length})
          </h2>

          {photos.length === 0 ? (
            <div className="text-center py-12">
              <Camera className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Photos Found</h3>
              <p className="text-gray-600">
                This person doesn't appear in any photos yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {photos.map((photo) => (
                <div
                  key={photo._id}
                  className="relative group"
                >
                  <img
                    src={photo.thumbnailUrls?.medium || photo.originalUrl}
                    alt={`Photo ${photo._id}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.hasNextPage && (
            <div className="mt-8 text-center">
              <button
                onClick={() => {/* TODO: Implement load more */}}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Load More Photos
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Photo Lightbox */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
          <div className="max-w-5xl max-h-full p-4">
            <img
              src={selectedPhoto.originalUrl}
              alt={selectedPhoto.fileName}
              className="max-w-full max-h-full object-contain rounded-lg"
            />

            {/* Lightbox Controls */}
            <div className="absolute top-4 right-4 flex gap-2">
              <button
                onClick={closeLightbox}
                className="p-2 bg-white text-gray-700 rounded-full hover:bg-gray-100 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Navigation Arrows */}
            {photos.length > 1 && (
              <>
                <button
                  onClick={prevPhoto}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 p-3 bg-white text-gray-700 rounded-full hover:bg-gray-100 transition-colors"
                >
                  ←
                </button>
                <button
                  onClick={nextPhoto}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 p-3 bg-white text-gray-700 rounded-full hover:bg-gray-100 transition-colors"
                >
                  →
                </button>
              </>
            )}

            {/* Photo Info */}
            <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-70 text-white p-4 rounded-lg">
              <h3 className="font-medium">{selectedPhoto.fileName}</h3>
              <div className="flex items-center gap-4 text-sm text-gray-300 mt-1">
                <span>{new Date(selectedPhoto.uploadedAt).toLocaleDateString()}</span>
                <span>{selectedPhoto.faceCount || 0} faces detected</span>
                <span>{selectedPhoto.metadata?.width} × {selectedPhoto.metadata?.height}</span>
                <span>{Math.round(selectedPhoto.fileSize / 1024)}KB</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Photo Delete Confirmation Modal */}
      {showPhotoDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Delete Photo?
            </h3>
            <p className="text-gray-600 mb-6">
              This will permanently delete this photo from your account and remove it from this person cluster. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowPhotoDeleteConfirm(null)}
                disabled={deletingPhoto}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeletePhoto(showPhotoDeleteConfirm)}
                disabled={deletingPhoto}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {deletingPhoto ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Delete Photo
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-mx mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Delete Person Cluster?
            </h3>
            <p className="text-gray-600 mb-6">
              This will permanently delete this person cluster. The actual photos will not be deleted.
              This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePerson}
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

export default PersonDetail;