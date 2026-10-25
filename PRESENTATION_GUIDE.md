# AeroTrade UK: Video Demo Presentation Guide & Script
**Duration**: Max 10 Minutes Total (Part 1: 5 Mins | Part 2: 5 Mins)  
**Format**: Unlisted YouTube Video Demo  
**Audience**: Part 1 (Client Energy Utility Trading Desk) | Part 2 (Internal Technical Lead)

---

## Video Recording Guide
> Use this guide as your spoken script while sharing your screen and navigating through the live web application tabs (**Day-Ahead Dispatch**, **Quantified Error Audit**, **Procurement & Hedge Sim**, and **Forecast Vintages**)!

---

## PART 1: Client Pitch & Product Overview (0:00 – 5:00)
**Role**: Product Developer presenting the pilot results to the UK Energy Utility Day-Ahead Power Trading Desk.  
**Goal**: Impress them with actionable commercial insights, financial risk reduction, and an intuitive trading tool.

### Segment 1: The Commercial Challenge & Executive Context (0:00 – 0:50)
* **Screen**: Landing on AeroTrade UK (`/`), showing the "Day-Ahead Dispatch" tab.
* **Spoken Script**:
  > *"Hello everyone. Today, I am excited to present the results of our pilot project for your wholesale power trading desk: **AeroTrade UK**.
  >
  > As a UK energy utility, your team faces a critical daily challenge: at 11:00 AM UTC every day, you must submit binding purchase bids to the wholesale day-ahead market—such as EPEX SPOT UK—to procure electricity for tomorrow's delivery.
  >
  > Your net procurement need—the residual thermal power you must buy beyond renewables—is weather-dependent and driven heavily by national wind generation. If you over-estimate wind generation, you under-procure thermal power, leaving your portfolio short in real-time. In the UK Balancing Mechanism, being short exposes you to punishing System Buy Prices (cash-out penalties) that can spike above £300 to £1,000 per MWh during winter peak demand.
  >
  > We built AeroTrade UK to address this exact pain point: giving you complete visibility into the latest available wind forecasts at decision gate closure, and quantitatively evaluating forecast error to de-risk your thermal procurement decisions."*

---

### Segment 2: Live Demo — Day-Ahead Dispatch Dashboard [Requirement 1] (0:50 – 2:10)
* **Screen**: Focus on the controls, KPI stat cards, and interactive chart in `Day-Ahead Dispatch`.
* **Actions**:
  1. Select **January 16, 2026** in the date dropdown.
  2. Toggle the **DA Decision Gate** buttons (show 07:00, 09:00, and highlight **11:00 UTC**).
  3. Toggle between **Hourly** and **Half-Hourly (48 Settlement Periods)** resolution.
  4. Hover over the chart lines (Cyan: Forecast, Green: Actual, Amber/Purple: Error Delta).
* **Spoken Script**:
  > *"Here on the **Day-Ahead Dispatch** screen, we solve your first requirement: understanding the exact forecast available when you must lock in your day-ahead orders.
  >
  > By default, the system filters all National Grid ESO wind forecasts published on or before 11:00 UTC on day D-1—the exact EPEX SPOT gate closure. For any delivery day in January 2026—for instance, January 16th—you see the latest prediction for all 24 hours or 48 half-hourly settlement periods.
  >
  > Notice the dual-axis chart: the cyan curve is the day-ahead forecast you had on your desk at gate closure; the green dashed curve is the actual outturn generation from Elexon FUELHH.
  >
  > The KPI cards instantly summarize your exposure: on this day, the Mean Absolute Error was 858 MW, with an average over-forecast bias of +396 MW. You can also view this at half-hourly resolution to match your 48 settlement period balancing positions, or export the schedule directly to CSV for your trade capture system."*

---

### Segment 3: The January 2026 Audit — The +1,840 MW Over-Forecasting Shock [Requirement 2] (2:10 – 3:30)
* **Screen**: Switch to the **Quantified Error Audit** tab (`/error-analytics`).
* **Actions**:
  1. Point out the amber alert banner summarizing the January 2026 audit.
  2. Walk through the 4 KPI cards (Aggregate MAE: 2,123 MW, Aggregate RMSE: 2,287 MW, Bias: +1,840 MW, NMAE: 20.3%).
  3. Show the **Diurnal Error Profile** chart (highlight hours 16:00 – 19:00 UTC).
  4. Highlight the **Quantile Risk Table** (P10, P50, P90).
