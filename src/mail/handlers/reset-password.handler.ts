import { Job } from 'bullmq';
import { MailHandler } from './mail-handler.interface';
import { EmailProvider } from '../providers/email.provider';
import ResetPasswordEmail from 'emails/reset-password.email';
import { ResetPasswordJobData } from '../types/reset-password';

export class ResetPasswordMailHandler implements MailHandler {
  jobName = 'reset-password-email';

  constructor(private readonly email: EmailProvider) {}

  async handle(job: Job<ResetPasswordJobData>) {
    await this.email.send({
      to: job.data.email,
      subject: 'Reset Password 🔒',
      react: ResetPasswordEmail({
        name: job.data.name,
        resetLink: `https://www.bytelogsolutions.com/reset-password?token=${job.data.token}`,
        toEmail: job.data.email,
      }),
    });
  }
}
