import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPersons } from '../services/personService';
import { useDebounce } from '../hooks/useOptimization';
import { Users, User, Loader2, Search, ArrowLeft } from 'lucide-react';

function Albums() {
  const navigate = useNavigate();

  const [persons, setPersons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('photoCount');

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  useEffect(() => {
    const savedScrollY = sessionStorage.getItem('albumsScrollY');
    if (savedScrollY) {
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: Number(savedScrollY), behavior: 'auto' });
      });
      sessionStorage.removeItem('albumsScrollY');
    }
  }, []);

  useEffect(() => {
    const loadPersonData = async () => {
      try {
        setLoading(true);
        setError(null);

        const personsResult = await getPersons(1, 24);

        if (personsResult.success) {
          setPersons(personsResult.persons || []);
          setPagination(personsResult.pagination || null);
        } else {
          setError(personsResult.error || 'Failed to load albums');
        }

      } catch (err) {
        setError('Failed to load album data');
      } finally {
        setLoading(false);
      }
    };

    loadPersonData();
  }, []);

  const filteredPersons = useMemo(() => {
    let filtered = [...persons];

    if (debouncedSearchTerm) {
      const q = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter((person) =>
        (person.name || person.displayName || '').toLowerCase().includes(q)
      );
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name': {
          const nameA = (a.name || a.displayName || '').toLowerCase();
          const nameB = (b.name || b.displayName || '').toLowerCase();
          return nameA.localeCompare(nameB);
        }
        case 'newest':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'oldest':
          return new Date(a.createdAt) - new Date(b.createdAt);
        case 'photoCount':
        default:
          return (b.photoCount || 0) - (a.photoCount || 0);
      }
    });

    return filtered;
  }, [persons, debouncedSearchTerm, sortBy]);

  const handleOpenPerson = (personId) => {
    sessionStorage.setItem('albumsScrollY', String(window.scrollY));
    navigate(`/albums/${personId}`);
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
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Users className="h-8 w-8 text-blue-600" />
            Photo Albums
          </h1>
          <p className="mt-2 text-gray-600">Your photos organized by the people in them</p>
        </div>

        {persons.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search people by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
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
        )}

        {persons.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No People Detected Yet</h3>
            <p className="text-gray-600 mb-6">Upload some photos with people to see them organized here</p>
            <button
              onClick={() => navigate('/upload')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Upload Photos
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {filteredPersons.map((person) => (
                <button
                  key={person._id}
                  onClick={() => handleOpenPerson(person._id)}
                  className="text-left cursor-pointer group"
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
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Albums;