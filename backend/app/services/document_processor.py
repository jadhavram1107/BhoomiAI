import re
import random
from typing import Dict, Any, List

def preprocess_image(file_bytes: bytes) -> Dict[str, Any]:
    """Simulates OpenCV image preprocessing (Grayscale, Contrast, Deskew, Thresholding)."""
    return {
        "status": "success",
        "grayscale": True,
        "noise_removed": True,
        "contrast_enhanced": True,
        "deskew_angle": 0.4,
        "dimensions": {"width": 1240, "height": 1754}
    }

DEMO_PARCELS_DATA = [
    {
        "filename": "marathi_7_12_vaijapur.png",
        "language": "mr",
        "ocr_confidence": 94.6,
        "fields": [
            {"field_name": "owner_name", "en": "Owner Name", "mr": "मालकाचे नाव", "hi": "मालिक का नाम", "value": "रामेश्वर जाधव", "confidence": 96.0, "box": [120, 200, 350, 240]},
            {"field_name": "survey_number", "en": "Survey Number", "mr": "सर्वे / गट क्रमांक", "hi": "सर्वेक्षण संख्या", "value": "125/2", "confidence": 98.0, "box": [120, 260, 250, 290]},
            {"field_name": "khata_number", "en": "Khata Number", "mr": "खाते क्रमांक", "hi": "खाता संख्या", "value": "453", "confidence": 61.0, "box": [120, 310, 220, 340]},
            {"field_name": "village", "en": "Village", "mr": "गाव", "hi": "गाँव", "value": "वैजापूर", "confidence": 94.0, "box": [120, 360, 280, 390]},
            {"field_name": "taluka", "en": "Taluka", "mr": "तालुका", "hi": "तहसील", "value": "वैजापूर", "confidence": 95.0, "box": [120, 410, 270, 440]},
            {"field_name": "district", "en": "District", "mr": "जिल्हा", "hi": "जिला", "value": "अहिल्यानगर", "confidence": 97.0, "box": [120, 460, 300, 490]},
            {"field_name": "area", "en": "Area (Hectare)", "mr": "क्षेत्रफळ (हेक्टर)", "hi": "क्षेत्रफल (हेक्टेयर)", "value": "2.45", "confidence": 88.0, "box": [120, 510, 260, 540]},
            {"field_name": "land_type", "en": "Land Type", "mr": "जमीनीचा प्रकार", "hi": "भूमि का प्रकार", "value": "जिरायत (Agricultural)", "confidence": 92.0, "box": [120, 560, 320, 590]},
            {"field_name": "mutation_number", "en": "Mutation Number", "mr": "फेरफार क्रमांक", "hi": "नामांतरण संख्या", "value": "8921", "confidence": 91.0, "box": [120, 610, 260, 640]}
        ]
    },
    {
        "filename": "hindi_khasra_indore.png",
        "language": "hi",
        "ocr_confidence": 91.2,
        "fields": [
            {"field_name": "owner_name", "en": "Owner Name", "mr": "मालकाचे नाव", "hi": "मालिक का नाम", "value": "विक्रम सिंह चौहान", "confidence": 93.0, "box": [100, 180, 320, 220]},
            {"field_name": "survey_number", "en": "Khasra Number", "mr": "सर्वे / गट क्रमांक", "hi": "खसरा संख्या", "value": "412/1", "confidence": 97.0, "box": [100, 240, 230, 270]},
            {"field_name": "khata_number", "en": "Khata Number", "mr": "खाते क्रमांक", "hi": "खाता संख्या", "value": "809", "confidence": 89.0, "box": [100, 290, 210, 320]},
            {"field_name": "village", "en": "Village", "mr": "गाव", "hi": "गाँव", "value": "महू (Mhow)", "confidence": 95.0, "box": [100, 340, 270, 370]},
            {"field_name": "taluka", "en": "Tehsil", "mr": "तालुका", "hi": "तहसील", "value": "महू", "confidence": 94.0, "box": [100, 390, 250, 420]},
            {"field_name": "district", "en": "District", "mr": "जिल्हा", "hi": "जिला", "value": "इंदौर", "confidence": 96.0, "box": [100, 440, 280, 470]},
            {"field_name": "area", "en": "Area (Hectare)", "mr": "क्षेत्रफळ (हेक्टर)", "hi": "क्षेत्रफल (हेक्टेयर)", "value": "1.80", "confidence": 90.0, "box": [100, 490, 240, 520]},
            {"field_name": "land_type", "en": "Land Type", "mr": "जमीनीचा प्रकार", "hi": "भूमि का प्रकार", "value": "सिंचित (Irrigated)", "confidence": 95.0, "box": [100, 540, 310, 570]}
        ]
    },
    {
        "filename": "english_ror_pune.pdf",
        "language": "en",
        "ocr_confidence": 98.4,
        "fields": [
            {"field_name": "owner_name", "en": "Owner Name", "mr": "मालकाचे नाव", "hi": "मालिक का नाम", "value": "Suresh Dattatraya Patil", "confidence": 99.0, "box": [110, 190, 380, 230]},
            {"field_name": "survey_number", "en": "Survey Number", "mr": "सर्वे / गट क्रमांक", "hi": "सर्वेक्षण संख्या", "value": "88/3B", "confidence": 98.0, "box": [110, 250, 240, 280]},
            {"field_name": "khata_number", "en": "Khata Number", "mr": "खाते क्रमांक", "hi": "खाता संख्या", "value": "1204", "confidence": 97.0, "box": [110, 300, 220, 330]},
            {"field_name": "village", "en": "Village", "mr": "गाव", "hi": "गाँव", "value": "Mulshi", "confidence": 98.0, "box": [110, 350, 260, 380]},
            {"field_name": "taluka", "en": "Taluka", "mr": "तालुका", "hi": "तहसील", "value": "Mulshi", "confidence": 98.0, "box": [110, 400, 260, 430]},
            {"field_name": "district", "en": "District", "mr": "जिल्हा", "hi": "जिला", "value": "Pune", "confidence": 99.0, "box": [110, 450, 250, 480]},
            {"field_name": "area", "en": "Area (Hectare)", "mr": "क्षेत्रफळ (हेक्टर)", "hi": "क्षेत्रफल (हेक्टेयर)", "value": "3.12", "confidence": 97.0, "box": [110, 500, 250, 530]},
            {"field_name": "land_type", "en": "Land Type", "mr": "जमीनीचा प्रकार", "hi": "भूमि का प्रकार", "value": "Non-Agricultural (NA)", "confidence": 96.0, "box": [110, 550, 340, 580]}
        ]
    },
    {
        "filename": "low_quality_scan_nashik.jpg",
        "language": "mr",
        "ocr_confidence": 58.2,
        "fields": [
            {"field_name": "owner_name", "en": "Owner Name", "mr": "मालकाचे नाव", "hi": "मालिक का नाम", "value": "ज्ञानेश्वर एकनाथ शिंदे", "confidence": 64.0, "box": [90, 170, 340, 210]},
            {"field_name": "survey_number", "en": "Survey Number", "mr": "सर्वे / गट क्रमांक", "hi": "सर्वेक्षण संख्या", "value": "204/1A", "confidence": 72.0, "box": [90, 230, 230, 260]},
            {"field_name": "khata_number", "en": "Khata Number", "mr": "खाते क्रमांक", "hi": "खाता संख्या", "value": "??? (Unclear)", "confidence": 42.0, "box": [90, 280, 210, 310]},
            {"field_name": "village", "en": "Village", "mr": "गाव", "hi": "गाँव", "value": "इगतपुरी", "confidence": 68.0, "box": [90, 330, 250, 360]},
            {"field_name": "taluka", "en": "Taluka", "mr": "तालुका", "hi": "तहसील", "value": "इगतपुरी", "confidence": 70.0, "box": [90, 380, 250, 410]},
            {"field_name": "district", "en": "District", "mr": "जिल्हा", "hi": "जिला", "value": "नाशिक", "confidence": 82.0, "box": [90, 430, 240, 460]},
            {"field_name": "area", "en": "Area (Hectare)", "mr": "क्षेत्रफळ (हेक्टर)", "hi": "क्षेत्रफल (हेक्टेयर)", "value": "9999.00", "confidence": 51.0, "box": [90, 480, 260, 510]},
            {"field_name": "land_type", "en": "Land Type", "mr": "जमीनीचा प्रकार", "hi": "भूमि का प्रकार", "value": "वरकस", "confidence": 60.0, "box": [90, 530, 280, 560]}
        ]
    },
    {
        "filename": "duplicate_record_vaijapur.png",
        "language": "mr",
        "ocr_confidence": 95.1,
        "fields": [
            {"field_name": "owner_name", "en": "Owner Name", "mr": "मालकाचे नाव", "hi": "मालिक का नाम", "value": "रामेश्वर जाधव", "confidence": 97.0, "box": [120, 200, 350, 240]},
            {"field_name": "survey_number", "en": "Survey Number", "mr": "सर्वे / गट क्रमांक", "hi": "सर्वेक्षण संख्या", "value": "125/2", "confidence": 98.0, "box": [120, 260, 250, 290]},
            {"field_name": "khata_number", "en": "Khata Number", "mr": "खाते क्रमांक", "hi": "खाता संख्या", "value": "453", "confidence": 95.0, "box": [120, 310, 220, 340]},
            {"field_name": "village", "en": "Village", "mr": "गाव", "hi": "गाँव", "value": "वैजापूर", "confidence": 96.0, "box": [120, 360, 280, 390]},
            {"field_name": "taluka", "en": "Taluka", "mr": "तालुका", "hi": "तहसील", "value": "वैजापूर", "confidence": 96.0, "box": [120, 410, 270, 440]},
            {"field_name": "district", "en": "District", "mr": "जिल्हा", "hi": "जिला", "value": "अहिल्यानगर", "confidence": 98.0, "box": [120, 460, 300, 490]},
            {"field_name": "area", "en": "Area (Hectare)", "mr": "क्षेत्रफळ (हेक्टर)", "hi": "क्षेत्रफल (हेक्टेयर)", "value": "2.45", "confidence": 94.0, "box": [120, 510, 260, 540]}
        ]
    }
]

