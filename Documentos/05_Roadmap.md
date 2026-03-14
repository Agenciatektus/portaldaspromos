# 05 — Roadmap de Implementação

---

## ✅ Fase 0 — Base n8n (Concluída)

- [x] n8n: scraping de produtos ML por categoria
- [x] n8n: geração de links afiliados via API interna ML
- [x] n8n: escrita e limpeza automática da planilha
- [x] Google Drive: estrutura de pastas criada
- [x] WhatsApp: grupo "Portal de Promos | Shopee e +" criado

---

## ✅ Fase 1 — Infraestrutura (Concluída)

- [x] Criar email Google dedicado ao canal
- [x] Criar canal YouTube
- [x] Ativar YouTube Data API v3 no Google Cloud Console
- [x] Gerar OAuth credentials (Client ID + Secret + Refresh Tokens)
- [x] Adicionar aba "Vídeos" na planilha (colunas A:N)
- [x] Estrutura de pastas Drive: Aguardando Publicação + Videos Publicados

---

## ✅ Fase 2 — Automação de Publicação (Concluída)

- [x] Portal web (`public/index.html`) para adicionar vídeos à fila
- [x] Scraping automático de produto ao colar link (ML, Amazon, Shopee)
- [x] Geração de link afiliado (ML cookie, Amazon SiteStripe, Shopee GraphQL)
- [x] `scraper.js` — título, preço, preço antigo, categoria, descrição (A:N)
- [x] `affiliate.js` — link afiliado ou `""` se não configurado (nunca URL original)
- [x] `sheets.js` — inserirNaFila (A:N), getPendingVideos, markAsPublished/Error
- [x] `drive.js` — downloadVideo, renameFile, moveToPublished
- [x] `youtube.js` — uploadShort + OAuth local (porta 8081)
- [x] `claude.js` — geração de metadados por template local (sem Claude API)
- [x] `whatsapp.js` — vídeo + legenda aleatória (750+ combinações) via Evolution API
- [x] `index.js` — cron 30 min + orquestração completa do pipeline
- [x] Log em `logs/app.log` com timestamp
- [x] Renomeação do arquivo no Drive após publicação (`{slug}-{plataforma}-{data}.mp4`)
- [x] Movimentação para "Videos Publicados" após publicação
- [x] Dockerfile + .env.example para deploy no Coolify

**Pipeline completo:** Formulário web → Planilha (Pendente) → Download Drive → YouTube Short → WhatsApp → Planilha (Postado) → Drive renomeado

---

## 🔵 Fase 3 — Instagram + WhatsApp Oficial (Mês 2)

- [ ] Criar conta Instagram profissional
- [ ] Vincular ao Facebook Page (necessário para API)
- [ ] Configurar Meta Business Suite
- [ ] Solicitar acesso à WhatsApp Business Cloud API
- [ ] Implementar `instagram.js` (Reels via Graph API)
- [ ] Migrar WhatsApp de Evolution API para API oficial
- [ ] Criar templates de mensagem aprovados pelo Meta
- [ ] Testes end-to-end com 10 publicações reais

**Resultado esperado:** Publicação simultânea em YouTube + Instagram + WhatsApp.

---

## 🟣 Fase 4 — Shopee Afiliado via n8n + Escala (Mês 3+)

- [ ] Criar workflow n8n equivalente para Shopee (busca de produtos)
- [ ] Configurar `SHOPEE_APP_ID` + `SHOPEE_SECRET` no `.env`
- [ ] Testar geração de link afiliado Shopee (`affiliate.js` já implementado)
- [ ] Dashboard de métricas (cliques por produto, plataforma)
- [ ] A/B test automático de títulos
- [ ] Agendamento inteligente por horário de pico
- [ ] Automação de criação de vídeos (CapCut / Canva API)

---

## Manutenção Recorrente

| Tarefa | Frequência | Como fazer |
|--------|------------|------------|
| Renovar cookie ML afiliado | A cada 2-4 semanas | DevTools → Application → Cookies → copiar `cookie` |
| Renovar cookie Amazon afiliado | A cada 2-4 semanas | DevTools → Application → Cookies → copiar `cookie` |
| Verificar scraping ML | Semanal | Colar link no portal e conferir campos preenchidos |
| Checar quota YouTube API | Mensal | Google Cloud Console → quotas |
| Verificar instância Evolution API | Semanal | `npm run test:whatsapp` |
