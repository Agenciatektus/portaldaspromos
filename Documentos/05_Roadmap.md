# 05 — Roadmap de Implementação

---

## ✅ Fase 0 — Concluída

- [x] n8n: scraping de produtos ML por categoria
- [x] n8n: geração de links afiliados via API interna ML
- [x] n8n: escrita e limpeza automática da planilha
- [x] Google Drive: estrutura de pastas criada
- [x] WhatsApp: grupo "Portal de Promos | Shopee e +" criado

---

## 🔵 Fase 1 — Infraestrutura YouTube (Semana 1-2)

- [ ] Criar email Google dedicado ao canal
- [ ] Criar canal YouTube e definir nome, arte, descrição
- [ ] Ativar YouTube Data API v3 no Google Cloud Console
- [ ] Gerar OAuth credentials para o canal (Client ID + Secret + Refresh Token)
- [ ] Fazer upload manual do primeiro vídeo para testar
- [ ] Adicionar abas VIDEOS e REGRAS_CONTEUDO na planilha
- [ ] Definir nome do canal e identidade visual

**Resultado esperado:** Canal criado e pronto para receber uploads programáticos.

---

## 🟠 Fase 2 — Claude Code: Automação de Publicação (Semana 3-4)

- [ ] Criar projeto `canal-ofertas-claude/` com estrutura de arquivos
- [ ] Implementar `drive.js` (listar, baixar, mover)
- [ ] Implementar `sheets.js` (buscar produto por linha, marcar enviado)
- [ ] Implementar `claude.js` (geração de metadados com IA)
- [ ] Implementar `youtube.js` (upload YouTube Short)
- [ ] Implementar `whatsapp.js` (Evolution API — mensagem no grupo)
- [ ] Implementar `index.js` (cron de 30 min + orquestração)
- [ ] Testar pipeline completo com 1 vídeo real
- [ ] Sistema de logs e alertas de erro
- [ ] Documentar como rodar o projeto localmente

**Resultado esperado:** Colocar vídeo na pasta → publicar automaticamente no YouTube + WhatsApp.

---

## 🟡 Fase 3 — Instagram + WhatsApp Oficial (Mês 2)

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

## 🟣 Fase 4 — Shopee + Escala (Mês 3+)

- [ ] Criar workflow n8n equivalente para Shopee
- [ ] Adicionar aba Cat Shopee na planilha
- [ ] Avaliar automação de criação de vídeos (CapCut / Canva API)
- [ ] Dashboard de métricas (cliques por produto, plataforma)
- [ ] A/B test automático de títulos
- [ ] Geração de thumbnail automática (Sharp/Canvas)
- [ ] Agendamento inteligente por horário de pico

---

## Checklist "O que fazer AGORA"

Antes de qualquer código, complete estas ações manualmente:

1. **Criar email Google dedicado** (ex: portaldepromos@gmail.com)
2. **Criar canal YouTube** com esse email
3. **Habilitar YouTube Data API v3** no Google Cloud Console
4. **Gerar credenciais OAuth** para o canal
5. **Colocar um vídeo de teste** na pasta "Aguardando Publicação" do Drive
   - Nome no padrão: `3_fone-bluetooth.mp4` (linha 3 da aba Produtos ML)
6. **Adicionar abas** VIDEOS e REGRAS_CONTEUDO na planilha
7. **Compartilhar credenciais** com Claude Code para iniciar o desenvolvimento

---

## O que o Claude Code vai precisar de você para iniciar

| Item | Descrição |
|------|-----------|
| JSON do Service Account | Com acesso a Drive + Sheets + YouTube |
| API Key Anthropic | Para geração de metadados com IA |
| Vídeo de teste no Drive | Nomeado no padrão `{linha}_slug.mp4` |
| YouTube OAuth configurado | Client ID + Secret + Refresh Token |

> Não precisa de senhas — tudo via OAuth e tokens de API, sem risco.

---

## Alerta de Manutenção Recorrente

| Tarefa | Frequência | Como fazer |
|--------|------------|------------|
| Renovar cookie do ML (n8n) | A cada 2-4 semanas | DevTools → copiar header Cookie |
| Verificar scraping ML | Semanal | Rodar n8n manualmente e checar planilha |
| Checar quota YouTube API | Mensal | Google Cloud Console → quotas |
| Revisar templates de conteúdo | Mensal | Aba REGRAS_CONTEUDO da planilha |
