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
