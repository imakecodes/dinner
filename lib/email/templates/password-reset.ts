import { baseTemplate } from './base-template';
import { escapeHtml } from '../utils/html-escape';

export const passwordResetEmailTemplate = (resetUrl: string, language: string = 'en') => {
  const isPt = language.toLowerCase().startsWith('pt');

  const title = isPt ? 'Redefina sua senha' : 'Reset your password';
  const heading = isPt ? 'Solicitação de Redefinição de Senha' : 'Password Reset Request';
  const text1 = isPt
    ? 'Recebemos uma solicitação para redefinir sua senha. Clique no botão abaixo para criar uma nova senha.'
    : 'We received a request to reset your password. Click the button below to create a new password.';
  const buttonText = isPt ? 'Redefinir Senha' : 'Reset Password';
  const text2 = isPt
    ? 'Se o botão acima não funcionar, copie e cole este link no seu navegador:'
    : 'If the button above doesn\'t work, copy and paste this link into your browser:';
  const text3 = isPt
    ? 'Este link expirará em 1 hora. Se você não solicitou uma redefinição de senha, ignore este email.'
    : 'This link will expire in 1 hour. If you did not request a password reset, please ignore this email.';

  const safeResetUrl = escapeHtml(resetUrl);
  const content = `
    <h2>${heading}</h2>
    <p>${text1}</p>
    <div style="text-align: center;">
      <a href="${safeResetUrl}" class="button">${buttonText}</a>
    </div>
    <p style="margin-top: 30px; font-size: 14px; color: #718096;">
      ${text2}<br>
      <a href="${safeResetUrl}" class="link-text">${safeResetUrl}</a>
    </p>
    <p style="font-size: 14px; color: #718096; margin-top: 20px;">
      ${text3}
    </p>
  `;
  return baseTemplate(content, title);
};
