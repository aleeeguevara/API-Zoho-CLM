import { AnalyticsService } from './analytics/analytics.service';
import { AnalyticsModule } from './analytics/analytics.module';
import { AnalyticsController } from './analytics/analytics.controller';
import { ConfigModule } from '@nestjs/config';
import { Module } from '@nestjs/common';

@Module({
  imports: [
      ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env',
          }),
        AnalyticsModule, ],
  controllers: [
        AnalyticsController],
  providers: [
        AnalyticsService],
})
export class AppModule {}
