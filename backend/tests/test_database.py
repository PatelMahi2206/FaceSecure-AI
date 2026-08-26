import sys
from pathlib import Path

from sqlalchemy import text

# Add project root to Python path
PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))

from backend.app.database import engine


try:
    with engine.connect() as connection:
        result = connection.execute(text("SELECT version();"))
        version = result.scalar()

        print("✅ DATABASE CONNECTED!")
        print(version)

except Exception as e:
    print("❌ DATABASE CONNECTION FAILED!")
    print(e)    