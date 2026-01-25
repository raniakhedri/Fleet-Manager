// Email service using Resend API (works on Render - no SMTP blocking)
import { Resend } from 'resend';

// Initialize Resend with API key
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

if (resend) {
  console.log('[EMAIL] Resend configured successfully');
} else {
  console.warn('[EMAIL] RESEND_API_KEY not set. Email functionality will be disabled.');
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
  // Check if Resend is available
  if (!resend) {
    console.warn('[EMAIL] Skipping email - Resend not configured');
    console.warn(`[EMAIL] Would have sent credentials to ${driverEmail}`);
    console.warn(`[EMAIL] Password for ${driverName}: ${password}`);
    throw new Error('Email service not configured');
  }

  const loginUrl = process.env.FRONTEND_URL || 'https://raniakhedri.github.io/Fleet-Manager';

  try {
    const { data, error } = await resend.emails.send({
      from: 'FleetGuard <onboarding@resend.dev>',
      to: driverEmail,
      subject: 'Bienvenue à FleetGuard - Vos Identifiants de Compte',
      html: `
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
      `,
    });

    if (error) {
      console.error('[EMAIL] Resend error:', error);
      throw new Error(error.message);
    }

    console.log(`[EMAIL] Credentials sent to ${driverEmail}, id: ${data?.id}`);
  } catch (error) {
    console.error('[EMAIL] Failed to send email:', error);
    throw new Error('Failed to send credentials email');
  }
}
