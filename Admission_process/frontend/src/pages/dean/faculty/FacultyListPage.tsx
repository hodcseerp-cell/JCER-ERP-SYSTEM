import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, ShieldCheck, FileCheck2, Filter, AlertCircle } from 'lucide-react';
import deanService, { FacultyRecord, DepartmentRecord } from '../../../services/dean.service';
import Skeleton from '../../../components/common/Skeleton';
import { toast } from 'react-toastify';

export const FacultyListPage: React.FC = () => {
  const navigate = useNavigate();
  const [faculty, setFaculty] = useState<FacultyRecord[]>([]);
  const [departments, setDepartments] = useState<DepartmentRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  const fetchDependencies = async () => {
    try {
      const depts = await deanService.getDepartments();
      setDepartments(depts);
    } catch (err) {
      toast.error('Failed to load departments');
    }
  };

  const fetchFaculty = async () => {
    try {
      setLoading(true);
      const data = await deanService.getFacultyList({
        search: search || undefined,
        departmentId: selectedDept,
        status: selectedStatus,
      });
      setFaculty(data);
    } catch (err) {
      toast.error('Failed to load faculty directory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDependencies();
  }, []);

  useEffect(() => {
    fetchFaculty();
  }, [selectedDept, selectedStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchFaculty();
  };

  return (
    <div className="space-y-6">

      {/* ── TOP FILTERS & QUICK ACTIONS ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-2xl bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border border-neutral-200/80 dark:border-neutral-800/80">
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative min-w-[220px] flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search faculty by name, email, or designation..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700/80 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
          </div>

          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700/80 focus:outline-none"
          >
            <option value="ALL">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.code} - {d.name}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700/80 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive / Pending</option>
            <option value="SUSPENDED">Suspended</option>
          </select>

          <button
            type="submit"
            className="px-3 py-2 rounded-xl text-xs font-bold bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300"
          >
            Filter
          </button>
        </form>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigate('/dean/faculty/authorizations')}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 text-xs font-bold transition-all border border-rose-500/20"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Authorizations Queue</span>
          </button>
          <button
            onClick={() => navigate('/dean/faculty/assignments')}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-bold transition-all"
          >
            <FileCheck2 className="w-4 h-4" />
            <span>Assignments View</span>
          </button>
        </div>
      </div>

      {/* ── TABLE CARD ── */}
      <div className="rounded-3xl bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border border-neutral-200/80 dark:border-neutral-800/80 overflow-hidden shadow-xs">
        <div className="p-6 border-b border-neutral-100 dark:border-neutral-800">
          <h2 className="text-base font-bold text-neutral-900 dark:text-white">College Teaching Faculty Directory</h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Active faculty members, department designations, assigned curriculum subjects, and tenure start dates.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30 text-neutral-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-6 font-semibold">Faculty Name</th>
                <th className="py-3 px-6 font-semibold">Department</th>
                <th className="py-3 px-6 font-semibold">Official Email</th>
                <th className="py-3 px-6 font-semibold">Designation</th>
                <th className="py-3 px-6 font-semibold">Assigned Subjects</th>
                <th className="py-3 px-6 font-semibold text-center">Status</th>
                <th className="py-3 px-6 font-semibold">Joining Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
              {loading ? (
                [1, 2, 3, 4].map((i) => (
                  <tr key={i}>
                    <td className="py-4 px-6"><Skeleton className="w-32 h-4" /></td>
                    <td className="py-4 px-6"><Skeleton className="w-16 h-4" /></td>
                    <td className="py-4 px-6"><Skeleton className="w-32 h-4" /></td>
                    <td className="py-4 px-6"><Skeleton className="w-24 h-4" /></td>
                    <td className="py-4 px-6"><Skeleton className="w-28 h-4" /></td>
                    <td className="py-4 px-6 text-center"><Skeleton className="w-16 h-4 mx-auto" /></td>
                    <td className="py-4 px-6"><Skeleton className="w-20 h-4" /></td>
                  </tr>
                ))
              ) : faculty.length ? (
                faculty.map((fac) => (
                  <tr key={fac.id} className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/30 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-center text-xs overflow-hidden">
                          {fac.profileImage ? (
                            <img src={fac.profileImage} alt={fac.name} className="w-full h-full object-cover" />
                          ) : (
                            fac.name.charAt(0)
                          )}
                        </div>
                        <div>
                          <span className="font-extrabold text-neutral-900 dark:text-white block">{fac.name}</span>
                          <span className="text-[10px] text-neutral-400">{fac.phone || 'Phone not set'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-bold text-neutral-800 dark:text-neutral-200">
                      <span className="px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200/60 dark:border-neutral-700/60">
                        {fac.departmentCode}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-medium text-neutral-600 dark:text-neutral-400">
                      {fac.email}
                    </td>
                    <td className="py-4 px-6 font-semibold text-neutral-700 dark:text-neutral-300">
                      {fac.designation}
                    </td>
                    <td className="py-4 px-6 text-neutral-600 dark:text-neutral-400 font-medium max-w-[200px] truncate">
                      {fac.subjects}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                          fac.status === 'ACTIVE'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {fac.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-neutral-500">
                      {fac.joiningDate ? new Date(fac.joiningDate).toLocaleDateString() : 'N/A'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-neutral-400">
                    No faculty records found.
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

export default FacultyListPage;
