import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  UserPlus,
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  Key,
  Settings2,
  Lock,
  Layers,
  Search,
  Filter,
  Eye,
  FileSpreadsheet,
  RefreshCw,
} from 'lucide-react';
import hodService, { HodFacultyItem } from '../../services/hod.service';

export const HodFacultyListPage: React.FC = () => {
  const [faculty, setFaculty] = useState<HodFacultyItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    fetchFaculty();
  }, []);

  const fetchFaculty = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await hodService.getFacultyList();
      setFaculty(data);
    } catch (err: any) {
      console.error('Failed to load faculty:', err);
      setError('Unable to load department faculty list.');
    } finally {
      setLoading(false);
    }
  };

  const filteredFaculty = faculty.filter((f) => {
    const term = searchTerm.toLowerCase();
    return (
      f.name.toLowerCase().includes(term) ||
      f.email.toLowerCase().includes(term) ||
      f.designation.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      
      {/* ── Page Header (Admin Style) ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-neutral-900 text-white rounded-2xl px-5 py-3 shadow-sm border border-neutral-800">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">
              Teaching Faculty
            </span>
            <div className="text-2xl font-black mt-0.5">
              {faculty.length} <span className="text-xs font-semibold text-neutral-400">members</span>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-extrabold text-neutral-900 dark:text-white">
              Faculty Management
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Manage teaching staff, track Dean/Principal authorizations, and control sheet permissions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => fetchFaculty()}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors shadow-xs flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-neutral-500 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <Link
            to="/hod/faculty/assignments"
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors shadow-xs flex items-center gap-1.5"
          >
            <Layers className="w-3.5 h-3.5 text-[#0c1a40] dark:text-blue-400" />
            <span>Assignments Matrix</span>
          </Link>

          <Link
            to="/hod/faculty/create"
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#070e22] via-[#0c1a40] to-[#0f245c] hover:from-[#0a1533] hover:to-[#142c6b] text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all transform hover:-translate-y-0.5 active:translate-y-0 border border-[#1e3a8a]/40"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create Faculty</span>
          </Link>
        </div>
      </div>

      {/* ── Search & Filter Bar ─────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl p-4 border border-neutral-200/80 dark:border-neutral-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search faculty by name, email, or designation..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>

        <div className="flex items-center gap-4 text-xs text-neutral-500 font-semibold">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Active Account
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Pending Approval
          </span>
        </div>
      </div>

      {/* ── Faculty Table (Admin Table Style) ─────────────────────────────────── */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#111111] dark:bg-neutral-950 text-white uppercase tracking-wider font-extrabold border-b border-neutral-800">
              <tr>
                <th className="py-3.5 px-4">Faculty Member</th>
                <th className="py-3.5 px-4">Subject</th>
                <th className="py-3.5 px-4 text-center">Sem</th>
                <th className="py-3.5 px-4 text-center">Authorization</th>
                <th className="py-3.5 px-4 text-center">Account</th>
                <th className="py-3.5 px-4 text-center">Sheet Access</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-400">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-violet-600 border-t-transparent" />
                    <p className="mt-2 text-xs font-bold">Loading department faculty...</p>
                  </td>
                </tr>
              ) : filteredFaculty.length > 0 ? (
                filteredFaculty.map((member) => {
                  const primaryAssignment = member.assignments?.[0];
                  const isPending = member.authorizationStatus === 'PENDING' || member.accountStatus === 'PENDING_AUTHORIZATION';
                  const isApproved = member.authorizationStatus === 'APPROVED' && member.accountStatus === 'ACTIVE';
                  const isRejected = member.authorizationStatus === 'REJECTED';

                  return (
                    <tr key={member.id} className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-2xl bg-neutral-900 text-white flex items-center justify-center font-bold text-xs ring-1 ring-neutral-200 shadow-xs">
                            {member.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-neutral-900 dark:text-white">{member.name}</div>
                            <div className="text-[11px] text-neutral-400">{member.designation}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-neutral-800 dark:text-neutral-200">
                        {primaryAssignment ? (
                          <div>
                            <div>{primaryAssignment.subjectName || 'Allotted Subject'}</div>
                            <div className="text-[10px] text-neutral-400 font-mono">{primaryAssignment.subjectCode}</div>
                          </div>
                        ) : (
                          <span className="text-neutral-400 italic">No Subject Assigned</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center font-bold text-neutral-700 dark:text-neutral-300">
                        {primaryAssignment ? `Sem ${primaryAssignment.semester}` : '—'}
                      </td>

                      {/* Authorization Status Badge */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider ${
                          isApproved
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : isRejected
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}>
                          {isApproved ? <CheckCircle2 className="w-3 h-3" /> : isRejected ? <XCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {member.authorizationStatus || 'APPROVED'}
                        </span>
                        {isPending && member.authority && (
                          <div className="text-[9px] text-neutral-400 font-bold mt-0.5">
                            Req: {member.authority}
                          </div>
                        )}
                      </td>

                      {/* Account Status Badge */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          member.accountStatus === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:border-emerald-800'
                            : 'bg-neutral-100 text-neutral-600 border border-neutral-200 dark:border-neutral-700'
                        }`}>
                          {member.accountStatus === 'ACTIVE' ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Sheet Access Badge */}
                      <td className="py-3.5 px-4 text-center">
                        {primaryAssignment ? (
                          <div className="inline-flex items-center gap-1 text-[10px] font-bold">
                            <span className={`px-1.5 py-0.5 rounded ${
                              primaryAssignment.attendanceAccess ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-200 text-neutral-500'
                            }`}>
                              Attn
                            </span>
                            <span className={`px-1.5 py-0.5 rounded ${
                              primaryAssignment.marksAccess ? 'bg-indigo-100 text-indigo-800' : 'bg-neutral-200 text-neutral-500'
                            }`}>
                              Marks
                            </span>
                          </div>
                        ) : (
                          <span className="text-neutral-400 text-[10px]">None</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          to={`/hod/faculty/${member.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-900 hover:text-white dark:bg-neutral-800 dark:hover:bg-neutral-100 dark:hover:text-neutral-900 text-neutral-800 dark:text-neutral-200 font-bold text-[11px] transition-all"
                        >
                          <Settings2 className="w-3.5 h-3.5" />
                          <span>Manage</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-400">
                    <Users className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
                    <p className="text-sm font-bold text-neutral-700 dark:text-neutral-300">No Faculty Found</p>
                    <p className="text-xs text-neutral-400 mt-1">Click "Create Faculty" to add a new faculty member to your department.</p>
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

export default HodFacultyListPage;
