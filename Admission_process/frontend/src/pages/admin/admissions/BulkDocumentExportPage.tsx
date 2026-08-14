import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../../services/api';
import admissionService from '../../../services/admission.service';
import { 
  ArrowLeft, Download, RefreshCw, Loader2, Archive, HelpCircle, CheckCircle2, FileArchive 
} from 'lucide-react';
import { toast } from 'react-toastify';
import { getAcademicYear } from '../../../utils/date.util';

export const BulkDocumentExportPage: React.FC = () => {
  const navigate = useNavigate();
  const [branches, setBranches] = useState<{ id: string; name: string; code: string }[]>([]);
  const [academicYear, setAcademicYear] = useState(getAcademicYear());
  const [branchId, setBranchId] = useState('ALL');
  
  // Preview State
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<{ studentCount: number; documentCount: number } | null>(null);
  
  // Download State
  const [downloadLoading, setDownloadLoading] = useState(false);

  const fetchBranches = async () => {
    try {
      const list = await admissionService.getBranches();
      setBranches(list);
    } catch (err) {
      console.error('Failed to load branches:', err);
      toast.error('Failed to load branch list.');
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  const handlePreview = async () => {
    if (!academicYear) {
      toast.error('Please select an Academic Year.');
      return;
    }
    setPreviewLoading(true);
    setPreviewData(null);
    try {
      const res = await API.get('/admin/documents/export/preview', {
        params: { academicYear, branchId }
      });
      if (res.data?.success) {
        setPreviewData({
          studentCount: res.data.studentCount,
          documentCount: res.data.documentCount
        });
        toast.success('Preview loaded.');
      } else {
        toast.error('Failed to load preview statistics.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to retrieve preview details.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!academicYear) return;
    setDownloadLoading(true);
    const toastId = toast.loading('Generating bulk ZIP package (this may take up to a minute)...');
    try {
      const response = await API.get('/admin/documents/export', {
        params: { academicYear, branchId },
        responseType: 'blob',
        timeout: 600000 // 10 minutes timeout for very large archives
      });

      const blob = new Blob([response.data], { type: 'application/zip' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const branchCode = branchId === 'ALL' ? 'ALL' : (branches.find(b => b.id === branchId)?.code || 'BRANCH');
      const filename = `VTU_Documents_${academicYear.replace(/\s+/g, '_')}_${branchCode}.zip`;
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.dismiss(toastId);
      toast.success('Bulk documents package downloaded successfully!');
    } catch (err) {
      console.error(err);
      toast.dismiss(toastId);
      toast.error('Failed to generate bulk ZIP archive. Ensure there are matching students.');
    } finally {
      setDownloadLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => navigate(-1)}
          className="p-3 bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/80 hover:bg-neutral-50 rounded-2xl transition-colors cursor-pointer"
        >
          <ArrowLeft size={18} className="text-neutral-700 dark:text-neutral-300" />
        </button>
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-neutral-900 dark:text-white uppercase tracking-wider">Bulk Document Export</h1>
          <p className="text-xs text-neutral-550 dark:text-neutral-450 font-medium">Export all finalized student documents into a structured ZIP archive for university VTU submission.</p>
        </div>
      </div>

      {/* Main Settings Card */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/80 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Academic Year Dropdown */}
          <div className="space-y-2">
            <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-450 dark:text-neutral-500">
              Academic Year <span className="text-rose-500">*</span>
            </label>
            <select
              value={academicYear}
              onChange={(e) => {
                setAcademicYear(e.target.value);
                setPreviewData(null);
              }}
              className="w-full h-11 px-3.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500/25 transition-all"
            >
              <option value="2026-2027">2026-2027</option>
              <option value="2027-2028">2027-2028</option>
              <option value="2025-2026">2025-2026</option>
            </select>
          </div>

          {/* Department Dropdown */}
          <div className="space-y-2">
            <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-450 dark:text-neutral-500">
              Branch / Department
            </label>
            <select
              value={branchId}
              onChange={(e) => {
                setBranchId(e.target.value);
                setPreviewData(null);
              }}
              className="w-full h-11 px-3.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500/25 transition-all"
            >
              <option value="ALL">All Branches / Departments</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Buttons row */}
        <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-neutral-100 dark:border-neutral-800/60">
          <button
            onClick={handlePreview}
            disabled={previewLoading || downloadLoading}
            className="px-5 py-3 border border-neutral-200 dark:border-neutral-850 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 text-neutral-800 dark:text-neutral-200 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
          >
            {previewLoading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            Run Preview Count
          </button>

          <button
            onClick={handleDownload}
            disabled={downloadLoading || previewLoading}
            className="px-6 py-3 bg-indigo-650 hover:bg-indigo-700 disabled:bg-indigo-400 text-dark rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shadow-md shadow-indigo-600/10 cursor-pointer disabled:cursor-not-allowed"
          >
            {downloadLoading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            Download Package (ZIP)
          </button>
        </div>
      </div>

      {/* Preview Summary Card */}
      {previewData && (
        <div className="mt-8 bg-emerald-50/40 dark:bg-emerald-950/10 border border-emerald-250/30 dark:border-emerald-900/30 rounded-3xl p-6 md:p-8 animate-fade-in flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-100/55 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-450 border border-emerald-200/50 dark:border-emerald-900/50 rounded-2xl flex items-center justify-center shrink-0">
              <FileArchive size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-neutral-900 dark:text-white uppercase tracking-wide">Ready for packaged download</h3>
              <p className="text-xs text-neutral-550 dark:text-neutral-400 mt-0.5">Found finalized, verified applicants matching your criteria.</p>
            </div>
          </div>

          <div className="flex items-center gap-6 self-stretch md:self-auto justify-around bg-white/50 dark:bg-neutral-900/60 border border-emerald-200/40 dark:border-neutral-800/40 p-4.5 rounded-2xl shrink-0">
            <div className="text-center px-4">
              <span className="block text-2xl font-black text-neutral-900 dark:text-white">{previewData.studentCount}</span>
              <span className="text-[10px] font-black uppercase tracking-wider text-neutral-450 dark:text-neutral-550">Students</span>
            </div>
            <div className="w-px h-8 bg-neutral-200 dark:bg-neutral-800" />
            <div className="text-center px-4">
              <span className="block text-2xl font-black text-neutral-900 dark:text-white">{previewData.documentCount}</span>
              <span className="text-[10px] font-black uppercase tracking-wider text-neutral-450 dark:text-neutral-550">Documents</span>
            </div>
          </div>
        </div>
      )}

      {/* Information guidelines box */}
      <div className="mt-8 bg-neutral-100 dark:bg-neutral-900/40 border border-neutral-250/20 dark:border-neutral-800/60 rounded-3xl p-6 md:p-8 space-y-3">
        <div className="flex items-center gap-2">
          <HelpCircle size={16} className="text-neutral-450" />
          <h4 className="text-xs font-black uppercase tracking-wider text-neutral-800 dark:text-neutral-200">Export Information & Structure</h4>
        </div>
        <p className="text-xs text-neutral-550 dark:text-neutral-450 leading-relaxed">
          The exported ZIP package will strictly include student documents whose applications have a finalized status of <code className="px-1 py-0.5 bg-neutral-200 dark:bg-neutral-800 rounded">APPROVED</code>, <code className="px-1 py-0.5 bg-neutral-200 dark:bg-neutral-800 rounded">PRINCIPAL_APPROVED</code>, or <code className="px-1 py-0.5 bg-neutral-200 dark:bg-neutral-800 rounded">ENROLLED</code>.
        </p>
        <p className="text-xs text-neutral-550 dark:text-neutral-450 leading-relaxed">
          The archive will contain a structured layout: <code className="px-1 py-0.5 bg-neutral-200 dark:bg-neutral-800 rounded">[Academic Year]/[Branch]/[Student Name - Application Number]/[Documents...]</code>. A detailed text summary <code className="px-1 py-0.5 bg-neutral-200 dark:bg-neutral-800 rounded">EXPORT_SUMMARY.txt</code> will be bundled at the root level specifying any missing documents for review officers.
        </p>
      </div>
    </div>
  );
};
