import { NextRequest, NextResponse } from 'next/server';
import { extractFilters } from '@/lib/extractFilters';
<<<<<<< HEAD
import { buscarLicitacoesPNCP } from '@/lib/comprasApi';
import { PncpLicitacao } from '@/lib/types';
=======
import { buscarLicitacoesPNCP } from '@/lib/comprasApi'; // Changed import
import { PncpLicitacao } from '@/lib/types'; // Changed import
>>>>>>> 4839f98f8bf990f823d4ab9615de04834fab7595

const RATE_LIMIT_WINDOW = 60 * 1000;
const MAX_REQUESTS_PER_IP = 20;
const requestCounts = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = requestCounts.get(ip);
  if (!entry || now > entry.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  if (entry.count >= MAX_REQUESTS_PER_IP) return false;
  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Limite de requisições excedido' }, { status: 429 });
  }

  let question: string | undefined;
  try {
    const body = await req.json();
    question = body.question;
  } catch {
    return NextResponse.json({ error: 'Corpo da requisição inválido' }, { status: 400 });
  }

  if (!question) {
    return NextResponse.json({ error: 'Pergunta ausente' }, { status: 400 });
  }

  try {
    const extractedInfo = await extractFilters(question);
    console.log("Filtros extraídos pelo Gemini:", extractedInfo);

<<<<<<< HEAD
    const pncpResponse = await buscarLicitacoesPNCP(extractedInfo);
=======
    const pncpResponse = await buscarLicitacoesPNCP(extractedInfo); // Changed function call
>>>>>>> 4839f98f8bf990f823d4ab9615de04834fab7595

    if (!pncpResponse.success || !pncpResponse.data?.data) {
      console.error("Erro na resposta da API PNCP:", pncpResponse.error);
      return NextResponse.json(
        { error: pncpResponse.error || "Não foi possível obter licitações (editais e avisos) da API PNCP." },
        { status: pncpResponse.status || 500 }
      );
    }

<<<<<<< HEAD
    const licitacoesEncontradas: PncpLicitacao[] = pncpResponse.data.data;
=======
    const licitacoesEncontradas: PncpLicitacao[] = pncpResponse.data.data; // Changed type and variable name
>>>>>>> 4839f98f8bf990f823d4ab9615de04834fab7595

    const { palavrasChave, sinonimos, valorMin, valorMax, blacklist, smartBlacklist } = extractedInfo;

    const searchTerms = [
      ...palavrasChave.map(k => k.toLowerCase()),
      ...sinonimos.flat().map(s => s.toLowerCase())
    ].filter(term => term.length > 0);

<<<<<<< HEAD
    const licitacoesFiltradas = licitacoesEncontradas.filter(licitacao => {
      const objetoLicitacao = licitacao.objetoCompra?.toLowerCase() || '';

      // Positive filtering (what we want to see)
      const objetoOk = searchTerms.length === 0 || searchTerms.some(term => objetoLicitacao.includes(term));
      if (!objetoOk) return false;

      // Blacklist filtering (explicitly exclude these terms)
      const isBlacklisted = blacklist.some(term => objetoLicitacao.includes(term));
      if (isBlacklisted) {
        console.log(`🚫 Excluindo licitação ${licitacao.numeroControlePNCP} devido a termo na blacklist: "${objetoLicitacao}" contém [${blacklist.filter(t => objetoLicitacao.includes(t)).join(', ')}]`);
        return false;
      }
=======
    const licitacoesFiltradas = licitacoesEncontradas.filter(licitacao => { // Changed variable name
      const objetoLicitacao = licitacao.objetoCompra?.toLowerCase() || ''; // Changed field name
      const objetoOk = searchTerms.length === 0 || searchTerms.some(term => objetoLicitacao.includes(term));
      if (!objetoOk) return false;

      // Use valorTotalEstimado for filtering as valorGlobal is for contracts, not licitacoes
      const valorParaComparar = licitacao.valorTotalEstimado ?? 0;
>>>>>>> 4839f98f8bf990f823d4ab9615de04834fab7595

      // Smart Blacklist filtering (exclude if a smart blacklist term is present AND no positive keyword is explicitly present for that term)
      const isSmartBlacklisted = smartBlacklist.some(sbt => {
        // If the smart blacklist term is present in the object
        if (objetoLicitacao.includes(sbt)) {
          // Check if any of the positive search terms (keywords or synonyms) are also present.
          // If no positive search term is present, then this smart blacklist term is relevant for exclusion.
          const isPositiveTermPresent = searchTerms.some(term => objetoLicitacao.includes(term));
          if (!isPositiveTermPresent) {
            console.log(`🧠 Excluindo licitação ${licitacao.numeroControlePNCP} devido a termo na smart blacklist sem termos positivos: "${objetoLicitacao}" contém "${sbt}"`);
            return true; // Exclude this item
          }
        }
        return false;
      });

      if (isSmartBlacklisted) return false;


      // Value filtering
      const valorParaComparar = licitacao.valorTotalEstimado ?? 0;
      const valorMinOk = (valorMin === null || valorParaComparar >= valorMin);
      const valorMaxOk = (valorMax === null || valorParaComparar <= valorMax);

      if (!valorMinOk || !valorMaxOk) return false;

      return true;
    });

<<<<<<< HEAD
    console.log(`✅ Requisição processada. Enviando ${licitacoesFiltradas.length} licitações filtradas.`);
=======
    console.log(`✅ Requisição processada. Enviando ${licitacoesFiltradas.length} licitações filtradas.`); // Updated log
>>>>>>> 4839f98f8bf990f823d4ab9615de04834fab7595
    return NextResponse.json({ resultados: licitacoesFiltradas }, { status: 200 });

  } catch (error: unknown) {
    console.error(`❌ Erro crítico ao processar requisição em /api/buscar-licitacoes:`, error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Erro interno do servidor', message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Método GET não suportado para esta rota. Use POST.' }, { status: 405 });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}