from backend.app.database import SessionLocal
from backend.app.models.user import User
from backend.app.services.security import hash_password


ADMIN_EMAIL = "admin@facesecure.com"
ADMIN_PASSWORD = "Admin@123"


db = SessionLocal()

try:
    user = (
        db.query(User)
        .filter(User.email == ADMIN_EMAIL)
        .first()
    )

    if user is None:
        user = User(
            name="System Administrator",
            email=ADMIN_EMAIL,
            phone=None,
            department="Administration",
            designation="Administrator",
            role="admin",
            status=True,
            password_hash=hash_password(ADMIN_PASSWORD),
        )

        db.add(user)
        db.commit()
        db.refresh(user)

        print("✅ Admin user created successfully!")
        print(f"Employee ID: {user.employee_id}")
        print(f"Email: {user.email}")

    else:
        user.password_hash = hash_password(ADMIN_PASSWORD)
        user.role = "admin"
        user.status = True

        db.commit()
        db.refresh(user)

        print("✅ Existing admin user updated successfully!")
        print(f"Employee ID: {user.employee_id}")
        print(f"Email: {user.email}")

finally:
    db.close()