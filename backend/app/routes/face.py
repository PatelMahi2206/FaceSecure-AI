import json

import cv2
import numpy as np
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.database import SessionLocal
from backend.app.dependencies import get_current_user
from backend.app.models.face_embedding import FaceEmbedding
from backend.app.models.user import User
from backend.app.services.face_service import get_face_app


router = APIRouter(
    prefix="/api/face",
    tags=["Face Recognition"]
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def cosine_similarity(embedding1, embedding2):
    vector1 = np.array(embedding1, dtype=np.float32)
    vector2 = np.array(embedding2, dtype=np.float32)

    norm1 = np.linalg.norm(vector1)
    norm2 = np.linalg.norm(vector2)

    if norm1 == 0 or norm2 == 0:
        return 0.0

    return float(
        np.dot(vector1, vector2) / (norm1 * norm2)
    )


def get_image_from_upload(contents: bytes):
    image_array = np.frombuffer(contents, dtype=np.uint8)
    image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)

    if image is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image file"
        )

    return image


@router.post("/register")
async def register_face(
    employee_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Only administrators can register faces
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can register face data"
        )

    # Check employee exists
    employee = db.execute(
        select(User).where(
            User.employee_id == employee_id
        )
    ).scalar_one_or_none()

    if employee is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )

    contents = await file.read()

    image = get_image_from_upload(contents)

    face_app = get_face_app()
    faces = face_app.get(image)

    if len(faces) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No face detected in image"
        )

    if len(faces) > 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Multiple faces detected. Please upload an image containing only one face"
        )

    embedding = faces[0].embedding.tolist()

    existing_embedding = db.execute(
        select(FaceEmbedding).where(
            FaceEmbedding.employee_id == employee_id
        )
    ).scalar_one_or_none()

    embedding_json = json.dumps(embedding)

    if existing_embedding:
        existing_embedding.embedding = embedding_json

        db.commit()
        db.refresh(existing_embedding)

        return {
            "message": "Face embedding updated successfully",
            "employee_id": employee_id,
            "embedding_size": len(embedding)
        }

    new_embedding = FaceEmbedding(
        employee_id=employee_id,
        embedding=embedding_json
    )

    db.add(new_embedding)
    db.commit()
    db.refresh(new_embedding)

    return {
        "message": "Face registered successfully",
        "employee_id": employee_id,
        "embedding_size": len(embedding)
    }


@router.post("/recognize")
async def recognize_face(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    contents = await file.read()

    image = get_image_from_upload(contents)

    face_app = get_face_app()
    faces = face_app.get(image)

    if len(faces) == 0:
        return {
            "recognized": False,
            "message": "Data is not available"
        }

    if len(faces) > 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Multiple faces detected. Please provide an image containing one face"
        )

    scanned_embedding = faces[0].embedding

    stored_embeddings = db.execute(
        select(FaceEmbedding)
    ).scalars().all()

    if not stored_embeddings:
        return {
            "recognized": False,
            "message": "Data is not available"
        }

    best_match = None
    best_similarity = -1.0

    for stored in stored_embeddings:
        database_embedding = json.loads(stored.embedding)

        similarity = cosine_similarity(
            scanned_embedding,
            database_embedding
        )

        if similarity > best_similarity:
            best_similarity = similarity
            best_match = stored

    # Recognition threshold
    threshold = 0.40

    if best_match is None or best_similarity < threshold:
        return {
            "recognized": False,
            "message": "Data is not available"
        }

    employee = db.execute(
        select(User).where(
            User.employee_id == best_match.employee_id
        )
    ).scalar_one_or_none()

    if employee is None:
        return {
            "recognized": False,
            "message": "Data is not available"
        }

    return {
        "recognized": True,
        "similarity": round(best_similarity, 4),
        "employee": {
            "employee_id": employee.employee_id,
            "name": employee.name,
            "email": employee.email,
            "phone": employee.phone,
            "department": employee.department,
            "designation": employee.designation,
            "role": employee.role,
            "status": employee.status
        }
    }