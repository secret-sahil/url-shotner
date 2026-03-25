import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { MailJobRouter } from './mail-job.router';
import { WelcomeMailHandler } from './handlers/welcome.handler';
import { ResendEmailProvider } from './providers/resend.provider';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from 'src/env.validation';
import { ResetPasswordMailHandler } from './handlers/reset-password.handler';
import { EmailVerificationMailHandler } from './handlers/email-verification.handler';

@Processor('mail', { concurrency: 5 })
export class MailProcessor extends WorkerHost {
  private router: MailJobRouter;

  constructor(
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {
    super();

    const emailProvider = new ResendEmailProvider({
      emailFrom: config.get<string>('EMAIL_FROM'),
      resendApiKey: config.get<string>('RESEND_API_KEY'),
    });

    this.router = new MailJobRouter([
      new WelcomeMailHandler(emailProvider),
      new ResetPasswordMailHandler(emailProvider),
      new EmailVerificationMailHandler(emailProvider),
    ]);
  }

  async process(job: Job) {
    await this.router.route(job);
  }
}
