import { Resend } from 'resend';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

let _resend: Resend | null = null;
function getResend() {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY || 'dummy');
  }
  return _resend;
}

function getAppUrl() {
  return process.env.NEXTAUTH_URL || 'http://localhost:3000';
}

function getFromEmail() {
  return process.env.EMAIL_FROM || 'RideReceipt <onboarding@resend.dev>';
}

export async function sendVerificationEmail(userId: string, email: string) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await prisma.emailVerificationToken.create({
    data: { token, userId, email, expiresAt },
  });

  const verifyUrl = `${getAppUrl()}/api/auth/verify-email?token=${token}`;

  await getResend().emails.send({
    from: getFromEmail(),
    to: email,
    subject: 'Verify your RideReceipt account',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Welcome to RideReceipt</h2>
        <p>Click the button below to verify your email address:</p>
        <a href="${verifyUrl}" style="display: inline-block; background: #171717; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 16px 0;">
          Verify Email
        </a>
        <p style="color: #666; font-size: 14px;">This link expires in 24 hours.</p>
        <p style="color: #999; font-size: 12px;">If you didn't create this account, you can ignore this email.</p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(userId: string, email: string) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.passwordResetToken.create({
    data: { token, userId, expiresAt },
  });

  const resetUrl = `${getAppUrl()}/reset-password?token=${token}`;

  await getResend().emails.send({
    from: getFromEmail(),
    to: email,
    subject: 'Reset your RideReceipt password',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Password Reset</h2>
        <p>Click the button below to reset your password:</p>
        <a href="${resetUrl}" style="display: inline-block; background: #171717; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 16px 0;">
          Reset Password
        </a>
        <p style="color: #666; font-size: 14px;">This link expires in 1 hour.</p>
        <p style="color: #999; font-size: 12px;">If you didn't request this, you can ignore this email.</p>
      </div>
    `,
  });
}
