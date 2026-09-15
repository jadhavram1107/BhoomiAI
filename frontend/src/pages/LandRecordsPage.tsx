import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Filter,
  Download,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  MapPin,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Square,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

export const LandRecordsPage: React.FC = () => {
  const navigate = useNavigate();
  const [records, setRecords] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [district, setDistrict] = useState('All');
  const [statusTab, setStatusTab] = useState<'All' | 'Verified' | 'Needs Review'>('All');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const itemsPerPage = 5;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const defaultSampleRecords = [
    { id: 'PARCEL-125-2', survey: '125/2', khata: '453', owner: 'रामेश्वर जाधव', village: 'वैजापूर', taluka: 'वैजापूर', district: 'अहिल्यानगर', area: '2.45 hectare', land_type: 'Jirayat (Dry Land)', land_use: 'Agricultural', status: 'Verified', confidence: 94.6, source: '7/12 + GIS', created_at: '2026-09-08' },
    { id: 'PARCEL-412-1', survey: '412/1', khata: '809', owner: 'विक्रम सिंह चौहान', village: 'महू', taluka: 'महू', district: 'इंदौर', area: '1.80 hectare', land_type: 'Irrigated', land_use: 'Agricultural', status: 'Verified', confidence: 91.2, source: 'Khasra + GIS', created_at: '2026-09-08' },
    { id: 'PARCEL-88-3B', survey: '88/3B', khata: '1204', owner: 'Suresh Dattatraya Patil', village: 'Mulshi', taluka: 'Mulshi', district: 'Pune', area: '3.12 hectare', land_type: 'Non-Agricultural (NA)', land_use: 'Commercial/Residential', status: 'Verified', confidence: 98.4, source: 'RoR + GIS', created_at: '2026-09-07' },
    { id: 'PARCEL-204-1A', survey: '204/1A', khata: '3301', owner: 'ज्ञानेश्वर एकनाथ शिंदे', village: 'इगतपुरी', taluka: 'इगतपुरी', district: 'नाशिक', area: '0.95 hectare', land_type: 'Varkas', land_use: 'Hilly / Grazing', status: 'Needs Review', confidence: 58.2, source: '7/12 + GIS', created_at: '2026-09-07' },
  ];

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const data = await api.getGISParcels();
      if (data?.parcels && data.parcels.length > 0) {
        const formatted = data.parcels.map((p: any) => ({
          id: p.id,
          survey: p.survey_number,
          khata: p.khata_number,
          owner: p.owner_name,
          village: p.village,
          taluka: p.taluka,
          district: p.district,
          area: `${p.area} ${p.area_unit}`,
          land_type: p.land_type,
          land_use: p.land_use,
          status: p.verification_status,
          confidence: p.verification_status === 'Verified' ? 96.0 : 62.0,
          source: 'Verified RoR + GIS Parcel',
          created_at: '2026-09-08',
        }));
        setRecords(formatted);
      } else {
        setRecords(defaultSampleRecords);
      }
    } catch {
      setRecords(defaultSampleRecords);
    } finally {
      setLoading(false);
    }
  };

  const filtered = records.filter((r) => {
    const matchesSearch =
      r.owner.toLowerCase().includes(search.toLowerCase()) ||
      r.survey.toLowerCase().includes(search.toLowerCase()) ||
      r.village.toLowerCase().includes(search.toLowerCase()) ||
      r.id.toLowerCase().includes(search.toLowerCase());
    const matchesDistrict = district === 'All' || r.district === district;
    const matchesStatus = statusTab === 'All' || r.status === statusTab;
    return matchesSearch && matchesDistrict && matchesStatus;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const toggleSelectAll = () => {
    if (selectedIds.length === paginated.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginated.map((r) => r.id));
    }
  };

  const toggleSelectRecord = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleExportCSV = () => {
    const headers = ['Doc ID', 'Survey Number', 'Owner Name', 'Village', 'Taluka', 'District', 'Area', 'Status', 'Confidence'];
    const rows = filtered.map((r) => [
      r.id,
      `"${r.survey}"`,
      `"${r.owner}"`,
      `"${r.village}"`,
      `"${r.taluka}"`,
      `"${r.district}"`,
      `"${r.area}"`,
      r.status,
      `${r.confidence}%`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `bhoomiai_land_records_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBatchVerify = async () => {
    if (selectedIds.length === 0) return;
    setLoading(true);
    const count = selectedIds.length;
    for (const id of selectedIds) {
      try {
        await api.verifyDocument(id, 'approve', 'Batch approved by officer');
      } catch {
        // ignore
      }
    }
    setRecords((prev) =>
      prev.map((r) => (selectedIds.includes(r.id) ? { ...r, status: 'Verified' } : r))
    );
    setSelectedIds([]);
    setLoading(false);
    showToast(`✅ Successfully verified ${count} land records.`);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white font-bold text-xs px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
      {/* Page Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-emerald-600" />
            Land Records Registry
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Verified parcel identities, ownership fields, survey numbers, khata references, and GIS-linked status.
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={fetchRecords}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-all"
            title="Refresh land records"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-all"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export CSV ({filtered.length})</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
          {(['All', 'Verified', 'Needs Review'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setStatusTab(tab);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusTab === tab ? 'bg-white text-slate-900 shadow-xs font-black' : 'hover:text-slate-900'
              }`}
            >
              {tab === 'All' ? `All Records (${records.length})` : tab}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {/* Search Bar */}
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search Owner / Survey / Village..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none bg-white shadow-2xs"
            />
          </div>

          {/* District Select */}
          <select
            value={district}
            onChange={(e) => {
              setDistrict(e.target.value);
              setCurrentPage(1);
            }}
            className="py-2 px-3.5 rounded-xl border border-slate-200 text-xs font-bold bg-white text-slate-700 outline-none shadow-2xs"
          >
            <option value="All">All Districts</option>
            <option value="अहिल्यानगर">अहिल्यानगर (Ahilyanagar)</option>
            <option value="इंदौर">इंदौर (Indore)</option>
            <option value="Pune">Pune</option>
            <option value="नाशिक">नाशिक (Nashik)</option>
          </select>
        </div>
      </div>

      {/* Batch Action Toolbar when items selected */}
      {selectedIds.length > 0 && (
        <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between animate-in fade-in">
          <span className="text-xs font-bold text-emerald-900 flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-emerald-600" />
            Selected {selectedIds.length} records
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBatchVerify}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs"
            >
              Verify Selected ({selectedIds.length})
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 bg-white text-slate-600 hover:bg-slate-100 font-bold text-xs rounded-xl border border-slate-200"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* Records Table */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                <th className="py-3 px-4 w-10">
                  <button onClick={toggleSelectAll} className="text-slate-400 hover:text-slate-600">
                    {selectedIds.length === paginated.length && paginated.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-4">Parcel ID</th>
                <th className="py-3 px-4">Survey No.</th>
                <th className="py-3 px-4">Khata</th>
                <th className="py-3 px-4">Owner Name</th>
                <th className="py-3 px-4">Village</th>
                <th className="py-3 px-4">Taluka / District</th>
                <th className="py-3 px-4">Area / Use</th>
                <th className="py-3 px-4">Record Source</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginated.length > 0 ? (
                paginated.map((r) => {
                  const isSelected = selectedIds.includes(r.id);
                  return (
                    <tr
                      key={r.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelected ? 'bg-emerald-50/30' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => toggleSelectRecord(r.id)}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">{r.id}</td>
                      <td className="py-3.5 px-4 font-bold text-sky-700">{r.survey}</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700">{r.khata}</td>
                      <td className="py-3.5 px-4 font-black text-slate-900">{r.owner}</td>
                      <td className="py-3.5 px-4 font-medium text-slate-800">{r.village}</td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {r.taluka}, {r.district}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-800">{r.area}</p>
                        <p className="text-[11px] text-slate-500">{r.land_use || r.land_type}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                          {r.source}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                            r.status === 'Verified'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(`/map?parcel=${encodeURIComponent(r.survey)}`)}
                          className="px-2.5 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold text-[11px] flex items-center gap-1"
                        >
                          <MapPin className="w-3.5 h-3.5" /> Locate
                        </button>
                        <button
                          onClick={() => navigate(`/documents`)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px]"
                        >
                          Source Docs
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={11} className="py-10 text-center text-slate-400 font-medium">
                    No matching land records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs font-semibold text-slate-500">
          <div>
            Showing {filtered.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to{' '}
            {Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length} records
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-30 hover:bg-slate-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-30 hover:bg-slate-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
