import { NextRequest, NextResponse } from 'next/server';
import { getDetalhesContrato } from '@/lib/comprasApi';

export async function GET(request: NextRequest) {
 const url = request.nextUrl;
 const idContrato = url.pathname.split('/').pop();

 if (!idContrato) {
  return NextResponse.json({ error: 'ID do contrato ausente na URL.' }, { status: 400 });
 }

 console.log(`📞 Rota API: Buscando detalhes para Contrato ID: ${idContrato}`);

 try {
  const response = await getDetalhesContrato(idContrato);

  if (!response.success) {
   console.error(`❌ Erro ao buscar detalhes do contrato ${idContrato} via rota API:`, response.error);
   return NextResponse.json(
    { error: 'Erro ao buscar detalhes do contrato', message: response.error },
    { status: response.status || 502 }
   );
  }

  console.log(`✅ Rota API: Detalhes do contrato ${idContrato} encontrados.`);

  return NextResponse.json(response.data, { status: 200 });

 } catch (error) {
  console.error(`❌ Erro inesperado na rota /api/contratos-id/${idContrato}:`, error);
  return NextResponse.json({ error: 'Erro interno do servidor ao processar a requisição do contrato.' }, { status: 500 });
 }
}

export async function OPTIONS(req: NextRequest) {
 const origin = req.headers.get('origin');
 const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', '[https://kzmopug2zuivuibmmes7.lite.vusercontent.net](https://kzmopug2zuivuibmmes7.lite.vusercontent.net)'];
 const headers = new Headers();

 if (origin && allowedOrigins.includes(origin)) {
  headers.set('Access-Control-Allow-Origin', origin);
 } else if (allowedOrigins.includes('*')) {
  headers.set('Access-Control-Allow-Origin', '*');
 }
 headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
 headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-auth-token');
 headers.set('Access-Control-Max-Age', '86400');

 return new Response(null, { status: 204, headers });
}