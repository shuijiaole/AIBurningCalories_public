import os
from pathlib import Path

import google.auth.transport.requests
import openai
from google.auth import default


BASE_DIR = Path(__file__).resolve().parent


def load_env_file(path: Path) -> None:
    if not path.exists():
        return

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def clear_broken_proxy_env() -> None:
    for key in (
        "HTTP_PROXY",
        "HTTPS_PROXY",
        "ALL_PROXY",
        "http_proxy",
        "https_proxy",
        "all_proxy",
    ):
        os.environ.pop(key, None)


load_env_file(BASE_DIR / ".env")
clear_broken_proxy_env()

project_id = os.getenv("VERTEX_PROJECT_ID", "gen-lang-client-0676619968")
location = os.getenv("VERTEX_LOCATION", "global")
model = os.getenv("VERTEX_FOOD_MODEL", "google/gemini-2.5-flash-lite")

credentials, _ = default(scopes=["https://www.googleapis.com/auth/cloud-platform"])
credentials.refresh(google.auth.transport.requests.Request())

client = openai.OpenAI(
    base_url=(
        f"https://aiplatform.googleapis.com/v1/projects/{project_id}"
        f"/locations/{location}/endpoints/openapi"
    ),
    api_key=credentials.token,
)

response = client.chat.completions.create(
    model=model,
    reasoning_effort="low",
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "用中文说你好"},
    ],
)

print(response.choices[0].message.content)
