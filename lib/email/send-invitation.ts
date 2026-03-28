/**
 * Email invitation utilities.
 *
 * Currently, invitation emails are sent natively by Supabase Auth
 * via `supabase.auth.admin.inviteUserByEmail()`.
 *
 * This module is a placeholder for future customization with Resend
 * when custom email templates are needed.
 *
 * To enable Resend:
 * 1. Install: `npm install resend`
 * 2. Set RESEND_API_KEY in .env.local
 * 3. Configure Supabase to use custom SMTP or webhook
 * 4. Implement sendInvitationEmail below
 */

export interface InvitationEmailParams {
  to: string;
  inviterName: string;
  empresaName: string;
  role: 'admin' | 'motorista';
  inviteLink: string;
}

/**
 * Placeholder: Send a custom invitation email via Resend.
 * Currently unused — Supabase Auth handles email delivery.
 */
export async function sendInvitationEmail(
  _params: InvitationEmailParams,
): Promise<{ error: string | null }> {
  // TODO: Implement with Resend when custom templates are needed
  // const resend = new Resend(process.env.RESEND_API_KEY);
  // await resend.emails.send({ ... });
  return { error: null };
}
