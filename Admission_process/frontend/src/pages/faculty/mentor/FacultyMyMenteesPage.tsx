import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Users,
  Search,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  Eye,
  AlertCircle,
  GraduationCap,
  Calendar,
  Layers,
  Filter,
} from 'lucide-react';
import { RootState } from '../../../store';
import { useAcademicYear } from '../../../context/AcademicYearContext';
import mentorService, {
  MenteeListItem,
  MentorCohortsData,
  CohortCardItem,
} from '../../../services/mentor.service';
import { toast } from 'react-toastify';

export const FacultyMyMenteesPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { academicYear } = useAcademicYear();
  const { user } = useSelector((state: RootState) => state.auth);

  const mentorName = useMemo(() => {
    if (!user) return 'Faculty Mentor';
    if (user.name) return user.name;
    const parts = [user.firstName, user.lastName].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : user.email || 'Faculty Mentor';
  }, [user]);

  // Cohort Discovery State
  const [cohortsData, setCohortsData] = useState<MentorCohortsData | null>(null);
  const [loadingCohorts, setLoadingCohorts] = useState<boolean>(true);

  // Flow State: Selected Batch determines if we show Cohort Selection or Mentee Table
  const initialBatchParam = searchParams.get('batch') || '';
  const [selectedBatch, setSelectedBatch] = useState<string>(initialBatchParam);
  const [selectedSemester, setSelectedSemester] = useState<string>('ALL');
  const [selectedSection, setSelectedSection] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>(searchParams.get('search') || '');

  // Mentee List Data
  const [loadingMentees, setLoadingMentees] = useState<boolean>(false);
  const [menteesError, setMenteesError] = useState<string | null>(null);
  const [rawMentees, setRawMentees] = useState<MenteeListItem[]>([]);

  // 1. Fetch Mentor Cohorts
  const fetchCohorts = async () => {
    setLoadingCohorts(true);
    try {
      const data = await mentorService.getMentorCohorts();
      setCohortsData(data);

      // If URL already had a batch param that matches an existing batch, use it
      if (initialBatchParam && data.batches?.includes(initialBatchParam)) {
        handleSelectBatch(initialBatchParam, data);
      }
    } catch (err: any) {
      console.error('Failed to load mentor cohorts:', err);
      toast.error('Unable to load mentee cohorts.');
    } finally {
      setLoadingCohorts(false);
    }
  };

  useEffect(() => {
    fetchCohorts();
  }, []);

  // When a batch is selected, set default semester (progression default)
  const handleSelectBatch = (batch: string, dataOverride?: MentorCohortsData) => {
    const data = dataOverride || cohortsData;
    setSelectedBatch(batch);
    setSearchParams({ batch });

    const sems = data?.semestersByBatch?.[batch] || [];
    if (sems.length > 0) {
      // Default to highest/current semester of that cohort
      const latestSem = Math.max(...sems);
      setSelectedSemester(String(latestSem));
    } else {
      setSelectedSemester('ALL');
    }
    setSelectedSection('ALL');
  };

  const handleBackToCohorts = () => {
    setSelectedBatch('');
    setSearchParams({});
    setRawMentees([]);
  };

  // 2. Fetch Mentees when batch or filters change
  const fetchMentees = async () => {
    if (!selectedBatch) return;
    setLoadingMentees(true);
    setMenteesError(null);
    try {
      const data = await mentorService.getMyMentees({
        admissionBatch: selectedBatch,
        semester: selectedSemester !== 'ALL' ? Number(selectedSemester) : undefined,
        section: selectedSection !== 'ALL' ? selectedSection : undefined,
        academicYear,
      });
      setRawMentees(data);
    } catch (err: any) {
      console.error('Failed to load mentees:', err);
      setMenteesError(err.response?.data?.error || 'Unable to load mentees.');
    } finally {
      setLoadingMentees(false);
    }
  };

  useEffect(() => {
    if (selectedBatch) {
      fetchMentees();
    }
  }, [selectedBatch, selectedSemester, selectedSection, academicYear]);

  // Alphanumeric USN Natural Sorting and In-Memory Search Filter
  const filteredAndSortedMentees = useMemo(() => {
    let list = [...rawMentees];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (m) =>
          (m.name && m.name.toLowerCase().includes(q)) ||
          (m.usn && m.usn.toLowerCase().includes(q))
      );
    }

    // Natural alphanumeric USN sorting (Ascending)
    list.sort((a, b) => {
      const usnA = a.usn || '';
      const usnB = b.usn || '';
      return usnA.localeCompare(usnB, undefined, { numeric: true, sensitivity: 'base' });
    });

    return list;
  }, [rawMentees, searchQuery]);

  // Derived Cohort Cards
  const cohortCards: CohortCardItem[] = useMemo(() => {
    if (!cohortsData) return [];
    if (cohortsData.cohorts && cohortsData.cohorts.length > 0) {
      return cohortsData.cohorts;
    }
    return (cohortsData.batches || []).map((b) => {
      const sems = cohortsData.semestersByBatch?.[b] || [];
      const currentSem = sems.length > 0 ? Math.max(...sems) : 1;
      return {
        batch: b,
        admissionBatch: b,
        menteeCount: 0,
        currentSemester: currentSem,
        semesters: sems,
        sections: cohortsData.sectionsByBatch?.[b] || [],
      };
    });
  }, [cohortsData]);

  const availableSemesters = selectedBatch && cohortsData?.semestersByBatch?.[selectedBatch]
    ? cohortsData.semestersByBatch[selectedBatch]
    : [];

  const availableSections = selectedBatch && cohortsData?.sectionsByBatch?.[selectedBatch]
    ? cohortsData.sectionsByBatch[selectedBatch]
    : [];

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* ════════════════════════════════════════════════════════════════════════════ */}
      {/* ── STEP 1: SELECT MENTEE COHORT (BATCH FIRST FLOW) ── */}
      {/* ════════════════════════════════════════════════════════════════════════════ */}
      {!selectedBatch ? (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-neutral-800 pb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                  <GraduationCap className="size-3.5" />
                  Cohort Directory
                </span>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Select Mentee Cohort
              </h1>
              <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">
                Choose an admission batch to view students assigned to you.
              </p>
            </div>

            <button
              onClick={fetchCohorts}
              disabled={loadingCohorts}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-700 dark:text-neutral-200 hover:bg-slate-50 text-xs font-bold transition shadow-xs cursor-pointer self-start sm:self-auto"
            >
              <RefreshCw className={`size-3.5 ${loadingCohorts ? 'animate-spin' : ''}`} />
              <span>Refresh Batches</span>
            </button>
          </div>

          {/* Dynamic Cohort Cards */}
          {loadingCohorts ? (
            <div className="py-24 text-center text-slate-400 space-y-3">
              <RefreshCw className="size-8 animate-spin mx-auto text-indigo-500" />
              <p className="text-xs font-medium">Discovering assigned admission cohorts...</p>
            </div>
          ) : cohortCards.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cohortCards.map((cohort) => (
                <div
                  key={cohort.batch}
                  className="rounded-2xl border border-slate-200/90 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md p-6 shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 transition duration-200 flex flex-col justify-between group"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-neutral-500">
                        Admission Batch
                      </span>
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                        {cohort.menteeCount > 0 ? `${cohort.menteeCount} Active Mentees` : 'Active Cohort'}
                      </span>
                    </div>

                    <div>
                      <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                        {cohort.batch}
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">
                        Current Semester: <span className="font-bold text-slate-700 dark:text-neutral-200">Semester {cohort.currentSemester}</span>
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-neutral-800/80 text-[11px] text-slate-500">
                      <span className="font-semibold text-slate-400">Progression:</span>
                      {cohort.semesters.map((s) => (
                        <span
                          key={s}
                          className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 font-bold"
                        >
                          Sem {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-6 mt-4">
                    <button
                      onClick={() => handleSelectBatch(cohort.batch)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs hover:shadow-indigo-500/20 transition cursor-pointer"
                    >
                      <span>Open Mentees</span>
                      <ArrowRight className="size-3.5 group-hover:translate-x-0.5 transition" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center rounded-2xl border border-dashed border-slate-300 dark:border-neutral-800 bg-white/40 dark:bg-neutral-900/40 space-y-3">
              <Users className="size-10 text-slate-300 dark:text-neutral-600 mx-auto" />
              <h3 className="text-sm font-bold text-slate-700 dark:text-neutral-300">
                No Mentee Cohorts Found
              </h3>
              <p className="text-xs text-slate-500 dark:text-neutral-400 max-w-md mx-auto">
                You do not have any active mentee assignments assigned by the Head of Department yet.
              </p>
            </div>
          )}
        </div>
      ) : (
        /* ════════════════════════════════════════════════════════════════════════════ */
        /* ── STEP 2: MENTEE DIRECTORY FOR SELECTED COHORT ── */
        /* ════════════════════════════════════════════════════════════════════════════ */
        <div className="space-y-6">
          {/* Top Banner with Navigation */}
          <div className="flex flex-col gap-4 border-b border-slate-200 dark:border-neutral-800 pb-5">
            <div className="flex items-center justify-between">
              <button
                onClick={handleBackToCohorts}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-700 dark:text-neutral-200 hover:bg-slate-50 text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <ArrowLeft className="size-3.5" />
                <span>← Back to Cohort Selection</span>
              </button>

              <button
                onClick={fetchMentees}
                disabled={loadingMentees}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-700 dark:text-neutral-200 hover:bg-slate-50 text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <RefreshCw className={`size-3.5 ${loadingMentees ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            {/* Batch Context Strip */}
            <div className="p-4 rounded-2xl border border-slate-200/90 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/70 shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-6">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Admission Batch
                  </span>
                  <div className="text-base font-black text-slate-900 dark:text-white">
                    {selectedBatch}
                  </div>
                </div>

                <div className="h-8 w-px bg-slate-200 dark:bg-neutral-800 hidden sm:block" />

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Mentor
                  </span>
                  <div className="text-base font-bold text-indigo-600 dark:text-indigo-400">
                    {mentorName}
                  </div>
                </div>

                <div className="h-8 w-px bg-slate-200 dark:bg-neutral-800 hidden sm:block" />

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Active Mentees
                  </span>
                  <div className="text-base font-black text-slate-900 dark:text-white">
                    {filteredAndSortedMentees.length}
                  </div>
                </div>
              </div>

              {/* Quick Semester Badges */}
              {availableSemesters.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-[11px] font-bold text-slate-400 mr-1">Progression:</span>
                  {availableSemesters.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSelectedSemester(String(s))}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        selectedSemester === String(s)
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-300'
                      }`}
                    >
                      Semester {s}
                    </button>
                  ))}
                  <button
                    onClick={() => setSelectedSemester('ALL')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      selectedSemester === 'ALL'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-300'
                    }`}
                  >
                    All Semesters
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Filters Bar: Section + Search by USN/Name */}
          <div className="rounded-2xl border border-slate-200/90 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/70 p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <span className="text-xs font-bold text-slate-500 dark:text-neutral-400 flex items-center gap-1.5">
                <Filter className="size-3.5" />
                <span>Filters:</span>
              </span>

              {/* Section Filter */}
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs font-semibold text-slate-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Sections</option>
                {availableSections.map((sec) => (
                  <option key={sec} value={sec}>
                    Section {sec}
                  </option>
                ))}
              </select>

              {/* Semester Dropdown (alternative to pills) */}
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs font-semibold text-slate-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Semesters</option>
                {availableSemesters.map((s) => (
                  <option key={s} value={s}>
                    Semester {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 size-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by USN or Student Name..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs text-slate-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════════════════════════ */}
          {/* ── MY MENTEES TABLE (STRICT 4 COLUMNS: SL NO | USN | STUDENT NAME | ACTION) ── */}
          {/* ════════════════════════════════════════════════════════════════════════════ */}
          <div className="rounded-2xl border border-slate-200/90 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md shadow-xs overflow-hidden">
            {menteesError ? (
              <div className="py-12 text-center space-y-3">
                <AlertCircle className="size-8 text-rose-500 mx-auto" />
                <p className="text-xs font-bold text-rose-600 dark:text-rose-400">{menteesError}</p>
                <button
                  onClick={fetchMentees}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition"
                >
                  Retry
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs table-fixed">
                  <thead className="bg-[#111111] dark:bg-neutral-950 text-white uppercase tracking-wider font-extrabold border-b border-neutral-800 sticky top-0 z-10">
                    <tr>
                      <th style={{ width: '70px' }} className="py-3 px-3 text-center uppercase tracking-wider text-[11px]">
                        SL NO
                      </th>
                      <th style={{ width: '150px' }} className="py-3 px-4 uppercase tracking-wider text-[11px]">
                        USN
                      </th>
                      <th className="py-3 px-6 uppercase tracking-wider text-[11px]">
                        STUDENT NAME
                      </th>
                      <th style={{ width: '130px' }} className="py-3 px-4 text-center uppercase tracking-wider text-[11px]">
                        SEMESTER
                      </th>
                      <th style={{ width: '160px' }} className="py-3 px-4 uppercase tracking-wider text-[11px]">
                        DEPARTMENT
                      </th>
                      <th style={{ width: '140px' }} className="py-3 px-4 text-center uppercase tracking-wider text-[11px]">
                        ACTION
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-neutral-800 text-slate-700 dark:text-neutral-300">
                    {loadingMentees ? (
                      <tr>
                        <td colSpan={6} className="py-16 text-center text-slate-400">
                          <RefreshCw className="size-5 animate-spin mx-auto mb-2 text-indigo-500" />
                          <span className="font-semibold text-xs">Loading assigned mentees...</span>
                        </td>
                      </tr>
                    ) : filteredAndSortedMentees.length > 0 ? (
                      filteredAndSortedMentees.map((st, index) => {
                        const slNo = String(index + 1).padStart(2, '0');
                        return (
                          <tr
                            key={st.id}
                            onClick={() => navigate(`/mentor/mentees/${st.id}`)}
                            className="h-[52px] hover:bg-indigo-50/40 dark:hover:bg-neutral-800/40 transition cursor-pointer group"
                          >
                            {/* 1. SL NO (70px) */}
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-400 group-hover:text-indigo-600 transition">
                              {slNo}
                            </td>

                            {/* 2. USN (150px) */}
                            <td className="py-2.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                              {st.usn || '—'}
                            </td>

                            {/* 3. STUDENT NAME (flex) */}
                            <td className="py-2.5 px-6 font-semibold text-slate-900 dark:text-neutral-100">
                              <span className="truncate">{st.name}</span>
                            </td>

                            {/* 4. SEMESTER (130px) */}
                            <td className="py-2.5 px-4 text-center font-bold text-slate-800 dark:text-neutral-200">
                              <span>Sem {st.semester}{st.section ? ` - ${st.section}` : ''}</span>
                            </td>

                            {/* 5. DEPARTMENT (160px) */}
                            <td className="py-2.5 px-4 font-bold text-slate-800 dark:text-neutral-200">
                              <span>{st.departmentCode || st.department || '—'}</span>
                            </td>

                            {/* 6. ACTION (140px) */}
                            <td className="py-2.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                              <Link
                                to={`/mentor/mentees/${st.id}`}
                                className="inline-flex items-center justify-center gap-1 px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white dark:bg-indigo-950/60 dark:text-indigo-300 dark:hover:bg-indigo-600 dark:hover:text-white font-bold text-xs transition shadow-xs cursor-pointer"
                              >
                                <span>View Profile</span>
                              </Link>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-14 text-center text-slate-400 dark:text-neutral-500">
                          No assigned mentees found for this selection.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FacultyMyMenteesPage;
