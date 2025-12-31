import { escapeHtml } from '../utils/html-escape';

export const baseTemplate = (content: string, title: string) => {
  const safeTitle = escapeHtml(title);
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
  <style>
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      line-height: 1.6;
      margin: 0;
      padding: 0;
      background-color: #ffffff;
      color: #0f172a; /* slate-900 */
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border: 2px solid #e2e8f0; /* slate-200 */
      border-radius: 24px; /* rounded-3xl */
      overflow: hidden;
      box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); /* shadow-sm */
    }
    .header {
      background-color: #ffffff;
      padding: 32px 32px 0 32px;
      text-align: left;
    }
    .logo-container {
      text-decoration: none;
    }
    .logo-icon {
      background-color: #e11d48; /* rose-600 */
      color: white;
      width: 36px;
      height: 36px;
      border-radius: 8px;
      font-size: 18px;
      box-shadow: 0 4px 6px -1px rgba(225, 29, 72, 0.2);
      display: inline-block;
      vertical-align: middle;
      text-align: center;
      line-height: 36px; /* Match height for vertical centering */
    }
    .logo-text {
      color: #0f172a; /* slate-900 */
      font-size: 24px;
      margin: 0 0 0 12px;
      font-weight: 900;
      letter-spacing: -0.05em; /* tight tracking */
      display: inline-block;
      vertical-align: middle;
    }
    .content {
      padding: 32px;
      color: #475569; /* slate-600 */
      font-size: 16px;
      font-weight: 500;
    }
    .footer {
      background-color: #ffffff;
      padding: 24px;
      text-align: center;
      font-size: 13px;
      color: #94a3b8; /* slate-400 */
      border-top: 1px solid #e2e8f0; /* slate-200 */
      font-weight: 500;
    }
    .button {
      display: inline-block;
      background-color: #e11d48; /* rose-600 */
      color: #ffffff !important;
      padding: 16px 32px;
      border-radius: 12px; /* rounded-xl */
      text-decoration: none;
      font-weight: 800;
      margin-top: 24px;
      text-align: center;
      box-shadow: 0 4px 6px -1px rgba(225, 29, 72, 0.2), 0 2px 4px -1px rgba(225, 29, 72, 0.1);
    }
    h2 {
      color: #0f172a; /* slate-900 */
      font-size: 22px;
      margin-bottom: 24px;
      font-weight: 800;
      letter-spacing: -0.025em;
    }
    p {
      margin-bottom: 24px;
      color: #334155; /* slate-700 */
      line-height: 1.7;
    }
    strong {
      color: #0f172a; /* slate-900 */
      font-weight: 700;
    }
    .link-text {
      color: #e11d48; /* rose-600 */
      text-decoration: none;
      font-weight: 600;
      border-bottom: 2px solid #fecdd3; /* rose-200 */
    }
    .info-box {
      background-color: #fff1f2; /* rose-50 */
      border: 1px solid #ffe4e6; /* rose-100 */
      padding: 24px;
      margin-bottom: 24px;
      border-radius: 16px; /* rounded-2xl */
      text-align: center;
    }
    .code-display {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 36px;
      font-weight: 900;
      letter-spacing: 0.2em;
      color: #e11d48; /* rose-600 */
      margin: 16px 0;
      display: block;
      text-shadow: 2px 2px 0px rgba(225,29,72,0.1);
    }

    @media only screen and (max-width: 600px) {
      .container {
        margin: 0;
        border-radius: 0;
        width: 100%;
        border: none;
        box-shadow: none;
      }
      .content {
        padding: 24px;
      }
      .header {
        padding: 24px 24px 0 24px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-container">
        <div class="logo-icon">🍴</div>
        <span class="logo-text">Dinner?</span>
      </div>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} Dinner Chef AI.<br>
      Your Executive Chef and Food Safety Auditor.
    </div>
  </div>
</body>
</html>
`;
};
