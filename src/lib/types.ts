export interface OrgaoCompras {
 nomeOrgaoEntidade: string;
 nomeUnidadeOrgao: string;
 cidade: string;
 uf: string;
}

export interface DocumentoCompras {
 filename: string;
 url: string;
}

// Existing interface for ComprasLicitacao (from original `comprasApi.get(/boletim/${boletimId})`)
export interface ComprasLicitacao {
 idCompra: string;
 numeroControlePNCP: string;
 anoCompraPncp: number;
 sequencialCompraPncp: number;
 orgaoEntidadeCnpj: string;
 orgaoEntidadeRazaoSocial: string;
 unidadeOrgaoCodigoUnidade: string;
 unidadeOrgaoNomeUnidade: string;
 unidadeOrgaoUfSigla: string;
 unidadeOrgaoMunicipioNome: string;
 numeroCompra: string;
 modalidadeIdPncp: number;
 modalidadeNome: string;
 objetoCompra: string;
 situacaoCompraNomePncp: string;
 valorTotalEstimado?: number;
 valorTotalHomologado?: number;
 dataPublicacaoPncp: string;
 dataAberturaPropostaPncp?: string;
 dataEncerramentoPropostaPncp?: string;
 processo?: string;
 informacaoComplementar?: string;
}

// Existing interface for VwFtContrato (from original `contratosApi.get(/comprasContratos/doc/contrato/${idContrato})`)
export interface VwFtContrato {
 idCompra: string;
 identificador: string;
 numero_processo: string;
 uasg: number;
 modalidade: number;
 nome_modalidade: string;
 numero_aviso: number;
 situacao_aviso: string;
 tipo_pregao: string | null;
 tipo_recurso: string | null;
 nome_responsavel: string | null;
 funcao_responsavel: string | null;
 numero_itens: number;
 valor_estimado_total: number;
 valor_homologado_total: number;
 informacoes_gerais: string | null;
 objeto: string;
 endereco_entrega_edital: string | null;
 codigo_municipio_uasg: number | null;
 data_abertura_proposta: string;
 data_entrega_edital: string;
 data_entrega_proposta: string;
 data_publicacao: string;
 dt_alteracao: string;
 pertence14133: boolean;
 codigoOrgao?: string;
 nomeOrgao?: string;
 codigoUnidadeGestora?: string;
 nomeUnidadeGestora?: string;
 codigoUnidadeGestoraOrigemContrato?: string;
 nomeUnidadeGestoraOrigemContrato?: string;
 receitaDespesa?: string;
 numeroContrato?: string;
 codigoUnidadeRealizadoraCompra?: string;
 nomeUnidadeRealizadoraCompra?: string;
 numeroCompra?: string;
 codigoModalidadeCompra?: string;
 codigoTipo?: string;
 nomeTipo?: string;
 codigoCategoria?: string;
 nomeCategoria?: string;
 codigoSubcategoria?: string;
 nomeSubcategoria?: string;
 niFornecedor?: string;
 nomeRazaoSocialFornecedor?: string;
 processo?: string;
 dataVigenciaInicial?: string;
 dataVigenciaFinal?: string;
 valorGlobal?: number;
 numeroParcelas?: number;
 valorParcela?: number;
 valorAcumulado?: number;
 totalDespesasAcessorias?: number;
 dataHoraInclusao?: string;
 numeroControlePncpContrato?: string;
 dataHoraExclusao?: string;
 contratoExcluido?: boolean;
 unidadesRequisitantes?: string;
}

<<<<<<< HEAD
=======
// Existing Interface for contracts from PNCP CONSULTAS API (/v1/contratos)
// This will NOT be used for the new search, but kept for clarity if needed elsewhere.
>>>>>>> 4839f98f8bf990f823d4ab9615de04834fab7595
export interface PncpContrato {
 numeroControlePNCP: string;
 numeroControlePNCPCompra: string;
 numeroContratoEmpenho: string;
 anoContrato: number;
 sequencialContrato: number;
 processo: string;
 tipoContrato: {
  Id: number;
  Nome: string;
 };
 categoriaProcesso: {
  Id: number;
  Nome: string;
 };
 receita: boolean;
 objetoContrato: string;
 informacaoComplementar: string;
 orgaoEntidade: {
  cnpj: string;
  razaoSocial: string;
  poderId: string;
  esferaId: string;
 };
 unidadeOrgao: {
  codigoUnidade: string;
  nomeUnidade: string;
  municipioId: number;
  municipioNome: string;
  ufSigla: string;
  ufNome: string;
 };
 orgaoSubRogado?: {
  cnpj: string;
  razaoSocial: string;
  poderId: string;
  esferaId: string;
 };
 unidadeSubRogada?: {
  codigoUnidade: string;
  nomeUnidade: string;
  municipioId: number;
  municipioNome: string;
  ufSigla: string;
  ufNome: string;
 };
 tipoPessoa: string;
 niFornecedor: string;
 nomeRazaoSocialFornecedor: string;
 tipoPessoaSubContratada?: string;
 niFornecedorSubContratado?: string;
 nomeFornecedorSubContratado?: string;
 valorInicial: number;
 numeroParcelas: number;
 valorParcela: number;
 valorGlobal: number;
 valorAcumulado: number;
 dataAssinatura: string;
 dataVigenciaInicio: string;
 dataVigenciaFim: string;
 numeroRetificacao: number;
 usuarioNome: string;
 dataPublicacaoPncp: string;
 dataAtualizacao: string;
 identificadorCipi?: string;
 urlCipi?: string;
}

