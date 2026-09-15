import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Copy,
  TrendingUp,
  UploadCloud,
  MapPin,
  ShieldAlert,
  ArrowUpRight,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';
import { DocumentRecord } from '../types';

export const DashboardPage: React.FC = () => {
  const { t } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    total_documents: 0,
    processed_documents: 0,
    pending_verification: 0,
    verified_records: 0,
    validation_errors: 0,
    duplicate_records: 0,
    avg_ocr_confidence: 0
  });

  const [recentDocs, setRecentDocs] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const data = await api.getDashboardStats();
      if (data) setStats(data);
      const docs = await api.getAllDocuments();
      setRecentDocs(docs);
    } catch {
      setRecentDocs([]);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { title: t('total_docs'), value: stats.total_documents, icon: FileText, color: 'text-sky-600', bg: 'bg-sky-50 border-sky-100' },
    { title: t('processed_docs'), value: stats.processed_documents, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
    { title: t('pending_verif'), value: stats.pending_verification, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100' },
    { title: t('verified_records'), value: stats.verified_records, icon: TrendingUp, color: 'text-teal-600', bg: 'bg-teal-50 border-teal-100' },
    { title: t('validation_errors'), value: stats.validation_errors, icon: AlertTriangle, color: 'text-rose-600', bg: 'bg-rose-50 border-rose-100' },
    { title: t('duplicate_records'), value: stats.duplicate_records, icon: Copy, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-100' },
    { title: t('avg_ocr_conf'), value: `${stats.avg_ocr_confidence}%`, icon: Sparkles, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-100' }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner highlighting AI-Assisted + Human Verified Architecture */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-emerald-950 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-4 border border-slate-800">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI-Assisted + Human-Verified Digitization Architecture</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">
            Intelligent Land Record Validation & Verification Portal
          </h2>
          <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
            AI extracts land record fields automatically. High-confidence records pass seamlessly, while uncertain records are automatically routed to revenue officers for human verification.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => navigate('/upload')}
            className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-2"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Land Record</span>
          </button>
          <button
            onClick={() => navigate('/map')}
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs transition-all flex items-center gap-2"
          >
            <MapPin className="w-4 h-4" />
            <span>GIS Map View</span>
          </button>
        </div>
      </div>

      {/* 7 Animated Counter Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className={`p-4 rounded-2xl border ${card.bg} shadow-xs transition-all hover:scale-[1.02] cursor-default`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-600 truncate">{card.title}</span>
                <Icon className={`w-4 h-4 ${card.color}`} />
              </div>
              <p className={`text-xl font-black ${card.color} tracking-tight`}>
                {card.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Recent Land Records & Verification Queue Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Records Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Recent Digitized Records</h3>
              <p className="text-xs text-slate-500">Latest 7/12 & Khasra documents processed</p>
            </div>
            <button
              onClick={() => navigate('/land-records')}
              className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1"
            >
              View All <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                  <th className="py-2.5 px-3">Document</th>
                  <th className="py-2.5 px-3">Language</th>
                  <th className="py-2.5 px-3">OCR Accuracy</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentDocs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-400 font-medium">
                      No uploaded documents yet. Upload a record to see live processing data here.
                    </td>
                  </tr>
                ) : (
                  recentDocs.slice(0, 5).map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-3 font-semibold text-slate-800">{doc.filename}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-semibold text-[10px]">
                          {doc.language.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-bold text-emerald-600">{doc.ocr_confidence}%</td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            doc.status === 'verified' || doc.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {doc.processing_stage}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => navigate(`/documents/${doc.id}`)}
                          className="text-sky-600 hover:underline font-bold"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* System Health & Validation Alerts Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-500" />
              Validation Alerts
            </h3>
            <span className="text-[10px] font-bold bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full">
              Action Required
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-1">
              <div className="flex items-center justify-between font-bold text-amber-900">
                <span>Records Awaiting Review</span>
                <span>{stats.pending_verification}</span>
              </div>
              <p className="text-[11px] text-amber-700">Documents with low-confidence extraction or validation warnings are routed to the officer queue.</p>
              <button
                onClick={() => navigate('/verification')}
                className="text-[11px] font-bold text-amber-900 hover:underline pt-1 block"
              >
                Review in Queue →
              </button>
            </div>

            <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 space-y-1">
              <div className="flex items-center justify-between font-bold text-rose-900">
                <span>Possible Duplicate Record</span>
                <span>{stats.duplicate_records}</span>
              </div>
              <p className="text-[11px] text-rose-700">Duplicate alerts are counted from actual validation results.</p>
              <button
                onClick={() => navigate('/validation')}
                className="text-[11px] font-bold text-rose-900 hover:underline pt-1 block"
              >
                View Issue →
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <div className="flex items-center justify-between font-bold text-slate-800">
                <span>OCR Engine Status</span>
                <span className={stats.total_documents > 0 ? 'text-emerald-600' : 'text-slate-500'}>
                  {stats.total_documents > 0 ? 'Active' : 'Waiting'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">Average OCR confidence is calculated from processed documents in the database.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
