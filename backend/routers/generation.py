import asyncio
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional

from database import get_db
from models import APIConfig, GenerationJob
from schemas import JobOut
from services.image_gen import generate_2d_image
from services.image_25d import generate_25d
from services.model_3d import generate_3d
from services.file_storage import save_preview, guess_ext, full_path

router = APIRouter(prefix="/api/generate", tags=["generation"])


def _get_cfg(cfg_id: int, db: Session) -> APIConfig:
    cfg = db.query(APIConfig).filter(APIConfig.id == cfg_id).first()
    if not cfg:
        raise HTTPException(404, "API config not found")
    return cfg


def _get_source_bytes(
    source_image: Optional[UploadFile],
    source_asset_id: Optional[int],
    db: Session,
) -> bytes:
    if source_image:
        import asyncio
        loop = asyncio.get_event_loop()
        return loop.run_until_complete(source_image.read())
    if source_asset_id:
        from models import Asset
        asset = db.query(Asset).filter(Asset.id == source_asset_id).first()
        if not asset:
            raise HTTPException(404, "Source asset not found")
        p = full_path(asset.file_path)
        if not p.exists():
            raise HTTPException(404, "Source asset file missing")
        return p.read_bytes()
    raise HTTPException(400, "Provide source_image or source_asset_id")


@router.post("/2d", response_model=JobOut)
async def gen_2d(
    prompt: str = Form(...),
    api_config_id: int = Form(...),
    width: int = Form(1024),
    height: int = Form(1024),
    ref1: Optional[UploadFile] = File(None),
    ref2: Optional[UploadFile] = File(None),
    ref3: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
):
    cfg = _get_cfg(api_config_id, db)
    refs = []
    for r in (ref1, ref2, ref3):
        if r:
            refs.append(await r.read())

    job = GenerationJob(job_type="2d", status="processing")
    db.add(job)
    db.commit()
    db.refresh(job)

    try:
        data = await generate_2d_image(cfg, prompt, refs, width, height)
        ext = guess_ext(data)
        rel, _ = save_preview(data, ext)
        job.status = "done"
        job.preview_path = rel
    except Exception as e:
        job.status = "failed"
        job.error_message = str(e)

    db.commit()
    db.refresh(job)

    preview_url = f"/static/{job.preview_path}" if job.preview_path else None
    return JobOut(
        id=job.id,
        job_type=job.job_type,
        status=job.status,
        result_asset_id=job.result_asset_id,
        preview_url=preview_url,
        error_message=job.error_message,
        created_at=job.created_at,
    )


@router.post("/2.5d", response_model=JobOut)
async def gen_25d(
    prompt: str = Form(""),
    api_config_id: int = Form(...),
    source_image: Optional[UploadFile] = File(None),
    source_asset_id: Optional[int] = Form(None),
    db: Session = Depends(get_db),
):
    cfg = _get_cfg(api_config_id, db)

    if source_image:
        source_bytes = await source_image.read()
    elif source_asset_id:
        from models import Asset
        asset = db.query(Asset).filter(Asset.id == source_asset_id).first()
        if not asset:
            raise HTTPException(404, "Source asset not found")
        source_bytes = full_path(asset.file_path).read_bytes()
    else:
        raise HTTPException(400, "Provide source_image or source_asset_id")

    job = GenerationJob(job_type="2.5d", status="processing")
    db.add(job)
    db.commit()
    db.refresh(job)

    try:
        data = await generate_25d(cfg, source_bytes, prompt)
        ext = guess_ext(data)
        rel, _ = save_preview(data, ext)
        job.status = "done"
        job.preview_path = rel
    except Exception as e:
        job.status = "failed"
        job.error_message = str(e)

    db.commit()
    db.refresh(job)

    preview_url = f"/static/{job.preview_path}" if job.preview_path else None
    return JobOut(
        id=job.id,
        job_type=job.job_type,
        status=job.status,
        result_asset_id=job.result_asset_id,
        preview_url=preview_url,
        error_message=job.error_message,
        created_at=job.created_at,
    )


@router.post("/3d", response_model=JobOut)
async def gen_3d(
    background_tasks: BackgroundTasks,
    prompt: str = Form(""),
    api_config_id: int = Form(...),
    source_image: Optional[UploadFile] = File(None),
    source_asset_id: Optional[int] = Form(None),
    db: Session = Depends(get_db),
):
    cfg = _get_cfg(api_config_id, db)

    if source_image:
        source_bytes = await source_image.read()
    elif source_asset_id:
        from models import Asset
        asset = db.query(Asset).filter(Asset.id == source_asset_id).first()
        if not asset:
            raise HTTPException(404, "Source asset not found")
        source_bytes = full_path(asset.file_path).read_bytes()
    else:
        raise HTTPException(400, "Provide source_image or source_asset_id")

    job = GenerationJob(job_type="3d", status="pending")
    db.add(job)
    db.commit()
    db.refresh(job)
    job_id = job.id

    async def run_3d():
        from database import SessionLocal
        inner_db = SessionLocal()
        inner_job = inner_db.query(GenerationJob).filter(GenerationJob.id == job_id).first()
        inner_job.status = "processing"
        inner_db.commit()
        try:
            data = await generate_3d(cfg, source_bytes, prompt)
            ext = guess_ext(data, "glb")
            rel, _ = save_preview(data, ext)
            inner_job.status = "done"
            inner_job.preview_path = rel
        except Exception as e:
            inner_job.status = "failed"
            inner_job.error_message = str(e)
        finally:
            inner_db.commit()
            inner_db.close()

    background_tasks.add_task(run_3d)

    return JobOut(
        id=job.id,
        job_type="3d",
        status="pending",
        result_asset_id=None,
        preview_url=None,
        error_message=None,
        created_at=job.created_at,
    )


@router.get("/jobs/{job_id}", response_model=JobOut)
def get_job(job_id: int, db: Session = Depends(get_db)):
    job = db.query(GenerationJob).filter(GenerationJob.id == job_id).first()
    if not job:
        raise HTTPException(404, "Job not found")
    preview_url = f"/static/{job.preview_path}" if job.preview_path else None
    return JobOut(
        id=job.id,
        job_type=job.job_type,
        status=job.status,
        result_asset_id=job.result_asset_id,
        preview_url=preview_url,
        error_message=job.error_message,
        created_at=job.created_at,
    )
