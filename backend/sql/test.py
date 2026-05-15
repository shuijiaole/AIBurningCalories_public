# streamlit run webui.py --server.maxUploadSize=2048  
import openai
from google.auth import default
import google.auth.transport.requests

# TODO(developer): Update and un-comment below lines
project_id = "gen-lang-client-0676619968"
location = "global"

# # Programmatically get an access token
credentials, _ = default(scopes=["https://www.googleapis.com/auth/cloud-platform"])
credentials.refresh(google.auth.transport.requests.Request())

# OpenAI Client
client = openai.OpenAI(
  base_url=f"https://aiplatform.googleapis.com/v1/projects/{project_id}/locations/{location}/endpoints/openapi",
  api_key=credentials.token
)

response = client.chat.completions.create(
  model="google/gemini-2.5-flash-lite",
  reasoning_effort="low",
  messages=[
      {"role": "system", "content": "You are a helpful assistant."},
      {
          "role": "user",
          "content": "用中文说你好"
      }
  ]
)
print(response.choices[0].message)