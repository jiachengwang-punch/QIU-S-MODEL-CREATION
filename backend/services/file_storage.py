import os
import uuid
from pathlib import Path
import io
from config import ASSETS_DIR, THUMBNAILS_DIR, UPLOADS_DIR, STORAGE_ROOT

try:
    from PIL import Image
    _PIL_AVAILABLE = True
except ImportError:
    _PIL_AVAILABLE = False


def _safe_type(asset_type: str) -> str:
    return asset_type.replace(".", "_").replace("/", "_")


def save_asset_file(data: bytes, asset_type: str, ext: str, filename: str = None) -> tuple[str, str]:
    """Save asset bytes. Returns (relative_path, filename)."""
    safe_t = _safe_type(asset_type)
    target_dir = ASSETS_DIR / safe_t
    target_dir.mkdir(parents=True, exist_ok=True)

    if not filename:
        filename = f"{uuid.uuid4().hex[:12]}.{ext}"

    file_path = target_dir / filename
    file_path.write_bytes(data)

    rel_path = str(file_path.relative_to(STORAGE_ROOT))
    return rel_path, filename


def save_thumbnail(data: bytes, filename_stem: str) -> str | None:
    """Create a thumbnail for image data. Returns relative path or None."""
    if not _PIL_AVAILABLE:
        return None
    try:
        img = Image.open(io.BytesIO(data))
        img.thumbnail((256, 256), Image.LANCZOS)
        thumb_path = THUMBNAILS_DIR / f"{filename_stem}_thumb.webp"
        img.save(thumb_path, "WEBP", quality=80)
        return str(thumb_path.relative_to(STORAGE_ROOT))
    except Exception:
        return None


def save_upload(data: bytes, ext: str) -> tuple[str, str]:
    """Save a temp upload. Returns (relative_path, filename)."""
    filename = f"upload_{uuid.uuid4().hex}.{ext}"
    path = UPLOADS_DIR / filename
    path.write_bytes(data)
    return str(path.relative_to(STORAGE_ROOT)), filename


def save_preview(data: bytes, ext: str) -> tuple[str, str]:
    """Save a generation preview (temp). Returns (relative_path, filename)."""
    filename = f"preview_{uuid.uuid4().hex}.{ext}"
    path = UPLOADS_DIR / filename
    path.write_bytes(data)
    return str(path.relative_to(STORAGE_ROOT)), filename


def delete_file(rel_path: str):
    full = STORAGE_ROOT / rel_path
    if full.exists():
        full.unlink()


def full_path(rel_path: str) -> Path:
    return STORAGE_ROOT / rel_path


def guess_ext(data: bytes, default: str = "png") -> str:
    if data[:4] == b"glTF":
        return "glb"
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return "png"
    if data[:2] in (b"\xff\xd8",):
        return "jpg"
    if data[:6] in (b"GIF87a", b"GIF89a"):
        return "gif"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "webp"
    return default
