import { Buffer } from 'node:buffer';

/**
 * Generates a valid multi-page PDF document buffer containing the official
 * Jain College of Engineering & Research (JCER) Admission Handbook.
 */
export function generateHandbookPDFBuffer(): Buffer {
  const pagesText = [
    // PAGE 1
    [
      "JAIN COLLEGE OF ENGINEERING & RESEARCH (JCER), BELAGAVI",
      "Approved by AICTE, New Delhi | Affiliated to VTU, Belagavi | Recognized by Govt. of Karnataka",
      "-----------------------------------------------------------------------------------------",
      "                           OFFICIAL ADMISSION HANDBOOK (2026-2027)",
      "-----------------------------------------------------------------------------------------",
      "",
      "1. WELCOME MESSAGE",
      "Welcome prospective students to Jain College of Engineering & Research (JCER), Belagavi.",
      "JCER offers state-of-the-art technical education, modern laboratories, industry placement",
      "opportunities, and holistic student development.",
      "",
      "2. ABOUT JCER",
      "Jain College of Engineering & Research is a premier institute committed to academic excellence,",
      "research, and technical innovation. Equipped with NBA-accredited programs, top-tier faculty,",
      "and a vibrant green campus.",
      "",
      "3. BRANCHES OFFERED & INTAKE",
      "- Computer Science & Engineering (CSE)              : 180 Seats",
      "- Electronics & Communication Engineering (ECE)     : 120 Seats (NBA Accredited)",
      "- Mechanical Engineering (ME)                       : 60 Seats  (NBA Accredited)",
      "- Civil Engineering (CE)                            : 60 Seats",
      "- Artificial Intelligence & Machine Learning (AI/ML): 60 Seats",
      "",
      "-----------------------------------------------------------------------------------------",
      "Page 1 of 3 - Jain College of Engineering & Research Admission Cell",
    ],
    // PAGE 2
    [
      "JAIN COLLEGE OF ENGINEERING & RESEARCH - ADMISSION HANDBOOK",
      "-----------------------------------------------------------------------------------------",
      "4. ADMISSION PROCESS (STEPS 1 TO 7)",
      "Step 1 - Admission & Branch Details: Choose Admission Type (KCET/DCET/Management) & Branch.",
      "Step 2 - Personal Details          : Enter Full Name, DOB, Gender, Category, & Passport Photo.",
      "Step 3 - Parent Information        : Father's, Mother's, Email ID, & Annual Family Income.",
      "Step 4 - Address Details           : Permanent & Communication Address with Pincode.",
      "Step 5 - Academic Details          : SSLC Marks & PUC (4 Subjects) or Diploma Marks.",
      "Step 6 - Document Upload           : Upload Scanned Marks Cards, Aadhaar, Photo, & Receipt.",
      "Step 7 - Review & Submit           : Final verification before submitting application.",
      "",
      "5. QUOTA & ADMISSION PATHWAYS",
      "- KCET Quota       : Allotted through KEA Karnataka Common Entrance Test counseling.",
      "- DCET Quota       : Lateral entry admission for Diploma holders into 3rd Semester.",
      "- Management Quota : Direct admission based on merit & eligibility criteria.",
      "",
      "6. REQUIRED DOCUMENTS CHECKLIST",
      "[x] SSLC / 10th Marks Card (Original Color Scan Required)",
      "[x] PUC 12th Marks Card / Diploma 5th & 6th Sem Cards",
      "[x] Passport Size Photograph (Original Color Photo Required)",
      "[x] Aadhaar Card Copy (Original Color Scan Required)",
      "[x] KCET / DCET Score Card Copy",
      "[x] Caste / Income Certificate (If applicable)",
      "[x] Official College Fee Paid Receipt",
      "",
      "-----------------------------------------------------------------------------------------",
      "Page 2 of 3 - Jain College of Engineering & Research Admission Cell",
    ],
    // PAGE 3
    [
      "JAIN COLLEGE OF ENGINEERING & RESEARCH - ADMISSION HANDBOOK",
      "-----------------------------------------------------------------------------------------",
      "7. FEE PAYMENT INSTRUCTIONS",
      "After online submission and administrative review, visit the JCER Admission Office to pay",
      "the official fee (or Rs. 500 processing fee). Upload the issued receipt to complete enrollment.",
      "",
      "8. IMPORTANT RULES & REGULATIONS",
      "1. All uploaded document images must be clear and readable.",
      "2. Passport Photo, SSLC, Aadhaar, and Fee Receipts MUST be uploaded as original color scans.",
      "3. False or misleading information will lead to immediate cancellation of admission.",
      "",
      "9. ADMISSION OFFICE CONTACT & TIMINGS",
      "Nodal Admission Office : Ground Floor, Admin Block, JCER Campus, Udyambag, Belagavi",
      "Working Hours          : Monday to Saturday | 9:30 AM to 5:30 PM",
      "Contact Phone          : 099448693987 / +91 831 2400400",
      "Contact Email          : principal@jcer.in / support.collegeerp@gmail.com",
      "Official Website       : https://www.jcer.in",
      "",
      "10. FREQUENTLY ASKED QUESTIONS (FAQs)",
      "Q: Can I update my document after submitting?",
      "A: If the admissions team requests corrections, you can re-upload documents from your portal.",
      "Q: How do I track my admission status?",
      "A: Log into your Student Dashboard at any time to see live progress updates.",
      "",
      "-----------------------------------------------------------------------------------------",
      "Page 3 of 3 - End of Official Admission Handbook (2026-2027)",
    ]
  ];

  const catalogObj = "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n";
  const pagesObj = "2 0 obj\n<< /Type /Pages /Kids [3 0 R 4 0 R 5 0 R] /Count 3 >>\nendobj\n";
  const fontObj = "6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n";

  const page1Obj = "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 6 0 R >> >> /Contents 7 0 R >>\nendobj\n";
  const page2Obj = "4 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 6 0 R >> >> /Contents 8 0 R >>\nendobj\n";
  const page3Obj = "5 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 6 0 R >> >> /Contents 9 0 R >>\nendobj\n";

  function createStreamObj(objId: number, lines: string[]): string {
    let streamText = "BT\n/F1 10 Tf\n14 TL\n50 740 Td\n";
    for (const line of lines) {
      const escaped = line.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
      streamText += `(${escaped}) '\n`;
    }
    streamText += "ET\n";
    const streamLen = Buffer.byteLength(streamText, 'utf-8');
    return `${objId} 0 obj\n<< /Length ${streamLen} >>\nstream\n${streamText}endstream\nendobj\n`;
  }

  const stream1Obj = createStreamObj(7, pagesText[0]);
  const stream2Obj = createStreamObj(8, pagesText[1]);
  const stream3Obj = createStreamObj(9, pagesText[2]);

  const objList = [catalogObj, pagesObj, page1Obj, page2Obj, page3Obj, fontObj, stream1Obj, stream2Obj, stream3Obj];

  let pdfString = "%PDF-1.4\n";
  const xrefOffsets: number[] = [0];

  for (const objStr of objList) {
    xrefOffsets.push(Buffer.byteLength(pdfString, 'utf-8'));
    pdfString += objStr;
  }

  const xrefStart = Buffer.byteLength(pdfString, 'utf-8');
  let xref = `xref\n0 ${objList.length + 1}\n0000000000 65535 f \n`;

  for (let i = 1; i <= objList.length; i++) {
    const offsetStr = xrefOffsets[i].toString().padStart(10, '0');
    xref += `${offsetStr} 00000 n \n`;
  }

  const trailer = `trailer\n<< /Size ${objList.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  pdfString += xref + trailer;

  return Buffer.from(pdfString, 'utf-8');
}
