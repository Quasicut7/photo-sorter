import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getPersons, getPersonStats, deletePerson, mergePersons } from '../services/personService';
import { useDebounce } from '../hooks/useOptimization';
import { Users, User, Eye, BarChart3, Loader2, Search, CheckSquare, Square, Trash2, GitMerge } from 'lucide-react';

function Albums() {
  const [persons, setPersons] = useState([]);
  const [filteredPersons, setFilteredPersons] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('photoCount');

  // Debounce search term for better performance
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Bulk operations state
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedPersons, setSelectedPersons] = useState(new Set());
  const [bulkOperating, setBulkOperating] = useState(false);

  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    loadPersonData();
  }, []);

  useEffect(() => {
    filterAndSortPersons();
  }, [persons, debouncedSearchTerm, sortBy]);

  const filterAndSortPersons = () => {
    let filtered = [...persons];

    // Filter by search term
    if (debouncedSearchTerm) {
      filtered = filtered.filter(person =>
        person.name?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        person.displayName?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      );
    }

    // Sort persons
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          const nameA = (a.name || a.displayName || '').toLowerCase();
          const nameB = (b.name || b.displayName || '').toLowerCase();
          return nameA.localeCompare(nameB);
        case 'newest':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'oldest':
          return new Date(a.createdAt) - new Date(b.createdAt);
        case 'photoCount':
        default:
          return b.photoCount - a.photoCount;
      }
    });

    setFilteredPersons(filtered);
  };

  const loadPersonData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load persons and stats in parallel
      const [personsResult, statsResult] = await Promise.all([
        getPersons(1, 24), // Load more persons for grid display
        getPersonStats()
      ]);

      if (personsResult.success) {
        setPersons(personsResult.persons);
        setPagination(personsResult.pagination);
      } else {
        setError(personsResult.error);
      }

      if (statsResult.success) {
        setStats(statsResult.stats);
      }

    } catch (err) {
      setError('Failed to load album data');
    } finally {
      setLoading(false);
    }
  };

  const toggleBulkMode = () => {
    setBulkMode(!bulkMode);
    setSelectedPersons(new Set());
  };

  const handlePersonSelection = (personId) => {
    const newSelected = new Set(selectedPersons);
    if (newSelected.has(personId)) {
      newSelected.delete(personId);
    } else {
      newSelected.add(personId);
    }
    setSelectedPersons(newSelected);
  };

  const selectAllPersons = () => {
    const allIds = new Set(filteredPersons.map(p => p._id));
    setSelectedPersons(allIds);
  };

  const clearSelection = () => {
    setSelectedPersons(new Set());
  };

  const handleBulkDelete = async () => {
    if (selectedPersons.size === 0) return;

    try {
      setBulkOperating(true);
      const deletePromises = Array.from(selectedPersons).map(personId =>
        deletePerson(personId)
      );

      const results = await Promise.all(deletePromises);
      const successful = results.filter(r => r.success).length;

      if (successful > 0) {
        // Reload data to reflect deletions
        await loadPersonData();
        setSelectedPersons(new Set());
        setBulkMode(false);
      }

      if (successful < results.length) {
        setError(`${successful} of ${results.length} people deleted. Some deletions failed.`);
      }
    } catch (err) {
      setError('Failed to delete selected people');
    } finally {
      setBulkOperating(false);
    }
  };

  const handleBulkMerge = async () => {
    if (selectedPersons.size < 2) {
      setError('Please select at least 2 people to merge');
      return;
    }

    try {
      setBulkOperating(true);
      const personIds = Array.from(selectedPersons);
      const primaryPersonId = personIds[0];

      // Merge all others into the primary person
      for (let i = 1; i < personIds.length; i++) {
        const result = await mergePersons(primaryPersonId, personIds[i]);
        if (!result.success) {
          throw new Error(`Failed to merge person ${personIds[i]}`);
        }
      }

      // Reload data and reset selection
      await loadPersonData();
      setSelectedPersons(new Set());
      setBulkMode(false);
    } catch (err) {
      setError('Failed to merge selected people: ' + err.message);
    } finally {
      setBulkOperating(false);
    }
  };

  const handlePersonClick = (personId) => {
    if (bulkMode) {
      handlePersonSelection(personId);
    } else {
      navigate(`/albums/${personId}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your photo albums...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
            <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Albums</h3>
            <p className="text-red-600">{error}</p>
            <button
              onClick={loadPersonData}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Users className="h-8 w-8 text-blue-600" />
            Photo Albums
          </h1>
          <p className="mt-2 text-gray-600">
            Your photos organized by the people in them
          </p>
        </div>

        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total People</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalPersons}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Named People</p>
                  <p className="text-2xl font-bold text-green-600">{stats.namedPersons}</p>
                </div>
                <User className="h-8 w-8 text-green-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Unnamed People</p>
                  <p className="text-2xl font-bold text-amber-600">{stats.unnamedPersons}</p>
                </div>
                <Eye className="h-8 w-8 text-amber-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Faces</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.totalFaces}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-purple-500" />
              </div>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        {persons.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex flex-col gap-4">
              {/* Bulk Operations Toggle */}
              <div className="flex items-center justify-between">
                <button
                  onClick={toggleBulkMode}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    bulkMode
                      ? 'bg-blue-600 text-white'
                      : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {bulkMode ? 'Exit Bulk Mode' : 'Bulk Select'}
                </button>

                {bulkMode && (
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600">
                      {selectedPersons.size} selected
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={selectAllPersons}
                        className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                      >
                        Select All
                      </button>
                      <button
                        onClick={clearSelection}
                        className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Bulk Actions */}
              {bulkMode && selectedPersons.size > 0 && (
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">Actions:</span>
                  {selectedPersons.size >= 2 && (
                    <button
                      onClick={handleBulkMerge}
                      disabled={bulkOperating}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      <GitMerge className="h-4 w-4" />
                      Merge People
                    </button>
                  )}
                  <button
                    onClick={handleBulkDelete}
                    disabled={bulkOperating}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Selected
                  </button>
                  {bulkOperating && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4">
                {/* Search */}
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search people by name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={bulkMode}
                    />
                  </div>
                </div>

              {/* Sort */}
              <div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="photoCount">Most Photos</option>
                  <option value="name">By Name</option>
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                </select>
              </div>
            </div>

            {/* Search Results Summary */}
            {searchTerm && (
              <div className="mt-4 text-sm text-gray-600">
                {filteredPersons.length === 0 ? (
                  <span>No people found matching "{searchTerm}"</span>
                ) : (
                  <span>
                    Found {filteredPersons.length} {filteredPersons.length === 1 ? 'person' : 'people'} matching "{searchTerm}"
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        )}

        {/* People Grid */}
        {persons.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No People Detected Yet</h3>
            <p className="text-gray-600 mb-6">
              Upload some photos with people to see them organized here
            </p>
            <button
              onClick={() => navigate('/upload')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Upload Photos
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                People ({filteredPersons.length})
              </h2>
              {pagination && pagination.totalPersons > persons.length && (
                <p className="text-sm text-gray-500">
                  Showing {persons.length} of {pagination.totalPersons}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {filteredPersons.map((person) => (
                <div
                  key={person._id}
                  onClick={() => handlePersonClick(person._id)}
                  className="cursor-pointer group"
                >
                  <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 mb-3 group-hover:shadow-lg transition-shadow">
                    {person.representativePhotoId?.thumbnailUrls?.medium ? (
                      <img
                        src={person.representativePhotoId.thumbnailUrls.medium}
                        alt={person.displayName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className="h-12 w-12 text-gray-400" />
                      </div>
                    )}
                  </div>

                  <div className="text-center">
                    <h3 className="font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                      {person.name || person.displayName}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {person.photoCount} photo{person.photoCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Load More Button */}
            {pagination && pagination.hasNextPage && (
              <div className="mt-8 text-center">
                <button
                  onClick={() => {/* TODO: Implement load more */}}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Load More People
                </button>
              </div>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate('/upload')}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Upload More Photos
            </button>
            <button
              onClick={() => navigate('/gallery')}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              View All Photos
            </button>
            <button
              onClick={loadPersonData}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              Refresh Albums
            </button>
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

export default Albums;