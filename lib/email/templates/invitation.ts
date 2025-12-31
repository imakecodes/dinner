
import { baseTemplate } from './base-template';
import { escapeHtml } from '../utils/html-escape';

export const invitationEmailTemplate = (
  inviterName: string,
  kitchenName: string,
  inviteCode: string | undefined,
  ctaUrl: string,
  ctaText: string,
  isExistingUser: boolean
) => {
  const title = isExistingUser ? `You've been added to a kitchen` : `You've been invited to a kitchen`;
  const safeInviterName = escapeHtml(inviterName);
  const safeKitchenName = escapeHtml(kitchenName);
  const safeInviteCode = inviteCode ? escapeHtml(inviteCode) : '';
  const safeCtaUrl = escapeHtml(ctaUrl);
  const safeCtaText = escapeHtml(ctaText);
  
  const inviteCodeSection = !isExistingUser && safeInviteCode
    ? `<div class="info-box" style="text-align: center;">
         <p style="margin-bottom: 5px; font-size: 14px; color: #4a5568;">Your Join Code:</p>
         <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px; margin: 0; color: #1a202c;">${safeInviteCode}</p>
       </div>`
    : '';

  const content = `
    <h2>${title}</h2>
    <p>Hello,</p>
    <p><strong>${safeInviterName}</strong> has invited you to join their kitchen "<strong>${safeKitchenName}</strong>".</p>
    
    ${inviteCodeSection}
    
    <p>${isExistingUser 
      ? 'Log in to your account to access the kitchen.' 
      : 'To accept the invitation, please create an account using the button below.'
    }</p>
    
    <div style="text-align: center;">
      <a href="${safeCtaUrl}" class="button">${safeCtaText}</a>
    </div>
    
    <p style="margin-top: 30px; font-size: 14px; color: #718096;">
      Or copy this link: <a href="${safeCtaUrl}" class="link-text">${safeCtaUrl}</a>
    </p>
  `;
  return baseTemplate(content, title);
};
