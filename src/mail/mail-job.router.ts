import { MailHandler } from './handlers/mail-handler.interface';
import { Job } from 'bullmq';

export class MailJobRouter {
  constructor(private readonly handlers: MailHandler[]) {}

  async route(job: Job) {
    const handler = this.handlers.find((h) => h.jobName === job.name);

    if (!handler) {
      throw new Error(`No handler found for job ${job.name}`);
    }

    await handler.handle(job);
  }
}
