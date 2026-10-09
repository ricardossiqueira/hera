# Hera

Painel operacional em pt-BR para um único `iot-gateway`: consulta de saúde,
configuração de dispositivos e comandos LED via a API Connect HTTP/JSON.

## Estado atual

A página inicial `/` apresenta a landing pública da Hera, com prévias
ilustrativas e navegação por recursos. Ela não consulta o gateway. O botão
“Abrir Hera” leva a `/overview`; todas as rotas operacionais continuam
protegidas pelas credenciais em memória. Links diretos de dispositivos,
Discovery e automações mantêm os endereços existentes e pedem login quando
necessário. A interface interna compartilha a paleta neutra da landing, com
navegação lateral no desktop e menu acessível no celular. A visão geral separa
cadastro, telemetria, descoberta e operação do gateway, preservando os últimos
dados quando uma consulta falha e identificando a indisponibilidade da API.

`PageHeading`, `PageSection`, `MetricCard` e `StatusIndicator` compõem a base
reutilizável das páginas internas. As métricas do Orange Pi usam os mesmos cards
da visão geral; progresso e estados operacionais mantêm sua semântica.

As listas de dispositivos, Discovery e automações seguem as prévias da landing:
contadores sem cards, linhas leves e, nas automações, a sequência evento →
condição → ação. `ResourceList`, `SummaryStrip` e seus elementos de linha
compartilham busca local, estados vazios, carregamento e falhas com dados anteriores.
Cada item é um link nativo para seus detalhes; os dados de identidade, interface
e estado continuam disponíveis. `HeraMark` é usado tanto na landing quanto no shell.

O monitor Theia fica na lateral direita do shell, fixo durante a rolagem e
alimentado pela mesma telemetria compartilhada, sem consultas adicionais.
Na visão geral permanece aberto; nas demais páginas pode ser recolhido,
preservando a escolha durante a navegação. Em telas menores, aparece como
uma faixa compacta abaixo do cabeçalho, com as seis métricas em três colunas
no celular e seis em telas intermediárias, sem rolagem interna. A faixa pode
ser recolhida em qualquer página no mobile.
A telemetria dos
demais dispositivos continua na área central da visão geral.

O primeiro corte está implementado com React, TypeScript, Vite, TanStack Router,
TanStack React Query, TanStack React Table e Tailwind CSS. React Query compartilha
consultas, controla o polling e invalida os dados afetados pelas mutações. O cache
fica em memória por sessão autenticada e é descartado ao sair. A tabela de
atividade recente usa React Table com filtros e paginação por cursor no gateway.
O favicon SVG acompanha a marca `HeraMark`.

Recursos implementados:

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
- Para login real: uma borda HTTPS servindo Hera e `/api` na mesma origem.

## Executar localmente

1. Copie `.env.example` para `.env.local`.
2. Substitua o IP pelo endereço fixo do Orange Pi.
3. Instale e inicie:

```powershell
npm install
npm run dev
```

O Vite normalmente usa `http://localhost:5173`; `HESTIA_UPSTREAM_URL` faz o
servidor de desenvolvimento encaminhar `/api` ao gateway. Para testar a
interface sem uma borda HTTPS, configure `VITE_DEVICE_V2_MOCKS=true` em
`.env.local`. Login real e cookie persistente exigem a origem HTTPS descrita
abaixo.

Hera usa a conta de operador do Hestia. Na primeira visita, o cadastro pede a
credencial admin atual uma única vez; depois, login e restauração da sessão
usam o cookie seguro emitido pelo Hestia. Não coloque senhas em `VITE_*`.
Para testar o cookie no navegador, sirva Hera e a API sob uma mesma origem
HTTPS; HTTP local direto serve apenas para desenvolvimento da interface.

## Executar o container

A imagem estática é publicada em `ghcr.io/ricardossiqueira/hera`. Quando
`HESTIA_UPSTREAM_URL` está definido, o Nginx do container encaminha `/api/`
ao Hestia e Hera usa `/api` para as duas APIs. Sirva o container através de
uma borda HTTPS, que é necessária para o cookie `Secure`:

```powershell
docker run --rm --name hera -p 8080:8080 `
  -e HESTIA_UPSTREAM_URL=http://192.168.15.100:8082 `
  ghcr.io/ricardossiqueira/hera:latest
```

Restrinja o acesso direto à porta HTTP do Hestia quando a borda HTTPS estiver
ativa. `HESTIA_UPSTREAM_URL` é uma URL interna usada pelo container; nenhuma
senha é configurada no Hera. O browser recebe apenas um cookie `HttpOnly` e
mantém o token CSRF em memória.

## Verificação

### Fundo 3D da landing

A landing carrega Three.js separadamente e renderiza a Hera como 128 mil pontos
(51,2 mil no celular), selecionados da amostra de 160 mil pontos do GLB,
concentrados no terço superior da estátua, com partículas flutuantes no fundo.
O enquadramento em três quartos tem zoom ampliado em 20% e permanece fixo,
sem parallax do mouse ou flutuação da estátua. A rolagem controla uma rotação
suave de até aproximadamente 14 graus. Os pontos
têm espaçamento mínimo para evitar aglomerados; tamanho e luminância variam
com altura, profundidade e luz lateral, dando prioridade aos detalhes do rosto.
Uma superfície invisível escreve apenas profundidade para ocultar pontos
traseiros, sem desenhar uma estátua sólida. Em telas menores, a densidade é reduzida;
com movimento reduzido, a composição fica estática. Sem WebGL ou se o modelo
falhar, a página mantém seu fundo e continua navegável. O header usa fundo
translúcido com blur; seções entram suavemente uma única vez e as prévias
transicionam na seleção. A preferência por movimento reduzido desativa
rotação e animações de entrada, mantendo o conteúdo visível.

O modelo usado nesta versão está em `assets/source/female_bust.obj`.
O arquivo servido é `public/models/female-bust-points.glb`, de aproximadamente 10 MB,
incluindo os pontos e a superfície de oclusão, sem texturas.
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

A primeira integração real deve validar cadastro inicial, login, restauração
da sessão e logout pelo proxy HTTPS até o Hestia no Orange Pi.

