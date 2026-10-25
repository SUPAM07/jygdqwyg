import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# Database configuration
DATABASE_PATH = os.getenv("DATABASE_PATH", str(BASE_DIR / "data" / "bmrs_data.db"))

# Elexon BMRS API endpoints
ELEXON_API_BASE = os.getenv("ELEXON_API_BASE", "https://data.elexon.co.uk/bmrs/api/v1")
FUELHH_STREAM_URL = f"{ELEXON_API_BASE}/datasets/FUELHH/stream"
WINDFOR_STREAM_URL = f"{ELEXON_API_BASE}/datasets/WINDFOR/stream"

# Default trading parameters
DEFAULT_GATE_CLOSURE_HOUR = int(os.getenv("DEFAULT_GATE_CLOSURE_HOUR", "11"))  # 11:00 UTC for Day-Ahead auctions
DEFAULT_START_DATE = "2026-01-01"
DEFAULT_END_DATE = "2026-01-31"

# CORS
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(",")
