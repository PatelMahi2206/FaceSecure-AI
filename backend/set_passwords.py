from sqlalchemy import select

from backend.app.database import SessionLocal
from backend.app.models.user import User
from backend.app.services.security import hash_password


def set_user_password(email: str, password: str):
    db = SessionLocal()

    try:
        user = db.execute(
            select(User).where(User.email == email)
        ).scalar_one_or_none()

        if user is None:
            print(f"❌ User not found: {email}")
            return

        user.password_hash = hash_password(password)

        db.commit()

        print(f"✅ Password set successfully for: {email}")

    except Exception as error:
        db.rollback()
        print(f"❌ Failed: {error}")

    finally:
        db.close()


if __name__ == "__main__":
    set_user_password(
        "admin@facesecure.com",
        "Admin@123"
    )

    set_user_password(
        "testuser@facesecure.com",
        "User@123"
    )