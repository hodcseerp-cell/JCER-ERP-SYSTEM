import React, { useEffect, useRef, useCallback } from 'react';
import {
    Check, Lock,
    GraduationCap, User, Users, MapPin, BookOpen, Upload, ClipboardCheck
} from 'lucide-react';

/* ─────────────────────────────────────────
   Step meta: icon + full label for each step
───────────────────────────────────────── */
const STEP_META = [
    { icon: GraduationCap, label: 'Admission',  sub: 'Details'  },
    { icon: User,          label: 'Personal',   sub: 'Details'  },
    { icon: Users,         label: 'Parent',     sub: 'Details'  },
    { icon: MapPin,        label: 'Address',    sub: 'Details'  },
    { icon: BookOpen,      label: 'Academic',   sub: 'Details'  },
    { icon: Upload,        label: 'Document',   sub: 'Upload'   },
    { icon: ClipboardCheck,label: 'Review &',   sub: 'Submit'   },
];

/* ─────────────────────────────────────────
   Inline CSS injected once for animations
───────────────────────────────────────── */
const ANIMATION_CSS = `
@keyframes si-pulse-ring {
    0%   { box-shadow: 0 0 0 0px rgba(37,99,235,0.45); }
    70%  { box-shadow: 0 0 0 8px rgba(37,99,235,0); }
    100% { box-shadow: 0 0 0 0px rgba(37,99,235,0); }
}
@keyframes si-pop-in {
    0%   { opacity:0; transform: scale(0.4); }
    60%  { transform: scale(1.15); }
    100% { opacity:1; transform: scale(1); }
}
@keyframes si-line-grow {
    from { width: 0%; }
    to   { width: 100%; }
}
.si-pulse { animation: si-pulse-ring 2s ease-out infinite; }
.si-pop   { animation: si-pop-in 350ms cubic-bezier(.34,1.56,.64,1) both; }
.si-line  { animation: si-line-grow 400ms ease-out both; }
`;

function injectStyles() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('si-styles')) return;
    const el = document.createElement('style');
    el.id = 'si-styles';
    el.textContent = ANIMATION_CSS;
    document.head.appendChild(el);
}

/* ─────────────────────────────────────────
   Helper: resolve step state
───────────────────────────────────────── */
function resolveState(stepIndex, currentStep, getStepState) {
    if (getStepState) {
        const s = getStepState(stepIndex);
        if (s === 'COMPLETED')           return 'completed';
        if (s === 'CORRECTION_REQUIRED') return 'correction';
        if (s === 'IN_PROGRESS' || stepIndex === currentStep) return 'active';
        if (s === 'LOCKED' || s === 'NOT_STARTED') return 'locked';
    }
    // fallback: derive from currentStep number
    if (stepIndex < currentStep)  return 'completed';
    if (stepIndex === currentStep) return 'active';
    return 'locked';
}

