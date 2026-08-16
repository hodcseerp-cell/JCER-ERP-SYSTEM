import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, Printer, ArrowLeft } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import GlobalFooter from '../../components/common/GlobalFooter';

export const ProvisionalAcknowledgement = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchAcknowledgement();
  }, [id]);

  const fetchAcknowledgement = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/provisional/acknowledgement/${id}`);
      if (res.data?.success) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error('Could not fetch acknowledgement details', err);
      toast.error('Failed to load acknowledgement details.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getDocUrl = (url?: string | null) => {
    if (!url) return '';
    if (url.startsWith('http') || url.startsWith('data:')) return url;

    const cleanPath = url.startsWith('/') ? url : `/${url}`;
    const base = api.defaults.baseURL || '/api';
    const host = base.replace(/\/api\/?$/, '');
    const finalUrl = host.startsWith('/') ? cleanPath : `${host}${cleanPath}`;
    const token = localStorage.getItem('token');
    return token ? `${finalUrl}?token=${encodeURIComponent(token)}` : finalUrl;
  };

  const getBackRoute = () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.role === 'ADMIN' || payload.role === 'SUPER_ADMIN' || payload.role === 'PRINCIPAL') {
          return '/admin/admissions/provisional';
        }
      }
    } catch (e) {
      console.error(e);
    }
    return '/admission/dashboard';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto" />
          <p className="text-sm font-semibold text-slate-600">Generating Print Layout...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-4">
          <p className="text-lg font-bold text-rose-600">Acknowledgement not found.</p>
          <button onClick={() => navigate(getBackRoute())} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const { application, semesterRecords, student } = data;

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans p-6 sm:p-10 max-w-4xl mx-auto flex flex-col justify-between">
      
      {/* Control Banner - Hidden on print */}
      <div className="print:hidden flex justify-between items-center mb-8 p-4 bg-slate-50 border border-slate-200 rounded-xl">
        <button
          onClick={() => navigate(getBackRoute())}
          className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100 flex items-center gap-2 text-sm font-semibold"
        >
          <ArrowLeft className="w-4 h-4" /> Go Back
        </button>
        <button
          onClick={handlePrint}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 text-sm font-extrabold shadow-md"
        >
          <Printer className="w-4 h-4" /> Print Document
        </button>
      </div>

      {/* Printable Receipt area */}
      <div className="border-[3px] border-[#0F4C81] p-6 sm:p-8 space-y-6 relative flex-grow">
        
        {/* Logo and branding header */}
        <div className="flex items-center justify-between border-b-2 border-slate-350 pb-4">
          <div className="flex items-center gap-4 flex-1 mr-4">
            <img src="/logo.png" alt="JCER Logo" className="w-20 h-20 object-contain flex-shrink-0" />
            <div className="space-y-1 flex-1">
              <h1 className="text-lg sm:text-1xl font-black text-[#0F4C81] uppercase leading-tight tracking-wider">Jain College of Engineering & Research</h1>
              <p className="text-[11px] sm:text-xs text-slate-550 font-bold leading-none">Approved by AICTE, New Delhi & Affiliated to VTU Belagavi</p>
              <p className="text-[10px] sm:text-[11px] text-slate-400 font-semibold leading-none">Industrial Estate, Udyambag, Belagavi, Karnataka - 590008</p>
            </div>
          </div>
          
          <div className="w-20 h-24 border-2 border-slate-300 rounded-lg overflow-hidden bg-slate-50 flex items-center justify-center shrink-0">
            <img 
              src={getDocUrl(student?.photoUrl) || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'} 
              alt="Student Photo" 
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';
              }}
            />
          </div>
        </div>

        {/* Title */}
        <div className="text-center space-y-1">
          <h2 className="text-lg font-black text-slate-900 uppercase tracking-wider underline">Provisional Admission Acknowledgement</h2>
          <p className="text-sm font-extrabold text-[#0F4C81] font-mono">Receipt No: {application?.provisionalAdmissionNumber}</p>
        </div>

        {/* Section 1: Student Details */}
        <div className="space-y-2.5">
          <h3 className="text-xs font-black text-[#0F4C81] uppercase border-b border-slate-200 pb-1 tracking-wide">Candidate Particulars</h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
            <div className="flex justify-between border-b border-dashed border-slate-100 pb-1">
              <span className="text-slate-500 font-semibold">Student Name:</span>
              <span className="font-bold text-right">{student?.name}</span>
            </div>
            <div className="flex justify-between border-b border-dashed border-slate-100 pb-1">
              <span className="text-slate-500 font-semibold">University Seat No (USN):</span>
              <span className="font-mono font-black text-right uppercase">{student?.usn}</span>
            </div>
            <div className="flex justify-between border-b border-dashed border-slate-100 pb-1">
              <span className="text-slate-500 font-semibold">Department / Branch:</span>
              <span className="font-bold text-right">{student?.branch}</span>
            </div>
            <div className="flex justify-between border-b border-dashed border-slate-100 pb-1">
              <span className="text-slate-500 font-semibold">Admitted Semester:</span>
              <span className="font-bold text-right">{application?.semester}th Semester</span>
            </div>
            <div className="flex justify-between border-b border-dashed border-slate-100 pb-1">
              <span className="text-slate-500 font-semibold">Academic Year:</span>
              <span className="font-bold text-right">{application?.academicYear}</span>
            </div>
            <div className="flex justify-between border-b border-dashed border-slate-100 pb-1">
              <span className="text-slate-500 font-semibold">Contact Email:</span>
              <span className="font-bold text-right">{student?.email}</span>
            </div>
            <div className="flex justify-between border-b border-dashed border-slate-100 pb-1">
              <span className="text-slate-500 font-semibold">Mobile Number:</span>
              <span className="font-bold text-right">{student?.phone || 'N/A'}</span>
            </div>
            <div className="flex justify-between border-b border-dashed border-slate-100 pb-1">
              <span className="text-slate-500 font-semibold">Parent Contact:</span>
              <span className="font-bold text-right">{student?.parentPhone || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Section 2: Lower Exam Tables */}
        <div className="space-y-2.5">
          <h3 className="text-xs font-black text-[#0F4C81] uppercase border-b border-slate-200 pb-1 tracking-wide">Lower Semester Academic Record</h3>
          <div className="overflow-x-auto w-full border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-slate-800 border-b-2 border-slate-900">
                  <th className="py-2 px-3 font-bold uppercase text-white">Semester</th>
                  <th className="py-2 px-3 font-bold uppercase text-white">Exam Month/Year</th>
                  <th className="py-2 px-3 font-bold uppercase text-white">Passed Subjects</th>
                  <th className="py-2 px-3 font-bold uppercase text-white text-center">Failed Subjects</th>
                  <th className="py-2 px-3 font-bold uppercase text-white">Failed Subject Codes</th>
                </tr>
              </thead>
              <tbody>
                {semesterRecords?.map((rec) => (
                  <tr key={rec.id} className="border-b border-slate-200">
                    <td className="py-2.5 px-3 font-extrabold">Semester {rec.semesterNumber}</td>
                    <td className="py-2.5 px-3 font-medium">{rec.examMonth} {rec.examYear}</td>
                    <td className="py-2.5 px-3 font-semibold text-emerald-700">{rec.subjectsPassed}</td>
                    <td className="py-2.5 px-3 font-semibold text-rose-700 text-center">{rec.subjectsFailed}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-600">
                      {rec.subjectsFailed > 0 
                        ? (rec.failedSubjectCodes || []).join(', ') 
                        : 'NIL'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 3: Declaration / Signatures */}
        <div className="grid grid-cols-2 gap-12 pt-16 text-center text-xs">
          <div className="space-y-1">
            <div className="border-b border-slate-400 mx-auto w-3/4 h-5" />
            <p className="font-bold text-slate-700">Signature of Student</p>
            <p className="text-[10px] text-slate-400">Date: {new Date().toLocaleDateString()}</p>
          </div>
          <div className="space-y-1">
            <div className="border-b border-slate-400 mx-auto w-3/4 h-5" />
            <p className="font-bold text-[#0F4C81] uppercase">Verify / College Office Principal</p>
            <p className="text-[10px] text-slate-400">Jain College of Engineering & Research</p>
          </div>
        </div>

        {/* College logo watermark */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.06] pointer-events-none select-none">
          <img src="/logo.png" alt="JCER Logo Watermark" className="w-96 h-96 object-contain" />
        </div>

      </div>

      <div className="text-center text-[10px] font-semibold text-slate-400 mt-6 pt-4 border-t border-slate-100">
        <p>This is a computer-generated provisional admission acknowledgement and does not require a physical stamp unless requested.</p>
      </div>

      <GlobalFooter className="mt-8 border-t border-slate-200/80 bg-white print:hidden" />
    </div>
  );
};
