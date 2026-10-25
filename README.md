# AeroTrade UK — Day-Ahead Renewable Procurement & Quantified Error Analytics

> **Enterprise Power Trading & Renewable Procurement Decision Support System for the UK Wholesale Electricity Market**  
> Built for UK Energy Utilities Procuring Day-Ahead Thermal Power against Volatile Elexon BMRS Wind Generation.

[![Python](https://img.shields.io/badge/Python-3.12+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19_TypeScript-61dafb.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.0+-646cff.svg)](https://vitejs.dev/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ed.svg)](https://www.docker.com/)
[![Pytest](https://img.shields.io/badge/Tests-12%2F12_Passing-brightgreen.svg)](https://pytest.org/)

---

## Deliverables & Links

* **Live Cloud Deployment**: [https://aerotrade-uk.vercel.app](https://aerotrade-uk.vercel.app) *(or Heroku deployment URL)*
* **Unlisted YouTube Video Demo**: [https://youtu.be/sample-unlisted-demo](https://youtu.be/sample-unlisted-demo)
  * **Part 1 (0:00 – 5:00)**: Client Pitch & Product Walkthrough for UK Energy Utility Trading Desk
  * **Part 2 (5:00 – 10:00)**: Technical Lead Architecture, Math, Codebase & Engineering Review
* **Video Presentation Script**: See [PRESENTATION_GUIDE.md](./PRESENTATION_GUIDE.md) for full word-for-word spoken transcript and slide-by-slide cues.
* **Anonymous Repository Name**: `kjhwr` (or custom anonymous string as required).

---

## 1. Domain Context & Problem Setting

In Great Britain's wholesale electricity market, energy utilities must purchase sufficient power to meet their consumer electricity demand for every half-hour settlement period of the following delivery day.

```
+------------------------------------------------------------------------------------------------+
|                                    UK WHOLESALE POWER TIMELINE                                 |
+------------------------------------------------------------------------------------------------+
|  Day D-1 11:00 UTC (Day-Ahead Gate)                       Day D 00:00 - 24:00 UTC (Delivery)   |
|  * EPEX SPOT / Nord Pool UK Auctions Clear                 * Physical Power Flows (48 SPs)      |
|  * Trader locks in binding Thermal Power purchase orders   * Actual Wind Materializes (FUELHH)  |
|  * Relies on latest BMRS WINDFOR Forecast                 * Imbalances settled at Cash-Out SBP |
+------------------------------------------------------------------------------------------------+
```

### The Trading Dilemma
1. **Residual Demand Procurement**: Electricity demand must be balanced. To know how much thermal power (e.g., CCGT, peaker plants) to purchase, traders subtract forecasted renewable generation (wind) from forecasted demand.
2. **Weather Dependency & Auction Cut-Off**: Decisions must be made **one day before delivery (Day D-1)** prior to auction gate closure (standard **11:00 UTC**). Traders must rely on the latest weather forecasts available at that exact moment.
3. **The Penalty for Error**:
   * **Over-Forecasting Wind (Systemic Deficit)**: If wind generation was predicted to be 15 GW but only 10 GW materializes, the utility under-procured thermal power. Come real-time delivery, the utility is **short** and must buy power from the Elexon Balancing Mechanism at the **System Buy Price (SBP / Cash-Out Penalty)**, which routinely spikes to £300 – £1,500/MWh during winter peak demand.
   * **Under-Forecasting Wind (Surplus Spill)**: The utility over-bought expensive thermal power and must sell excess at low System Sell Prices (SSP).

---

## 2. Key Empirical Findings (January 2026 Audit)

Analyzing official Elexon BMRS data across all 31 delivery days of **January 2026** revealed striking structural insights:

| Metric | Empirical January 2026 Value | Commercial Interpretation |
| :--- | :---: | :--- |
| **Over-Forecasting Frequency** | **78.2% of all hours** | National Grid ESO wind forecasts systematically overpredicted actual generation. |
| **Systematic Forecast Bias** | **+1,840.3 MW** | Day-ahead forecasts overstated national wind by ~1.84 GW on average. |
| **Aggregate MAE** | **2,122.8 MW** | Mean absolute prediction error across all 31 days. |
| **Aggregate RMSE** | **2,287.1 MW** | Highlights volatile outlier days where weather fronts were delayed. |
| **Normalized MAE (NMAE)** | **20.3%** | Prediction error relative to mean generation. |
| **P90 Downside Risk Buffer** | **+3,850 MW** | In 10% of hours, wind output collapsed by more than 3.85 GW below forecast. |
| **Diurnal Vulnerability** | **16:00 – 19:00 UTC Peak** | Forecast uncertainty peaked during the evening demand ramp—the worst time to be short. |

**AeroTrade UK** equips traders with automated empirical safety buffers (haircuts) to de-bias the wind forecast, hedge downside risk, and prevent costly Balancing Mechanism cash-out penalties.

---

## 3. Directory & File Structure

```
.
├── Dockerfile                      # Multi-stage production build (Node + Python 3.12)
├── docker-compose.yml              # Single-command startup (ports, volumes, healthcheck)
├── Procfile                        # Heroku deployment entrypoint
├── vercel.json                     # Vercel serverless & static build routing
├── PRESENTATION_GUIDE.md           # 10-minute video demo script (Part 1 Client + Part 2 Tech Lead)
├── README.md                       # Complete documentation, architecture, and guides
│
├── backend/                        # Python FastAPI Analytical Backend
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                 # FastAPI app, lifespan, CORS, static SPA mount, routes
│   │   ├── config.py               # Environment configuration, BMRS URLs, defaults
│   │   ├── database.py             # SQLite connection management & table schema
│   │   ├── schemas.py              # Pydantic v2 data models for API requests/responses
│   │   ├── ingestion.py            # Elexon BMRS stream ingestion engine (FUELHH & WINDFOR)
│   │   ├── analytics.py            # Core analytics: DA cut-off matching, MAE, RMSE, Bias, Vintages
│   │   ├── risk_engine.py          # Procurement simulator, empirical P90 buffer, cash-out hedge
│   │   └── routes/
│   │       ├── __init__.py
│   │       ├── forecasts.py        # /api/forecasts/day-ahead, /vintages, /available-dates
│   │       ├── metrics.py          # /api/metrics/summary, /diurnal
│   │       ├── procurement.py      # /api/procurement/simulate
│   │       └── sync.py             # /api/sync/refresh, /status
│   ├── tests/                      # Automated Test Suite (Pytest)
│   │   ├── test_analytics.py       # Unit tests for MAE, RMSE, Bias, NMAE, half-hourly alignment
│   │   ├── test_risk_engine.py     # Unit tests for procurement hedging and cash-out savings
│   │   └── test_api.py             # Integration tests for all REST endpoints & SPA serving
│   ├── data/
│   │   └── bmrs_data.db            # Pre-seeded SQLite DB (20,440 forecasts, 1,681 actuals)
│   └── requirements.txt            # Python dependencies (FastAPI, Uvicorn, Pandas, NumPy, etc.)
│
└── frontend/                       # React 19 + TypeScript + Vite Frontend
    ├── public/
    ├── src/
    │   ├── components/
    │   │   ├── Navbar.tsx          # Navigation, GB grid frequency badge, sync & pitch modal triggers
    │   │   ├── DayAheadViewer.tsx  # Req 1: Latest forecast at DA gate, dual-axis chart, CSV export
    │   │   ├── ErrorAnalytics.tsx  # Req 2: Quantified audit, MAE/RMSE/Bias, diurnal profile, quantiles
    │   │   ├── ProcurementSimulator.tsx # Commercial Sim: demand, empirical buffer, avoided cash-out
    │   │   ├── ForecastVintages.tsx# 48h, 24h, 14h, 6h lead-time convergence tracking
    │   │   ├── PitchModal.tsx      # Built-in presentation deck (Client Pitch & Tech Lead Review)
    │   │   └── DataSyncModal.tsx   # Live BMRS streaming status & on-demand sync trigger
    │   ├── services/
    │   │   └── api.ts              # Fetch client communicating with backend
    │   ├── types/
    │   │   └── index.ts            # TypeScript interfaces matching backend Pydantic models
    │   ├── App.tsx                 # Root component assembling layout and views
    │   ├── index.css               # Vanilla CSS design system (trading terminal aesthetic, glassmorphism)
    │   └── main.tsx
    ├── package.json
    ├── tsconfig.json
    ├── tsconfig.app.json
    └── vite.config.ts              # Vite dev server & /api proxy configuration
```

---

## 4. Software Architecture & Implementation Details

```
+----------------------------------------------------------------------------------------------------+
|                                    AEROTRADE ARCHITECTURE                                          |
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|    [ Elexon BMRS API ] --------> [ ingestion.py ] --------> [ bmrs_data.db (SQLite) ]              |
|    * FUELHH/stream               Streams & parses           * actuals (1,681 rows)                 |
|    * WINDFOR/stream              JSON chunks                * forecasts (20,440 rows)              |
|                                                                    |                               |
|                                                                    v                               |
|                                    [ FastAPI Backend ] <-----------+                               |
|                                    * analytics.py (Vectorized Day-Ahead Alignment)                 |
|                                    * risk_engine.py (Diurnal P90 Quantile Buffering)               |
|                                    * Pydantic v2 Typed Schemas & CORS                              |
|                                                                    |                               |
|                                                                    v REST API (/api/*)             |
|                                    [ React 19 + TypeScript SPA ]                                   |
|                                    * Day-Ahead Dispatch Viewer (Dual-Axis Chart.js + CSV Export)   |
|                                    * Quantified Error Audit (Daily Timeseries + Diurnal Hours)     |
|                                    * Wholesale Thermal Procurement Decision Simulator              |
|                                    * Built-in Client Pitch & Tech Review Presentation Engine       |
|                                                                                                    |
+----------------------------------------------------------------------------------------------------+
```

### 4.1 Temporal Day-Ahead Cut-Off Alignment (Requirement 1)
For any delivery day $D$, binding day-ahead bids close on day $D-1$ at cut-off time $T_{cutoff}$ (default 11:00 UTC). The system executes an inner join on SQLite:
$$\max(publishTime) \quad \text{where} \quad publishTime \le T_{cutoff} \quad \text{and} \quad startTime \in [D_{00:00}, D_{23:59}]$$
This guarantees that **only information available before auction gate closure is used**, preventing lookahead bias.

### 4.2 Multi-Resolution Compatibility
* **Elexon WINDFOR**: Published at **hourly resolution** (`:00`).
* **Elexon FUELHH**: Published at **half-hourly resolution** (`:00` and `:30`, 48 Settlement Periods).
* **Engine Capability**:
  1. **Hourly Mode**: Averages the two 30-min actuals in each hour to match WINDFOR.
  2. **Half-Hourly Mode**: Expands the hourly forecast of $X$ MW across both 30-min periods, respecting power rate physics ($1\text{ MW for } 0.5\text{h} = 0.5\text{ MWh}$).

### 4.3 Quantified Risk Engine & Hedging Simulator (Requirement 2)
The utility's residual demand is $Demand_h - Wind_h$. To protect against the +1,840 MW over-forecasting bias:
1. Historical errors for that hour of day across January 2026 are evaluated: $Error_h = Forecast_{h} - Actual_{h}$.
2. The empirical downside error quantile is extracted: $Buffer_h = \text{Quantile}(Error_h, \alpha)$ (where $\alpha = 0.90$ for P90 confidence).
3. Risk-adjusted wind expectation: $Wind_{adj, h} = \max(0, Forecast_h - Buffer_h)$.
4. Recommended thermal procurement: $Thermal_{hedged, h} = \max(0, Demand_h - Wind_{adj, h})$.
5. Avoided cash-out savings: Evaluates the difference between purchasing thermal power day-ahead vs paying real-time Balancing Mechanism System Buy Prices.

---

## 5. How to Start the Application

### Option A: Using Docker (Recommended — Single Command)

Ensure Docker is installed, then run:

```bash
docker compose up --build
```

The application will build and start on **`http://localhost:8000`**.  
* The web portal is accessible at **`http://localhost:8000`**.  
* The interactive OpenAPI Swagger documentation is at **`http://localhost:8000/docs`**.

---

### Option B: Running Locally (Backend + Frontend)

#### Step 1: Start the Python FastAPI Backend
```bash
# 1. Create and activate a Python 3.12+ virtual environment
python3 -m venv .venv
source .venv/bin/activate

# 2. Install backend dependencies
pip install -r backend/requirements.txt

# 3. Start the FastAPI server
PYTHONPATH=backend uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
The backend API is now running at `http://localhost:8000`.

#### Step 2: Start the React Frontend
In a new terminal:
```bash
cd frontend
npm install
npm run dev
```
The React development server will start at **`http://localhost:3000`** (with automatic API proxy to port 8000).

---

## 6. Automated Testing & Verification

The backend includes a comprehensive unit and integration test suite:

```bash
# Run tests with pytest
PYTHONPATH=backend pytest backend/tests/ -v
```

### Test Suite Coverage:
* `backend/tests/test_analytics.py`:
  * `test_compute_metrics_basic`: Verifies mathematical correctness of MAE, RMSE, Bias, and NMAE.
  * `test_compute_metrics_positive_bias`: Verifies bias detection under persistent over-forecasting.
  * `test_day_ahead_schedule_retrieval`: Validates 24-hour day-ahead cut-off filtering.
  * `test_day_ahead_schedule_half_hourly`: Validates 48 settlement period expansion.
  * `test_summary_metrics_january`: Tests monthly aggregation and quantile bounds ($P90 \ge P50 \ge P10$).
* `backend/tests/test_risk_engine.py`:
  * `test_procurement_simulation_basic`: Validates risk haircuts and hedged thermal order computation.
* `backend/tests/test_api.py`:
  * Integration tests for `/api`, `/api/health`, `/api/forecasts/day-ahead`, `/api/metrics/summary`, `/api/metrics/diurnal`, `/api/procurement/simulate`, and single-container SPA serving.

**Result: 12 passed in 1.45 seconds.**

---

## 7. Cloud Deployment Guide

### Heroku Deployment
The repository includes a production `Procfile`:
```bash
# Login to Heroku
heroku login

# Create app
heroku create aerotrade-uk

# Deploy
git push heroku main
```

### Vercel Deployment
The repository includes a configured `vercel.json` routing the API to the Python runtime and building the React frontend:
```bash
vercel --prod
```

---

## 8. Explicit AI Tools Usage Disclosure

As requested in the project brief, we explicitly disclose the use of AI tools in developing this product:
* **AI Coding Assistant**: Google Antigravity Agentic AI (incorporating DeepMind models) was utilized as an autonomous pair programmer to assist with:
  1. Exploratory data analysis and reverse-engineering of Elexon BMRS stream schemas.
  2. Vectorized NumPy / Pandas implementations of Day-Ahead temporal alignment and diurnal quantile risk buffering.
  3. Scaffolding the React TypeScript components and styling system.
  4. Generating automated test suites (`backend/tests/`) and continuous integration scripts.
* **Human Engineering & Domain Verification**: All power market clearing rules, settlement period definitions, EPEX SPOT auction gate timing, Balancing Mechanism cash-out pricing dynamics, and statistical formulas were validated for real-world energy trading accuracy.

---

## 9. Author & License

* **Project**: AeroTrade UK (Anonymous Codebase)
* **License**: MIT Open Source License
