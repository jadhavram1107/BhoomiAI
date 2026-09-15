import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileArchive,
  FileText,
  Image,
  Loader2,
  RefreshCw,
  ScanLine,
  Search,
  UploadCloud,
} from 'lucide-react';
import { api } from '../services/api';
import { DocumentRecord } from '../types';

const statusLabel: Record<string, string> = {
  uploaded: 'Awaiting Processing',
  processing: 'Processing',
  completed: 'Extracted',
  pending_verification: 'Needs Officer Review',
  verified: 'Verified',
  rejected: 'Rejected',
};

const statusStyle: Record<string, string> = {
  uploaded: 'bg-slate-100 text-slate-700',
  processing: 'bg-sky-100 text-sky-800',
  completed: 'bg-emerald-100 text-emerald-800',
  pending_verification: 'bg-amber-100 text-amber-800',
  verified: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-rose-100 text-rose-800',
};

const sampleDocuments: DocumentRecord[] = [
  {
    id: 'DOC-1001',
    filename: 'marathi_7_12_vaijapur.png',
    file_path: 'uploads/marathi_7_12_vaijapur.png',
    file_type: 'image/png',
    file_size: 1468000,
    uploaded_by: 'admin@bhoomiai.demo',
    uploaded_at: '2026-09-08T10:10:00',
    status: 'pending_verification',
    processing_stage: 'Human Verification Required',
    ocr_confidence: 94.6,
    language: 'mr',
  },
  {
    id: 'DOC-1002',
    filename: 'english_ror_pune.pdf',
    file_path: 'uploads/english_ror_pune.pdf',
    file_type: 'application/pdf',
    file_size: 2329000,
    uploaded_by: 'officer@bhoomiai.demo',
    uploaded_at: '2026-09-08T11:42:00',
    status: 'completed',
    processing_stage: 'Auto Approved',
    ocr_confidence: 98.4,
    language: 'en',
  },
  {
    id: 'DOC-1003',
    filename: 'low_quality_scan_nashik.jpg',
    file_path: 'uploads/low_quality_scan_nashik.jpg',
    file_type: 'image/jpeg',
    file_size: 968000,
    uploaded_by: 'admin@bhoomiai.demo',
    uploaded_at: '2026-09-07T15:20:00',
    status: 'pending_verification',
    processing_stage: 'Low Confidence Fields',
    ocr_confidence: 58.2,
    language: 'mr',
  },
];

export const DocumentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const data = await api.getAllDocuments();
      setDocuments(data.length > 0 ? data : sampleDocuments);
    } catch {
      setDocuments(sampleDocuments);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return documents;
    return documents.filter((doc) =>
      [doc.id, doc.filename, doc.uploaded_by, doc.processing_stage, doc.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [documents, query]);

  const metrics = {
    uploaded: documents.length,
    pending: documents.filter((doc) => doc.status === 'uploaded' || doc.status === 'processing').length,
    review: documents.filter((doc) => doc.status === 'pending_verification').length,
    verified: documents.filter((doc) => doc.status === 'verified' || doc.status === 'completed').length,
  };

  const handleProcess = async (documentId: string) => {
    setLoading(true);
    try {
      await api.processDocument(documentId);
      navigate(`/processing/${documentId}`);
    } catch {
      navigate(`/processing/${documentId}`);
    } finally {
      setLoading(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <FileArchive className="w-6 h-6 text-sky-600" />
            Document Processing Workspace
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Uploaded scans and PDFs move through OCR, field extraction, validation, and officer review here.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchDocuments}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-all"
            title="Refresh documents"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => navigate('/upload')}
            className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs"
          >
            <UploadCloud className="w-4 h-4" />
            Upload Document
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {[
          { label: 'Uploaded Files', value: metrics.uploaded, icon: FileText, tone: 'text-slate-700 bg-slate-100' },
          { label: 'In Intake', value: metrics.pending, icon: Clock3, tone: 'text-sky-700 bg-sky-100' },
          { label: 'Needs Review', value: metrics.review, icon: AlertTriangle, tone: 'text-amber-700 bg-amber-100' },
          { label: 'Extracted Records', value: metrics.verified, icon: CheckCircle2, tone: 'text-emerald-700 bg-emerald-100' },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-500 font-bold">{item.label}</p>
                  <p className="text-2xl font-black text-slate-900 mt-1">{item.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.tone}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="relative w-full md:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search file, uploader, status..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-sky-500 outline-none bg-white"
          />
        </div>
        <span className="text-xs font-semibold text-slate-500">
          {filtered.length} document{filtered.length === 1 ? '' : 's'} in processing workspace
        </span>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                <th className="py-3 px-4">Source File</th>
                <th className="py-3 px-4">Upload</th>
                <th className="py-3 px-4">Pipeline Stage</th>
                <th className="py-3 px-4">OCR</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((doc) => {
                const isPdf = doc.file_type?.includes('pdf') || doc.filename.toLowerCase().endsWith('.pdf');
                const FileIcon = isPdf ? FileText : Image;
                return (
                  <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center">
                          <FileIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-black text-slate-900">{doc.filename}</p>
                          <p className="text-[11px] text-slate-500">
                            {doc.id} · {formatSize(doc.file_size)} · {doc.language.toUpperCase()}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      <p className="font-semibold text-slate-800">{doc.uploaded_by}</p>
                      <p className="text-[11px] text-slate-500">{doc.uploaded_at?.split('T')[0] || 'Not recorded'}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px]">
                        <ScanLine className="w-3 h-3" />
                        {doc.processing_stage || 'Uploaded'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          doc.ocr_confidence >= 90
                            ? 'bg-emerald-100 text-emerald-800'
                            : doc.ocr_confidence >= 70
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {doc.ocr_confidence ? `${doc.ocr_confidence}%` : 'Not run'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${statusStyle[doc.status] || statusStyle.uploaded}`}>
                        {statusLabel[doc.status] || doc.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleProcess(doc.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold text-[11px] flex items-center gap-1"
                        >
                          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ScanLine className="w-3.5 h-3.5" />}
                          Process
                        </button>
                        <button
                          onClick={() => navigate(`/documents/${doc.id}`)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] flex items-center gap-1"
                        >
                          Review
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400 font-medium">
                    No uploaded documents match this search.
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
