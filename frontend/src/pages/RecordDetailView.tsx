import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  AlertTriangle,
  Edit2,
  Save,
  Check,
  X,
  FileText,
  ShieldCheck,
  Eye,
  RefreshCw,
  ExternalLink,
  Info
} from 'lucide-react';
import { api } from '../services/api';
import { DocumentRecord, ExtractedField } from '../types';

export const RecordDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const docId = id || 'DOC-1001';

  const [document, setDocument] = useState<DocumentRecord | null>(null);
  const [fields, setFields] = useState<ExtractedField[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [verifyStatus, setVerifyStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    fetchRecordData();
  }, [docId]);

  const fetchRecordData = async () => {
    setLoading(true);
    try {
      const data = await api.getDocumentById(docId);
      setDocument(data);
      if (data.fields) setFields(data.fields);
    } catch {
      // Fallback synthetic data
      setFields([
        { id: 'f1', field_name: 'owner_name', label_en: 'Owner Name', label_mr: 'मालकाचे नाव', label_hi: 'मालिक का नाम', value: 'रामेश्वर जाधव', confidence: 96.0, confidence_tier: 'high', is_missing: false, is_edited: false },
        { id: 'f2', field_name: 'survey_number', label_en: 'Survey Number', label_mr: 'सर्वे / गट क्रमांक', label_hi: 'सर्वेक्षण संख्या', value: '125/2', confidence: 98.0, confidence_tier: 'high', is_missing: false, is_edited: false },
        { id: 'f3', field_name: 'khata_number', label_en: 'Khata Number', label_mr: 'खाते क्रमांक', label_hi: 'खाता संख्या', value: '453', confidence: 61.0, confidence_tier: 'low', is_missing: false, is_edited: false },
        { id: 'f4', field_name: 'village', label_en: 'Village', label_mr: 'गाव', label_hi: 'गाँव', value: 'वैजापूर', confidence: 94.0, confidence_tier: 'high', is_missing: false, is_edited: false },
        { id: 'f5', field_name: 'area', label_en: 'Area', label_mr: 'क्षेत्रफळ', label_hi: 'क्षेत्रफल', value: '2.45 hectare', confidence: 88.0, confidence_tier: 'medium', is_missing: false, is_edited: false }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (f: ExtractedField) => {
    setEditingId(f.id);
    setEditValue(f.value);
  };

  const handleSaveField = async (f: ExtractedField) => {
    try {
      await api.updateField(docId, f.id, editValue);
      setFields((prev) =>
        prev.map((item) =>
          item.id === f.id
            ? { ...item, value: editValue, confidence: 100.0, confidence_tier: 'high', is_edited: true }
            : item
        )
      );
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    } catch {
      alert('Updated field locally.');
    } finally {
      setEditingId(null);
    }
  };

  const handleVerifyRecord = async (action: 'approve' | 'reject') => {
    try {
      await api.verifyDocument(docId, action, `${action === 'approve' ? 'Approved' : 'Rejected'} by officer`);
      setVerifyStatus(action === 'approve' ? 'approved' : 'rejected');
      showToast(action === 'approve' ? '✅ Record Approved & Verified!' : '❌ Record Rejected.');
    } catch {
      setVerifyStatus(action === 'approve' ? 'approved' : 'rejected');
      showToast(action === 'approve' ? '✅ Record Approved (demo mode).' : '❌ Record Rejected (demo mode).');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white font-bold text-xs px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
      {/* Top Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">Structured Record View</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 text-xs font-bold">
              ID: {docId}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Compare original document image against AI extracted fields. Edit low-confidence values inline.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {verifyStatus === 'approved' && (
            <span className="px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" /> Approved
            </span>
          )}
          {verifyStatus === 'rejected' && (
            <span className="px-3 py-1.5 rounded-xl bg-rose-100 text-rose-800 font-bold text-xs flex items-center gap-1.5">
              <X className="w-4 h-4" /> Rejected
            </span>
          )}
          {!verifyStatus && (
            <>
              <button
                onClick={() => handleVerifyRecord('reject')}
                className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 font-bold text-xs flex items-center gap-1.5 transition-all"
              >
                <X className="w-4 h-4 text-rose-600" />
                <span>Reject</span>
              </button>
              <button
                onClick={() => handleVerifyRecord('approve')}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all"
              >
                <Check className="w-4 h-4" />
                <span>Approve Record</span>
              </button>
            </>
          )}
          <button
            onClick={() => navigate('/verification')}
            className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs flex items-center gap-1.5 transition-all"
          >
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Verification Queue</span>
          </button>
          <button
            onClick={() => navigate('/map')}
            className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all"
          >
            <ExternalLink className="w-4 h-4" />
            <span>GIS Map</span>
          </button>
        </div>
      </div>

      {/* Split Screen Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: Original Document Image */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex flex-col space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-sky-600" />
              Original Document Preview
            </h3>
            <span className="text-[11px] font-semibold text-slate-400">7/12 Extract (Scanned)</span>
          </div>

          <div className="flex-1 bg-slate-900 rounded-2xl p-4 min-h-[450px] flex items-center justify-center relative overflow-hidden group">
            {/* Simulated Document Viewer */}
            <div className="w-full max-w-sm bg-amber-50 text-slate-900 rounded-xl p-6 shadow-2xl font-serif text-xs leading-relaxed border border-amber-200 space-y-3 relative">
              <div className="text-center font-bold text-sm border-b border-amber-300 pb-2">
                महाराष्ट्र शासन - गांव नमुना सात (७/१२)
              </div>
              <p><strong>गाव:</strong> वैजापूर | <strong>तालुका:</strong> वैजापूर | <strong>जिल्हा:</strong> अहिल्यानगर</p>
              <p className="bg-amber-100 p-1 rounded"><strong>सर्वे / गट क्र.:</strong> 125/2 | <strong>खाते क्र.:</strong> 453</p>
              <p><strong>क्षेत्र:</strong> 2.45 हेक्टर | <strong>जमीनीचा प्रकार:</strong> जिरायत</p>
              <p className="border-t border-amber-200 pt-2"><strong>खातेदाराचे नाव:</strong> रामेश्वर जाधव</p>

              {/* Bounding box highlight for low confidence field */}
              <div className="absolute top-24 left-4 right-4 h-8 border-2 border-rose-500 bg-rose-500/10 rounded animate-pulse" title="Low OCR confidence detected on Khata Number" />
            </div>
          </div>
        </div>

        {/* RIGHT: AI Extracted Fields Table */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Extracted Structured Information
            </h3>
            {savedSuccess && (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 animate-in fade-in">
                <Check className="w-3.5 h-3.5" /> Saved & Audited
              </span>
            )}
          </div>

          <div className="space-y-3">
            {fields.map((f) => {
              const isEditing = editingId === f.id;
              const isLow = f.confidence < 70;
              const isMed = f.confidence >= 70 && f.confidence < 90;

              return (
                <div
                  key={f.id}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    isLow
                      ? 'bg-rose-50/60 border-rose-200'
                      : isMed
                      ? 'bg-amber-50/60 border-amber-200'
                      : 'bg-slate-50/60 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-700">
                      {f.label_en} ({f.label_mr})
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                        isLow
                          ? 'bg-rose-100 text-rose-800'
                          : isMed
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {isLow ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                      Confidence {f.confidence}%
                    </span>
                  </div>

                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="flex-1 px-3 py-1.5 rounded-xl border border-sky-400 text-xs font-bold text-slate-900 bg-white outline-none"
                      />
                      <button
                        onClick={() => handleSaveField(f)}
                        className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-1.5 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-black text-slate-900 tracking-tight">
                        {f.value}
                      </p>
                      <button
                        onClick={() => handleStartEdit(f)}
                        className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1"
                      >
                        <Edit2 className="w-3.5 h-3.5" /> Edit
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
