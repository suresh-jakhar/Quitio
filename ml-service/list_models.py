import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.environ.get("LLM_API_KEY"))
models = client.models.list()
for m in models.data:
    print(f"- {m.id}")