* **Spoken Script**:
  > *"Now, let's look at the second core requirement: quantitatively evaluating forecast accuracy so you can trade with confidence.
  >
  > When we audited all 31 delivery days of January 2026, we discovered a striking structural pattern: **National Grid ESO wind forecasts suffered from a persistent positive bias of +1,840 MW**. In fact, wind was over-forecasted in **78.2% of all hours** across the entire month!
  >
  > If a trader naively purchased thermal power by simply subtracting the raw wind forecast from consumer demand, they would have been caught short almost 4 out of every 5 hours.
  >
  > Look at our **Diurnal Error Profile** below. The forecast error isn't uniform: it spikes precisely between 16:00 and 19:00 UTC—the evening peak ramp—where the P90 downside risk reaches +3,850 MW. This is the worst possible time to be short, because UK wholesale prices and balancing cash-out penalties peak during these exact hours."*

---

### Segment 4: Commercial Impact — Procurement & Hedging Simulator (3:30 – 4:45)
* **Screen**: Switch to the **Procurement & Hedge Sim** tab (`/procurement-sim`).
* **Actions**:
  1. Change baseline consumer demand to **32,000 MW**.
  2. Toggle confidence level between **P50**, **P80**, and **P90**.
  3. Point out the **Purple Area** (Recommended Hedged Thermal Buy) vs **Blue Line** (Naive Buy).
  4. Highlight the **Avoided Cash-Out Penalties (£ GBP)** KPI card.
* **Spoken Script**:
  > *"Rather than leaving you with raw statistics, we built a decision engine to turn this quantified error into profitable trading decisions: our **Wholesale Procurement & Hedge Simulator**.
  >
  > Here, you input your customer demand—say, 32 GW—and your risk tolerance, such as P90.
  >
  > Our model automatically applies an empirical safety buffer—a risk haircut—to the wind forecast based on the historical error distribution for that specific hour of the day.
  >
  > The purple curve shows your recommended Day-Ahead thermal procurement order. By procuring an additional safety margin in the day-ahead auction at £85/MWh instead of being caught short and paying the cash-out penalty of £153/MWh in real-time, the desk saves over **£400,000 to £800,000 in avoided imbalance penalties on high-risk days**!
  >
  > Over the course of January 2026, this strategy generated millions in portfolio protection."*

---

### Segment 5: Client Pitch Wrap-Up (4:45 – 5:00)
* **Spoken Script**:
  > *"To summarize: AeroTrade UK transforms raw BMRS weather data into clear, actionable Day-Ahead market orders with quantified risk protection. It protects your trading desk against systematic over-forecasting and saves substantial cash-out penalties. Thank you."*

---

## PART 2: Technical Lead Architecture & Code Review (5:00 – 10:00)
**Role**: Software Engineer walking through the technical design, data engineering, math, and code quality.  
**Goal**: Make technical review seamless, demonstrate architectural depth, and provide thorough knowledge transfer.

### Segment 6: System Architecture & Data Engineering (5:00 – 6:15)
* **Screen**: Open IDE / code editor showing project structure (`backend/app/`, `frontend/src/`).
* **Spoken Script**:
  > *"Hi everyone. In Part 2, I will walk through the architecture, software design, mathematical models, and development practices behind AeroTrade UK.
  >
  > We adopted a modern, decoupled full-stack architecture adhering to FAANG-grade engineering standards:
  > - **Backend**: Python 3.12+ using FastAPI, Pydantic v2, Pandas, and NumPy for vectorized time-series analytics.
  > - **Frontend**: React 19 with TypeScript and Vite, styled with a high-performance Vanilla CSS design system tailored for trading desks.
  > - **Data Persistence**: A high-speed SQLite database indexed on `startTime` and `publishTime`, holding the complete January 2026 dataset (20,440 forecasts and 1,681 actuals).
  >
  > Let's look at the data ingestion pipeline in `backend/app/ingestion.py`. We stream directly from Elexon BMRS REST stream endpoints:
  > - `FUELHH/stream` for half-hourly outturn generation, filtered strictly for `fuelType == 'WIND'`.
  > - `WINDFOR/stream` for National Grid ESO wind forecasts, capturing `publishTime`, `startTime`, and `generation` in MW."*

