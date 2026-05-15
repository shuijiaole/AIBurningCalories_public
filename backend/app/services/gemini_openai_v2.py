from __future__ import annotations

import base64
import json
from typing import Any

from ..config import settings
from ..utils import bad_request
from .vertex_openai import build_vertex_openai_client


def _extract_json(content: str) -> dict[str, Any]:
    text = content.strip()

    if text.startswith("```"):
        parts = text.split("```")
        text = next((part for part in parts if "{" in part and "}" in part), text).strip()
        if text.startswith("json"):
            text = text[4:].strip()

    start = text.find("{")
    end = text.rfind("}")
    if start >= 0 and end > start:
        text = text[start : end + 1]

    return json.loads(text)


def _normalize_food_analysis(parsed: dict[str, Any]) -> dict[str, Any]:
    foods = parsed.get("foods")
    if not isinstance(foods, list) or not foods:
        bad_request("Gemini did not return recognizable foods")

    normalized_foods = []
    for index, item in enumerate(foods, start=1):
        normalized_foods.append(
            {
                "food_name": str(item.get("food_name") or f"Food {index}"),
                "unit_label": str(item.get("unit_label") or "1 serving"),
                "base_calories": float(item.get("base_calories") or 0),
                "base_protein_g": float(item.get("base_protein_g") or 0),
                "base_carbs_g": float(item.get("base_carbs_g") or 0),
                "base_fat_g": float(item.get("base_fat_g") or 0),
                "quantity": max(float(item.get("quantity") or 1), 1),
                "sort_no": int(item.get("sort_no") or index),
            }
        )

    return {
        "title": str(parsed.get("title") or "AI Food Analysis"),
        "subtitle": str(parsed.get("subtitle") or "Nutrition estimate is ready"),
        "foods": normalized_foods,
    }


def analyze_food_image(image_bytes: bytes, mime_type: str) -> dict[str, Any]:
    client = build_vertex_openai_client()
    base64_image = base64.b64encode(image_bytes).decode("utf-8")

    prompt = """
你是专业的中文食物识别与营养估算助手，擅长根据图片估算食物名称、份量和三大营养素。
请严格只返回 JSON，不要输出 markdown，不要输出解释。

输出结构必须是：
{
  "title": "AI 识别结果",
  "subtitle": "一句简洁中文总结",
  "foods": [
    {
      "food_name": "食物名",
      "unit_label": "1份",
      "base_calories": 123,
      "base_protein_g": 10,
      "base_carbs_g": 20,
      "base_fat_g": 5,
      "quantity": 1,
      "sort_no": 1
    }
  ]
}

规则：
1. 只识别图片里可食用、与进食相关的内容，忽略餐具、桌布、背景、包装文字。
2. 组合餐可以拆分成用户容易理解的食物项，但不要拆得过碎。
3. 品牌不明确时不要猜品牌。
4. unit_label 优先使用“1份、1碗、1盘、1个、1片、100g”等自然单位。
5. quantity 默认填 1，只有图片非常明确时才返回多个单位。
6. 所有营养字段必须是数字。
7. 即使图片略模糊，也要给出最合理估算，不要返回空 foods。
8. foods 至少 1 项，最多 8 项。
9. subtitle 用自然中文概括整餐类型和主要食物。
"""

    response = client.chat.completions.create(
        model=settings.vertex_food_model,
        reasoning_effort="low",
        response_format={"type": "json_object"},
        messages=[
            {
                "role": "system",
                "content": "You are a precise food vision and nutrition estimation assistant that must output strict JSON.",
            },
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:{mime_type};base64,{base64_image}"},
                    },
                ],
            },
        ],
    )

    content = response.choices[0].message.content or "{}"
    parsed = _extract_json(content)

    foods = parsed.get("foods")
    if not isinstance(foods, list) or not foods:
        bad_request("Gemini did not return recognizable foods")

    normalized_foods = []
    for index, item in enumerate(foods, start=1):
        normalized_foods.append(
            {
                "food_name": str(item.get("food_name") or f"食物{index}"),
                "unit_label": str(item.get("unit_label") or "1份"),
                "base_calories": float(item.get("base_calories") or 0),
                "base_protein_g": float(item.get("base_protein_g") or 0),
                "base_carbs_g": float(item.get("base_carbs_g") or 0),
                "base_fat_g": float(item.get("base_fat_g") or 0),
                "quantity": max(float(item.get("quantity") or 1), 1),
                "sort_no": int(item.get("sort_no") or index),
            }
        )

    return {
        "title": str(parsed.get("title") or "AI 识别结果"),
        "subtitle": str(parsed.get("subtitle") or "已完成图片识别与营养估算"),
        "foods": normalized_foods,
    }


