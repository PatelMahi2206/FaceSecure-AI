from backend.app.database import SessionLocal
from backend.app.models.user import User
from backend.app.services.security import hash_password


ADMIN_EMPLOYEE_ID = 3
NEW_PASSWORD = "Admin@123"


db = SessionLocal()

try:
    user = db.get(User, ADMIN_EMPLOYEE_ID)

    if user is None:
        print(f"❌ User with employee_id {ADMIN_EMPLOYEE_ID} was not found.")
    else:
        user.password_hash = hash_password(NEW_PASSWORD)
        db.commit()
        db.refresh(user)

        print("✅ Admin password updated successfully!")
        print(f"Employee ID: {user.employee_id}")
        print(f"Email: {user.email}")
        print("Password: Admin@123")

finally:
    db.close()