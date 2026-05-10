const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

// Create transporter
const createTransporter = () => {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  // Gmail auto-detection: if SMTP_USER is a Gmail address, use nodemailer's
  // built-in Gmail service — no SMTP_HOST needed
  if (smtpUser && smtpPass && smtpUser.toLowerCase().endsWith('@gmail.com')) {
    console.log('[Email] Using Gmail service for:', smtpUser);
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });
  }

  // Manual SMTP config (non-Gmail)
  if (process.env.SMTP_HOST && smtpUser && smtpPass) {
    const host = process.env.SMTP_HOST;
    if (host.includes('@')) {
      throw new Error(
        `Invalid SMTP_HOST "${host}". Set SMTP_HOST=smtp.yourprovider.com (not an email address).`
      );
    }
    return nodemailer.createTransport({
      host,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: smtpUser, pass: smtpPass }
    });
  }

  // Fallback mock transporter
  console.warn('⚠️  No SMTP configuration found. Using mock email service.');
  
  return {
    verify: async () => Promise.resolve(true),
    sendMail: async (mailOptions) => {
      console.log('\n📧 MOCK EMAIL SENT:');
      console.log('To:', mailOptions.to);
      console.log('Subject:', mailOptions.subject);
      console.log('Content:', mailOptions.html ? 'HTML content available' : mailOptions.text);
      console.log('========================\n');
      
      return { 
        messageId: `mock-${Date.now()}@localhost`,
        accepted: [mailOptions.to],
        rejected: []
      };
    }
  };
};

