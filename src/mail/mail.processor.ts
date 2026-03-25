import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { MailJobRouter } from './mail-job.router';
import { AwsSesEmailProvider } from './providers/aws-ses.provider';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from 'src/env.validation';
import { CertificateMailHandler } from './handlers/certificate.handler';

@Processor('mail', { limiter: { max: 13, duration: 1000 } }) // Limit to 13 jobs per second to stay within AWS SES limits
export class MailProcessor extends WorkerHost {
  private router: MailJobRouter;

  constructor(
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {
    super();

    const emailProvider = new AwsSesEmailProvider({
      emailFrom: config.get<string>('EMAIL_FROM'),
      awsRegion: config.get<string>('AWS_SES_REGION'),
      awsAccessKeyId: config.get<string>('AWS_ACCESS_KEY'),
      awsSecretAccessKey: config.get<string>('AWS_SECRET_ACCESS_KEY'),
    });

    this.router = new MailJobRouter([
      new CertificateMailHandler(emailProvider),
    ]);
  }

  async process(job: Job) {
    await this.router.route(job);
  }
}