---

### Segment 7: Day-Ahead Alignment Logic & Resolution Handling (6:15 – 7:30)
* **Screen**: Open `backend/app/analytics.py` and highlight `get_day_ahead_schedule` and `compute_metrics`.
* **Spoken Script**:
  > *"The core business logic resides in `backend/app/analytics.py`.
  >
  > A key domain challenge is temporal alignment: for a target delivery day $D$, the day-ahead auction clears on $D-1$ at 11:00:00 UTC. In SQL and Pandas, we construct an inner join query that selects:
  > `WHERE publishTime <= cutoff AND startTime >= deliv_start AND startTime <= deliv_end`, grouping by `startTime` to take the latest published vintage.
  >
  > Another critical domain nuance is resolution:
  > - Elexon `WINDFOR` forecasts are published at hourly resolution (:00).
  > - Elexon `FUELHH` actuals are recorded at 30-minute half-hourly resolution (Settlement Periods 1 through 48).
  >
  > Our engine supports both:
  > 1. In **Hourly mode**, actuals are aggregated to hourly mean MW to match WINDFOR.
  > 2. In **Half-Hourly mode**, each hourly forecast of $X$ MW is mapped to both 30-minute settlement periods ($T$ and $T+30$), respecting the power rate physics where 1 MW of power maintained for 30 minutes equals 0.5 MWh of energy."*

---

### Segment 8: Mathematical Engine & Statistical Quantiles (7:30 – 8:30)
* **Screen**: Show formulas in `backend/app/analytics.py` and `backend/app/risk_engine.py`.
* **Spoken Script**:
  > *"For quantitative error evaluation, we compute:
  > 1. **MAE**: $\frac{1}{N} \sum |Forecast - Actual|$
  > 2. **RMSE**: $\sqrt{\frac{1}{N} \sum (Forecast - Actual)^2}$, heavily penalizing sudden forecast drops.
  > 3. **Forecast Bias (Mean Error)**: $\frac{1}{N} \sum (Forecast - Actual)$, which immediately reveals the +1,840 MW systematic over-prediction.
  > 4. **Normalized MAE (NMAE %)**: Relative to mean actual generation.
  >
  > In `risk_engine.py`, we implement empirical quantile risk buffering:
  > We group January 2026 errors by UTC hour-of-day (0 to 23). When a trader selects confidence level P90, we extract the 90th percentile downside wind error for that hour:
  > $$Buffer_h = \text{Quantile}(Error_h, 0.90)$$
  > $$Wind_{adjusted, h} = \max(0, Forecast_h - Buffer_h)$$
  > $$Thermal_{hedged, h} = \max(0, Demand_h - Wind_{adjusted, h})$$
  >
  > When actual outturn $A_h$ occurs, we evaluate the cash-out penalty differential under the Balancing Mechanism to quantify the net financial savings."*

---

### Segment 9: Code Quality, Testing, Docker & Deployment (8:30 – 9:45)
* **Screen**: Terminal running `pytest` (show all 12 tests passing), Dockerfile, and browser.
* **Spoken Script**:
  > *"Let's examine code quality and engineering practices:
  > - **Type Safety**: Pydantic v2 data models in `schemas.py` enforce strict runtime payload validation, paired with TypeScript interfaces in `frontend/src/types/index.ts`.
  > - **Automated Testing**: We have a comprehensive pytest suite in `backend/tests/` covering statistical edge cases, cutoff filtering, and API endpoints. Running pytest: all 12 unit and integration tests pass in under 1.5 seconds.
  > - **Docker Support**: We built a multi-stage `Dockerfile`. Stage 1 compiles the React frontend with Node; Stage 2 packages the lightweight Python 3.12 slim runner with the pre-seeded SQLite database. Running `docker compose up` starts the entire production system on port 8000 with a single command.
  > - **Cloud Deployment**: The application is configured with `Procfile` for Heroku and `vercel.json` for Vercel, allowing flexible zero-dependency hosting."*

---

### Segment 10: Technical Summary & Knowledge Transfer (9:45 – 10:00)
* **Spoken Script**:
  > *"To conclude: the codebase is clean, modular, fully tested, and containerized. The repo includes comprehensive documentation, architecture diagrams, and run instructions. I am ready to answer any questions. Thank you!"*
