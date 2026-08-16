import React from 'react';
import { LegalPageLayout } from '../../components/common/LegalPageLayout';

const SECTIONS = [
  { id: 'acceptance', title: '1. Acceptance of Terms' },
  { id: 'about', title: '2. About the JCER Admission ERP' },
  { id: 'accounts', title: '3. User Accounts' },
  { id: 'student-resp', title: '4. Student Responsibilities' },
  { id: 'applications', title: '5. Admission Applications' },
  { id: 'fresh', title: '6. Fresh Admission' },
  { id: 'lateral', title: '7. Diploma Lateral Entry' },
  { id: 'provisional', title: '8. Provisional Admission' },
  { id: 'promotion', title: '9. Academic Promotion' },
  { id: 'upload-rules', title: '10. Document Upload Rules' },
  { id: 'review', title: '11. Application Review' },
  { id: 'corrections', title: '12. Correction Requests' },
  { id: 'otp', title: '13. OTP & Authentication' },
  { id: 'prohibited', title: '14. Prohibited Activities' },
  { id: 'availability', title: '15. System Availability' },
  { id: 'third-party', title: '16. Third-Party Services' },
  { id: 'ip', title: '17. Intellectual Property' },
  { id: 'suspension', title: '18. Account Suspension' },
  { id: 'prevail', title: '19. Institutional Rules Prevail' },
  { id: 'changes', title: '20. Changes to Terms' },
  { id: 'contact', title: '21. Contact Information' }
];

