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


def analyze_food_image(image_bytes: bytes, mime_type: str) -> dict[str, Any]:
    client = build_vertex_openai_client()
    base64_image = base64.b64encode(image_bytes).decode("utf-8")

    prompt = """
你是一个专业的中文食物识别与营养估算助手，擅长根据食物图片估算食物名称、份量和三大营养素。

你的任务：
1. 识别图片中的主要可食用项目。
2. 将混合餐拆分为多个可理解的食物项。
3. 估算每个食物项在“常见一份”下的热量、蛋白质、碳水、脂肪。
4. 严格只返回 JSON，不要 markdown，不要解释，不要额外文字。

请严格返回以下 JSON 结构，字段名必须完全一致：
{
  "title": "AI 识别结果",
  "subtitle": "一句简洁中文总结",
  "foods": [
    {
      "food_name": "食物名",
      "unit_label": "单位描述，例如1个/1碗/2片/1份/100g",
      "base_calories": 123,
      "base_protein_g": 10,
      "base_carbs_g": 20,
      "base_fat_g": 5,
      "quantity": 1,
      "sort_no": 1
    }
  ]
}

识别与估算规则：
1. 只识别看得见、可食用、与进食相关的内容；忽略餐具、桌布、背景、包装袋文字、摆盘装饰。
2. 如果是一份组合餐，请拆成用户能理解的食物项，例如“米饭”“煎鸡胸肉”“西兰花”。
3. 如果是饮料、酸奶、面包、零食等预包装食品，但品牌不明确，不要编造品牌，只识别品类。
4. 如果是中餐复杂菜品，可以直接输出常见菜名，例如“宫保鸡丁”“番茄炒蛋”，不要过度拆碎到难以使用。
5. unit_label 要贴近用户录入习惯，优先使用“1份、1碗、1盘、1个、2片、1杯、100g”等自然单位。
6. quantity 默认填 1，除非图片非常明确显示为多个独立单位，例如两个鸡蛋，可写成 quantity=2，unit_label=1个。
7. 所有营养值必须是数字，不要带单位，不要字符串。
8. 估算时优先保守、合理，不要夸张。
9. 如果图片模糊或存在不确定性，也必须给出最合理估计，不要返回空 foods。
10. foods 至少返回 1 项，最多返回 8 项。

subtitle 规则：
1. 使用自然中文，总结整餐类型和主要食物。
2. 例如：“识别到一份轻食早餐，包含鸡蛋、全麦吐司和牛油果沙拉。”
3. 不要提及模型、不确定性、概率或免责声明。

输出规则：
1. 只返回合法 JSON。
2. 不要使用 markdown 代码块。
3. 不要添加任何结构之外的字段。
"""

    response = client.chat.completions.create(
        model=settings.vertex_food_model,
        reasoning_effort="low",
        response_format={"type": "json_object"},
        messages=[
            {
                "role": "system",
                "content": "You are a precise food vision and nutrition estimation assistant that must output strict JSON."
            },
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{mime_type};base64,{base64_image}"
                        },
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
