import asyncio
import json
import os
import urllib.parse
import urllib.request
from typing import Any, Dict, List, Optional


DATA_GOV_BASE_URL = "https://api.data.gov.in/resource"
LGD_BASE_URL = "https://lgdirectory.gov.in/webservices/lgdws"

OFFICIAL_SOURCE_CATALOG = [
    {
        "id": "mahabhulekh_view_ror",
        "name": "Mahabhulekh 7/12, 8A and Property Card view service",
        "url": "https://bhulekh.mahabhumi.gov.in/",
        "record_types": ["7/12", "8A", "property_card", "k-prat"],
        "access": "public_view_with_captcha",
        "use_for": "Human-assisted lookup and schema/field-label reference.",
        "automation_policy": "Do not bypass captcha, mobile verification, login, payment, or terms. Use configured authorized APIs for server-side matching.",
    },
    {
        "id": "mahabhumi_integrated",
        "name": "Mahabhumi integrated land records portal",
        "url": "https://mahabhumi.gov.in/mahabhumilink",
        "record_types": ["digitally_signed_7/12", "8A", "ferfar", "property_card", "maps"],
        "access": "login_or_paid_for_signed_downloads",
        "use_for": "Official signed record acquisition by authorized users.",
        "automation_policy": "Require official user credentials/API permission before automated fetching.",
    },
    {
        "id": "mahabhumi_api_services",
        "name": "Mahabhumi API services",
        "url": "https://bhumiabhilekh.maharashtra.gov.in/Services",
        "record_types": ["api_service_catalog", "bhu_naksha", "document_verification"],
        "access": "department_or_partner_api_access",
        "use_for": "Production-grade record verification after endpoint approval.",
        "automation_policy": "Configure STATE_LAND_RECORD_API_URL, BHU_NAKSHA_API_URL, or REGISTRATION_DEPARTMENT_API_URL only for authorized endpoints.",
    },
    {
        "id": "data_gov_lgd_mapping_maharashtra",
        "name": "LGD code mapping across Mutation, 7/12 and 8A applications in Maharashtra",
        "url": "https://data.gov.in/resource/lgd-code-mapping-implemented-across-mutation-ferar-712-and-8a-applications-maharashtra",
        "resource_id": "lgd-code-mapping-implemented-across-mutation-ferar-712-and-8a-applications-maharashtra",
        "record_types": ["lgd_mapping", "village_codes", "administrative_codes"],
        "access": "open_data_api",
        "use_for": "Training and validating district/taluka/village code references.",
        "automation_policy": "Use DATA_GOV_API_KEY when available.",
    },
    {
        "id": "data_gov_registration_stats_maharashtra",
        "name": "Application wise document count, stamp duty and registration fees",
        "url": "https://data.gov.in/catalog/application-wise-document-count-stamp-duty-and-registration-fees",
        "record_types": ["registration_statistics"],
        "access": "open_data_catalog",
        "use_for": "Registration-domain vocabulary and analytics context, not deed-level ownership lookup.",
        "automation_policy": "Use only published aggregate data unless the registration department grants deed-level API access.",
    },
]