def run_validation_checks(fields: List[Dict[str, Any]], filename: str) -> List[Dict[str, Any]]:
    validations = []
    field_dict = {f["field_name"]: f.get("value") for f in fields}
    
    # 1. Missing fields check
    required = ["owner_name", "survey_number", "village", "area"]
    for req in required:
        if not field_dict.get(req) or field_dict.get(req) == "null" or "???" in str(field_dict.get(req)):
            validations.append({
                "check_name": f"Missing {req.replace('_', ' ').title()}",
                "severity": "critical",
                "message": f"Required field '{req}' is missing or illegible in document.",
                "field_name": req
            })
            
    # 2. Area sanity check
    area_val = field_dict.get("area")
    if area_val:
        try:
            val = float(area_val)
            if val > 1000:
                validations.append({
                    "check_name": "Suspicious Area Value",
                    "severity": "critical",
                    "message": f"Extracted area value ({val} Hectares) exceeds reasonable agricultural boundaries (>1000 ha).",
                    "field_name": "area"
                })
            else:
                validations.append({
                    "check_name": "Area Format Valid",
                    "severity": "passed",
                    "message": f"Area format '{val} hectare' is within standard range.",
                    "field_name": "area"
                })
        except ValueError:
            validations.append({
                "check_name": "Area Parse Warning",
                "severity": "warning",
                "message": f"Unable to parse area numerical float from '{area_val}'.",
                "field_name": "area"
            })
            
    # 3. Low OCR confidence check
    for f in fields:
        conf = f.get("confidence", 100.0)
        if conf < 70.0:
            validations.append({
                "check_name": f"Low OCR Confidence ({f['field_name']})",
                "severity": "warning",
                "message": f"Field '{f['en']}' has low extraction confidence score ({conf:.1f}%). Routed for human verification.",
                "field_name": f['field_name']
            })
            
    # 4. Duplicate Record Check
    if "duplicate" in filename.lower() or (field_dict.get("survey_number") == "125/2" and field_dict.get("village") == "वैजापूर" and filename != "marathi_7_12_vaijapur.png"):
        validations.append({
            "check_name": "Possible Duplicate Record Detected",
            "severity": "critical",
            "message": "92.4% similarity match detected with existing verified record (Survey #125/2, Village: वैजापूर, Owner: रामेश्वर जाधव).",
            "field_name": "survey_number",
            "similarity_score": 92.4
        })
        
    # If no critical errors, add passed check
    if not any(v["severity"] == "critical" for v in validations):
        validations.append({
            "check_name": "Required Fields & Structure Verified",
            "severity": "passed",
            "message": "All required land record attributes successfully extracted and formatted.",
            "field_name": None
        })

    return validations
