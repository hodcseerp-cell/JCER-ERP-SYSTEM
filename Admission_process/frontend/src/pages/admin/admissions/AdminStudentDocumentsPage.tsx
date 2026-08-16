import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API, { getBaseHostURL } from '../../../services/api';
import { 
  ArrowLeft, Download, Eye, FileText, CheckCircle2, XCircle, Loader2, User, AlertTriangle, X 
} from 'lucide-react';
import { toast } from 'react-toastify';

export const AdminStudentDocumentsPage: React.FC = () => {
  const { applicationId } = useParams<{ applicationId: string }>();
  const navigate = useNavigate();
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [zipLoading, setZipLoading] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<{ label: string; url: string; isPdf: boolean } | null>(null);
  const [fetchingDocField, setFetchingDocField] = useState<string | null>(null);

  const DOCUMENT_FIELDS = [
    { field: 'photo', label: 'Candidate Photograph' },
    { field: 'signature', label: 'Candidate Signature' },
    { field: 'tenthMarksheet', label: 'SSLC / 10th Marksheet' },
    { field: 'twelfthMarksheet', label: 'PUC / 12th Marksheet' },
    { field: 'diplomaSemester5Marksheet', label: 'Diploma Semester 5 Marksheet' },
    { field: 'diplomaSemester6Marksheet', label: 'Diploma Semester 6 Marksheet' },
    { field: 'cetScoreCard', label: 'CET / DCET Score Card' },
    { field: 'aadhaar', label: 'Aadhaar Card' },
    { field: 'casteCertificate', label: 'Caste Certificate' },
    { field: 'domicileCertificate', label: 'Study Certificate' },
    { field: 'gapCertificate', label: 'Income Certificate' },
    { field: 'feesPaidReceipt', label: 'College Fee Receipt' },
    { field: 'admissionFeeReceipt', label: 'Admission Fee Receipt' },
    { field: 'admissionFormFeeReceipt', label: 'Admission Form Fee Receipt' },
  ];

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const res = await API.get(`/admin/admissions/${applicationId}`);
      if (res.data?.success) {
        setStudent(res.data.data);
      } else {
        toast.error('Failed to load application details.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load application details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (applicationId) {
      fetchDetails();
    }
  }, [applicationId]);

  const handleDownloadZip = async () => {
    if (!applicationId) return;
    setZipLoading(true);
    const toastId = toast.loading('Generating documents ZIP…');
    try {
      const response = await API.get(`/admin/admissions/${applicationId}/documents/zip`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'application/zip' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const studentName = student?.user 
        ? `${student.user.firstName || ''} ${student.user.lastName || ''}`.trim()
        : 'student';
      const appNum = student?.applicationNumber || `TEMP-${applicationId}`;
      
      link.setAttribute('download', `${studentName.replace(/[^a-zA-Z0-9]/g, '_')}_${appNum}_docs.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.dismiss(toastId);
      toast.success('ZIP downloaded successfully!');
    } catch (err) {
      console.error(err);
      toast.dismiss(toastId);
      toast.error('Failed to generate ZIP archive.');
    } finally {
      setZipLoading(false);
    }
  };

  const handleAction = (field: string, label: string, actionType: 'view' | 'download', rawUrl?: string | null) => {
    const token = localStorage.getItem('token') || '';
    const base = API.defaults.baseURL || '/api';
    const cleanPath = `/admin/admissions/${applicationId}/documents/${field}`;
    const url = `${base}${cleanPath}`;
    const fullUrl = token ? `${url}?token=${encodeURIComponent(token)}` : url;
    const isPdfFile = !!(rawUrl?.toLowerCase().includes('.pdf'));

    if (actionType === 'view') {
      setViewingDoc({ label, url: fullUrl, isPdf: isPdfFile });
    } else {
      const link = document.createElement('a');
      link.href = fullUrl;
      link.setAttribute('download', `${label.replace(/\s+/g, '_')}${isPdfFile ? '.pdf' : '.jpg'}`);
      link.setAttribute('target', '_blank');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(`${label} download started.`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-neutral-500 dark:text-neutral-400 font-medium">Loading documents workspace...</p>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center">
        <AlertTriangle className="w-16 h-16 text-rose-500 mx-auto mb-4" />
        <h2 className="text-2xl font-black text-neutral-900 dark:text-white uppercase tracking-wider mb-2">Application Not Found</h2>
        <p className="text-neutral-500 dark:text-neutral-400 mb-6">We could not locate the student admission details for application ID: {applicationId}</p>
        <button 
          onClick={() => navigate(-1)}
          className="px-6 py-3 bg-neutral-950 hover:bg-neutral-800 text-white rounded-2xl font-bold flex items-center gap-2 mx-auto transition-colors"
        >
          <ArrowLeft size={16} /> Go Back
        </button>
      </div>
    );
  }

  const pd = student.studentpersonaldetails || {};
  const branchName = student.branch?.name || 'General';
  const branchCode = student.branch?.code || 'GEN';
  const studentName = student.user 
    ? `${student.user.firstName || ''} ${student.user.lastName || ''}`.trim() 
    : `${pd.firstName || ''} ${pd.lastName || ''}`.trim() || 'Student';
  const docsObj = student.studentdocuments || {};

  return (
    <div className="p-6 max-w-7xl mx-auto min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Header Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-3 bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/80 hover:bg-neutral-50 rounded-2xl transition-colors cursor-pointer"
          >
            <ArrowLeft size={18} className="text-neutral-700 dark:text-neutral-300" />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-neutral-900 dark:text-white uppercase tracking-wider">Student Documents</h1>
            <p className="text-xs text-neutral-550 dark:text-neutral-450 font-medium">Verify, preview, and download individual or packaged documents.</p>
          </div>
        </div>

        <button 
          onClick={handleDownloadZip}
          disabled={zipLoading}
          className="px-5 py-3 bg-indigo-650 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-2xl text-xs font-bold transition-all flex items-center gap-2.5 shadow-md shadow-indigo-600/10 cursor-pointer disabled:cursor-not-allowed"
        >
          {zipLoading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          Download All (ZIP)
        </button>
      </div>

      {/* Info Overview Card */}
      <div className="bg-white/40 dark:bg-neutral-900/40 backdrop-blur-md border border-neutral-200/50 dark:border-neutral-800/50 rounded-3xl p-6 md:p-8 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-455 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
            <User size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-neutral-900 dark:text-white uppercase tracking-wide">{studentName}</h2>
            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 mt-1.5 text-xs text-neutral-550 dark:text-neutral-450 font-bold">
              <span>App: <span className="text-indigo-600 dark:text-indigo-455">{student.applicationNumber || 'Draft'}</span></span>
              <span className="hidden sm:inline opacity-30">•</span>
              <span>Branch: <span>{branchName} ({branchCode})</span></span>
              <span className="hidden sm:inline opacity-30">•</span>
              <span>Academic Year: <span>{student.academicYear || '2026-2027'}</span></span>
            </div>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-3">
          <span className="text-xs font-black uppercase tracking-wider text-neutral-500">Status:</span>
          <span className="px-3.5 py-1.5 bg-violet-100 text-violet-850 dark:bg-violet-900/30 dark:text-violet-400 border border-violet-200 dark:border-violet-900/50 rounded-xl text-xs font-black uppercase tracking-widest">
            {student.applicationStatus}
          </span>
        </div>
      </div>

      {/* Documents List */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/80 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50 dark:bg-neutral-900/60 border-b border-neutral-200 dark:border-neutral-800 text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-555">
                <th className="py-4.5 px-6">Document Type</th>
                <th className="py-4.5 px-6">Filename</th>
                <th className="py-4.5 px-6 text-center">Status</th>
                <th className="py-4.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
              {DOCUMENT_FIELDS.map((doc) => {
                const dbKey = `${doc.field}Url`;
                const rawVal = docsObj[dbKey] || (doc.field === 'admissionFeeReceipt' ? student.admissionFeeReceiptUrl : null);
                const hasUrl = !!rawVal;

                return (
                  <tr key={doc.field} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-900/40 transition-colors">
                    <td className="py-4.5 px-6 font-bold text-xs text-neutral-800 dark:text-neutral-200">
                      {doc.label}
                    </td>
                    <td className="py-4.5 px-6 font-mono text-[10px] text-neutral-450 dark:text-neutral-500 max-w-xs truncate">
                      {hasUrl ? (rawVal.substring(rawVal.lastIndexOf('/') + 1) || 'document') : '—'}
                    </td>
                    <td className="py-4.5 px-6 text-center">
                      {hasUrl ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-450 px-2 py-0.5 rounded-md border border-emerald-100 dark:border-emerald-900/30">
                          <CheckCircle2 size={10} /> Uploaded
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-neutral-450 bg-neutral-100 dark:bg-neutral-800/50 dark:text-neutral-500 px-2 py-0.5 rounded-md border border-neutral-200/50 dark:border-neutral-700/30">
                          <XCircle size={10} /> Empty
                        </span>
                      )}
                    </td>
                    <td className="py-4.5 px-6 text-right">
                      {hasUrl ? (
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => handleAction(doc.field, doc.label, 'view', rawVal)}
                            disabled={fetchingDocField === doc.field}
                            className="p-2 text-neutral-600 dark:text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-xl transition-all cursor-pointer border border-transparent hover:border-indigo-100/50 disabled:opacity-40"
                            title="View Document"
                          >
                            {fetchingDocField === doc.field ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
                          </button>
                          <button
                            onClick={() => handleAction(doc.field, doc.label, 'download', rawVal)}
                            disabled={fetchingDocField === doc.field}
                            className="p-2 text-neutral-600 dark:text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-xl transition-all cursor-pointer border border-transparent hover:border-indigo-100/50 disabled:opacity-40"
                            title="Download Document"
                          >
                            <Download size={14} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-neutral-400 dark:text-neutral-600 italic px-2">Not uploaded</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Document Preview Modal */}
      {viewingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden shadow-2xl relative">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4.5 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60">
              <div>
                <h3 className="text-sm font-black text-neutral-900 dark:text-white uppercase tracking-wider">{viewingDoc.label}</h3>
                <p className="text-[10px] text-neutral-450 dark:text-neutral-500 font-bold uppercase tracking-widest mt-0.5">Application ID: {applicationId}</p>
              </div>
              <button 
                onClick={() => setViewingDoc(null)}
                className="p-2 bg-neutral-200/50 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-750 text-neutral-700 dark:text-neutral-300 rounded-xl transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 bg-neutral-100 dark:bg-neutral-950 p-6 overflow-auto flex items-center justify-center">
              {viewingDoc.isPdf ? (
                <iframe 
                  src={viewingDoc.url} 
                  className="w-full h-full rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white"
                  title="PDF Preview"
                />
              ) : (
                <img 
                  src={viewingDoc.url} 
                  alt={viewingDoc.label}
                  className="max-w-full max-h-full rounded-2xl border border-neutral-200 dark:border-neutral-800 object-contain bg-white dark:bg-neutral-900 shadow-md"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
