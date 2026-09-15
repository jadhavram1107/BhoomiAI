import json
import os
import re
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Iterable, List

from .government_data import (
    fetch_data_gov_resource_records,
    get_official_source_catalog,
)
from .ml_engine import FIELD_TRAINING_DATA, KNOWN_DISTRICTS_EN, KNOWN_DISTRICTS_HI, KNOWN_DISTRICTS_MR, KNOWN_VILLAGES_HI, KNOWN_VILLAGES_MR


ARTIFACT_DIR = Path(__file__).resolve().parents[1] / "ml_artifacts"
MODEL_PATH = ARTIFACT_DIR / "land_record_model.json"

MAHARASHTRA_LGD_RESOURCE_ID = "lgd-code-mapping-implemented-across-mutation-ferar-712-and-8a-applications-maharashtra"

OFFICIAL_FIELD_PATTERNS = {
    "record_type": ["7/12", "7 12", "७/१२", "सातबारा", "satbara", "8A", "८अ", "ferfar", "फेरफार"],
    "registration": ["registration", "नोंदणी", "stamp duty", "document number", "sale deed", "index ii", "mutation"],
    "maps": ["bhu naksha", "भू नकाशा", "cadastral", "parcel", "gis", "village map"],
}


def _tokenize(value: str) -> List[str]:
    return re.findall(r"[\w\u0900-\u097F/.-]+", value.lower())


def _flatten_record_values(record: Dict[str, Any]) -> Iterable[str]:
    for value in record.values():
        if value is None:
            continue
        if isinstance(value, (dict, list)):
            yield json.dumps(value, ensure_ascii=False)
        else:
            yield str(value)


def _collect_names_from_records(records: List[Dict[str, Any]]) -> Dict[str, List[str]]:
    buckets: Dict[str, set[str]] = defaultdict(set)
    village_keys = ("village", "village_name", "villagename", "village_lgd_name")
    taluka_keys = ("taluka", "tehsil", "subdistrict", "sub_district", "subdistrict_name")
    district_keys = ("district", "district_name")

    for record in records:
        normalized = {str(k).strip().lower().replace(" ", "_"): v for k, v in record.items()}
        for key, value in normalized.items():
            if not value:
                continue
            clean_value = str(value).strip()
            if key in village_keys:
                buckets["villages"].add(clean_value)
            elif key in taluka_keys:
                buckets["talukas"].add(clean_value)
            elif key in district_keys:
                buckets["districts"].add(clean_value)

    return {key: sorted(values) for key, values in buckets.items()}


def _build_classifier(training_examples: Dict[str, List[str]], extra_text: Iterable[str]) -> Dict[str, Any]:
    label_token_counts: Dict[str, Counter[str]] = {}
    vocabulary = set()

    for label, examples in training_examples.items():
        counter: Counter[str] = Counter()
        for example in examples:
            counter.update(_tokenize(example))
        label_token_counts[label] = counter
        vocabulary.update(counter)

    source_counter: Counter[str] = Counter()
    for text in extra_text:
        source_counter.update(_tokenize(text))

    return {
        "type": "multinomial_keyword_classifier",
        "labels": sorted(training_examples.keys()),
        "vocabulary_size": len(vocabulary),
        "label_token_counts": {label: dict(counter) for label, counter in label_token_counts.items()},
        "source_vocabulary_top": dict(source_counter.most_common(150)),
    }


async def train_land_record_model(limit: int = 250) -> Dict[str, Any]:
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)

    source_catalog = get_official_source_catalog()
    source_records: List[Dict[str, Any]] = []
    fetch_warnings: List[str] = []

    lgd_response = await fetch_data_gov_resource_records(
        MAHARASHTRA_LGD_RESOURCE_ID,
        limit=limit,
    )
    if lgd_response.get("status") == "not_configured":
        fetch_warnings.append(lgd_response["message"])
    else:
        records = lgd_response.get("records") or []
        source_records.extend([record for record in records if isinstance(record, dict)])

    source_text = []
    for source in source_catalog:
        source_text.extend(str(value) for value in source.values() if value)
    for record in source_records:
        source_text.extend(_flatten_record_values(record))

    learned_locations = _collect_names_from_records(source_records)
    classifier = _build_classifier(
        {
            **FIELD_TRAINING_DATA,
            **OFFICIAL_FIELD_PATTERNS,
        },
        source_text,
    )

    artifact = {
        "model_name": "bhoomiai_land_record_field_model",
        "model_version": "2026.09.15",
        "trained_at": datetime.utcnow().isoformat() + "Z",
        "training_mode": "official_source_bootstrap",
        "data_sources": source_catalog,
        "fetch_warnings": fetch_warnings,
        "records_fetched": len(source_records),
        "field_patterns": FIELD_TRAINING_DATA,
        "official_patterns": OFFICIAL_FIELD_PATTERNS,
        "known_locations": {
            "villages": sorted(set(KNOWN_VILLAGES_MR + KNOWN_VILLAGES_HI + learned_locations.get("villages", []))),
            "talukas": learned_locations.get("talukas", []),
            "districts": sorted(set(KNOWN_DISTRICTS_MR + KNOWN_DISTRICTS_HI + KNOWN_DISTRICTS_EN + learned_locations.get("districts", []))),
        },
        "classifier": classifier,
        "usage_note": (
            "This artifact trains extraction and validation heuristics from official source metadata, "
            "open LGD-style records when DATA_GOV_API_KEY is configured, and curated 7/12/Khasra/RoR field labels. "
            "It does not bypass captcha/login/payment protected land-record portals."
        ),
    }

    MODEL_PATH.write_text(json.dumps(artifact, ensure_ascii=False, indent=2), encoding="utf-8")

    return {
        "status": "trained",
        "artifact_path": str(MODEL_PATH),
        "records_fetched": len(source_records),
        "source_count": len(source_catalog),
        "warnings": fetch_warnings,
        "trained_at": artifact["trained_at"],
    }


def get_training_status() -> Dict[str, Any]:
    if not MODEL_PATH.exists():
        return {
            "status": "not_trained",
            "artifact_path": str(MODEL_PATH),
            "message": "Run POST /api/government/training/run to build the land-record model artifact.",
        }

    try:
        artifact = json.loads(MODEL_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {
            "status": "invalid",
            "artifact_path": str(MODEL_PATH),
            "message": "The model artifact exists but is not valid JSON.",
        }

    return {
        "status": "ready",
        "artifact_path": str(MODEL_PATH),
        "model_name": artifact.get("model_name"),
        "model_version": artifact.get("model_version"),
        "trained_at": artifact.get("trained_at"),
        "records_fetched": artifact.get("records_fetched", 0),
        "source_count": len(artifact.get("data_sources", [])),
        "warnings": artifact.get("fetch_warnings", []),
    }


def load_model_artifact() -> Dict[str, Any]:
    if not MODEL_PATH.exists():
        return {}
    return json.loads(MODEL_PATH.read_text(encoding="utf-8"))
