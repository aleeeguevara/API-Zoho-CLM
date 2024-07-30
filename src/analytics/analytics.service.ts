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
    private accessToken: string;
    private accessTokenExpiry: number; // Timestamp when the access token expires

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

    private async refreshAccessToken(): Promise<void> {
        const url = `https://accounts.zoho.com/oauth/v2/token`;
        const params = new URLSearchParams();
        params.append('refresh_token', this.refreshToken);
        params.append('client_id', this.clientId);
        params.append('client_secret', this.clientSecret);
        params.append('grant_type', 'refresh_token');

        try {
            const response = await axios.post(url, params);
            this.accessToken = response.data.access_token;
            this.accessTokenExpiry = Date.now() + (response.data.expires_in * 1000); // Convert seconds to milliseconds
            console.log('Access token refreshed successfully');
        } catch (error) {
            console.error('Error refreshing access token:', error.response?.data || error.message);
            throw new HttpException('Failed to get access token', HttpStatus.UNAUTHORIZED);
        }
    }

    private async ensureToken(): Promise<void> {
        if (!this.accessToken || Date.now() >= this.accessTokenExpiry) {
            await this.refreshAccessToken();
        }
    }

    private async authenticateRequest(config): Promise<CheckingData> {
        await this.ensureToken();

        config.headers = {
            ...config.headers,
            Authorization: `Zoho-oauthtoken ${this.accessToken}`,
            'ZANALYTICS-ORGID': '67615980'
        };

        try {
            const response = await axios(config);
            return response.data;
        } catch (error) {
            if (error.response.status === 401) {
                // Token might be expired, try to refresh it and retry
                await this.refreshAccessToken();
                config.headers.Authorization = `Zoho-oauthtoken ${this.accessToken}`;
                try {
                    const retryResponse = await axios(config);
                    return retryResponse.data;
                } catch (retryError) {
                    console.error('Error after retrying request:', retryError.response?.data || retryError.message);
                    throw new HttpException('Failed to authenticate request after retry', HttpStatus.INTERNAL_SERVER_ERROR);
                }
            } else {
                console.error('Error in request:', error.response?.data || error.message);
                throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
            }
        }
    }

    private async createExportJob(view: string, config: string): Promise<string> {
        const { workspaceId, viewId } = this.getViewIds(view);
        const url = `https://analyticsapi.zoho.com/restapi/v2/bulk/workspaces/${workspaceId}/views/${viewId}/data?CONFIG=${encodeURIComponent(config)}`;

        const response = await this.authenticateRequest({
            url,
            method: 'GET'
        });
        return response.data.jobId;
    }

    private async getDownloadJobUrl(view: string, jobId: string): Promise<CheckingData> {
        const { workspaceId } = this.getViewIds(view);
        const url = `https://analyticsapi.zoho.com/restapi/v2/bulk/workspaces/${workspaceId}/exportjobs/${jobId}`;
        return await this.authenticateRequest({
            url,
            method: 'GET'
        });
    }

    private async exportJobData(downloadUrl: string): Promise<ApiExecuteJobData[]> {
        const response = await this.authenticateRequest({
            url: downloadUrl,
            method: 'GET'
        });

        return formatData(response.data);
    }

    private async waitForJobCompleted(view: string, jobId: string): Promise<string> {
        let jobStatus;
        let downloadUrl;
        do {
            const response = await this.getDownloadJobUrl(view, jobId);
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

    public async executeJob(view: string, config: string): Promise<ApiExecuteJobData[]> {
        await this.ensureToken(); // Ensure token is valid before making the request
        const jobId = await this.createExportJob(view, config);
        const downloadUrl = await this.waitForJobCompleted(view, jobId);
        return await this.exportJobData(downloadUrl);
    }

    public async executeJobWithCriteria(view: string, field: string, fieldValue: string): Promise<ApiExecuteJobData[]> {
        const criteria = `\"${field}\"=${fieldValue}`;
        const config = JSON.stringify({ responseFormat: 'json', criteria });
        return await this.executeJob(view, config);
    }

    public async executeJobWithoutCriteria(view: string): Promise<ApiExecuteJobData[]> {
        const config = JSON.stringify({ responseFormat: 'json' });
        return await this.executeJob(view, config);
    }

    public async executeJobByView(view: string, field: string, fieldValue: string): Promise<ApiExecuteJobData[]> {
        const criteria = `\"${view}\".\"${field}\"='${fieldValue}'`;
        const config = JSON.stringify({ responseFormat: 'json', criteria });
        return await this.executeJob(view, config);
    }
}