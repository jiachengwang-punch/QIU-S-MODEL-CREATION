import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse, Response
from sqlalchemy.orm import Session
from typing import Optional
from pathlib import Path

from database import get_db
from models import Asset, GenerationJob
from schemas import AssetSaveRequest
from services.file_storage import delete_file, full_path, guess_ext, STORAGE_ROOT
from services.storage_service import store_asset, store_thumbnail_local

router = APIRouter(prefix="/api/library", tags=["library"])
BASE_URL = os.getenv("BASE_URL", "http://localhost:8000")


def _asset_out(a: Asset) -> dict:
    if a.storage_type == "remote":
        url = a.file_path
        thumb = a.thumbnail_path or url
    else:
        url = f"{BASE_URL}/static/{a.file_path}" if a.file_path and not os.path.isabs(a.file_path) else f"{BASE_URL}/api/library/file?path={a.file_path}"
        thumb = (f"{BASE_URL}/static/{a.thumbnail_path}" if a.thumbnail_path else url)
    return {
        "id": a.id,
        "project_id": a.project_id,
        "asset_type": a.asset_type,
        "filename": a.filename,
        "file_path": a.file_path,
        "thumbnail_path": a.thumbnail_path,
        "file_size": a.file_size,
        "mime_type": a.mime_type,
        "prompt": a.prompt,
        "source_asset_id": a.source_asset_id,
        "storage_type": a.storage_type,
        "created_at": a.created_at.isoformat() if a.created_at else None,
        "url": url,
        "thumbnail_url": thumb,
    }


@router.get("/assets")
def list_assets(type: str, project_id: Optional[int] = None, db: Session = Depends(get_db)):
    q = db.query(Asset).filter(Asset.asset_type == type)
    if project_id is not None:
        q = q.filter(Asset.project_id == project_id)
    return [_asset_out(a) for a in q.order_by(Asset.created_at.desc()).all()]


@router.post("/save")
async def save_to_library(body: AssetSaveRequest, db: Session = Depends(get_db)):
    job = db.query(GenerationJob).filter(GenerationJob.id == body.job_id).first()
    if not job:
        raise HTTPException(404, "Job not found")
    if job.status != "done" or not job.preview_path:
        raise HTTPException(400, "Job not completed or has no preview")

    preview_full = full_path(job.preview_path)
    data = preview_full.read_bytes()
    ext = guess_ext(data, "png")
    filename = body.filename or f"asset_{job.id}.{ext}"
    if not filename.endswith(f".{ext}"):
        filename = os.path.splitext(filename)[0] + f".{ext}"

    file_path, public_url, storage_type = await store_asset(data, job.job_type, filename, db)
    thumb = store_thumbnail_local(data, os.path.splitext(filename)[0]) if ext not in ("glb",) else None

    mime_map = {"png": "image/png", "jpg": "image/jpeg", "webp": "image/webp", "glb": "model/gltf-binary"}
    asset = Asset(
        project_id=body.project_id,
        asset_type=job.job_type,
        filename=filename,
        file_path=file_path,
        thumbnail_path=thumb,
        file_size=len(data),
        mime_type=mime_map.get(ext, "application/octet-stream"),
        storage_type=storage_type,
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)
    job.result_asset_id = asset.id
    db.commit()
    return _asset_out(asset)


@router.post("/upload")
async def upload_to_library(
    type: str = Form(...),
    project_id: Optional[int] = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    data = await file.read()
    ext = os.path.splitext(file.filename or "")[1].lstrip(".") or guess_ext(data, "png")
    filename = file.filename or f"upload_{ext}"
    file_path, public_url, storage_type = await store_asset(data, type, filename, db)
    thumb = store_thumbnail_local(data, os.path.splitext(filename)[0]) if ext not in ("glb",) else None

    asset = Asset(
        project_id=project_id,
        asset_type=type,
        filename=filename,
        file_path=file_path,
        thumbnail_path=thumb,
        file_size=len(data),
        mime_type=file.content_type,
        storage_type=storage_type,
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return _asset_out(asset)


@router.delete("/assets/{asset_id}")
def delete_asset(asset_id: int, db: Session = Depends(get_db)):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(404, "Asset not found")
    if asset.storage_type == "local":
        if asset.file_path and not os.path.isabs(asset.file_path):
            delete_file(asset.file_path)
        elif asset.file_path and os.path.isabs(asset.file_path):
            p = Path(asset.file_path)
            if p.exists(): p.unlink()
        if asset.thumbnail_path:
            delete_file(asset.thumbnail_path)
    db.delete(asset)
    db.commit()
    return {"ok": True}


@router.get("/assets/{asset_id}/download")
def download_asset(asset_id: int, db: Session = Depends(get_db)):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(404, "Asset not found")
    if asset.storage_type == "remote":
        raise HTTPException(400, "Remote assets must be downloaded directly from their URL")
    p = full_path(asset.file_path) if not os.path.isabs(asset.file_path) else Path(asset.file_path)
    if not p.exists():
        raise HTTPException(404, "File not found")
    return FileResponse(str(p), filename=asset.filename, media_type="application/octet-stream")


@router.get("/file")
def serve_custom_path_file(path: str):
    """Serve files stored in custom local paths."""
    p = Path(path)
    if not p.exists() or not p.is_file():
        raise HTTPException(404, "File not found")
    import mimetypes
    mime, _ = mimetypes.guess_type(str(p))
    return FileResponse(str(p), media_type=mime or "application/octet-stream")
