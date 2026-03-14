require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

/**
 * Mapeia texto de breadcrumb/categoria para uma das categorias padrão do formulário
 * @param {string} texto
 * @returns {string}
 */
function mapearCategoria(texto) {
  const t = texto.toLowerCase();
  if (/cozinha|eletrodomés|fritadeira|panela|fogão|liquidificador|cafeteira|micro-ondas|geladeira|ventilador|ar condicionado/.test(t)) return 'Casa/Cozinha';
  if (/eletrônico|celular|smartphone|tablet|tv|televisor|som|áudio|câmera|monitor|videogame|console/.test(t)) return 'Eletrônicos';
  if (/informátic|computador|notebook|laptop|teclado|mouse|impressora|hd|ssd|memória|processador/.test(t)) return 'Informática';
  if (/moda|roupa|calçado|tênis|sapato|vestuário|camisa|calça|vestido|blusa/.test(t)) return 'Moda';
  if (/beleza|perfume|cosmético|maquiagem|skincare|cabelo|shampoo|creme|saúde|vitamina|suplemento/.test(t)) return 'Beleza/Saúde';
  if (/esporte|fitness|academia|bicicleta|corrida|futebol|natação/.test(t)) return 'Esportes';
  if (/bebê|criança|brinquedo|infantil|escola|lápis|mochila/.test(t)) return 'Bebês/Crianças';
  if (/ferramenta|parafuso|furadeira|chave|elétrica|hidráulica|construção/.test(t)) return 'Ferramentas';
  return 'Outros';
}

/**
 * Detecta a plataforma a partir de uma URL de produto
 * @param {string} url
 * @returns {'mercadolivre'|'amazon'|'shopee'|null}
 */
function detectarPlataforma(url) {
  if (/mercadolivre\.com|mercadolibre\.com/i.test(url)) return 'mercadolivre';
  if (/amazon\.com\.br|amzn\.to/i.test(url)) return 'amazon';
  if (/shopee\.com|shp\.ee/i.test(url)) return 'shopee';
  return null;
}

/**
 * Faz scraping de produto do Mercado Livre
 * @param {string} url
 * @returns {Promise<{titulo, preco, precoAntigo, imagem}>}
 */
async function scrapeMercadoLivre(url) {
  const { data } = await axios.get(url, {
    headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'pt-BR,pt;q=0.9' },
    timeout: 15000,
  });
  const $ = cheerio.load(data);

  const titulo = $('h1.ui-pdp-title').text().trim();

  const precoFracao = $('.ui-pdp-price__second-line .andes-money-amount__fraction').first().text().trim();
  const precoCentavos = $('.ui-pdp-price__second-line .andes-money-amount__cents').first().text().trim();
  const preco = precoFracao
    ? `R$ ${precoFracao}${precoCentavos ? ',' + precoCentavos : ''}`
    : '';

  const precoAntigoFracao = $('.ui-pdp-price__original-value .andes-money-amount__fraction').first().text().trim();
  const precoAntigoCentavos = $('.ui-pdp-price__original-value .andes-money-amount__cents').first().text().trim();
  const precoAntigo = precoAntigoFracao
    ? `R$ ${precoAntigoFracao}${precoAntigoCentavos ? ',' + precoAntigoCentavos : ''}`
    : '';

  const imagem =
    $('.ui-pdp-gallery img.ui-pdp-image').first().attr('data-zoom') ||
    $('.ui-pdp-gallery img.ui-pdp-image').first().attr('src') ||
    '';

  // Breadcrumb: ex. "Eletrodomésticos > Fritadeiras > Air Fryer"
  const breadcrumbTexto = $('.andes-breadcrumb__item a')
    .map((_, el) => $(el).text().trim())
    .get()
    .join(' ');
  const categoria = mapearCategoria(breadcrumbTexto || titulo);

  // Descrição: parágrafos da seção de descrição do ML
  const descricao = $('.ui-pdp-description__content p')
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean)
    .join('\n')
    .substring(0, 1000);

  return { titulo, preco, precoAntigo, imagem, categoria, descricao };
}

/**
 * Faz scraping de produto da Amazon
 * @param {string} url
 * @returns {Promise<{titulo, preco, precoAntigo, imagem}>}
 */
