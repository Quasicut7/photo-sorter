from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

app = FastAPI(
    title="FaceFolio AI Service",
    description="Face detection and clustering microservice for FaceFolio",
    version="1.0.0",
)

# CORS Configuration
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint to verify the service is running."""
    return {
        "status": "healthy",
        "service": "FaceFolio AI Service",
        "version": "1.0.0",
    }

@app.get("/")
async def root():
    """Root endpoint with service information."""
    return {
        "message": "FaceFolio AI Service",
        "description": "Face detection and clustering powered by face_recognition library",
        "endpoints": {
            "health": "/health",
            "detect_url": "/api/detect/url (POST)",
            "detect_base64": "/api/detect/base64 (POST)",
            "cluster": "/api/cluster (POST)",
            "assign": "/api/assign (POST)",
            "compare": "/api/compare (POST)",
            "status": "/api/status (GET)"
        }
    }

# Import routes
from app.routes.face_routes import router as face_router
app.include_router(face_router, prefix="/api", tags=["faces"])

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    uvicorn.run(app, host=host, port=port, reload=True)
