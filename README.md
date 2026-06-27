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
