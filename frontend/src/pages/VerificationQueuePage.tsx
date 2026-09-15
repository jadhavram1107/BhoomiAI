import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckSquare,
  AlertTriangle,
  Check,
  X,
  Eye,
  FileText,
  MessageSquare,
  ShieldCheck,
  Filter,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { api } from '../services/api';
import { VerificationTask } from '../types';

export const VerificationQueuePage: React.FC = () => {
  const [tasks, setTasks] = useState<VerificationTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterTab, setFilterTab] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('Pending');
  const [reviewTask, setReviewTask] = useState<VerificationTask | null>(null);
  const [comment, setComment] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchQueue();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await api.getVerificationQueue();
      setTasks(res);
    } catch {
      // Mock tasks
      setTasks([
        {
          id: 'VT-101',
          document_id: 'DOC-1042',
          filename: 'marathi_7_12_vaijapur.png',
          village: 'वैजापूर',
          survey_number: '125/2',
          issue_summary: 'Khata Number confidence 61% (<70%)',
          confidence: 61.0,
          status: 'Pending',
          created_at: new Date().toISOString()
        },
        {
          id: 'VT-102',
          document_id: 'DOC-1043',
          filename: 'mhow_khasra_extract.jpg',
          village: 'महू (Mhow)',
          survey_number: '412/1',
          issue_summary: 'Possible duplicate survey number in same village',
          confidence: 72.0,
          status: 'Pending',
          created_at: new Date().toISOString()
        },
        {
          id: 'VT-103',
          document_id: 'DOC-1044',
          filename: 'mulshi_ror_712.pdf',
          village: 'Mulshi',
          survey_number: '88/3B',
          issue_summary: 'Illegible stamp overlay on mutation number',
          confidence: 65.5,
          status: 'Pending',
          created_at: new Date().toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (task: VerificationTask, action: 'approve' | 'reject') => {
    try {
      await api.verifyDocument(task.document_id, action, comment || `Officer action: ${action}`);
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id ? { ...t, status: action === 'approve' ? 'Approved' : 'Rejected' } : t
        )
      );
      showToast(`Record ${task.survey_number} (${task.village}) marked as ${action === 'approve' ? 'Approved' : 'Rejected'}.`);
    } catch {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id ? { ...t, status: action === 'approve' ? 'Approved' : 'Rejected' } : t
        )
      );
      showToast(`Record ${task.survey_number} marked as ${action === 'approve' ? 'Approved' : 'Rejected'}.`);
    } finally {
      setReviewTask(null);
      setComment('');
    }
  };

  const handleBatchApproveAll = async () => {
    const pendingTasks = tasks.filter((t) => t.status === 'Pending');
    if (pendingTasks.length === 0) return;

    for (const t of pendingTasks) {
      try {
        await api.verifyDocument(t.document_id, 'approve', 'Batch approved by officer');
      } catch {
        // ignore
      }
    }

    setTasks((prev) => prev.map((t) => ({ ...t, status: 'Approved' })));
    showToast(`Batch approved all ${pendingTasks.length} pending verification tasks.`);
  };

  const filteredTasks = tasks.filter((t) => {
    if (filterTab === 'All') return true;
    return t.status === filterTab;
  });

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
            <CheckSquare className="w-6 h-6 text-sky-600" />
            Human Verification Queue
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Uncertain land records with low OCR confidence or validation alerts routed for revenue officer review.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchQueue}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-all"
            title="Refresh queue"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleBatchApproveAll}
            disabled={tasks.filter((t) => t.status === 'Pending').length === 0}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-all"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Approve All Pending ({tasks.filter((t) => t.status === 'Pending').length})</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex items-center justify-between">
        <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
          {(['Pending', 'Approved', 'Rejected', 'All'] as const).map((tab) => {
            const count = tasks.filter((t) => (tab === 'All' ? true : t.status === tab)).length;
            return (
              <button
                key={tab}
                onClick={() => setFilterTab(tab)}
                className={`px-3.5 py-1.5 rounded-lg transition-all ${
                  filterTab === tab ? 'bg-white text-slate-900 shadow-xs font-black' : 'hover:text-slate-900'
                }`}
              >
                {tab} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Queue Table */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                <th className="py-3 px-4">Task ID</th>
                <th className="py-3 px-4">Village</th>
                <th className="py-3 px-4">Survey No.</th>
                <th className="py-3 px-4">Problem / Alert</th>
                <th className="py-3 px-4">Confidence</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTasks.length > 0 ? (
                filteredTasks.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">{t.id}</td>
                    <td className="py-3.5 px-4 font-medium text-slate-800">{t.village}</td>
                    <td className="py-3.5 px-4 font-bold text-sky-700">{t.survey_number}</td>
                    <td className="py-3.5 px-4 text-amber-700 font-medium">{t.issue_summary}</td>
                    <td className="py-3.5 px-4 font-bold text-rose-600">{t.confidence}%</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                          t.status === 'Approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : t.status === 'Rejected'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right flex items-center justify-end gap-2">
                      {t.status === 'Pending' && (
                        <>
                          <button
                            onClick={() => handleAction(t, 'approve')}
                            className="px-2.5 py-1.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold text-xs flex items-center gap-1"
                            title="Quick Approve"
                          >
                            <Check className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button
                            onClick={() => handleAction(t, 'reject')}
                            className="px-2.5 py-1.5 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold text-xs flex items-center gap-1"
                            title="Quick Reject"
                          >
                            <X className="w-3.5 h-3.5" /> Reject
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => navigate(`/documents/${t.document_id}`)}
                        className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-2xs"
                      >
                        Review Details
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400 font-medium">
                    No verification tasks in this view.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Review Modal */}
      {reviewTask && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">
                Officer Review: {reviewTask.survey_number} ({reviewTask.village})
              </h3>
              <button onClick={() => setReviewTask(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs space-y-1">
              <p className="font-bold text-amber-900">Alert Summary:</p>
              <p className="text-amber-800">{reviewTask.issue_summary}</p>
            </div>

            <div className="space-y-2 text-xs">
              <label className="block font-bold text-slate-700">Reviewer Comment / Remarks</label>
              <textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add verification notes or reason for approval/rejection..."
                className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500 outline-none text-slate-800 font-medium"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => handleAction(reviewTask, 'reject')}
                className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold text-xs flex items-center gap-1.5"
              >
                <X className="w-4 h-4" /> Reject Record
              </button>

              <button
                onClick={() => handleAction(reviewTask, 'approve')}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md"
              >
                <Check className="w-4 h-4" /> Approve Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