/* ─────────────────────────────────────────
   Single Step Node (Desktop)
───────────────────────────────────────── */
function StepNode({ stepIndex, state, meta, isLast, isFirst, prevCompleted, clickable, onClick }) {
    const isCompleted  = state === 'completed';
    const isActive     = state === 'active';
    const isCorrection = state === 'correction';
    const isLocked     = state === 'locked';

    const Icon = meta.icon;

    // Circle visual classes
    let circleCls = 'flex items-center justify-center rounded-full border-2 transition-all duration-400 ';
    let circleStyle = {};

    if (isCompleted) {
        circleCls += 'bg-green-500 border-green-500 text-white shadow-md shadow-green-500/20';
    } else if (isCorrection) {
        circleCls += 'bg-rose-500 border-rose-500 text-white shadow-md shadow-rose-500/25 animate-pulse';
    } else if (isActive) {
        circleCls += 'bg-[#0B4F8A] border-[#0B4F8A] text-white shadow-md shadow-blue-700/25 si-pulse';
    } else {
        circleCls += 'bg-white border-slate-200 text-slate-300';
    }

    if (clickable && !isActive) {
        circleCls += ' cursor-pointer hover:scale-110 active:scale-95 duration-200 hover:shadow-lg';
    }

    // Icon/content inside circle
    let circleContent;
    if (isCompleted) {
        circleContent = <Check strokeWidth={3} className="w-4 h-4 sm:w-5 sm:h-5 si-pop" />;
    } else if (isCorrection) {
        circleContent = <span className="text-sm font-extrabold leading-none">{stepIndex}</span>;
    } else if (isLocked) {
        circleContent = <Lock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-300" strokeWidth={2} />;
    } else {
        // active
        circleContent = <Icon className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2} />;
    }

    // Label color
    let labelCls = 'text-center leading-tight transition-colors duration-300 ';
    if (isCompleted)       labelCls += 'text-green-600';
    else if (isCorrection) labelCls += 'text-rose-600 font-extrabold';
    else if (isActive)     labelCls += 'text-[#0B4F8A] font-bold';
    else                   labelCls += 'text-slate-400';

    if (clickable && !isActive) {
        labelCls += ' cursor-pointer hover:text-blue-600';
    }

    // Connector line: left half (before this step) is colored by prevCompleted
    // right half (after this step) is colored if this step is completed
    const leftLineColor  = prevCompleted                    ? 'bg-green-500'  : isActive ? 'bg-[#0B4F8A]' : 'bg-slate-200';
    const rightLineColor = isCompleted                      ? 'bg-green-500'  : isActive ? 'bg-[#0B4F8A]' : 'bg-slate-200';

    const ariaLabel =
        `Step ${stepIndex}: ${meta.label} ${meta.sub} – ${
            isCompleted ? 'Completed' :
            isActive    ? 'Current'   :
            isCorrection? 'Correction Required' :
                          'Locked'
        }`;

    const handleClick = () => {
        if (clickable && onClick) {
            onClick(stepIndex);
        }
    };

    return (
        <div
            className={`relative flex flex-col items-center ${clickable && !isActive ? 'cursor-pointer group' : ''}`}
            style={{ flex: '1 1 0%', minWidth: 0 }}
            aria-label={ariaLabel}
            role="listitem"
            onClick={handleClick}
        >
            {/* ── Connector lines (hidden for first/last edges) ── */}
            <div className="absolute inset-x-0 top-[19px] sm:top-[22px] flex pointer-events-none" style={{ zIndex: 0 }}>
                {/* Left connector (to previous step) */}
                <div
                    className={`h-0.5 flex-1 transition-colors duration-500 ${isFirst ? 'opacity-0' : leftLineColor}`}
                />
                {/* Spacer where the circle sits (40-44px wide) */}
                <div className="w-10 sm:w-11 shrink-0" />
                {/* Right connector (to next step) */}
                <div
                    className={`h-0.5 flex-1 transition-colors duration-500 ${isLast ? 'opacity-0' : rightLineColor}`}
                />
            </div>

            {/* ── Circle ── */}
            <div
                className={`${circleCls} w-10 h-10 sm:w-11 sm:h-11`}
                style={{ position: 'relative', zIndex: 1, ...circleStyle }}
            >
                {circleContent}
            </div>

            {/* ── Label ── */}
            <div className="mt-2 flex flex-col items-center" style={{ minWidth: 52 }}>
                <span className={`${labelCls} text-[10px] sm:text-[11px] lg:text-[12px] font-semibold block group-hover:text-blue-600 group-hover:underline`}>
                    {meta.label}
                </span>
                <span className={`${labelCls} text-[10px] sm:text-[11px] lg:text-[12px] font-semibold block group-hover:text-blue-600 group-hover:underline`}>
                    {meta.sub}
                </span>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────
   Main StepIndicator
───────────────────────────────────────── */
const StepIndicator = ({ steps, currentStep, getStepState, onStepClick }) => {
    injectStyles();

    const scrollRef = useRef(null);
    const activeRef = useRef(null);

    // Auto-scroll active step into center on mobile
    const scrollActive = useCallback(() => {
        if (activeRef.current && scrollRef.current) {
            activeRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'center',
            });
        }
    }, []);

    useEffect(() => {
        const t = setTimeout(scrollActive, 120);
        return () => clearTimeout(t);
    }, [currentStep, scrollActive]);

    // Build steps array (use provided steps or fallback to STEP_META)
    const stepCount = steps?.length || STEP_META.length;
    const resolvedSteps = Array.from({ length: stepCount }, (_, i) => ({
        index: i + 1,
        meta: STEP_META[i] || { icon: GraduationCap, label: `Step ${i+1}`, sub: '' },
        state: resolveState(i + 1, currentStep, getStepState),
    }));

    const progressPercent = ((currentStep - 1) / (stepCount - 1)) * 100;

    return (
        <div className="w-full select-none">

            {/* ══════════════ MOBILE: compact progress bar + scrollable row ══════════════ */}
            <div className="md:hidden w-full">
                {/* Progress bar summary */}
                <div className="flex items-center justify-between px-4 mb-2.5 text-xs font-semibold">
                    <span className="bg-slate-100 px-2.5 py-1 rounded-full text-slate-600 font-bold text-[11px]">
                        Step {currentStep} of {stepCount}
                    </span>
                    <span className="text-[#0B4F8A] font-extrabold text-[11px]">
                        {STEP_META[currentStep - 1]?.label} {STEP_META[currentStep - 1]?.sub}
                    </span>
                </div>

                {/* Thin progress bar */}
                <div className="mx-4 mb-4 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                        className="h-full rounded-full transition-all duration-500 ease-out"
                        style={{
                            width: `${progressPercent}%`,
                            background: 'linear-gradient(90deg,#16A34A,#0B4F8A)',
                        }}
                    />
                </div>

                {/* Horizontally scrollable step circles */}
                <div
                    ref={scrollRef}
                    className="flex gap-0 overflow-x-auto pb-3 px-2"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    <style>{`.si-scroll::-webkit-scrollbar{display:none}`}</style>
                    {resolvedSteps.map(({ index, meta, state }, i) => {
                        const isActive     = state === 'active';
                        const isCompleted  = state === 'completed';
                        const isCorrection = state === 'correction';
                        const isAccessible = state === 'completed' || state === 'active' || state === 'correction';
                        const Icon = meta.icon;
                        let circleCls = 'flex items-center justify-center rounded-full border-2 flex-shrink-0 transition-all duration-400 w-9 h-9 ';
                        if (isCompleted)       circleCls += 'bg-green-500 border-green-500 text-white';
                        else if (isCorrection) circleCls += 'bg-rose-500 border-rose-500 text-white animate-pulse';
                        else if (isActive)     circleCls += 'bg-[#0B4F8A] border-[#0B4F8A] text-white si-pulse';
                        else                   circleCls += 'bg-white border-slate-200 text-slate-300';

                        if (isAccessible && !isActive) {
                            circleCls += ' cursor-pointer hover:scale-110 active:scale-95 duration-200';
                        }

                        let labelColor = isCompleted ? 'text-green-600' : isActive ? 'text-[#0B4F8A] font-bold' : isCorrection ? 'text-rose-600' : 'text-slate-400';
                        if (isAccessible && !isActive) {
                            labelColor += ' cursor-pointer hover:text-blue-600';
                        }

                        return (
                            <div
                                key={index}
                                ref={isActive ? activeRef : null}
                                className={`flex flex-col items-center ${isAccessible && !isActive ? 'cursor-pointer group' : ''}`}
                                style={{ minWidth: 72, flex: '0 0 72px' }}
                                aria-label={`Step ${index}: ${meta.label} ${meta.sub} – ${isCompleted ? 'Completed' : isActive ? 'Current' : 'Locked'}`}
                                onClick={() => {
                                    if (isAccessible && !isActive && onStepClick) {
                                        onStepClick(index);
                                    }
                                }}
                            >
                                {/* connector + circle row */}
                                <div className="flex items-center w-full">
                                    <div className={`flex-1 h-0.5 transition-colors duration-500 ${i === 0 ? 'opacity-0' : isCompleted || isActive ? (isCompleted ? 'bg-green-500' : 'bg-[#0B4F8A]') : 'bg-slate-200'}`} />
                                    <div className={circleCls}>
                                        {isCompleted  ? <Check strokeWidth={3} className="w-4 h-4 si-pop" />
                                        : isCorrection ? <span className="text-xs font-extrabold">{index}</span>
                                        : state === 'locked' ? <Lock className="w-3 h-3" strokeWidth={2} />
                                        : <Icon className="w-4 h-4" strokeWidth={2} />}
                                    </div>
                                    <div className={`flex-1 h-0.5 transition-colors duration-500 ${i === stepCount - 1 ? 'opacity-0' : isCompleted ? 'bg-green-500' : 'bg-slate-200'}`} />
                                </div>

                                {/* label */}
                                <div className="mt-1.5 flex flex-col items-center">
                                    <span className={`text-[9px] font-semibold leading-tight group-hover:underline ${labelColor}`}>{meta.label}</span>
                                    <span className={`text-[9px] font-semibold leading-tight group-hover:underline ${labelColor}`}>{meta.sub}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ══════════════ DESKTOP: full-width flex stepper ══════════════ */}
            <div
                className="hidden md:flex items-start w-full px-2 lg:px-6 py-3"
                role="list"
                aria-label="Application Progress"
            >
                {resolvedSteps.map(({ index, meta, state }, i) => {
                    const isAccessible = state === 'completed' || state === 'active' || state === 'correction';
                    return (
                        <StepNode
                            key={index}
                            stepIndex={index}
                            state={state}
                            meta={meta}
                            isFirst={i === 0}
                            isLast={i === stepCount - 1}
                            prevCompleted={i > 0 && resolvedSteps[i - 1].state === 'completed'}
                            clickable={isAccessible}
                            onClick={onStepClick}
                        />
                    );
                })}
            </div>

        </div>
    );
};

export default StepIndicator;
