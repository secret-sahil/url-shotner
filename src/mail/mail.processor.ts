import { Processor, WorkerHost } from '@nestjs/bullmq';
import { unlink } from 'node:fs/promises';
import { Job } from 'bullmq';
import { MailJobRouter } from './mail-job.router';
import { AwsSesEmailProvider } from './providers/aws-ses.provider';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from 'src/env.validation';
import { CertificateMailHandler } from './handlers/certificate.handler';
import { PrismaService } from 'src/prisma/prisma.service';
import { CertificateJobData } from './types/certificate';

@Processor('mail', { concurrency: 13, limiter: { max: 13, duration: 1000 } }) // Limit to 13 jobs per second to stay within AWS SES limits
export class MailProcessor extends WorkerHost {
  private router: MailJobRouter;

  private isCertificateJobData(data: unknown): data is CertificateJobData {
    if (!data || typeof data !== 'object') {
      return false;
    }

    const payload = data as Partial<CertificateJobData>;
    return (
      typeof payload.certificateId === 'string' &&
      typeof payload.certificatePdfPath === 'string'
    );
  }

  constructor(
    readonly config: ConfigService<EnvironmentVariables, true>,
    private readonly prisma: PrismaService,
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

  async process(job: Job<CertificateJobData>) {
    await this.router.route(job);

    if (job.name !== 'certificate-email') {
      return;
    }

    if (!this.isCertificateJobData(job.data)) {
      return;
    }

    await this.prisma.certificate.update({
      where: { certificateId: job.data.certificateId },
      data: { isSent: true },
    });

    try {
      await unlink(job.data.certificatePdfPath);
    } catch {
      // Ignore missing-file deletion errors; the email has already been sent.
    }
  }
}
