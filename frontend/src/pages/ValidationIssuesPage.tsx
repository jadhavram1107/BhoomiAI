import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  Copy,
  RefreshCw,
  Edit2,
  Check,
  X,
  Search
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const ValidationIssuesPage: React.FC = () => {
  const navigate = useNavigate();
  const [runningScan, setRunningScan] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [editingIssue, setEditingIssue] = useState<any | null>(null);
  const [fixedValue, setFixedValue] = useState('');

  const [warnings, setWarnings] = useState([
    { id: 'w1', doc_id: 'DOC-1042', title: 'Low OCR confidence for Khata Number', detail: 'Khata #453 detected with 61% confidence.', status: 'Active' },
    { id: 'w2', doc_id: 'DOC-1044', title: 'Illegible stamp overlay on mutation number', detail: 'Mutation seal obscures field entry #88/3B.', status: 'Active' }
  ]);

  const [criticals, setCriticals] = useState([
    { id: 'c1', doc_id: 'DOC-1043', title: 'Possible Duplicate Survey Record', detail: 'Survey #125/2 in Vaijapur matches existing record with 92.4% similarity.', similarity: '92.4%', status: 'Active' },
    { id: 'c2', doc_id: 'DOC-1045', title: 'Suspicious Area Value Threshold', detail: 'Area value exceeds max allowed land threshold (>1000 Ha).', status: 'Active' }
  ]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleRunValidationScan = () => {
    setRunningScan(true);
    setTimeout(() => {
      setRunningScan(false);
      showToast('Validation Engine re-scan completed. All 1,087 land record rules checked.');
    }, 1200);
  };

  const handleCopyDetails = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('Copied issue details to clipboard.');
  };

  const handleResolveIssue = (id: string, type: 'warning' | 'critical') => {
    if (type === 'warning') {
      setWarnings((prev) => prev.filter((item) => item.id !== id));
    } else {
      setCriticals((prev) => prev.filter((item) => item.id !== id));
    }
    showToast('Issue marked as resolved.');
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-rose-500" />
            Validation Engine & Duplicate Detection Report
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Automated rule checks for missing mandatory fields, format errors, area boundary limits, and duplicate land record detection.
          </p>
        </div>

        <button
          onClick={handleRunValidationScan}
          disabled={runningScan}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-700 hover:from-sky-700 hover:to-cyan-800 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-sky-600/20 transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${runningScan ? 'animate-spin' : ''}`} />
          <span>{runningScan ? 'Scanning Database...' : 'Re-Run Rule Engine'}</span>
        </button>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Passed Checks */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Passed Checks (Green)
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">1,087</span>
          </div>

          <ul className="space-y-2.5 text-xs text-slate-700 font-medium">
            <li className="p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-100 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Required fields present (Owner, Survey, Village)</span>
            </li>
            <li className="p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-100 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Survey number format valid (125/2, 88/3B)</span>
            </li>
            <li className="p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-100 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Area format valid (Hectares / Guntha)</span>
            </li>
            <li className="p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-100 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Cadastral boundary GIS geometry closed polygon</span>
            </li>
          </ul>
        </div>

        {/* Warnings */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Warnings (Yellow)
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
              {warnings.length}
            </span>
          </div>

          <ul className="space-y-2.5 text-xs text-slate-700 font-medium">
            {warnings.map((w) => (
              <li key={w.id} className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 space-y-2">
                <div className="flex items-start justify-between">
                  <span className="font-bold text-amber-900">{w.title}</span>
                  <button
                    onClick={() => handleCopyDetails(w.detail)}
                    className="text-amber-600 hover:text-amber-800 p-1"
                    title="Copy details"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-[11px] text-amber-800">{w.detail}</p>
                <div className="flex items-center justify-between pt-1 border-t border-amber-200/60 text-[11px]">
                  <span className="font-mono text-amber-900">{w.doc_id}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/documents/${w.doc_id}`)}
                      className="text-sky-700 font-bold hover:underline"
                    >
                      Fix Field
                    </button>
                    <button
                      onClick={() => handleResolveIssue(w.id, 'warning')}
                      className="text-emerald-700 font-bold hover:underline"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Critical Issues & Duplicates */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <XCircle className="w-4 h-4 text-rose-500" />
              Critical & Duplicates (Red)
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">
              {criticals.length}
            </span>
          </div>

          <ul className="space-y-2.5 text-xs text-slate-700 font-medium">
            {criticals.map((c) => (
              <li key={c.id} className="p-3 bg-rose-50/70 rounded-xl border border-rose-200 space-y-2">
                <div className="flex items-start justify-between font-bold text-rose-900">
                  <span>{c.title}</span>
                  {c.similarity && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-200 text-rose-900 text-[10px]">
                      {c.similarity}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-rose-800">{c.detail}</p>
                <div className="flex items-center justify-between pt-1 border-t border-rose-200/60 text-[11px]">
                  <span className="font-mono text-rose-900">{c.doc_id}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/documents/${c.doc_id}`)}
                      className="text-sky-700 font-bold hover:underline"
                    >
                      Review
                    </button>
                    <button
                      onClick={() => handleResolveIssue(c.id, 'critical')}
                      className="text-emerald-700 font-bold hover:underline"
                    >
                      Resolve
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
