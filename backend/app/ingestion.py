import urllib.request
import json
import logging
from datetime import datetime, timedelta
from typing import Tuple
from app.config import FUELHH_STREAM_URL, WINDFOR_STREAM_URL
from app.database import get_db_connection

logger = logging.getLogger("ingestion")
logging.basicConfig(level=logging.INFO)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json"
}

def sync_bmrs_data(date_from: str = "2026-01-01", date_to: str = "2026-01-31", chunk_days: int = 4) -> Tuple[int, int]:
    """
    Fetch both actual wind generation (FUELHH) and forecasts (WINDFOR)
    from Elexon BMRS stream endpoints and upsert into the local database.
    """
    start_dt = datetime.strptime(date_from, "%Y-%m-%d")
    # Include an extra day for day-ahead delivery alignment
    end_dt = datetime.strptime(date_to, "%Y-%m-%d") + timedelta(days=2)
    
    total_actuals_saved = 0
    total_forecasts_saved = 0
    
    cur_dt = start_dt
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        while cur_dt < end_dt:
            next_dt = min(cur_dt + timedelta(days=chunk_days), end_dt)
            t_from = cur_dt.strftime("%Y-%m-%dT00:00:00Z")
            t_to = next_dt.strftime("%Y-%m-%dT00:00:00Z")
            logger.info(f"Syncing Elexon stream {t_from} to {t_to}...")
            
            # 1. Fetch Actuals from FUELHH stream
            url_f = f"{FUELHH_STREAM_URL}?publishDateTimeFrom={t_from}&publishDateTimeTo={t_to}"
            try:
                req = urllib.request.Request(url_f, headers=HEADERS)
                with urllib.request.urlopen(req, timeout=30) as resp:
                    data_f = json.loads(resp.read().decode("utf-8"))
                    wind_rows = []
                    for item in data_f:
                        if item.get("fuelType") == "WIND":
                            wind_rows.append((
                                item.get("startTime"),
                                item.get("settlementDate"),
                                item.get("settlementPeriod"),
                                item.get("generation"),
                                item.get("publishTime")
                            ))
                    cursor.executemany("""
                    INSERT OR REPLACE INTO actuals (startTime, settlementDate, settlementPeriod, generation, publishTime)
                    VALUES (?, ?, ?, ?, ?)
                    """, wind_rows)
                    conn.commit()
                    total_actuals_saved += len(wind_rows)
            except Exception as e:
                logger.error(f"FUELHH fetch failed for {t_from} to {t_to}: {e}")
                
            # 2. Fetch Forecasts from WINDFOR stream
            url_wf = f"{WINDFOR_STREAM_URL}?publishDateTimeFrom={t_from}&publishDateTimeTo={t_to}"
            try:
                req = urllib.request.Request(url_wf, headers=HEADERS)
                with urllib.request.urlopen(req, timeout=30) as resp:
                    data_wf = json.loads(resp.read().decode("utf-8"))
                    wf_rows = []
                    for item in data_wf:
                        wf_rows.append((
                            item.get("publishTime"),
                            item.get("startTime"),
                            item.get("generation")
                        ))
                    cursor.executemany("""
                    INSERT OR IGNORE INTO forecasts (publishTime, startTime, generation)
                    VALUES (?, ?, ?)
                    """, wf_rows)
                    conn.commit()
                    total_forecasts_saved += len(wf_rows)
            except Exception as e:
                logger.error(f"WINDFOR fetch failed for {t_from} to {t_to}: {e}")
                
            cur_dt = next_dt
            
    return total_actuals_saved, total_forecasts_saved
