from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from database import get_db
from models import APIConfig, AppSetting, StorageProfile
from schemas import (
    APIConfigCreate, APIConfigUpdate, APIConfigOut,
    StorageProfileCreate, StorageProfileUpdate, StorageProfileOut,
)

router = APIRouter(prefix="/api/settings", tags=["settings"])


# ── API Configs ──────────────────────────────────────────────────────────────

@router.get("/api-configs", response_model=List[APIConfigOut])
def list_api_configs(db: Session = Depends(get_db)):
    return db.query(APIConfig).order_by(APIConfig.created_at.desc()).all()


@router.post("/api-configs", response_model=APIConfigOut)
def create_api_config(body: APIConfigCreate, db: Session = Depends(get_db)):
    cfg = APIConfig(**body.model_dump())
    db.add(cfg)
    db.commit()
    db.refresh(cfg)
    return cfg


@router.put("/api-configs/{cfg_id}", response_model=APIConfigOut)
def update_api_config(cfg_id: int, body: APIConfigUpdate, db: Session = Depends(get_db)):
    cfg = db.query(APIConfig).filter(APIConfig.id == cfg_id).first()
    if not cfg:
        raise HTTPException(404, "Config not found")
    for k, v in body.model_dump().items():
        setattr(cfg, k, v)
    db.commit()
    db.refresh(cfg)
    return cfg


@router.delete("/api-configs/{cfg_id}")
def delete_api_config(cfg_id: int, db: Session = Depends(get_db)):
    cfg = db.query(APIConfig).filter(APIConfig.id == cfg_id).first()
    if not cfg:
        raise HTTPException(404, "Config not found")
    db.delete(cfg)
    db.commit()
    return {"ok": True}


# ── Storage Profiles ──────────────────────────────────────────────────────────

def _get_setting(db: Session, key: str, default: str = "") -> str:
    row = db.query(AppSetting).filter(AppSetting.key == key).first()
    return row.value if row else default


def _set_setting(db: Session, key: str, value: str):
    row = db.query(AppSetting).filter(AppSetting.key == key).first()
    if row:
        row.value = value
    else:
        db.add(AppSetting(key=key, value=value))
    db.commit()


@router.get("/storage-profiles", response_model=List[StorageProfileOut])
def list_storage_profiles(db: Session = Depends(get_db)):
    return db.query(StorageProfile).order_by(StorageProfile.created_at).all()


@router.post("/storage-profiles", response_model=StorageProfileOut)
def create_storage_profile(body: StorageProfileCreate, db: Session = Depends(get_db)):
    profile = StorageProfile(**body.model_dump())
    db.add(profile)
    db.commit()
    db.refresh(profile)
    # 如果是第一个，自动设为激活
    if db.query(StorageProfile).count() == 1:
        _set_setting(db, "active_storage_profile_id", str(profile.id))
    return profile


@router.put("/storage-profiles/{profile_id}", response_model=StorageProfileOut)
def update_storage_profile(profile_id: int, body: StorageProfileUpdate, db: Session = Depends(get_db)):
    profile = db.query(StorageProfile).filter(StorageProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(404, "Profile not found")
    for k, v in body.model_dump().items():
        setattr(profile, k, v)
    db.commit()
    db.refresh(profile)
    return profile


@router.delete("/storage-profiles/{profile_id}")
def delete_storage_profile(profile_id: int, db: Session = Depends(get_db)):
    profile = db.query(StorageProfile).filter(StorageProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(404, "Profile not found")
    # 如果删除的是激活中的，清空激活
    active_id = _get_setting(db, "active_storage_profile_id")
    if active_id == str(profile_id):
        _set_setting(db, "active_storage_profile_id", "")
    db.delete(profile)
    db.commit()
    return {"ok": True}


@router.get("/active-storage", response_model=Optional[StorageProfileOut])
def get_active_storage(db: Session = Depends(get_db)):
    active_id = _get_setting(db, "active_storage_profile_id")
    if not active_id:
        return None
    return db.query(StorageProfile).filter(StorageProfile.id == int(active_id)).first()


@router.put("/active-storage/{profile_id}")
def set_active_storage(profile_id: int, db: Session = Depends(get_db)):
    profile = db.query(StorageProfile).filter(StorageProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(404, "Profile not found")
    _set_setting(db, "active_storage_profile_id", str(profile_id))
    return {"ok": True, "active_id": profile_id}
