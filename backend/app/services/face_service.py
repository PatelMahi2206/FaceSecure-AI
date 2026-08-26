import cv2
import insightface


print("Loading FaceSecure face model...")

face_app = insightface.app.FaceAnalysis(
    name="buffalo_l",
    providers=["CPUExecutionProvider"]
)

face_app.prepare(
    ctx_id=0,
    det_size=(640, 640)
)

print("✅ Face model loaded successfully!")


def detect_faces(image_path: str):
    image = cv2.imread(image_path)

    if image is None:
        raise FileNotFoundError(
            f"Could not read image: {image_path}"
        )

    faces = face_app.get(image)

    return faces

def generate_embedding(image_path: str):
    faces = detect_faces(image_path)

    if not faces:
        return None

    # Use the largest detected face
    face = max(
        faces,
        key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1])
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