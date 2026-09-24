import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../store/authSlice';
import { RootState } from '../../store';
import { GlobalFooter } from '../common/GlobalFooter';
import {
  LayoutDashboard,
  Building2,
  Users,
  UserPlus,
  BookOpen,
  CalendarCheck,
  Award,
  FileSpreadsheet,
  FileText,
  Settings,
  LogOut,
  ChevronDown,
  ChevronRight,
  Shield,
  GraduationCap,
  Sparkles,
  Lock,
  UserCheck,
  AlertTriangle,
  Layers,
  Database,
  RefreshCw,
  Bell,
  User,
} from 'lucide-react';
import hodService, { HodDashboardData } from '../../services/hod.service';
import usePwa from '../../hooks/usePwa';
import PwaConfirmationModal from '../common/PwaConfirmationModal';

interface SubMenuItem {
  name: string;
  path: string;
  badge?: number;
}

interface NavGroup {
  id: string;
  title: string;
  icon: React.ElementType;
  path?: string;
  items?: SubMenuItem[];
}

export const HodLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);

  const [dashboardMeta, setDashboardMeta] = useState<HodDashboardData | null>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    students: false,
    faculty: true,
    subjects: false,
    attendance: false,
    academics: false,
    sheets: false,
  });

  const profileMenuRef = useRef<HTMLDivElement>(null);
  const [isDark] = useState(false);

  useEffect(() => {
    hodService.getDashboardData()
      .then((data) => setDashboardMeta(data))
      .catch((err) => console.warn('Could not load HOD metadata:', err));
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { showRefreshModal, setShowRefreshModal, confirmRefresh } = usePwa();

  const handleLogout = () => {
    dispatch(logout());
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const deptName = dashboardMeta?.department?.name || user?.department?.name || 'Computer Science & Engineering';
  const deptCode = dashboardMeta?.department?.code || user?.department?.code || 'CSE';
  const academicYear = dashboardMeta?.academicYear || '2026-27';
  const hodName = dashboardMeta?.hod?.name || user?.name || 'Head of Department';

  const pendingActions = dashboardMeta?.stats?.pendingFacultyActions || 0;

  // Exact Section 7 & Item 13 specification menu
  const navGroups: NavGroup[] = [
    {
      id: 'dashboard',
      title: 'Dashboard',
      icon: LayoutDashboard,
      path: '/hod/dashboard',
    },
    {
      id: 'students',
      title: 'Students',
      icon: GraduationCap,
      items: [
        { name: 'All Students', path: '/hod/students' },
        { name: 'Semester Wise', path: '/hod/students/semesters' },
        { name: 'Section Wise', path: '/hod/students/sections' },
      ],
    },
    {
      id: 'faculty',
      title: 'Faculty',
      icon: Users,
      items: [
        { name: 'Faculty List', path: '/hod/faculty' },
        { name: 'Create Faculty', path: '/hod/faculty/create' },
        { name: 'Faculty Assignments', path: '/hod/faculty/assignments' },
        { name: 'Faculty Access', path: '/hod/faculty/access' },
      ],
    },
    {
      id: 'subjects',
      title: 'Subjects',
      icon: BookOpen,
      items: [
        { name: 'Subject List', path: '/hod/subjects' },
        { name: 'Subject Assignment', path: '/hod/subjects/assign' },
        { name: 'Semester Subjects', path: '/hod/subjects/semesters' },
      ],
    },
    {
      id: 'attendance',
      title: 'Attendance',
      icon: CalendarCheck,
      items: [
        { name: 'Overview', path: '/hod/attendance' },
        { name: 'Semester Analysis', path: '/hod/attendance/semesters' },
        { name: 'Subject Analysis', path: '/hod/attendance/subjects' },
        { name: 'Section Analysis', path: '/hod/attendance/sections' },
        { name: 'Defaulters', path: '/hod/attendance/defaulters', badge: dashboardMeta?.stats?.attendanceDefaulters },
      ],
    },
    {
      id: 'academics',
      title: 'Academics',
      icon: Award,
      items: [
        { name: 'Marks Overview', path: '/hod/academics' },
        { name: 'Subject Analysis', path: '/hod/academics/subjects' },
        { name: 'Bit-wise Analysis', path: '/hod/academics/bitwise' },
        { name: 'Student Performance', path: '/hod/academics/performance' },
      ],
    },
    {
      id: 'sheets',
      title: 'Excel / Sheets',
      icon: FileSpreadsheet,
      items: [
        { name: 'Attendance Sheets', path: '/hod/sheets/attendance' },
        { name: 'Marks Sheets', path: '/hod/sheets/marks' },
        { name: 'Faculty Sheet Access', path: '/hod/sheets/access' },
        { name: 'Sync History', path: '/hod/sheets/sync-history' },
      ],
    },
    {
      id: 'reports',
      title: 'Reports',
      icon: FileText,
      path: '/hod/reports',
    },
    {
      id: 'settings',
      title: 'Settings',
      icon: Settings,
      path: '/hod/settings',
    },
  ];

  const currentPath = location.pathname;

  return (
    <div className={`min-h-screen ${isDark ? 'dark bg-slate-950 text-slate-100' : 'bg-[#f4f7fb] text-slate-800'} flex flex-col font-sans antialiased selection:bg-indigo-500 selection:text-white relative`}>
      
      {/* Background Decorative Ambient Blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[45vw] h-[45vw] rounded-full bg-gradient-to-br from-indigo-400/10 via-sky-300/10 to-transparent blur-3xl" />
        <div className="absolute top-[30%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-gradient-to-bl from-blue-400/10 via-indigo-300/10 to-transparent blur-3xl" />
        <div className="absolute bottom-[-10%] left-[20%] w-[35vw] h-[35vw] rounded-full bg-gradient-to-tr from-cyan-400/10 via-blue-300/10 to-transparent blur-3xl" />
      </div>

      <div className="flex flex-1 relative z-10 p-3 sm:p-4 md:p-6 gap-6 max-w-[1700px] w-full mx-auto">
        
        {/* ── Left Sidebar Navigation ────────────────────────────────────────── */}
        <aside className="hidden lg:flex flex-col w-[290px] shrink-0 glass-bar rounded-[32px] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.06)] border border-white/60 dark:border-slate-800/60 transition-all duration-300 backdrop-blur-xl">
          
          {/* Logo & ERP Portal Branding */}
          <div className="flex items-center gap-3.5 px-2 py-3 mb-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 ring-2 ring-white/80">
              <GraduationCap className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-slate-900 dark:text-white text-base tracking-tight leading-none">JCER ERP</span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm">HOD</span>
              </div>
              <p className="text-[11px] font-semibold text-slate-400 mt-1 truncate max-w-[170px]" title={deptName}>
                {deptCode} • Academic Control
              </p>
            </div>
          </div>

          {/* Department Scope Ribbon: STRICTLY LOCKED (Prompt Item 12) */}
          <div className="mb-4 mx-1 p-3.5 rounded-2xl bg-gradient-to-r from-indigo-50/90 to-blue-50/90 dark:from-slate-800/90 dark:to-indigo-950/40 border border-indigo-100/90 dark:border-indigo-900/50 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" /> Department
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-600 text-white shadow-xs">
                <Lock className="w-2.5 h-2.5" /> {deptCode} [LOCKED]
              </span>
            </div>
            <p className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-1.5 leading-snug line-clamp-1" title={deptName}>
              {deptName}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
              Academic Year: <span className="font-bold text-indigo-600 dark:text-indigo-400">{academicYear}</span>
            </p>
          </div>

          {/* Nav Links Accordion / List */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 custom-scrollbar text-xs">
            {navGroups.map((group) => {
              const Icon = group.icon;
              const hasSubItems = group.items && group.items.length > 0;
              const isGroupActive = hasSubItems
                ? group.items!.some((item) => currentPath === item.path || currentPath.startsWith(item.path + '/'))
                : currentPath === group.path;
              const isExpanded = expandedGroups[group.id] || isGroupActive;

              if (!hasSubItems && group.path) {
                return (
                  <Link
                    key={group.id}
                    to={group.path}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl font-semibold transition-all duration-200 group ${
                      isGroupActive
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-indigo-500/20 font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${isGroupActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-600'}`} />
                      <span>{group.title}</span>
                    </div>
                  </Link>
                );
              }

              return (
                <div key={group.id} className="space-y-1">
                  <button
                    onClick={() => toggleGroup(group.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl font-semibold transition-all duration-200 group ${
                      isGroupActive && !isExpanded
                        ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${isGroupActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 group-hover:text-indigo-600'}`} />
                      <span className={isGroupActive ? 'font-bold text-slate-900 dark:text-white' : ''}>{group.title}</span>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="pl-6 pr-1 space-y-1 border-l-2 border-indigo-100 dark:border-slate-800 ml-4 my-1">
                      {group.items!.map((subItem) => {
                        const isSubActive = currentPath === subItem.path || currentPath.startsWith(subItem.path + '/');
                        return (
                          <Link
                            key={subItem.path}
                            to={subItem.path}
                            className={`flex items-center justify-between px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all ${
                              isSubActive
                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900'
                            }`}
                          >
                            <span>{subItem.name}</span>
                            {subItem.badge !== undefined && subItem.badge > 0 && (
                              <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-full ${
                                isSubActive ? 'bg-white text-indigo-700' : 'bg-rose-500 text-white'
                              }`}>
                                {subItem.badge}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* User Card & Logout in Sidebar Bottom */}
          <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between px-2">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <img
                src={user?.profileImage || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&fit=crop'}
                alt="HOD Profile"
                className="w-8 h-8 rounded-full object-cover ring-2 ring-indigo-500/30"
              />
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                  {hodName}
                </p>
                <p className="text-[10px] text-slate-400 font-medium truncate">
                  HOD - {deptCode}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </aside>

        {/* ── Main Workspace ─────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0">
          
          {/* Header Bar: Item 12 Locked Department Header */}
          <header className="glass-bar rounded-[28px] px-6 py-4 mb-6 shadow-[0_15px_35px_rgba(0,0,0,0.04)] border border-white/60 dark:border-slate-800/60 flex flex-col md:flex-row md:items-center justify-between gap-4 backdrop-blur-xl">
            
            {/* Left: Permanent Department Lock Banner */}
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-900/40 shadow-xs">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Head of Department</span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-full bg-indigo-600 text-white shadow-xs">
                    <Lock className="w-2.5 h-2.5" /> Department: {deptCode} [LOCKED]
                  </span>
                </div>
                <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
                  {deptName}
                </h1>
                <p className="text-[11px] text-slate-500 font-medium">
                  Academic Year: <span className="font-bold text-indigo-600 dark:text-indigo-400">{academicYear}</span>
                </p>
              </div>
            </div>

            {/* Right: Quick Controls, Pending Actions & Profile */}
            <div className="flex items-center gap-3 self-end md:self-auto">
              {pendingActions > 0 && (
                <Link
                  to="/hod/faculty"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/80 text-xs font-bold hover:bg-amber-100 transition-colors shadow-xs"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>{pendingActions} Pending Authorization{pendingActions > 1 ? 's' : ''}</span>
                </Link>
              )}

              {/* Profile Dropdown */}
              <div className="relative" ref={profileMenuRef}>
                <button
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 shadow-sm hover:shadow transition-all text-left"
                >
                  <img
                    src={user?.profileImage || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&fit=crop'}
                    alt="HOD Avatar"
                    className="w-8 h-8 rounded-xl object-cover ring-2 ring-indigo-500/20"
                  />
                  <div className="hidden md:block">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">
                      {hodName}
                    </p>
                    <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold leading-tight">
                      HOD ({deptCode})
                    </p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400 ml-0.5" />
                </button>

                {profileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-60 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800">
                      <p className="text-xs font-bold text-slate-900 dark:text-white">{hodName}</p>
                      <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                          {deptCode} Department
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                          {academicYear}
                        </span>
                      </div>
                    </div>

                    <Link
                      to="/hod/settings"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <User className="w-4 h-4 text-slate-400" />
                      <span>HOD Profile & Settings</span>
                    </Link>

                    <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Page Body */}
          <main className="flex-1">
            <Outlet />
          </main>

          {/* Footer */}
          <GlobalFooter isDark={isDark} className="mt-8 mb-2" />
        </div>
      </div>

      <PwaConfirmationModal
        isOpen={showRefreshModal}
        onClose={() => setShowRefreshModal(false)}
        onConfirm={confirmRefresh}
      />
    </div>
  );
};

export default HodLayout;
