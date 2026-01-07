import nodemailer from 'nodemailer';

// Gmail Email setup
let mailTransporter: nodemailer.Transporter | null = null;

// Initialize Gmail transporter
if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
  mailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER, // admin@smilestarsindia.com
      pass: process.env.GMAIL_APP_PASSWORD, // Gmail app password
    },
  });
}

export async function sendEmail(to: string, subject: string, html: string, from?: string) {
  const fromEmail = from || process.env.GMAIL_USER || 'admin@smilestarsindia.com';

  console.log('=== EMAIL SENDING DISABLED ===');
  console.log(`To: ${to}`);
  console.log(`From: ${fromEmail}`);
  console.log(`Subject: ${subject}`);
  console.log('📧 Email sending is temporarily disabled. Email content logged below:');
  console.log('--- EMAIL CONTENT ---');
  console.log(html);
  console.log('--- END EMAIL CONTENT ---');
  console.log('✅ Email logged successfully (not sent)');
  console.log('');

  // Return true to prevent errors in the application flow
  // In the future, this will actually send the email using mailTransporter
  /*
  if (mailTransporter) {
    await mailTransporter.sendMail({
      from: fromEmail,
      to,
      subject,
      html
    });
  }
  */
  return true;
}
