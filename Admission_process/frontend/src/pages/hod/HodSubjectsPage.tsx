import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  PlusCircle,
  Users,
  Layers,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  RefreshCw,
  X,
} from 'lucide-react';
import hodService, { HodSubjectItem } from '../../services/hod.service';

export const HodSubjectsPage: React.FC = () => {
  const [subjects, setSubjects] = useState<HodSubjectItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedSemester, setSelectedSemester] = useState<string>('ALL');

  // Modal to create subject
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [semester, setSemester] = useState('5');
  const [credits, setCredits] = useState('4');
  const [type, setType] = useState('THEORY');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    setLoading(true);
    try {
      const data = await hodService.getSubjects();
      setSubjects(data);
    } catch (err) {
      console.error('Failed to load subjects:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !name) return;
    setSaving(true);
    try {
      await hodService.createSubject({
        code,
        name,
        semester: Number(semester),
        credits: Number(credits),
        type,
      });
      setShowAddModal(false);
      setCode('');
      setName('');
      fetchSubjects();
    } catch (err) {
      alert('Failed to create subject.');
    } finally {
      setSaving(false);
    }
  };

  const filtered = subjects.filter((s) => {
    if (selectedSemester === 'ALL') return true;
    return s.semester === Number(selectedSemester);
  });

  return (
    <div className="space-y-6">
      
      {/* ── Page Header (Admin Style) ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-neutral-900 text-white rounded-2xl px-6 py-3.5 shadow-sm border border-neutral-800">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest block">
              Curriculum Offerings
            </span>
            <div className="text-3xl font-black mt-0.5">
              {subjects.length} <span className="text-sm font-semibold text-neutral-400">subjects</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => fetchSubjects()}
            className="px-4 py-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs sm:text-sm font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors shadow-xs flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 text-neutral-500 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#070e22] via-[#0c1a40] to-[#0f245c] hover:from-[#0a1533] hover:to-[#142c6b] text-white font-bold text-xs sm:text-sm shadow-sm flex items-center gap-2 transition-all transform hover:-translate-y-0.5 active:translate-y-0 border border-[#1e3a8a]/40"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Subject</span>
          </button>
        </div>
      </div>

      {/* ── Filter Bar (Admin Style - Enlarged) ───────────────────────────────── */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl p-5 sm:p-6 border border-neutral-200/80 dark:border-neutral-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-extrabold text-neutral-800 dark:text-neutral-200 tracking-tight">
            Filter by Semester:
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSelectedSemester('ALL')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-xs ${
                selectedSemester === 'ALL'
                  ? 'bg-gradient-to-r from-[#070e22] via-[#0c1a40] to-[#0f245c] text-white font-bold shadow-md shadow-[#070e22]/25 border border-[#1e3a8a]/50'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-transparent'
              }`}
            >
              All Semesters
            </button>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
              <button
                key={s}
                onClick={() => setSelectedSemester(String(s))}
                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-xs ${
                  selectedSemester === String(s)
                    ? 'bg-gradient-to-r from-[#070e22] via-[#0c1a40] to-[#0f245c] text-white font-bold shadow-md shadow-[#070e22]/25 border border-[#1e3a8a]/50'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-transparent'
                }`}
              >
                Sem {s}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 py-2 rounded-xl bg-neutral-100/90 dark:bg-neutral-800/90 border border-neutral-200/60 dark:border-neutral-700/60 text-xs sm:text-sm font-bold text-neutral-600 dark:text-neutral-300 self-start sm:self-auto">
          Showing <span className="text-neutral-900 dark:text-white font-black">{filtered.length}</span> {filtered.length === 1 ? 'subject' : 'subjects'}
        </div>
      </div>

      {/* ── Subjects Grid ────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="py-12 text-center text-neutral-400">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-violet-600 border-t-transparent" />
          <p className="mt-2 text-xs font-bold">Loading department subjects...</p>
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((sub) => (
            <div
              key={sub.id}
              className="bg-white dark:bg-neutral-900 rounded-3xl p-5 border border-neutral-200/80 dark:border-neutral-800 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700">
                    {sub.code}
                  </span>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                    Sem {sub.semester} • {sub.credits} Credits
                  </span>
                </div>

                <h3 className="text-sm font-black text-neutral-900 dark:text-white mt-3">
                  {sub.name}
                </h3>
                <p className="text-[11px] text-neutral-400 font-semibold mt-0.5">
                  Type: {sub.type}
                </p>

                {/* Assigned Faculty */}
                <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase block mb-1">
                    Assigned Teaching Faculty:
                  </span>
                  {sub.assignedFaculty && sub.assignedFaculty.length > 0 ? (
                    <div className="space-y-1">
                      {sub.assignedFaculty.map((f, i) => (
                        <div key={i} className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center justify-between">
                          <span>{f.facultyName}</span>
                          <span className="text-[10px] text-violet-600 dark:text-violet-400 font-semibold">Sec {f.section}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-rose-500 font-bold italic">Unassigned</span>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
                <span className="text-neutral-400 text-[11px]">Academic Course</span>
                <Link
                  to="/hod/faculty/assignments"
                  className="font-bold text-neutral-900 dark:text-white hover:underline"
                >
                  Manage Allotment →
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-neutral-900 border border-dashed border-neutral-200 dark:border-neutral-800">
          <BookOpen className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
          <p className="text-sm font-bold text-neutral-700 dark:text-neutral-300">No Subjects Found</p>
        </div>
      )}

      {/* ── Add Subject Modal (Admin Style) ─────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-neutral-900 dark:text-white">Add Department Subject</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubject} className="space-y-3.5 text-xs font-semibold">
              <div>
                <label className="block mb-1 text-neutral-700 dark:text-neutral-300 font-bold">Subject Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 21CS51"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="block mb-1 text-neutral-700 dark:text-neutral-300 font-bold">Subject Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Database Management Systems"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-neutral-700 dark:text-neutral-300 font-bold">Semester</label>
                  <select
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 font-bold focus:ring-2 focus:ring-violet-500"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={s}>Semester {s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block mb-1 text-neutral-700 dark:text-neutral-300 font-bold">Credits</label>
                  <input
                    type="number"
                    min="1"
                    max="6"
                    value={credits}
                    onChange={(e) => setCredits(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1 text-neutral-700 dark:text-neutral-300 font-bold">Course Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 font-bold focus:ring-2 focus:ring-violet-500"
                >
                  <option value="THEORY">Theory</option>
                  <option value="PRACTICAL">Practical / Lab</option>
                  <option value="INTEGRATED">Integrated (Theory + Lab)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold transition-colors"
                >
                  {saving ? 'Saving...' : 'Save Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HodSubjectsPage;
