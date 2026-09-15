import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, FileText, CheckCircle2, Sparkles, Database, ArrowRight } from 'lucide-react';
import { api } from '../services/api';

export const UploadPage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [language, setLanguage] = useState('mr');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUploadAndProcess = async () => {
    if (!selectedFile) return;
    setLoading(true);
    try {
      const uploadRes = await api.uploadDocument(selectedFile, language);
      navigate(`/processing/${uploadRes.id}`);
    } catch {
      alert("Failed uploading file. Triggering demo processing simulation.");
      navigate(`/processing/DOC-1001`);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadDemo = async () => {
    setLoading(true);
    try {
      await api.seedDemoData();
      navigate(`/processing/DOC-1001`);
    } catch {
      navigate(`/processing/DOC-1001`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
          Upload Land Record Document
        </h2>
        <p className="text-xs text-slate-500 font-medium max-w-lg mx-auto">
          Upload scanned 7/12 extracts, Khasra papers, or RoR documents (PDF, JPG, PNG) for automated AI OCR digitization & validation.
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xs space-y-6">
        {/* Drag & Drop Box */}
        <div className="border-2 border-dashed border-sky-200 hover:border-sky-400 bg-sky-50/40 hover:bg-sky-50 rounded-2xl p-10 text-center transition-all cursor-pointer relative">
          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="w-14 h-14 bg-sky-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-sky-600/20 mb-3">
            <UploadCloud className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-slate-800 text-sm">
            {selectedFile ? selectedFile.name : 'Drag & Drop document file here or Browse'}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Supported formats: PDF, PNG, JPG, JPEG (Max 10MB)
          </p>
        </div>

        {/* Selected file preview info */}
        {selectedFile && (
          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-emerald-600" />
              <div>
                <p className="font-bold text-xs text-slate-900">{selectedFile.name}</p>
                <p className="text-[11px] text-slate-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>
            <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
              <CheckCircle2 className="w-3.5 h-3.5" /> Ready for Digitization
            </span>
          </div>
        )}

        {/* Language Selection */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700">Document Primary Language</label>
          <div className="grid grid-cols-3 gap-3 text-xs font-semibold">
            <button
              onClick={() => setLanguage('mr')}
              className={`p-3 rounded-xl border transition-all ${
                language === 'mr' ? 'bg-sky-50 border-sky-500 text-sky-900 shadow-xs' : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              Marathi (मराठी 7/12)
            </button>
            <button
              onClick={() => setLanguage('hi')}
              className={`p-3 rounded-xl border transition-all ${
                language === 'hi' ? 'bg-sky-50 border-sky-500 text-sky-900 shadow-xs' : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              Hindi (हिन्दी खसरा)
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={`p-3 rounded-xl border transition-all ${
                language === 'en' ? 'bg-sky-50 border-sky-500 text-sky-900 shadow-xs' : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              English (RoR Extract)
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-slate-100">
          <button
            onClick={handleUploadAndProcess}
            disabled={!selectedFile || loading}
            className="w-full sm:flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
          >
            <span>{loading ? 'Uploading...' : 'Start Digitization'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={handleLoadDemo}
            disabled={loading}
            className="w-full sm:w-auto px-5 py-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs transition-all flex items-center justify-center gap-2"
          >
            <Database className="w-4 h-4 text-amber-700" />
            <span>Load Demo Record</span>
          </button>
        </div>
      </div>
    </div>
  );
};
