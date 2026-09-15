import React, { useState, useEffect } from 'react';
import { History, User, Clock, ShieldCheck, Search, Download, Filter, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import { AuditLogItem } from '../types';

export const AuditTrailPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('All');
  const [loading, setLoading] = useState(false);

  const defaultLogs: AuditLogItem[] = [
    {
      id: 'log-1',
      timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      user_email: 'officer@bhoomiai.demo',
      action: 'APPROVE_RECORD',
      document_id: 'DOC-1001',
      previous_value: 'Needs Review',
      new_value: 'Verified',
      details: 'Approved survey #125/2 after verifying landowner name.'
    },
    {
      id: 'log-2',
      timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      user_email: 'officer@bhoomiai.demo',
      action: 'FIELD_EDIT',
      document_id: 'DOC-1001',
      previous_value: '458',
      new_value: '453',
      details: 'Corrected Khata Number OCR error from 458 to 453.'
    },
    {
      id: 'log-3',
      timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
      user_email: 'admin@bhoomiai.demo',
      action: 'DOCUMENT_UPLOAD',
      document_id: 'DOC-1002',
      previous_value: '',
      new_value: 'Uploaded',
      details: 'Uploaded 7/12 extract scan marathi_vaijapur_125.png'
    },
    {
      id: 'log-4',
      timestamp: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
      user_email: 'system@bhoomiai.ai',
      action: 'VALIDATION_CHECK',
      document_id: 'DOC-1004',
      previous_value: 'Draft',
      new_value: 'Flagged',
      details: 'Flagged Khata field due to OCR confidence 58.2% < threshold 70%'
    }
  ];

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.getAuditLogs();
      if (res && res.length > 0) {
        setLogs(res);
      } else {
        setLogs(defaultLogs);
      }
    } catch {
      setLogs(defaultLogs);
    } finally {
      setLoading(false);
    }
  };

  const filtered = logs.filter((l) => {
    const matchesSearch =
      l.user_email.toLowerCase().includes(search.toLowerCase()) ||
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      (l.document_id && l.document_id.toLowerCase().includes(search.toLowerCase())) ||
      (l.details && l.details.toLowerCase().includes(search.toLowerCase()));

    const matchesAction = actionFilter === 'All' || l.action === actionFilter;

    return matchesSearch && matchesAction;
  });

  const handleExportCSV = () => {
    const headers = ['ID', 'Timestamp', 'User Email', 'Action', 'Doc ID', 'Previous Value', 'New Value', 'Details'];
    const rows = filtered.map((l) => [
      l.id,
      `"${new Date(l.timestamp).toLocaleString()}"`,
      `"${l.user_email}"`,
      `"${l.action}"`,
      `"${l.document_id || ''}"`,
      `"${l.previous_value || ''}"`,
      `"${l.new_value || ''}"`,
      `"${l.details || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `bhoomiai_audit_trail_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <History className="w-6 h-6 text-sky-600" />
            Audit Trail & History Log
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Immutable log of all user uploads, AI OCR extractions, officer field corrections, and final approvals.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchLogs}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-all"
            title="Refresh logs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-all"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export Audit CSV ({filtered.length})</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by User, Action, or Doc ID..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-sky-500 outline-none bg-white shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-500" />
          <span>Action Type:</span>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="py-2 px-3 rounded-xl border border-slate-200 text-xs font-bold bg-white text-slate-800 outline-none"
          >
            <option value="All">All Actions</option>
            <option value="APPROVE_RECORD">APPROVE_RECORD</option>
            <option value="FIELD_EDIT">FIELD_EDIT</option>
            <option value="DOCUMENT_UPLOAD">DOCUMENT_UPLOAD</option>
            <option value="VALIDATION_CHECK">VALIDATION_CHECK</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Doc ID</th>
                <th className="py-3 px-4">Previous Value</th>
                <th className="py-3 px-4">New Value</th>
                <th className="py-3 px-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length > 0 ? (
                filtered.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 text-slate-500 font-medium whitespace-nowrap">
                      {new Date(l.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800">{l.user_email}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                          l.action.includes('APPROVE')
                            ? 'bg-emerald-100 text-emerald-800'
                            : l.action.includes('EDIT')
                            ? 'bg-sky-100 text-sky-800'
                            : l.action.includes('UPLOAD')
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {l.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-sky-700">{l.document_id || '-'}</td>
                    <td className="py-3 px-4 text-rose-600 line-through">{l.previous_value || '-'}</td>
                    <td className="py-3 px-4 text-emerald-600 font-bold">{l.new_value || '-'}</td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate">{l.details}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400 font-medium">
                    No matching audit trail logs.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
