# Hera

Painel operacional em pt-BR para um único `iot-gateway`: consulta de saúde,
configuração de dispositivos e comandos LED via a API Connect HTTP/JSON.

## Estado atual

A página inicial `/` apresenta a landing pública da Hera, com prévias
ilustrativas e navegação por recursos. Ela não consulta o gateway. O botão
“Abrir Hera” leva a `/overview`; todas as rotas operacionais continuam
protegidas pelas credenciais em memória. Links diretos de dispositivos,
Discovery e automações mantêm os endereços existentes e pedem login quando
necessário. A interface interna permanece independente dos estilos da landing.

O primeiro corte está implementado com React, TypeScript, Vite, TanStack Router
e Tailwind CSS:

- visão geral com status e telemetria, polling de 10 segundos e atualização manual;
- mini dashboard do Orange Pi monitorado pelo Theia: CPU, memória, disco, temperatura, carga e tempo ligado;
- contadores de cadastro (registrados, ativos e pendentes/com falha) e descoberta (descobertos, online e offline), agregados pelo `GetStatus` do gateway;
- telemetria compartilhada pelo contexto do Hera, consultada por dispositivo conforme o manifest;
- lista e detalhes de dispositivos, com navegação ao clicar na linha;
- Discovery independente em `/discovery`, com inspeção e registro de dispositivos;
- lista de automações com navegação pela linha e detalhes em canvas somente leitura;
- formulário de comando genérico por manifest (campos e schema vêm do gateway, sem hardcode de LED);
- diagnóstico de conectividade e página de fila em estado indisponível;
- configuração do endpoint por ambiente.

O estado `activeState` descreve a ativação no gateway. Online/offline vêm do
`status` de Discovery (`offline` versus os demais estados), incluindo dispositivos
ainda não registrados; não confirmam conexão MQTT. A visão geral consome
`GetStatus.devices` e `GetStatus.discovery`, atualizados a cada 10 segundos.
Gateways anteriores sem esses campos exibem contadores indisponíveis, sem
inventar zeros nem recalcular o resumo no navegador.

Os endereços antigos `/devices/discovery` e `/devices/discovery/$deviceUid`
redirecionam para Discovery. O nome do pacote e da interface é Hera;
as variáveis `VITE_GATEWAY_*` continuam identificando a conexão com o backend.

Edição e remoção de automações e confirmação de execução aguardam novas
RPCs no `iot-gateway`. Veja
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

### Fundo 3D da landing

A landing carrega Three.js separadamente e renderiza a Hera como 160 mil pontos,
concentrados no terço superior da estátua, com partículas flutuantes no fundo.
O enquadramento em três quartos permanece fixo durante a rolagem. Os pontos
têm espaçamento mínimo para evitar aglomerados; tamanho e luminância variam
com altura, profundidade e luz lateral, dando prioridade aos detalhes do rosto.
Uma superfície invisível escreve apenas profundidade para ocultar pontos
traseiros, sem desenhar uma estátua sólida. Em telas menores, a densidade é reduzida;
com movimento reduzido, a composição fica estática. Sem WebGL ou se o modelo
falhar, a página mantém seu fundo e continua navegável.

O original foi preservado em `assets/source/hera.glb` (ignorado pelo Git).
O arquivo servido é `public/models/hera-points.glb`, de aproximadamente 8,2 MB,
incluindo os pontos e a superfície de oclusão, sem as texturas do original.
Para regenerar após substituir o modelo:

```powershell
npm run prepare:hera
```

O crédito e a licença CC BY-NC 4.0 do modelo estão no rodapé e em
[assets/source/README.md](assets/source/README.md).

### Build e testes

```powershell
npm run build
npm test
```

A primeira integração real deve validar o preflight CORS e o fluxo de HTTP Basic
Auth entre o browser e o Orange Pi.

