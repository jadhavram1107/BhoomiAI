# BhoomiAI

BhoomiAI is a full-stack prototype for intelligent land-record digitization and validation. It is aimed at government land-record workflows where scanned documents need to be uploaded, processed with OCR-style extraction, validated, reviewed by officials, and linked to parcel/GIS views.

## What It Does

- Uploads land-record documents such as 7/12 extracts, Khasra/Khatauni, and ROR-style records.
- Extracts structured fields including owner name, survey number, khata number, village, taluka, district, area, land type, and mutation number.
- Scores extraction confidence and flags low-confidence fields.
- Runs validation checks for missing fields, suspicious area values, and possible duplicate records.
- Routes risky records to a human verification queue.
- Lets officers correct extracted fields and approve or reject records.
- Shows sample GIS parcel data with search, map coordinates, and polygon boundaries.
- Provides dashboard metrics, analytics, and an audit trail.
- Supports demo official-account registration and role-based users.

## Tech Stack

- Frontend: React, Vite, TypeScript, React Router, Recharts, Leaflet
- Backend: FastAPI, SQLAlchemy async models, JWT authentication
- Database: PostgreSQL via `POSTGRES_URL`, with local SQLite fallback at `backend/demo.db`
- Demo data: built-in sample land-record and parcel data for Maharashtra, Madhya Pradesh, and Pune-area workflows

## Project Layout

```text
fullstack_app/
  backend/
    app/
      auth/          JWT helpers and auth dependencies
      db/            database engine/session setup
      models/        SQLAlchemy models
      routers/       FastAPI API routes
      services/      OCR/extraction and validation helpers
    uploads/         uploaded demo documents
    requirements.txt
  frontend/
    src/
      components/    shared app shell UI
      context/       authentication context
      pages/         dashboard, upload, records, map, analytics, settings
      services/      API client
      types/         shared TypeScript types
```

## Demo Login

The backend creates demo users on startup:

```text
Admin
Bhoomi ID: BHOOMI-ADMIN-0001
Email: admin@bhoomiai.demo
Password: admin123

Officer
Bhoomi ID: BHOOMI-OFFICER-0002
Email: officer@bhoomiai.demo
Password: officer123
```

## Run Locally

Backend:

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Frontend:

```powershell
cd frontend
npm install
npm run dev
```

The frontend uses `/api` routes, so run it with a dev proxy or serve it behind the backend/API gateway configuration used by your environment.

## Government Data API Setup

BhoomiAI can check extracted records against official/public government data sources when credentials or endpoints are configured.

Create a backend `.env` file when you have authorized access:

```text
DATA_GOV_API_KEY=your_data_gov_in_api_key
DATA_GOV_LAND_RECORD_RESOURCE_ID=your_api_enabled_resource_id
STATE_LAND_RECORD_API_URL=https://authorized-state-land-record-api.example
BHU_NAKSHA_API_URL=https://authorized-bhu-naksha-state-api.example
REGISTRATION_DEPARTMENT_API_URL=https://authorized-registration-api.example
```

Supported integration behavior:

- `data.gov.in`: queries an API-enabled resource through `https://api.data.gov.in/resource/{resource_id}`.
- LGD: uses public Local Government Directory lookup services for administrative-location codes.
- Bhu-Naksha, state land-record portals, state GIS/cadastral data, and registration systems: use configurable URLs because access and schemas differ by state/department.
- Maharashtra 7/12/RoR portals: BhoomiAI keeps an official source catalog for Mahabhulekh, Mahabhumi signed-record services, Mahabhumi API services, and open data resources. Captcha, OTP, login, and paid signed-record flows are intentionally not bypassed; use authorized API URLs or human-assisted lookup for those services.

Useful endpoints:

```text
GET  /api/government/sources
GET  /api/government/sources/catalog
GET  /api/government/training/status
POST /api/government/training/run?limit=250
```

`POST /api/government/training/run` builds `backend/app/ml_artifacts/land_record_model.json` from curated 7/12/Khasra/RoR field patterns, official source metadata, and open data.gov.in records when `DATA_GOV_API_KEY` is configured. If the key is missing, the artifact is still produced with local official-pattern training data and a warning.

## OCR and Model Training

The default demo records still work without native OCR tooling. For real scanned uploads, install Tesseract OCR on the host and then install backend requirements:

```powershell
cd backend
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

The processing route first attempts the real OCR/field extraction pipeline for non-demo uploads. If OCR dependencies or native language packs are unavailable, it falls back to the demo extraction data rather than failing the workflow.

Never commit real API keys or production credentials. Keep them in `.env`.

## Main Workflow

1. Log in as an admin or officer.
2. Upload a land-record document.
3. Process the document to generate extracted fields and validation results.
4. Review low-confidence or critical validation issues in the verification queue.
5. Correct fields where needed.
6. Approve or reject the record.
7. Inspect parcel context in the GIS map, analytics, and audit trail.

## Notes

This is currently a prototype/demo implementation. The active document processing route uses built-in demo records when filenames match sample patterns, while `backend/app/services/ml_engine.py` contains a richer OCR/regex extraction pipeline for real OCR experiments.
