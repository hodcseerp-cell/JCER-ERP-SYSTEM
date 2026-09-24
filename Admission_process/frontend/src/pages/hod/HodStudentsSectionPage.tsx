import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Layers, Users, ChevronRight, PlusCircle, ArrowUpRight } from 'lucide-react';
import hodService from '../../services/hod.service';

export const HodStudentsSectionPage: React.FC = () => {
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    hodService.getStudentSections()
      .then((data) => setSections(data))
      .catch((err) => console.error('Failed to load sections:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-6 h-6 text-indigo-600" />
            <span>Section-Wise Student Distribution</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Classroom division metrics, seating capacities, and student allocations.
          </p>
        </div>

        <Link
          to="/hod/students"
          className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors shadow-xs inline-flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Users className="w-3.5 h-3.5 text-indigo-600" />
          <span>All Students Directory</span>
        </Link>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-indigo-600 border-t-transparent" />
          <p className="mt-2 text-xs font-bold">Loading department sections...</p>
        </div>
      ) : sections.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {sections.map((sec) => {
            const utilization = sec.maxCapacity ? Math.round((sec.studentCount / sec.maxCapacity) * 100) : 85;
            return (
              <div
                key={sec.id}
                className="glass-card rounded-3xl p-5 border border-white/60 dark:border-slate-800/60 shadow-xs hover:shadow-md transition-all bg-white/80 dark:bg-slate-900/80"
              >
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-extrabold text-xs">
                    <Layers className="w-3.5 h-3.5" />
                    <span>Sem {sec.semester}</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">{sec.academicYear}</span>
                </div>

                <div className="mt-4">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">
                    Section {sec.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Capacity: <strong className="text-slate-800 dark:text-slate-200">{sec.studentCount} / {sec.maxCapacity || 60}</strong> students
                  </p>
                </div>

                {/* Progress bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                    <span className="text-slate-400">Classroom Fill Rate</span>
                    <span className="text-indigo-600">{utilization}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                    <div
                      className="bg-indigo-600 h-2 rounded-full"
                      style={{ width: `${Math.min(100, utilization)}%` }}
                    />
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400 text-[11px]">Enrolled Students</span>
                  <Link
                    to={`/hod/students?semester=${sec.semester}&section=${sec.name}`}
                    className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
                  >
                    View Section <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800">
          <Layers className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No Custom Sections Found</p>
          <p className="text-xs text-slate-400 mt-1">Default sections A & B are mapped automatically to active semesters.</p>
        </div>
      )}
    </div>
  );
};

export default HodStudentsSectionPage;
