# 03 — Análise do Workflow n8n (Mercado Livre)

## Status: ✅ ATIVO E FUNCIONANDO

---

## Fluxo Completo

```
Schedule Trigger (6h)
  → Get rows - Cat ML         (lê categorias da planilha)
  → Loop Over Items            (processa 1 categoria por vez)
  → Filter (STATUS = Ativo)   (pula categorias desativadas)
  → HTTP Request               (scraping da página ML)
  → HTML Extractor             (extrai dados dos produtos)
  → Split Out                  (separa em itens individuais)
  → Code JS (slice 15)         (limita 15 produtos/categoria)
  → Edit Fields                (injeta cookie + tag afiliado)
  → Gerar Link Afiliado        (POST para API ML)
  → Append Produtos ML         (salva na planilha)
  → Wait (2s)                  (evita rate limit)
  → (volta ao Loop)

Schedule Trigger2 (fim do dia)
  → Clear sheet - Produtos ML  (limpa para nova raspagem amanhã)
```

---

## Detalhamento dos Nodes Principais

### Node: Edit Fields
Injeta duas variáveis no contexto:
- `tag_afiliado`: `agencia_tektus`
- `cookie`: string longa de sessão do ML Afiliados

### Node: Gerar Link Afiliado
**POST** `https://www.mercadolivre.com.br/affiliate-program/api/v2/affiliates/createLink`

Headers necessários:
```
Cookie: {valor do cookie}
Origin: https://www.mercadolivre.com.br
Referer: https://www.mercadolivre.com.br/afiliados/linkbuilder
User-Agent: Mozilla/5.0 ...
Content-Type: application/json
```

Body:
```json
{
  "urls": ["<url do produto>"],
  "tag": "agencia_tektus"
}
```

Retorna: `urls[0].short_url` → link afiliado curto

### Node: HTML Extractor
Extrai via CSS selectors:
- `titulo`: `.andes-card.poly-card .poly-component__title`
- `link`: mesma classe, atributo `href`
- `imagem`: `img.poly-component__picture`, atributo `src`
- `promo`: `.andes-card.poly-card .poly-price__current`
- `preco_atual`: `.poly-price__current .andes-money-amount`
- `preco_antigo`: `s.andes-money-amount--previous`

---

## ⚠️ Ponto Crítico: Cookie de Sessão

O cookie é uma string de autenticação da sessão no ML Afiliados.
**Cookies expiram** — geralmente em dias ou semanas.

**Sintoma de expiração:** O node "Gerar Link Afiliado" vai começar a retornar erros ou `short_url` vazio.

**Como renovar:**
1. Logar no ML Afiliados no navegador (mercadolivre.com.br/afiliados)
2. Abrir DevTools (F12) → aba Network
3. Fazer qualquer ação na página
4. Copiar o header `Cookie` de qualquer requisição
5. Colar no node "Edit Fields" no n8n

**Melhoria recomendada:** Adicionar node de verificação após "Gerar Link Afiliado".
Se `short_url` vier vazio → enviar alerta no WhatsApp avisando que o cookie expirou.

---

## Estrutura da Aba Cat ML (planilha)

| Coluna | Conteúdo |
|--------|----------|
| CATEGORIAS | Nome da categoria (ex: Eletrônicos) |
| LINK | URL de busca no ML para scraping |
| STATUS | `Ativo` ou `Inativo` |

---

## Estrutura da Aba Produtos ML (planilha)

Preenchida automaticamente, limpa ao fim do dia.

| Coluna | Preenchido por |
|--------|---------------|
| TITULO | n8n (HTML scraping) |
| IMAGEM | n8n (HTML scraping) |
| LINK PRODUTO | n8n (HTML scraping) |
| LINK AFILIADO | n8n (API ML Afiliados) |
| PREÇO ATUAL | n8n (HTML scraping) |
| PREÇO ANTIGO | n8n (HTML scraping) |
| PROMO | n8n (HTML scraping) |
| CATEGORIA | n8n (loop) |
| ENVIADO | `FALSE` → `TRUE` após publicar |
