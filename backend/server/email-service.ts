// Email service using Brevo API (works on Render - no SMTP blocking)
// Brevo free tier: 300 emails/day
import * as brevo from '@getbrevo/brevo';

// Initialize Brevo API
const apiInstance = new brevo.TransactionalEmailsApi();
const apiKey = process.env.BREVO_API_KEY;

if (apiKey) {
  apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, apiKey);
  console.log('[EMAIL] Brevo configured successfully');
} else {
  console.warn('[EMAIL] BREVO_API_KEY not set. Email functionality will be disabled.');
}

// Generate random password
export function generateRandomPassword(length: number = 12): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// Send driver credentials email
export async function sendDriverCredentialsEmail(
  driverEmail: string,
  driverName: string,
  password: string
): Promise<void> {
  // Check if Brevo is configured
  if (!apiKey) {
    console.warn('[EMAIL] Skipping email - Brevo not configured');
    console.warn(`[EMAIL] Would have sent credentials to ${driverEmail}`);
    console.warn(`[EMAIL] Password for ${driverName}: ${password}`);
    throw new Error('Email service not configured');
  }

  const loginUrl = process.env.FRONTEND_URL || 'https://ahmedznati.github.io/Fleet-ManagerAhmed/';
  const senderEmail = process.env.BREVO_SENDER_EMAIL || 'noreply@fleetguard.com';
  const senderName = process.env.BREVO_SENDER_NAME || 'FleetGuard';

  const sendSmtpEmail = new brevo.SendSmtpEmail();
  sendSmtpEmail.subject = 'Bienvenue à FleetGuard - Vos Identifiants de Compte';
  sendSmtpEmail.htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; }
        .header { background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .credentials { background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb; }
        .credential-item { margin: 10px 0; }
        .credential-label { font-weight: bold; color: #1e40af; }
        .credential-value { font-family: monospace; background: white; padding: 8px 12px; border-radius: 4px; display: inline-block; margin-top: 5px; font-size: 16px; }
        .button { display: inline-block; background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-top: 20px; border-radius: 4px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🚗 Bienvenue à FleetGuard</h1>
        </div>
        <div class="content">
          <h2>Bonjour ${driverName},</h2>
          <p>Bienvenue à FleetGuard ! Votre compte chauffeur a été créé avec succès.</p>
          <p>Vous pouvez maintenant accéder au portail chauffeur pour consulter vos missions assignées.</p>
          
          <div class="credentials">
            <div class="credential-item">
              <div class="credential-label">Email:</div>
              <div class="credential-value">${driverEmail}</div>
            </div>
            <div class="credential-item">
              <div class="credential-label">Mot de passe:</div>
              <div class="credential-value">${password}</div>
            </div>
          </div>
          
          <div class="warning">
            <strong>⚠️ Important:</strong> Veuillez changer votre mot de passe après votre première connexion.
          </div>
          
          <center>
            <a href="${loginUrl}/login" class="button">Se connecter à FleetGuard</a>
          </center>
          
          <div class="footer">
            <p>Si vous avez des questions, contactez votre administrateur.</p>
            <p>&copy; 2026 FleetGuard. Tous droits réservés.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
  sendSmtpEmail.sender = { name: senderName, email: senderEmail };
  sendSmtpEmail.to = [{ email: driverEmail, name: driverName }];

  try {
    const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log(`[EMAIL] Credentials sent to ${driverEmail}, messageId: ${response.body.messageId}`);
  } catch (error: any) {
    console.error('[EMAIL] Failed to send email:', error?.body || error);
    throw new Error('Failed to send credentials email');
  }
}

// Send license expiry warning email to driver
export async function sendLicenseExpiryWarningToDriver(
  driverEmail: string,
  driverName: string,
  expiryDate: Date,
  daysRemaining: number
): Promise<void> {
  if (!apiKey) {
    console.warn('[EMAIL] Skipping email - Brevo not configured');
    return;
  }

  const senderEmail = process.env.BREVO_SENDER_EMAIL || 'noreply@fleetguard.com';
  const senderName = process.env.BREVO_SENDER_NAME || 'FleetGuard';
  const formattedDate = expiryDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  const sendSmtpEmail = new brevo.SendSmtpEmail();
  sendSmtpEmail.subject = `⚠️ Alerte: Votre permis de conduire expire ${daysRemaining <= 0 ? "aujourd'hui" : `dans ${daysRemaining} jours`}`;
  sendSmtpEmail.htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #c41e3a 0%, #8b0000 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .warning-box { background: #fef3c7; border: 2px solid #f59e0b; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
        .date { font-size: 24px; font-weight: bold; color: #c41e3a; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⚠️ Alerte Permis de Conduire</h1>
        </div>
        <div class="content">
          <h2>Bonjour ${driverName},</h2>
          <p>Nous vous informons que votre permis de conduire arrive à expiration.</p>
          
          <div class="warning-box">
            <p>Date d'expiration:</p>
            <p class="date">${formattedDate}</p>
            <p>${daysRemaining <= 0 ? "⛔ Votre permis a expiré!" : `⏰ Il reste ${daysRemaining} jour(s)`}</p>
          </div>
          
          <p>Veuillez renouveler votre permis de conduire dans les plus brefs délais pour continuer à être éligible aux missions.</p>
          
          <p><strong>Important:</strong> Vous ne pourrez pas être assigné à de nouvelles missions si votre permis est expiré.</p>
          
          <div class="footer">
            <p>FleetGuard - Gestion de Flotte Militaire</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
  sendSmtpEmail.sender = { name: senderName, email: senderEmail };
  sendSmtpEmail.to = [{ email: driverEmail, name: driverName }];

  try {
    const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log(`[EMAIL] License expiry warning sent to ${driverEmail}, messageId: ${response.body.messageId}`);
  } catch (error: any) {
    console.error('[EMAIL] Failed to send license expiry email:', error?.body || error);
  }
}

// Send license expiry notification to admin
export async function sendLicenseExpiryNotificationToAdmin(
  adminEmail: string,
  driverName: string,
  driverEmail: string,
  expiryDate: Date,
  daysRemaining: number
): Promise<void> {
  if (!apiKey) {
    console.warn('[EMAIL] Skipping email - Brevo not configured');
    return;
  }

  const senderEmail = process.env.BREVO_SENDER_EMAIL || 'noreply@fleetguard.com';
  const senderName = process.env.BREVO_SENDER_NAME || 'FleetGuard';
  const formattedDate = expiryDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  const sendSmtpEmail = new brevo.SendSmtpEmail();
  sendSmtpEmail.subject = `🚨 Alerte Admin: Permis de ${driverName} ${daysRemaining <= 0 ? "expiré" : "expire bientôt"}`;
  sendSmtpEmail.htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #d4a51a 0%, #b8860b 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .alert-box { background: ${daysRemaining <= 0 ? '#fee2e2' : '#fef3c7'}; border: 2px solid ${daysRemaining <= 0 ? '#dc2626' : '#f59e0b'}; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .driver-info { background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🚨 Notification Admin</h1>
        </div>
        <div class="content">
          <h2>Alerte de Permis de Conduire</h2>
          
          <div class="alert-box">
            <p><strong>${daysRemaining <= 0 ? "⛔ PERMIS EXPIRÉ" : `⚠️ Permis expire dans ${daysRemaining} jour(s)`}</strong></p>
          </div>
          
          <div class="driver-info">
            <p><strong>Chauffeur:</strong> ${driverName}</p>
            <p><strong>Email:</strong> ${driverEmail}</p>
            <p><strong>Date d'expiration:</strong> ${formattedDate}</p>
          </div>
          
          <p>${daysRemaining <= 0 
            ? "Ce chauffeur ne peut plus être assigné à des missions jusqu'au renouvellement de son permis."
            : "Veuillez contacter le chauffeur pour s'assurer du renouvellement de son permis."
          }</p>
          
          <div class="footer">
            <p>FleetGuard - Gestion de Flotte Militaire</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
  sendSmtpEmail.sender = { name: senderName, email: senderEmail };
  sendSmtpEmail.to = [{ email: adminEmail }];

  try {
    const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log(`[EMAIL] License expiry admin notification sent, messageId: ${response.body.messageId}`);
  } catch (error: any) {
    console.error('[EMAIL] Failed to send admin notification:', error?.body || error);
  }
}
