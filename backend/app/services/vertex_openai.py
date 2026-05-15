from __future__ import annotations

import google.auth.transport.requests
from google.auth import default
from openai import OpenAI

from ..config import settings
from ..utils import bad_request

_CLOUD_PLATFORM_SCOPE = ["https://www.googleapis.com/auth/cloud-platform"]


def _build_base_url() -> str:
    if not settings.vertex_project_id:
        bad_request("VERTEX_PROJECT_ID is not configured")

    return (
        "https://aiplatform.googleapis.com/v1/projects/"
        f"{settings.vertex_project_id}/locations/{settings.vertex_location}/endpoints/openapi"
    )


def get_vertex_access_token() -> str:
    credentials, _ = default(scopes=_CLOUD_PLATFORM_SCOPE)
    credentials.refresh(google.auth.transport.requests.Request())
    return credentials.token


def build_vertex_openai_client() -> OpenAI:
    return OpenAI(
        base_url=_build_base_url(),
        api_key=get_vertex_access_token(),
    )
