"""
2.5D generation — takes a 2D image and produces a depth/parallax or
isometric-style version via image-to-image APIs.
"""
import base64
import httpx
from models import APIConfig


async def generate_25d(cfg: APIConfig, source_bytes: bytes, prompt: str) -> bytes:
    if cfg.provider_hint in ("openai", "custom"):
        # OpenAI doesn't have img2img; fall back to text-only generation
        # with an enriched prompt describing the 2.5D effect desired.
        enhanced = f"{prompt}, isometric game asset, 2.5D perspective, depth effect" if prompt else \
                   "isometric game asset, 2.5D perspective, depth effect"
        from services.image_gen import _openai
        return await _openai(cfg, enhanced, 1024, 1024)

    elif cfg.provider_hint == "stability":
        return await _stability_img2img(cfg, source_bytes, prompt)

    else:
        raise ValueError(f"Unsupported provider for 2.5D: {cfg.provider_hint}")


async def _stability_img2img(cfg: APIConfig, source_bytes: bytes, prompt: str) -> bytes:
    base_url = (cfg.base_url or "https://api.stability.ai").rstrip("/")
    model = cfg.model_name or "stable-diffusion-xl-1024-v1-0"
    enhanced = f"{prompt}, 2.5D perspective, depth parallax effect, game art" if prompt else \
               "2.5D perspective, depth parallax effect, game art"

    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(
            f"{base_url}/v1/generation/{model}/image-to-image",
            headers={"Authorization": f"Bearer {cfg.api_key}", "Accept": "application/json"},
            data={
                "text_prompts[0][text]": enhanced,
                "text_prompts[0][weight]": "1",
                "init_image_mode": "IMAGE_STRENGTH",
                "image_strength": "0.45",
                "cfg_scale": "7",
                "steps": "30",
                "samples": "1",
            },
            files={"init_image": ("source.png", source_bytes, "image/png")},
        )
        resp.raise_for_status()
        b64 = resp.json()["artifacts"][0]["base64"]
        return base64.b64decode(b64)
