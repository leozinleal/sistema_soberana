export const STATUS_OBRA = {
  planejamento: { label: 'Planejamento', cls: 'bg-zinc-100 text-zinc-700' },
  em_andamento: { label: 'Em andamento', cls: 'bg-yellow-100 text-yellow-800' },
  pausada: { label: 'Pausada', cls: 'bg-orange-100 text-orange-800' },
  concluida: { label: 'Concluída', cls: 'bg-blue-100 text-blue-800' },
  entregue: { label: 'Entregue', cls: 'bg-green-100 text-green-800' },
}

export const CATEGORIAS = {
  saida: {
    material: 'Material de construção',
    mao_de_obra: 'Mão de obra (funcionários)',
    servico_terceiro: 'Serviço terceirizado',
    equipamento: 'Equipamentos / locação',
    projeto_documentacao: 'Projetos e documentação',
    taxas_impostos: 'Taxas e impostos',
    transporte: 'Transporte / frete',
    outros_saida: 'Outras despesas',
  },
  entrada: {
    recebimento_cliente: 'Recebimento do cliente',
    servico_prestado: 'Serviço prestado',
    financiamento: 'Financiamento / banco',
    aporte: 'Aporte próprio',
    outros_entrada: 'Outras entradas',
  },
}

export const TODAS_CATEGORIAS = { ...CATEGORIAS.saida, ...CATEGORIAS.entrada }

export const TIPOS_DOCUMENTO = {
  planta: 'Planta',
  escritura: 'Escritura',
  matricula: 'Matrícula',
  contrato: 'Contrato',
  doc_pessoal: 'Documento pessoal',
  memorial_descritivo: 'Memorial descritivo',
  carta_entrega: 'Carta de entrega',
  alvara: 'Alvará / licenças',
  outros: 'Outros',
}

export const FORMAS_PAGAMENTO = ['PIX', 'Dinheiro', 'Transferência', 'Boleto', 'Cartão', 'Cheque']

export const VINCULOS = {
  diarista: 'Diarista',
  empreiteiro: 'Empreiteiro',
  clt: 'CLT',
  autonomo: 'Autônomo',
  outro: 'Outro',
}
