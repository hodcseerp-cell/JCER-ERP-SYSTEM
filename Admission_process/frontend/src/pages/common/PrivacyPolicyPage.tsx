import React from 'react';
import { Link } from 'react-router-dom';
import { LegalPageLayout } from '../../components/common/LegalPageLayout';

const SECTIONS = [
  { id: 'introduction', title: '1. Introduction' },
  { id: 'collect', title: '2. Information We Collect' },
  { id: 'use', title: '3. How We Use Information' },
  { id: 'records', title: '4. Admission & Academic Records' },
  { id: 'storage', title: '5. Document Upload & Storage' },
  { id: 'provisional', title: '6. Provisional Admission' },
  { id: 'email-otp', title: '7. Email & OTP Verification' },
  { id: 'access', title: '8. Access to Information' },
  { id: 'security', title: '9. Data Security' },
  { id: 'retention', title: '10. Data Retention' },
  { id: 'third-party', title: '11. Third-Party Providers' },
  { id: 'cookies', title: '12. Cookies & Local Storage' },
  { id: 'responsibilities', title: '13. User Responsibilities' },
  { id: 'grievances', title: '14. Privacy Requests & Grievances' },
  { id: 'changes', title: '15. Changes to Policy' },
  { id: 'contact', title: '16. Contact Information' }
];

