import * as moment from 'moment';
import * as _ from 'lodash';
import { ApiZohoAnalyticsData, ApiExecuteJobData } from '../analytics/types'; // Ajuste o caminho de acordo com o seu projeto

export const formatCNPJ = (cnpj: string): string => {
    return cnpj.replace(/,/g, '').replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

export const formatDate = (date: string): string => {
    return moment(date, 'DD MMM, YYYY HH:mm:ss').format('DD/MM/YYYY');
}
export const formatData = (data: ApiZohoAnalyticsData[]): ApiExecuteJobData[] => 
    data.map(el => _.mapKeys(el, (val, key) => _.camelCase(key)));