<<<<<<< HEAD
=======

// NEW INTERFACE for PNCP CONSULTAS API (/v1/contratacoes/publicacao or /v1/contratacoes/proposta)
>>>>>>> 4839f98f8bf990f823d4ab9615de04834fab7595
export interface PncpLicitacao {
 numeroControlePNCP: string;
 numeroCompra: string;
 anoCompra: number;
<<<<<<< HEAD
 processo?: string;
=======
 processo?: string; // It's optional based on the other file.
>>>>>>> 4839f98f8bf990f823d4ab9615de04834fab7595
 tipoInstrumentoConvocatorioId: number;
 tipoInstrumentoConvocatorioNome: string;
 modalidadeId: number;
 modalidadeNome: string;
 modoDisputaId: number;
 modoDisputaNome: string;
 situacaoCompraId: number;
 situacaoCompraNome: string;
 objetoCompra: string;
<<<<<<< HEAD
 informacaoComplementar?: string;
 srp: boolean;
 amparoLegal?: {
=======
 informacaoComplementar?: string; // Optional
 srp: boolean;
 amparoLegal?: { // This is a complex object in the manual, simplifying to optional.
>>>>>>> 4839f98f8bf990f823d4ab9615de04834fab7595
  codigo: number;
  nome: string;
  descricao: string;
 };
<<<<<<< HEAD
 valorTotalEstimado?: number;
 valorTotalHomologado?: number;
 dataAberturaProposta?: string;
 dataEncerramentoProposta?: string;
=======
 valorTotalEstimado?: number; // Optional
 valorTotalHomologado?: number; // Optional
 dataAberturaProposta?: string; // Optional
 dataEncerramentoProposta?: string; // Optional
>>>>>>> 4839f98f8bf990f823d4ab9615de04834fab7595
 dataPublicacaoPncp: string;
 dataInclusao: string;
 dataAtualizacao: string;
 sequencialCompra: number;
 orgaoEntidade: {
  cnpj: string;
  razaoSocial: string;
  poderId: string;
  esferaId: string;
 };
 unidadeOrgao: {
  codigoUnidade: string;
  nomeUnidade: string;
<<<<<<< HEAD
  codigoIbge: number;
=======
  codigoIbge: number; // Changed from municipioId in PncpContrato to codigoIbge as per manual
>>>>>>> 4839f98f8bf990f823d4ab9615de04834fab7595
  municipioNome: string;
  ufSigla: string;
  ufNome: string;
 };
<<<<<<< HEAD
 orgaoSubRogado?: {
=======
 orgaoSubRogado?: { // Optional
>>>>>>> 4839f98f8bf990f823d4ab9615de04834fab7595
  cnpj: string;
  razaoSocial: string;
  poderId: string;
  esferaId: string;
 };
<<<<<<< HEAD
 unidadeSubRogada?: {
  codigoUnidade: string;
  nomeUnidade: string;
  codigoIbge: number;
=======
 unidadeSubRogada?: { // Optional
  codigoUnidade: string;
  nomeUnidade: string;
  codigoIbge: number; // Changed from municipioId
>>>>>>> 4839f98f8bf990f823d4ab9615de04834fab7595
  municipioNome: string;
  ufSigla: string;
  ufNome: string;
 };
<<<<<<< HEAD
 usuarioNome?: string;
 linkSistemaOrigem?: string;
 justificativaPresencial?: string;
=======
 usuarioNome?: string; // Optional
 linkSistemaOrigem?: string; // Optional
 justificativaPresencial?: string; // Optional
>>>>>>> 4839f98f8bf990f823d4ab9615de04834fab7595
}


export interface ApiResponse<T = unknown> {
 success: boolean;
 data?: T;
 error?: string;
 status?: number;
}

export interface ComprasApiResponse {
 resultado: ComprasLicitacao[];
 totalRegistros: number;
 totalPaginas: number;
 paginasRestantes: number;
}

// Generic API response structure for PNCP Consultas
export interface PncpApiResponse<T> {
 data: T[]; // The data of the found records
 totalRegistros: number;
 totalPaginas: number;
 numeroPagina: number;
 paginasRestantes: number;
 empty: boolean;
}