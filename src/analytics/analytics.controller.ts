/*
https://docs.nestjs.com/controllers#controllers
*/

import { Body, Controller, Get, HttpException, HttpStatus, Post } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';


@Controller('analytics')
export class AnalyticsController {
    constructor(public analyticsService: AnalyticsService){}
    
    @Post('execute-job')
    async executeJob(
        @Body('workspaceId')workspaceId:string,
        @Body('viewId')viewId:string,
        @Body('config')config:string
    ): Promise<string> {
        try{
            return await this.analyticsService.executeJob(workspaceId, viewId, config)
        }catch(err){
            console.error(err.message);
            throw new HttpException(err.message, HttpStatus.INTERNAL_SERVER_ERROR);
        } 
    }
}
