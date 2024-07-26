/*
https://docs.nestjs.com/controllers#controllers
*/

import { Controller, Get, HttpException, HttpStatus, Query, Post, Body } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { ApiExecuteJobData } from './types';


@Controller('analytics')
export class AnalyticsController {
    constructor(public analyticsService: AnalyticsService) {}

    @Post('execute-job')
    async executeJob(
        @Body('view')view:string,
        @Body('config')config:string
    ): Promise<ApiExecuteJobData[]> {
        try{
            return await this.analyticsService.executeJob(view, config);
        }catch(err){
            console.error(err.message);
            throw new HttpException(err.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    
    @Get('execute-job')
    async executeJobWithCriteria(
        @Query('view') view: string,
        @Query('field') field: string,
        @Query('fieldValue') fieldValue: string
    ): Promise<ApiExecuteJobData[]> {
      try {
        return await this.analyticsService.executeJobWithCriteria(view, field, fieldValue);
      } catch (err) {
        console.error(err.message);
        throw new HttpException(err.message, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }

    @Get('get-all') // The same as above, but without query parameters.
    async executeJobWithoutCriteria(
        @Query('view') view: string
    ): Promise<ApiExecuteJobData[]> {
      try {
        return await this.analyticsService.executeJobWithoutCriteria(view);
      } catch (err) {
        console.error(err.message);
        throw new HttpException(err.message, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }

    @Get('execute-job-by-view')
    async executeJobByView(
        @Query('view') view: string,
        @Query('field') field: string,
        @Query('fieldValue') fieldValue: string
    ): Promise<ApiExecuteJobData[]> {
        try {
            return await this.analyticsService.executeJobByView(view, field, fieldValue);
        } catch (err) {
            console.error(err.message);
            throw new HttpException(err.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}