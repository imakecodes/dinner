import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.resend.com',
  port: Number(process.env.SMTP_PORT) || 465,
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || 'resend',
    pass: process.env.SMTP_PASSWORD,
  },
});

export async function sendKitchenJoinRequestEmail(
  adminEmail: string,
  requesterName: string,
  kitchenName: string
) {
  if (!process.env.SMTP_PASSWORD) {
    console.warn('[Email Service] SMTP_PASSWORD not set. Skipping email send.');
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: '"Dinner Chef AI" <onboarding@resend.dev>', // Update this with your verified sender
      to: adminEmail,
      subject: `${requesterName} wants to join ${kitchenName}`,
      text: `Hello Admin,\n\n${requesterName} has requested to join your kitchen "${kitchenName}".\n\nPlease log in to the dashboard to approve or reject this request.`,
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Kitchen Join Request</h2>
          <p>Hello Admin,</p>
          <p><strong>${requesterName}</strong> has requested to join your kitchen "<strong>${kitchenName}</strong>".</p>
          <p>Please log in to the dashboard to approve or reject this request.</p>
        </div>
      `,
    });

    console.log(`[Email Service] Email sent: ${info.messageId}`);
  } catch (error) {
    console.error('[Email Service] Error sending email:', error);
  }
}
