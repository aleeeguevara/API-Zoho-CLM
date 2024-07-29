import * as moment from 'moment';
import * as _ from 'lodash';
import { ApiZohoAnalyticsData, ApiExecuteJobData } from '../analytics/types'; // Ajuste o caminho de acordo com o seu projeto

export const formatCNPJ = (cnpj: string): string => {
    return cnpj.replace(/,/g, '').replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

export const formatDate = (date: string): string => {
    return moment(date, 'DD MMM, YYYY HH:mm:ss').format('DD/MM/YYYY');
}

export const formatData = (data: ApiZohoAnalyticsData[]): ApiExecuteJobData[] => {
    return data.map(el => {
        const formattedEl = _.mapKeys(el, (val, key) => _.camelCase(key));
        
        Object.keys(formattedEl).forEach(key => {
            if (key.toLowerCase().includes('dat')) {
                formattedEl[key] = formattedEl[key] ?? formatDate(formattedEl[key]);
            }
        });

        return formattedEl;
    });
}   