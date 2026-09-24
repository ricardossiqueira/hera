# gateway-web

Painel operacional em pt-BR para um único `iot-gateway`: consulta de saúde,
configuração de dispositivos e comandos LED via a API Connect HTTP/JSON.

## Estado atual

O primeiro corte está implementado com React, TypeScript, Vite, TanStack Router
e Tailwind CSS:

- visão geral com polling de 10 segundos e atualização manual;
- lista e detalhe configuracional de dispositivos;
- formulário de comando genérico por manifest (campos e schema vêm do gateway, sem hardcode de LED);
- diagnóstico de conectividade e página de fila em estado indisponível;
- configuração do endpoint por ambiente.

Cadastro, edição de `enabled`, remoção, fila detalhada, telemetria e
confirmação de execução aguardam novas RPCs no `iot-gateway`. Veja
[docs/spec.md](docs/spec.md) para os contratos e marcos.

## Pré-requisitos

- Node.js 24+ e npm;
- Orange Pi acessível na rede;
- API do gateway habilitada;
- CORS no gateway permitindo a origem do Vite, com credenciais.

## Executar localmente

1. Copie `.env.example` para `.env.local`.
2. Substitua o IP pelo endereço fixo do Orange Pi.
3. Instale e inicie:

```powershell
npm install
npm run dev
```

O Vite normalmente usa `http://localhost:5173`. A API precisa permitir também
`http://127.0.0.1:5173` se o app for aberto por essa origem.

O navegador usa o HTTP Basic Auth atual do gateway. Não coloque usuário ou
senha em `VITE_*`: essas variáveis entram no bundle do navegador.

## Verificação

```powershell
npm run build
npm test
```

A primeira integração real deve validar o preflight CORS e o fluxo de HTTP Basic
Auth entre o browser e o Orange Pi.

