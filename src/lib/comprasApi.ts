import axios, { AxiosError } from 'axios';
import { ApiResponse, ComprasLicitacao, VwFtContrato, PncpLicitacao, PncpApiResponse } from './types';
import { ExtractedFilters } from './extractFilters';
import { format } from 'date-fns';

const BASE_URL = 'https://dadosabertos.compras.gov.br';
const CONTRATOS_API_URL = 'https://api.compras.dados.gov.br';
const PNCP_CONSULTA_API_URL = 'https://pncp.gov.br/api/consulta';

export const comprasApi = axios.create({
 baseURL: BASE_URL,
 headers: {
  'Accept': 'application/json',
 },
 timeout: 30000,
});

export const contratosApi = axios.create({
 baseURL: CONTRATOS_API_URL,
 headers: {
  'Accept': 'application/json',
 },
 timeout: 30000,
});

export const pncpApi = axios.create({
 baseURL: PNCP_CONSULTA_API_URL,
 headers: {
  'Accept': '*/*',
 },
 timeout: 30000,
});

export function handleApiError(error: unknown, defaultMessage: string): ApiResponse<never> {
 let message = defaultMessage;
 let status = 500;

 if (axios.isAxiosError(error)) {
  const axiosError = error as AxiosError<unknown>;
  status = axiosError.response?.status || 500;
  const data = axiosError.response?.data as { error?: string; message?: string } | undefined;
  const responseError = data?.error || data?.message;
  message = typeof responseError === 'string' ? responseError : axiosError.message || defaultMessage;

  console.error(`❌ ${defaultMessage} (Status: ${status})`);
  if (axiosError.response?.data) {
   console.error(`📩 Resposta da API:`, JSON.stringify(axiosError.response.data, null, 2));
  } else {
   console.error(`Rastreamento do erro Axios:`, axiosError.config?.url, axiosError.message);
  }

  if (status === 404) {
   message = `Recurso não encontrado na API. Verifique o endpoint ou parâmetros.`;
  } else if (status === 429) {
   message = `Limite de requisições excedido na API. Tente novamente mais tarde.`;
  }

 } else if (error instanceof Error) {
  message = error.message;
  console.error(`❌ ${defaultMessage} (Erro não-Axios):`, error);
 } else {
  console.error(`❌ ${defaultMessage} (Erro desconhecido):`, error);
 }

 return { success: false, error: message, status: status };
}

function getPncpModalidadeCodigo(modalidadeNome: string): number | undefined {
 const modalidadesMap: { [key: string]: number } = {
  "leilão eletrônico": 1,
  "diálogo competitivo": 2,
  "concurso": 3,
  "concorrência eletrônica": 4,
  "concorrência presencial": 5,
  "pregão eletrônico": 6,
  "pregão presencial": 7,
  "dispensa de licitação": 8,
  "inexigibilidade": 9,
  "manifestação de interesse": 10,
  "pré-qualificação": 11,
  "credenciamento": 12,
  "leilão presencial": 13,
 };
 const normalizedName = modalidadeNome.toLowerCase().replace(/á/g, 'a').replace(/õ/g, 'o').replace(/ç/g, 'c');
 return modalidadesMap[normalizedName];
}

const ALL_MODALITY_CODES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

