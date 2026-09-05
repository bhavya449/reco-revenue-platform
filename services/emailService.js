/* ==========================================================================
   RECO — AI REVENUE RECOVERY PLATFORM
   Transactional Email Service (Resend SDK + Universal SMTP Support)
   Palette:
     Space Cadet:     #25344F
     Slate Gray:      #617891
     Tan:             #D5B893
     Coffee:          #6F4D38
     Caput Mortuum:   #632024
     Warm Cream:      #FAF8F5
   ========================================================================== */

const { Resend } = require('resend');
const nodemailer = require('nodemailer');

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Generates the luxury-fintech styled HTML template for RECO welcome emails.
 */
function generateWelcomeEmailHtml({ userName, userEmail, appUrl }) {
  const loginUrl = `${appUrl || 'http://localhost:8080'}/#login`;
  userName = escapeHtml(userName);
  userEmail = escapeHtml(userEmail);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to RECO</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FAF8F5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #25344F;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #FAF8F5; padding: 40px 16px;">
    <tr>
      <td align="center">
        <!-- Main Email Container -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #FFFFFF; border-radius: 16px; border: 1px solid rgba(213, 184, 147, 0.4); overflow: hidden; box-shadow: 0 10px 30px rgba(37, 52, 79, 0.08);">
          
          <!-- Header Banner (Space Cadet Navy) -->
          <tr>
            <td style="background-color: #25344F; padding: 32px 36px; text-align: left; border-bottom: 3px solid #D5B893;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <!-- RECO Logo Mark -->
                    <table border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="width: 36px; height: 36px; background-color: rgba(213, 184, 147, 0.15); border: 1.5px solid #D5B893; border-radius: 8px; text-align: center; vertical-align: middle; color: #D5B893; font-weight: 800; font-size: 18px; font-family: 'Outfit', sans-serif;">
                          R
                        </td>
                        <td style="padding-left: 12px; color: #FFFFFF; font-size: 22px; font-weight: 800; letter-spacing: 0.05em; font-family: 'Outfit', sans-serif;">
                          RECO<span style="color: #D5B893;">.</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" style="color: #D5B893; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;">
                    AI Revenue Recovery
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content Body -->
          <tr>
            <td style="padding: 36px 36px 28px;">
              <h1 style="margin: 0 0 16px; font-size: 22px; color: #25344F; font-weight: 700;">
                Hi ${userName || 'there'},
              </h1>
              
              <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.6; color: #25344F;">
                Your <strong>RECO</strong> account has been successfully created 🎉
              </p>

              <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #617891;">
                You can now start managing your invoices, monitoring payment risks, and recovering outstanding revenue with AI-powered insights.
              </p>

              <!-- Account Details Card -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #FAF8F5; border-radius: 10px; border: 1px solid rgba(97, 120, 145, 0.2); padding: 18px 20px; margin-bottom: 28px;">
                <tr>
                  <td>
                    <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.06em; color: #6F4D38; margin-bottom: 4px;">
                      Registered Account Email
                    </div>
                    <div style="font-size: 15px; font-weight: 700; color: #25344F; font-family: monospace;">
                      ${userEmail}
                    </div>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 32px;">
                <tr>
                  <td align="center">
                    <a href="${loginUrl}" target="_blank" style="display: inline-block; background-color: #25344F; color: #FFFFFF; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 34px; border-radius: 8px; border: 1px solid #D5B893; box-shadow: 0 4px 12px rgba(37, 52, 79, 0.2);">
                      Open RECO Command Center →
                    </a>
                  </td>
                </tr>
              </table>

              <hr style="border: none; border-top: 1px solid rgba(97, 120, 145, 0.15); margin: 28px 0 24px;" />

              <!-- Signoff -->
              <p style="margin: 0 0 6px; font-size: 14px; font-weight: 700; color: #25344F;">
                Welcome to RECO.
              </p>
              <p style="margin: 0 0 16px; font-size: 13px; font-style: italic; color: #6F4D38;">
                "Recover Revenue. Smarter."
              </p>
              <p style="margin: 0; font-size: 13px; font-weight: 600; color: #617891;">
                — Team RECO
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #FAF8F5; padding: 20px 36px; text-align: center; border-top: 1px solid rgba(97, 120, 145, 0.15); color: #617891; font-size: 12px; line-height: 1.5;">
              © 2026 RECO AI Platforms Inc. · Enterprise B2B Financial Intelligence<br>
              This is an automated transactional notification for your account registration.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Plain text fallback version of the welcome email.
 */
function generateWelcomeEmailText({ userName, userEmail, appUrl }) {
  const loginUrl = `${appUrl || 'http://localhost:8080'}/#login`;
  return `Hi ${userName || 'there'},

Your RECO account has been successfully created.

You can now start managing your invoices, monitoring payment risks, and recovering outstanding revenue with AI-powered insights.

Account Email: ${userEmail}
Access RECO: ${loginUrl}

Welcome to RECO.

Recover Revenue. Smarter.

— Team RECO`;
}

/**
 * Dispatches real welcome email using Resend API or SMTP Transport.
 * @returns {Promise<{ success: boolean, messageId?: string, error?: string }>}
 */
async function sendWelcomeEmail({ userName, userEmail }) {
  const appUrl = process.env.APP_URL || 'http://localhost:8080';
  const fromEmail = process.env.EMAIL_FROM || 'RECO <onboarding@resend.dev>';
  const subject = 'Welcome to RECO — Your Account Has Been Created Successfully 🎉';

  const htmlContent = generateWelcomeEmailHtml({ userName, userEmail, appUrl });
  const textContent = generateWelcomeEmailText({ userName, userEmail, appUrl });

  const resendApiKey = process.env.RESEND_API_KEY || process.env.EMAIL_API_KEY;

  // 1. Try Resend Service if API Key is configured
  if (resendApiKey && resendApiKey !== 're_your_api_key_here') {
    try {
      const resend = new Resend(resendApiKey);
      const response = await resend.emails.send({
        from: fromEmail,
        to: userEmail,
        subject: subject,
        html: htmlContent,
        text: textContent
      });

      if (response.error) {
        console.error('[EMAIL ERROR] Resend API rejected message:', response.error);
        return { success: false, error: response.error.message || 'Resend delivery failed' };
      }

      console.log(`[EMAIL SUCCESS] Real welcome email sent via Resend to ${userEmail} (Message ID: ${response.data ? response.data.id : 'OK'})`);
      return { success: true, messageId: response.data ? response.data.id : 'SENT' };
    } catch (err) {
      console.error('[EMAIL ERROR] Exception sending with Resend:', err.message);
      return { success: false, error: err.message };
    }
  }

  // 2. Try SMTP Transport if SMTP Credentials are configured
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      const info = await transporter.sendMail({
        from: fromEmail,
        to: userEmail,
        subject: subject,
        html: htmlContent,
        text: textContent
      });

      console.log(`[EMAIL SUCCESS] Real welcome email sent via SMTP to ${userEmail} (Message ID: ${info.messageId})`);
      return { success: true, messageId: info.messageId };
    } catch (err) {
      console.error('[EMAIL ERROR] Exception sending with SMTP:', err.message);
      return { success: false, error: err.message };
    }
  }

  // 3. No Email Provider Credentials Configured
  console.warn('[EMAIL WARNING] No RESEND_API_KEY or SMTP configuration found in environment variables. Email could not be dispatched over network.');
  return {
    success: false,
    error: 'NO_EMAIL_CONFIG',
    message: 'Email service credentials not configured on backend.'
  };
}

module.exports = {
  sendWelcomeEmail,
  generateWelcomeEmailHtml,
  generateWelcomeEmailText
};
