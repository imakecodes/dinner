
import { baseTemplate } from './base-template';
import { escapeHtml } from '../utils/html-escape';

export const kitchenJoinRequestTemplate = (
  requesterName: string, 
  kitchenName: string,
  appUrl: string
) => {
  const title = 'Kitchen Join Request';
  const safeRequesterName = escapeHtml(requesterName);
  const safeKitchenName = escapeHtml(kitchenName);
  const safeAppUrl = escapeHtml(appUrl);
  
  const content = `
    <h2>New Join Request</h2>
    <p>Hello Admin,</p>
    <div class="info-box">
      <p style="margin: 0;"><strong>${safeRequesterName}</strong> has requested to join your kitchen "<strong>${safeKitchenName}</strong>".</p>
    </div>
    <p>Please log in to your dashboard to approve or reject this request.</p>
    <a href="${safeAppUrl}" class="button">Go to Dashboard</a>
  `;
  return baseTemplate(content, title);
};
