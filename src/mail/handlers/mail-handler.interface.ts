import { Job } from 'bullmq';

export interface MailHandler {
  jobName: string;
  handle(job: Job): Promise<void>;
}
