from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import Project, Asset
from schemas import ProjectCreate, ProjectUpdate, ProjectOut
from services.file_storage import delete_file

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("", response_model=List[ProjectOut])
def list_projects(type: str, db: Session = Depends(get_db)):
    return db.query(Project).filter(Project.asset_type == type).order_by(Project.name).all()


@router.post("", response_model=ProjectOut)
def create_project(body: ProjectCreate, db: Session = Depends(get_db)):
    proj = Project(**body.model_dump())
    db.add(proj)
    db.commit()
    db.refresh(proj)
    return proj


@router.patch("/{proj_id}", response_model=ProjectOut)
def rename_project(proj_id: int, body: ProjectUpdate, db: Session = Depends(get_db)):
    proj = db.query(Project).filter(Project.id == proj_id).first()
    if not proj:
        raise HTTPException(404, "Project not found")
    proj.name = body.name
    db.commit()
    db.refresh(proj)
    return proj


@router.delete("/{proj_id}")
def delete_project(proj_id: int, db: Session = Depends(get_db)):
    proj = db.query(Project).filter(Project.id == proj_id).first()
    if not proj:
        raise HTTPException(404, "Project not found")

    assets = db.query(Asset).filter(Asset.project_id == proj_id).all()
    for asset in assets:
        if asset.file_path:
            delete_file(asset.file_path)
        if asset.thumbnail_path:
            delete_file(asset.thumbnail_path)
    db.query(Asset).filter(Asset.project_id == proj_id).delete()

    db.delete(proj)
    db.commit()
    return {"ok": True}
