import face_recognition
import numpy as np
from PIL import Image
import io
import httpx
import base64
from typing import List, Dict, Tuple, Union
import logging

logger = logging.getLogger(__name__)

class FaceDetectionService:
    """Service for detecting faces in images using the face_recognition library."""

    def __init__(self, model: str = "hog"):
        """
        Initialize the face detection service.

        Args:
            model: Detection model to use ('hog' or 'cnn').
                   'hog' is faster, 'cnn' is more accurate but requires GPU.
        """
        self.model = model
        logger.info(f"Initialized FaceDetectionService with model: {model}")

    async def detect_faces_from_url(self, image_url: str) -> Dict:
        """
        Detect faces from an image URL.

        Args:
            image_url: URL of the image to process

        Returns:
            Dict containing faces data with locations, encodings, and count
        """
        try:
            # Download image from URL
            async with httpx.AsyncClient() as client:
                response = await client.get(image_url, timeout=30.0)
                response.raise_for_status()
                image_data = response.content

            return await self._process_image_data(image_data)

        except Exception as e:
            logger.error(f"Error processing image from URL {image_url}: {str(e)}")
            raise Exception(f"Failed to process image from URL: {str(e)}")

    async def detect_faces_from_base64(self, base64_data: str) -> Dict:
        """
        Detect faces from base64 encoded image.

        Args:
            base64_data: Base64 encoded image data (with or without data URI prefix)

        Returns:
            Dict containing faces data with locations, encodings, and count
        """
        try:
            # Remove data URI prefix if present
            if base64_data.startswith('data:'):
                base64_data = base64_data.split(',')[1]

            # Decode base64 to bytes
            image_data = base64.b64decode(base64_data)

            return await self._process_image_data(image_data)

        except Exception as e:
            logger.error(f"Error processing base64 image: {str(e)}")
            raise Exception(f"Failed to process base64 image: {str(e)}")

    async def _process_image_data(self, image_data: bytes) -> Dict:
        """
        Process image data to detect faces.

        Args:
            image_data: Raw image bytes

        Returns:
            Dict containing faces data
        """
        try:
            # Load image from bytes
            image = Image.open(io.BytesIO(image_data))

            # Convert to RGB if necessary (face_recognition requires RGB)
            if image.mode != 'RGB':
                image = image.convert('RGB')

            # Convert PIL image to numpy array
            image_array = np.array(image)

            # Detect face locations
            face_locations = face_recognition.face_locations(image_array, model=self.model)

            # Get face encodings
            face_encodings = face_recognition.face_encodings(image_array, face_locations)

            # Format results
            faces = []
            for i, (location, encoding) in enumerate(zip(face_locations, face_encodings)):
                top, right, bottom, left = location

                faces.append({
                    "id": i,
                    "location": {
                        "top": int(top),
                        "right": int(right),
                        "bottom": int(bottom),
                        "left": int(left)
                    },
                    "encoding": encoding.tolist(),  # Convert numpy array to list for JSON
                    "width": int(right - left),
                    "height": int(bottom - top)
                })

            logger.info(f"Detected {len(faces)} faces in image")

            return {
                "success": True,
                "faces": faces,
                "count": len(faces),
                "image_dimensions": {
                    "width": image.width,
                    "height": image.height
                }
            }

        except Exception as e:
            logger.error(f"Error in face detection: {str(e)}")
            raise Exception(f"Face detection failed: {str(e)}")

    def validate_encoding(self, encoding: List[float]) -> bool:
        """
        Validate that a face encoding has the correct format.

        Args:
            encoding: Face encoding to validate

        Returns:
            True if valid, False otherwise
        """
        if not isinstance(encoding, list):
            return False

        if len(encoding) != 128:
            return False

        # Check if all values are numbers
        try:
            [float(x) for x in encoding]
            return True
        except (ValueError, TypeError):
            return False

    def calculate_face_distance(self, encoding1: List[float], encoding2: List[float]) -> float:
        """
        Calculate the distance between two face encodings.

        Args:
            encoding1: First face encoding
            encoding2: Second face encoding

        Returns:
            Distance between encodings (lower = more similar)
        """
        if not self.validate_encoding(encoding1) or not self.validate_encoding(encoding2):
            raise ValueError("Invalid face encoding format")

        # Convert to numpy arrays
        enc1 = np.array(encoding1)
        enc2 = np.array(encoding2)

        # Calculate Euclidean distance
        return float(np.linalg.norm(enc1 - enc2))

    def compare_faces(self, known_encodings: List[List[float]], face_encoding: List[float], tolerance: float = 0.6) -> List[bool]:
        """
        Compare a face encoding with a list of known encodings.

        Args:
            known_encodings: List of known face encodings
            face_encoding: Face encoding to compare
            tolerance: Distance tolerance for matching (lower = stricter)

        Returns:
            List of boolean values indicating matches
        """
        if not self.validate_encoding(face_encoding):
            raise ValueError("Invalid face encoding format")

        for encoding in known_encodings:
            if not self.validate_encoding(encoding):
                raise ValueError("Invalid known encoding format")

        # Convert to numpy arrays
        known_encodings_np = [np.array(enc) for enc in known_encodings]
        face_encoding_np = np.array(face_encoding)

        # Use face_recognition library's compare function
        return face_recognition.compare_faces(known_encodings_np, face_encoding_np, tolerance=tolerance)