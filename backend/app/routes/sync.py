from fastapi import APIRouter, HTTPException, BackgroundTasks
from app.ingestion import sync_bmrs_data
from app.schemas import SyncRequest, SyncResponse
from app.database import get_db_connection

router = APIRouter(prefix="/sync", tags=["Sync"])

@router.post("/refresh", response_model=SyncResponse)
def trigger_sync(req: SyncRequest, background_tasks: BackgroundTasks):
    """
    Trigger an on-demand sync from the live Elexon BMRS streaming API.
    """
    try:
        act_count, fcst_count = sync_bmrs_data(date_from=req.date_from, date_to=req.date_to)
        return SyncResponse(
            status="success",
            message=f"Synced data from Elexon BMRS for {req.date_from} to {req.date_to}.",
            actuals_synced=act_count,
            forecasts_synced=fcst_count
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sync failed: {str(e)}")

@router.get("/status")
def get_sync_status():
    """
    Return current database records and temporal bounds.
    """
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*), MIN(startTime), MAX(startTime) FROM actuals")
        act_row = cursor.fetchone()
        cursor.execute("SELECT COUNT(*), MIN(startTime), MAX(startTime) FROM forecasts")
        fcst_row = cursor.fetchone()
        
    return {
        "status": "ready",
        "actuals": {
            "count": act_row[0],
            "earliest": act_row[1],
            "latest": act_row[2]
        },
        "forecasts": {
            "count": fcst_row[0],
            "earliest": fcst_row[1],
            "latest": fcst_row[2]
        }
    }
