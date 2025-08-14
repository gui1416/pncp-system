import { GoogleGenerativeAI, GoogleGenerativeAIError, GenerativeModel, GenerateContentResult } from '@google/generative-ai';
import { format } from 'date-fns';

if (!process.env.GOOGLE_API_KEY) {
  console.error("❌ FATAL: GEMINI_API_KEY não está definida nas variáveis de ambiente.");
  throw new Error('GEMINI_API_KEY não está definida nas variáveis de ambiente');
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

export interface ExtractedFilters {
  palavrasChave: string[];
  sinonimos: string[][];
  valorMin: number | null;
  valorMax: number | null;
  estado: string | null;
  modalidade: string | null;
  dataInicial: string | null;
  dataFinal: string | null;
  blacklist: string[];
  smartBlacklist: string[];
}

// ATUALIZAÇÃO: A função agora usa os tipos corretos do SDK do Google.
async function generateContentWithRetry(model: GenerativeModel, prompt: string, maxRetries = 3): Promise<GenerateContentResult> {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      const result = await model.generateContent(prompt);
      return result;
    } catch (error) {
      if (error instanceof GoogleGenerativeAIError && error.message.includes('503')) {
        attempt++;
        if (attempt >= maxRetries) {
          console.error(`❌ Falha na chamada ao Gemini após ${maxRetries} tentativas. Último erro:`, error);
          throw new Error(`O serviço de IA está temporariamente sobrecarregado. Por favor, tente novamente em alguns instantes. (Error: 503)`);
        }
        const delay = Math.pow(2, attempt) * 1000;
        console.warn(`⚠️ Serviço do Gemini sobrecarregado (503). Tentando novamente em ${delay / 1000}s... (Tentativa ${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
  // Este ponto só é alcançado se todas as tentativas falharem
  throw new Error('Falha ao gerar conteúdo após múltiplas tentativas.');
}


export async function extractFilters(question: string, userBlacklist: string[] = []): Promise<ExtractedFilters> {
  const defaultResponse: ExtractedFilters = {
    palavrasChave: [],
    sinonimos: [],
    valorMin: null,
    valorMax: null,
    estado: null,
    modalidade: null,
    dataInicial: null,
    dataFinal: null,
    blacklist: userBlacklist,
    smartBlacklist: [],
  };

  if (!question || typeof question !== 'string' || !question.trim()) {
    console.warn("⚠️ extractFilters chamada com pergunta inválida. Retornando resposta padrão.");
    // Retorna a blacklist do usuário mesmo em caso de pergunta inválida
    defaultResponse.blacklist = userBlacklist;
    return defaultResponse;
  }
  console.log(`🧠 Chamando Gemini para extrair filtros de: "${question}"`);

  const hoje = new Date();
  const dataAtualFormatada = format(hoje, 'yyyy-MM-dd');

  const prompt = `
<MISSION>
Você é um assistente de IA altamente especializado em licitações públicas no Brasil. Sua função é converter a pergunta do usuário em um objeto JSON estrito, sem qualquer texto adicional.
</MISSION>

<CONTEXT>
A data de referência (hoje) é: ${dataAtualFormatada}.

Use esta lista de ramos de atuação como base de conhecimento para mapear os termos da pergunta do usuário:

1.  **Alimentação Prisional:**
    * **Termos-chave**: "alimentação prisional", "refeições para presídios", "fornecimento de alimentação para unidades prisionais", "nutrição prisional".
    * **Sinônimos**: "alimentação para detentos", "gestão de refeitório prisional", "kit lanche para sistema prisional", "refeições transportadas para presídios".

2.  **Alimentação Hospitalar:**
    * **Termos-chave**: "alimentação hospitalar", "refeições para hospitais", "serviços de nutrição hospitalar", "dieta hospitalar".
    * **Sinônimos**: "gestão de refeitório hospitalar", "nutrição clínica", "alimentação enteral", "fornecimento de dietas para pacientes".

3.  **Merenda ou Alimentação Escolar:**
    * **Termos-chave**: "merenda escolar", "alimentação escolar", "refeições para escolas", "PNAE", "programa nacional de alimentação escolar".
    * **Sinônimos**: "fornecimento de merenda", "gestão de cantina escolar", "refeitório escolar", "kit merenda".

4.  **Frota com Motorista:**
    * **Termos-chave**: "locação de frota com motorista", "aluguel de veículos com condutor", "transporte executivo", "terceirização de frota".
    * **Sinônimos**: "serviços de motorista", "transporte de passageiros", "veículos com motorista à disposição", "fretamento de veículos".

5.  **Cogestão Prisional:**
    * **Termos-chave**: "cogestão prisional", "gestão compartilhada de unidade prisional", "administração prisional".
    * **Sinônimos**: "parceria na gestão de presídios", "gestão de estabelecimentos penais", "apoio à gestão prisional".

6.  **Fornecimento de Mão de Obra (Facilities):**
    * **Termos-chave**: "fornecimento de mão de obra", "terceirização de serviços", "mão de obra dedicada", "postos de trabalho".
    * **Sinônimos**: "facilities", "apoio administrativo", "recepcionista", "porteiro", "copeiragem", "serviços gerais".

7.  **Limpeza (Predial, Escolar e Hospitalar):**
    * **Termos-chave**: "limpeza predial", "limpeza escolar", "limpeza hospitalar", "limpeza".
    * **Sinônimos**: "limpeza e conservação", "higienização", "serviços de limpeza",
        "Limpeza Predial": "conservação e limpeza", "higienização de edifícios", "limpeza de fachadas", "tratamento de piso".
        "Limpeza Escolar": "higienização de escolas", "conservação de ambiente escolar".
        "Limpeza Hospitalar": "higienização hospitalar", "limpeza e desinfecção hospitalar", "limpeza terminal", "assepsia de ambientes", "gestão de resíduos de saúde".

8.  **PPP e Concessões:**
    * **Termos-chave**: "ppp", "parceria público-privada", "concessão administrativa", "concessão patrocinada", "ppi", "pmi".
    * **Sinônimos**: "edital de manifestação de interesse", "procedimento de manifestação de interesse".

9.  **Engenharia (Construção, Reforma, Manutenção):**
    * **Termos-chave**: "engenharia", "construção civil", "reforma predial", "manutenção predial", "obras".
    * **Sinônimos**: "serviços de engenharia", "edificações", "infraestrutura predial", "manutenção preventiva", "manutenção corretiva".

**Modalidades de Licitação Conhecidas**: "Leilão Eletrônico", "Leilão Presencial", "Diálogo Competitivo", "Concurso", "Concorrência Eletrônica", "Concorrência Presencial", "Pregão Eletrônico", "Pregão Presencial", "Dispensa de Licitação", "Inexigibilidade de Licitação", "Manifestação de Interesse", "Pré-qualificação", "Credenciamento".
</CONTEXT>

<RULES>
1.  **Mapeamento de Termos**: Se a pergunta do usuário corresponder a um ou mais ramos de atuação, popule 'palavrasChave' com os "Termos-chave" e 'sinonimos' com os "Sinônimos" dos ramos correspondentes.
2.  **Datas**: Hoje é ${dataAtualFormatada}. Use o formato YYYY-MM-DD. Se nenhum período for mencionado, 'dataInicial' e 'dataFinal' devem ser null.
3.  **Valores**: Interprete "1 milhão" como 1000000. "acima de X" é 'valorMin', "abaixo de X" é 'valorMax'.
4.  **Estado**: Retorne a sigla em maiúsculas (ex: "São Paulo" -> "SP").
5.  **Modalidade**: Identifique a modalidade da lista "Modalidades de Licitação Conhecidas".
6.  **Blacklist**: Extraia termos que o usuário explicitamente NÃO deseja ver (indicados por "excluindo", "exceto", "nada de", "sem"). Popule o array 'blacklist' com esses termos. Não adicione nenhum outro termo a este array.
7.  **Smart Blacklist**: Se a pergunta focar **claramente em UM ÚNICO ramo de atuação**, preencha smartBlacklist com os "Termos-chave" e "Sinônimos" dos **OUTROS** ramos. Caso contrário, deixe o array vazio.
</RULES>

<OUTPUT_FORMAT>
Sua única saída deve ser um objeto JSON válido, aderindo à seguinte estrutura:
{
  "palavrasChave": ["string"],
  "sinonimos": [["string"]],
  "valorMin": number | null,
  "valorMax": number | null,
  "estado": string | null,
  "modalidade": string | null,
  "dataInicial": string | null,
  "dataFinal": string | null,
  "blacklist": ["string"],
  "smartBlacklist": ["string"]
}
</OUTPUT_FORMAT>
---
Agora, analise a pergunta abaixo e retorne APENAS o objeto JSON correspondente.
Pergunta do Usuário: "${question}"
`;
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await generateContentWithRetry(model, prompt);

    const response = await result.response;
    const text = response.text();

    if (!text) throw new Error('Falha ao extrair filtros: resposta da IA vazia');

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Resposta da IA não contém um objeto JSON válido.');

    const jsonText = jsonMatch[0];
    const parsedResponse = JSON.parse(jsonText) as Partial<ExtractedFilters>;
    const validatedResponse: ExtractedFilters = { ...defaultResponse };

    if (Array.isArray(parsedResponse.palavrasChave)) validatedResponse.palavrasChave = parsedResponse.palavrasChave.filter(kw => typeof kw === 'string');
    if (Array.isArray(parsedResponse.sinonimos)) validatedResponse.sinonimos = parsedResponse.sinonimos.map(s => Array.isArray(s) ? s.filter(i => typeof i === 'string') : []);
    if (typeof parsedResponse.valorMin === 'number') validatedResponse.valorMin = parsedResponse.valorMin;
    if (typeof parsedResponse.valorMax === 'number') validatedResponse.valorMax = parsedResponse.valorMax;
    if (typeof parsedResponse.estado === 'string') validatedResponse.estado = parsedResponse.estado.toUpperCase().trim();
    if (typeof parsedResponse.modalidade === 'string') validatedResponse.modalidade = parsedResponse.modalidade.trim();
    if (typeof parsedResponse.dataInicial === 'string') validatedResponse.dataInicial = parsedResponse.dataInicial;
    if (typeof parsedResponse.dataFinal === 'string') validatedResponse.dataFinal = parsedResponse.dataFinal;

    const explicitBlacklist = Array.isArray(parsedResponse.blacklist) ? parsedResponse.blacklist.filter(item => typeof item === 'string').map(item => item.toLowerCase()) : [];
    validatedResponse.blacklist = [...new Set([...userBlacklist.map(term => term.toLowerCase()), ...explicitBlacklist])];

    if (Array.isArray(parsedResponse.smartBlacklist)) validatedResponse.smartBlacklist = parsedResponse.smartBlacklist.filter(item => typeof item === 'string').map(item => item.toLowerCase());

    console.log("✅ Filtros extraídos e validados:", validatedResponse);
    return validatedResponse;

  } catch (error: unknown) {
    console.error('❌ Erro em extractFilters:', error);
    if (error instanceof Error) {
      throw new Error(`Falha na comunicação com a IA Gemini: ${error.message}`);
    }
    throw new Error("Ocorreu um erro desconhecido durante a extração de filtros.");
  }
}