from fastapi import APIRouter, Query

router = APIRouter()

SAMPLE_GIS_PARCELS = [
    {
        "id": "PARCEL-125-2",
        "survey_number": "125/2",
        "khasra_number": "125/2",
        "village": "वैजापूर (Vaijapur)",
        "taluka": "वैजापूर",
        "district": "अहिल्यानगर (Ahilyanagar)",
        "state": "Maharashtra",
        "owner_name": "रामेश्वर जाधव",
        "cnic_id": "MH-4530-9812",
        "khata_number": "453",
        "area": 2.45,
        "area_unit": "hectare",
        "land_type": "Jirayat (Dry Land)",
        "land_use": "Agricultural",
        "verification_status": "Verified",
        "center_lat": 19.9248,
        "center_lng": 74.7268,
        "polygon_coordinates": [
            [19.9240, 74.7255],
            [19.9260, 74.7260],
            [19.9255, 74.7280],
            [19.9238, 74.7275]
        ]
    },
    {
        "id": "PARCEL-412-1",
        "survey_number": "412/1",
        "khasra_number": "412/1",
        "village": "महू (Mhow)",
        "taluka": "महू",
        "district": "इंदौर (Indore)",
        "state": "Madhya Pradesh",
        "owner_name": "विक्रम सिंह चौहान",
        "cnic_id": "MP-8091-4412",
        "khata_number": "809",
        "area": 1.80,
        "area_unit": "hectare",
        "land_type": "Irrigated (Chahi)",
        "land_use": "Agricultural",
        "verification_status": "Verified",
        "center_lat": 22.5532,
        "center_lng": 75.7602,
        "polygon_coordinates": [
            [22.5525, 75.7590],
            [22.5540, 75.7595],
            [22.5538, 75.7615],
            [22.5520, 75.7610]
        ]
    },
    {
        "id": "PARCEL-88-3B",
        "survey_number": "88/3B",
        "khasra_number": "88/3B",
        "village": "Mulshi",
        "taluka": "Mulshi",
        "district": "Pune",
        "state": "Maharashtra",
        "owner_name": "Suresh Dattatraya Patil",
        "cnic_id": "MH-1204-7788",
        "khata_number": "1204",
        "area": 3.12,
        "area_unit": "hectare",
        "land_type": "Non-Agricultural (NA)",
        "land_use": "Commercial/Residential",
        "verification_status": "Verified",
        "center_lat": 18.5020,
        "center_lng": 73.5135,
        "polygon_coordinates": [
            [18.5010, 73.5120],
            [18.5030, 73.5125],
            [18.5028, 73.5150],
            [18.5008, 73.5145]
        ]
    },
    {
        "id": "PARCEL-204-1A",
        "survey_number": "204/1A",
        "khasra_number": "204/1A",
        "village": "इगतपुरी (Igatpuri)",
        "taluka": "इगतपुरी",
        "district": "नाशिक (Nashik)",
        "state": "Maharashtra",
        "owner_name": "ज्ञानेश्वर एकनाथ शिंदे",
        "cnic_id": "MH-3301-2041",
        "khata_number": "3301",
        "area": 0.95,
        "area_unit": "hectare",
        "land_type": "Varkas",
        "land_use": "Hilly / Grazing",
        "verification_status": "Needs Review",
        "center_lat": 19.6950,
        "center_lng": 73.5600,
        "polygon_coordinates": [
            [19.6940, 73.5585],
            [19.6960, 73.5590],
            [19.6958, 73.5615],
            [19.6938, 73.5610]
        ]
    }
]

@router.get("/parcels")
async def get_gis_parcels(search: str = Query(None)):
    if not search:
        return {"disclaimer": "Prototype / Sample GIS Data", "parcels": SAMPLE_GIS_PARCELS}
        
    s = search.lower().strip()
    filtered = []
    for p in SAMPLE_GIS_PARCELS:
        if (s in p["survey_number"].lower() or 
            s in p["village"].lower() or 
            s in p["district"].lower() or 
            s in p["owner_name"].lower() or 
            s in p["id"].lower() or
            s in p["cnic_id"].lower()):
            filtered.append(p)
            
    return {"disclaimer": "Prototype / Sample GIS Data", "parcels": filtered}

@router.get("/geocode")
async def geocode_location(q: str = Query(...)):
    """Geocode address or location using real OpenStreetMap Nominatim API"""
    import urllib.request
    import urllib.parse
    import json
    
    encoded_q = urllib.parse.quote(q)
    url = f"https://nominatim.openstreetmap.org/search?format=json&q={encoded_q}&limit=5"
    headers = {"User-Agent": "BhoomiAI-LandRecordsApp/1.0"}
    
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode())
            return {"status": "success", "results": data}
    except Exception as e:
        return {"status": "error", "message": str(e), "results": []}

@router.get("/reverse-geocode")
async def reverse_geocode_location(lat: float = Query(...), lng: float = Query(...)):
    """Reverse geocode Lat/Lng into real street address using Nominatim API"""
    import urllib.request
    import json
    
    url = f"https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lng}"
    headers = {"User-Agent": "BhoomiAI-LandRecordsApp/1.0"}
    
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode())
            return {"status": "success", "address_details": data}
    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "address_details": {
                "display_name": f"Coordinates ({lat:.4f}, {lng:.4f})",
                "address": {"village": "Vaijapur", "state": "Maharashtra", "country": "India"}
            }
        }


