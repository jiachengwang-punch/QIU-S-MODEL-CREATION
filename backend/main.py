import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import config
from database import engine, Base
from routers import generation, library, projects, settings

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Game Asset Studio")

cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory=str(config.STORAGE_ROOT)), name="static")

app.include_router(generation.router)
app.include_router(library.router)
app.include_router(projects.router)
app.include_router(settings.router)

# 生产环境：托管前端构建产物（同域访问，无 CORS 问题）
frontend_dist = Path(__file__).parent.parent / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")


@app.get("/health")
def health():
    return {"status": "ok"}
