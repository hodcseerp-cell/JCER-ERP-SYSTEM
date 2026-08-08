export interface RegistrationOtpTemplateParams {
  name: string;
  otp: string;
}

export function getRegistrationOtpEmailHtml({ name, otp }: RegistrationOtpTemplateParams): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email Address - JCER Admission Portal</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f8fafc;
      color: #0f172a;
      margin: 0;
      padding: 0;
      line-height: 1.6;
    }
    .container {
      max-width: 580px;
      margin: 30px auto;
      background-color: #ffffff;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
      border: 1px solid #e2e8f0;
    }
    .header {
      background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
      color: #ffffff;
      padding: 36px 32px;
      text-align: center;
    }
    .header h1 {
      margin: 0 0 6px 0;
      font-size: 20px;
      font-weight: 800;
      letter-spacing: -0.025em;
    }
    .header p {
      margin: 0;
      font-size: 12px;
      color: #a5b4fc;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .badge {
      display: inline-block;
      margin-top: 12px;
      padding: 4px 12px;
      background-color: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 9999px;
      font-size: 11px;
      color: #c7d2fe;
      font-weight: 700;
    }
    .body {
      padding: 36px 32px;
    }
    .greeting {
      font-size: 16px;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 12px;
    }
    .text {
      font-size: 14px;
      color: #475569;
      margin-bottom: 24px;
    }
    .otp-card {
      background: #e0e7ff;
      border: 2px dashed #6366f1;
      border-radius: 16px;
      padding: 24px;
      text-align: center;
      margin: 28px 0;
    }
    .otp-code {
      font-family: 'Courier New', Courier, monospace;
      font-size: 38px;
      font-weight: 900;
      letter-spacing: 12px;
      color: #4338ca;
      margin: 0;
    }
    .otp-expiry {
      font-size: 12px;
      font-weight: 700;
      color: #4f46e5;
      margin-top: 8px;
    }
    .security-note {
      background-color: #f1f5f9;
      border-left: 4px solid #6366f1;
      padding: 14px 16px;
      border-radius: 8px;
      font-size: 12px;
      color: #334155;
      margin-bottom: 28px;
    }
    .contact-box {
      border-top: 1px solid #f1f5f9;
      padding-top: 20px;
      font-size: 12px;
      color: #64748b;
    }
    .contact-box strong {
      color: #1e293b;
    }
    .footer {
      background-color: #f8fafc;
      padding: 24px 32px;
      text-align: center;
      font-size: 11px;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
    }
    .footer p {
      margin: 4px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Jain College of Engineering & Research</h1>
      <p>Online Admission Portal</p>
      <div class="badge">Academic Year ${new Date().getFullYear()}–${new Date().getFullYear() + 1}</div>
    </div>
    
    <div class="body">
      <div class="greeting">Dear ${name},</div>
      <div class="text">
        Welcome to the Jain College of Engineering & Research Online Admission Portal. Thank you for registering with us.
        <br><br>
        To continue your registration, please verify your email address using the One-Time Password (OTP) below.
      </div>
      
      <div class="otp-card">
        <div class="otp-code">${otp}</div>
        <div class="otp-expiry">⏱ Valid for 5 minutes</div>
      </div>
      
      <div class="security-note">
        🔒 <strong>Security Guidance:</strong> Do not share this OTP with anyone. Your account will only be created after successful OTP verification.
      </div>
      
      <div class="contact-box">
        <strong>Need Help?</strong><br>
        Phone: +91 9944869387 &nbsp;|&nbsp; Email: admissions@jcer.in
      </div>
    </div>
    
    <div class="footer">
      <p><strong>Admissions Office — Jain College of Engineering & Research</strong></p>
      <p>This is an automated email notification. Please do not reply directly to this message.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}
