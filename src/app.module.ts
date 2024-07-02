import { AnalyticsService } from './analytics/analytics.service';
import { AnalyticsModule } from './analytics/analytics.module';
import { AnalyticsController } from './analytics/analytics.controller';
import { Module } from '@nestjs/common';

@Module({
  imports: [
        AnalyticsModule, ],
  controllers: [
        AnalyticsController],
  providers: [
        AnalyticsService],
})
export class AppModule {}
