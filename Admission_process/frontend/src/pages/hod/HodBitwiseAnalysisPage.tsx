import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  ArrowLeft,
  CheckCircle2,
  TrendingUp,
  Percent,
  Layers,
  Sparkles,
} from 'lucide-react';
import hodService from '../../services/hod.service';

export const HodBitwiseAnalysisPage: React.FC = () => {
  const [bitwiseData, setBitwiseData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    hodService.getBitwiseAnalysis()
      .then((data) => setBitwiseData(data))
      .catch((err) => console.error('Failed to load bitwise analysis:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      
      {/* ── Breadcrumb & Back ────────────────────────────────────────────────── */}
      <div>
        <Link
          to="/hod/academics"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Academics Overview</span>
        </Link>
      </div>

      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 border border-white/60 dark:border-slate-800/60 shadow-sm bg-white/80 dark:bg-slate-900/80">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center font-bold shadow-xs">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              Bit-Wise Assessment Component Analysis (Prompt Item 6)
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Normalized component analysis for internal assessments (Bit 1 through Bit 5) without raw JSONB locks.
            </p>
          </div>
        </div>
      </div>

      {/* ── Component Table ─────────────────────────────────────────────────── */}
      <div className="glass-card rounded-3xl border border-white/60 dark:border-slate-800/60 shadow-sm overflow-hidden bg-white/80 dark:bg-slate-900/80">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/90 dark:bg-slate-800/90 text-slate-500 uppercase tracking-wider font-extrabold border-b border-slate-200/60 dark:border-slate-700/60">
              <tr>
                <th className="py-3.5 px-4">Component Code</th>
                <th className="py-3.5 px-4">Assessment Area</th>
                <th className="py-3.5 px-4">Max Marks</th>
                <th className="py-3.5 px-4">Avg Score</th>
                <th className="py-3.5 px-4">Range (Min - Max)</th>
                <th className="py-3.5 px-4">Pass Rate</th>
                <th className="py-3.5 px-4">Performance Bar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-indigo-600 border-t-transparent" />
                    <p className="mt-2 text-xs font-bold">Computing bit-wise component scores...</p>
                  </td>
                </tr>
              ) : bitwiseData.length > 0 ? (
                bitwiseData.map((b) => {
                  const pct = Math.round((b.averageMarks / b.maxMarks) * 100);
                  return (
                    <tr key={b.bit} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-4 px-4 font-mono font-black text-indigo-600 dark:text-indigo-400 text-sm">
                        {b.bit}
                      </td>

                      <td className="py-4 px-4 font-bold text-slate-900 dark:text-white">
                        {b.title}
                      </td>

                      <td className="py-4 px-4 font-semibold text-slate-500">
                        {b.maxMarks} Marks
                      </td>

                      <td className="py-4 px-4 font-black text-slate-900 dark:text-white text-sm">
                        {b.averageMarks} / {b.maxMarks}
                      </td>

                      <td className="py-4 px-4 font-semibold text-slate-600 dark:text-slate-400">
                        {b.lowestMarks} to {b.highestMarks}
                      </td>

                      <td className="py-4 px-4 font-bold text-emerald-600">
                        {b.passRate}%
                      </td>

                      <td className="py-4 px-4 w-48">
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                          <div
                            className="bg-indigo-600 h-2 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1 block font-semibold">{pct}% average achievement</span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No bit-wise assessment data found.
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

export default HodBitwiseAnalysisPage;
