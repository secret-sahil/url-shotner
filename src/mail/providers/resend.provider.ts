import { Resend } from 'resend';
import { EmailProvider } from './email.provider';

export class ResendEmailProvider implements EmailProvider {
  private resend: Resend;

  constructor(
    private readonly config: { resendApiKey: string; emailFrom: string },
  ) {
    this.resend = new Resend(config.resendApiKey);
  }

  async send({
    to,
    subject,
    react,
  }: {
    to: string;
    subject: string;
    react: React.ReactNode;
  }) {
    await this.resend.emails.send({
      from: this.config.emailFrom,
      to,
      subject,
      react,
    });
  }
}
