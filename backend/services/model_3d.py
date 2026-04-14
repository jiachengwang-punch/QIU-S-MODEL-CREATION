"""
3D model generation — supports Meshy AI (async job) and custom endpoints.
Returns GLB bytes.
"""
import asyncio
import base64
import httpx
from models import APIConfig


async def generate_3d(cfg: APIConfig, source_bytes: bytes, prompt: str) -> bytes:
    if cfg.provider_hint == "meshy":
        return await _meshy(cfg, source_bytes, prompt)
    elif cfg.provider_hint == "custom":
        return await _custom_3d(cfg, source_bytes, prompt)
    else:
        raise ValueError(f"Unsupported provider for 3D: {cfg.provider_hint}")


async def _meshy(cfg: APIConfig, source_bytes: bytes, prompt: str) -> bytes:
    base_url = (cfg.base_url or "https://api.meshy.ai").rstrip("/")
    headers = {"Authorization": f"Bearer {cfg.api_key}", "Content-Type": "application/json"}

    image_b64 = base64.b64encode(source_bytes).decode()
    image_data_url = f"data:image/png;base64,{image_b64}"

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{base_url}/v2/image-to-3d",
            headers=headers,
            json={"image_url": image_data_url, "enable_pbr": True},
        )
        resp.raise_for_status()
        task_id = resp.json()["result"]

    # Poll for completion (up to 10 minutes)
    async with httpx.AsyncClient(timeout=30) as client:
        for _ in range(120):
            await asyncio.sleep(5)
            status_resp = await client.get(f"{base_url}/v2/image-to-3d/{task_id}", headers=headers)
            status_resp.raise_for_status()
            task = status_resp.json()

            if task["status"] == "SUCCEEDED":
                glb_url = task["model_urls"]["glb"]
                async with httpx.AsyncClient(timeout=120) as dl:
                    glb_resp = await dl.get(glb_url)
                    return glb_resp.content
            elif task["status"] == "FAILED":
                msg = task.get("task_error", {}).get("message", "Unknown error")
                raise RuntimeError(f"Meshy task failed: {msg}")

    raise RuntimeError("3D generation timed out after 10 minutes")


async def _custom_3d(cfg: APIConfig, source_bytes: bytes, prompt: str) -> bytes:
    """POST source image to custom endpoint, expect binary GLB response."""
    base_url = (cfg.base_url or "").rstrip("/")
    if not base_url:
        raise ValueError("Custom 3D provider requires a base_url")

    headers = {"Authorization": f"Bearer {cfg.api_key}"}
    async with httpx.AsyncClient(timeout=300) as client:
        resp = await client.post(
            f"{base_url}/generate",
            headers=headers,
            files={"image": ("source.png", source_bytes, "image/png")},
            data={"prompt": prompt},
        )
        resp.raise_for_status()
        return resp.content
