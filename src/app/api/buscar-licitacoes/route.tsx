
import { NextRequest, NextResponse } from 'next/server';
import { extractFilters } from '@/lib/extractFilters';
import { buscarLicitacoesComprasGov } from '@/lib/comprasApi';
import { ComprasLicitacao } from '@/lib/types';


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

    const comprasResponse = await buscarLicitacoesComprasGov(extractedInfo);

    if (!comprasResponse.success || !comprasResponse.data?.resultado) {
      console.error("Erro na resposta da API Compras.gov.br:", comprasResponse.error);
      return NextResponse.json(
        { error: comprasResponse.error || "Não foi possível obter licitações da API Compras.gov.br." },
        { status: comprasResponse.status || 500 }
      );
    }

    const licitacoesEncontradas: ComprasLicitacao[] = comprasResponse.data.resultado;

    const { palavrasChave, sinonimos, valorMin, valorMax } = extractedInfo;

    const searchTerms = [
      ...palavrasChave.map(k => k.toLowerCase()),
      ...sinonimos.flat().map(s => s.toLowerCase())
    ].filter(term => term.length > 0);

    const licitacoesFiltradas = licitacoesEncontradas.filter(lic => {
      const objetoLicitacao = lic.objetoCompra?.toLowerCase() || '';
      const objetoOk = searchTerms.length === 0 || searchTerms.some(term => objetoLicitacao.includes(term));
      if (!objetoOk) return false;

      const valorEstimado = lic.valorTotalEstimado ?? 0;
      const valorHomologado = lic.valorTotalHomologado ?? 0;

      const valorParaComparar = Math.max(valorEstimado, valorHomologado);

      const valorMinOk = (valorMin === null || valorParaComparar >= valorMin);
      const valorMaxOk = (valorMax === null || valorParaComparar <= valorMax);

      if (!valorMinOk || !valorMaxOk) return false;

      return true;
    });

    console.log(`✅ Requisição processada. Enviando ${licitacoesFiltradas.length} licitações filtradas.`);
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
