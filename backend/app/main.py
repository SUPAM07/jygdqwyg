import os
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.config import CORS_ORIGINS
from app.database import init_db
from app.routes import forecasts, metrics, procurement, sync
from app.database import get_db_connection

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB schema if not already initialized
    init_db()
    yield

app = FastAPI(
    title="UK Wind Day-Ahead Procurement & Forecast Error Analytics API",
    description="FAANG-grade analytics engine for UK wholesale power trading desks relying on Elexon BMRS WINDFOR and FUELHH streams.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS if CORS_ORIGINS != ["*"] else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routes under /api
app.include_router(forecasts.router, prefix="/api")
app.include_router(metrics.router, prefix="/api")
app.include_router(procurement.router, prefix="/api")
app.include_router(sync.router, prefix="/api")

# Reviewer convenience aliases
app.add_api_route("/api/day-ahead", forecasts.get_day_ahead, methods=["GET"], tags=["Aliases"])
app.add_api_route("/api/summary", metrics.get_metrics_summary, methods=["GET"], tags=["Aliases"])
app.add_api_route("/api/diurnal", metrics.get_diurnal_metrics, methods=["GET"], tags=["Aliases"])
app.add_api_route("/api/simulate", procurement.simulate_procurement, methods=["POST"], tags=["Aliases"])

@app.get("/api")
def api_info():
    return {
        "service": "UK Wind Day-Ahead Procurement & Forecast Error Analytics API",
        "status": "online",
        "docs_url": "/docs",
        "data_scope": "Elexon BMRS FUELHH (WIND) and WINDFOR (January 2026)"
    }

@app.get("/api/health")
def health():
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*), MIN(startTime), MAX(startTime) FROM actuals")
        act_row = cursor.fetchone()
        cursor.execute("SELECT COUNT(*), MIN(startTime), MAX(startTime) FROM forecasts")
        fcst_row = cursor.fetchone()
        
    return {
        "status": "healthy",
        "database": "sqlite",
        "actuals_count": act_row[0] if act_row else 0,
        "earliest_actual": act_row[1] if act_row else None,
        "latest_actual": act_row[2] if act_row else None,
        "forecasts_count": fcst_row[0] if fcst_row else 0,
        "earliest_forecast": fcst_row[1] if fcst_row else None,
        "latest_forecast": fcst_row[2] if fcst_row else None
    }

# Check if production frontend build exists
dist_candidates = [
    Path(__file__).resolve().parent.parent.parent / "frontend" / "dist",
    Path(__file__).resolve().parent.parent / "static",
    Path("./frontend/dist"),
    Path("./dist")
]

frontend_dist = next((p for p in dist_candidates if p.exists() and (p / "index.html").exists()), None)

if frontend_dist:
    # Mount static assets directory
    assets_dir = frontend_dist / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")
        
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = frontend_dist / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(frontend_dist / "index.html")
else:
    @app.get("/")
    def root():
        return {
            "service": "UK Wind Day-Ahead Procurement & Forecast Error Analytics API",
            "status": "online",
            "docs_url": "/docs",
            "data_scope": "Elexon BMRS FUELHH (WIND) and WINDFOR (January 2026)"
        }
