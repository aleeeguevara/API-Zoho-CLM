/*
https://docs.nestjs.com/providers#services
*/

import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as moment from 'moment';
import { ApiZohoAnalyticsData } from './types';

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
            console.log('access token: ',response.data.access_token)
            return response.data.access_token;
        }catch(error){
            console.error(error.message);
            throw new HttpException('Failed to get access token', HttpStatus.UNAUTHORIZED);
        }
    }
    private async authenticateRequest(config, accessToken): Promise<any> {
        config.headers= {
            ...config.headers,
            Authorization: `Zoho-oauthtoken ${accessToken}`,
            'ZANALYTICS-ORGID': '67615980'
        }

        try{
            const response = await axios(config)
            console.log('authentication ',response.data)
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
        console.log('job ID ',response.data.jobId)
        return response.data.jobId
    }
    async getDownloadJobUrl(jobId, accessToken):Promise<any>{
        const url = `https://analyticsapi.zoho.com/restapi/v2/bulk/workspaces/${this.workspaceId    }/exportjobs/${jobId}`;
        return await this.authenticateRequest({
            url,
            method: 'GET'
        }, accessToken)
    }

    async exportJobData(downloadUrl, accessToken):Promise<any>{
        const response = await this.authenticateRequest({
            url:downloadUrl,
            method: 'GET'
        }, accessToken)
        console.log('export job data final:',response)
        
        return response.data
    }

    async waitForJobCompleted(jobId: string, accessToken: string): Promise<string> {
        let jobStatus;
        let downloadUrl;
        do {
            const response = await this.getDownloadJobUrl(jobId, accessToken);
            console.log('no wait for completed :', response)
            
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

    async executeJob(config): Promise<any>{
        const accessToken = await this.refreshAccessToken();
        const jobId = await this.createExportJob(config, accessToken);
        const downloadUrl = await this.waitForJobCompleted(jobId, accessToken);
        console.log('download URL :',downloadUrl)
        return await this.exportJobData(downloadUrl, accessToken);
    }
    private formatCNPJ(cnpj: string): string {
        return cnpj.replace(/,/g, '').replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
    }
    
    private formatDate(date: string): string {
        return moment(date, 'DD MMM, YYYY HH:mm:ss').format('DD/MM/YYYY');
    }

    private formatNumber(number: string): string {
        return number.replace(/\./g, '').replace(/,/g, '.');
    }
    private formatData(data: any): any {
        return data.map(item => ({
            Cnpj: this.formatCNPJ(item.CNPJ_Representante),
            DataEmissao: this.formatDate(item.datemi),
            DataNFs: item.datnfs ? this.formatDate(item.datnfs) : item.datnfs,
            DataNFv: item.datnfv ? this.formatDate(item.datnfv) : item.datnfv,
            ValorOrig: this.formatNumber(item.vlrori),
            ValorNFs: item.valornfs ? this.formatNumber(item.valornfs) : item.valornfs,
            ValorNFv: item.valornfv ? this.formatNumber(item.valornfv) : item.valornfv,
            SnFnFv: item.snfnfv ? this.formatNumber(item.snfnfv) : item.snfnfv,
            Representante: item.representante,
            NomeCliente: item.nomcli,
            NomeResponsavel: item.nomrep,
            NumNFv: item.numnfv ? this.formatNumber(item.numnfv) : item.numnfv,
            Marca: item.marca,
            CodCliente: item.codcli,
            DesMoe: item.desmoe,
            DesCpg: item.descpg,
        }));
    }
    async executeJobWithCriteria(field: string, fieldValue: string): Promise<ApiZohoAnalyticsData> {
        const criteria = `\"${field}\"=${fieldValue}`;
        const config = JSON.stringify({ responseFormat: 'json', criteria });
        const accessToken = await this.refreshAccessToken();
        const jobId = await this.createExportJob(config, accessToken);
        const downloadUrl = await this.waitForJobCompleted(jobId, accessToken);
        return await this.exportJobData(downloadUrl, accessToken);
      }
}
