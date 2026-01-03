import { translations } from '@/lib/translations';

export const passwordChangedEmailTemplate = (name: string, appUrl: string, language: string = 'en') => {
  // Normalize language key
  let langKey = language;
  if (language.toLowerCase().startsWith('pt')) {
    langKey = 'pt-BR';
  }
  
  const t = (translations[langKey as keyof typeof translations] || translations['en']).email.passwordChanged;
  
  // Replace {name} placeholder
  const greeting = t.greeting.replace('{name}', name);

  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .content { background: #f9fafb; padding: 30px; border-radius: 12px; }
    .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
    .alert { color: #854d0e; background-color: #fefce8; border: 1px solid #fde047; padding: 15px; border-radius: 8px; margin-bottom: 20px; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="color: #111827; margin: 0;">Dinner App</h1>
    </div>
    <div class="content">
      <h2 style="margin-top: 0; color: #1f2937;">${t.title}</h2>
      <p>${greeting}</p>
      <div class="alert">
        <strong>${t.alert}</strong> ${t.message}
      </div>
      <p>${t.ignore}</p>
      <p><strong>${t.action}</strong></p>
      <p style="margin-top: 20px;">
        <a href="${appUrl}/reset-password" style="display: inline-block; padding: 12px 24px; background-color: #e11d48; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">${t.button}</a>
      </p>
    </div>
    <div class="footer">
      <p>Dinner App - Smart Culinary Intelligence</p>
      <p>${t.footer}</p>
    </div>
  </div>
</body>
</html>
`;
};