const TermsOfUsePage: React.FC = () => {
  return (
    <LegalPageLayout title="Terms of Use" sections={SECTIONS}>
      <section id="acceptance" className="space-y-3">
        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">1. Acceptance of Terms</h3>
        <p>
          By logging into, accessing, or using the Jain College of Engineering & Research (JCER) Admission ERP, you agree to be bound by these Terms of Use. If you do not agree to these terms, please do not utilize the portal.
        </p>
      </section>

      <section id="about" className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-850">
        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">2. About the JCER Admission ERP</h3>
        <p>
          The JCER Admission ERP provides digital administration workflows for managing fresh student enrollments, lateral diploma entry registrations, higher semester provisional admissions, academic promotion checks, and verification workflows for JCER college administration.
        </p>
      </section>

      <section id="accounts" className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-850">
        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">3. User Accounts</h3>
        <p>
          To access the student dashboard, you must establish an account using valid credentials. You agree to:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Provide accurate, truthful, and complete personal and academic information during enrollment.</li>
          <li>Keep your login credentials secure, confidential, and private at all times.</li>
          <li>Avoid sharing your temporary OTP tokens or passwords with third parties.</li>
          <li>Promptly report any suspected security breach or unauthorized access to college IT support.</li>
        </ul>
      </section>

      <section id="student-resp" className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-850">
        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">4. Student Responsibilities</h3>
        <p>
          Students and applicants are responsible for ensuring that all data submitted is accurate. Any entry of fraudulent marks, forged certificates, or intentional misrepresentations will lead to immediate cancellation of your application, suspension of your ERP account, and appropriate disciplinary action by the college management.
        </p>
      </section>

      <section id="applications" className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-850">
        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">5. Admission Applications</h3>
        <p>
          Submitting an application through the ERP portal (whether for fresh admissions, lateral entry, or provisional semester promotions) is a request for review and does not constitute guaranteed approval. Admissions are officially confirmed only after documents are validated, institutional eligibility checks are satisfied, and fees are verified by college administrative personnel.
        </p>
      </section>

      <section id="fresh" className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-850">
        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">6. Fresh Admission</h3>
        <p>
          The Fresh Admission workflow allows new applicants to select engineering branches, upload core documents (such as SSLC marks cards, PUC certificates, photograph, and signature), verify their credentials, and submit details for institutional scrutiny. Decisions will be rendered in accordance with VTU university guidelines and JCER intake policies.
        </p>
      </section>

      <section id="lateral" className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-850">
        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">7. Diploma Lateral Entry</h3>
        <p>
          Diploma Lateral Entry workflows are designed for candidates applying directly for second-year (3rd semester) admissions. Applicants must submit official diploma marks cards, transcript documentation, and relevant entrance metrics for verification. Eligibility criteria adhere strictly to Directorate of Technical Education (DTE) Karnataka and VTU guidelines.
        </p>
      </section>

      <section id="provisional" className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-850">
        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">8. Provisional Admission</h3>
        <p>
          The Provisional Admission workflow allows eligible existing students to apply for enrollment in their next academic semesters:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Workflow:</strong> Login → Access Provisional Admission Form → Fill exam summaries (passed/failed stats and failed codes) → Upload previous marks cards and fee receipt → Review particulars → Submit for verification.</li>
          <li><strong>Review:</strong> Applications undergo rigorous scrutiny by department administrators. Approval is conditional on institutional academic promotion rules.</li>
          <li><strong>Payment Verification:</strong> Uploaded fee receipts must match official college finance records. Mismatched or fake receipts will result in rejection.</li>
        </ul>
      </section>

      <section id="promotion" className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-850">
        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">9. Academic Promotion</h3>
        <p>
          Official academic semester advancement is controlled and updated exclusively by college administrative personnel. Students cannot manually override their current semester level in the ERP dashboard. The system records current semesters as determined by official academic boards.
        </p>
      </section>

      <section id="upload-rules" className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-850">
        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">10. Document Upload Rules</h3>
        <p>
          All uploaded files (photographs, marks cards, receipts) must adhere to these rules:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Files must belong to the applicant and be fully legible.</li>
          <li>Files must be original scans without digital edits, overlays, or modifications.</li>
          <li>Allowed file sizes and formats (JPG, JPEG, PNG, PDF) must be respected.</li>
        </ul>
      </section>

      <section id="review" className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-850">
        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">11. Application Review</h3>
        <p>
          Each application progresses through system-controlled statuses: Draft, Submitted, Under Review, Correction Required, Approved, Rejected, and Confirmed. Administrators will update statuses based on active verification checklists.
        </p>
      </section>

      <section id="corrections" className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-850">
        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">12. Correction Requests</h3>
        <p>
          If your application has a status of "Correction Required," you must review the administrative remarks on your student dashboard, correct the highlighted fields, upload the requested documents, and resubmit within the timeline designated by the college administration.
        </p>
      </section>

      <section id="otp" className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-850">
        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">13. OTP & Authentication</h3>
        <p>
          The ERP utilizes Temporary One-Time Passwords (OTPs) sent to your registered email for authentication. Bypassing, spoofing, or attempting to circumvent OTP challenges is strictly prohibited and constitutes a security violation.
        </p>
      </section>

      <section id="prohibited" className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-850">
        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">14. Prohibited Activities</h3>
        <p>
          When using the ERP, you are prohibited from:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Attempting to gain unauthorized access to other student accounts or administrative dashboards.</li>
          <li>Injecting malicious code, cross-site scripting (XSS), or attempting API payload manipulations.</li>
          <li>Uploading fraudulent marks cards, mock documents, or forged fee receipts.</li>
          <li>Scraping files, database records, or document assets hosted by the system.</li>
        </ul>
      </section>

      <section id="availability" className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-850">
        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">15. System Availability</h3>
        <p>
          While JCER aims to maintain continuous availability of the ERP, the portal is provided on an "as-is" and "as-available" basis. Periodic maintenance, system upgrades, or technical issues with network hosting partners may lead to temporary downtime.
        </p>
      </section>

      <section id="third-party" className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-850">
        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">16. Third-Party Services</h3>
        <p>
          The ERP relies on authorized third-party cloud architectures, document servers, and email APIs. Use of the platform signifies your agreement to let these infrastructures execute transactional functions for your applications.
        </p>
      </section>

      <section id="ip" className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-850">
        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">17. Intellectual Property</h3>
        <p>
          All interface designs, branding configurations, database schemas, logo files, and source code of the JCER Admission ERP are protected by intellectual property rules and belong to the Jain College of Engineering & Research.
        </p>
      </section>

      <section id="suspension" className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-850">
        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">18. Account Suspension</h3>
        <p>
          The college administration reserves the right to suspend, lock, or restrict access to any user account suspected of violating these Terms of Use, utilizing fake records, or attempting unauthorized system interactions.
        </p>
      </section>

      <section id="prevail" className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-850">
        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">19. Institutional Rules Prevail</h3>
        <p>
          The ERP is a technology platform for implementing institutional processes. In the event of any discrepancies, disputes, or contradictions between the information displayed on the ERP (such as seat eligibility, fee details, or status updates) and the officially approved regulations of the college or VTU university, the official institutional rules and the decision of the college authorities shall prevail.
        </p>
      </section>

      <section id="changes" className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-850">
        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">20. Changes to Terms</h3>
        <p>
          JCER reserves the right to revise these Terms of Use at any time. Any changes will be posted directly to this URL, and the "Last Updated" date at the top of this document will be updated accordingly. Continued use of the platform constitutes agreement to the updated Terms.
        </p>
      </section>

      <section id="contact" className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-850">
        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">21. Contact Information</h3>
        <p>
          For general inquiries regarding these Terms of Use, please contact:
        </p>
        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border space-y-1">
          <p className="font-bold">Jain College of Engineering & Research</p>
          <p className="text-slate-500 dark:text-slate-400">Industrial Estate, Udyambag, Belagavi, Karnataka - 590008</p>
          <p>Email: <span className="font-semibold text-indigo-600 dark:text-indigo-400">principal@jcer.in</span></p>
        </div>
      </section>
    </LegalPageLayout>
  );
};

export default TermsOfUsePage;
