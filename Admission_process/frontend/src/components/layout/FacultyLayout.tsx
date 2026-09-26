import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../store/authSlice';
import { RootState } from '../../store';
import { GlobalFooter } from '../common/GlobalFooter';
import {
  LayoutDashboard,
  CalendarCheck,
  Award,
  BarChart3,
  User,
  LogOut,
  Building2,
  Menu,
  X,
  ChevronDown,
} from 'lucide-react';
import usePwa from '../../hooks/usePwa';
import PwaConfirmationModal from '../common/PwaConfirmationModal';

interface MenuItem {
  name: string;
  path: string;
  icon: React.ElementType;
}

export const FacultyLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const { showRefreshModal, setShowRefreshModal, confirmRefresh } = usePwa();

  const handleLogout = () => {
    setProfileMenuOpen(false);
    dispatch(logout());
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const facultyName = user?.name || 'Faculty Member';
  const employeeId = user?.employeeId || user?.id || 'FAC-2026-001';
  const deptName = user?.department?.name || 'Computer Science & Engineering';
  const deptCode = user?.department?.code || 'CSE';
  const academicYear = '2026-27';

  // Exactly 4 main navigation menus (Faculty Scope)
  const menuItems: MenuItem[] = [
    { name: 'Overview', path: '/faculty/dashboard', icon: LayoutDashboard },
    { name: 'Attendance', path: '/faculty/attendance', icon: CalendarCheck },
    { name: 'Bitwise Marks', path: '/faculty/bitwise-marks', icon: Award },
    { name: 'Analytics', path: '/faculty/analytics', icon: BarChart3 },
  ];

  const subNavTabs = [
    { name: 'Overview', path: '/faculty/dashboard' },
    { name: 'Attendance', path: '/faculty/attendance' },
    { name: 'Bitwise Marks', path: '/faculty/bitwise-marks' },
    { name: 'Analytics', path: '/faculty/analytics' },
  ];

  const getActiveNavPath = (currentPath: string): string => {
    if (currentPath === '/faculty' || currentPath === '/faculty/overview' || currentPath.startsWith('/faculty/dashboard')) {
      return '/faculty/dashboard';
    }
    if (currentPath.startsWith('/faculty/attendance')) return '/faculty/attendance';
    if (currentPath.startsWith('/faculty/bitwise-marks')) return '/faculty/bitwise-marks';
    if (currentPath.startsWith('/faculty/analytics')) return '/faculty/analytics';
    return '/faculty/dashboard';
  };

  const activeNavPath = getActiveNavPath(location.pathname);

  const getPageTitle = () => {
    switch (activeNavPath) {
      case '/faculty/attendance':
        return 'Attendance';
      case '/faculty/bitwise-marks':
        return 'Bitwise Marks';
      case '/faculty/analytics':
        return 'Analytics';
      case '/faculty/dashboard':
      default:
        return 'Faculty Dashboard';
    }
  };

  const getPageSubtitle = () => {
    return 'Teaching, attendance, marks & academic performance';
  };

  return (
    <div className="min-h-screen max-w-full overflow-x-hidden flex text-neutral-900 dark:text-neutral-100 transition-colors duration-300 font-sans pb-6 pr-6">
      
      {/* ── MOBILE BACKDROP ── */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-neutral-950/50 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      {/* ── FLOATING SIDEBAR (EXACT HOD DASHBOARD STYLE) ── */}
      <aside
        className={`fixed left-6 top-6 bottom-6 w-[280px] min-w-[280px] max-w-[280px] flex-shrink-0 flex flex-col justify-between py-6 px-4 rounded-[32px] glass-bar z-50 transition-transform duration-300 lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-[320px] lg:translate-x-0'
        }`}
      >
        {/* Top: Logo + Nav */}
        <div className="flex flex-col w-full min-h-0">
          <div className="flex items-center justify-between px-1.5 mb-5">
            <Link to="/faculty/dashboard" className="flex items-center space-x-2.5 hover:opacity-95 transition-all">
              <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border border-neutral-100 dark:border-neutral-800 shadow-sm">
                <img
                  src="/logo.png"
                  alt="JCER Logo"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-extrabold text-[15px] tracking-wider uppercase text-neutral-900 dark:text-white leading-none">
                  JCER ERP
                </span>
                <span className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Faculty Dashboard
                </span>
              </div>
            </Link>

            {/* Mobile close button */}
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Items (Matching HOD exact typography, padding, and active state) */}
          <nav className="flex flex-col space-y-3 overflow-y-auto max-h-[calc(100vh-270px)] pr-1 select-none custom-scrollbar">
            <div className="flex flex-col space-y-0.5">
              <span className="px-3.5 text-[9px] font-black tracking-widest text-neutral-400 dark:text-neutral-500 uppercase mb-1">
                FACULTY DASHBOARD
              </span>
              <div className="flex flex-col space-y-0.5">
                {menuItems.map((item) => {
                  const isActive = item.path === activeNavPath;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      to={item.path}
                      className={`w-full h-[38px] px-3.5 rounded-xl flex items-center justify-between transition-all duration-150 relative group border ${
                        isActive
                          ? 'bg-gradient-to-r from-[#070e22] via-[#0c1a40] to-[#0f245c] text-white font-bold shadow-md shadow-[#070e22]/25 border-[#1e3a8a]/50'
                          : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:bg-gradient-to-r hover:from-[#070e22] hover:via-[#0c1a40] hover:to-[#0f245c] hover:!text-white hover:border-[#1e3a8a]/40 hover:shadow-sm'
                      }`}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3.5px] h-4.5 bg-cyan-400 rounded-r shadow-xs shadow-cyan-400/50" />
                      )}
                      <div className="flex items-center space-x-3 min-w-0">
                        <Icon
                          className={`w-4 h-4 flex-shrink-0 transition-colors duration-150 ${
                            isActive
                              ? 'text-cyan-300'
                              : 'text-neutral-400 group-hover:!text-cyan-300'
                          }`}
                          strokeWidth={isActive ? 2.5 : 2}
                        />
                        <span
                          className={`text-[11px] font-semibold transition-colors duration-150 truncate ${
                            isActive
                              ? 'text-white font-bold'
                              : 'text-neutral-700 dark:text-neutral-300 group-hover:!text-white'
                          }`}
                        >
                          {item.name}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </nav>
        </div>

        {/* Bottom Footer matching HOD style */}
        <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800/40 flex flex-col gap-2.5 w-full">
          <div className="rounded-xl p-2.5 border text-[10px] space-y-1 bg-neutral-50/50 dark:bg-neutral-800/25 border-neutral-200/50 dark:border-neutral-800/55">
            <div className="flex justify-between items-center">
              <span className="text-neutral-400 font-medium">Role</span>
              <span className="font-extrabold text-neutral-800 dark:text-neutral-200">FACULTY</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-400 font-medium">Department</span>
              <span className="font-extrabold text-neutral-800 dark:text-neutral-200">
                {deptCode}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-400 font-medium">Academic Year</span>
              <span className="font-extrabold text-neutral-800 dark:text-neutral-200">{academicYear}</span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 text-[10px] font-bold hover:underline px-1 py-0.5 shrink-0 text-rose-600 dark:text-rose-400"
          >
            <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT AREA (MATCHING HOD EXACT PADDING & HEADER) ── */}
      <div className="flex-1 pt-6 flex flex-col min-h-screen min-w-0 pl-6 lg:pl-[320px]">
        
        {/* ── TOP HEADER (EXACT HOD STYLE) ── */}
        <header className="flex flex-row items-center justify-between py-2 sm:py-4 mb-6 z-30 gap-6">
          
          {/* Page Title & Mobile Trigger */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex-shrink-0">
              <h1 className="text-xl md:text-2xl lg:text-[26px] font-bold tracking-tight text-neutral-900 dark:text-white whitespace-nowrap leading-tight">
                {getPageTitle()}
              </h1>
              <p className="text-xs text-neutral-400 dark:text-neutral-500 font-medium whitespace-nowrap">
                {getPageSubtitle()}
              </p>
            </div>
          </div>

          {/* Sub-Nav Pill Bar (4 core quick tabs for Faculty) */}
          <div className="hidden lg:flex items-center glass-bar p-1 rounded-full flex-shrink-0">
            {subNavTabs.map((tab) => {
              const isActive = activeNavPath === tab.path || (tab.path === '/faculty/dashboard' && (location.pathname === '/faculty' || location.pathname === '/faculty/overview' || location.pathname === '/faculty/dashboard'));
              return (
                <Link
                  key={tab.name}
                  to={tab.path}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-300 ${
                    isActive
                      ? 'admin-nav-pill-active shadow-sm text-white'
                      : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
                  }`}
                >
                  {tab.name}
                </Link>
              );
            })}
          </div>

          {/* Right Controls */}
          <div className="flex items-center space-x-2.5 flex-shrink-0">
            {/* Department Context Badge */}
            <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-full border border-neutral-200/80 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 text-xs font-bold shadow-xs">
              <Building2 className="w-3.5 h-3.5 text-neutral-500" />
              <span>Dept: <strong>{deptCode}</strong></span>
              <span className="text-neutral-300 dark:text-neutral-600">•</span>
              <span>AY: <strong>{academicYear}</strong></span>
            </div>

            {/* Profile Dropdown */}
            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => setProfileMenuOpen((prev) => !prev)}
                className="flex items-center space-x-2 header-dark-btn h-9 pl-1.5 pr-3 py-1 rounded-full shadow-sm cursor-pointer hover:scale-[1.02] transition-all select-none"
              >
                <div className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 bg-violet-600 text-white font-bold text-[10px]">
                  {user?.profileImage ? (
                    <img src={user.profileImage} alt={facultyName} className="w-full h-full object-cover" />
                  ) : (
                    <span>{facultyName.charAt(0)}</span>
                  )}
                </div>
                <span className="text-xs font-semibold pr-0.5 hidden md:block">
                  {facultyName.split(' ')[0]}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 opacity-80 hidden md:block transition-transform duration-200 ${profileMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-neutral-900 shadow-xl border border-neutral-200/80 dark:border-neutral-800 p-2 z-50 animate-in fade-in duration-150">
                  <div className="px-3 py-2.5 border-b border-neutral-100 dark:border-neutral-800">
                    <p className="text-xs font-bold text-neutral-900 dark:text-white truncate">{facultyName}</p>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate font-mono">{employeeId}</p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300">
                        {deptCode} Dept
                      </span>
                      <span className="text-[9px] font-bold text-neutral-400">
                        AY {academicYear}
                      </span>
                    </div>
                  </div>

                  <div className="pt-1">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors text-left"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ── DYNAMIC PAGE CONTENT ── */}
        <main className="flex-1 pb-10 min-w-0">
          <Outlet />
        </main>

        <GlobalFooter />
      </div>

      <PwaConfirmationModal
        isOpen={showRefreshModal}
        onClose={() => setShowRefreshModal(false)}
        onConfirm={confirmRefresh}
      />
    </div>
  );
};

export default FacultyLayout;
