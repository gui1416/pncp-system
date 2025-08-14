"use client"

import React, { useState, useEffect } from "react"
import {
 Sheet,
 SheetContent,
 SheetDescription,
 SheetHeader,
 SheetTitle,
 SheetFooter,
 SheetClose,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar } from "@/components/ui/calendar"
import {
 Popover,
 PopoverContent,
 PopoverTrigger,
} from "@/components/ui/popover"
import {
 Command,
 CommandEmpty,
 CommandGroup,
 CommandInput,
 CommandItem,
 CommandList,
} from "@/components/ui/command"
import { Calendar as CalendarIcon, Check, ChevronsUpDown, XIcon } from "lucide-react"
import { DateRange } from "react-day-picker"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"

// --- DADOS E TIPOS ---

const defaultBlacklist = [
 "teste", "simulação", "cancelado", "leilão", "dedetização", "controle de pragas",
 "poços artesianos", "desratização", "pombo", "ratos", "controle de pragas urbanas",
 "descupinização", "banheiro químico", "desentupimento de canos e ralos",
 "buffet", "coração", "organização de espaços", "salgados fritos e assados", "bolos",
 "brinquedos", "infláveis", "pula pula", "máquina algodão doce", "pipoca", "sessão solene", "homenagem",
 "fornecimento de pão", "confeitaria", "padaria", "doces", "ocupação de espaço físico", "picolé", "algodão doce", "coquetel", "panificação",
 "ações institucionais", "sociais", "reuniões", "eventos", "biscoitos", "praça de alimentação", "agricultores familiares", "familiares rurais", "festa",
 "hotelaria", "feiras livres", "camarim",
 "sem motorista", "sem condutor", "ônibus e micro-ônibus", "caminhão", "máquinas", "veículos pesados", "unidades habitações",
 "audiovisual", "imagens", "locução", "panfletos", "produção de cards", "outdoor", "cartazes",
 "trabalho social", "sem fins lucrativos", "vagas de estágio remunerado", "curso",
 "armamento", "pistolas", "musica", "multi-instrumentista", "sociedade civil", "leilões", "alienação de bens", "leiloeiros", "lavagem automotiva",
 "samba", "pagode", "rock", "sertanejo", "lavagem dos veiculos",
 "teatro", "móveis", "imóveis", "ginástica", "musculação", "dança", "imprensa", "segurança privada", "desfile", "albergagem", "veterinária",
 "usina", "professor", "recreativos", "arbitragem", "assesoria", "consultoria", "cerimonialista", "campeonatos", "recapeamento", "decoração natalina",
 "show pirotécnico", "fogos de artifício"
];

// MODIFICAÇÃO: Lista completa de modalidades conforme a API do PNCP.
const modalidadesDisponiveis = [
 { id: "leilão eletrônico", label: "Leilão Eletrônico" },
 { id: "diálogo competitivo", label: "Diálogo Competitivo" },
 { id: "concurso", label: "Concurso" },
 { id: "concorrência eletrônica", label: "Concorrência Eletrônica" },
 { id: "concorrência presencial", label: "Concorrência Presencial" },
 { id: "pregão eletrônico", label: "Pregão Eletrônico" },
 { id: "pregão presencial", label: "Pregão Presencial" },
 { id: "dispensa de licitação", label: "Dispensa de Licitação" },
 { id: "inexigibilidade de licitação", label: "Inexigibilidade de Licitação" },
 { id: "manifestação de interesse", label: "Manifestação de Interesse" },
 { id: "pré-qualificação", label: "Pré-qualificação" },
 { id: "credenciamento", label: "Credenciamento" },
 { id: "leilão presencial", label: "Leilão Presencial" },
];

const linhasFornecimento = [
 { value: "serviços de limpeza", label: "Serviços de Limpeza" },
 { value: "serviços de segurança", label: "Serviços de Segurança" },
 { value: "fornecimento de alimentação", label: "Fornecimento de Alimentação" },
 { value: "obras e engenharia", label: "Obras e Engenharia" },
 { value: "tecnologia da informação", label: "Tecnologia da Informação" },
 { value: "consultoria", label: "Consultoria" },
 { value: "material de escritório", label: "Material de Escritório" },
];

const estadosBrasil = [
 { value: "AC", label: "Acre" }, { value: "AL", label: "Alagoas" }, { value: "AP", label: "Amapá" },
 { value: "AM", label: "Amazonas" }, { value: "BA", label: "Bahia" }, { value: "CE", label: "Ceará" },
 { value: "DF", label: "Distrito Federal" }, { value: "ES", label: "Espírito Santo" }, { value: "GO", label: "Goiás" },
 { value: "MA", label: "Maranhão" }, { value: "MT", label: "Mato Grosso" }, { value: "MS", label: "Mato Grosso do Sul" },
 { value: "MG", label: "Minas Gerais" }, { value: "PA", label: "Pará" }, { value: "PB", label: "Paraíba" },
 { value: "PR", label: "Paraná" }, { value: "PE", label: "Pernambuco" }, { value: "PI", label: "Piauí" },
 { value: "RJ", label: "Rio de Janeiro" }, { value: "RN", label: "Rio Grande do Norte" }, { value: "RS", label: "Rio Grande do Sul" },
 { value: "RO", label: "Rondônia" }, { value: "RR", label: "Roraima" }, { value: "SC", label: "Santa Catarina" },
 { value: "SP", label: "São Paulo" }, { value: "SE", label: "Sergipe" }, { value: "TO", label: "Tocantins" }
];

export interface Filters {
 modalidades: string[];
 dateRange?: DateRange;
 palavrasChave: string[];
 valorMin: string;
 valorMax: string;
 estado: string | null;
 blacklist: string[];
}

interface FilterSheetProps {
 isOpen: boolean;
 onOpenChange: (open: boolean) => void;
 onApplyFilters: (filters: Filters) => void;
}

