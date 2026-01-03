import nodemailer from 'nodemailer';
import { kitchenJoinRequestTemplate } from './email/templates/kitchen-join-request';
import { verificationEmailTemplate } from './email/templates/verification';
import { invitationEmailTemplate } from './email/templates/invitation';
import { passwordResetEmailTemplate } from './email/templates/password-reset';
import { passwordChangedEmailTemplate } from './email/templates/password-changed';
import { translations } from '@/lib/translations';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.resend.com',
  port: Number(process.env.SMTP_PORT) || 465,
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || 'resend',
    pass: process.env.SMTP_PASSWORD,
  },
});

export async function sendKitchenJoinRequestEmail(
  adminEmail: string,
  requesterName: string,
  kitchenName: string
) {
  if (!process.env.SMTP_PASSWORD) {
    console.warn('[Email Service] SMTP_PASSWORD not set. Skipping email send.');
    return;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  try {
    const html = kitchenJoinRequestTemplate(requesterName, kitchenName, appUrl);
    const info = await transporter.sendMail({
      from: '"Dinner Chef AI" <onboarding@resend.dev>', // Update this with your verified sender
      to: adminEmail,
      subject: `${requesterName} wants to join ${kitchenName}`,
      text: `Hello Admin,\n\n${requesterName} has requested to join your kitchen "${kitchenName}".\n\nPlease log in to the dashboard to approve or reject this request.`,
      html,
    });

    console.log(`[Email Service] Email sent: ${info.messageId}`);
  } catch (error) {
    console.error('[Email Service] Error sending email:', error);
  }
}

export async function sendVerificationEmail(email: string, token: string, language: string = 'en') {
  if (!process.env.SMTP_PASSWORD) {
    console.warn('[Email Service] SMTP_PASSWORD not set. Skipping verification email.');
    return;
  }

  const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/verify-email?token=${token}`;

  const fromName = process.env.SMTP_EMAIL_FROM_NAME || 'Dinner Chef AI';
  const fromEmail = process.env.SMTP_EMAIL_FROM || 'onboarding@resend.dev';

  const isPt = language.toLowerCase().startsWith('pt');
  const subject = isPt ? 'Verifique seu endereço de email' : 'Verify your email address';
  const text = isPt
    ? `Bem-vindo ao Dinner Chef AI!\n\nClique no link abaixo para verificar seu endereço de email:\n${verificationUrl}\n\nSe você não se cadastrou, ignore este email.`
    : `Welcome to Dinner Chef AI!\n\nPlease click the link below to verify your email address:\n${verificationUrl}\n\nIf you did not sign up, please ignore this email.`;

  try {
    const html = verificationEmailTemplate(verificationUrl, language);
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: email,
      subject: subject,
      text: text,
      html,
    });

    console.log(`[Email Service] Verification email sent: ${info.messageId}`);
  } catch (error) {
    console.error('[Email Service] Error sending verification email:', error);
  }
}

export async function sendInvitationEmail(
  email: string,
  inviterName: string,
  kitchenName: string,
  inviteCode: string,
  isExistingUser: boolean
) {
  if (!process.env.SMTP_PASSWORD) {
    console.warn('[Email Service] SMTP_PASSWORD not set. Skipping invitation email.');
    return;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const ctaUrl = isExistingUser ? `${appUrl}/login` : `${appUrl}/register?email=${encodeURIComponent(email)}`;
  const ctaText = isExistingUser ? 'Login to Dashboard' : 'Create Account';

  const subject = isExistingUser
    ? `You have been added to ${kitchenName}`
    : `You have been invited to join ${kitchenName}`;

  const messageText = isExistingUser
    ? `Hello,\n\nYou have been added to the kitchen "${kitchenName}".\n\nLog in to your account to access the kitchen:\n${ctaUrl}`
    : `Hello,\n\n${inviterName} has invited you to join their kitchen "${kitchenName}".\n\nTo accept the invitation, please create an account using this email address:\n${ctaUrl}\n\nKitchen Invite Code: ${inviteCode}`;

  const html = invitationEmailTemplate(
    inviterName,
    kitchenName,
    inviteCode,
    ctaUrl,
    ctaText,
    isExistingUser
  );

  const fromName = process.env.SMTP_EMAIL_FROM_NAME || 'Dinner Chef AI';
  const fromEmail = process.env.SMTP_EMAIL_FROM || 'onboarding@resend.dev';

  try {
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: email,
      subject: subject,
      text: messageText,
      html,
    });

    console.log(`[Email Service] Invitation email sent to ${email}: ${info.messageId}`);
  } catch (error) {
    console.error('[Email Service] Error sending invitation email:', error);
  }
}


export async function sendPasswordChangedEmail(email: string, name: string, language: string = 'en') {
  if (!process.env.SMTP_PASSWORD) {
    console.warn('[Email Service] SMTP_PASSWORD not set. Skipping password changed email.');
    return;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const fromName = process.env.SMTP_EMAIL_FROM_NAME || 'Dinner Chef AI';
  const fromEmail = process.env.SMTP_EMAIL_FROM || 'onboarding@resend.dev';

  // Normalize language
  let langKey = language;
  if (language.toLowerCase().startsWith('pt')) {
    langKey = 'pt-BR';
  }

  const t = (translations[langKey as keyof typeof translations] || translations['en']).email.passwordChanged;
  
  const subject = t.subject;
  const text = t.text.replace('{name}', name);

  try {
    const html = passwordChangedEmailTemplate(name, appUrl, language);
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: email,
      subject: subject,
      text: text,
      html,
    });

    console.log(`[Email Service] Password changed email sent: ${info.messageId}`);
  } catch (error) {
    console.error('[Email Service] Error sending password changed email:', error);
  }
}

export async function sendPasswordResetEmail(email: string, name: string, token: string, language: string = 'en') {
  if (!process.env.SMTP_PASSWORD) {
    console.warn('[Email Service] SMTP_PASSWORD not set. Skipping password reset email.');
    return;
  }

  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

  const fromName = process.env.SMTP_EMAIL_FROM_NAME || 'Dinner Chef AI';
  const fromEmail = process.env.SMTP_EMAIL_FROM || 'onboarding@resend.dev';

  // Normalize language
  let langKey = language;
  if (language.toLowerCase().startsWith('pt')) {
    langKey = 'pt-BR';
  }

  const t = (translations[langKey as keyof typeof translations] || translations['en']).email.passwordReset;
  
  const subject = t.subject;
  const text = t.text.replace('{resetUrl}', resetUrl);

  try {
    const html = passwordResetEmailTemplate(resetUrl, language);
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: email,
      subject,
      text,
      html,
    });

    console.log(`[Email Service] Password reset email sent: ${info.messageId}`);
  } catch (error) {
    console.error('[Email Service] Error sending password reset email:', error);
  }
}
