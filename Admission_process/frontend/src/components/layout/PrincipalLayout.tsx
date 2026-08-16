import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../store/authSlice';
import API from '../../services/api';
import { RootState } from '../../store';
import { getAcademicYear } from '../../utils/date.util';
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  BarChart3,
  Bell,
  Sun,
  Moon,
  LogOut,
  ChevronDown,
  User,
  Shield,
  Megaphone,
  FileText,
  FileCheck2,
  AlertCircle
} from 'lucide-react';
import admissionService from '../../services/admission.service';
import { filterMenuItems } from '../../utils/feature.util';

interface MenuItem {
  name: string;
  path: string;
  icon: React.ElementType;
  feature?: string;
  badge?: number;
}

interface MenuGroup {
  title: string;
  items: MenuItem[];
}

export const PrincipalLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);

  const [features, setFeatures] = useState<Record<string, boolean>>({
    admission: true,
    admin: true,
    principal: true,
    student: false,
    teacher: false,
    hod: false,
    parent: false,
    fees: false,
    library: false,
    placement: false,
    hostel: false,
    grievances: false,
  });

  const [academicYear, setAcademicYear] = useState<string>('');

  useEffect(() => {
    API.get('/system/config')
      .then(res => {
        const json = res.data;
        if (json.success) {
          if (json.data?.features) {
            setFeatures(json.data.features);
          }
          if (json.data?.admissionCycle) {
            setAcademicYear(json.data.admissionCycle);
          }
        }
      })
      .catch(err => console.warn('Unable to load deployment features list in PrincipalLayout:', err));
  }, []);

  const [isDark, setIsDark] = useState(false);

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  }, []);

  useEffect(() => {
    const fetchCount = () => {
      // Principal reviews fee-verified admissions awaiting final enrollment sign-off
      admissionService.getStats().then(stats => {
        setPendingCount(stats.approved || 0);
      }).catch(err => console.error('Error loading Principal stats:', err));
    };

    fetchCount();
    window.addEventListener('admissions-updated', fetchCount);
    const interval = setInterval(fetchCount, 15000);

    return () => {
      window.removeEventListener('admissions-updated', fetchCount);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    dispatch(logout());
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const menuGroups: MenuGroup[] = [
    {
      title: 'DASHBOARD',
      items: [
        { name: 'Overview', path: '/principal/dashboard', icon: LayoutDashboard },
        { name: 'Analytics', path: '/principal/analytics', icon: BarChart3 },
      ],
    },
    {
      title: 'ADMISSIONS',
      items: [
        { name: 'Admissions Queue', path: '/principal/admissions', icon: ClipboardList, badge: pendingCount > 0 ? pendingCount : undefined },
        { name: 'Students', path: '/principal/students', icon: Users },
      ],
    },
  ];

  const pageTitles: Record<string, string> = {
    '/principal/dashboard': 'Principal Overview',
    '/principal/admissions': 'Admissions Queue',
    '/principal/students': 'Students Directory (Read Only)',
    '/principal/analytics': 'Admission Analytics',
    '/principal/reports': 'Report Generator',
    '/principal/profile': 'My Profile',
  };

  const getPageTitle = () => {
    if (location.pathname.startsWith('/principal/admissions/review/')) {
      return 'Admission Review Workspace';
    }
    if (location.pathname.startsWith('/principal/admissions')) {
      if (location.pathname.includes('/pending')) return 'Pending Sign-off';
      if (location.pathname.includes('/approved')) return 'Enrolled Admissions';
      if (location.pathname.includes('/rejected')) return 'Rejected Admissions';
      if (location.pathname.includes('/history')) return 'Admissions History';
      return 'Admissions Approvals';
    }
    return pageTitles[location.pathname] || 'Principal Portal';
  };

  return (
    <div className="min-h-screen max-w-full overflow-x-hidden flex text-neutral-900 dark:text-neutral-100 transition-colors duration-300 font-sans pb-6 pr-6">

      {/* ── FLOATING SIDEBAR ── */}
      <aside className="fixed left-6 top-6 bottom-6 w-[280px] min-w-[280px] max-w-[280px] flex-shrink-0 flex flex-col justify-between py-6 px-4 rounded-[32px] glass-bar z-40">
        
        {/* Top: Logo + Nav */}
        <div className="flex flex-col w-full">
          <Link to="/principal/dashboard" className="flex items-center space-x-2.5 px-1.5 mb-5 hover:opacity-95 transition-all">
            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border border-neutral-100 dark:border-neutral-850 shadow-sm">
              <img
                src="/logo.png"
                alt="JCER Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-extrabold text-[15px] tracking-wider uppercase text-neutral-900 dark:text-white leading-none">JCER ERP</span>
              <span className="text-[10px] font-bold text-neutral-450 dark:text-neutral-300 mt-0.5">Principal Portal</span>
            </div>
          </Link>

          {/* Grouped Navigation */}
          <nav className="flex flex-col space-y-3 overflow-y-auto max-h-[calc(100vh-270px)] pr-1 select-none">
            {filterMenuItems(menuGroups, features).map((group) => (
              <div key={group.title} className="flex flex-col space-y-0.5">
                <span className="px-3.5 text-[9px] font-black tracking-widest text-neutral-400 dark:text-neutral-500 uppercase mb-1">
                  {group.title}
                </span>
                <div className="flex flex-col space-y-0.5">
                  {group.items.map((item) => {
                    const isActive = location.pathname === item.path || (item.path !== '/principal/dashboard' && location.pathname.startsWith(item.path));
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.name}
                        to={item.path}
                        className={`w-full h-[40px] px-3.5 rounded-xl flex items-center justify-between transition-all duration-200 relative group ${
                          isActive
                            ? 'bg-orange-50 text-orange-950 font-bold dark:bg-orange-950/20 dark:text-orange-200 shadow-none'
                            : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-800/40 hover:scale-[1.01]'
                        }`}
                      >
                        {isActive && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-orange-600 dark:bg-orange-400 rounded-r" />
                        )}
                        <div className="flex items-center space-x-3">
                          <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-orange-600 dark:text-orange-400' : 'text-neutral-400 group-hover:text-neutral-600'}`} strokeWidth={isActive ? 2.5 : 2} />
                          <span className="text-[11px] font-semibold">{item.name}</span>
                        </div>
                        {item.badge && !isActive && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-rose-500 text-white leading-none scale-90">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* Bottom Footer */}
        <div className="pt-3 border-t border-neutral-105 dark:border-neutral-800/40 flex flex-col gap-2.5 w-full">
          <div className="rounded-xl p-2.5 border text-[10px] space-y-1 bg-neutral-50/50 dark:bg-neutral-800/25 border-neutral-200/50 dark:border-neutral-800/55">
            <div className="flex justify-between items-center">
              <span className="text-neutral-400 font-medium">Role</span>
              <span className="font-extrabold text-neutral-805 dark:text-neutral-200">PRINCIPAL</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-400 font-medium">Academic Year</span>
              <span className="font-extrabold text-neutral-805 dark:text-neutral-200">{academicYear || getAcademicYear()}</span>
            </div>
          </div>

          <Link
            to="/principal/admissions"
            className="flex items-center space-x-2 text-[10px] font-bold hover:underline px-1 py-0.5 shrink-0"
            style={{ color: '#EA580C' }}
          >
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{pendingCount > 0 ? `${pendingCount} Pending Admissions` : 'No Pending Admissions'}</span>
          </Link>
        </div>
      </aside>

      {/* ── MAIN CONTENT AREA ── */}
      <div className="flex-1 pt-6 flex flex-col min-h-screen min-w-0" style={{ paddingLeft: '328px' }}>

        {/* ── TOP HEADER ── */}
        <header className="flex flex-row items-center justify-between py-4 mb-6 z-30 gap-4">
          <div className="flex flex-col min-w-0">
            <h2 className="text-2xl font-black tracking-tight truncate leading-tight uppercase">
              {getPageTitle()}
            </h2>
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-widest mt-0.5">
              Jain College of Engineering & Research
            </span>
          </div>

          <div className="flex items-center space-x-4 flex-shrink-0">

            {/* Profile Dropdown */}
            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="flex items-center space-x-2.5 px-3.5 py-1.5 rounded-2xl border border-neutral-200/50 dark:border-neutral-800/40 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
              >
                <div className="size-7 rounded-full overflow-hidden bg-neutral-100 dark:bg-neutral-800 border border-neutral-200/50 dark:border-neutral-800/40 flex items-center justify-center font-black text-xs text-neutral-700 dark:text-neutral-300">
                  {user?.name?.charAt(0) || 'P'}
                </div>
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-[11px] font-bold tracking-tight leading-none text-neutral-800 dark:text-neutral-200">{user?.name}</span>
                  <span className="text-[9px] font-semibold text-neutral-400 mt-0.5 uppercase leading-none">Principal</span>
                </div>
                <ChevronDown size={12} className="text-neutral-400" />
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-neutral-900 border border-neutral-200/50 dark:border-neutral-800/40 rounded-2xl shadow-xl py-2 z-50 animate-fade-in">
                  <Link
                    to="/principal/profile"
                    onClick={() => setProfileMenuOpen(false)}
                    className="w-full px-4 py-2 text-xs font-semibold flex items-center gap-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-neutral-700 dark:text-neutral-300"
                  >
                    <User size={14} /> My Profile
                  </Link>
                  <hr className="my-1 border-neutral-100 dark:border-neutral-800/40" />
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-xs font-bold text-rose-500 hover:bg-rose-50/50 dark:hover:bg-rose-950/20 transition-colors flex items-center gap-2 text-left"
                  >
                    <LogOut size={14} /> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ── SUB PAGE ROUTER CONTENT ── */}
        <main className="flex-1 relative">
          <div 
            className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.015] bg-no-repeat bg-center bg-fixed"
            style={{ 
              backgroundImage: 'url(/logo.png)', 
              backgroundSize: '450px',
              zIndex: 0
            }}
          />
          <div className="relative z-10">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default PrincipalLayout;
