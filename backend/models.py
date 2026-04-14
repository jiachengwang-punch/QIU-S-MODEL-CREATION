from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from database import Base


class APIConfig(Base):
    __tablename__ = "api_configs"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)         # 用户自定义名称
    api_key = Column(String, nullable=False)
    base_url = Column(String, nullable=True)
    model_name = Column(String, nullable=True)
    provider_hint = Column(String, nullable=True) # 可选备注（openai/stability/meshy/…）
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    asset_type = Column(String, nullable=False)   # 2d | 2.5d | 3d | texture
    created_at = Column(DateTime, server_default=func.now())


class Asset(Base):
    __tablename__ = "assets"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=True)
    asset_type = Column(String, nullable=False)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)    # 本地相对路径 或 远程 URL
    thumbnail_path = Column(String, nullable=True)
    file_size = Column(Integer, nullable=True)
    mime_type = Column(String, nullable=True)
    prompt = Column(Text, nullable=True)
    source_asset_id = Column(Integer, ForeignKey("assets.id"), nullable=True)
    storage_type = Column(String, nullable=False, default="local")  # local | remote
    created_at = Column(DateTime, server_default=func.now())


class GenerationJob(Base):
    __tablename__ = "generation_jobs"

    id = Column(Integer, primary_key=True, index=True)
    job_type = Column(String, nullable=False)
    status = Column(String, nullable=False, default="pending")
    provider_job_id = Column(String, nullable=True)
    result_asset_id = Column(Integer, ForeignKey("assets.id"), nullable=True)
    preview_path = Column(String, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class StorageProfile(Base):
    __tablename__ = "storage_profiles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)           # 用户自定义名称
    type = Column(String, nullable=False)            # local | remote
    local_path = Column(String, nullable=True)
    remote_url = Column(String, nullable=True)
    remote_token = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())


class AppSetting(Base):
    __tablename__ = "app_settings"

    key = Column(String, primary_key=True)
    value = Column(Text, nullable=True)