// Helper function para adicionar um atraso entre as requisições
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function buscarLicitacoesPNCP(
 filters: ExtractedFilters,
): Promise<ApiResponse<PncpApiResponse<PncpLicitacao>>> {
 try {
  console.log(`📞 Chamando buscarLicitacoesPNCP com filtros:`, filters);

  const baseParams: Record<string, unknown> = {
   tamanhoPagina: 50, // MODIFICAÇÃO: Alterado de 500 para 50 para corrigir o erro "Tamanho de página inválido".
  };

  if (!filters.dataInicial || !filters.dataFinal) {
   const today = new Date();
   baseParams.dataInicial = format(today, 'yyyyMMdd');
   baseParams.dataFinal = format(today, 'yyyyMMdd');
   console.warn("⚠️ Data inicial ou final ausentes para buscar licitações. Usando a data de hoje como período padrão.");
  } else {
   baseParams.dataInicial = format(new Date(filters.dataInicial), 'yyyyMMdd');
   baseParams.dataFinal = format(new Date(filters.dataFinal), 'yyyyMMdd');
  }

  if (filters.estado) {
   baseParams.uf = filters.estado;
  }

  const endpoint = '/v1/contratacoes/publicacao';
  const allLicitacoes: PncpLicitacao[] = [];
  let totalCombinedRecords = 0;

  const modalidadesParaBuscar = filters.modalidade
   ? ([getPncpModalidadeCodigo(filters.modalidade)].filter(Boolean) as number[])
   : ALL_MODALITY_CODES;

  for (const modalidadeCode of modalidadesParaBuscar) {
   let currentPage = 1;
   let totalPages = 1;

   console.log(`ℹ️ Buscando licitações para modalidade código: ${modalidadeCode}`);

   while (currentPage <= totalPages) {
    const params = {
     ...baseParams,
     codigoModalidadeContratacao: modalidadeCode,
     pagina: currentPage,
    };
    try {
     const response = await pncpApi.get<PncpApiResponse<PncpLicitacao>>(endpoint, { params });
     if (response.data && Array.isArray(response.data.data)) {
      allLicitacoes.push(...response.data.data);

      if (currentPage === 1 && response.data.totalRegistros > 0) {
       totalCombinedRecords += response.data.totalRegistros;
       totalPages = response.data.totalPaginas;
       console.log(`  -> Modalidade ${modalidadeCode}: ${response.data.totalRegistros} registros encontrados em ${totalPages} páginas.`);
      } else if (currentPage === 1) {
       // Se não houver registros para esta modalidade, interrompe o loop de paginação para ela.
       break;
      }
     } else {
      console.warn(`⚠️ Resposta inesperada para modalidade ${modalidadeCode}, página ${currentPage}. Prosseguindo...`, response.data);
      break; // Sai do loop da página atual em caso de erro
     }
    } catch (err: unknown) {
     const errorResponse = handleApiError(err, `Erro ao buscar modalidade ${modalidadeCode}, página ${currentPage}`);
     console.warn(`⚠️ Erro ao buscar modalidade ${modalidadeCode}, página ${currentPage}. Prosseguindo...`, errorResponse.error);
     break; // Sai do loop da página atual em caso de erro
    }
    currentPage++;
   }
   // MODIFICAÇÃO: Adiciona um atraso entre as buscas de cada modalidade para evitar o erro 429 (Too Many Requests).
   await delay(200);
  }


  console.log(`✅ Sucesso ao buscar licitações (editais e avisos) do PNCP. Total de registros combinados: ${totalCombinedRecords}`);

  return {
   success: true,
   data: {
    data: allLicitacoes,
    totalRegistros: totalCombinedRecords,
    totalPaginas: 1,
    numeroPagina: 1,
    paginasRestantes: 0,
    empty: allLicitacoes.length === 0,
   },
   status: 200
  };

 } catch (err: unknown) {
  return handleApiError(err, 'Erro geral ao buscar licitações na API PNCP');
 }
}


export async function getDetalhesLicitacao(boletimId: number): Promise<ApiResponse<ComprasLicitacao>> {
 try {
  console.log(`📞 Chamando getDetalhesLicitacao para boletim ${boletimId}...`);
  const response = await comprasApi.get(`/boletim/${boletimId}`);
  console.log(`✅ Sucesso ao buscar detalhes do boletim ${boletimId}.`);
  const responseData = response.data as ComprasLicitacao;
  if (!responseData || typeof responseData !== 'object' || responseData === null) {
   console.error(`❌ Estrutura inesperada na resposta de /boletim/${boletimId}:`, responseData);
   return { success: false, error: `Resposta da API de detalhes do boletim ${boletimId} inválida.`, status: 500 };
  }
  return { success: true, data: responseData, status: response.status };
 } catch (err: unknown) {
  return handleApiError(err, `Erro ao buscar detalhes do boletim ${boletimId}`);
 }
}

export async function getDetalhesContrato(idContrato: string): Promise<ApiResponse<VwFtContrato>> {
 try {
  console.log(`📞 Chamando getDetalhesContrato para contrato ${idContrato}...`);
  const response = await contratosApi.get<VwFtContrato>(`/comprasContratos/doc/contrato/${idContrato}`);
  console.log(`✅ Sucesso ao buscar detalhes do contrato ${idContrato}.`);

  if (!response.data || typeof response.data !== 'object' || response.data === null) {
   console.error(`❌ Estrutura inesperada na resposta da API de contratos para ${idContrato}:`, response.data);
   return { success: false, error: `Resposta da API de detalhes do contrato ${idContrato} inválida.`, status: 500 };
  }
  return { success: true, data: response.data, status: response.status };
 } catch (err: unknown) {
  return handleApiError(err, `Erro ao buscar detalhes do contrato ${idContrato}`);
 }
}