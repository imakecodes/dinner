
import { baseTemplate } from './base-template';

export const kitchenJoinRequestTemplate = (requesterName: string, kitchenName: string) => {
  const title = 'Kitchen Join Request';
  const content = `
    <h2>New Join Request</h2>
    <p>Hello Admin,</p>
    <div class="info-box">
      <p style="margin: 0;"><strong>${requesterName}</strong> has requested to join your kitchen "<strong>${kitchenName}</strong>".</p>
    </div>
    <p>Please log in to your dashboard to approve or reject this request.</p>
    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}" class="button">Go to Dashboard</a>
  `;
  return baseTemplate(content, title);
};
