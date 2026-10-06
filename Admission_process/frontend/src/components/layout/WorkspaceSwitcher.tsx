import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { useAcademicYear } from '../../context/AcademicYearContext';
import mentorService from '../../services/mentor.service';
import {
  ArrowLeftRight,
  ChevronDown,
  Building2,
  GraduationCap,
  UserCheck,
  Check,
} from 'lucide-react';

export type WorkspaceType = 'hod' | 'faculty' | 'mentor';

interface WorkspaceOption {
  id: WorkspaceType;
  name: string;
  path: string;
  icon: React.ElementType;
  colorClass: string;
  badge?: string;
}

interface WorkspaceSwitcherProps {
  currentWorkspace: WorkspaceType;
}

export const WorkspaceSwitcher: React.FC<WorkspaceSwitcherProps> = ({ currentWorkspace }) => {
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  const { academicYear } = useAcademicYear();

  const [isOpen, setIsOpen] = useState(false);
  const [isMentorActive, setIsMentorActive] = useState<boolean>(Boolean(user?.isMentor));
  const [menteeCount, setMenteeCount] = useState<number>(0);
  const [isLoadingMentorStatus, setIsLoadingMentorStatus] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Authoritative Database Query for Active Mentor Status
  useEffect(() => {
    let isMounted = true;
    const checkMentorCapability = async () => {
      // If user is STUDENT or PARENT, skip
      if (user?.role === 'STUDENT' || user?.role === 'PARENT') {
        setIsMentorActive(false);
        return;
      }

      try {
        setIsLoadingMentorStatus(true);
        const res = await mentorService.getMentorStatus(academicYear);
        if (isMounted) {
          setIsMentorActive(Boolean(res?.isMentor));
          setMenteeCount(res?.activeMenteeCount || 0);
        }
      } catch (err) {
        // If 401/403 or error, fall back to false unless auth payload had explicit true
        if (isMounted) {
          setIsMentorActive(false);
        }
      } finally {
        if (isMounted) {
          setIsLoadingMentorStatus(false);
        }
      }
    };

    checkMentorCapability();

    // Listen to academic year change events
    const handleYearChange = () => {
      checkMentorCapability();
    };
    window.addEventListener('academic-year-changed', handleYearChange);

    return () => {
      isMounted = false;
      window.removeEventListener('academic-year-changed', handleYearChange);
    };
  }, [academicYear, user]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute authorized workspaces based strictly on DB-verified capabilities
  const isHod = user?.role === 'HOD' || Boolean(user?.isHod) || user?.workspaces?.includes('hod');
  const isFaculty =
    user?.role === 'FACULTY' ||
    user?.role === 'TEACHER' ||
    Boolean(user?.isFaculty) ||
    isHod ||
    user?.workspaces?.includes('faculty');
  const isMentor = isMentorActive;

  const allWorkspaces: WorkspaceOption[] = [
    {
      id: 'hod',
      name: 'HOD Dashboard',
      path: '/hod/dashboard',
      icon: Building2,
      colorClass: 'text-cyan-500 dark:text-cyan-400',
    },
    {
      id: 'faculty',
      name: 'Faculty Dashboard',
      path: '/faculty/dashboard',
      icon: GraduationCap,
      colorClass: 'text-indigo-500 dark:text-indigo-400',
    },
    {
      id: 'mentor',
      name: 'Mentor Dashboard',
      path: '/mentor/dashboard',
      icon: UserCheck,
      colorClass: 'text-emerald-500 dark:text-emerald-400',
      badge: menteeCount > 0 ? `${menteeCount} Mentees` : undefined,
    },
  ];

  const availableWorkspaces = allWorkspaces.filter((w) => {
    if (w.id === 'hod') return isHod;
    if (w.id === 'faculty') return isFaculty;
    if (w.id === 'mentor') return isMentor;
    return false;
  });

  // If user only has 1 workspace, do NOT render the switcher
  if (availableWorkspaces.length <= 1) {
    return null;
  }

  const handleSelectWorkspace = (workspace: WorkspaceOption) => {
    setIsOpen(false);
    if (workspace.id !== currentWorkspace) {
      navigate(workspace.path);
    }
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Switcher Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        title="Switch Role / Workspace"
        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 border select-none ${
          isOpen
            ? 'bg-neutral-900 text-white border-neutral-700 shadow-md ring-2 ring-indigo-500/30'
            : 'bg-white dark:bg-neutral-900/80 text-neutral-700 dark:text-neutral-200 border-neutral-200/80 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/80 hover:border-neutral-300 dark:hover:border-neutral-700 shadow-xs'
        }`}
      >
        <div className="flex items-center space-x-2 min-w-0">
          <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 flex-shrink-0" />
          <span className="truncate">Switch Workspace</span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-neutral-400 transition-transform duration-200 flex-shrink-0 ${
            isOpen ? 'rotate-180 text-white' : ''
          }`}
        />
      </button>

      {/* Expanded Popup Menu (Pops UP above button) */}
      {isOpen && (
        <div className="absolute bottom-full left-0 right-0 mb-2 p-1.5 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/90 dark:border-neutral-800 shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="px-2.5 py-1.5 mb-1 border-b border-neutral-100 dark:border-neutral-800/60">
            <span className="text-[9px] font-black uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              Available Workspaces
            </span>
          </div>

          <div className="flex flex-col space-y-1">
            {availableWorkspaces.map((ws) => {
              const isSelected = ws.id === currentWorkspace;
              const Icon = ws.icon;
              return (
                <button
                  key={ws.id}
                  type="button"
                  onClick={() => handleSelectWorkspace(ws)}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 text-left ${
                    isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 border border-indigo-200/60 dark:border-indigo-800/50'
                      : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800/60'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <Icon className={`w-4 h-4 flex-shrink-0 ${ws.colorClass}`} />
                    <div className="flex flex-col min-w-0">
                      <span className="truncate leading-tight">{ws.name}</span>
                      {ws.badge && (
                        <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold">
                          {ws.badge}
                        </span>
                      )}
                    </div>
                  </div>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 ml-1.5" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkspaceSwitcher;
