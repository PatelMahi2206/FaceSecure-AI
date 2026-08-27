from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.routes.users import router as users_router
from backend.app.routes.auth import router as auth_router
from backend.app.routes.face import router as face_router


app = FastAPI(
    title="Face Recognition System",
    version="1.0.0"
)


# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://face-secure-ai-dodw.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(users_router)
app.include_router(auth_router)
app.include_router(face_router)


@app.get("/")
def root():
    return {
        "message": "Face Recognition System API is running"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }