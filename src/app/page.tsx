"use client"

import React, { useState, useMemo } from "react"
import { Search, MapPin, CalendarDays, FileText, AlertCircle, Building, Newspaper, Filter as FilterIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis
} from "@/components/ui/pagination"
import { FilterSheet, type Filters } from "@/components/FilterSheet"
import { Toaster, toast } from "sonner"
import { type PncpLicitacao as Licitacao } from "@/lib/types"
import { format } from "date-fns"

const BACKEND_API_ROUTE = "/api/buscar-licitacoes";
const ITEMS_PER_PAGE = 100;

export default function Home() {
  const [searchTerm, setSearchTerm] = useState("")
  const [allResults, setAllResults] = useState<Licitacao[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false)

  // --- Funções de formatação ---
  const formatCurrency = (v: number | null | undefined) => v ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "Não informado";
  const formatGenericDateTime = (d: string | null | undefined) => d ? new Date(d).toLocaleString("pt-BR", { timeZone: 'America/Sao_Paulo' }) : "Não informado";
  const getSituacaoBadgeVariant = (s: string | null | undefined): "default" | "destructive" | "secondary" => {
    const status = s?.toUpperCase() || '';
    if (["REVOGADA", "ANULADA", "SUSPENSA"].includes(status)) return "destructive";
    if (["DIVULGADA NO PNCP"].includes(status)) return "default";
    return "secondary";
  };


  // MODIFICAÇÃO: A lógica de filtragem agora inclui mais campos.
  const filteredResults = useMemo(() => {
    if (!searchTerm.trim()) return allResults;

    const lowercasedTerm = searchTerm.toLowerCase();

    return allResults.filter(licitacao => {
      const local = `${licitacao.unidadeOrgao?.municipioNome ?? ''} / ${licitacao.unidadeOrgao?.ufSigla ?? ''}`;

      return (
        licitacao.objetoCompra?.toLowerCase().includes(lowercasedTerm) ||
        licitacao.orgaoEntidade?.razaoSocial?.toLowerCase().includes(lowercasedTerm) ||
        local.toLowerCase().includes(lowercasedTerm) ||
        formatGenericDateTime(licitacao.dataPublicacaoPncp).toLowerCase().includes(lowercasedTerm) ||
        (licitacao.modalidadeNome?.toLowerCase().includes(lowercasedTerm)) ||
        formatCurrency(licitacao.valorTotalEstimado).toLowerCase().includes(lowercasedTerm)
      );
    });
  }, [allResults, searchTerm]);

  const { paginatedResults, totalPages } = useMemo(() => {
    const total = Math.ceil(filteredResults.length / ITEMS_PER_PAGE);
    const paginated = filteredResults.slice(
      (currentPage - 1) * ITEMS_PER_PAGE,
      currentPage * ITEMS_PER_PAGE
    );
    return { paginatedResults: paginated, totalPages: total };
  }, [filteredResults, currentPage]);


  const handleApplyFilters = async (filters: Filters) => {
    console.log("Aplicando filtros:", filters);
    setIsLoading(true);
    setAllResults([]);
    setCurrentPage(1);
    setHasSearched(true);
    setSearchTerm(""); // Limpa a busca local ao aplicar novos filtros

    let questionParts: string[] = [];

    if (filters.palavrasChave.length > 0) {
      questionParts.push(`sobre ${filters.palavrasChave.join(' ou ')}`);
    }
    if (filters.modalidades.length > 0) {
      questionParts.push(`na modalidade ${filters.modalidades.join(' ou ')}`);
    }
    if (filters.estado) {
      questionParts.push(`no estado de ${filters.estado}`);
    }
    if (filters.dateRange?.from) {
      const from = format(filters.dateRange.from, 'dd/MM/yyyy');
      if (filters.dateRange.to) {
        const to = format(filters.dateRange.to, 'dd/MM/yyyy');
        questionParts.push(`publicados entre ${from} e ${to}`);
      } else {
        questionParts.push(`publicados a partir de ${from}`);
      }
    }
    if (filters.valorMin || filters.valorMax) {
      let valorPart = "com valor";
      if (filters.valorMin) valorPart += ` mínimo de R$${filters.valorMin}`;
      if (filters.valorMin && filters.valorMax) valorPart += " e";
      if (filters.valorMax) valorPart += ` máximo de R$${filters.valorMax}`;
      questionParts.push(valorPart);
    }

    const question = "Licitações " + questionParts.join(', ');

    if (questionParts.length === 0) {
      toast.info("Por favor, selecione ao menos um filtro para buscar.");
      setIsLoading(false);
      setHasSearched(false);
      return;
    }

    try {
      const res = await fetch(BACKEND_API_ROUTE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          blacklist: filters.blacklist // Envia a blacklist para o backend
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.error || "Erro no servidor.");
      }

      setAllResults(data.resultados || []);
      if (!data.resultados?.length) {
        toast.info("Nenhuma licitação encontrada para os filtros informados.");
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Ocorreu um erro desconhecido.";
      toast.error("Erro na busca", { description: message });
    } finally {
      setIsLoading(false);
    }
  }

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo(0, 0);
    }
  };

  const paginationItems = useMemo(() => {
    const items: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) items.push(i);
    } else {
      items.push(1);
      if (currentPage > 3) items.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) items.push(i);
      if (currentPage < totalPages - 2) items.push('...');
      items.push(totalPages);
    }
    return items;
  }, [currentPage, totalPages]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="container mx-auto py-4 px-4">
          <h1 className="text-2xl font-bold text-gray-800">Licitações PNCP</h1>
          <p className="text-sm text-gray-500">Busca inteligente e abrangente em licitações públicas do PNCP.</p>
        </div>
      </header>

      <main className="container mx-auto py-8 px-4">
        <Card className="mb-8 shadow-md">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-grow w-full">
                <Input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  placeholder="Pesquise nos resultados por palavra-chave, órgão, etc..."
                  className="pl-10 h-11"
                  disabled={isLoading || allResults.length === 0}
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              </div>
              <Button onClick={() => setIsFilterSheetOpen(true)} className="min-w-[120px] h-11 text-base">
                <FilterIcon className="mr-2 h-4 w-4" />
                Filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        <FilterSheet
          isOpen={isFilterSheetOpen}
          onOpenChange={setIsFilterSheetOpen}
          onApplyFilters={handleApplyFilters}
        />

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
          </div>
        ) : filteredResults.length > 0 ? (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Resultados da Busca ({filteredResults.length} licitações encontradas)</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-6">
                {paginatedResults.map((licitacao) => (
                  <li key={licitacao.numeroControlePNCP} className="border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex flex-col md:flex-row justify-between gap-3 mb-3">
                      <h4 className="font-semibold text-gray-800 flex-1">{licitacao.objetoCompra || "Objeto não informado"}</h4>
                      <div className="flex items-center flex-wrap gap-2">
                        {licitacao.tipoInstrumentoConvocatorioNome && <Badge variant="outline" className="whitespace-nowrap"><FileText className="w-3.5 h-3.5 mr-1.5" />{licitacao.tipoInstrumentoConvocatorioNome}</Badge>}
                        {licitacao.modalidadeNome && <Badge variant="outline" className="whitespace-nowrap"><Newspaper className="w-3.5 h-3.5 mr-1.5" />{licitacao.modalidadeNome}</Badge>}
                        {licitacao.situacaoCompraNome && <Badge variant={getSituacaoBadgeVariant(licitacao.situacaoCompraNome)} className="capitalize whitespace-nowrap">{licitacao.situacaoCompraNome.toLowerCase()}</Badge>}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm text-gray-600 mb-4">
                      <div className="flex items-start gap-2"><Building className="w-4 h-4 mt-1 flex-shrink-0" /><span><strong>Órgão:</strong> {licitacao.orgaoEntidade?.razaoSocial ?? 'N/A'}</span></div>
                      <div className="flex items-start gap-2"><MapPin className="w-4 h-4 mt-1 flex-shrink-0" /><span><strong>Local:</strong> {`${licitacao.unidadeOrgao?.municipioNome ?? 'N/A'} / ${licitacao.unidadeOrgao?.ufSigla ?? 'N/A'}`}</span></div>
                      <div className="flex items-start gap-2"><CalendarDays className="w-4 h-4 mt-1 flex-shrink-0" /><span><strong>Publicação:</strong> {formatGenericDateTime(licitacao.dataPublicacaoPncp)}</span></div>
                      <div className="flex items-start gap-2"><strong>Valor Estimado:</strong><span className="font-semibold text-green-700">{formatCurrency(licitacao.valorTotalEstimado)}</span></div>
                    </div>
                    {(licitacao.orgaoEntidade?.cnpj && licitacao.anoCompra && licitacao.sequencialCompra) && (
                      <div className="flex justify-end mt-4 pt-4 border-t border-gray-100">
                        <Button variant="outline" size="sm" asChild>
                          <a href={`https://pncp.gov.br/app/editais/${licitacao.orgaoEntidade.cnpj}/${licitacao.anoCompra}/${licitacao.sequencialCompra}`} target="_blank" rel="noopener noreferrer">
                            <FileText className="w-4 h-4 mr-2" /> Ver no PNCP
                          </a>
                        </Button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
            {totalPages > 1 && (
              <CardFooter>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem><PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); handlePageChange(currentPage - 1); }} className={currentPage === 1 ? "pointer-events-none opacity-50" : undefined} /></PaginationItem>
                    {paginationItems.map((item, index) => (
                      <PaginationItem key={index}>
                        {typeof item === 'number' ? (<PaginationLink href="#" onClick={(e) => { e.preventDefault(); handlePageChange(item); }} isActive={currentPage === item}>{item}</PaginationLink>) : (<PaginationEllipsis />)}
                      </PaginationItem>
                    ))}
                    <PaginationItem><PaginationNext href="#" onClick={(e) => { e.preventDefault(); handlePageChange(currentPage + 1); }} className={currentPage === totalPages ? "pointer-events-none opacity-50" : undefined} /></PaginationItem>
                  </PaginationContent>
                </Pagination>
              </CardFooter>
            )}
          </Card>
        ) : (
          !isLoading && hasSearched && (
            <Card>
              <CardContent className="py-16 text-center">
                <AlertCircle className="h-12 w-12 mx-auto text-gray-400" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">Nenhum resultado encontrado</h3>
                <p className="mt-1 text-sm text-gray-500">Sua busca com os filtros aplicados não retornou resultados.</p>
              </CardContent>
            </Card>
          )
        )}
      </main>
      <Toaster richColors position="top-right" />
    </div>
  )
}