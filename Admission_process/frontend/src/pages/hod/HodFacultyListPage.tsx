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
      
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-6 h-6 text-indigo-600" />
              <span>Department Faculty Management</span>
            </h1>
            <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
              {faculty.length} Members
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage teaching assignments, monitor Dean/Principal authorizations, and control sheet permissions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/hod/faculty/assignments"
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 shadow-xs flex items-center gap-1.5"
          >
            <Layers className="w-3.5 h-3.5 text-indigo-600" />
            <span>Assignments Matrix</span>
          </Link>

          <Link
            to="/hod/faculty/create"
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 flex items-center gap-1.5 transition-all transform hover:-translate-y-0.5"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create Faculty</span>
          </Link>
        </div>
      </div>

      {/* ── Search & Filter ─────────────────────────────────────────────────── */}
      <div className="glass-card rounded-2xl p-4 border border-white/60 dark:border-slate-800/60 shadow-sm bg-white/80 dark:bg-slate-900/80 flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search faculty by name, email, or designation..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="hidden sm:flex items-center gap-3 text-xs text-slate-500 font-semibold">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Active Account
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Pending Approval
          </span>
        </div>
      </div>

      {/* ── Faculty Table (Prompt Item 17) ───────────────────────────────────── */}
      <div className="glass-card rounded-3xl border border-white/60 dark:border-slate-800/60 shadow-sm overflow-hidden bg-white/80 dark:bg-slate-900/80">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/90 dark:bg-slate-800/90 text-slate-500 uppercase tracking-wider font-extrabold border-b border-slate-200/60 dark:border-slate-700/60">
              <tr>
                <th className="py-3.5 px-4">Faculty Member</th>
                <th className="py-3.5 px-4">Subject</th>
                <th className="py-3.5 px-4">Sem</th>
                <th className="py-3.5 px-4">Section</th>
                <th className="py-3.5 px-4">Authorization</th>
                <th className="py-3.5 px-4">Account</th>
                <th className="py-3.5 px-4">Sheet Access</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-indigo-600 border-t-transparent" />
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
                    <tr key={member.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-xs ring-2 ring-white shadow-xs">
                            {member.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">{member.name}</div>
                            <div className="text-[11px] text-slate-400">{member.designation}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                        {primaryAssignment ? (
                          <div>
                            <div>{primaryAssignment.subjectName || 'Allotted Subject'}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{primaryAssignment.subjectCode}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No Subject Assigned</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-700 dark:text-slate-300">
                        {primaryAssignment ? `Sem ${primaryAssignment.semester}` : '—'}
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-700 dark:text-slate-300">
                        {primaryAssignment ? `Sec ${primaryAssignment.section}` : '—'}
                      </td>

                      {/* Authorization Status Badge */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider ${
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
                          <div className="text-[9px] text-slate-400 font-bold mt-0.5">
                            Req to: {member.authority}
                          </div>
                        )}
                      </td>

                      {/* Account Status Badge */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          member.accountStatus === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {member.accountStatus === 'ACTIVE' ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Sheet Access Badge */}
                      <td className="py-3.5 px-4">
                        {primaryAssignment ? (
                          <div className="flex items-center gap-1.5 text-[10px] font-bold">
                            <span className={`px-1.5 py-0.5 rounded ${
                              primaryAssignment.attendanceAccess ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-500'
                            }`}>
                              Attn
                            </span>
                            <span className={`px-1.5 py-0.5 rounded ${
                              primaryAssignment.marksAccess ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200 text-slate-500'
                            }`}>
                              Marks
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[10px]">None</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          to={`/hod/faculty/${member.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 font-bold text-[11px] transition-colors"
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
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No Faculty Found</p>
                    <p className="text-xs text-slate-400 mt-1">Click "Create Faculty" to add a new faculty member to your department.</p>
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
