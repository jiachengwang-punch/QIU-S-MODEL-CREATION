"""
Unified storage service — reads the active StorageProfile from DB.
"""
import httpx
from pathlib import Path
from sqlalchemy.orm import Session

from services.file_storage import save_asset_file, save_thumbnail, guess_ext


def _get_active_profile(db: Session):
    from models import AppSetting, StorageProfile
    row = db.query(AppSetting).filter(AppSetting.key == "active_storage_profile_id").first()
    if not row or not row.value:
        return None
    return db.query(StorageProfile).filter(StorageProfile.id == int(row.value)).first()


async def store_asset(
    data: bytes,
    asset_type: str,
    filename: str,
    db: Session,
) -> tuple[str, str, str]:
    """Returns (file_path_or_url, public_url, storage_type)."""
    profile = _get_active_profile(db)

    if profile and profile.type == "remote" and profile.remote_url:
        return await _store_remote(data, filename, profile.remote_url, profile.remote_token)
    elif profile and profile.type == "local" and profile.local_path:
        return _store_custom_local(data, asset_type, filename, profile.local_path)
    else:
        return _store_default_local(data, asset_type, filename)


def _store_default_local(data: bytes, asset_type: str, filename: str) -> tuple[str, str, str]:
    ext = guess_ext(data)
    rel, actual_name = save_asset_file(data, asset_type, ext, filename)
    public_url = f"http://localhost:8000/static/{rel}"
    return rel, public_url, "local"


def _store_custom_local(data: bytes, asset_type: str, filename: str, base_path: str) -> tuple[str, str, str]:
    from services.file_storage import _safe_type
    safe_t = _safe_type(asset_type)
    target_dir = Path(base_path) / safe_t
    target_dir.mkdir(parents=True, exist_ok=True)
    fp = target_dir / filename
    fp.write_bytes(data)
    rel = str(fp)
    public_url = f"http://localhost:8000/api/library/file?path={rel}"
    return rel, public_url, "local"


async def _store_remote(data: bytes, filename: str, remote_url: str, token: str | None) -> tuple[str, str, str]:
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            remote_url,
            headers=headers,
            files={"file": (filename, data, "application/octet-stream")},
        )
        resp.raise_for_status()
        result = resp.json()
        url = result.get("url") or result.get("path") or resp.text.strip()
    return url, url, "remote"


def store_thumbnail_local(data: bytes, stem: str) -> str | None:
    try:
        return save_thumbnail(data, stem)
    except Exception:
        return None