def analyze_food_text(description: str) -> dict[str, Any]:
    client = build_vertex_openai_client()
    normalized_description = description.strip()
    if not normalized_description:
        bad_request("food description cannot be empty")

    prompt = f"""
You are a professional nutrition estimation assistant.
Infer likely food items and macros from the user's food description.
Return strict JSON only, with no markdown and no explanation.

Required schema:
{{
  "title": "AI Food Analysis",
  "subtitle": "One concise Chinese summary",
  "foods": [
    {{
      "food_name": "Food name",
      "unit_label": "1 serving",
      "base_calories": 123,
      "base_protein_g": 10,
      "base_carbs_g": 20,
      "base_fat_g": 5,
      "quantity": 1,
      "sort_no": 1
    }}
  ]
}}

Rules:
1. Use the user description to infer 1 to 8 food items.
2. Provide practical macro estimates.
3. unit_label should be natural, such as "1 bowl", "1 cup", "100g", "1 bottle".
4. All nutrition fields must be numbers.
5. subtitle must be concise Chinese.
6. Never return an empty foods list.

User description:
{normalized_description}
"""

    response = client.chat.completions.create(
        model=settings.vertex_food_model,
        reasoning_effort="low",
        response_format={"type": "json_object"},
        messages=[
            {
                "role": "system",
                "content": "You are a precise nutrition estimation assistant that must output strict JSON.",
            },
            {
                "role": "user",
                "content": prompt,
            },
        ],
    )

    content = response.choices[0].message.content or "{}"
    parsed = _extract_json(content)
    return _normalize_food_analysis(parsed)


def analyze_muscle_image(image_bytes: bytes, mime_type: str) -> dict[str, Any]:
    client = build_vertex_openai_client()
    base64_image = base64.b64encode(image_bytes).decode("utf-8")

    prompt = """
你是专业的健身肌肉照片识别助手，负责判断图片是否适合做“变大变强”处理。
请严格输出 JSON，不要输出 markdown，不要输出额外解释。

返回结构必须是：
{
  "title": "变大变强",
  "subtitle": "一句简洁中文总结",
  "is_muscle_photo": true,
  "confidence": "high",
  "framing": "upper_body",
  "enhancement_focus": ["shoulders", "chest", "arms"],
  "reason": "如果不适合处理，简短说明原因"
}

规则：
1. 只有健身、肌肉展示、胸肩背手臂训练、镜子自拍、健体姿势等人体照片才能返回 true。
2. 如果没有明显人体，或者不是肌肉/健身相关照片，is_muscle_photo 必须是 false。
3. framing 只允许：upper_body, full_body, mirror_selfie, back_pose, unknown。
4. enhancement_focus 只能从这几个值里选：shoulders, chest, arms, back。
5. 背部训练照优先返回 back 和 shoulders。
6. 正面训练照优先返回 shoulders, chest, arms。
7. subtitle 用自然中文描述识别到的展示类型和增强方向。
8. confidence 只允许：high, medium, low。
"""

    response = client.chat.completions.create(
        model=settings.vertex_muscle_model,
        reasoning_effort="low",
        response_format={"type": "json_object"},
        messages=[
            {
                "role": "system",
                "content": "You are a precise physique-photo analyzer that must output strict JSON.",
            },
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:{mime_type};base64,{base64_image}"},
                    },
                ],
            },
        ],
    )

    content = response.choices[0].message.content or "{}"
    parsed = _extract_json(content)

    raw_focus = parsed.get("enhancement_focus")
    allowed_focus = {"shoulders", "chest", "arms", "back"}
    focus = []
    if isinstance(raw_focus, list):
        focus = [
            str(item).strip().lower()
            for item in raw_focus
            if str(item).strip().lower() in allowed_focus
        ]
    if not focus:
        focus = ["shoulders", "arms"]

    framing = str(parsed.get("framing") or "unknown").strip().lower()
    if framing not in {"upper_body", "full_body", "mirror_selfie", "back_pose", "unknown"}:
        framing = "unknown"

    confidence = str(parsed.get("confidence") or "medium").strip().lower()
    if confidence not in {"high", "medium", "low"}:
        confidence = "medium"

    return {
        "title": str(parsed.get("title") or "变大变强"),
        "subtitle": str(
            parsed.get("subtitle") or "已识别肌肉相关照片，并准备增强肩背胸臂的横向视觉。"
        ),
        "is_muscle_photo": bool(parsed.get("is_muscle_photo")),
        "confidence": confidence,
        "framing": framing,
        "enhancement_focus": focus,
        "reason": str(parsed.get("reason") or "请上传肌肉训练或健身展示照片"),
    }
