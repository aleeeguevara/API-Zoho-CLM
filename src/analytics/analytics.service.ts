/*
https://docs.nestjs.com/providers#services
*/

import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { ApiExecuteJobData, ApiZohoAnalyticsData, CheckingData } from './types';
import { formatData } from '../helpers/formatting.helper';


@Injectable()
export class AnalyticsService {
    private clientId: string;
    private clientSecret: string;
    private refreshToken: string;
    private workspaceId: string;
    private viewId: string;
    
    constructor(private configService: ConfigService) {
        this.clientId = this.configService.get<string>('CLIENT_ID');
        this.clientSecret = this.configService.get<string>('CLIENT_SECRET');
        this.refreshToken = this.configService.get<string>('REFRESH_TOKEN');
        this.workspaceId = this.configService.get<string>('WORKSPACE_ID');
        this.viewId = this.configService.get<string>('VIEW_ID');
    }
    async refreshAccessToken(): Promise<string> {
        const url = `https://accounts.zoho.com/oauth/v2/token?refresh_token=${this.refreshToken}&client_id=${this.clientId}&client_secret=${this.clientSecret}&grant_type=refresh_token`
        try{
            const response = await axios.post(url)
            return response.data.access_token;
        }catch(error){
            console.error(error.message);
            throw new HttpException('Failed to get access token', HttpStatus.UNAUTHORIZED);
        }
    }
    private async authenticateRequest(config, accessToken): Promise<CheckingData> {
        config.headers= {
            ...config.headers,
            Authorization: `Zoho-oauthtoken ${accessToken}`,
            'ZANALYTICS-ORGID': '67615980'
        }

        try{
            const response = await axios(config)
            return response.data
        }catch(error){
            console.error(error.message);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async createExportJob(config, accessToken): Promise<string> {
        const url =`https://analyticsapi.zoho.com/restapi/v2/bulk/workspaces/${this.workspaceId}/views/${this.viewId}/data?CONFIG=${encodeURIComponent(config)}`;

        const response = await this.authenticateRequest({
            url,
            method: 'GET'
        }, accessToken)
        return response.data.jobId
    }
    async getDownloadJobUrl(jobId, accessToken):Promise<CheckingData>{
        const url = `https://analyticsapi.zoho.com/restapi/v2/bulk/workspaces/${this.workspaceId    }/exportjobs/${jobId}`;
        return await this.authenticateRequest({
            url,
            method: 'GET'
        }, accessToken)
    }

    async exportJobData(downloadUrl, accessToken):Promise<ApiExecuteJobData[]>{
        const response = await this.authenticateRequest({
            url:downloadUrl,
            method: 'GET'
        }, accessToken)
        
        return formatData(response.data)
    }

    async waitForJobCompleted(jobId: string, accessToken: string): Promise<string> {
        let jobStatus;
        let downloadUrl;
        do {
            const response = await this.getDownloadJobUrl(jobId, accessToken);            
            jobStatus = response.data.jobStatus;

            if (jobStatus === 'JOB COMPLETED') {
                downloadUrl = response.data.downloadUrl
            }else if (jobStatus.includes('FAILED')){
                throw new HttpException('Export job failed', HttpStatus.INTERNAL_SERVER_ERROR)
            }else{
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }
        while (jobStatus !== 'JOB COMPLETED');
        return downloadUrl;
    }

    async executeJob(config): Promise<ApiExecuteJobData[]>{
        const accessToken = await this.refreshAccessToken();
        const jobId = await this.createExportJob(config, accessToken);
        const downloadUrl = await this.waitForJobCompleted(jobId, accessToken);
        return await this.exportJobData(downloadUrl, accessToken);
    }

    async executeJobWithCriteria(field: string, fieldValue: string): Promise<ApiExecuteJobData[]> {
        const criteria = `\"${field}\"=${fieldValue}`;
        const config = JSON.stringify({ responseFormat: 'json', criteria });
        const accessToken = await this.refreshAccessToken();
        const jobId = await this.createExportJob(config, accessToken);
        const downloadUrl = await this.waitForJobCompleted(jobId, accessToken);
        return await this.exportJobData(downloadUrl, accessToken);
      }
    async executeJobWithoutCriteria():Promise<ApiExecuteJobData[]> {
        const config = JSON.stringify({ responseFormat: 'json' });
        const accessToken = await this.refreshAccessToken();
        const jobId = await this.createExportJob(config, accessToken);
        const downloadUrl = await this.waitForJobCompleted(jobId, accessToken);
        return await this.exportJobData(downloadUrl, accessToken);
    }
}
