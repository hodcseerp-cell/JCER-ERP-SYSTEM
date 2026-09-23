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
  ShieldCheck,
  BookOpen,
  Layers,
  Calendar,
  FileText,
  Bell,
  User,
  Settings,
  LogOut,
  ChevronDown,
  Shield,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import hodService, { HodDashboardData } from '../../services/hod.service';
import usePwa from '../../hooks/usePwa';
import PwaConfirmationModal from '../common/PwaConfirmationModal';

interface MenuItem {
  name: string;
  path: string;
  icon: React.ElementType;
  badge?: number;
}

interface MenuGroup {
  title: string;
  items: MenuItem[];
}

export const HodLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);

  const [dashboardMeta, setDashboardMeta] = useState<HodDashboardData | null>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const [isDark, setIsDark] = useState(false);

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

  const { canInstall, handleInstall, triggerRefresh, confirmRefresh, showRefreshModal, setShowRefreshModal } = usePwa();

  const handleLogout = () => {
    dispatch(logout());
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const menuGroups: MenuGroup[] = [
    {
      title: 'OVERVIEW',
      items: [
        { name: 'Dashboard', path: '/hod/dashboard', icon: LayoutDashboard },
        { name: 'My Department', path: '/hod/department', icon: Building2 },
      ],
    },
    {
      title: 'FACULTY & ACADEMICS',
      items: [
        { name: 'Faculty Management', path: '/hod/faculty', icon: Users },
        {
          name: 'Faculty Authorization',
          path: '/hod/faculty/authorizations',
          icon: ShieldCheck,
          badge: dashboardMeta?.stats?.pendingAuthorizations && dashboardMeta.stats.pendingAuthorizations > 0
            ? dashboardMeta.stats.pendingAuthorizations
            : undefined,
        },
        { name: 'Subjects', path: '/hod/subjects', icon: BookOpen },
        { name: 'Academic Workload', path: '/hod/workload', icon: Layers },
        { name: 'Timetable', path: '/hod/timetable', icon: Calendar },
      ],
    },
    {
      title: 'MANAGEMENT & INSIGHTS',
      items: [
        { name: 'Reports', path: '/hod/reports', icon: FileText },
        { name: 'Notifications', path: '/hod/notifications', icon: Bell },
        { name: 'Profile', path: '/hod/profile', icon: User },
        { name: 'Settings', path: '/hod/settings', icon: Settings },
      ],
    },
  ];

  const currentPath = location.pathname;
  const deptName = dashboardMeta?.department?.name || user?.department?.name || 'Department of Engineering';
  const deptCode = dashboardMeta?.department?.code || user?.department?.code || 'DEPT';
  const academicYear = dashboardMeta?.academicYear || '2026-27';

  return (
    <div className={`min-h-screen ${isDark ? 'dark bg-slate-950 text-slate-100' : 'bg-[#f4f7fb] text-slate-800'} flex flex-col font-sans antialiased selection:bg-indigo-500 selection:text-white relative`}>
      
      {/* Background Decorative Ambient Blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[45vw] h-[45vw] rounded-full bg-gradient-to-br from-indigo-400/10 via-sky-300/10 to-transparent blur-3xl" />
        <div className="absolute top-[30%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-gradient-to-bl from-blue-400/10 via-indigo-300/10 to-transparent blur-3xl" />
        <div className="absolute bottom-[-10%] left-[20%] w-[35vw] h-[35vw] rounded-full bg-gradient-to-tr from-cyan-400/10 via-blue-300/10 to-transparent blur-3xl" />
      </div>

      <div className="flex flex-1 relative z-10 p-3 sm:p-4 md:p-6 gap-6 max-w-[1700px] w-full mx-auto">
        
        {/* Floating Sidebar */}
        <aside className="hidden lg:flex flex-col w-[280px] shrink-0 glass-bar rounded-[32px] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.06)] border border-white/60 dark:border-slate-800/60 transition-all duration-300 backdrop-blur-xl">
          {/* Logo & ERP Portal Branding */}
          <div className="flex items-center gap-3.5 px-2 py-3 mb-4">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 ring-2 ring-white/80">
              <GraduationCap className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-slate-900 dark:text-white text-base tracking-tight leading-none">JCER ERP</span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm">HOD</span>
              </div>
              <p className="text-[11px] font-semibold text-slate-400 mt-1 truncate max-w-[170px]" title={deptName}>
                {deptCode} • Head of Dept
              </p>
            </div>
          </div>

          {/* Department Scope Ribbon */}
          <div className="mb-4 mx-1 p-3 rounded-2xl bg-gradient-to-r from-indigo-50/80 to-blue-50/80 dark:from-slate-800/80 dark:to-indigo-950/40 border border-indigo-100/80 dark:border-indigo-900/40">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-400 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" /> Assigned Dept
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-200/60 dark:bg-indigo-900/60 text-indigo-900 dark:text-indigo-200">
                {deptCode}
              </span>
            </div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 line-clamp-1" title={deptName}>
              {deptName}
            </p>
          </div>

          {/* Nav Links */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-6 custom-scrollbar">
            {menuGroups.map((group, groupIdx) => (
              <div key={groupIdx} className="space-y-1.5">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-3">
                  {group.title}
                </p>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentPath === item.path || (item.path !== '/hod/dashboard' && currentPath.startsWith(item.path));
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl font-semibold text-xs transition-all duration-200 group ${
                        isActive
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-indigo-500/20 font-bold'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-600'}`} />
                        <span>{item.name}</span>
                      </div>
                      {item.badge !== undefined && (
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          isActive
                            ? 'bg-white text-indigo-700 shadow-sm'
                            : 'bg-rose-500 text-white shadow-sm'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            ))}
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
                  {user?.name || 'Dr. Rahul Sharma'}
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

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header Bar */}
          <header className="glass-bar rounded-[28px] px-6 py-3.5 mb-6 shadow-[0_15px_35px_rgba(0,0,0,0.04)] border border-white/60 dark:border-slate-800/60 flex items-center justify-between gap-4 backdrop-blur-xl">
            {/* Left Page Title & Department Indicator */}
            <div className="flex items-center gap-3">
              <div className="lg:hidden flex items-center">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md">
                  <GraduationCap className="w-5 h-5" />
                </div>
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <span>HOD Dashboard</span>
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                    <Sparkles className="w-3 h-3" /> {deptCode}
                  </span>
                </h1>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hidden sm:block">
                  {deptName} • Academic Year: <span className="text-indigo-600 dark:text-indigo-400 font-bold">{academicYear}</span>
                </p>
              </div>
            </div>

            {/* Right Quick Controls */}
            <div className="flex items-center gap-3">
              {/* Notification Icon */}
              <Link
                to="/hod/notifications"
                className="relative p-2.5 rounded-2xl bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:text-indigo-600 hover:shadow-md transition-all border border-slate-200/60 dark:border-slate-700/60"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
              </Link>

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
                      {user?.name || 'Dr. Rahul Sharma'}
                    </p>
                    <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold leading-tight">
                      HOD ({deptCode})
                    </p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400 ml-0.5" />
                </button>

                {profileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800">
                      <p className="text-xs font-bold text-slate-900 dark:text-white">{user?.name}</p>
                      <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
                      <span className="mt-1.5 inline-block text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                        {deptName}
                      </span>
                    </div>

                    <Link
                      to="/hod/profile"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <User className="w-4 h-4 text-slate-400" />
                      <span>HOD Profile</span>
                    </Link>

                    <Link
                      to="/hod/settings"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <Settings className="w-4 h-4 text-slate-400" />
                      <span>Settings</span>
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
