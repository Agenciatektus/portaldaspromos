require('dotenv').config();
const axios = require('axios');
const crypto = require('crypto');

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

/**
 * Gera link de afiliado do Mercado Livre
 * @param {string} produtoUrl
 * @returns {Promise<string>} link encurtado com tag afiliado
 */
async function gerarLinkMercadoLivre(produtoUrl) {
  const cookie = process.env.ML_AFFILIATE_COOKIE;
  const tag = process.env.ML_AFFILIATE_TAG || 'agencia_tektus';

  if (!cookie) {
    console.warn('[Affiliate] ML_AFFILIATE_COOKIE não configurado — link de afiliado não gerado');
    return '';
  }

  const { data } = await axios.post(
    'https://www.mercadolivre.com.br/affiliate-program/api/v2/affiliates/createLink',
    { urls: [produtoUrl], tag },
    {
      headers: {
        Cookie: cookie,
        'Content-Type': 'application/json',
        'User-Agent': USER_AGENT,
        Origin: 'https://www.mercadolivre.com.br',
        Referer: 'https://www.mercadolivre.com.br/afiliados',
      },
      timeout: 10000,
    }
  );

  return data?.urls?.[0]?.short_url || '';
}

/**
 * Gera link de afiliado da Amazon via SiteStripe
 * @param {string} produtoUrl
 * @returns {Promise<string>} link encurtado amzn.to
 */
async function gerarLinkAmazon(produtoUrl) {
  const cookie = process.env.AMAZON_AFFILIATE_COOKIE;

  if (!cookie) {
    console.warn('[Affiliate] AMAZON_AFFILIATE_COOKIE não configurado — link de afiliado não gerado');
    return '';
  }

  const { data } = await axios.get(
    'https://www.amazon.com.br/associates/sitestripe/getShortUrl',
    {
      params: { longUrl: produtoUrl, marketplaceId: '526970' },
      headers: {
        Cookie: cookie,
        'User-Agent': USER_AGENT,
        Accept: 'application/json, text/javascript, */*; q=0.01',
        Origin: 'https://www.amazon.com.br',
        'x-requested-with': 'XMLHttpRequest',
      },
      timeout: 10000,
    }
  );

  return data?.shortUrl || '';
}

/**
 * Gera link de afiliado da Shopee via GraphQL API oficial
 * @param {string} produtoUrl
 * @returns {Promise<string>} offerLink (já é o link de afiliado)
 */
async function gerarLinkShopee(produtoUrl) {
  const appId = process.env.SHOPEE_APP_ID;
  const secret = process.env.SHOPEE_SECRET;

  if (!appId || !secret) {
    console.warn('[Affiliate] SHOPEE_APP_ID/SHOPEE_SECRET não configurados — link de afiliado não gerado');
    return '';
  }

  // Extrai shopId e itemId da URL: shopee.com.br/{slug}-i.{shopId}.{itemId}
  const match = produtoUrl.match(/-i\.(\d+)\.(\d+)/);
  const shopId = match?.[1];
  const itemId = match?.[2];

  const ts = Math.floor(Date.now() / 1000).toString();

  const query = `{
    productOfferV2(listType: 0, sortType: 2, limit: 1, page: 1${
      shopId && itemId ? `, shopId: ${shopId}, itemId: ${itemId}` : ''
    }) {
      nodes { itemId shopId offerLink }
    }
  }`;

  const payload = JSON.stringify({ query });
  const signature = crypto
    .createHash('sha256')
    .update(appId + ts + payload + secret)
    .digest('hex');

  const { data } = await axios.post(
    'https://open-api.affiliate.shopee.com.br/graphql',
    payload,
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `SHA256 Credential=${appId}, Timestamp=${ts}, Signature=${signature}`,
      },
      timeout: 10000,
    }
  );

  const offerLink = data?.data?.productOfferV2?.nodes?.[0]?.offerLink;
  if (!offerLink) console.warn('[Affiliate] Shopee API não retornou offerLink — link de afiliado não gerado');
  return offerLink || '';
}

/**
 * Roteador principal — detecta plataforma e gera link
 * @param {string} plataforma
 * @param {string} produtoUrl
 * @returns {Promise<string>}
 */
async function gerarLink(plataforma, produtoUrl) {
  switch (plataforma) {
    case 'mercadolivre':
      return gerarLinkMercadoLivre(produtoUrl);
    case 'amazon':
      return gerarLinkAmazon(produtoUrl);
    case 'shopee':
      return gerarLinkShopee(produtoUrl);
    default:
      return '';
  }
}

module.exports = { gerarLink };
