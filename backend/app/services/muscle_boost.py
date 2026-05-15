import io
import base64
from pathlib import Path
from typing import Literal

from PIL import Image, ImageOps

from ..config import settings
from .vertex_openai import build_vertex_openai_client

STORAGE_ROOT = Path(__file__).resolve().parents[2] / "storage" / "muscle_boost"
ORIGINAL_DIR = STORAGE_ROOT / "originals"
RESULT_DIR = STORAGE_ROOT / "results"

# ==========================================
# 1. 提示词定义 (Prompt Templates)
# ==========================================

PROMPT_STYLE_NATURAL = """
只是增强图片肌肉和线条，变大一点，不要改变其他的，不要过于夸张，自然一点。
重要：请直接将编辑后的图片作为多模态响应的一部分返回。
"""

PROMPT_STYLE_FITNESS = """
You are a peak-performance fitness and bodybuilding assistant.
Your task is to REDESIGN and ENHANCE the provided photo to make the person look significantly more muscular, aesthetic, and powerful.

INSTRUCTIONS:
1. Preserve the original person's identity, face, pose, and background details exactly.
2. Apply profound muscle enhancement. Focus on hypertrophy, colossal mass, titanic muscles with deep striations and vascularity.
3. Target Areas: Focus on shoulders, chest, arms (biceps/triceps), and lats.
4. Output Quality: Generate a realistic, high-resolution, professional fitness photograph.

IMPORTANT: Return the edited image as part of the multimodal response.
"""


def _ensure_storage_dirs() -> None:
    ORIGINAL_DIR.mkdir(parents=True, exist_ok=True)
    RESULT_DIR.mkdir(parents=True, exist_ok=True)


# ==========================================
# 2. Vertex AI 客户端与 API 调用
# ==========================================

def _generate_boosted_image_ai(
    image_bytes: bytes,
    prompt_style: Literal["natural", "fitness"],
    mime_type: str = "image/jpeg",
) -> bytes:
    client = build_vertex_openai_client()
    base64_image = base64.b64encode(image_bytes).decode("utf-8")

    prompt = PROMPT_STYLE_FITNESS if prompt_style == "fitness" else PROMPT_STYLE_NATURAL

    response = client.chat.completions.create(
        model=settings.vertex_muscle_model,
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:{mime_type};base64,{base64_image}"},
                    },
                ],
            }
        ],
    )

    choice = response.choices[0]
    message = choice.message

    # 路径 1: 提取 audio.data (Gemini 3.1 Flash Image 在此版本中的特殊路径)
    if hasattr(message, "audio") and message.audio and hasattr(message.audio, "data"):
        return base64.b64decode(message.audio.data)

    # 路径 2: 提取内容中的 base64
    content = message.content or ""
    if "data:image" in content and "base64," in content:
        b64_part = content.split("base64,")[1].split("}")[0].strip(' "')
        return base64.b64decode(b64_part)

    raise ValueError("AI 响应中未包含生成的图片数据")


def build_muscle_boost_result(
    image_bytes: bytes,
    *,
    prompt_type: Literal["natural", "fitness"] = "natural",
) -> tuple[bytes, dict[str, int]]:
    # 调用 AI 生成
    result_bytes = _generate_boosted_image_ai(image_bytes, prompt_style=prompt_type)

    # 为了保持元数据一致性，读取结果图尺寸
    with Image.open(io.BytesIO(result_bytes)) as img:
        # 将结果转换为 JPEG (AI 默认返回 PNG)
        output = io.BytesIO()
        img.convert("RGB").save(output, format="JPEG", quality=92, optimize=True)
        final_bytes = output.getvalue()
        width, height = img.size

    return final_bytes, {"width": width, "height": height}


def save_muscle_boost_assets(
    *,
    job_no: str,
    source_bytes: bytes,
    result_bytes: bytes,
    source_extension: str,
) -> dict[str, str]:
    _ensure_storage_dirs()
    safe_extension = source_extension.strip(".").lower() or "jpg"
    source_path = ORIGINAL_DIR / f"{job_no}.{safe_extension}"
    result_path = RESULT_DIR / f"{job_no}.jpg"

    source_path.write_bytes(source_bytes)
    result_path.write_bytes(result_bytes)

    return {
        "source_image_url": f"/media/muscle_boost/originals/{source_path.name}",
        "result_image_url": f"/media/muscle_boost/results/{result_path.name}",
    }
