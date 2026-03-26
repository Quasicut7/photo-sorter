# FaceFolio - AI-Powered Photo Sorter

FaceFolio automatically organizes your photos by detecting and grouping faces. Upload your photos, and let AI sort them into albums by person.

## Features

- **AI Face Detection**: Automatically detect faces in uploaded photos
- **Smart Clustering**: Group similar faces together into person clusters
- **Name Your People**: Label detected people clusters (e.g., "Mom", "Friends")
- **Photo Albums**: View all photos organized by person
- **Search**: Find photos by person name
- **Secure**: JWT authentication ensures users only see their own photos

## Tech Stack

### Frontend
- React.js with Vite
- Tailwind CSS for styling
- React Dropzone for drag-and-drop uploads
- Axios for API communication
- React Router for navigation

### Backend
- Node.js + Express.js
- MongoDB Atlas (cloud database)
- Mongoose ODM
- JWT authentication
- Cloudinary for image storage and CDN
- Multer for file uploads

### AI Service
- Python with FastAPI
- face_recognition library (built on dlib)
- OpenCV for image processing
- DBSCAN clustering algorithm

### Infrastructure
- Docker & Docker Compose
- Monorepo architecture

## Project Structure

```
photo-sorter/
├── frontend/          # React.js application
├── backend/           # Node.js + Express API
├── ai-service/        # Python FastAPI microservice
├── docker/            # Docker configurations
└── docs/              # Documentation
```

## Prerequisites

- Node.js 18+ and npm
- Python 3.9+
- Docker and Docker Compose (for containerized setup)
- MongoDB Atlas account (free tier)
- Cloudinary account (free tier)

## Quick Start

### Option 1: Docker Compose (Recommended)

1. Clone the repository
2. Copy environment files:
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   cp ai-service/.env.example ai-service/.env
   ```

3. Edit `.env` files with your credentials (MongoDB Atlas URI, Cloudinary keys, JWT secret)

4. Start all services:
   ```bash
   docker-compose up
   ```

5. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - AI Service: http://localhost:8000

### Option 2: Manual Setup

#### Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your credentials
npm run dev
```

#### Frontend

```bash
cd frontend
npm install
cp .env.example .env
# Edit .env with backend API URL
npm run dev
```

#### AI Service

```bash
cd ai-service
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

## Environment Variables

### Backend `.env`
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/facefolio
JWT_SECRET=your-secret-key-here
JWT_EXPIRE=7d
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
AI_SERVICE_URL=http://localhost:8000
```

### Frontend `.env`
```env
VITE_API_URL=http://localhost:5000/api
VITE_APP_NAME=FaceFolio
```

### AI Service `.env`
```env
PYTHON_ENV=development
PORT=8000
FACE_DETECTION_MODEL=hog
CLUSTERING_TOLERANCE=0.6
```

## How It Works

1. **Upload**: User uploads photos through the React frontend
2. **Store**: Backend stores images in Cloudinary and metadata in MongoDB
3. **Detect**: Backend sends images to Python AI service for face detection
4. **Cluster**: AI service detects faces, extracts 128-dimensional encodings, and clusters similar faces
5. **Organize**: Backend creates "Person" entities for each cluster
6. **Display**: Frontend shows albums grouped by person, allowing users to name and browse

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Photos
- `POST /api/photos/upload` - Upload photos (requires auth)
- `GET /api/photos` - List user's photos (requires auth)
- `DELETE /api/photos/:id` - Delete photo (requires auth)

### People
- `GET /api/persons` - List all person clusters (requires auth)
- `GET /api/persons/:id` - Get person details with photos (requires auth)
- `PUT /api/persons/:id` - Update person name (requires auth)
- `DELETE /api/persons/:id` - Delete person cluster (requires auth)

### AI Service
- `POST /detect` - Detect faces in image
- `POST /cluster` - Cluster face encodings
- `GET /health` - Health check

## Development

### Running Tests
```bash
# Backend tests (when implemented)
cd backend && npm test

# Frontend tests (when implemented)
cd frontend && npm test

# AI service tests (when implemented)
cd ai-service && pytest
```

### Code Style
- Backend: ESLint with Standard config
- Frontend: ESLint with React config
- AI Service: PEP 8 style guide

## Deployment

### Production Build

```bash
# Build frontend
cd frontend && npm run build

# The backend and AI service run in production mode with NODE_ENV=production
```

### Docker Production
```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Roadmap

- [ ] Core MVP (Phases 1-5)
- [ ] Manual face tagging
- [ ] Face search by uploading a photo
- [ ] Bulk operations (delete multiple photos)
- [ ] Timeline view
- [ ] EXIF metadata extraction
- [ ] Photo sharing capabilities
- [ ] Mobile app (React Native)

## Contributing

This is a personal project, but contributions are welcome! Please open an issue first to discuss proposed changes.

## License

MIT License - feel free to use this project for learning or personal use.

## Acknowledgements

- [face_recognition](https://github.com/ageitgey/face_recognition) by Adam Geitgey
- Built with Claude Code AI assistant

## Support

For issues or questions, please open a GitHub issue or contact the maintainer.

---

Built with ❤️ using React, Node.js, and Python
