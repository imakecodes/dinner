
import { baseTemplate } from './base-template';
import { escapeHtml } from '../utils/html-escape';

export const verificationEmailTemplate = (verificationUrl: string, language: string = 'en') => {
  const isPt = language.toLowerCase().startsWith('pt');

  const title = isPt ? 'Verifique seu endereço de email' : 'Verify your email address';
  const heading = isPt ? 'Bem-vindo ao Dinner Chef AI!' : 'Welcome to Dinner Chef AI!';
  const bodyText = isPt
    ? 'Estamos felizes em ter você a bordo. Para começar, verifique seu endereço de email clicando no botão abaixo.'
    : "We're excited to have you on board. To get started, please verify your email address by clicking the button below.";
  const buttonText = isPt ? 'Verificar Email' : 'Verify Email Address';
  const fallbackText = isPt
    ? 'Se o botão acima não funcionar, copie e cole este link no seu navegador:'
    : "If the button above doesn't work, copy and paste this link into your browser:";
  const ignoreText = isPt
    ? 'Se você não se cadastrou no Dinner Chef AI, ignore este email.'
    : 'If you did not sign up for Dinner Chef AI, please ignore this email.';

  const safeVerificationUrl = escapeHtml(verificationUrl);
  const content = `
    <h2>${heading}</h2>
    <p>${bodyText}</p>
    <div style="text-align: center;">
      <a href="${safeVerificationUrl}" class="button">${buttonText}</a>
    </div>
    <p style="margin-top: 30px; font-size: 14px; color: #718096;">
      ${fallbackText}<br>
      <a href="${safeVerificationUrl}" class="link-text">${safeVerificationUrl}</a>
    </p>
    <p style="font-size: 14px; color: #718096; margin-top: 20px;">
      ${ignoreText}
    </p>
  `;
  return baseTemplate(content, title);
};
