import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { ApiExecuteJobData, CheckingData } from './types';
import { formatData } from '../helpers/formatting.helper';

@Injectable()
export class AnalyticsService {
    private clientId: string;
    private clientSecret: string;
    private refreshToken: string;
    
    private viewMap = {
        Extranet_Potenciais: {
            workspaceId: '1121931000000364322',
            viewId: '1121931000019729008'
        },
        Extranet_SalesOrders: {
            workspaceId: '1121931000000364322',
            viewId: '1121931000019729373'
        },
        Pedidos_Portal: {
            workspaceId: '1121931000006683001',
            viewId: '1121931000012638002'
        }
    };

    constructor(private configService: ConfigService) {
        this.clientId = this.configService.get<string>('CLIENT_ID');
        this.clientSecret = this.configService.get<string>('CLIENT_SECRET');
        this.refreshToken = this.configService.get<string>('REFRESH_TOKEN');
    }

    private getViewIds(view: string) {
        const viewConfig = this.viewMap[view];
        if (!viewConfig) {
            throw new HttpException('Invalid view name', HttpStatus.BAD_REQUEST);
        }
        return viewConfig;
    }

    async refreshAccessToken(): Promise<string> {
        const url = `https://accounts.zoho.com/oauth/v2/token?refresh_token=${this.refreshToken}&client_id=${this.clientId}&client_secret=${this.clientSecret}&grant_type=refresh_token`;
        try {
            const response = await axios.post(url);
            return response.data.access_token;
        } catch (error) {
            console.error(error.message);
            throw new HttpException('Failed to get access token', HttpStatus.UNAUTHORIZED);
        }
    }

    private async authenticateRequest(config, accessToken): Promise<CheckingData> {
        config.headers = {
            ...config.headers,
            Authorization: `Zoho-oauthtoken ${accessToken}`,
            'ZANALYTICS-ORGID': '67615980'
        };

        try {
            const response = await axios(config);
            return response.data;
        } catch (error) {
            console.error(error.message);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async createExportJob(view: string, config: string, accessToken: string): Promise<string> {
        const { workspaceId, viewId } = this.getViewIds(view);
        const url = `https://analyticsapi.zoho.com/restapi/v2/bulk/workspaces/${workspaceId}/views/${viewId}/data?CONFIG=${encodeURIComponent(config)}`;

        const response = await this.authenticateRequest({
            url,
            method: 'GET'
        }, accessToken);
        return response.data.jobId;
    }

    async getDownloadJobUrl(view: string, jobId: string, accessToken: string): Promise<CheckingData> {
        const { workspaceId } = this.getViewIds(view);
        const url = `https://analyticsapi.zoho.com/restapi/v2/bulk/workspaces/${workspaceId}/exportjobs/${jobId}`;
        return await this.authenticateRequest({
            url,
            method: 'GET'
        }, accessToken);
    }

    async exportJobData(downloadUrl: string, accessToken: string): Promise<ApiExecuteJobData[]> {
        const response = await this.authenticateRequest({
            url: downloadUrl,
            method: 'GET'
        }, accessToken);

        return formatData(response.data);
    }

    async waitForJobCompleted(view: string, jobId: string, accessToken: string): Promise<string> {
        let jobStatus;
        let downloadUrl;
        do {
            const response = await this.getDownloadJobUrl(view, jobId, accessToken);            
            jobStatus = response.data.jobStatus;

            if (jobStatus === 'JOB COMPLETED') {
                downloadUrl = response.data.downloadUrl;
            } else if (jobStatus.includes('FAILED')) {
                throw new HttpException('Export job failed', HttpStatus.INTERNAL_SERVER_ERROR);
            } else {
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        } while (jobStatus !== 'JOB COMPLETED');
        return downloadUrl;
    }

    async executeJob(view: string, config: string): Promise<ApiExecuteJobData[]> {
        const accessToken = await this.refreshAccessToken();
        const jobId = await this.createExportJob(view, config, accessToken);
        const downloadUrl = await this.waitForJobCompleted(view, jobId, accessToken);
        return await this.exportJobData(downloadUrl, accessToken);
    }

    async executeJobWithCriteria(view: string, field: string, fieldValue: string): Promise<ApiExecuteJobData[]> {
        const criteria = `\"${field}\"=${fieldValue}`;
        const config = JSON.stringify({ responseFormat: 'json', criteria });
        return await this.executeJob(view, config);
    }

    async executeJobWithoutCriteria(view: string): Promise<ApiExecuteJobData[]> {
        const config = JSON.stringify({ responseFormat: 'json' });
        return await this.executeJob(view, config);
    }

    async executeJobByView(view: string, field: string, fieldValue: string): Promise<ApiExecuteJobData[]> {
        const criteria = `\"${view}\".\"${field}\"='${fieldValue}'`;
        const config = JSON.stringify({ responseFormat: 'json', criteria });
        return await this.executeJob(view, config);
    }
}