// Email templates
const getEmailTemplate = (templateName, data) => {
  switch (templateName) {
    case 'candidate-assessment':
      return {
        subject: `Invitation to Take Your Assessment - ${data.companyName}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Rezulyzer Assessment Invitation</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
              .content { padding: 20px; background: #f9f9f9; }
              .credentials { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
              .button { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Assessment Invitation</h1>
              </div>
              <div class="content">
                <h2>Hello ${data.candidateName},</h2>
                <p>You have been invited by <strong>${data.companyName}</strong> to take an online assessment on Rezulyzer.</p>
                
                <p>Please use the following credentials to log in and begin your test:</p>
                
                <div class="credentials">
                  <h3>Your Login Information</h3>
                  <p><strong>Username:</strong> ${data.email}</p>
                  <p><strong>Password:</strong> ${data.password}</p>
                  <p><strong>Assessment URL:</strong> <a href="${data.loginUrl}">${data.loginUrl}</a></p>
                </div>
                
                <p>Please complete the assessment by the specified due date if one has been provided. We recommend using a stable internet connection in a quiet environment.</p>
                
                <div style="text-align: center;">
                  <a href="${data.loginUrl}" class="button">Begin Assessment</a>
                </div>
                
                <p>Good luck!</p>
                <p>Best regards,<br>The Rezulyzer Team</p>
              </div>
              <div class="footer">
                <p>This is an automated email. Please do not reply.</p>
                <p>&copy; 2024 Rezulyzer. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `
Hello ${data.candidateName},

You have been invited by ${data.companyName} to take an online assessment.

Your Login Information:
Username: ${data.email}
Password: ${data.password}
Assessment URL: ${data.loginUrl}

Please complete the assessment at your earliest convenience.

Good luck!
Rezulyzer Team
        `
      };

    case 'company-credentials':
      return {
        subject: 'Welcome to Rezulyzer - Your Login Credentials',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to Rezulyzer</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
              .content { padding: 20px; background: #f9f9f9; }
              .credentials { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
              .button { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Welcome to Rezulyzer</h1>
              </div>
              <div class="content">
                <h2>Hello ${data.contactPerson},</h2>
                <p>Your company <strong>${data.companyName}</strong> has been successfully registered on Rezulyzer!</p>
                
                <p>Below are your login credentials:</p>
                
                <div class="credentials">
                  <h3>Login Information</h3>
                  <p><strong>Email:</strong> ${data.email}</p>
                  <p><strong>Temporary Password:</strong> ${data.password}</p>
                  <p><strong>Login URL:</strong> <a href="${data.loginUrl}">${data.loginUrl}</a></p>
                </div>
                
                <p><strong>Important Security Notice:</strong></p>
                <ul>
                  <li>This is a temporary password for first-time login</li>
                  <li>You will be required to reset your password upon first login</li>
                  <li>After password reset, you'll need to login again with your new password</li>
                  <li>Keep your credentials secure and do not share them</li>
                </ul>
                
                <div style="text-align: center;">
                  <a href="${data.loginUrl}" class="button">Login Now</a>
                </div>
                
                <p>If you have any questions or need assistance, please contact our support team.</p>
                
                <p>Best regards,<br>Rezulyzer Team</p>
              </div>
              <div class="footer">
                <p>This is an automated email. Please do not reply to this message.</p>
                <p>&copy; 2024 Rezulyzer. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `
Welcome to Rezulyzer!

Hello ${data.contactPerson},

Your company ${data.companyName} has been successfully registered on Rezulyzer!

Login Information:
Email: ${data.email}
Temporary Password: ${data.password}
Login URL: ${data.loginUrl}

Important Security Notice:
- This is a temporary password for first-time login
- You will be required to reset your password upon first login
- After password reset, you'll need to login again with your new password
- Keep your credentials secure and do not share them

If you have any questions or need assistance, please contact our support team.

Best regards,
Rezulyzer Team
        `
      };
    
    case 'ai-interview-invite':
      return {
        subject: `You've been invited for an AI Video Interview – ${data.companyName}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; }
              .container { max-width: 600px; margin: 0 auto; padding: 0; }
              .header { background: linear-gradient(135deg, #2563eb, #7c3aed); color: white; padding: 32px 24px; text-align: center; }
              .header h1 { margin: 0; font-size: 24px; }
              .header p { margin: 8px 0 0; opacity: 0.9; font-size: 14px; }
              .content { padding: 32px 24px; background: #ffffff; }
              .info-box { background: #f0f4ff; border-left: 4px solid #2563eb; padding: 16px; border-radius: 4px; margin: 20px 0; }
              .info-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e5e7eb; }
              .info-row:last-child { border-bottom: none; }
              .info-label { font-weight: bold; color: #6b7280; font-size: 13px; }
              .info-value { color: #111; font-size: 13px; }
              .btn { display: block; width: fit-content; margin: 24px auto; padding: 14px 36px; background: #2563eb; color: white !important; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold; text-align: center; }
              .tips { background: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0; }
              .tips h3 { margin: 0 0 12px; color: #374151; font-size: 15px; }
              .tips ul { margin: 0; padding-left: 20px; }
              .tips li { margin-bottom: 6px; font-size: 14px; color: #4b5563; }
              .footer { text-align: center; padding: 20px; background: #f9fafb; color: #9ca3af; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎙️ AI Video Interview Invitation</h1>
                <p>Powered by Rezulyzer</p>
              </div>
              <div class="content">
                <p>Hello <strong>${data.candidateName}</strong>,</p>
                <p>You have been invited by <strong>${data.companyName}</strong> to complete an AI-powered video interview for the following position:</p>
                <div class="info-box">
                  <div class="info-row">
                    <span class="info-label">Position</span>
                    <span class="info-value">${data.jobTitle || 'Not specified'}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Round</span>
                    <span class="info-value">Round ${data.round || 1}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Interview Type</span>
                    <span class="info-value">${data.interviewType || 'Technical'}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Scheduled</span>
                    <span class="info-value">${data.scheduledAt || 'Flexible – complete within 7 days'}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Estimated Duration</span>
                    <span class="info-value">${data.duration || '20–30'} minutes</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Link Expires</span>
                    <span class="info-value">${data.expiresAt}</span>
                  </div>
                </div>
                <a href="${data.interviewUrl}" class="btn">Join AI Interview →</a>
                <div class="tips">
                  <h3>📋 Before You Start – Tips for Success</h3>
                  <ul>
                    <li>Use a laptop or desktop with a working camera & microphone</li>
                    <li>Find a quiet, well-lit environment with no distractions</li>
                    <li>Use Chrome or Edge browser for the best experience</li>
                    <li>Test your mic and camera before joining</li>
                    <li>Speak clearly and take your time – the AI listens carefully</li>
                    <li>Each question has a dedicated time window – answer completely</li>
                  </ul>
                </div>
                <p style="font-size:13px; color:#6b7280;">If the button above doesn't work, copy and paste this link into your browser:<br>
                  <a href="${data.interviewUrl}" style="color:#2563eb; word-break:break-all;">${data.interviewUrl}</a>
                </p>
                <p>Best of luck!<br><strong>The ${data.companyName} Team</strong></p>
              </div>
              <div class="footer">
                <p>This interview is powered by Rezulyzer AI. Do not share your interview link with others.</p>
                <p>&copy; ${new Date().getFullYear()} Rezulyzer. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `
Hello ${data.candidateName},

You have been invited by ${data.companyName} for an AI Video Interview.

Position: ${data.jobTitle || 'Not specified'}
Round: ${data.round || 1}
Expires: ${data.expiresAt}

Join here: ${data.interviewUrl}

Tips: Use Chrome/Edge, find a quiet place, have camera & mic ready.

Best of luck!
${data.companyName} Team
        `
      };

    default:
      throw new Error(`Email template '${templateName}' not found`);
  }
};

// Send email function
const sendEmail = async ({ to, subject, template, data, html, text }) => {
  try {
    const transporter = createTransporter();

    let emailContent = {};

    if (template && data) {
      emailContent = getEmailTemplate(template, data);
    } else {
      emailContent = { subject, html, text };
    }

    // Always log in development for traceability, but do not short-circuit if SMTP is configured
    if (process.env.NODE_ENV === 'development') {
      console.log('\n=== EMAIL (DEV LOG) ===');
      console.log('To:', to);
      console.log('Subject:', emailContent.subject);
      console.log('Template Data:', data || 'No template data');
      console.log('========================\n');
    }

    const mailOptions = {
      from: process.env.FROM_EMAIL || 'noreply@rezulyzer.com',
      to,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text
    };

    console.log('[sendEmail] Final mailOptions:', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject,
      htmlLength: mailOptions.html?.length || 0,
      htmlPreview: mailOptions.html?.substring(0, 100)
    });

    try {
      await transporter.verify();
    } catch (verr) {
      console.error('SMTP verification failed:', verr);
      // proceed to attempt send anyway to capture full error from provider
    }

    const result = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', result.messageId);

    return { success: true, messageId: result.messageId };

  } catch (error) {
    console.error('Email sending failed:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

// Send welcome email
const sendWelcomeEmail = async (userEmail, userName) => {
  return sendEmail({
    to: userEmail,
    subject: 'Welcome to Rezulyzer',
    html: `
      <h1>Welcome ${userName}!</h1>
      <p>Thank you for joining Rezulyzer. We're excited to have you on board!</p>
    `,
    text: `Welcome ${userName}! Thank you for joining Rezulyzer.`
  });
};

// Send password reset email
const sendPasswordResetEmail = async (userEmail, resetToken) => {
  const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;
  
  return sendEmail({
    to: userEmail,
    subject: 'Password Reset Request',
    html: `
      <h1>Password Reset Request</h1>
      <p>You requested a password reset. Click the link below to reset your password:</p>
      <a href="${resetUrl}">Reset Password</a>
      <p>This link will expire in 1 hour.</p>
    `,
    text: `Password reset requested. Visit: ${resetUrl}`
  });
};

// Send company credentials email
const sendCompanyCredentials = async (userEmail, data) => {
  const loginUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  
  return sendEmail({
    to: userEmail,
    template: 'company-credentials',
    data: {
      ...data,
      loginUrl
    }
  });
};

const sendAssessmentEmail = async (candidateEmail, data) => {
  const base = process.env.CLIENT_URL || 'http://localhost:3000';
  const fallbackLogin = `${base.replace(/\/$/, '')}/assessment-login`;
  const loginUrl = data?.loginUrl || fallbackLogin;

  return sendEmail({
    to: candidateEmail,
    template: 'candidate-assessment',
    data: {
      ...data,
      loginUrl
    }
  });
};

const sendInterviewInvite = async (candidateEmail, data) => {
  return sendEmail({
    to: candidateEmail,
    template: 'ai-interview-invite',
    data
  });
};

// ----- Round transition emails (sent automatically by the pipeline) -----

const baseClientUrl = () => (process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/$/, '');

const wrap = (subject, headerColor, bodyHtml) => `
<!DOCTYPE html>
<html><head><style>
  body { font-family: Arial, sans-serif; color: #333; }
  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
  .header { background: ${headerColor}; color: white; padding: 20px; text-align: center; border-radius: 6px 6px 0 0; }
  .content { padding: 20px; background: #f9f9f9; }
  .footer { text-align: center; padding: 16px; color: #666; font-size: 12px; }
  .button { display: inline-block; padding: 10px 20px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 5px; margin: 10px 0; }
</style></head>
<body><div class="container">
  <div class="header"><h1 style="margin:0">${subject}</h1></div>
  <div class="content">${bodyHtml}</div>
  <div class="footer">Rezulyzer • automated message</div>
</div></body></html>`;

const sendAssessmentResultEmail = async (candidateEmail, data) => {
  const passed = !!data.passed;
  const subject = passed
    ? `You've cleared the assessment - ${data.companyName || ''}`
    : `Assessment update from ${data.companyName || 'us'}`;
  const colour = passed ? '#16a34a' : '#dc2626';
  const html = wrap(subject, colour, passed ? `
    <p>Hi ${data.candidateName || 'there'},</p>
    <p>Great news — you scored <strong>${data.percentage ?? data.score ?? ''}%</strong> on your assessment with <strong>${data.companyName || 'the team'}</strong> and have advanced to the interview round.</p>
    <p>The team will reach out shortly with the next step. No action needed from you right now.</p>
    <p>— ${data.companyName || 'Rezulyzer'}</p>
  ` : `
    <p>Hi ${data.candidateName || 'there'},</p>
    <p>Thank you for completing the assessment with <strong>${data.companyName || 'us'}</strong>. Unfortunately your score (<strong>${data.percentage ?? data.score ?? '0'}%</strong>) didn't meet the threshold for this role.</p>
    <p>We appreciate the time you put in and wish you the best in your search.</p>
    <p>— ${data.companyName || 'Rezulyzer'}</p>
  `);
  return sendEmail({ to: candidateEmail, subject, html });
};

const sendVideoInterviewInvite = async (candidateEmail, data) => {
  const url = data.interviewUrl || `${baseClientUrl()}/interview/${data.token || ''}`;
  const subject = `🎥 Video Interview Invitation - ${data.companyName || 'Rezulyzer'}`;
  const html = wrap(subject, '#2563eb', `
    <p>Hi <strong>${data.candidateName || 'there'}</strong>,</p>
    <p>Congratulations! You've been invited to the next round — a <strong>video interview</strong> with <strong>${data.companyName || 'our team'}</strong>.</p>
    
    <div style="background: #f0f4ff; border-left: 4px solid #2563eb; padding: 16px; border-radius: 4px; margin: 20px 0;">
      <p style="margin: 0 0 8px 0;"><strong>📋 Interview Details:</strong></p>
      <p style="margin: 4px 0;">⏱️ <strong>Duration:</strong> Approximately 20-30 minutes</p>
      <p style="margin: 4px 0;">📅 <strong>Valid for:</strong> 7 days from now</p>
      <p style="margin: 4px 0;">🎯 <strong>Format:</strong> AI-powered video interview</p>
    </div>
    
    <p><strong>What to expect:</strong></p>
    <ul style="line-height: 1.8;">
      <li>You'll answer a series of questions on camera</li>
      <li>Take your time — you can pause between questions</li>
      <li>Make sure you have a stable internet connection</li>
      <li>Find a quiet, well-lit space for the interview</li>
    </ul>
    
    <div style="text-align: center; margin: 30px 0;">
      <a class="button" href="${url}" style="background: #2563eb; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Start Video Interview</a>
    </div>
    
    <p style="font-size: 13px; color: #666;">If the button doesn't work, copy and paste this link into your browser:</p>
    <p style="background: #f5f5f5; padding: 10px; border-radius: 4px; word-break: break-all; font-size: 12px; font-family: monospace;">${url}</p>
    
    <p>Good luck! We're excited to learn more about you.</p>
    <p style="margin-top: 20px;">— <strong>${data.companyName || 'Rezulyzer'}</strong> Team</p>
  `);
  
  console.log('[VideoInterview] Sending email to:', candidateEmail);
  console.log('[VideoInterview] Subject:', subject);
  console.log('[VideoInterview] URL:', url);
  
  return sendEmail({ to: candidateEmail, subject, html });
};

const sendVideoInterviewResultEmail = async (candidateEmail, data) => {
  const passed = !!data.passed;
  const subject = passed
    ? `You've cleared the video interview - ${data.companyName || ''}`
    : `Interview update from ${data.companyName || 'us'}`;
  const html = wrap(subject, passed ? '#16a34a' : '#dc2626', passed ? `
    <p>Hi ${data.candidateName || 'there'},</p>
    <p>Congratulations — you've cleared the video interview round with <strong>${data.companyName || 'our team'}</strong>.</p>
    <p>You'll hear from us with the next step shortly.</p>
    <p>— ${data.companyName || 'Rezulyzer'}</p>
  ` : `
    <p>Hi ${data.candidateName || 'there'},</p>
    <p>Thank you for taking the time to complete the video interview round with <strong>${data.companyName || 'us'}</strong>. After review, we've decided not to move forward at this time.</p>
    <p>We genuinely appreciate your effort and wish you the best.</p>
    <p>— ${data.companyName || 'Rezulyzer'}</p>
  `);
  return sendEmail({ to: candidateEmail, subject, html });
};

const sendOfferLetterEmail = async (candidateEmail, data) => {
  const subject = `Offer Letter - ${data.companyName || ''}`;
  const html = wrap(subject, '#16a34a', `
    <p>Hi ${data.candidateName || 'there'},</p>
    <p>We're delighted to extend an offer to join <strong>${data.companyName || 'our team'}</strong>${data.role ? ` as <strong>${data.role}</strong>` : ''}.</p>
    ${data.salary ? `<p><strong>Compensation:</strong> ${data.salary}</p>` : ''}
    ${data.startDate ? `<p><strong>Tentative start date:</strong> ${data.startDate}</p>` : ''}
    ${data.message ? `<p>${data.message}</p>` : ''}
    <p>Please reply to this email to confirm your acceptance, or reach out with any questions.</p>
    <p>— ${data.companyName || 'Rezulyzer'}</p>
  `);
  return sendEmail({ to: candidateEmail, subject, html });
};

// Patch sendEmail to support a raw {subject, html} body bypassing templates.
// (kept here so we don't have to touch the template registry above.)
const _sendEmailOriginal = sendEmail;
const sendEmailExtended = async (options) => {
  console.log('[sendEmailExtended] Called with:', JSON.stringify({
    hasOptions: !!options,
    hasRaw: !!options?.raw,
    hasSubject: !!options?.raw?.subject,
    hasHtml: !!options?.raw?.html,
    to: options?.to,
    subjectPreview: options?.raw?.subject?.substring(0, 50)
  }, null, 2));
  
  // If raw email data is provided, extract it and pass to original function
  if (options && options.raw && options.raw.subject && options.raw.html) {
    console.log('[sendEmailExtended] ✅ Using RAW email mode');
    console.log('[sendEmailExtended] Subject:', options.raw.subject);
    
    // Pass the raw data as direct properties to the original sendEmail function
    return _sendEmailOriginal({
      to: options.to,
      subject: options.raw.subject,
      html: options.raw.html
    });
  }
  
  // Otherwise use template mode
  console.log('[sendEmailExtended] ❌ Using TEMPLATE mode (raw data missing)');
  return _sendEmailOriginal(options);
};

module.exports = {
  sendEmail: sendEmailExtended,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendCompanyCredentials,
  sendAssessmentEmail,
  sendInterviewInvite,
  sendAssessmentResultEmail,
  sendVideoInterviewInvite,
  sendVideoInterviewResultEmail,
  sendOfferLetterEmail,
};
