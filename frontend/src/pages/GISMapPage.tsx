import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, Polyline, Popup, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import {
  Search,
  Layers,
  Edit3,
  Ruler,
  X,
  Filter,
  User,
  Grid,
  Map as MapIcon,
  Sparkles,
  Navigation,
  MapPin,
  Globe,
  Compass,
  CheckCircle2,
  Trash2,
  Calculator,
  Download,
  Copy,
  LocateFixed,
  AlertCircle,
  FileCheck2,
  ShieldCheck
} from 'lucide-react';
import { api } from '../services/api';
import { GISParcel, ValidatedLandDocument } from '../types';

// Fix Leaflet marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Red Pin for Geocoded / User drop pin locations
const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Custom Violet Pin for User Current GPS Location
const userGpsIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Helper component to center map dynamically
const ChangeView: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.5 });
  }, [center, zoom, map]);
  return null;
};

// Map click listener component
const MapClickHandler: React.FC<{
  isDrawing: boolean;
  onMapClick: (lat: number, lng: number) => void;
}> = ({ isDrawing, onMapClick }) => {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

// Calculate geodesic distance between two points in meters
function getDistanceMeters(p1: [number, number], p2: [number, number]): number {
  const R = 6371000;
  const dLat = ((p2[0] - p1[0]) * Math.PI) / 180;
  const dLng = ((p2[1] - p1[1]) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1[0] * Math.PI) / 180) *
      Math.cos((p2[0] * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Calculate approximate area of polygon in square meters
function getAreaSqMeters(coords: [number, number][]): number {
  if (coords.length < 3) return 0;
  let area = 0;
  const radius = 6371000;
  for (let i = 0; i < coords.length; i++) {
    const p1 = coords[i];
    const p2 = coords[(i + 1) % coords.length];
    const lat1 = (p1[0] * Math.PI) / 180;
    const lat2 = (p2[0] * Math.PI) / 180;
    const lng1 = (p1[1] * Math.PI) / 180;
    const lng2 = (p2[1] * Math.PI) / 180;
    area += (lng2 - lng1) * (2 + Math.sin(lat1) + Math.sin(lat2));
  }
  area = (area * radius * radius) / 2.0;
  return Math.abs(area);
}

export const GISMapPage: React.FC = () => {
  const [parcels, setParcels] = useState<GISParcel[]>([]);
  const [validatedDocuments, setValidatedDocuments] = useState<ValidatedLandDocument[]>([]);
  const [selectedValidatedDocument, setSelectedValidatedDocument] = useState<ValidatedLandDocument | null>(null);
  const [searchQuery, setSearchQuery] = useState('Vaijapur');
  const [activeTab, setActiveTab] = useState<'address' | 'filters' | 'id'>('address');
  const [isModalOpen, setIsModalOpen] = useState(true);
  const [activeTool, setActiveTool] = useState<'locate' | 'layers' | 'draw' | 'measure'>('locate');
  const [mapTile, setMapTile] = useState<'satellite' | 'street' | 'topo' | 'dark'>('satellite');
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [selectedParcel, setSelectedParcel] = useState<GISParcel | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([19.9248, 74.7268]);
  const [mapZoom, setMapZoom] = useState(14);
  const [loading, setLoading] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Real Geocoding results
  const [geocodeResults, setGeocodeResults] = useState<any[]>([]);
  const [selectedGeocode, setSelectedGeocode] = useState<{
    lat: number;
    lng: number;
    name: string;
    display_name: string;
  } | null>(null);

  // User clicked pin location & reverse geocode address
  const [clickedPin, setClickedPin] = useState<{
    lat: number;
    lng: number;
    address?: string;
    loadingAddr?: boolean;
  } | null>(null);

  // User GPS location
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; address?: string } | null>(null);

  // Drawing canvas vertices
  const [drawPoints, setDrawPoints] = useState<[number, number][]>([]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  useEffect(() => {
    fetchParcels();
    fetchValidatedDocuments();
    autoDetectGeolocation();
  }, []);

  const autoDetectGeolocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setUserLocation({ lat, lng });

          try {
            const rev = await api.reverseGeocodeLocation(lat, lng);
            if (rev?.address_details?.display_name) {
              setUserLocation({ lat, lng, address: rev.address_details.display_name });
            }
          } catch {
            // ignore
          }
        },
        () => {
          // Geolocation permission denied or unavailable - fallback cleanly without alert dialog
          fallbackIpLocation();
        },
        { timeout: 5000 }
      );
    } else {
      fallbackIpLocation();
    }
  };

  const fallbackIpLocation = async () => {
    try {
      const res = await fetch('https://ipapi.co/json/').then((r) => r.json());
      if (res && res.latitude && res.longitude) {
        setUserLocation({
          lat: res.latitude,
          lng: res.longitude,
          address: `${res.city || ''}, ${res.region || ''}, ${res.country_name || ''} (IP Geolocation)`
        });
      }
    } catch {
      // ignore
    }
  };

  const fetchParcels = async (query?: string) => {
    setLoading(true);
    try {
      const res = await api.getGISParcels(query);
      setParcels(res.parcels);
      if (res.parcels.length > 0) {
        setSelectedParcel(res.parcels[0]);
        setMapCenter([res.parcels[0].center_lat, res.parcels[0].center_lng]);
      }
    } catch {
      console.error('Failed to fetch GIS parcels');
    } finally {
      setLoading(false);
    }
  };

  const fetchValidatedDocuments = async () => {
    try {
      const res = await api.getValidatedLandDocuments();
      setValidatedDocuments(res.documents);

      if (res.documents.length > 0) {
        locateFromValidatedDocument(res.documents[0], false);
      }
    } catch {
      console.error('Failed to fetch validated land documents');
    }
  };

  const locateFromValidatedDocument = (doc: ValidatedLandDocument, notify = true) => {
    setSelectedValidatedDocument(doc);
    setSelectedParcel(doc.parcel);
    setSelectedGeocode(null);
    setClickedPin(null);
    setParcels((current) => {
      const exists = current.some((parcel) => parcel.id === doc.parcel.id);
      return exists ? current : [doc.parcel, ...current];
    });
    setMapCenter([doc.parcel.center_lat, doc.parcel.center_lng]);
    setMapZoom(17);

    if (notify) {
      showToast(`Located Survey ${doc.survey_number} from a 100% validated digitized document.`);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    setGeocoding(true);
    setGeocodeResults([]);

    try {
      await fetchParcels(searchQuery);
      setSelectedValidatedDocument(null);

      const geoRes = await api.geocodeLocation(searchQuery);
      if (geoRes.status === 'success' && geoRes.results.length > 0) {
        setGeocodeResults(geoRes.results);
        const topResult = geoRes.results[0];
        const lat = parseFloat(topResult.lat);
        const lng = parseFloat(topResult.lon);

        setSelectedGeocode({
          lat,
          lng,
          name: topResult.name || searchQuery,
          display_name: topResult.display_name
        });
        setMapCenter([lat, lng]);
        setMapZoom(14);
      }
    } catch (err) {
      console.error('Geocoding error:', err);
    } finally {
      setLoading(false);
      setGeocoding(false);
    }
  };

  const handleSelectGeocode = (item: any) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    setSelectedValidatedDocument(null);
    setSelectedGeocode({
      lat,
      lng,
      name: item.name || searchQuery,
      display_name: item.display_name
    });
    setMapCenter([lat, lng]);
    setMapZoom(15);
  };

  const selectParcel = (p: GISParcel) => {
    setSelectedParcel(p);
    setSelectedValidatedDocument(null);
    setSelectedGeocode(null);
    setMapCenter([p.center_lat, p.center_lng]);
    setMapZoom(16);
  };

  const handleLocateMe = () => {
    if (userLocation) {
      setMapCenter([userLocation.lat, userLocation.lng]);
      setMapZoom(16);
      showToast(`Panned map to location (${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}).`);
      return;
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setUserLocation({ lat, lng });
          setMapCenter([lat, lng]);
          setMapZoom(16);
          showToast(`Located GPS position: ${lat.toFixed(4)}, ${lng.toFixed(4)}.`);

          try {
            const rev = await api.reverseGeocodeLocation(lat, lng);
            if (rev?.address_details?.display_name) {
              setUserLocation({ lat, lng, address: rev.address_details.display_name });
            }
          } catch {
            // ignore
          }
        },
        () => {
          showToast('GPS access blocked by browser. Using region map view.');
          fallbackIpLocation();
        },
        { timeout: 5000 }
      );
    } else {
      showToast('Browser geolocation unsupported.');
    }
  };

  const handleMapClick = async (lat: number, lng: number) => {
    if (activeTool === 'draw' || activeTool === 'measure') {
      setDrawPoints((prev) => [...prev, [lat, lng]]);
    } else {
      setClickedPin({ lat, lng, loadingAddr: true });
      try {
        const rev = await api.reverseGeocodeLocation(lat, lng);
        setClickedPin({
          lat,
          lng,
          address: rev?.address_details?.display_name || `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
          loadingAddr: false
        });
      } catch {
        setClickedPin({
          lat,
          lng,
          address: `Coordinates: ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
          loadingAddr: false
        });
      }
    }
  };

  const handleExportGeoJSON = () => {
    const geojsonData = {
      type: 'FeatureCollection',
      features: [
        ...(selectedParcel
          ? [
              {
                type: 'Feature',
                properties: {
                  survey_number: selectedParcel.survey_number,
                  owner: selectedParcel.owner_name,
                  village: selectedParcel.village,
                  area: `${selectedParcel.area} ${selectedParcel.area_unit}`
                },
                geometry: {
                  type: 'Polygon',
                  coordinates: [
                    [
                      ...selectedParcel.polygon_coordinates.map((c) => [c[1], c[0]]),
                      [selectedParcel.polygon_coordinates[0][1], selectedParcel.polygon_coordinates[0][0]]
                    ]
                  ]
                }
              }
            ]
          : []),
        ...(drawPoints.length >= 3
          ? [
              {
                type: 'Feature',
                properties: { name: 'Custom Drawn Boundary', points_count: drawPoints.length },
                geometry: {
                  type: 'Polygon',
                  coordinates: [
                    [...drawPoints.map((c) => [c[1], c[0]]), [drawPoints[0][1], drawPoints[0][0]]]
                  ]
                }
              }
            ]
          : [])
      ]
    };

    const blob = new Blob([JSON.stringify(geojsonData, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `land_parcel_boundary_${new Date().toISOString().split('T')[0]}.geojson`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported GeoJSON file successfully.');
  };

  const totalPerimeterMeters = drawPoints.reduce((acc, pt, idx) => {
    if (idx === 0) return 0;
    return acc + getDistanceMeters(drawPoints[idx - 1], pt);
  }, 0);

  const areaSqMeters = getAreaSqMeters(drawPoints);
  const areaHectares = (areaSqMeters / 10000).toFixed(3);
  const areaAcres = (areaSqMeters / 4046.86).toFixed(3);

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] overflow-hidden bg-slate-900 select-none">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute bottom-6 right-6 z-40 bg-slate-900/95 text-white font-bold text-xs px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 backdrop-blur-md">
          <LocateFixed className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Geolocation Live Badge */}
      <div className="absolute top-3 right-4 z-20 bg-slate-900/90 backdrop-blur-md text-emerald-400 border border-emerald-500/40 text-[11px] font-semibold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
        <LocateFixed className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
        <span>Certified Document-to-GIS Location</span>
      </div>

      {selectedValidatedDocument && (
        <div className="absolute top-14 right-4 z-20 w-80 bg-white/95 backdrop-blur-md border border-emerald-200 shadow-xl rounded-2xl p-4 text-slate-800">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <div>
                <p className="text-xs font-black text-emerald-700 uppercase tracking-wide">100% Verified Source</p>
                <p className="text-sm font-black text-slate-900">Survey {selectedValidatedDocument.survey_number}</p>
              </div>
            </div>
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-black text-emerald-800">
              {selectedValidatedDocument.location_certainty}%
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-semibold">
            <p><span className="text-slate-500">Owner</span><br />{selectedValidatedDocument.owner_name}</p>
            <p><span className="text-slate-500">Khata</span><br />{selectedValidatedDocument.khata_number}</p>
            <p><span className="text-slate-500">Village</span><br />{selectedValidatedDocument.village}</p>
            <p><span className="text-slate-500">Area</span><br />{selectedValidatedDocument.area} {selectedValidatedDocument.area_unit}</p>
          </div>
        </div>
      )}

      {/* Main Leaflet Satellite / Street Map */}
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        className="w-full h-full"
        zoomControl={false}
      >
        <ChangeView center={mapCenter} zoom={mapZoom} />
        <MapClickHandler isDrawing={activeTool === 'draw' || activeTool === 'measure'} onMapClick={handleMapClick} />

        {/* Real Tile Layers */}
        {mapTile === 'satellite' && (
          <TileLayer
            attribution="&copy; Esri World Imagery (Satellite)"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        )}
        {mapTile === 'street' && (
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        )}
        {mapTile === 'topo' && (
          <TileLayer
            attribution="&copy; Esri World Topo Map"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}"
          />
        )}
        {mapTile === 'dark' && (
          <TileLayer
            attribution="&copy; CartoDB Dark Matter"
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
        )}

        {/* Render Cadastral Parcel Polygons */}
        {parcels.map((p) => {
          const isSelected = selectedParcel?.id === p.id;
          return (
            <React.Fragment key={p.id}>
              <Polygon
                positions={p.polygon_coordinates}
                pathOptions={{
                  color: isSelected ? '#38bdf8' : '#f97316',
                  weight: isSelected ? 3.5 : 2.5,
                  fillColor: isSelected ? '#0284c7' : '#ea580c',
                  fillOpacity: isSelected ? 0.45 : 0.25,
                }}
                eventHandlers={{
                  click: () => selectParcel(p),
                }}
              >
                <Popup className="custom-gis-popup">
                  <div className="p-1 space-y-1.5 text-slate-800 text-xs font-medium">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-1 gap-2">
                      <span className="font-bold text-sky-800">Survey No: {p.survey_number}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.verification_status === 'Verified'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {p.verification_status}
                      </span>
                    </div>
                    <p><strong className="text-slate-600">Owner:</strong> {p.owner_name}</p>
                    <p><strong className="text-slate-600">Village:</strong> {p.village}</p>
                    <p><strong className="text-slate-600">Taluka / District:</strong> {p.taluka}, {p.district}</p>
                    <p><strong className="text-slate-600">Area:</strong> {p.area} {p.area_unit}</p>
                    <p><strong className="text-slate-600">GPS Coordinates:</strong> {p.center_lat}, {p.center_lng}</p>
                  </div>
                </Popup>
              </Polygon>

              <Marker position={[p.center_lat, p.center_lng]}>
                <Popup>
                  <div className="text-xs font-semibold">{p.survey_number} - {p.owner_name}</div>
                </Popup>
              </Marker>
            </React.Fragment>
          );
        })}

        {/* User Drawn Polygon */}
        {drawPoints.length > 0 && (
          <>
            {drawPoints.length >= 3 ? (
              <Polygon
                positions={drawPoints}
                pathOptions={{ color: '#ec4899', weight: 3, fillColor: '#f43f5e', fillOpacity: 0.35 }}
              />
            ) : (
              <Polyline positions={drawPoints} pathOptions={{ color: '#ec4899', weight: 3, dashArray: '5, 10' }} />
            )}

            {drawPoints.map((pt, idx) => (
              <Marker key={idx} position={pt}>
                <Popup>
                  <div className="text-xs font-bold text-slate-800">
                    Vertex #{idx + 1}: [{pt[0].toFixed(5)}, {pt[1].toFixed(5)}]
                  </div>
                </Popup>
              </Marker>
            ))}
          </>
        )}

        {/* Geocoded Place Marker */}
        {selectedGeocode && (
          <Marker position={[selectedGeocode.lat, selectedGeocode.lng]} icon={redIcon}>
            <Popup>
              <div className="p-1 space-y-1 text-xs">
                <div className="font-bold text-rose-700 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> Geocoded Place
                </div>
                <p className="font-semibold text-slate-800">{selectedGeocode.display_name}</p>
                <p className="text-[10px] text-slate-500 font-mono">Lat: {selectedGeocode.lat.toFixed(5)}, Lng: {selectedGeocode.lng.toFixed(5)}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* User Current GPS Location Marker */}
        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={userGpsIcon}>
            <Popup>
              <div className="p-1 text-xs space-y-1">
                <div className="font-bold text-purple-700 flex items-center gap-1">
                  <Navigation className="w-3.5 h-3.5" /> Geolocation Position
                </div>
                {userLocation.address && (
                  <p className="text-[11px] font-medium text-slate-800">{userLocation.address}</p>
                )}
                <p className="text-[10px] text-slate-500 font-mono">Lat: {userLocation.lat.toFixed(5)}, Lng: {userLocation.lng.toFixed(5)}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Clicked Reverse Geocoded Pin */}
        {clickedPin && activeTool === 'locate' && (
          <Marker position={[clickedPin.lat, clickedPin.lng]}>
            <Popup>
              <div className="p-1 space-y-1 text-xs max-w-xs">
                <div className="font-bold text-sky-700 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> Reverse Geocoded Location
                </div>
                {clickedPin.loadingAddr ? (
                  <p className="text-[11px] text-slate-400 italic">Fetching reverse geocoded address...</p>
                ) : (
                  <p className="font-medium text-slate-800 text-[11px] leading-snug">{clickedPin.address}</p>
                )}
                <p className="font-mono text-[10px] text-slate-500 pt-1">
                  Lat: {clickedPin.lat.toFixed(6)}, Lng: {clickedPin.lng.toFixed(6)}
                </p>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Floating Toolbar */}
      <div className="absolute top-6 left-6 z-20 flex flex-col gap-2">
        <button
          onClick={() => {
            setActiveTool('locate');
            setIsModalOpen(!isModalOpen);
          }}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md backdrop-blur-md ${
            activeTool === 'locate' && isModalOpen
              ? 'bg-sky-100 text-sky-900 border border-sky-300 ring-2 ring-sky-400/30'
              : 'bg-white/95 hover:bg-white text-slate-700 border border-slate-200'
          }`}
        >
          <FileCheck2 className="w-4 h-4 text-sky-600" />
          <span>Validated Documents</span>
        </button>

        {/* Map Layers Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowLayerMenu(!showLayerMenu)}
            className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-white/95 hover:bg-white text-slate-700 border border-slate-200 shadow-md backdrop-blur-md transition-all"
          >
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-600" />
              <span className="capitalize">Map Layer ({mapTile})</span>
            </div>
          </button>

          {showLayerMenu && (
            <div className="absolute top-12 left-0 w-48 bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl shadow-xl p-1.5 space-y-1 z-30 animate-in fade-in zoom-in-95">
              {[
                { key: 'satellite', label: 'Esri Satellite', icon: Globe },
                { key: 'street', label: 'OpenStreetMap', icon: MapIcon },
                { key: 'topo', label: 'Esri Topo', icon: Compass },
                { key: 'dark', label: 'CartoDB Dark', icon: Grid },
              ].map((layer) => (
                <button
                  key={layer.key}
                  onClick={() => {
                    setMapTile(layer.key as any);
                    setShowLayerMenu(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg font-medium transition-all ${
                    mapTile === layer.key
                      ? 'bg-sky-50 text-sky-700 font-bold'
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <layer.icon className="w-3.5 h-3.5" />
                    <span>{layer.label}</span>
                  </div>
                  {mapTile === layer.key && <CheckCircle2 className="w-3.5 h-3.5 text-sky-600" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* GPS Locate Me Button */}
        <button
          onClick={handleLocateMe}
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-white/95 hover:bg-white text-slate-700 border border-slate-200 shadow-md backdrop-blur-md transition-all group"
          title="Zoom to Geolocation Position"
        >
          <Navigation className="w-4 h-4 text-purple-600 group-hover:rotate-45 transition-transform" />
          <span>My Geolocation</span>
        </button>

        {/* Export GeoJSON Button */}
        <button
          onClick={handleExportGeoJSON}
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-white/95 hover:bg-white text-slate-700 border border-slate-200 shadow-md backdrop-blur-md transition-all"
          title="Export GeoJSON boundary coordinates"
        >
          <Download className="w-4 h-4 text-emerald-600" />
          <span>Export GeoJSON</span>
        </button>
      </div>

      {/* Drawing Measurement Floating Card */}
      {activeTool === 'draw' && (
        <div className="absolute bottom-6 left-6 z-30 w-80 bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-slate-200 space-y-3 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
              <Calculator className="w-4 h-4 text-pink-600" /> Land Boundary Measurement
            </h4>
            <button
              onClick={() => setDrawPoints([])}
              className="text-slate-400 hover:text-rose-600 p-1"
              title="Clear drawings"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1.5 text-xs text-slate-700">
            <p><strong className="text-slate-900">Vertices Placed:</strong> {drawPoints.length} points</p>
            <p><strong className="text-slate-900">Perimeter Distance:</strong> {(totalPerimeterMeters / 1000).toFixed(2)} km ({totalPerimeterMeters.toFixed(1)} m)</p>
            <p><strong className="text-slate-900">Calculated Area:</strong> <span className="font-black text-pink-600">{areaHectares} Hectares</span> ({areaAcres} Acres)</p>
          </div>

          <button
            onClick={() => {
              setActiveTool('locate');
              setDrawPoints([]);
            }}
            className="w-full py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
          >
            Done Measuring
          </button>
        </div>
      )}

      {/* Floating Search & Geocode Modal */}
      {isModalOpen && (
        <div className="absolute top-6 left-48 z-30 w-96 bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden transition-all animate-in fade-in zoom-in-95 duration-200">
          {/* Modal Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <FileCheck2 className="w-4 h-4 text-emerald-600" />
              <span>Locate From Validated Document</span>
            </div>
            <button
              onClick={() => setIsModalOpen(false)}
              className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form Content */}
          <div className="p-5 space-y-4 max-h-[calc(100vh-14rem)] overflow-y-auto">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <label className="block text-xs font-bold text-slate-700">
                  100% validated & digitized land documents
                </label>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800">
                  {validatedDocuments.length} ready
                </span>
              </div>

              {validatedDocuments.length > 0 ? (
                <div className="space-y-2">
                  {validatedDocuments.map((doc) => {
                    const isActive = selectedValidatedDocument?.document_id === doc.document_id;
                    return (
                      <button
                        key={doc.document_id}
                        type="button"
                        onClick={() => locateFromValidatedDocument(doc)}
                        className={`w-full text-left rounded-xl border p-3 transition-all ${
                          isActive
                            ? 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-300/40'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-black text-slate-900">
                              Survey {doc.survey_number} - {doc.village}
                            </p>
                            <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-600">
                              {doc.owner_name} | Khata {doc.khata_number}
                            </p>
                          </div>
                          <span className="shrink-0 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-black text-white">
                            100%
                          </span>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-2 text-[10px] font-bold text-slate-500">
                          <span>{doc.digitization_status}</span>
                          <span>{doc.validation_status}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>No land document is ready for GIS location yet. Approve a digitized document after validation to enable 100% sure map location.</span>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 pt-4">
            <form onSubmit={handleSearch} className="space-y-3">
              <label className="block text-xs font-bold text-slate-700">
                Fallback Search (Address, City, Village, District)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="e.g., Vaijapur, Ahilyanagar, Pune, Mumbai..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-sky-500 outline-none text-slate-800 pr-8"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-600 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
              >
                <Search className="w-3.5 h-3.5" />
                {loading || geocoding ? 'Geocoding...' : 'Search Location API'}
              </button>
            </form>
            </div>

            {/* Geocoded Results */}
            {geocodeResults.length > 0 && (
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5" /> Real Geocoded Places ({geocodeResults.length})
                </p>
                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                  {geocodeResults.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSelectGeocode(item)}
                      className={`p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                        selectedGeocode?.display_name === item.display_name
                          ? 'bg-rose-50 border-rose-300 text-rose-900 font-semibold'
                          : 'bg-emerald-50/40 hover:bg-emerald-50 border-emerald-200 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <span className="font-bold text-slate-900 truncate">{item.display_name}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
                        Lat: {parseFloat(item.lat).toFixed(4)}, Lon: {parseFloat(item.lon).toFixed(4)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
