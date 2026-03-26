from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional
import logging

from ..services.face_detection import FaceDetectionService
from ..services.face_clustering import FaceClusteringService

logger = logging.getLogger(__name__)

# Initialize services
face_detection_service = FaceDetectionService(model="hog")  # Use 'hog' for CPU, 'cnn' for GPU
face_clustering_service = FaceClusteringService(default_tolerance=0.6)

# Create router
router = APIRouter()

# Pydantic models for request/response
class ImageUrlRequest(BaseModel):
    image_url: str = Field(..., description="URL of the image to process")

class ImageBase64Request(BaseModel):
    image_data: str = Field(..., description="Base64 encoded image data")

class ClusterRequest(BaseModel):
    encodings: List[List[float]] = Field(..., description="List of 128-dimensional face encodings")
    tolerance: Optional[float] = Field(0.6, description="Clustering tolerance (0.1-1.0)")

class AssignFaceRequest(BaseModel):
    face_encoding: List[float] = Field(..., description="128-dimensional face encoding to assign")
    cluster_centroids: List[List[float]] = Field(..., description="List of cluster centroid encodings")
    tolerance: Optional[float] = Field(0.6, description="Assignment tolerance")

class CompareFacesRequest(BaseModel):
    known_encodings: List[List[float]] = Field(..., description="List of known face encodings")
    face_encoding: List[float] = Field(..., description="Face encoding to compare")
    tolerance: Optional[float] = Field(0.6, description="Comparison tolerance")

# Routes
@router.post("/detect/url", summary="Detect faces from image URL")
async def detect_faces_from_url(request: ImageUrlRequest):
    """
    Detect faces in an image from a URL.

    Returns face locations, encodings, and count.
    """
    try:
        logger.info(f"Processing image from URL: {request.image_url}")
        result = await face_detection_service.detect_faces_from_url(request.image_url)
        return result
    except Exception as e:
        logger.error(f"Error detecting faces from URL: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Face detection failed: {str(e)}"
        )

@router.post("/detect/base64", summary="Detect faces from base64 image")
async def detect_faces_from_base64(request: ImageBase64Request):
    """
    Detect faces in a base64 encoded image.

    Returns face locations, encodings, and count.
    """
    try:
        logger.info("Processing base64 image")
        result = await face_detection_service.detect_faces_from_base64(request.image_data)
        return result
    except Exception as e:
        logger.error(f"Error detecting faces from base64: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Face detection failed: {str(e)}"
        )

@router.post("/cluster", summary="Cluster face encodings")
async def cluster_faces(request: ClusterRequest):
    """
    Cluster face encodings using DBSCAN algorithm.

    Returns cluster assignments and metadata.
    """
    try:
        # Validate tolerance
        if not 0.1 <= request.tolerance <= 1.0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tolerance must be between 0.1 and 1.0"
            )

        logger.info(f"Clustering {len(request.encodings)} face encodings with tolerance {request.tolerance}")
        result = face_clustering_service.cluster_faces(request.encodings, request.tolerance)
        return result
    except Exception as e:
        logger.error(f"Error clustering faces: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Face clustering failed: {str(e)}"
        )

@router.post("/assign", summary="Assign face to existing clusters")
async def assign_face_to_clusters(request: AssignFaceRequest):
    """
    Assign a single face encoding to existing cluster centroids.

    Returns the best matching cluster or -1 if no match within tolerance.
    """
    try:
        logger.info("Assigning face to clusters")
        result = face_clustering_service.assign_face_to_clusters(
            request.face_encoding,
            request.cluster_centroids,
            request.tolerance
        )
        return result
    except Exception as e:
        logger.error(f"Error assigning face: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Face assignment failed: {str(e)}"
        )

@router.post("/compare", summary="Compare face encodings")
async def compare_faces(request: CompareFacesRequest):
    """
    Compare a face encoding with a list of known encodings.

    Returns list of boolean matches.
    """
    try:
        logger.info(f"Comparing face with {len(request.known_encodings)} known faces")
        result = face_detection_service.compare_faces(
            request.known_encodings,
            request.face_encoding,
            request.tolerance
        )
        return {
            "success": True,
            "matches": result,
            "match_count": sum(result),
            "total_compared": len(request.known_encodings)
        }
    except Exception as e:
        logger.error(f"Error comparing faces: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Face comparison failed: {str(e)}"
        )

@router.get("/status", summary="Service status")
async def get_status():
    """
    Get the current status of the face processing service.
    """
    return {
        "success": True,
        "service": "Face Processing API",
        "detection_model": face_detection_service.model,
        "clustering_tolerance": face_clustering_service.default_tolerance,
        "available_endpoints": [
            "/detect/url",
            "/detect/base64",
            "/cluster",
            "/assign",
            "/compare",
            "/status"
        ]
    }