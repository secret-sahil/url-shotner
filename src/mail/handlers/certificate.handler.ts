import { access } from 'node:fs/promises';
import { Job } from 'bullmq';
import { MailHandler } from './mail-handler.interface';
import { EmailProvider } from '../providers/email.provider';
import { CertificateJobData } from '../types/certificate';
import CertificateEmail from 'emails/certificate-email';

export class CertificateMailHandler implements MailHandler {
  jobName = 'certificate-email';

  constructor(private readonly email: EmailProvider) {}

  async handle(job: Job<CertificateJobData>) {
    if (job.data.certificatePdfPath) {
      await access(job.data.certificatePdfPath);
    }

    await this.email.send({
      to: job.data.email,
      subject: 'Your Certificate 📄',
      react: CertificateEmail({
        name: job.data.name,
        toEmail: job.data.email,
        certificateDownloadUrl: job.data.certificateDownloadUrl,
      }),
      attachments: job.data.certificatePdfPath
        ? [
            {
              filename: 'certificate.pdf',
              path: job.data.certificatePdfPath,
              contentType: 'application/pdf',
            },
          ]
        : undefined,
    });
  }
}
