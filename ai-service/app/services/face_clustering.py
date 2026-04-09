import numpy as np
from sklearn.cluster import DBSCAN
from typing import List, Dict, Tuple
import logging

logger = logging.getLogger(__name__)

class FaceClusteringService:
    """Service for clustering similar faces using DBSCAN algorithm."""

    def __init__(self, default_tolerance: float = 0.6):
        """
        Initialize the face clustering service.

        Args:
            default_tolerance: Default distance tolerance for clustering.
                              Lower values create stricter clusters.
        """
        self.default_tolerance = default_tolerance
        logger.info(f"Initialized FaceClusteringService with tolerance: {default_tolerance}")

    def cluster_faces(self, encodings: List[List[float]], tolerance: float = None) -> Dict:
        """
        Cluster face encodings using DBSCAN algorithm.

        Args:
            encodings: List of 128-dimensional face encodings
            tolerance: Distance tolerance for clustering (overrides default)

        Returns:
            Dict containing cluster assignments and metadata
        """
        tolerance = tolerance if tolerance is not None else self.default_tolerance

        try:
            if not encodings:
                return {
                    "success": True,
                    "clusters": [],
                    "cluster_count": 0,
                    "noise_points": 0,
                    "assignments": []
                }

            # Validate encodings
            for i, encoding in enumerate(encodings):
                if not isinstance(encoding, list) or len(encoding) != 128:
                    raise ValueError(f"Invalid encoding at index {i}: expected 128-dimensional list")

            # Convert to numpy array
            encodings_array = np.array(encodings)

            # Perform DBSCAN clustering
            # eps: maximum distance between points in the same cluster
            # min_samples: minimum points required to form a cluster
            clustering = DBSCAN(eps=tolerance, min_samples=2, metric='euclidean')
            cluster_labels = clustering.fit_predict(encodings_array)

            # Process results
            clusters = {}
            noise_points = 0
            assignments = []

            for i, cluster_id in enumerate(cluster_labels):
                if cluster_id == -1:
                    # Noise point (doesn't belong to any cluster)
                    noise_points += 1
                    assignments.append({
                        "encoding_index": i,
                        "cluster_id": -1,
                        "is_noise": True
                    })
                else:
                    # Belongs to a cluster
                    if cluster_id not in clusters:
                        clusters[cluster_id] = []

                    clusters[cluster_id].append(i)
                    assignments.append({
                        "encoding_index": i,
                        "cluster_id": int(cluster_id),
                        "is_noise": False
                    })

            # Calculate cluster statistics
            cluster_info = []
            for cluster_id, member_indices in clusters.items():
                # Calculate cluster centroid (average encoding)
                cluster_encodings = encodings_array[member_indices]
                centroid = np.mean(cluster_encodings, axis=0).tolist()

                cluster_info.append({
                    "cluster_id": int(cluster_id),
                    "member_count": len(member_indices),
                    "member_indices": member_indices,
                    "centroid": centroid
                })

            logger.info(f"Clustered {len(encodings)} faces into {len(clusters)} clusters "
                       f"with {noise_points} noise points")

            return {
                "success": True,
                "clusters": cluster_info,
                "cluster_count": len(clusters),
                "noise_points": noise_points,
                "assignments": assignments,
                "parameters": {
                    "tolerance": tolerance,
                    "total_faces": len(encodings)
                }
            }

        except Exception as e:
            logger.error(f"Error in face clustering: {str(e)}")
            raise Exception(f"Face clustering failed: {str(e)}")

    def assign_face_to_clusters(self, face_encoding: List[float], cluster_centroids: List[List[float]], tolerance: float = None) -> Dict:
        """
        Assign a single face encoding to existing clusters.

        Args:
            face_encoding: 128-dimensional face encoding to assign
            cluster_centroids: List of cluster centroid encodings
            tolerance: Distance tolerance for assignment

        Returns:
            Dict containing assignment results
        """
        tolerance = tolerance if tolerance is not None else self.default_tolerance

        try:
            # Validate inputs
            if not isinstance(face_encoding, list) or len(face_encoding) != 128:
                raise ValueError("Invalid face encoding: expected 128-dimensional list")

            if not cluster_centroids:
                return {
                    "success": True,
                    "assigned_cluster": -1,
                    "distance": None,
                    "tolerance_met": False,
                    "message": "No clusters available"
                }

            face_array = np.array(face_encoding)
            best_cluster = -1
            best_distance = float('inf')
            valid_centroids = 0

            # Find the closest cluster centroid
            for i, centroid in enumerate(cluster_centroids):
                if not isinstance(centroid, list) or len(centroid) != 128:
                    continue

                valid_centroids += 1

                centroid_array = np.array(centroid)
                distance = np.linalg.norm(face_array - centroid_array)

                if distance < best_distance:
                    best_distance = float(distance)
                    best_cluster = i

            if valid_centroids == 0:
                return {
                    "success": True,
                    "assigned_cluster": -1,
                    "distance": None,
                    "tolerance_met": False,
                    "message": "No valid clusters available"
                }

            # Check if the best distance is within tolerance
            tolerance_met = bool(best_distance <= tolerance)
            if tolerance_met:
                assigned_cluster = best_cluster
                message = f"Assigned to cluster {best_cluster}"
            else:
                assigned_cluster = -1
                message = "No cluster within tolerance"

            return {
                "success": True,
                "assigned_cluster": assigned_cluster,
                "distance": float(best_distance),
                "tolerance_met": tolerance_met,
                "message": message
            }

        except Exception as e:
            logger.error(f"Error in face assignment: {str(e)}")
            raise Exception(f"Face assignment failed: {str(e)}")

    def merge_clusters(self, encodings1: List[List[float]], encodings2: List[List[float]]) -> Dict:
        """
        Merge two clusters and return the new centroid.

        Args:
            encodings1: Encodings from first cluster
            encodings2: Encodings from second cluster

        Returns:
            Dict containing merged cluster information
        """
        try:
            all_encodings = encodings1 + encodings2

            # Validate all encodings
            for i, encoding in enumerate(all_encodings):
                if not isinstance(encoding, list) or len(encoding) != 128:
                    raise ValueError(f"Invalid encoding at index {i}")

            # Calculate new centroid
            encodings_array = np.array(all_encodings)
            new_centroid = np.mean(encodings_array, axis=0).tolist()

            # Calculate average intra-cluster distance
            distances = []
            centroid_array = np.array(new_centroid)

            for encoding in all_encodings:
                encoding_array = np.array(encoding)
                distance = np.linalg.norm(encoding_array - centroid_array)
                distances.append(distance)

            avg_distance = np.mean(distances)
            max_distance = np.max(distances)

            return {
                "success": True,
                "new_centroid": new_centroid,
                "member_count": len(all_encodings),
                "average_distance": float(avg_distance),
                "max_distance": float(max_distance),
                "cluster1_size": len(encodings1),
                "cluster2_size": len(encodings2)
            }

        except Exception as e:
            logger.error(f"Error merging clusters: {str(e)}")
            raise Exception(f"Cluster merge failed: {str(e)}")

    def calculate_cluster_quality(self, encodings: List[List[float]], cluster_assignments: List[int]) -> Dict:
        """
        Calculate quality metrics for clustering results.

        Args:
            encodings: List of face encodings
            cluster_assignments: Cluster ID for each encoding (-1 for noise)

        Returns:
            Dict containing quality metrics
        """
        try:
            encodings_array = np.array(encodings)
            unique_clusters = set(cluster_assignments) - {-1}  # Exclude noise points

            if not unique_clusters:
                return {
                    "success": True,
                    "silhouette_score": 0.0,
                    "intra_cluster_distance": 0.0,
                    "inter_cluster_distance": 0.0,
                    "cluster_count": 0
                }

            # Calculate intra-cluster distances (within clusters)
            intra_distances = []
            for cluster_id in unique_clusters:
                cluster_indices = [i for i, cid in enumerate(cluster_assignments) if cid == cluster_id]
                if len(cluster_indices) > 1:
                    cluster_encodings = encodings_array[cluster_indices]
                    centroid = np.mean(cluster_encodings, axis=0)

                    for encoding in cluster_encodings:
                        distance = np.linalg.norm(encoding - centroid)
                        intra_distances.append(distance)

            # Calculate inter-cluster distances (between cluster centroids)
            inter_distances = []
            centroids = []

            for cluster_id in unique_clusters:
                cluster_indices = [i for i, cid in enumerate(cluster_assignments) if cid == cluster_id]
                cluster_encodings = encodings_array[cluster_indices]
                centroid = np.mean(cluster_encodings, axis=0)
                centroids.append(centroid)

            # Calculate distances between all pairs of centroids
            for i in range(len(centroids)):
                for j in range(i + 1, len(centroids)):
                    distance = np.linalg.norm(centroids[i] - centroids[j])
                    inter_distances.append(distance)

            avg_intra_distance = np.mean(intra_distances) if intra_distances else 0.0
            avg_inter_distance = np.mean(inter_distances) if inter_distances else 0.0

            # Simple quality score (higher is better)
            quality_score = avg_inter_distance / (avg_intra_distance + 1e-8)

            return {
                "success": True,
                "quality_score": float(quality_score),
                "avg_intra_cluster_distance": float(avg_intra_distance),
                "avg_inter_cluster_distance": float(avg_inter_distance),
                "cluster_count": len(unique_clusters),
                "total_faces": len(encodings),
                "noise_points": cluster_assignments.count(-1)
            }

        except Exception as e:
            logger.error(f"Error calculating cluster quality: {str(e)}")
            raise Exception(f"Quality calculation failed: {str(e)}")