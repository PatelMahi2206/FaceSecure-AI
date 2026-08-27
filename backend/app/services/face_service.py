
import cv2
import insightface
from typing import Optional


# Model will be loaded only when face detection is requested.
face_app = None


face_app = insightface.app.FaceAnalysis(
    name="buffalo_s",
    providers=["CPUExecutionProvider"]
)

face_app.prepare(
    ctx_id=-1,
    det_size=(320, 320)
)


def get_face_app():
    """
    Lazily load the InsightFace model.
6174fed (Optimize InsightFace model loading for Render)

    This prevents the model from consuming memory during
    FastAPI startup.
    """
    global face_app

    if face_app is None:
        print("Loading FaceSecure face model...")

        face_app = insightface.app.FaceAnalysis(
            name="buffalo_sc",
            providers=["CPUExecutionProvider"]
        )

        face_app.prepare(
            ctx_id=0,
            det_size=(320, 320)
        )

        print("✅ Face model loaded successfully!")

    return face_app


def detect_faces(image_path: str):
    """
    Detect faces in an image.
    """

    image = cv2.imread(image_path)

    if image is None:
        raise FileNotFoundError(
            f"Could not read image: {image_path}"
        )

    app = get_face_app()

    faces = app.get(image)

    return faces


def generate_embedding(image_path: str) -> Optional[list]:
    """
    Generate a face embedding from the largest detected face.

    Returns:
        A face embedding as a Python list,
        or None if no face is detected.
    """

    faces = detect_faces(image_path)

    if not faces:
        return None

    # Select the largest detected face
    face = max(
        faces,
        key=lambda f: (
            (f.bbox[2] - f.bbox[0]) *
            (f.bbox[3] - f.bbox[1])
        )
    )

    return face.embedding.tolist()


if __name__ == "__main__":
    image_path = "backend/test_images/test_face.jpg"

    print(f"Reading image: {image_path}")

    faces = detect_faces(image_path)

    print(f"✅ Faces detected: {len(faces)}")

    for index, face in enumerate(faces, start=1):
        print(f"\nFace {index}")
        print("Bounding box:", face.bbox)
        print("Embedding size:", len(face.embedding))
        print("First 5 values:", face.embedding[:5])
