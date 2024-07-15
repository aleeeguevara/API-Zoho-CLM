import * as moment from 'moment';
import { ApiZohoAnalyticsData, ApiExecuteJobData } from '../analytics/types'; // Ajuste o caminho de acordo com o seu projeto

export const formatCNPJ = (cnpj: string): string => {
    return cnpj.replace(/,/g, '').replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

export const formatDate = (date: string): string => {
    return moment(date, 'DD MMM, YYYY HH:mm:ss').format('DD/MM/YYYY');
}
export const formatData = (data: ApiZohoAnalyticsData[]): ApiExecuteJobData[] => 
    data.map(item => ({
        ...item,
        Cnpj: formatCNPJ(item.CNPJ_Representante),
        DataEmissao: item.datemi ? formatDate(item.datemi) : item.datemi,
        DataNFs: item.datnfs ? formatDate(item.datnfs) : item.datnfs,
        DataNFv: item.datnfv ? formatDate(item.datnfv) : item.datnfv,
        ValorOrig: item.vlrori,
        ValorNFs: item.valornfs,
        ValorNFv: item.valornfv,
        SnFnFv: item.snfnfv,
        Representante: item.representante,
        NomeCliente: item.nomcli,
        NomeResponsavel: item.nomrep,
        NumNFv: item.numnfv,
        NumPedido: item.numped,
        Marca: item.marca,
        CodCliente: item.codcli,
        DesMoe: item.desmoe,
        DesCpg: item.descpg,
    }));