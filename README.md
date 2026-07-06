# Projeto DIGITALENT

Este é um projeto [Next.js](https://nextjs.org) (bootstrapped com `create-next-app`) desenvolvido para fornecer funcionalidades de Teleprompter interativo, reconhecimento de voz e respostas com IA generativa (incluindo Text-to-Speech via voz nativa do navegador ou ElevenLabs) para eventos.

## Como Iniciar

Primeiro, inicie o servidor de desenvolvimento:

```bash
npm run dev
# ou
yarn dev
# ou
pnpm dev
# ou
bun dev
```

Abra [http://localhost:3000](http://localhost:3000) com o seu navegador para ver o resultado.

---

# Histórico de Desenvolvimento

## Sessão: 20 de Junho de 2026
**Funcionalidades Implementadas e Ajustes:**

1. **Ajuste na Escuta da IA (Voice Recognition):**
   - Corrigido o bug onde a IA ouvia, mas não processava.
   - Implementado um **Temporizador de Silêncio de 4 Segundos**: O sistema agora acumula o que o orador diz. Se o utilizador ficar 4 segundos em total silêncio, o microfone é pausado automaticamente e a pergunta/comando é enviada para o cérebro (backend) processar.
   - A palavra-chave "Digitalent" continua a forçar o envio imediato.

2. **Integração de Voz Nativa (Text-to-Speech):**
   - Substituída a simulação de tempo de fala por Síntese de Voz Real nativa do navegador (`window.speechSynthesis`).
   - O microfone do orador desliga automaticamente enquanto a IA fala, e religa automaticamente quando a IA se cala.

3. **Novo Painel de Configurações de Voz (Admin):**
   - Criado o menu lateral "Configuração Voz IA" no Admin Dashboard.
   - Adicionado o módulo `VoiceSettingsModule` que permite:
     - Selecionar um evento específico para configurar a voz (identidade vocal por evento).
     - Ajustar Velocidade, Tom (Pitch), Idioma (PT-PT ou PT-BR) e Género.
     - Inserir **API Key** e **Voice ID** do ElevenLabs.
     - Guardar configurações num formato JSON persistente no campo `personality` da tabela `events` no Supabase.
   - Adicionado um botão **"Testar Voz"** para gerar um áudio de demonstração na hora, ajudando o utilizador a validar chaves e permissões do ElevenLabs.

4. **Integração da API ElevenLabs (Backend):**
   - O endpoint `/api/ai/chat` lê o banco de dados. Se o evento tiver uma chave ElevenLabs e um Voice ID, o servidor chama a API REST do ElevenLabs e converte o texto da IA em áudio MP3 (codificado em Base64).
   - O áudio ultra-realista é reproduzido prioritariamente na tela do Teleprompter.
   - Implementado *Fallback Automático*: Se não houver ElevenLabs, ou se a chave der erro (ex: limite gratuito atingido), o Teleprompter ativa a Voz Nativa do sistema operativo com o tom/velocidade guardados.

## Próximos Passos (Para a Próxima Sessão):
- Revisar a estabilidade do fluxo de áudio ao vivo no telemóvel e no PC em ambientes reais de evento.
- Analisar novas funcionalidades solicitadas no painel.

---

## 🚀 Como Fazer o Deploy e Autenticar no Git (Resolução de Erros)

Sempre que perder a autenticação do Github e receber o Erro 403 (Permission Denied) ao tentar fazer `git push`, siga estes passos:

1. **Forçar Login no GitHub pelo Terminal:**
   Abra o seu terminal no VS Code (ou Powershell) e execute:
   ```bash
   git credential-manager github login
   ```
   *Isto abrirá uma janela do navegador para autorizar o repositório na sua conta.*

2. **Subir o Código (Push):**
   Após a autenticação ser bem sucedida, faça o push normal:
   ```bash
   git push
   ```

3. **Deploy Manual para a Vercel:**
   Se a compilação falhar na Vercel devido a pacotes (como a Nuvem de Palavras) com erros de "ERESOLVE" / Dependências, **use sempre a flag de legacy-peer-deps**. Execute o comando abaixo no seu terminal para forçar o deploy pela Vercel:
   ```bash
   npx vercel --prod --build-env NPM_CONFIG_LEGACY_PEER_DEPS=true
   ```

---

## Sessão: 27 de Junho de 2026
**Funcionalidades Implementadas e Ajustes:**

1. **Inteligência Artificial de Moderação Avançada de Q&A:**
   - Criada a rota de moderação inteligente (`qa-moderation/route.ts`) que analisa perguntas recebidas.
   - **Regras Estritas Aplicadas:** Rejeição de mensagens ofensivas/fora de tema, agrupamento de perguntas similares, e utilização natural do nome dos participantes, sem parecer robótico.
   - A IA agora gera dinamicamente uma frase de encerramento calorosa (*closing remark*) quando a fila de perguntas chega ao fim.

2. **Modo Automático vs Manual no Q&A:**
   - Adicionado o botão central de "Alternar Modo IA" no `ManageEventModule.tsx` (Painel Live Controller).
   - O Diretor/Administrador pode decidir, em tempo real, se as perguntas entram automaticamente (orientadas por voz) ou se são acionadas manualmente através de um clique no botão de transição.

3. **Rebranding e Ajustes Visuais:**
   - O nome do separador do navegador foi atualizado para **"Dj Gestão Eventos - Creat App"**.
   - O esquema de cor global (Tema Vercel/PWA) foi atualizado para azul-claro (`#38bdf8`).
   - O favicon principal foi substituído por um logotipo atualizado para combinar com a identidade visual atual.

4. **Correção de Deploys da Vercel (Build Time Erros):**
   - **Problema:** A Vercel cancelava as compilações (SSG/Pré-renderização) nas páginas e rotas de IA devido à falta de injeção das chaves `OPENAI_API_KEY` e `NEXT_PUBLIC_SUPABASE_URL` no momento do "build".
   - **Solução (Histórico para o futuro):** O uso de variáveis de ambiente estritas com o `!` no TypeScript (`process.env.OPENAI_API_KEY!`) no escopo global de rotas Next.js bloqueava o processo. Foi substituído em todo o projeto por "fallback keys" seguras (`|| 'dummy_key'`). Isso permite que o código seja compilado com sucesso, puxando as chaves verdadeiras em tempo de execução.

---

## Sessão: 06 de Julho de 2026
**Funcionalidades Implementadas e Correções Críticas (Vercel e Supabase):**

1. **Correção de Timeouts Severos na Nuvem (Vercel):**
   - **Problema:** A rota de Inteligência Artificial (`/api/ai/qa-moderation` e `/api/ai/tts`) falhava misteriosamente ao ser implantada na Vercel (Timeout HTML 504), encravando a interface do utilizador, enquanto em Localhost funcionava.
   - **Solução:** Forçada a inibição de Cache e execução estática pelo Next.js App Router através das diretivas de exportação globais: `export const dynamic = 'force-dynamic'` e elevação do tempo máximo de servidor `export const maxDuration = 60;`.
   - **Proteção UI:** Envolvidas todas as requisições (fetches) aos Endpoints de IA com blocos `try/catch` para impedir bloqueios visuais permanentes nas telas de Controlo e Q&A em caso de indisponibilidade da OpenAI ou ElevenLabs.

2. **Resolução de "Race Conditions" na Base de Dados:**
   - **Problema:** Ao iniciar o Bloco Q&A no "Painel de 3 Colunas" (`ManageEventModule`), o gatilho de fala da IA era enviado e imediatamente esmagado/reescrito pela próxima ordem de atualização sequencial.
   - **Solução:** Combinada as transições numa única requisição de atualização (Update) à coluna `personality` da tabela Supabase `events`. O painel ACE3 (Telão Q&A) deixou de omitir perguntas.

3. **Correção de Vazamento de Conexões (Realtime Drops):**
   - **Problema:** A página de projeção de público (`live-qa`) criava repetidamente um novo cliente local de Supabase (`createClient(...)`) a cada recarregamento da grelha de React (efeito re-render), levando à desconexão permanente ou perda de "Avisos em Tempo Real".
   - **Solução:** O ecrã cliente passou a usar exclusivamente a instância global (Singleton) partilhada em `@/utils/supabase/client`, mantendo uma assinatura Web-socket blindada.

4. **Novo Gerador e Exportador HD de QR Code:**
   - Construída ferramenta que processa em plano de fundo (HTML5 Canvas) e exporta um ficheiro limpo `.png` nativo em escala gigante (1000x1000px) garantindo altíssima qualidade sem desfoque quando os diretores enviam a Placa QR para as gráficas e ecrãs do palco principal. A funcionalidade está junto do botão "Copiar Link de Sala" no módulo de Gestão de Eventos.

5. **Resolução de Quedas Silenciosas do Realtime (WebSockets) na Vercel:**
   - **Problema:** O Ecrã do Painel de Perguntas (`live-qa`) conectava-se perfeitamente à base de dados no ambiente local (`localhost`), mas em produção (Vercel) falhava silenciosamente e deixava de receber atualizações em tempo real (como mudanças de orador ou gatilhos de voz da IA). O erro no console mostrava: `WebSocket connection to wss://... failed`.
   - **Solução (Histórico Crítico):** O erro ocorria devido a um espaço invisível ou caractere ausente no momento de copiar/colar a variável de ambiente `NEXT_PUBLIC_SUPABASE_ANON_KEY` no painel da Vercel. Como a chave vai na URL da requisição de upgrade do WebSocket (`?apikey=...`), qualquer erro de formatação corrompe o URL e força a rejeição imediata do servidor (CORS/Auth bypass rejection). Além disso, confirmou-se que o Supabase em produção exige que o Realtime seja explicitamente habilitado nas tabelas via SQL (`ALTER PUBLICATION supabase_realtime ADD TABLE...`).
