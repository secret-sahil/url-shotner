import { Job } from 'bullmq';
import { MailHandler } from './mail-handler.interface';
import { EmailProvider } from '../providers/email.provider';
import WelcomeEmail from 'emails/welcome-email';
import { WelcomeJobData } from '../types/welcome';

export class WelcomeMailHandler implements MailHandler {
  jobName = 'welcome-email';

  constructor(private readonly email: EmailProvider) {}

  async handle(job: Job<WelcomeJobData>) {
    await this.email.send({
      to: job.data.email,
      subject: 'Welcome 🎉',
      react: WelcomeEmail({ name: job.data.name, toEmail: job.data.email }),
    });
  }
}