const PrivacyPolicyPage: React.FC = () => {
  return (
    <LegalPageLayout title="Privacy Policy" sections={SECTIONS}>
      <section id="introduction" className="space-y-3">
        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">1. Introduction</h3>
        <p>
          Welcome to the Jain College of Engineering & Research (JCER) Admission ERP portal. This Privacy Policy describes how we collect, use, store, protect, and handle your information when you access and utilize the JCER Admission ERP. 
        </p>
        <p>
          Our portal is designed to facilitate student admissions, academic progression, and semester promotion processes. By using the platform, you acknowledge the terms of this policy regarding the collection and management of your data.
        </p>
      </section>

      <section id="collect" className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-850">
        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">2. Information We Collect</h3>
        <p>
          To process applications and support your enrollment, the ERP collects specific categories of information based on your interactions:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>Personal Information:</strong> Student name, date of birth, gender (where applicable), mobile number, email address, and parent/guardian contact details.
          </li>
          <li>
            <strong>Contact and Address Information:</strong> Current/local address, permanent address, district, taluk, PIN code, and mobile numbers.
          </li>
          <li>
            <strong>Academic Information:</strong> Secondary school (SSLC) marks, pre-university college (PUC) marks, Diploma academic records, entrance exam rank/scores, previous semester exam records, passed subjects, failed subjects, and failed subject codes.
          </li>
          <li>
            <strong>Admission Information:</strong> System-generated application number, admission type (Fresh Admission or Diploma Lateral Entry), Provisional Admission records, academic year cycles, selected engineering branch, and application workflow status.
          </li>
          <li>
            <strong>Uploaded Documents:</strong> Digital copies of student photograph, signature, Aadhaar card, SSLC marks card, PUC marks card, Diploma certificates, semester marks cards, fee payment receipts, and other official academic verification documents.
          </li>
          <li>
            <strong>Authentication Information:</strong> Secure password hashes, email verification details, session tokens, and One-Time Passwords (OTPs).
          </li>
          <li>
            <strong>Technical Information:</strong> IP addresses, browser types, device profiles, and operational logs generated for security audit purposes.
          </li>
        </ul>
      </section>

      <section id="use" className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-850">
        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">3. How We Use Information</h3>
        <p>
          The information collected through the JCER Admission ERP is used exclusively for academic and operational administration:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Processing and evaluating Fresh Admission and Diploma Lateral Entry applications.</li>
          <li>Creating, managing, and securing your student credentials and accounts.</li>
          <li>Verifying applicant identity and authenticity of academic documents.</li>
          <li>Managing Provisional Admission eligibility, semester promotion criteria, and lower semester academic records.</li>
          <li>Generating system-level application state changes (e.g., Submitted, Under Review, Correction Required, Approved, Confirmed).</li>
          <li>Sending automated OTP verifications and transactional email notices regarding correction requirements, approval actions, or institutional feedback.</li>
          <li>Ensuring overall system security, preventing unauthorized access, and debugging system errors.</li>
        </ul>
      </section>

      <section id="records" className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-850">
        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">4. Admission & Academic Records</h3>
        <p>
          Information and documents submitted through this platform become an official part of the institutional records of the Jain College of Engineering & Research. These records are used by authorized admission officers, academic administrators, department heads, and college principal office staff to manage academic compliance, university registration, and institutional reporting.
        </p>
      </section>

      <section id="storage" className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-850">
        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">5. Document Upload & Storage</h3>
        <p>
          All uploaded files (such as marks cards, signatures, and receipts) are transmitted securely and stored using the college's dedicated and secured document storage infrastructure. Access is restricted using programmatic authentication checks to ensure files can only be accessed by the corresponding student or authorized administrative roles. 
        </p>
      </section>

      <section id="provisional" className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-850">
        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">6. Provisional Admission</h3>
        <p>
          For existing students applying for Provisional Admission to higher semesters, the ERP collects specific details to verify academic eligibility:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Target semester (3rd, 5th, or 7th) and the current academic year cycle.</li>
          <li>Detailed lower semester examination summary (exam month, exam year, passed subjects count, failed subjects count, and failed subject codes).</li>
          <li>Supporting uploads of semester marks cards and fee receipts.</li>
        </ul>
        <p>
          This information is analyzed by administrators to determine eligibility for provisional promotions.
        </p>
      </section>

      <section id="email-otp" className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-850">
        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">7. Email & OTP Verification</h3>
        <p>
          We use One-Time Passwords (OTPs) sent to your registered email to secure account registration, login actions, and critical application submissions. These OTPs are temporary, confidential, and must not be shared with anyone.
        </p>
        <p>
          Transactional emails regarding admission notifications, correction flags, or confirmation status updates are dispatched through authorized email transmission services. No marketing materials are sent through this channel.
        </p>
      </section>

      <section id="access" className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-850">
        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">8. Access to Information</h3>
        <p>
          Data access within the ERP is strictly regulated by Role-Based Access Control (RBAC) protocols:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Students:</strong> Can only access, edit (when in draft/correction mode), and view their own personal profiles, uploaded files, and admission state.</li>
          <li><strong>Admissions Admins:</strong> Have permissions to search student records, verify uploaded documents, issue correction requests, input remarks, and manage admission queues.</li>
          <li><strong>Principal & Principal's Office:</strong> Can access aggregated enrollment statistics, generate reports, audit admission stages, and confirm registrations.</li>
        </ul>
      </section>

      <section id="security" className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-850">
        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">9. Data Security</h3>
        <p>
          We implement industry-standard technical and organizational security measures to safeguard your data. This includes encrypted password hashing, session tokens, secure API routing, server-side parameter validation, and role-based operational permissions. While we employ strict security frameworks to protect system integrity, no online transmission method can guarantee absolute security.
        </p>
      </section>

      <section id="retention" className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-850">
        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">10. Data Retention</h3>
        <p>
          Admission documents, student information, and academic histories are retained within the ERP database to satisfy academic compliance, institutional archives, university enrollment verification, auditing, and other legitimate administrative requirements of the college.
        </p>
      </section>

      <section id="third-party" className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-850">
        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">11. Third-Party Providers</h3>
        <p>
          The JCER ERP utilizes authorized third-party service providers to power specific operational tasks:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Secure cloud infrastructure and database hosting providers.</li>
          <li>Compliant object storage providers for digital document hosting.</li>
          <li>Authorized SMTP/email delivery APIs for transactional notifications.</li>
        </ul>
        <p>
          These service providers have access to data strictly as necessary to execute their system tasks under appropriate confidentiality guidelines.
        </p>
      </section>

      <section id="cookies" className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-850">
        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">12. Cookies & Local Storage</h3>
        <p>
          The portal uses client-side local storage (localStorage) and session identifiers exclusively to retain system status, auth credentials (JWT tokens), and current form wizard progress parameters. This is necessary to keep you logged in and prevent data loss during multi-step applications. We do not run third-party advertising, analytics, or behavioral tracking cookies.
        </p>
      </section>

      <section id="responsibilities" className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-850">
        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">13. User Responsibilities</h3>
        <p>
          As an ERP user, you are responsible for maintaining data security by:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Providing accurate, current, and genuine academic data and certificates.</li>
          <li>Keeping your user credentials, passwords, and OTP verification codes confidential.</li>
          <li>Logging out of the session when using shared public computers.</li>
          <li>Promptly notifying the institutional support desk if you detect unauthorized access.</li>
        </ul>
      </section>

      <section id="grievances" className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-850">
        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">14. Privacy Requests & Grievances</h3>
        <p>
          If you have questions, concerns, or grievances regarding your data privacy, or if you wish to request a correction of your profile records, you may submit a formal request to the designated privacy desk at:
        </p>
        <p className="font-mono bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border text-center text-indigo-600 dark:text-indigo-400">
        support.collegeerp@gmail.com
        </p>
        <p>
          For general technical inquiries, form correction status, or support assistance, please visit the <Link to="/support" className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline">Admission Support Center</Link>.
        </p>
      </section>

      <section id="changes" className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-850">
        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">15. Changes to Policy</h3>
        <p>
          JCER reserves the right to modify this Privacy Policy at any time. Any changes will be posted directly to this URL, and the "Last Updated" date at the top of this document will be updated accordingly. We encourage you to review this policy periodically.
        </p>
      </section>

      <section id="contact" className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-850">
        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">16. Contact Information</h3>
        <p>
          For general admission and administrative inquiries, you may contact:
        </p>
        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border space-y-1">
          <p className="font-bold">Jain College of Engineering & Research</p>
          <p className="text-slate-500 dark:text-slate-400">Industrial Estate, Udyambag, Belagavi, Karnataka - 590008</p>
          <p>Email: <span className="font-semibold text-indigo-600 dark:text-indigo-400">support.collegeerp@gmail.com</span></p>
        </div>
      </section>
    </LegalPageLayout>
  );
};

export default PrivacyPolicyPage;
