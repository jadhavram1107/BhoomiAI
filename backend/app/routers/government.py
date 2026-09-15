from typing import Dict, Optional

from fastapi import APIRouter, Query

from ..services.government_data import (
    fetch_data_gov_records,
    fetch_lgd_districts,
    fetch_lgd_states,
    fetch_lgd_subdistricts,
    get_official_source_catalog,
    get_government_source_status,
)
from ..services.model_training import get_training_status, train_land_record_model

router = APIRouter()


@router.get("/sources")
async def get_sources():
    return get_government_source_status()


@router.get("/sources/catalog")
async def get_source_catalog():
    return {
        "sources": get_official_source_catalog(),
        "policy": "Use public/open data and authorized APIs only. Captcha, login, OTP, and paid signed-record flows require human or officially granted API access.",
    }


@router.get("/training/status")
async def get_model_training_status():
    return get_training_status()


@router.post("/training/run")
async def run_model_training(limit: int = Query(250, ge=1, le=1000)):
    return await train_land_record_model(limit=limit)


@router.get("/lgd/states")
async def get_lgd_states():
    return await fetch_lgd_states()


@router.get("/lgd/districts")
async def get_lgd_districts(state_code: str = Query(...)):
    return await fetch_lgd_districts(state_code)


@router.get("/lgd/subdistricts")
async def get_lgd_subdistricts(district_code: str = Query(...)):
    return await fetch_lgd_subdistricts(district_code)


@router.get("/data-gov/records")
async def get_data_gov_records(
    survey_number: Optional[str] = Query(None),
    village: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    filters: Dict[str, str] = {}
    if survey_number:
        filters["survey_number"] = survey_number
    if village:
        filters["village"] = village
    if district:
        filters["district"] = district
    return await fetch_data_gov_records(filters=filters, limit=limit, offset=offset)
