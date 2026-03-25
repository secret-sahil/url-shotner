import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';
import { MailProcessor } from './mail.processor';

@Module({
  imports: [
    BullModule.registerQueueAsync({
      name: 'mail',
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        defaultJobOptions: {
          attempts: config.get<number>('MAIL_JOB_ATTEMPTS', 5),
          backoff: {
            type: 'exponential',
            delay: config.get<number>('MAIL_JOB_BACKOFF', 3000),
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      }),
    }),
  ],
  providers: [MailService, MailProcessor],
  exports: [MailService],
})
export class MailModule {}
