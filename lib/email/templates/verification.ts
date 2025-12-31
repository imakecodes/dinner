
import { baseTemplate } from './base-template';
import { escapeHtml } from '../utils/html-escape';

export const verificationEmailTemplate = (verificationUrl: string) => {
  const title = 'Verify your email address';
  const safeVerificationUrl = escapeHtml(verificationUrl);
  const content = `
    <h2>Welcome to Dinner Chef AI!</h2>
    <p>We're excited to have you on board. To get started, please verify your email address by clicking the button below.</p>
    <div style="text-align: center;">
      <a href="${safeVerificationUrl}" class="button">Verify Email Address</a>
    </div>
    <p style="margin-top: 30px; font-size: 14px; color: #718096;">
      If the button above doesn't work, copy and paste this link into your browser:<br>
      <a href="${safeVerificationUrl}" class="link-text">${safeVerificationUrl}</a>
    </p>
    <p style="font-size: 14px; color: #718096; margin-top: 20px;">
      If you did not sign up for Dinner Chef AI, please ignore this email.
    </p>
  `;
  return baseTemplate(content, title);
};
