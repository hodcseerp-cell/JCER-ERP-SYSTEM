import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import admissionService, { AdmissionApplication } from '../../../services/admission.service';
import API from '../../../services/api';
import { ArrowLeft, User, Users, GraduationCap, CheckCircle2, XCircle, FileText, MapPin, ExternalLink, ShieldCheck, Maximize2, Image, Layers, Clock, Send, X, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { getAcademicYear } from '../../../utils/date.util';
import { DocumentVerificationWorkspace } from './DocumentVerificationWorkspace';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getDocUrl = (url?: string | null) => {
  if (!url) return null;
  if (url.startsWith('http') || url.startsWith('data:')) return url;
  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  const base = API.defaults.baseURL || '/api';
  const host = base.replace(/\/api\/?$/, '');
  if (host.startsWith('/')) {
    return cleanPath;
  }
  return `${host}${cleanPath}`;
};

const getMissingFields = (app: AdmissionApplication | null) => {
  const missing: string[] = [];
  if (!app) return missing;
  const pd = app.studentpersonaldetails as any;
  const par = app.studentparentdetails as any;
  const addr = app.studentaddress as any;
  const acad = app.studentacademicdetails as any;
  const docs = app.studentdocuments as any;
  const q = (app.qualification || '').toUpperCase();
  const showPUC = q === 'PUC' || (!q && app.admissionType === 'KCET');
  const showDiploma = q === 'DIPLOMA' || (!q && app.admissionType === 'DCET');

  // Personal Details
  if (!pd?.firstName) missing.push("Personal: First Name");
  if (!pd?.lastName) missing.push("Personal: Last Name");
  if (!pd?.gender) missing.push("Personal: Gender");
  if (!pd?.dateOfBirth) missing.push("Personal: Date of Birth");
  if (!pd?.nationality) missing.push("Personal: Nationality");
  if (!pd?.religion) missing.push("Personal: Religion");
  if (!pd?.caste) missing.push("Personal: Caste");
  if (!pd?.category) missing.push("Personal: Category");
  if (!pd?.areaType) missing.push("Personal: Area Type");
  if (!pd?.phone && !app.user?.phone) missing.push("Personal: Mobile Number");

  // Parent Details
  if (!par?.fatherName) missing.push("Parent: Father's Name");
  if (!par?.fatherOccupation) missing.push("Parent: Father's Occupation");
  if (!par?.fatherPhone) missing.push("Parent: Father's Mobile");
  if (!par?.motherName) missing.push("Parent: Mother's Name");
  if (!par?.motherOccupation) missing.push("Parent: Mother's Occupation");
  if (!par?.motherPhone) missing.push("Parent: Mother's Mobile");
  if (!par?.fatherAnnualIncome) missing.push("Parent: Annual Income");

  // Address Details
  if (!addr?.currentAddressLine1) missing.push("Address: Current Address");
  if (!addr?.currentCity) missing.push("Address: Current City");
  if (!addr?.currentState) missing.push("Address: Current State");
  if (!addr?.currentPincode) missing.push("Address: Current Pincode");

  // Academics
  if (!acad?.tenthSchool) missing.push("Academic: 10th School Name");
  if (!acad?.tenthBoard) missing.push("Academic: 10th Board");
  if (!acad?.tenthPassingYear) missing.push("Academic: 10th Year of Passing");
  if (!acad?.tenthRegisterNumber) missing.push("Academic: 10th Register Number");
  if (!acad?.tenthPercentage) missing.push("Academic: 10th Percentage");

  if (showDiploma) {
    if (!acad?.diplomaUniversity) missing.push("Academic: Diploma University");
    if (!acad?.diplomaYear) missing.push("Academic: Diploma Year of Passing");
    if (!acad?.diplomaRegisterNumber) missing.push("Academic: Diploma Register Number");
    if (!acad?.diplomaPercentage) missing.push("Academic: Diploma Percentage");
  }
  if (showPUC) {
    if (!acad?.twelfthSchool) missing.push("Academic: 12th/PUC School Name");
    if (!acad?.twelfthStream) missing.push("Academic: 12th/PUC Stream");
    if (!acad?.twelfthBoard) missing.push("Academic: 12th/PUC Board");
    if (!acad?.twelfthPassingYear) missing.push("Academic: 12th/PUC Year of Passing");
    if (!acad?.twelfthRegisterNumber) missing.push("Academic: 12th/PUC Register Number");
    if (!acad?.twelfthPercentage) missing.push("Academic: 12th/PUC Percentage");
  }

  // Documents
  if (!docs?.photoUrl) missing.push("Documents: Passport Photo");
  if (!docs?.signatureUrl) missing.push("Documents: Candidate Signature");
  if (!docs?.tenthMarksheetUrl) missing.push("Documents: 10th/SSLC Marksheet");
  if (showDiploma) {
    if (!docs?.diplomaSemester5MarksheetUrl) missing.push("Documents: Diploma 5th Semester Marks Card");
    if (!docs?.diplomaSemester6MarksheetUrl) missing.push("Documents: Diploma 6th Semester Marks Card");
  } else {
    if (!docs?.twelfthMarksheetUrl) missing.push("Documents: 12th/PUC Marksheet");
  }
  if (!docs?.feesPaidReceiptUrl) missing.push("Documents: Fees Paid Receipt");
  if (!docs?.aadhaarUrl) missing.push("Documents: Aadhaar Card");
  if (!docs?.domicileCertificateUrl) missing.push("Documents: Domicile/Study Certificate");

  return missing;
};

const CorrectionContext = React.createContext<{ remarks: string | null; status: string }>({ remarks: null, status: '' });

const FormField = ({ label, value }: { label: string; value?: string | number | null | boolean }) => {
  const { remarks, status } = React.useContext(CorrectionContext);
  
  const corrected = status === 'RESUBMITTED' && (() => {
    if (!remarks) return false;
    const remarksLower = remarks.toLowerCase();
    const labelLower = label.toLowerCase();
    
    const matches: Record<string, string[]> = {
      'kcet number': ['cet', 'kcet'],
      'dcet number': ['dcet'],
      'aadhaar': ['aadhaar'],
      'first name': ['first name', 'name'],
      'middle name': ['middle name'],
      'last name': ['last name'],
      'caste': ['caste'],
      'date of birth': ['birth', 'dob'],
      'gender': ['gender'],
      'category': ['category'],
      'religion': ['religion'],
      'nationality': ['nationality'],
      'father name': ['father name', 'father'],
      'mother name': ['mother name', 'mother'],
      'mobile number': ['mobile', 'phone'],
      'parent email': ['email'],
      'annual income': ['income'],
      'current address': ['address', 'current'],
      'permanent address': ['address', 'permanent'],
      '10th school name': ['sslc', '10th', 'tenth'],
      '12th/puc school name': ['puc', '12th', 'twelfth'],
      'diploma university': ['diploma'],
    };
    
    const keywords = matches[labelLower] || [labelLower];
    return keywords.some(kw => remarksLower.includes(kw));
  })();

  return (
    <div className={`p-3 rounded-lg border transition-all flex flex-col gap-1.5 ${
      corrected 
        ? 'border-amber-400 bg-amber-50/30 shadow-[0_0_8px_rgba(245,158,11,0.08)] dark:bg-amber-950/15 dark:border-amber-800' 
        : 'bg-neutral-50 dark:bg-neutral-800/40 border-neutral-100 dark:border-neutral-800/80'
    }`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider leading-none">{label}</p>
        {corrected && (
          <span className="text-[8px] bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded font-black uppercase shrink-0">Updated</span>
        )}
      </div>
      <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200 leading-tight">{value !== null && value !== undefined && value !== '' ? String(value) : '—'}</p>
    </div>
  );
};

const DocumentThumbnail: React.FC<{ field: string; appId: string; label: string; onClick: () => void }> = ({ field, appId, label, onClick }) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [isPdf, setIsPdf] = useState(false);

  useEffect(() => {
    let active = true;
    const loadFile = async () => {
      setLoading(true);
      try {
        const response = await API.get(`/admin/admissions/${appId}/documents/${field}`, {
          responseType: 'blob',
        });
        if (!active) return;
        const type = response.data.type || '';
        setIsPdf(type.includes('pdf'));
        const url = URL.createObjectURL(response.data);
        setBlobUrl(url);
      } catch (err) {
        console.error('Failed to load thumbnail for', field, err);
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadFile();
    return () => {
      active = false;
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [field, appId]);

  if (loading) {
    return (
      <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-805 rounded-lg flex items-center justify-center border border-neutral-200 dark:border-neutral-700 animate-pulse shrink-0">
        <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !blobUrl) {
    return (
      <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-805 rounded-lg flex items-center justify-center border border-neutral-200 dark:border-neutral-700 text-neutral-450 shrink-0" title="Error loading file">
        <FileText size={16} />
      </div>
    );
  }

  return (
    <div 
      onClick={onClick}
      className="w-16 h-16 bg-neutral-100 dark:bg-neutral-805 rounded-lg flex items-center justify-center overflow-hidden border border-neutral-250 dark:border-neutral-700 cursor-pointer shadow-sm hover:scale-105 transition-transform shrink-0 relative group"
    >
      {isPdf ? (
        <div className="w-full h-full flex flex-col items-center justify-center p-1 bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400">
          <FileText size={18} />
          <span className="text-[8px] font-black tracking-tight mt-0.5">PDF</span>
        </div>
      ) : (
        <img src={blobUrl} alt={label} className="w-full h-full object-cover" />
      )}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
        <Maximize2 size={12} />
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const AdmissionReviewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [app, setApp] = useState<AdmissionApplication | null>(null);

  const handleBack = () => {
    if (!app) {
      navigate('/admin/admissions/queue');
      return;
    }
    // Check status and map to the corresponding tab route
    if (app.applicationStatus === 'APPROVED') {
      navigate('/admin/admissions/verified');
    } else if (app.applicationStatus === 'REJECTED') {
      navigate('/admin/admissions/rejected');
    } else if (app.applicationStatus === 'ENROLLED') {
      navigate('/admin/admissions/enrolled');
    } else {
      navigate('/admin/admissions/queue');
    }
  };

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const [remarks, setRemarks] = useState('');
  const [rejectionReasonCode, setRejectionReasonCode] = useState('');
  const [docStatus, setDocStatus] = useState<Record<string, 'ACCEPTED' | 'REJECTED'>>({});
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);

  const [documentsVerified, setDocumentsVerified] = useState(false);
  const [eligibilityVerified, setEligibilityVerified] = useState(false);
  const [verificationRemarks, setVerificationRemarks] = useState('');
  const [verifying, setVerifying] = useState(false);

  // Correction workflow states
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [selectedCorrectionSections, setSelectedCorrectionSections] = useState<string[]>([]);
  const [correctionRemarks, setCorrectionRemarks] = useState('');
  const [correctionDeadline, setCorrectionDeadline] = useState('');

  const isSectionFlaggedForCorrection = (sectionKey: string) => {
    if (!app?.correctionRequestedSections) return false;
    return app.correctionRequestedSections.includes(sectionKey);
  };

  const isSectionCorrected = (sectionKey: string) => {
    if (app?.applicationStatus !== 'RESUBMITTED') return false;
    if (sectionKey === 'documents' && documentsVerified) return false;
    if (
      (sectionKey === 'personal' ||
        sectionKey === 'parent' ||
        sectionKey === 'address' ||
        sectionKey === 'academic') &&
      eligibilityVerified
    ) {
      return false;
    }
    return app.correctionRequestedSections?.includes(sectionKey) || false;
  };

  const getSectionClass = (sectionKey: string, customClasses = 'space-y-4') => {
    // CORRECTION_REQUIRED: highlight sections that need correction in amber
    if (app?.applicationStatus === 'CORRECTION_REQUIRED' && isSectionFlaggedForCorrection(sectionKey)) {
      return `${customClasses} border-2 border-amber-400 bg-amber-50/40 dark:bg-amber-950/10 rounded-2xl p-6 shadow-[0_0_12px_rgba(251,191,36,0.2)] transition-all relative`;
    }
    // RESUBMITTED: amber = section was corrected, emerald = section was not changed
    if (app?.applicationStatus === 'RESUBMITTED') {
      const corrected = isSectionCorrected(sectionKey);
      if (corrected) {
        return `${customClasses} border-2 border-amber-500 bg-amber-50/5 dark:bg-amber-950/5 rounded-2xl p-6 shadow-[0_0_15px_rgba(245,158,11,0.15)] transition-all`;
      } else {
        return `${customClasses} border-2 border-emerald-500 bg-emerald-50/5 dark:bg-emerald-950/5 rounded-2xl p-6 opacity-75 transition-all`;
      }
    }
    return customClasses;
  };


  useEffect(() => {
    if (id) fetchApplication(id);
  }, [id]);

  // ─── Shared helper: build the full combined remarks from current state ─────
  const buildRemarks = (
    currentApp: AdmissionApplication | null,
    currentDocStatus: Record<string, 'ACCEPTED' | 'REJECTED'>,
    currentReasonCode: string
  ): string => {
    // 1. Rejection reason remark
    const reasonRemarksMap: Record<string, string> = {
      'DOC_NOT_VERIFIED': 'Documents verification failed during admin review.',
      'INCOMPLETE_DOCUMENTS': 'Some mandatory documents were not uploaded or are missing.',
      'FEES_NOT_PAID': 'Application fees have not been paid or verified.',
      'ELIGIBILITY_FAILED': 'Candidate does not meet the minimum eligibility criteria.',
      'INVALID_CERTIFICATES': 'Uploaded certificates are invalid, expired, or mismatched.',
      'DUPLICATE_APPLICATION': 'A duplicate admission application was found for this candidate.',
      'AADHAAR_MISMATCH': 'Aadhaar card details do not match the personal profile.',
      'USN_CONFLICT': 'USN already exists or is assigned to another student.',
    };
    const reasonRemarks = reasonRemarksMap[currentReasonCode] || '';

    // 2. Rejected documents
    const rejectedLabels = Object.entries(currentDocStatus)
      .filter(([, s]) => s === 'REJECTED')
      .map(([l]) => l);
    const docRemarks = rejectedLabels.length > 0
      ? `The following documents were rejected and must be re-uploaded:\n${rejectedLabels.map(d => `• ${d}`).join('\n')}`
      : '';

    // 3. Missing / incomplete form fields
    const missing = getMissingFields(currentApp);
    const missingRemarks = missing.length > 0
      ? `Please provide the following missing or incomplete details:\n${missing.map(f => `• ${f}`).join('\n')}`
      : '';

    return [reasonRemarks, docRemarks, missingRemarks].filter(Boolean).join('\n\n');
  };

  const fetchApplication = async (appId: string) => {
    try {
      setLoading(true);
      const data = await admissionService.getApplication(appId);
      setApp(data);

      // Restore saved document statuses from localStorage if present
      let savedStatuses: Record<string, 'ACCEPTED' | 'REJECTED'> = {};
      const savedStatusesStr = localStorage.getItem(`doc_status_${appId}`);
      if (savedStatusesStr) {
        try {
          savedStatuses = JSON.parse(savedStatusesStr);

          // Reset status of corrected documents to PENDING if status is RESUBMITTED
          if (data.applicationStatus === 'RESUBMITTED') {
            const remarksLower = (data.correctionRemarks || '').toLowerCase();
            const matches: Record<string, string[]> = {
              'Passport Size Photo': ['passport', 'photo'],
              'Candidate E-Signature': ['signature'],
              'SSLC / 10th Marks Card': ['sslc', '10th', 'tenth'],
              'PUC / 12th Marks Card': ['puc', '12th', 'twelfth'],
              'Diploma 5th Semester Marks Card': ['diploma 5th', 'semester 5', 'sem 5'],
              'Diploma 6th Semester Marks Card': ['diploma 6th', 'semester 6', 'sem 6'],
              'Entrance Score Card (CET/DCET)': ['cet', 'dcet', 'entrance'],
              'Fees Paid Receipt': ['fees paid', 'receipt', 'fees verified'],
              'Caste Certificate (Optional)': ['caste'],
              'Income / Gap Year Certificate': ['income', 'gap'],
              'Domicile / Study Certificate': ['study', 'domicile']
            };

            let modified = false;
            Object.keys(savedStatuses).forEach(label => {
              const keywords = matches[label] || [];
              const isDocCorrected = keywords.some(kw => remarksLower.includes(kw)) || remarksLower.includes(label.toLowerCase());
              if (isDocCorrected && savedStatuses[label] === 'REJECTED') {
                delete savedStatuses[label];
                modified = true;
              }
            });
            if (modified) {
              localStorage.setItem(`doc_status_${appId}`, JSON.stringify(savedStatuses));
            }
          }

          setDocStatus(savedStatuses);
        } catch (e) {
          console.error('Error parsing saved document statuses from localStorage', e);
        }
      }

      const restoredReasonCode = data.applicationStatus === 'SUBMITTED' || data.applicationStatus === 'UNDER_REVIEW' || data.applicationStatus === 'RESUBMITTED'
        ? ''
        : (data.rejectionReasonCode || '');
      setRejectionReasonCode(restoredReasonCode);

      // Auto-build remarks from all sources: reason + rejected docs + missing fields
      const autoRemarks = buildRemarks(data, savedStatuses, restoredReasonCode);
      // Use saved adminRemarks if they exist for non-pending apps, else auto-generate
      const isPendingReview = data.applicationStatus === 'SUBMITTED' || data.applicationStatus === 'UNDER_REVIEW' || data.applicationStatus === 'RESUBMITTED';
      setRemarks(isPendingReview ? autoRemarks : (data.adminRemarks || autoRemarks));

      setDocumentsVerified(data.documentsVerified || false);
      setEligibilityVerified(data.eligibilityVerified || false);
      setVerificationRemarks(data.verificationRemarks || '');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to load application');
      navigate('/admin/admissions/queue');
    } finally {
      setLoading(false);
    }
  };


  // ─── Auto-rebuild remarks whenever doc status or reason code changes ──────
  useEffect(() => {
    if (!app) return;
    const auto = buildRemarks(app, docStatus, rejectionReasonCode);
    if (auto) setRemarks(auto);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docStatus, rejectionReasonCode]);

  const handleToggleDocStatus = (label: string, status: 'ACCEPTED' | 'REJECTED') => {
    const updatedStatus = { ...docStatus, [label]: status };
    setDocStatus(updatedStatus);
    if (id) {
      localStorage.setItem(`doc_status_${id}`, JSON.stringify(updatedStatus));
    }
    // Auto-switch rejection code to DOC_NOT_VERIFIED when docs are rejected
    if (status === 'REJECTED' && !rejectionReasonCode) {
      setRejectionReasonCode('DOC_NOT_VERIFIED');
    }
  };

  const handleReasonChange = (code: string) => {
    setRejectionReasonCode(code);
  };


  const handleUpdateStatus = async (status: 'APPROVED' | 'REJECTED' | 'UNDER_REVIEW' | 'ENROLLED' | 'CORRECTION_REQUIRED') => {
    if (!app) return;

    if (status === 'CORRECTION_REQUIRED') {
      if (!remarks || !remarks.trim()) {
        toast.error('Internal Remarks (Correction Requests) must be filled before sending for correction.');
        return;
      }
      const confirmed = window.confirm(
        `Send this application back to the student for correction?\n\nThe student will be asked to review and resubmit the highlighted sections.\n\nCorrection notes will be sent:\n${remarks.slice(0, 200)}${remarks.length > 200 ? '...' : ''}`
      );
      if (!confirmed) return;
    }

    if (status === 'REJECTED') {
      if (!rejectionReasonCode) {
        toast.error('rejectionReasonCode is required when status is REJECTED.');
        return;
      }
      if (rejectionReasonCode === 'OTHER' && (!remarks || !remarks.trim())) {
        toast.error('Remarks are mandatory when rejection reason is OTHER.');
        return;
      }
 
      const reasonLabels: Record<string, string> = {
        'DOC_NOT_VERIFIED': 'Documents Not Verified',
        'INCOMPLETE_DOCUMENTS': 'Incomplete Documents',
        'FEES_NOT_PAID': 'Fees Not Paid',
        'ELIGIBILITY_FAILED': 'Eligibility Criteria Not Met',
        'INVALID_CERTIFICATES': 'Invalid / Mismatched Certificates',
        'DUPLICATE_APPLICATION': 'Duplicate Application Found',
        'AADHAAR_MISMATCH': 'Aadhaar Verification Failed',
        'USN_CONFLICT': 'USN Conflict / Already Exists',
        'OTHER': 'Other',
      };
      const label = reasonLabels[rejectionReasonCode] || rejectionReasonCode;
 
      const confirmed = window.confirm(
        `Are you sure you want to reject this application?\n\nReason: ${label}\nThis action is final and will notify the applicant.`
      );
      if (!confirmed) return;
    }

    const isLegacyFeeStatus = app.applicationStatus === 'FEE_RECEIPT_UPLOADED' || app.applicationStatus === 'FEE_VERIFIED';
    if (status === 'APPROVED' && !isLegacyFeeStatus && (!documentsVerified || !eligibilityVerified)) {
      toast.error('Please complete document and eligibility verification checks before approving the application.');
      return;
    }

    if (status === 'ENROLLED') {
      const confirmed = window.confirm(
        `Are you sure you want to finalize this admission?\n\nThis will auto-generate the USN/Enrollment details and register the student user.`
      );
      if (!confirmed) return;
    }

    setUpdating(true);
    try {
      if (status === 'APPROVED') {
        // Auto-save the ticked checklist values to DB
        await admissionService.verifyChecklist(app.id, {
          documentsVerified,
          eligibilityVerified,
          verificationRemarks
        });
      }
      let label: string | undefined = undefined;
      if (status === 'REJECTED' && rejectionReasonCode) {
        const reasonLabels: Record<string, string> = {
          'DOC_NOT_VERIFIED': 'Documents Not Verified',
          'INCOMPLETE_DOCUMENTS': 'Incomplete Documents',
          'FEES_NOT_PAID': 'Fees Not Paid',
          'ELIGIBILITY_FAILED': 'Eligibility Criteria Not Met',
          'INVALID_CERTIFICATES': 'Invalid / Mismatched Certificates',
          'DUPLICATE_APPLICATION': 'Duplicate Application Found',
          'AADHAAR_MISMATCH': 'Aadhaar Verification Failed',
          'USN_CONFLICT': 'USN Conflict / Already Exists',
          'OTHER': 'Other',
        };
        label = reasonLabels[rejectionReasonCode] || rejectionReasonCode;
      }
      // Auto-derive affected sections for CORRECTION_REQUIRED
      let correctionSections: string[] | undefined = undefined;
      if (status === 'CORRECTION_REQUIRED') {
        const sectionSet = new Set<string>();

        // If any documents are rejected → 'documents' section
        const hasRejectedDocs = Object.values(docStatus).some(s => s === 'REJECTED');
        if (hasRejectedDocs) sectionSet.add('documents');

        // Map missing field prefixes → form sections
        const missing = getMissingFields(app);
        missing.forEach(f => {
          if (f.startsWith('Address:'))  sectionSet.add('address');
          if (f.startsWith('Academic:')) sectionSet.add('academic');
          if (f.startsWith('Documents:')) sectionSet.add('documents');
          if (f.startsWith('Personal:') || f.startsWith('Admission:')) sectionSet.add('personal');
          if (f.startsWith('Parent:'))  sectionSet.add('parent');
        });

        // Always include at least 'documents' if remarks mention document issues
        if (sectionSet.size === 0) sectionSet.add('documents');

        correctionSections = Array.from(sectionSet);
      }

      await admissionService.updateStatus(app.id, status, remarks, label, rejectionReasonCode, correctionSections);

      if (status === 'APPROVED') {
        toast.success('Application approved successfully. Student can now pay ₹500 Admission Processing Fee.');
        navigate('/admin/admissions/queue');
      } else if (status === 'REJECTED') {
        toast.success('Application rejected and student has been notified.');
        navigate('/admin/admissions/rejected');
      } else if (status === 'CORRECTION_REQUIRED') {
        toast.success('Correction request sent to student successfully. Student can now edit and resubmit.');
        navigate('/admin/admissions/queue');
      } else if (status === 'ENROLLED') {
        toast.success('Student enrolled successfully.');
        navigate('/admin/admissions/history');
      } else {
        fetchApplication(app.id);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };


  const handleVerifyChecklist = async () => {
    if (!app) return;
    try {
      setVerifying(true);
      await admissionService.verifyChecklist(app.id, { documentsVerified, eligibilityVerified, verificationRemarks });
      toast.success('Verification checklist saved');
      fetchApplication(app.id);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save checklist');
    } finally {
      setVerifying(false);
    }
  };

  const handleViewDocument = async (field: string, label: string) => {
    if (!app) return;

    const popup = window.open('', '_blank');
    try {
      const response = await API.get(`/admin/admissions/${app.id}/documents/${field}`, {
        responseType: 'blob',
      });
      const blobUrl = URL.createObjectURL(response.data);

      if (popup) {
        popup.location.href = blobUrl;
      } else {
        const link = document.createElement('a');
        link.href = blobUrl;
        link.target = '_blank';
        link.rel = 'noreferrer';
        link.click();
      }

      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    } catch (err: any) {
      if (popup) popup.close();
      toast.error(err.response?.data?.error || `Unable to open ${label}`);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
        <div className="size-10 rounded-full border-4 border-violet-100 border-t-violet-600 animate-spin mb-4" />
        <p className="text-neutral-500 font-bold uppercase tracking-widest text-xs">Loading Application Form...</p>
      </div>
    );
  }

  if (!app) {
    return <div className="p-8 text-center bg-rose-50 rounded-2xl border border-rose-100 text-rose-600 font-bold mt-6">Application not found.</div>;
  }

  const pd = app.studentpersonaldetails as any;
  const par = app.studentparentdetails as any;
  const addr = app.studentaddress as any;
  const acad = app.studentacademicdetails as any;
  const docs = app.studentdocuments as any;
  const q = (app.qualification || '').toUpperCase();
  const showPUC = q === 'PUC' || (!q && app.admissionType === 'KCET');
  const showDiploma = q === 'DIPLOMA' || (!q && app.admissionType === 'DCET');
  const profilePhotoUrl = getDocUrl(docs?.photoUrl || app.user?.profileImage);

  const missingFields = getMissingFields(app);

  return (
    <CorrectionContext.Provider value={{ remarks: app?.correctionRemarks || null, status: app?.applicationStatus || '' }}>
      <div className="space-y-6 animate-fade-in w-full pb-12">
      
      {/* Top action bar */}
      <div className="flex items-center justify-between">
        <button onClick={handleBack}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl hover:bg-neutral-50 transition-colors shadow-sm text-sm font-semibold text-neutral-600 dark:text-neutral-300">
          <ArrowLeft size={16} /> Back to Admissions Queue
        </button>
        <span className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider rounded-lg ${
          app.applicationStatus === 'RESUBMITTED' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/20 border border-amber-300' :
          app.applicationStatus === 'CORRECTION_REQUIRED' ? 'bg-rose-100 text-rose-700' :
          app.applicationStatus === 'APPROVED' ? 'bg-indigo-100 text-indigo-700' :
          app.applicationStatus === 'ENROLLED' ? 'bg-emerald-100 text-emerald-700' :
          app.applicationStatus === 'REJECTED' ? 'bg-rose-100 text-rose-700' :
          app.applicationStatus === 'UNDER_REVIEW' ? 'bg-blue-100 text-blue-700' :
          'bg-amber-100 text-amber-700'}`}>
          Status: {
            app.applicationStatus === 'RESUBMITTED' ? 'RESUBMITTED' :
            app.applicationStatus === 'CORRECTION_REQUIRED' ? 'CORRECTION REQUIRED' :
            app.applicationStatus === 'APPROVED' ? 'VERIFIED' :
            app.applicationStatus === 'ENROLLED' ? 'APPROVED' :
            app.applicationStatus === 'UNDER_REVIEW' ? 'IN PROGRESS' :
            app.applicationStatus === 'SUBMITTED' ? 'PENDING REVIEW' :
            app.applicationStatus
          }
        </span>
      </div>

      {/* Resubmitted Banner */}
      {app.applicationStatus === 'RESUBMITTED' && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-500 p-5 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in no-print">
          <div className="space-y-1">
            <h4 className="text-xs sm:text-sm font-extrabold text-amber-850 dark:text-amber-400 flex items-center gap-2">
              <span className="inline-block size-3 rounded-full bg-amber-500 animate-pulse" />
              🟠 Resubmitted After Corrections
            </h4>
            <p className="text-[11px] sm:text-xs text-amber-700 dark:text-amber-300 font-medium">
              The student has corrected and resubmitted the requested sections. Please review the highlighted sections with orange borders.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {app.correctionRequestedSections?.map(s => {
              const labelMap: Record<string, string> = {
                admission: 'Admission Details',
                personal: 'Personal Details',
                parent: 'Parent Details',
                address: 'Address Details',
                academic: 'Academic Details',
                documents: 'Documents Upload'
              };
              return (
                <span key={s} className="px-2.5 py-1 bg-amber-100 text-amber-805 rounded-lg text-xs font-black border border-amber-300">
                  ✔ {labelMap[s] || s}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Missing Fields Warning */}
      {missingFields.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-500 p-5 rounded-r-2xl shadow-sm space-y-2">
          <h4 className="text-xs uppercase font-extrabold tracking-widest text-amber-800 dark:text-amber-400">
            ⚠️ Missing / Unfilled Fields Detected ({missingFields.length})
          </h4>
          <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
            The candidate has not filled or uploaded the following details:
          </p>
          <ul className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-1 list-disc pl-5">
            {missingFields.map((field) => (
              <li key={field} className="text-[11px] font-bold text-amber-800 dark:text-amber-300">
                {field}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Main Form Sheet */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-xl overflow-hidden p-8 md:p-12 space-y-8">
        
        {/* Form Title & Watermark header */}
        <div className="border-b-2 border-neutral-100 dark:border-neutral-800 pb-6 flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-xl md:text-2xl font-extrabold text-neutral-900 dark:text-white uppercase tracking-wider">
              Official Student Admission Form
            </h1>
            <p className="text-sm font-bold text-neutral-400">Jain College of Engineering & Research</p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="px-2.5 py-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 rounded text-xs font-extrabold">
                ADM NO: {app.applicationNumber}
              </span>
              <span className="px-2.5 py-1 bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded text-xs font-extrabold">
                SESSION: {app.academicYear || getAcademicYear()}
              </span>
              {app.admissionType && (
                <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs font-extrabold">
                  TYPE: {app.admissionType} {showDiploma ? '(Lateral Entry)' : ''}
                </span>
              )}
              {app.qualification && (
                <span className="px-2.5 py-1 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded text-xs font-extrabold">
                  QUALIFICATION: {app.qualification === 'DIPLOMA' ? 'Diploma' : 'PUC / 12th'}
                </span>
              )}
            </div>
          </div>

          {/* Student Avatar (prominently displayed at the top right of the form like a physical photo) */}
          <div className="flex flex-col items-center shrink-0">
            <div className="w-28 h-36 border-2 border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden bg-neutral-50 dark:bg-neutral-800 flex items-center justify-center shadow-md relative">
              {profilePhotoUrl ? (
                <img src={profilePhotoUrl} alt="applicant-passport" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center p-2 text-neutral-400 dark:text-neutral-500">
                  <User size={36} className="mx-auto mb-1 opacity-40" />
                  <span className="text-[10px] font-bold block uppercase tracking-wider">Passport Photo</span>
                </div>
              )}
            </div>
            <span className="text-[9px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mt-2">Affixed Photo</span>
          </div>
        </div>

        {/* ─── SECTION 1: Personal Profile ─── */}
        <div className={getSectionClass('personal')}>
          <h3 className="text-xs uppercase font-black tracking-widest text-neutral-450 flex items-center justify-between border-l-4 border-primary-500 pl-2">
            <span className="flex items-center gap-2">
              <User size={14} className="text-primary-500" /> Personal Details
            </span>
            {app?.applicationStatus === 'RESUBMITTED' && (
              isSectionCorrected('personal') 
                ? <span className="text-[10px] bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full font-bold">🟠 Corrected Section</span>
                : <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold">✅ Already Verified</span>
            )}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-5 gap-y-4">
            <FormField label="First Name" value={pd?.firstName} />
            <FormField label="Middle Name" value={pd?.middleName} />
            <FormField label="Last Name" value={pd?.lastName} />
            <FormField label="Gender" value={pd?.gender} />
            <FormField label="Date of Birth" value={pd?.dateOfBirth} />
            <FormField label="Nationality" value={pd?.nationality} />
            <FormField label="Religion" value={pd?.religion} />
            <FormField label="Caste" value={pd?.caste} />
            <FormField label="Category" value={pd?.category} />
            <FormField label="Area Type" value={pd?.areaType} />
            <FormField label="Email Address" value={pd?.email || app.user?.email} />
            <FormField label="Mobile Number" value={pd?.phone || app.user?.phone} />
          </div>
        </div>

        {/* ─── SECTION 2: Parents Info ─── */}
        <div className={getSectionClass('parent')}>
          <h3 className="text-xs uppercase font-black tracking-widest text-neutral-450 flex items-center justify-between border-l-4 border-primary-500 pl-2">
            <span className="flex items-center gap-2">
              <Users size={14} className="text-primary-500" /> Parent / Guardian Details
            </span>
            {app?.applicationStatus === 'RESUBMITTED' && (
              isSectionCorrected('parent') 
                ? <span className="text-[10px] bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full font-bold">🟠 Corrected Section</span>
                : <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold">✅ Already Verified</span>
            )}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Father card */}
            <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-3">
              <p className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">Father's Information</p>
              <div className="grid grid-cols-2 gap-x-5 gap-y-3">
                <FormField label="Name" value={par?.fatherName} />
                <FormField label="Occupation" value={par?.fatherOccupation} />
                <FormField label="Mobile" value={par?.fatherPhone} />
                <FormField label="Annual Income" value={par?.fatherAnnualIncome ? `₹${par.fatherAnnualIncome.toLocaleString()}` : null} />
              </div>
            </div>
            {/* Mother card */}
            <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-3">
              <p className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">Mother's & Guardian Information</p>
              <div className="grid grid-cols-2 gap-x-5 gap-y-3">
                <FormField label="Mother Name" value={par?.motherName} />
                <FormField label="Mother Occupation" value={par?.motherOccupation} />
                <FormField label="Mother Mobile" value={par?.motherPhone} />
                <FormField label="Guardian Name" value={par?.guardianName || 'N/A'} />
              </div>
            </div>
          </div>
        </div>

        {/* ─── SECTION 3: Address Details ─── */}
        <div className={getSectionClass('address')}>
          <h3 className="text-xs uppercase font-black tracking-widest text-neutral-450 flex items-center justify-between border-l-4 border-primary-500 pl-2">
            <span className="flex items-center gap-2">
              <MapPin size={14} className="text-primary-500" /> Residential Address
            </span>
            {app?.applicationStatus === 'RESUBMITTED' && (
              isSectionCorrected('address') 
                ? <span className="text-[10px] bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full font-bold">🟠 Corrected Section</span>
                : <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold">✅ Already Verified</span>
            )}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800">
              <p className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-2">Current Residence</p>
              <p className="text-xs font-semibold leading-relaxed text-neutral-700 dark:text-neutral-300">
                {[addr?.currentAddressLine1, addr?.currentAddressLine2, addr?.currentCity, addr?.currentState, addr?.currentPincode, addr?.currentCountry].filter(Boolean).join(', ') || '—'}
              </p>
            </div>
            <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800">
              <p className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-2">Permanent Residence</p>
              {addr?.sameAsCurrent ? (
                <p className="text-xs italic text-neutral-400">Same as current address</p>
              ) : (
                <p className="text-xs font-semibold leading-relaxed text-neutral-700 dark:text-neutral-300">
                  {[addr?.permanentAddressLine1, addr?.permanentAddressLine2, addr?.permanentCity, addr?.permanentState, addr?.permanentPincode, addr?.permanentCountry].filter(Boolean).join(', ') || '—'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ─── SECTION 4: Academics ─── */}
        <div className={getSectionClass('academic')}>
          <h3 className="text-xs uppercase font-black tracking-widest text-neutral-450 flex items-center justify-between border-l-4 border-primary-500 pl-2">
            <span className="flex items-center gap-2">
              <GraduationCap size={14} className="text-primary-500" /> Academic Qualifications
            </span>
            {app?.applicationStatus === 'RESUBMITTED' && (
              isSectionCorrected('academic') 
                ? <span className="text-[10px] bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full font-bold">🟠 Corrected Section</span>
                : <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold">✅ Already Verified</span>
            )}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 10th Record */}
            <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-3">
              <p className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">10th Standard (SSLC)</p>
              <div className="grid grid-cols-2 gap-x-5 gap-y-3">
                <FormField label="School Name" value={acad?.tenthSchool} />
                <FormField label="Board" value={acad?.tenthBoard} />
                <FormField label="Passing Year" value={acad?.tenthPassingYear} />
                <FormField label="Register Number" value={acad?.tenthRegisterNumber} />
                <FormField label="Marks Obtained" value={acad?.tenthMarksObtained && acad?.tenthMaxMarks ? `${acad.tenthMarksObtained} / ${acad.tenthMaxMarks}` : null} />
                <FormField label="Attempts" value={acad?.tenthAttempts} />
              </div>
              {acad?.tenthPercentage && (
                <div className="text-xs font-black text-primary-600 bg-primary-50 dark:bg-primary-900/20 px-3 py-1.5 rounded-lg inline-block">
                  Aggregate Percentage: {acad.tenthPercentage}%
                </div>
              )}
            </div>

            {/* 12th/PUC or Diploma Record */}
            {showDiploma && (
              <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-3 bg-blue-50/30 dark:bg-blue-950/10">
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Diploma details (Lateral Entry)</p>
                <div className="grid grid-cols-2 gap-x-5 gap-y-3">
                  <FormField label="University/Institution" value={acad?.diplomaUniversity} />
                  <FormField label="Passing Year" value={acad?.diplomaYear} />
                  <FormField label="Register Number" value={acad?.diplomaRegisterNumber} />
                  <FormField label="Marks Obtained" value={acad?.diplomaFinalYearObtained && acad?.diplomaFinalYearMaxMarks ? `${acad.diplomaFinalYearObtained} / ${acad.diplomaFinalYearMaxMarks}` : null} />
                </div>
                {acad?.diplomaPercentage && (
                  <div className="text-xs font-black text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg inline-block">
                    Diploma Percentage: {acad.diplomaPercentage}%
                  </div>
                )}
              </div>
            )}
            {showPUC && (
              <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-3">
                <p className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">12th Standard / PUC</p>
                <div className="grid grid-cols-2 gap-x-5 gap-y-3">
                  <FormField label="School / College" value={acad?.twelfthSchool} />
                  <FormField label="Board" value={acad?.twelfthBoard} />
                  <FormField label="Passing Year" value={acad?.twelfthPassingYear} />
                  <FormField label="Register Number" value={acad?.twelfthRegisterNumber} />
                  <FormField label="Stream" value={acad?.twelfthStream} />
                  <FormField label="Physics Marks" value={acad?.physicsMarks} />
                  <FormField label="Maths Marks" value={acad?.mathsMarks} />
                  <FormField label="Optional Marks" value={acad?.optionalMarks} />
                </div>
                {acad?.twelfthPercentage && (
                  <div className="text-xs font-black text-primary-600 bg-primary-50 dark:bg-primary-900/20 px-3 py-1.5 rounded-lg inline-block">
                    Aggregate Percentage: {acad.twelfthPercentage}%
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Entrance Exams */}
          {(acad?.cetScore || acad?.cetRank || app.cetNumber || app.dcetNumber) && (
            <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-3">
              <p className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">Entrance Examination Details</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-5 gap-y-3">
                {app.cetNumber && <FormField label="KCET Number" value={app.cetNumber} />}
                {app.cetNumber && acad?.cetScore && <FormField label="KCET Score" value={acad?.cetScore} />}
                {app.cetNumber && acad?.cetRank && <FormField label="KCET Rank" value={`#${acad?.cetRank}`} />}
                {app.dcetNumber && <FormField label="DCET Number" value={app.dcetNumber} />}
                {app.dcetNumber && acad?.cetScore && <FormField label="DCET Score" value={acad?.cetScore} />}
                {app.dcetNumber && acad?.cetRank && <FormField label="DCET Rank" value={`#${acad?.cetRank}`} />}
              </div>
            </div>
          )}
        </div>

        {/* ─── SECTION 5: Uploaded Documents ─── */}
        <div className={getSectionClass('documents', "space-y-4 bg-slate-50 dark:bg-neutral-800/30 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800")}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-neutral-850 dark:text-neutral-200 flex items-center justify-between pr-4 w-full">
                <span className="flex items-center gap-2">
                  <FileText size={18} className="text-primary-600" /> Attached Digital Documents Verification
                </span>
                {app?.applicationStatus === 'RESUBMITTED' && (
                  isSectionCorrected('documents') 
                    ? <span className="text-[10px] bg-amber-100 text-amber-805 px-2.5 py-0.5 rounded-full font-black">🟠 Corrected Section</span>
                    : <span className="text-[10px] bg-emerald-200 text-emerald-805 px-2.5 py-0.5 rounded-full font-black">✅ Already Verified</span>
                )}
              </h3>
              <p className="text-xs text-neutral-500 font-medium mt-0.5">
                Review and verify all uploaded certificates in a dedicated high-resolution workspace.
              </p>
            </div>

            {/* SINGLE PROMINENT ACTION BUTTON */}
            <button
              type="button"
              onClick={() => {
                console.log("Button clicked: Review Documents");
                if (app?.id) {
                  console.log("Navigating to Review Workspace for appId:", app.id);
                  navigate(`/admin/admissions/workspace/${app.id}`);
                }
                setIsWorkspaceOpen(true);
              }}
              className="px-6 py-3 bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 text-white font-extrabold text-sm rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              <Layers size={18} /> 📄 Review Documents
            </button>
          </div>

          {docs ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
              {[
                { label: 'Passport Size Photo', field: 'photo', url: docs.photoUrl },
                { label: 'Candidate E-Signature', field: 'signature', url: docs.signatureUrl },
                { label: 'SSLC / 10th Marks Card', field: 'tenthMarksheet', url: docs.tenthMarksheetUrl },
                ...(showDiploma ? [
                  { label: 'Diploma 5th Semester Marks Card', field: 'diplomaSemester5Marksheet', url: docs.diplomaSemester5MarksheetUrl },
                  { label: 'Diploma 6th Semester Marks Card', field: 'diplomaSemester6Marksheet', url: docs.diplomaSemester6MarksheetUrl },
                ] : [
                  { label: 'PUC / 12th Marks Card', field: 'twelfthMarksheet', url: docs.twelfthMarksheetUrl },
                ]),
                { label: 'Entrance Score Card (CET/DCET)', field: 'cetScoreCard', url: docs.cetScoreCardUrl },
                { label: 'Aadhaar Card copy', field: 'aadhaar', url: docs.aadhaarUrl },
                { label: 'Fees Paid Receipt', field: 'feesPaidReceipt', url: docs.feesPaidReceiptUrl },
                { label: 'Caste Certificate (Optional)', field: 'casteCertificate', url: docs.casteCertificateUrl },
                { label: 'Domicile / Study Certificate', field: 'domicileCertificate', url: docs.domicileCertificateUrl },
                { label: 'Income / Gap Year Certificate', field: 'gapCertificate', url: docs.gapCertificateUrl },
              ]
                .filter(({ url }) => url !== null && url !== undefined && url !== '') // Only show uploaded docs
                .map(({ label, field, url }) => {
                  const status = docStatus[label] || 'PENDING';
                  const isCorrected = app?.applicationStatus === 'RESUBMITTED' && status !== 'ACCEPTED' && status !== 'REJECTED' && (() => {
                    if (!app?.correctionRemarks) return false;
                    const remarksLower = app.correctionRemarks.toLowerCase();
                    const matches: Record<string, string[]> = {
                      photo: ['passport', 'photo'],
                      signature: ['signature'],
                      tenthmarksheet: ['sslc', '10th', 'tenth'],
                      twelfthmarksheet: ['puc', '12th', 'twelfth'],
                      diplomasemester5marksheet: ['diploma 5th', 'semester 5', 'sem 5'],
                      diplomasemester6marksheet: ['diploma 6th', 'semester 6', 'sem 6'],
                      cetscorecard: ['cet', 'dcet', 'entrance'],
                      feespaidreceipt: ['fees paid', 'receipt', 'fees verified'],
                      castecertificate: ['caste'],
                      gapcertificate: ['income', 'gap'],
                      domicilecertificate: ['study', 'domicile']
                    };
                    const keywords = matches[field.toLowerCase()] || [];
                    return keywords.some(kw => remarksLower.includes(kw)) || remarksLower.includes(label.toLowerCase());
                  })();

                  return (
                    <div
                      key={label}
                      onClick={() => {
                        console.log("Document card clicked: Review Documents");
                        if (app?.id) {
                          console.log("Navigating to Review Workspace for appId:", app.id);
                          navigate(`/admin/admissions/workspace/${app.id}`);
                        }
                        setIsWorkspaceOpen(true);
                      }}
                      className={`flex items-center justify-between p-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all hover:scale-[1.01] ${
                        isCorrected
                          ? 'bg-amber-50/80 border-amber-300 text-amber-900 dark:bg-amber-950/20 dark:border-amber-800'
                          : status === 'ACCEPTED'
                          ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900 dark:bg-emerald-950/20 dark:border-emerald-800'
                          : status === 'REJECTED'
                          ? 'bg-rose-50/80 border-rose-200 text-rose-900 dark:bg-rose-950/20 dark:border-rose-800'
                          : 'bg-white border-neutral-200 text-neutral-800 dark:bg-neutral-850 dark:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isCorrected ? 'bg-amber-100 text-amber-600' :
                          status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-600' :
                          status === 'REJECTED' ? 'bg-rose-100 text-rose-600' :
                          'bg-amber-100 text-amber-600'
                        }`}>
                          {isCorrected && <Clock size={16} />}
                          {!isCorrected && status === 'ACCEPTED' && <CheckCircle2 size={16} />}
                          {!isCorrected && status === 'REJECTED' && <XCircle size={16} />}
                          {!isCorrected && status === 'PENDING' && <FileText size={16} />}
                        </div>
                        <span className="font-bold truncate">{label}</span>
                      </div>

                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider shrink-0 ${
                        isCorrected ? 'bg-amber-200 text-amber-800 animate-pulse' :
                        status === 'ACCEPTED' ? 'bg-emerald-200 text-emerald-800' :
                        status === 'REJECTED' ? 'bg-rose-200 text-rose-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {isCorrected ? 'Resubmitted' : status === 'ACCEPTED' ? 'Approved' : status === 'REJECTED' ? 'Rejected' : 'Pending'}
                      </span>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="text-center p-6 bg-neutral-50 rounded-xl border border-dashed border-neutral-200 text-neutral-400">
              No files are uploaded by this candidate.
            </div>
          )}
        </div>

        {/* ─── SECTION 6: Checklist Verification ─── */}
        <div className="border-t-2 border-neutral-100 dark:border-neutral-800 pt-6 space-y-4">
          <h3 className="text-xs uppercase font-black tracking-widest text-neutral-400 flex items-center gap-2 border-l-4 border-primary-500 pl-2">
            <ShieldCheck size={14} className="text-primary-500" /> Manual Audit & Verification Checklist
          </h3>
          {(app.applicationStatus === 'APPROVED' || app.applicationStatus === 'ENROLLED') ? (
            <div className="space-y-4">
              {/* Checklist Status (Read-Only) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { checked: app.documentsVerified, title: 'Documents Verified', desc: 'Certificates match originals and are legible.' },
                  { checked: app.eligibilityVerified, title: 'Eligibility Verified', desc: 'Scores and ranks conform with requirements.' },
                ].map(({ checked, title, desc }) => (
                  <div key={title} className={`flex gap-3 p-4 rounded-xl border select-none transition-all ${
                    checked 
                      ? 'bg-emerald-50/20 border-emerald-250 text-emerald-905 dark:bg-emerald-950/20 dark:border-emerald-800/60 dark:text-emerald-350' 
                      : 'bg-rose-50/20 border-rose-250 text-rose-905 dark:bg-rose-950/20 dark:border-rose-800/60 dark:text-rose-350'
                  }`}>
                    <div className="mt-0.5 shrink-0">
                      {checked ? (
                        <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-450" />
                      ) : (
                        <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-450" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider">{title}</p>
                      <p className="text-[11px] text-neutral-500 leading-normal mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Admin Remarks / Notes (Read-Only) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="bg-neutral-50 dark:bg-neutral-800/40 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700/60 space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-neutral-450 block">Verification Specific Remarks / Internal Notes</span>
                  <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 leading-relaxed whitespace-pre-wrap">
                    {app.verificationRemarks || '—'}
                  </p>
                </div>
                <div className="bg-neutral-50 dark:bg-neutral-800/40 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700/60 space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-neutral-450 block">Internal Remarks / Correction Requests (Shown to Student)</span>
                  <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 leading-relaxed whitespace-pre-wrap">
                    {app.adminRemarks || '—'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { checked: documentsVerified, setter: setDocumentsVerified, title: 'Verify Documents', desc: 'Certificates match originals and are legible.' },
                  { checked: eligibilityVerified, setter: setEligibilityVerified, title: 'Verify Eligibility', desc: 'Scores and ranks conform with requirements.' },
                ].map(({ checked, setter, title, desc }) => (
                  <label key={title} className={`flex gap-3 p-4 rounded-xl border cursor-pointer select-none transition-all ${
                    checked ? 'bg-primary-50/30 border-primary-200 text-primary-900' : 'bg-neutral-50/30 border-neutral-200'
                  }`}>
                    <input type="checkbox" checked={checked} onChange={e => setter(e.target.checked)}
                      className="w-5 h-5 rounded border-neutral-300 text-primary-600 focus:ring-primary-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider">{title}</p>
                      <p className="text-[11px] text-neutral-500 leading-normal mt-0.5">{desc}</p>
                    </div>
                  </label>
                ))}
              </div>

              <div className="flex justify-end pt-2">
                <button onClick={handleVerifyChecklist} disabled={verifying}
                  className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-xl text-xs font-bold transition-all disabled:opacity-50 border border-neutral-200 dark:border-neutral-700">
                  {verifying ? 'Updating checklist...' : 'Save Audit Checklist'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 block">Verification specific remarks / internal notes</label>
                  <select
                    value=""
                    onChange={e => {
                      const val = e.target.value;
                      if (!val) return;
                      setVerificationRemarks(prev => {
                        const trimmed = prev.trim();
                        return trimmed ? `${trimmed}\n${val}` : val;
                      });
                    }}
                    className="w-full p-3 bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700/60 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary-500 text-neutral-700 dark:text-neutral-350 cursor-pointer"
                  >
                    <option value="" className="text-neutral-500 bg-white dark:bg-neutral-900">Select quick template...</option>
                    <option value="All details in the application are verified and correct." className="text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-900">✅ All Correct</option>
                    <option value="All original uploaded documents match criteria and are clear." className="text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-900">📄 Docs Match</option>
                    <option value="Fees details and payment receipts matched." className="text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-900">💰 Fees Verified</option>
                    <option value="principal sir , all the details in the application are correct so please approve sir" className="text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-900">🤝 Forward to Principal</option>
                  </select>
                  <textarea value={verificationRemarks} onChange={e => setVerificationRemarks(e.target.value)}
                    className="w-full h-24 p-3 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary-500 resize-none font-medium leading-relaxed"
                    placeholder="Internal verification details..." />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 block">Internal remarks / correction requests (Shown to Student)</label>
                  <textarea value={remarks} onChange={e => setRemarks(e.target.value)}
                    className="w-full h-24 p-3 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary-500 resize-none font-medium leading-relaxed"
                    placeholder={rejectionReasonCode === 'OTHER' ? 'Additional notes (required for "Other" rejection reason)' : 'Additional notes (optional)'}
                    required={rejectionReasonCode === 'OTHER'} />
                </div>
              </div>

              <div className="space-y-1 pt-2">
                <label className={`text-[10px] font-black uppercase tracking-widest block transition-all duration-300 ${rejectionReasonCode ? 'text-rose-400' : 'text-emerald-600'}`}>Rejection Reason (Required if Rejecting Application)</label>
                <select
                  value={rejectionReasonCode}
                  onChange={e => handleReasonChange(e.target.value)}
                  className={`w-full p-3 rounded-xl text-xs outline-none focus:ring-2 font-bold transition-all duration-300 ${
                    rejectionReasonCode
                      ? 'bg-rose-50/30 dark:bg-rose-950/10 border border-rose-200 dark:border-rose-800/60 focus:ring-rose-500 text-rose-700 dark:text-rose-300'
                      : 'bg-emerald-50/20 dark:bg-emerald-950/10 border border-emerald-200 dark:border-emerald-800/60 focus:ring-emerald-500 text-emerald-600 dark:text-emerald-300'
                  }`}
                >
                  <option value="" className="text-neutral-500 bg-white dark:bg-neutral-900">None</option>
                  <option value="DOC_NOT_VERIFIED" className="text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-900">Documents Not Verified</option>
                  <option value="INCOMPLETE_DOCUMENTS" className="text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-900">Incomplete Documents</option>
                  <option value="FEES_NOT_PAID" className="text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-900">Fees Not Paid</option>
                  <option value="ELIGIBILITY_FAILED" className="text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-900">Eligibility Criteria Not Met</option>
                  <option value="INVALID_CERTIFICATES" className="text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-900">Invalid Certificates</option>
                  <option value="DUPLICATE_APPLICATION" className="text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-900">Duplicate Application</option>
                  <option value="AADHAAR_MISMATCH" className="text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-900">Aadhaar Verification Failed</option>
                  <option value="USN_CONFLICT" className="text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-900">USN Conflict</option>
                  <option value="OTHER" className="text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-900">Other</option>
                </select>
              </div>
            </>
          )}

          {/* Form Action Controls (Bottom of the form) */}
          <div className="border-t border-neutral-100 dark:border-neutral-800 pt-6 flex flex-col md:flex-row gap-3 justify-end w-full">
            {app.applicationStatus !== 'REJECTED' && app.applicationStatus !== 'ENROLLED' && app.applicationStatus !== 'APPROVED' && app.applicationStatus !== 'PRINCIPAL_APPROVED' && app.applicationStatus !== 'CORRECTION_REQUIRED' && (
              <div className="flex flex-col sm:flex-row gap-3 w-full justify-end">
                {/* Reject Application */}
                <button disabled={updating} onClick={() => handleUpdateStatus('REJECTED')}
                  className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-md shadow-rose-600/10">
                  <XCircle size={16} /> Reject Application
                </button>
                {/* Send for Correction */}
                <button disabled={updating} onClick={() => handleUpdateStatus('CORRECTION_REQUIRED')}
                  className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-md shadow-amber-500/10">
                  {updating ? <Loader2 size={16} className="animate-spin" /> : <AlertTriangle size={16} />}
                  Send for Correction
                </button>
                {/* Approve Application */}
                <button disabled={updating} onClick={() => handleUpdateStatus('APPROVED')}
                  className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-md shadow-emerald-600/10">
                  <CheckCircle2 size={16} /> Approve Application
                </button>
              </div>
            )}

            {/* Already sent for correction — show status banner */}
            {app.applicationStatus === 'CORRECTION_REQUIRED' && (
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-700 rounded-xl p-4 w-full flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle size={18} className="text-amber-600 shrink-0" />
                  <div>
                    <p className="text-sm font-extrabold text-amber-800 dark:text-amber-400">Correction Request Sent to Student</p>
                    <p className="text-xs text-amber-700 dark:text-amber-500 font-semibold mt-0.5">Student is reviewing and will resubmit. Status will update to RESUBMITTED.</p>
                  </div>
                </div>
                <button
                  disabled={updating}
                  onClick={() => handleUpdateStatus('REJECTED')}
                  className="px-4 py-2 border border-rose-300 text-rose-600 hover:bg-rose-50 text-xs font-bold rounded-xl transition-all disabled:opacity-50 shrink-0"
                >
                  Reject Instead
                </button>
              </div>
            )}

            {app.applicationStatus === 'APPROVED' && (
              <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250 dark:border-emerald-800/60 rounded-xl p-4 text-center w-full">
                <p className="text-sm font-black text-emerald-800 dark:text-emerald-400 flex items-center justify-center gap-2">
                  <CheckCircle2 size={18} /> Verified by Admin
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-500 font-semibold mt-1">
                  Application verified by Admin. Sent to Principal for final approval.
                </p>
              </div>
            )}

            {app.applicationStatus === 'PRINCIPAL_APPROVED' && (
              <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250 dark:border-emerald-800/60 rounded-xl p-4 w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                  <div className="text-left">
                    <p className="text-sm font-extrabold text-neutral-800 dark:text-neutral-200">Principal Approved</p>
                    <p className="text-xs text-neutral-500 font-semibold mt-0.5">Approved by Principal. Ready to finalize ERP enrollment and generate USN details.</p>
                  </div>
                </div>
                <button
                  disabled={updating}
                  onClick={() => handleUpdateStatus('ENROLLED')}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-md shadow-emerald-600/10 shrink-0 cursor-pointer"
                >
                  <GraduationCap size={16} /> Finalize Enrollment
                </button>
              </div>
            )}

            {app.applicationStatus === 'ENROLLED' && (
              <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250 dark:border-emerald-800/60 rounded-xl p-4 text-center w-full">
                <p className="text-sm font-black text-emerald-800 dark:text-emerald-400 flex items-center justify-center gap-2">
                  <CheckCircle2 size={18} /> Student Enrolled Successfully
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-500 font-semibold mt-1">
                  The student admission has been confirmed by Principal and enrolled into ERP.
                </p>
              </div>
            )}
          </div>

        </div>

        </div>

      </div>

      {/* ─── DOCUMENT VERIFICATION WORKSPACE OVERLAY ─── */}
      <DocumentVerificationWorkspace
        isOpen={isWorkspaceOpen}
        onClose={() => setIsWorkspaceOpen(false)}
        appId={app.id}
        studentName={`${pd?.firstName || ''} ${pd?.lastName || ''}`.trim() || app.user?.firstName || app.user?.email || 'Student'}
        appNumber={app.applicationNumber}
        appStatus={app.applicationStatus}
        documents={docs || {}}
        initialDocStatus={docStatus}
        correctionRemarks={app.correctionRemarks}
        onCompleteVerification={(updatedDocStatuses, allVerified, rejectionNotes) => {
          setDocStatus(updatedDocStatuses);
          setDocumentsVerified(allVerified);
          if (app.id) {
            localStorage.setItem(`doc_status_${app.id}`, JSON.stringify(updatedDocStatuses));
          }

          // Check if any documents were rejected
          const hasRejectedDocs = Object.values(updatedDocStatuses).some(s => s === 'REJECTED');

          // Auto-switch rejection reason to DOC_NOT_VERIFIED when docs are rejected
          // and no reason has been set yet (or it was already DOC_NOT_VERIFIED)
          let effectiveCode = rejectionReasonCode;
          if (hasRejectedDocs && (!rejectionReasonCode || rejectionReasonCode === 'DOC_NOT_VERIFIED')) {
            effectiveCode = 'DOC_NOT_VERIFIED';
            setRejectionReasonCode('DOC_NOT_VERIFIED');
          }

          // Build combined internal remarks: reason remark + rejection notes
          const reasonRemarksMap: Record<string, string> = {
            'DOC_NOT_VERIFIED': 'Documents verification failed during admin review.',
            'INCOMPLETE_DOCUMENTS': 'Some mandatory documents were not uploaded or are missing.',
            'FEES_NOT_PAID': 'Application fees have not been paid or verified.',
            'ELIGIBILITY_FAILED': 'Candidate does not meet the minimum eligibility criteria.',
            'INVALID_CERTIFICATES': 'Uploaded certificates are invalid, expired, or mismatched.',
            'DUPLICATE_APPLICATION': 'A duplicate admission application was found for this candidate.',
            'AADHAAR_MISMATCH': 'Aadhaar card details do not match the personal profile.',
            'USN_CONFLICT': 'USN already exists or is assigned to another student.',
          };
          const reasonRemark = reasonRemarksMap[effectiveCode] || '';

          if (rejectionNotes && rejectionNotes.trim()) {
            const parts = [reasonRemark, rejectionNotes].filter(Boolean);
            setRemarks(parts.join('\n\n'));
          } else if (reasonRemark) {
            setRemarks(reasonRemark);
          }
        }}
      />
    </CorrectionContext.Provider>
  );
};

export default AdmissionReviewPage;