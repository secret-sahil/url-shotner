import { Job } from 'bullmq';
import { MailHandler } from './mail-handler.interface';
import { EmailProvider } from '../providers/email.provider';
import EmailVerificationEmail from 'emails/email-verification.email';
import { EmailVerificationJobData } from '../types/email-verification';

export class EmailVerificationMailHandler implements MailHandler {
  jobName = 'email-verification-email';

  constructor(private readonly email: EmailProvider) {}

  async handle(job: Job<EmailVerificationJobData>) {
    await this.email.send({
      to: job.data.email,
      subject: 'Email Verification ✉️',
      react: EmailVerificationEmail({
        name: job.data.name,
        verificationLink: `https://www.bytelogsolutions.com/verify-email?token=${job.data.token}`,
        toEmail: job.data.email,
      }),
    });
  }
}
