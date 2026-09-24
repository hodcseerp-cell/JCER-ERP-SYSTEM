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
      
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-indigo-600" />
              <span>Department Curriculum & Subjects</span>
            </h1>
            <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
              {subjects.length} Subjects
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Curriculum subjects, credit weightings, theory/practical tracks, and assigned teaching faculty.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 flex items-center gap-1.5 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Subject</span>
          </button>
        </div>
      </div>

      {/* ── Filter Bar ───────────────────────────────────────────────────────── */}
      <div className="glass-card rounded-2xl p-4 border border-white/60 dark:border-slate-800/60 shadow-sm bg-white/80 dark:bg-slate-900/80 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
          <span>Filter by Semester:</span>
          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border text-xs font-bold text-slate-800 dark:text-slate-200"
          >
            <option value="ALL">All Semesters</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
              <option key={s} value={s}>Semester {s}</option>
            ))}
          </select>
        </div>

        <span className="text-xs text-slate-400 font-semibold">
          Showing {filtered.length} subjects
        </span>
      </div>

      {/* ── Subjects Grid ────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="py-12 text-center text-slate-400">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-indigo-600 border-t-transparent" />
          <p className="mt-2 text-xs font-bold">Loading department subjects...</p>
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((sub) => (
            <div
              key={sub.id}
              className="glass-card rounded-3xl p-5 border border-white/60 dark:border-slate-800/60 shadow-xs hover:shadow-md transition-all bg-white/80 dark:bg-slate-900/80 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                    {sub.code}
                  </span>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    Sem {sub.semester} • {sub.credits} Credits
                  </span>
                </div>

                <h3 className="text-sm font-black text-slate-900 dark:text-white mt-3">
                  {sub.name}
                </h3>
                <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                  Type: {sub.type}
                </p>

                {/* Assigned Faculty */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                    Assigned Teaching Faculty:
                  </span>
                  {sub.assignedFaculty && sub.assignedFaculty.length > 0 ? (
                    <div className="space-y-1">
                      {sub.assignedFaculty.map((f, i) => (
                        <div key={i} className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                          <span>{f.facultyName}</span>
                          <span className="text-[10px] text-indigo-600 font-semibold">Sec {f.section}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-rose-500 font-bold italic">Unassigned</span>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[11px]">Academic Course</span>
                <Link
                  to="/hod/faculty/assignments"
                  className="font-bold text-indigo-600 hover:underline"
                >
                  Manage Allotment →
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800">
          <BookOpen className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No Subjects Found</p>
        </div>
      )}

      {/* ── Add Subject Modal ────────────────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4">
            <h3 className="text-base font-black text-slate-900 dark:text-white">Add Department Subject</h3>

            <form onSubmit={handleAddSubject} className="space-y-3 text-xs font-semibold">
              <div>
                <label className="block mb-1 text-slate-700 dark:text-slate-300">Subject Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 21CS51"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border"
                />
              </div>

              <div>
                <label className="block mb-1 text-slate-700 dark:text-slate-300">Subject Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Database Management Systems"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-slate-700 dark:text-slate-300">Semester</label>
                  <select
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border font-bold"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={s}>Semester {s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block mb-1 text-slate-700 dark:text-slate-300">Credits</label>
                  <input
                    type="number"
                    min="1"
                    max="6"
                    value={credits}
                    onChange={(e) => setCredits(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1 text-slate-700 dark:text-slate-300">Course Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border font-bold"
                >
                  <option value="THEORY">Theory</option>
                  <option value="PRACTICAL">Practical / Lab</option>
                  <option value="INTEGRATED">Integrated (Theory + Lab)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold"
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
