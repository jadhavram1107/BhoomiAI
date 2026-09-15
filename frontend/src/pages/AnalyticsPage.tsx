import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, PieChart as PieIcon, ShieldCheck, Download, Calendar, Filter } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { api } from '../services/api';

export const AnalyticsPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [timePeriod, setTimePeriod] = useState<'7d' | '30d' | 'ytd'>('7d');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('All');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    api.getAnalytics().then((res) => setData(res)).catch(() => console.log('Analytics loaded'));
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const dailyData7d = [
    { date: 'Mon', processed: 145, verified: 130, flagged: 15 },
    { date: 'Tue', processed: 182, verified: 165, flagged: 17 },
    { date: 'Wed', processed: 210, verified: 192, flagged: 18 },
    { date: 'Thu', processed: 195, verified: 178, flagged: 17 },
    { date: 'Fri', processed: 240, verified: 220, flagged: 20 },
    { date: 'Sat', processed: 115, verified: 106, flagged: 9 }
  ];

  const dailyData30d = [
    { date: 'Week 1', processed: 920, verified: 850, flagged: 70 },
    { date: 'Week 2', processed: 1140, verified: 1060, flagged: 80 },
    { date: 'Week 3', processed: 1280, verified: 1190, flagged: 90 },
    { date: 'Week 4', processed: 1050, verified: 980, flagged: 70 }
  ];

  const dailyDataYtd = [
    { date: 'Q1', processed: 4500, verified: 4200, flagged: 300 },
    { date: 'Q2', processed: 5800, verified: 5450, flagged: 350 },
    { date: 'Q3', processed: 6200, verified: 5890, flagged: 310 }
  ];

  const currentChartData =
    timePeriod === '30d' ? dailyData30d : timePeriod === 'ytd' ? dailyDataYtd : dailyData7d;

  const pieData = [
    { name: '90-100% (High Confidence)', value: 842, color: '#10b981' },
    { name: '70-89% (Medium Confidence)', value: 149, color: '#f59e0b' },
    { name: '<70% (Low Confidence)', value: 96, color: '#ef4444' }
  ];

  const handleExportAnalyticsReport = () => {
    const reportText = `=====================================================
BHOOMIAI LAND RECORDS ANALYTICS REPORT
Generated: ${new Date().toLocaleString()}
Filter Period: ${timePeriod.toUpperCase()}
District: ${selectedDistrict}
=====================================================

1. SUMMARY STATISTICAL OVERVIEW:
- Total Digitized Documents: 1,087
- Human Verification Rate: 94.6%
- Average Processing Latency: 1.84 seconds per page
- Active Parcels in GIS Database: 4,520

2. OCR ACCURACY TIER BREAKDOWN:
- High Confidence (90-100%): 842 records (77.4%)
- Medium Confidence (70-89%): 149 records (13.7%)
- Low Confidence (<70%): 96 records (8.8%)

3. TOP VALIDATION ALERT CATEGORIES:
- Missing Khata Number OCR: 41 cases
- Duplicate Survey Entry: 27 cases
- Stamp Overlay Interferences: 18 cases
=====================================================`;

    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `bhoomiai_analytics_report_${timePeriod}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Analytics summary report downloaded successfully.');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white font-bold text-xs px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-sky-600" />
            Digitization & Accuracy Analytics
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Comprehensive statistics on documents processed per day, OCR confidence distribution, error categories, and district-wise throughput.
          </p>
        </div>

        <button
          onClick={handleExportAnalyticsReport}
          className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-all"
        >
          <Download className="w-4 h-4 text-emerald-400" />
          <span>Export Analytics Report</span>
        </button>
      </div>

      {/* Filter Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-500" />
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
            {(
              [
                { key: '7d', label: 'Last 7 Days' },
                { key: '30d', label: 'Last 30 Days' },
                { key: 'ytd', label: 'Year to Date' }
              ] as const
            ).map((t) => (
              <button
                key={t.key}
                onClick={() => setTimePeriod(t.key)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  timePeriod === t.key ? 'bg-white text-slate-900 shadow-xs font-black' : 'hover:text-slate-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
          <Filter className="w-4 h-4 text-slate-500" />
          <span>District:</span>
          <select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="py-1.5 px-3 rounded-xl border border-slate-200 text-xs font-bold bg-white text-slate-800 outline-none"
          >
            <option value="All">All Districts</option>
            <option value="Ahilyanagar">Ahilyanagar</option>
            <option value="Indore">Indore</option>
            <option value="Pune">Pune</option>
            <option value="Nashik">Nashik</option>
          </select>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Daily Documents Processed */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">Documents Processed & Verified</h3>
            <span className="text-xs font-semibold text-slate-400">{selectedDistrict} District</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={currentChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip />
                <Legend />
                <Bar dataKey="processed" fill="#0284c7" name="Total Processed" radius={[4, 4, 0, 0]} />
                <Bar dataKey="verified" fill="#10b981" name="Verified Records" radius={[4, 4, 0, 0]} />
                <Bar dataKey="flagged" fill="#f59e0b" name="Flagged / Review" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: OCR Confidence Distribution */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">OCR Accuracy Tier Breakdown</h3>
            <span className="text-xs font-bold text-emerald-600">94.6% Avg Accuracy</span>
          </div>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={4} dataKey="value">
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