def _get_json(url: str, timeout: int = 10) -> Dict[str, Any]:
    request = urllib.request.Request(
        url,
        headers={"User-Agent": "BhoomiAI-LandRecordsApp/1.0"},
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


async def fetch_json(url: str, timeout: int = 10) -> Dict[str, Any]:
    return await asyncio.to_thread(_get_json, url, timeout)


def get_government_source_status() -> Dict[str, Any]:
    data_gov_key = os.getenv("DATA_GOV_API_KEY")
    data_gov_resource = os.getenv("DATA_GOV_LAND_RECORD_RESOURCE_ID")
    state_land_api = os.getenv("STATE_LAND_RECORD_API_URL")
    bhu_naksha_api = os.getenv("BHU_NAKSHA_API_URL")
    registration_api = os.getenv("REGISTRATION_DEPARTMENT_API_URL")

    return {
        "data_gov_in": {
            "configured": bool(data_gov_key and data_gov_resource),
            "requires": ["DATA_GOV_API_KEY", "DATA_GOV_LAND_RECORD_RESOURCE_ID"],
            "purpose": "Open Government Data dataset records, including API-enabled LGD or land-record datasets.",
        },
        "lgd": {
            "configured": True,
            "base_url": LGD_BASE_URL,
            "purpose": "Official location codes for states, districts, sub-districts, villages, and local bodies.",
        },
        "bhu_naksha": {
            "configured": bool(bhu_naksha_api),
            "requires": ["BHU_NAKSHA_API_URL"],
            "purpose": "State-specific cadastral map integration where an authorized endpoint is available.",
        },
        "state_land_records": {
            "configured": bool(state_land_api),
            "requires": ["STATE_LAND_RECORD_API_URL"],
            "purpose": "State land-record/ROR source of truth for record matching.",
        },
        "registration_department": {
            "configured": bool(registration_api),
            "requires": ["REGISTRATION_DEPARTMENT_API_URL"],
            "purpose": "State registration-system integration for sale deed/mutation cross-checks.",
        },
        "official_source_catalog": {
            "configured": True,
            "sources": OFFICIAL_SOURCE_CATALOG,
            "purpose": "Known official/public sources used by ingestion and model-training jobs.",
        },
    }


def get_official_source_catalog() -> List[Dict[str, Any]]:
    return OFFICIAL_SOURCE_CATALOG


async def fetch_lgd_states() -> Dict[str, Any]:
    return await fetch_json(f"{LGD_BASE_URL}/stateList")


async def fetch_lgd_districts(state_code: str) -> Dict[str, Any]:
    query = urllib.parse.urlencode({"stateCode": state_code})
    return await fetch_json(f"{LGD_BASE_URL}/districtList?{query}")


async def fetch_lgd_subdistricts(district_code: str) -> Dict[str, Any]:
    query = urllib.parse.urlencode({"districtCode": district_code})
    return await fetch_json(f"{LGD_BASE_URL}/subdistrictList?{query}")


async def fetch_data_gov_records(
    filters: Optional[Dict[str, str]] = None,
    limit: int = 10,
    offset: int = 0,
) -> Dict[str, Any]:
    api_key = os.getenv("DATA_GOV_API_KEY")
    resource_id = os.getenv("DATA_GOV_LAND_RECORD_RESOURCE_ID")
    if not api_key or not resource_id:
        return {
            "status": "not_configured",
            "message": "Set DATA_GOV_API_KEY and DATA_GOV_LAND_RECORD_RESOURCE_ID to query data.gov.in.",
            "records": [],
        }

    params = {
        "api-key": api_key,
        "format": "json",
        "limit": str(limit),
        "offset": str(offset),
    }
    for key, value in (filters or {}).items():
        if value:
            params[f"filters[{key}]"] = value

    query = urllib.parse.urlencode(params)
    return await fetch_json(f"{DATA_GOV_BASE_URL}/{resource_id}?{query}")


async def fetch_data_gov_resource_records(
    resource_id: str,
    filters: Optional[Dict[str, str]] = None,
    limit: int = 100,
    offset: int = 0,
) -> Dict[str, Any]:
    api_key = os.getenv("DATA_GOV_API_KEY")
    if not api_key:
        return {
            "status": "not_configured",
            "message": "Set DATA_GOV_API_KEY to query Open Government Data resources.",
            "records": [],
        }

    params = {
        "api-key": api_key,
        "format": "json",
        "limit": str(limit),
        "offset": str(offset),
    }
    for key, value in (filters or {}).items():
        if value:
            params[f"filters[{key}]"] = value

    query = urllib.parse.urlencode(params)
    return await fetch_json(f"{DATA_GOV_BASE_URL}/{resource_id}?{query}")


def _normalize(value: Any) -> str:
    return str(value or "").strip().lower()


def _record_value(record: Dict[str, Any], candidates: List[str]) -> str:
    normalized_map = {_normalize(key).replace(" ", "_"): value for key, value in record.items()}
    for candidate in candidates:
        key = _normalize(candidate).replace(" ", "_")
        if key in normalized_map:
            return _normalize(normalized_map[key])
    return ""


def score_record_match(fields: Dict[str, str], official_record: Dict[str, Any]) -> float:
    checks = [
        ("survey_number", ["survey_number", "survey_no", "khasra_number", "khasra_no", "gat_number"], 35),
        ("village", ["village", "village_name", "village_lgd_name"], 20),
        ("owner_name", ["owner_name", "land_owner", "khatedar_name", "pattadar_name"], 20),
        ("khata_number", ["khata_number", "khata_no", "account_number"], 15),
        ("district", ["district", "district_name"], 10),
    ]

    total_weight = 0
    matched_weight = 0
    for field_name, aliases, weight in checks:
        extracted = _normalize(fields.get(field_name))
        official = _record_value(official_record, aliases)
        if not extracted or not official:
            continue

        total_weight += weight
        if extracted == official:
            matched_weight += weight
        elif extracted in official or official in extracted:
            matched_weight += weight * 0.7

    if total_weight == 0:
        return 0.0
    return round((matched_weight / total_weight) * 100, 1)


async def validate_against_government_sources(fields: Dict[str, str]) -> List[Dict[str, Any]]:
    validations: List[Dict[str, Any]] = []

    try:
        data = await fetch_data_gov_records(limit=25)
    except Exception as exc:
        validations.append({
            "check_name": "Government Data API Unavailable",
            "severity": "warning",
            "message": f"Could not query configured data.gov.in resource: {exc}",
            "field_name": None,
        })
        return validations

    if data.get("status") == "not_configured":
        validations.append({
            "check_name": "Government Data Source Not Configured",
            "severity": "warning",
            "message": "Official government dataset matching is ready, but DATA_GOV_API_KEY and DATA_GOV_LAND_RECORD_RESOURCE_ID are not set.",
            "field_name": None,
        })
        return validations

    records = data.get("records") or []
    best_score = 0.0
    for record in records:
        if isinstance(record, dict):
            best_score = max(best_score, score_record_match(fields, record))

    if best_score >= 85:
        validations.append({
            "check_name": "Government Record Match",
            "severity": "passed",
            "message": f"Extracted fields match the configured government dataset with {best_score}% similarity.",
            "field_name": "survey_number",
            "similarity_score": best_score,
        })
    elif best_score > 0:
        validations.append({
            "check_name": "Government Record Mismatch",
            "severity": "critical",
            "message": f"Best official dataset match is only {best_score}%. Officer review is required.",
            "field_name": "survey_number",
            "similarity_score": best_score,
        })
    else:
        validations.append({
            "check_name": "Government Record Not Found",
            "severity": "warning",
            "message": "No comparable record was found in the configured government dataset response.",
            "field_name": "survey_number",
        })

    return validations
