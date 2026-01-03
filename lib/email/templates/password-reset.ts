import { translations } from '@/lib/translations';
import { baseTemplate } from './base-template';
import { escapeHtml } from '../utils/html-escape';

export const passwordResetEmailTemplate = (resetUrl: string, language: string = 'en') => {
  // Normalize language
  let langKey = language;
  if (language.toLowerCase().startsWith('pt')) {
    langKey = 'pt-BR';
  }

  const t = (translations[langKey as keyof typeof translations] || translations['en']).email.passwordReset;

  const safeResetUrl = escapeHtml(resetUrl);
  const content = `
    <h2>${t.heading}</h2>
    <p>${t.message}</p>
    <div style="text-align: center;">
      <a href="${safeResetUrl}" class="button">${t.button}</a>
    </div>
    <p style="margin-top: 30px; font-size: 14px; color: #718096;">
      ${t.backupAction}<br>
      <a href="${safeResetUrl}" class="link-text">${safeResetUrl}</a>
    </p>
    <p style="font-size: 14px; color: #718096; margin-top: 20px;">
      ${t.expiryMessage}
    </p>
  `;
  // Assuming title is not used in baseTemplate for visual display, but maybe for <title>?
  // The original code passed 'title' as second arg to baseTemplate.
  // We don't have 'title' key in passwordReset group in locale... wait.
  // I didn't add 'title' to my update in step 927/929!
  // I added 'heading' but not 'title'.
  // Original code: title = isPt ? 'Redefina sua senha' : 'Reset your password';
  // This matches 'subject'. I can re-use 'subject' as title? or add 'title'.
  // Let's use t.subject for title as they were same in original code (almost).
  // Original subject: 'Redefina sua senha'
  // Original title: 'Redefina sua senha'
  
  return baseTemplate(content, t.subject);
};
