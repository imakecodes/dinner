export async function sendKitchenJoinRequestEmail(
  adminEmail: string, 
  requesterName: string, 
  kitchenName: string
) {
  // Mock email sending
  console.log(`[Email Service] Sending Kitchen Join Request Email`);
  console.log(`To: ${adminEmail}`);
  console.log(`Subject: ${requesterName} wants to join ${kitchenName}`);
  console.log(`Body:`);
  console.log(`Hello Admin,`);
  console.log(`${requesterName} has requested to join your kitchen "${kitchenName}".`);
  console.log(`Please log in to the dashboard to approve or reject this request.`);
  console.log(`[Email Service] Email sent successfully (mocked)`);
}
