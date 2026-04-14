import os
from pathlib import Path

BASE_DIR = Path(__file__).parent
STORAGE_ROOT = BASE_DIR / "storage"
ASSETS_DIR = STORAGE_ROOT / "assets"
THUMBNAILS_DIR = STORAGE_ROOT / "thumbnails"
UPLOADS_DIR = STORAGE_ROOT / "uploads"
DATABASE_URL = f"sqlite:///{STORAGE_ROOT / 'studio.db'}"

# Create dirs on import
for d in [ASSETS_DIR / "2d", ASSETS_DIR / "2.5d", ASSETS_DIR / "3d", THUMBNAILS_DIR, UPLOADS_DIR]:
    d.mkdir(parents=True, exist_ok=True)
