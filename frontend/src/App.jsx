import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Upload from './pages/Upload';
import Albums from './pages/Albums';
import PersonDetail from './pages/PersonDetail';
import Gallery from './pages/Gallery';
import { logout } from './services/authService';
import { Upload as UploadIcon, ImageIcon, Users } from 'lucide-react';

// Protected Route Component
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
}

// Home Page Component
function Home() {
  const { user, setUser } = useAuth();

  const handleLogout = () => {
    logout();
    setUser(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">FaceFolio</h1>
          {user && (
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">Welcome, {user.name}!</span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Welcome Section */}
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-700 mb-4">
              Welcome to FaceFolio
            </h2>
            <p className="text-xl text-gray-500 mb-6">
              AI-Powered Photo Organization
            </p>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Upload your photos and let our AI automatically detect and organize them by the people in them.
              Create albums, name your favorite people, and find photos faster than ever.
            </p>
          </div>

          {/* Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Upload Photos Card */}
            <Link
              to="/upload"
              className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer group"
            >
              <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mb-4 mx-auto group-hover:bg-blue-200 transition-colors">
                <UploadIcon className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                Upload Photos
              </h3>
              <p className="text-gray-600 text-center text-sm">
                Drag and drop your photos to get started with AI-powered organization
              </p>
            </Link>

            {/* View Gallery Card */}
            <Link
              to="/gallery"
              className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer group"
            >
              <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mb-4 mx-auto group-hover:bg-green-200 transition-colors">
                <ImageIcon className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                Photo Gallery
              </h3>
              <p className="text-gray-600 text-center text-sm">
                Browse and manage all your uploaded photos
              </p>
            </Link>

            {/* People Albums Card */}
            <Link
              to="/albums"
              className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer group"
            >
              <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg mb-4 mx-auto group-hover:bg-purple-200 transition-colors">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                People Albums
              </h3>
              <p className="text-gray-600 text-center text-sm">
                View photos organized by the people in them
              </p>
            </Link>
          </div>

          {/* Quick Stats */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Email</p>
                <p className="font-medium text-gray-900">{user?.email}</p>
              </div>
              <div>
                <p className="text-gray-500">Storage Used</p>
                <p className="font-medium text-gray-900">
                  {user ? `${((user.storageUsed || 0) / (1024 * 1024)).toFixed(1)} MB` : '0 MB'}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Plan</p>
                <p className="font-medium text-gray-900">Free (5GB limit)</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route
            path="/upload"
            element={
              <ProtectedRoute>
                <Upload />
              </ProtectedRoute>
            }
          />
          <Route
            path="/gallery"
            element={
              <ProtectedRoute>
                <Gallery />
              </ProtectedRoute>
            }
          />
          <Route
            path="/albums"
            element={
              <ProtectedRoute>
                <Albums />
              </ProtectedRoute>
            }
          />
          <Route
            path="/albums/:id"
            element={
              <ProtectedRoute>
                <PersonDetail />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
