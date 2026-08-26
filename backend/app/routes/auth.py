import json

import cv2
import numpy as np

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    File,
    UploadFile,
    status,
)

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.database import SessionLocal
from backend.app.dependencies import get_current_user
from backend.app.models.face_embedding import FaceEmbedding
from backend.app.models.user import User
from backend.app.schemas.auth import LoginRequest, LoginResponse
from backend.app.services.auth import create_access_token
from backend.app.services.security import verify_password
from backend.app.services.face_service import face_app


router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"]
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
        np.dot(vector1, vector2) /
        (norm1 * norm2)
    )


def get_image_from_upload(contents: bytes):
    image_array = np.frombuffer(
        contents,
        dtype=np.uint8
    )

    image = cv2.imdecode(
        image_array,
        cv2.IMREAD_COLOR
    )

    if image is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image file"
        )

    return image


# ---------------------------------------------------------
# PASSWORD LOGIN
# ---------------------------------------------------------

@router.post(
    "/login",
    response_model=LoginResponse
)
def login(
    login_data: LoginRequest,
    db: Session = Depends(get_db)
):
    user = db.execute(
        select(User).where(
            User.email == login_data.email
        )
    ).scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    if not user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Password is not configured for this account"
        )

    if not verify_password(
        login_data.password,
        user.password_hash
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    if not user.status:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )

    access_token = create_access_token(
        employee_id=user.employee_id,
        email=user.email,
        role=user.role
    )

    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        employee_id=user.employee_id,
        email=user.email,
        role=user.role
    )


# ---------------------------------------------------------
# FACE LOGIN
# ---------------------------------------------------------

@router.post("/face-login")
async def face_login(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Authenticate an admin or normal user using their face.
    """

    # Read uploaded image
    contents = await file.read()

    image = get_image_from_upload(contents)

    # Detect faces and generate embeddings
    faces = face_app.get(image)

    # No face detected
    if len(faces) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No face detected"
        )

    # More than one face detected
    if len(faces) > 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Multiple faces detected. Please provide an image containing only one face"
        )

    # Get scanned face embedding
    scanned_embedding = faces[0].embedding

    # Get all registered face embeddings
    stored_embeddings = db.execute(
        select(FaceEmbedding)
    ).scalars().all()

    if not stored_embeddings:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No registered faces found"
        )

    # Find best matching face
    best_match = None
    best_similarity = -1.0

    for stored in stored_embeddings:

        database_embedding = json.loads(
            stored.embedding
        )

        similarity = cosine_similarity(
            scanned_embedding,
            database_embedding
        )

        if similarity > best_similarity:
            best_similarity = similarity
            best_match = stored

    # Recognition threshold
    threshold = 0.40

    if (
        best_match is None
        or best_similarity < threshold
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Face not recognized"
        )

    # Find employee associated with face
    user = db.execute(
        select(User).where(
            User.employee_id == best_match.employee_id
        )
    ).scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User associated with this face was not found"
        )

    # Check account status
    if not user.status:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )

    # Create JWT token
    access_token = create_access_token(
        employee_id=user.employee_id,
        email=user.email,
        role=user.role
    )

    # Return authentication result
    return {
        "message": "Face authentication successful",
        "authenticated": True,
        "access_token": access_token,
        "token_type": "bearer",
        "similarity": round(
            best_similarity,
            4
        ),
        "user": {
            "employee_id": user.employee_id,
            "name": user.name,
            "email": user.email,
            "phone": user.phone,
            "department": user.department,
            "designation": user.designation,
            "role": user.role,
            "status": user.status
        }
    }


# ---------------------------------------------------------
# CURRENT USER PROFILE
# ---------------------------------------------------------

@router.get("/me")
def get_my_profile(
    current_user: User = Depends(get_current_user)
):
    return {
        "employee_id": current_user.employee_id,
        "name": current_user.name,
        "email": current_user.email,
        "phone": current_user.phone,
        "department": current_user.department,
        "designation": current_user.designation,
        "role": current_user.role,
        "status": current_user.status
    }