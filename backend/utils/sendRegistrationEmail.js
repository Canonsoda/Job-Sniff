import { mailTransporter } from "../config/mail.js";

export const sendRegistrationEmail = async (email, name) => {
    const mailOptions = {
    from: `"Job Sniff" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Welcome to Job Sniff!',
    html: `<h3>Hello ${name},</h3><p>Welcome aboard! You've successfully registered on Job Sniff.</p>`,
  };

  await mailTransporter.sendMail(mailOptions);
}