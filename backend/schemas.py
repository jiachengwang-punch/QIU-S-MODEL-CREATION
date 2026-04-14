from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# ── API Config ──────────────────────────────────────────────────────────────

class APIConfigCreate(BaseModel):
    name: str
    api_key: str
    base_url: Optional[str] = None
    model_name: Optional[str] = None
    provider_hint: Optional[str] = None
    notes: Optional[str] = None


class APIConfigUpdate(APIConfigCreate):
    pass


class APIConfigOut(BaseModel):
    id: int
    name: str
    api_key: str
    base_url: Optional[str]
    model_name: Optional[str]
    provider_hint: Optional[str]
    notes: Optional[str]
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


# ── Storage Profile ───────────────────────────────────────────────────────────

class StorageProfileCreate(BaseModel):
    name: str
    type: str = "local"
    local_path: Optional[str] = None
    remote_url: Optional[str] = None
    remote_token: Optional[str] = None
    notes: Optional[str] = None


class StorageProfileUpdate(StorageProfileCreate):
    pass


class StorageProfileOut(BaseModel):
    id: int
    name: str
    type: str
    local_path: Optional[str]
    remote_url: Optional[str]
    remote_token: Optional[str]
    notes: Optional[str]
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


# ── Project ──────────────────────────────────────────────────────────────────

class ProjectCreate(BaseModel):
    name: str
    asset_type: str


class ProjectUpdate(BaseModel):
    name: str


class ProjectOut(BaseModel):
    id: int
    name: str
    asset_type: str
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


# ── Asset ────────────────────────────────────────────────────────────────────

class AssetSaveRequest(BaseModel):
    job_id: int
    project_id: Optional[int] = None
    filename: Optional[str] = None


# ── Generation Job ────────────────────────────────────────────────────────────

class JobOut(BaseModel):
    id: int
    job_type: str
    status: str
    result_asset_id: Optional[int]
    preview_url: Optional[str]
    error_message: Optional[str]
    created_at: Optional[datetime]

    class Config:
        from_attributes = True
