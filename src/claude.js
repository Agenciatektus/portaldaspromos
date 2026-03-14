/**
 * Geração de metadata para YouTube Shorts
 * Usa templates baseados nos dados da planilha — sem API externa necessária.
 * Conteúdo mais elaborado (roteiros, descrições longas) é gerado via Claude Code.
 */

const HASHTAGS_FIXOS = '#oferta #promocao #desconto #comprar #oportunidade #portaldepromocoes #mercadolivre';

const HASHTAGS_CATEGORIA = {
  'Eletrônicos':    '#eletronicos #tech #gadgets #celular #notebook #informatica',
  'Casa/Cozinha':   '#casa #cozinha #utilidades #decoracao #lardomestico #utensilios',
  'Moda':           '#moda #fashion #estilo #roupa #calcado #vestuario',
  'Beleza/Saúde':   '#beleza #saude #skincare #cosmeticos #suplemento #vitamina',
  'Esportes':       '#esportes #fitness #academia #saude #treino',
  'Informática':    '#informatica #computador #notebook #hd #ssd #teclado',
  'Bebês/Crianças': '#bebes #criancas #brinquedos #kids #infantil #jogos',
  'Ferramentas':    '#ferramentas #bricolagem #construcao #reforma',
};

function calcDesconto(precoAtual, precoAntigo) {
  const atual = parseFloat(String(precoAtual).replace(/[^\d,]/g, '').replace(',', '.'));
  const antigo = parseFloat(String(precoAntigo).replace(/[^\d,]/g, '').replace(',', '.'));
  if (!antigo || antigo <= atual) return null;
  return Math.round(((antigo - atual) / antigo) * 100);
}

/**
 * Gera metadata para YouTube Short a partir dos dados do produto
 * @param {Object} produto - dados da planilha
 * @returns {{title: string, description: string, tags: string[]}}
 */
function generateMetadata(produto) {
  const desconto = calcDesconto(produto.preco, produto.preco_antigo);
  const descontoStr = desconto ? `${desconto}% OFF` : '';

  // Título (máx 100 chars)
  let title = desconto
    ? `🔥 ${descontoStr} | ${produto.nome} por ${produto.preco}`
    : `🔥 ${produto.nome} por apenas ${produto.preco}`;
  title = title.slice(0, 100);

  // Descrição
  let description = produto.nome + '\n\n';
  if (desconto && produto.preco_antigo) {
    description += `De ${produto.preco_antigo} por ${produto.preco} (${descontoStr})\n\n`;
  } else {
    description += `Por apenas ${produto.preco}\n\n`;
  }
  description += `🛒 Link no grupo WhatsApp 👇\nAproveite enquanto tem estoque!\n\n`;
  const hashtagsCat = HASHTAGS_CATEGORIA[produto.categoria] || '';
  description += `${HASHTAGS_FIXOS} ${hashtagsCat}`.trim();
  description = description.slice(0, 5000);

  // Tags (sem #)
  const tags = [
    'oferta', 'promocao', 'desconto', 'mercado livre', 'comprar online',
    produto.categoria?.toLowerCase() || '',
    ...produto.nome.toLowerCase().split(' ').slice(0, 5),
  ].filter(Boolean);

  console.log(`[Metadata] Título: ${title}`);
  return { title, description, tags };
}

module.exports = { generateMetadata };
