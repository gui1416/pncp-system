import axios, { AxiosError } from 'axios';
import { ApiResponse, PncpLicitacao, PncpApiResponse } from './types';
import { format, parseISO, differenceInDays, subDays } from 'date-fns';

export interface PncpApiFilters {
 palavrasChave: string[];
 valorMin: number | null;
 valorMax: number | null;
 estado: string | null;
 modalidades: string[];
 dataInicial: string | null;
 dataFinal: string | null;
 blacklist: string[];
}

const PNCP_CONSULTA_API_URL = process.env.PNCP_CONSULTA_API_URL;

export const pncpApi = axios.create({
 baseURL: PNCP_CONSULTA_API_URL,
 headers: { 'Accept': '*/*' },
 timeout: 60000,
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
  "leilão eletrônico": 1, "diálogo competitivo": 2, "concurso": 3,
  "concorrência eletrônica": 4, "concorrência presencial": 5, "pregão eletrônico": 6,
  "pregão presencial": 7, "dispensa de licitação": 8, "inexigibilidade de licitação": 9,
  "manifestação de interesse": 10, "pré-qualificação": 11, "credenciamento": 12,
  "leilão presencial": 13,
 };
 const normalizedName = modalidadeNome.toLowerCase().replace(" de licitação", "").trim();
 return modalidadesMap[normalizedName];
}

const ALL_MODALITY_CODES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function buscarLicitacoesPNCP(
 filters: PncpApiFilters,
): Promise<ApiResponse<PncpApiResponse<PncpLicitacao>>> {
 try {
  console.log(`📞 Chamando buscarLicitacoesPNCP com filtros estruturados:`, filters);

  const baseParams: Record<string, unknown> = { tamanhoPagina: 50 };

  if (filters.dataInicial && filters.dataFinal) {
   let dataInicial = parseISO(filters.dataInicial);
   const dataFinal = parseISO(filters.dataFinal);
   if (differenceInDays(dataFinal, dataInicial) > 365) {
    console.warn("⚠️ O período selecionado excede 365 dias. Ajustando a data inicial.");
    dataInicial = subDays(dataFinal, 365);
   }
   baseParams.dataInicial = format(dataInicial, 'yyyyMMdd');
   baseParams.dataFinal = format(dataFinal, 'yyyyMMdd');
  } else if (filters.dataInicial) {
   baseParams.dataInicial = format(parseISO(filters.dataInicial), 'yyyyMMdd');
  } else if (filters.dataFinal) {
   baseParams.dataFinal = format(parseISO(filters.dataFinal), 'yyyyMMdd');
  }

  if (filters.estado) baseParams.uf = filters.estado;
  if (filters.valorMin) baseParams.valorMinimo = filters.valorMin;
  if (filters.valorMax) baseParams.valorMaximo = filters.valorMax;

  const endpoint = '/v1/contratacoes/publicacao';
  const allLicitacoes: PncpLicitacao[] = [];

  const modalidadesCodigos = filters.modalidades && filters.modalidades.length > 0
   ? filters.modalidades.map(getPncpModalidadeCodigo).filter((code): code is number => code !== undefined)
   : ALL_MODALITY_CODES;

  for (const modalidadeCode of modalidadesCodigos) {
   let currentPage = 1;
   let totalPages = 1;
   console.log(`ℹ️ Buscando licitações para modalidade código: ${modalidadeCode}`);

   while (currentPage <= totalPages) {
    const params = { ...baseParams, codigoModalidadeContratacao: modalidadeCode, pagina: currentPage };
    try {
     const response = await pncpApi.get<PncpApiResponse<PncpLicitacao>>(endpoint, { params });
     if (response.data && Array.isArray(response.data.data)) {
      allLicitacoes.push(...response.data.data);
      if (currentPage === 1 && response.data.totalPaginas > 0) {
       totalPages = response.data.totalPaginas;
       console.log(`  -> Modalidade ${modalidadeCode}: ${response.data.totalRegistros} registros encontrados em ${totalPages} páginas.`);
      } else if (currentPage === 1) {
       console.log(`  -> Modalidade ${modalidadeCode}: Nenhum registro encontrado.`);
       break;
      }
     } else {
      break;
     }
    } catch (err: unknown) {
     handleApiError(err, `Erro ao buscar modalidade ${modalidadeCode}, página ${currentPage}. Pulando para a próxima.`);
     break;
    }
    currentPage++;
   }
   await delay(200);
  }

  console.log(`✅ Busca na API PNCP concluída. Total de ${allLicitacoes.length} licitações brutas encontradas.`);

  const lowercasedKeywords = filters.palavrasChave.map(k => k.toLowerCase());
  const lowercasedBlacklist = filters.blacklist.map(b => b.toLowerCase());

  const finalResults = allLicitacoes.filter(licitacao => {
   const objeto = licitacao.objetoCompra?.toLowerCase() || '';
   const temKeyword = lowercasedKeywords.length === 0 || lowercasedKeywords.some(kw => objeto.includes(kw));
   const temBlacklist = lowercasedBlacklist.length > 0 && lowercasedBlacklist.some(bl => objeto.includes(bl));
   return temKeyword && !temBlacklist;
  });

  console.log(`🔍 Após filtragem por keywords e blacklist, restaram ${finalResults.length} licitações.`);

  return {
   success: true,
   data: {
    data: finalResults,
    totalRegistros: finalResults.length,
    totalPaginas: 1,
    numeroPagina: 1,
    paginasRestantes: 0,
    empty: finalResults.length === 0,
   },
   status: 200,
  };
 } catch (err: unknown) {
  return handleApiError(err, 'Erro geral ao buscar licitações na API PNCP');
 }
}