async function scrapeAmazon(url) {
  const { data } = await axios.get(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept-Language': 'pt-BR,pt;q=0.9',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    timeout: 15000,
  });
  const $ = cheerio.load(data);

  const titulo = $('#productTitle').text().trim();

  const preco =
    $('.a-price[data-a-color="price"] .a-offscreen').first().text().trim() ||
    $('#priceblock_ourprice').text().trim() ||
    $('#priceblock_dealprice').text().trim();

  const precoAntigo =
    $('.a-text-strike .a-offscreen').first().text().trim() ||
    $('#priceblock_was_price').text().trim();

  const imagem = $('#landingImage').attr('src') || '';

  // Breadcrumb Amazon: ex. "Casa e Cozinha > Eletrodomésticos > Fritadeiras"
  const breadcrumbTexto = $('#wayfinding-breadcrumbs_feature_div .a-link-normal')
    .map((_, el) => $(el).text().trim())
    .get()
    .join(' ');
  const categoria = mapearCategoria(breadcrumbTexto || titulo);

  // Descrição: feature bullets ou bloco de descrição da Amazon
  const bulletItems = $('#feature-bullets .a-list-item')
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean);
  const descricao = (bulletItems.length
    ? bulletItems.join('\n')
    : $('#productDescription p').map((_, el) => $(el).text().trim()).get().join('\n')
  ).substring(0, 1000);

  return { titulo, preco, precoAntigo, imagem, categoria, descricao };
}

/**
 * Resolve um link encurtado (shp.ee) seguindo os redirects até a URL final
 * @param {string} url
 * @returns {Promise<string>} URL final após redirects
 */
async function resolverRedirect(url) {
  const res = await axios.get(url, {
    headers: { 'User-Agent': USER_AGENT },
    maxRedirects: 10,
    timeout: 10000,
  });
  return res.request?.res?.responseUrl || res.config?.url || url;
}


/**
 * Faz scraping de produto da Shopee via JSON-LD (funciona com Googlebot UA)
 * @param {string} url - pode ser shp.ee ou shopee.com.br
 * @returns {Promise<{titulo, preco, precoAntigo, imagem, categoria}>}
 */
async function scrapeShopee(url) {
  // Resolve link encurtado se necessário
  const urlFinal = /shp\.ee/i.test(url) ? await resolverRedirect(url) : url;

  const { data } = await axios.get(urlFinal, {
    headers: {
      // Googlebot faz a Shopee retornar HTML com JSON-LD completo (nome, preço, imagem, breadcrumb)
      'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      'Accept-Language': 'pt-BR,pt;q=0.9',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    timeout: 15000,
  });

  const $ = cheerio.load(data);
  let productLd = null;
  let breadcrumbLd = null;

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const obj = JSON.parse($(el).html());
      if (obj['@type'] === 'Product') productLd = obj;
      if (obj['@type'] === 'BreadcrumbList') breadcrumbLd = obj;
    } catch (_) {}
  });

  const titulo = productLd?.name || $("meta[property='og:title']").attr('content')?.replace(/ \| Shopee.*$/, '') || '';
  const imagem = productLd?.image || $("meta[property='og:image']").attr('content') || '';

  // Shopee pode retornar Offer (price) ou AggregateOffer (lowPrice/highPrice)
  const offers = productLd?.offers;
  const precoRaw = offers?.price || offers?.lowPrice;
  const preco = precoRaw ? `R$ ${parseFloat(precoRaw).toFixed(2).replace('.', ',')}` : '';

  // Shopee não expõe preço antigo no JSON-LD — campo fica vazio
  const precoAntigo = '';

  // Categoria real da Shopee: breadcrumb[0]=Home, [1]=categoria, [2]=subcategoria
  const itens = breadcrumbLd?.itemListElement || [];
  const categoriaShopee = itens[2]?.item?.name || itens[1]?.item?.name || '';
  const categoria = categoriaShopee || mapearCategoria(titulo);

  // Descrição da Shopee via JSON-LD (campo description do Product)
  const descricao = (productLd?.description || '')
    .replace(/<[^>]*>/g, '')  // remove tags HTML se houver
    .trim()
    .substring(0, 1000);

  console.log('[Scraper] Shopee resultado:', { titulo, preco, precoAntigo, categoria, descricao: descricao.substring(0, 80) });
  return { titulo, preco, precoAntigo, imagem, categoria, descricao };
}

/**
 * Scraping por plataforma
 * @param {string} plataforma
 * @param {string} url
 * @returns {Promise<{titulo, preco, precoAntigo, imagem, categoria}>}
 */
async function scrapeProduto(plataforma, url) {
  switch (plataforma) {
    case 'mercadolivre':
      return scrapeMercadoLivre(url);
    case 'amazon':
      return scrapeAmazon(url);
    case 'shopee':
      return scrapeShopee(url);
    default:
      throw new Error(`Plataforma desconhecida: ${plataforma}`);
  }
}

module.exports = { detectarPlataforma, scrapeProduto };
