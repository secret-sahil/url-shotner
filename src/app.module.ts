import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ShortModule } from './short/short.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EnvironmentVariables, validate } from './env.validation';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    ConfigModule.forRoot({
      validate,
      isGlobal: true,
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) => ({
        connection: {
          url: config.get<string>('REDIS_DATABASE_URL'),
        },
      }),
    }),
    PrismaModule,
    ShortModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
