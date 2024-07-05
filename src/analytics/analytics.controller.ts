/*
https://docs.nestjs.com/controllers#controllers
*/

import { Body, Controller, Get, HttpException, HttpStatus, Post, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';


@Controller('analytics')
export class AnalyticsController {
    constructor(public analyticsService: AnalyticsService){}
    
    @Post('execute-job')
    async executeJob(
        @Body('config')config:string
    ): Promise<string> {
        try{
            return await this.analyticsService.executeJob(config)
        }catch(err){
            console.error(err.message);
            throw new HttpException(err.message, HttpStatus.INTERNAL_SERVER_ERROR);
        } 
    }
    @Get('execute-job')
    async executeJobWithCriteria(
      @Query('field') field: string,
      @Query('fieldValue') fieldValue: string,
    ): Promise<any> {
      try {
        return await this.analyticsService.executeJobWithCriteria(field, fieldValue);
      } catch (err) {
        console.error(err.message);
        throw new HttpException(err.message, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
}
