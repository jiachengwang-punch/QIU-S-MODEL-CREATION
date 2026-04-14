"""
2D image generation — supports OpenAI DALL-E, Stability AI, and OpenAI-compatible custom endpoints.
"""
import base64
import httpx
from models import APIConfig


async def generate_2d_image(
    cfg: APIConfig,
    prompt: str,
    reference_images: list[bytes] = [],
    width: int = 1024,
    height: int = 1024,
) -> bytes:
    if cfg.provider_hint == "openai":
        return await _openai(cfg, prompt, width, height)
    elif cfg.provider_hint == "stability":
        return await _stability(cfg, prompt, width, height)
    elif cfg.provider_hint == "custom":
        return await _openai_compat(cfg, prompt, width, height)
    else:
        raise ValueError(f"Unsupported provider for 2D: {cfg.provider_hint}")


async def _openai(cfg: APIConfig, prompt: str, width: int, height: int) -> bytes:
    base_url = (cfg.base_url or "https://api.openai.com").rstrip("/")
    model = cfg.model_name or "dall-e-3"
    size = _openai_size(width, height)

    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(
            f"{base_url}/v1/images/generations",
            headers={"Authorization": f"Bearer {cfg.api_key}"},
            json={"model": model, "prompt": prompt, "n": 1, "size": size, "response_format": "b64_json"},
        )
        resp.raise_for_status()
        b64 = resp.json()["data"][0]["b64_json"]
        return base64.b64decode(b64)


async def _openai_compat(cfg: APIConfig, prompt: str, width: int, height: int) -> bytes:
    """Same as _openai but uses custom base_url."""
    return await _openai(cfg, prompt, width, height)


async def _stability(cfg: APIConfig, prompt: str, width: int, height: int) -> bytes:
    base_url = (cfg.base_url or "https://api.stability.ai").rstrip("/")
    model = cfg.model_name or "stable-diffusion-xl-1024-v1-0"

    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(
            f"{base_url}/v1/generation/{model}/text-to-image",
            headers={"Authorization": f"Bearer {cfg.api_key}", "Accept": "application/json"},
            json={
                "text_prompts": [{"text": prompt, "weight": 1}],
                "cfg_scale": 7,
                "width": _snap(width),
                "height": _snap(height),
                "steps": 30,
                "samples": 1,
            },
        )
        resp.raise_for_status()
        b64 = resp.json()["artifacts"][0]["base64"]
        return base64.b64decode(b64)


def _openai_size(w: int, h: int) -> str:
    """Map to nearest valid DALL-E 3 size."""
    ratio = w / h if h else 1
    if ratio > 1.2:
        return "1792x1024"
    elif ratio < 0.8:
        return "1024x1792"
    return "1024x1024"


def _snap(v: int, step: int = 64) -> int:
    return max(step, (v // step) * step)
