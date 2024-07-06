export interface ApiZohoAnalyticsData {
    codemp: string;
    codfil: string;
    numped: string;
    datemi: string;
    codcli: string;
    nomcli: string;
    pedcli: string;
    repfor: string;
    CNPJ_Representante: string;
    codrep: string;
    representante: string;
    codmoe: string;
    desmoe: string;
    codcpg: string;
    descpg: string;
    vlrori: string;
    marca: string;
    sitped: string;
    pedsit: string;
    codven: string;
    nomrep: string;
    snfnfs: string;
    numnfs: string;
    datnfs: string;
    valornfs: string;
    titulonfs: string;
    titulovlrnfs: string;
    titulositnfs: string;
    titulovctnfs: string;
    diasnfs: string;
    snfnfv: string;
    numnfv: string;
    datnfv: string;
    valornfv: string;
    titulonfv: string;
    titulovlrnfv: string;
    titulositnfv: string;
    titulovctnfv: string;
    diasnfv: string;
}

export interface ApiExecuteJobData {
    Cnpj?: string;
    DataEmissao?: string;
    DataNFs?: string;
    DataNFv?: string;
    ValorOri?: string;
    ValorNFs?: string;
    ValorNFv?: string;
    Label?: string;
  }
  export interface ApiData {
    [key: string]: string;
  }
  type DataInfo = {
    jobId?: string,
    jobCode?: string,
    jobStatus?: string,
    downloadUrl?: string,
    expiryTime?: string
  }

  export interface CheckingData  {
    status?: string,
    summary?: string,
    data?: DataInfo & ApiZohoAnalyticsData[]
}