export function FilterSheet({ isOpen, onOpenChange, onApplyFilters }: FilterSheetProps) {
 const [modalidades, setModalidades] = useState<string[]>([]);
 const [date, setDate] = useState<DateRange | undefined>(undefined);
 const [palavrasChave, setPalavrasChave] = useState<string[]>([]);
 const [valorMin, setValorMin] = useState<string>("");
 const [valorMax, setValorMax] = useState<string>("");
 const [estado, setEstado] = useState<string | null>(null);
 const [blacklist, setBlacklist] = useState<string[]>(defaultBlacklist);
 const [newBlacklistItem, setNewBlacklistItem] = useState<string>("");

 const [openLinhaFornecimento, setOpenLinhaFornecimento] = useState(false);
 const [openEstado, setOpenEstado] = useState(false);

 const handleApply = () => {
  onApplyFilters({
   modalidades,
   dateRange: date,
   palavrasChave,
   valorMin,
   valorMax,
   estado,
   blacklist,
  });
  onOpenChange(false);
 };

 const handleClear = () => {
  setModalidades([]);
  setDate(undefined);
  setPalavrasChave([]);
  setValorMin("");
  setValorMax("");
  setEstado(null);
  setBlacklist(defaultBlacklist);
 };

 const addBlacklistItem = () => {
  const item = newBlacklistItem.trim().toLowerCase();
  if (item && !blacklist.includes(item)) {
   setBlacklist([...blacklist, item].sort());
   setNewBlacklistItem("");
  }
 };

 const removeBlacklistItem = (itemToRemove: string) => {
  setBlacklist(blacklist.filter(item => item !== itemToRemove));
 };

 useEffect(() => {
  if (isOpen) {
   setBlacklist(prev => [...prev].sort());
  }
 }, [isOpen]);

 return (
  <Sheet open={isOpen} onOpenChange={onOpenChange}>
   <SheetContent className="flex flex-col w-full sm:max-w-md bg-background p-6">
    <SheetHeader className="space-y-1 border-b pb-4 mb-4">
     <SheetTitle className="text-lg font-semibold">Filtros Avançados</SheetTitle>
     <SheetDescription className="text-sm text-muted-foreground">
      Refine sua busca por licitações com os filtros abaixo.
     </SheetDescription>
    </SheetHeader>

    <div className="flex-1 overflow-y-auto space-y-6 pr-2">
     {/* Modalidades */}
     <div className="space-y-3">
      <Label className="text-sm font-medium">Modalidade</Label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
       {modalidadesDisponiveis.map((item) => (
        <div key={item.id} className="flex items-center space-x-2 rounded-md p-2 hover:bg-muted/40 transition-colors">
         <Checkbox
          id={item.id}
          checked={modalidades.includes(item.id)}
          onCheckedChange={(checked) => {
           setModalidades((prev) =>
            checked ? [...prev, item.id] : prev.filter((v) => v !== item.id)
           );
          }}
         />
         <label htmlFor={item.id} className="text-sm font-normal leading-none cursor-pointer select-none">
          {item.label}
         </label>
        </div>
       ))}
      </div>
     </div>

     {/* Período de Publicação */}
     <div className="space-y-3">
      <Label className="text-sm font-medium">Período de Publicação</Label>
      <Popover>
       <PopoverTrigger asChild>
        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
         <CalendarIcon className="mr-2 h-4 w-4" />
         {date?.from ? (date.to ? (<>{format(date.from, "dd/MM/yy", { locale: ptBR })} - {format(date.to, "dd/MM/yy", { locale: ptBR })}</>) : (format(date.from, "dd/MM/yyyy", { locale: ptBR }))) : (<span>Escolha um período</span>)}
        </Button>
       </PopoverTrigger>
       <PopoverContent className="w-auto p-0" align="start">
        <Calendar initialFocus mode="range" selected={date} onSelect={setDate} numberOfMonths={1} locale={ptBR} />
       </PopoverContent>
      </Popover>
     </div>

     {/* Linha de Fornecimento */}
     <div className="space-y-3">
      <Label className="text-sm font-medium">Linha de Fornecimento</Label>
      <Popover open={openLinhaFornecimento} onOpenChange={setOpenLinhaFornecimento}>
       <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={openLinhaFornecimento} className="w-full justify-between">
         {palavrasChave.length > 0 ? `${palavrasChave.length} selecionada(s)` : "Selecione..."}
         <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
       </PopoverTrigger>
       <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
         <CommandInput placeholder="Buscar linha..." />
         <CommandList>
          <CommandEmpty>Nenhuma linha encontrada.</CommandEmpty>
          <CommandGroup>
           {linhasFornecimento.map((item) => (
            <CommandItem key={item.value} onSelect={() => {
             setPalavrasChave((prev) => prev.includes(item.value) ? prev.filter((v) => v !== item.value) : [...prev, item.value]);
            }}>
             <Check className={cn("mr-2 h-4 w-4", palavrasChave.includes(item.value) ? "opacity-100" : "opacity-0")} />
             {item.label}
            </CommandItem>
           ))}
          </CommandGroup>
         </CommandList>
        </Command>
       </PopoverContent>
      </Popover>
     </div>

     {/* Estado */}
     <div className="space-y-3">
      <Label className="text-sm font-medium">Estado</Label>
      <Popover open={openEstado} onOpenChange={setOpenEstado}>
       <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={openEstado} className="w-full justify-between">
         {estado ? estadosBrasil.find((e) => e.value === estado)?.label : "Selecione o estado..."}
         <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
       </PopoverTrigger>
       <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
         <CommandInput placeholder="Buscar estado..." />
         <CommandList>
          <CommandEmpty>Nenhum estado encontrado.</CommandEmpty>
          <CommandGroup>
           {estadosBrasil.map((e) => (
            <CommandItem key={e.value} value={e.label} onSelect={() => {
             setEstado(e.value === estado ? null : e.value)
             setOpenEstado(false)
            }}>
             <Check className={cn("mr-2 h-4 w-4", estado === e.value ? "opacity-100" : "opacity-0")} />
             {e.label}
            </CommandItem>
           ))}
          </CommandGroup>
         </CommandList>
        </Command>
       </PopoverContent>
      </Popover>
     </div>

     {/* Faixa de Valor */}
     <div className="space-y-3">
      <Label className="text-sm font-medium">Faixa de Valor (R$)</Label>
      <div className="flex items-center gap-2">
       <Input type="number" placeholder="Mínimo" value={valorMin} onChange={(e) => setValorMin(e.target.value)} />
       <span className="text-muted-foreground">-</span>
       <Input type="number" placeholder="Máximo" value={valorMax} onChange={(e) => setValorMax(e.target.value)} />
      </div>
     </div>

     {/* Blacklist */}
     <div className="space-y-3">
      <Label className="text-sm font-medium">Palavras-chave a Ignorar (Blacklist)</Label>
      <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[60px]">
       {blacklist.length > 0 ? blacklist.map((item) => (
        <Badge key={item} variant="destructive" className="flex items-center gap-1.5">
         {item}
         <button
          type="button"
          onClick={() => removeBlacklistItem(item)}
          className="rounded-full hover:bg-black/20 focus:outline-none transition-colors"
          aria-label={`Remover ${item}`}
         >
          <XIcon className="h-3 w-3" />
         </button>
        </Badge>
       )) : <span className="text-xs text-muted-foreground px-1">Nenhuma palavra-chave para ignorar.</span>}
      </div>
      <div className="flex items-center space-x-2">
       <Input
        type="text"
        placeholder="Adicionar palavra..."
        value={newBlacklistItem}
        onChange={(e) => setNewBlacklistItem(e.target.value)}
        onKeyDown={(e) => {
         if (e.key === "Enter") {
          e.preventDefault();
          addBlacklistItem();
         }
        }}
       />
       <Button size="sm" onClick={addBlacklistItem}>
        Adicionar
       </Button>
      </div>
     </div>
    </div>

    <SheetFooter className="mt-auto pt-4 border-t flex gap-2">
     <Button variant="outline" onClick={handleClear} className="flex-1">
      Limpar Filtros
     </Button>
     <SheetClose asChild>
      <Button onClick={handleApply} className="flex-1">
       Aplicar Filtros
      </Button>
     </SheetClose>
    </SheetFooter>
   </SheetContent>
  </Sheet>
 )
}