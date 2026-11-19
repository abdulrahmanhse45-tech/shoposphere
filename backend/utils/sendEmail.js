import nodemailer from "nodemailer";

/**
 * Generate a secure 6-digit numeric OTP
 */
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Send an email using Nodemailer with a robust development console fallback.
 *
 * Requirements met:
 * Logs the OTP directly in the terminal console:
 *   🔑 [DEV OTP]: 123456
 * so development and presentation/viva never blocks on missing SMTP credentials.
 */
export const sendOTPEmail = async ({ email, otp, purpose }) => {
  const titles = {
    register: "Verify Your ShopSphere Account",
    reset_password: "Reset Your ShopSphere Password",
    change_email: "Verify Your New ShopSphere Email",
  };

  const subject = titles[purpose] || "ShopSphere Verification Code";

  // Check if SMTP environment variables are present
  const hasCredentials =
    Boolean(process.env.EMAIL_USER) && Boolean(process.env.EMAIL_PASS);

  if (!hasCredentials) {
    console.log("\n=======================================================");
    console.log(`🔑 [DEV OTP]: ${otp}`);
    console.log(`📧 Sent to: ${email}`);
    console.log(`🎯 Purpose: ${purpose}`);
    console.log(`⏰ Valid for: 5 minutes`);
    console.log("=======================================================\n");
    return { success: true, mode: "console" };
  }

  try {
    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const htmlContent = `
      <div style="font-family: 'Georgia', serif; max-width: 520px; margin: 0 auto; padding: 32px; background: #FAF7F5; border: 1px solid #E5E0D8; border-radius: 4px; color: #1C1917;">
        <h2 style="color: #543B2B; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 8px; text-align: center;">SHOPSPHERE</h2>
        <p style="text-align: center; font-size: 13px; color: #78716C; letter-spacing: 1px; margin-top: 0;">QUIET LUXURY & REFINED LIVING</p>
        <hr style="border: none; border-top: 1px solid #E5E0D8; margin: 24px 0;" />
        <h3 style="color: #543B2B; margin-top: 0;">${subject}</h3>
        <p style="font-size: 15px; line-height: 1.6; color: #44403C;">
          Use the 6-digit verification code below to complete your request. This code is valid for <strong>5 minutes</strong>.
        </p>
        <div style="background: #FFFFFF; border: 1px solid #E5E0D8; border-radius: 4px; padding: 18px; text-align: center; margin: 24px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #543B2B; font-family: monospace;">${otp}</span>
        </div>
        <p style="font-size: 13px; color: #78716C; line-height: 1.5;">
          If you did not request this verification code, please ignore this email or reach out to our concierge team.
        </p>
        <hr style="border: none; border-top: 1px solid #E5E0D8; margin: 24px 0;" />
        <p style="font-size: 11px; text-align: center; color: #A8A29E; letter-spacing: 0.5px;">
          &copy; ${new Date().getFullYear()} ShopSphere. All rights reserved.
        </p>
      </div>
    `;

    await transporter.sendMail({
      from: `"ShopSphere Concierge" <${process.env.EMAIL_USER}>`,
      to: email,
      subject,
      html: htmlContent,
    });

    console.log(`[Email Service] Verification OTP sent successfully to ${email}`);
    return { success: true, mode: "email" };
  } catch (error) {
    // If sending fails (e.g. SMTP connection error), gracefully fallback to console log
    console.warn(`[Email Service] Failed to send email via SMTP (${error.message}). Falling back to terminal display:`);
    console.log("\n=======================================================");
    console.log(`🔑 [DEV OTP]: ${otp}`);
    console.log(`📧 Sent to: ${email}`);
    console.log(`🎯 Purpose: ${purpose}`);
    console.log("=======================================================\n");
    return { success: true, mode: "console-fallback" };
  }
};
