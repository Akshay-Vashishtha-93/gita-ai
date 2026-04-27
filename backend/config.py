import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

# API Keys
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

# Paths
BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
# DB_PATH: override with env var so Railway volumes work (/data/gita.db)
DB_PATH = Path(os.getenv("DB_PATH", str(BASE_DIR / "db" / "gita.db")))

# App
APP_ENV = os.getenv("APP_ENV", "development")
APP_HOST = os.getenv("APP_HOST", "0.0.0.0")
APP_PORT = int(os.getenv("APP_PORT", "8000"))

# Model settings
EMBEDDING_MODEL = "all-MiniLM-L6-v2"  # Local sentence-transformers model (384 dims, fast)
LLM_MODEL = "claude-sonnet-4-6"  # Claude Sonnet 4.6
LLM_MODEL_STRONG = "claude-sonnet-4-6"
MAX_TOKENS = 4096
