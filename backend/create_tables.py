from backend.app.database import Base, engine
from backend.app.models.user import User
from backend.app.models.face_embedding import FaceEmbedding

print("Creating database tables...")

Base.metadata.create_all(bind=engine)

print("✅ Database tables created successfully!")