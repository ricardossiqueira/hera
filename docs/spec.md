# Especificacao do gateway-web

## 1. Proposito

`gateway-web` sera um repositorio independente, com uma interface operacional
para um unico `iot-gateway`. O primeiro usuario e o proprio operador tecnico.
O produto comeca como cliente da API local existente e, em fases posteriores,
substitui completamente a UI HTML privilegiada em `iot-gateway-admin` na
porta 8081.

O app nao roda no Orange Pi: inicialmente e servido em `localhost` na maquina
do operador; no futuro podera viver em uma VPS conectada ao gateway por
WireGuard. A migracao para VPS nao faz parte deste escopo.

## 2. Objetivos e limites

### Objetivos

1. Mostrar se o gateway esta alcancavel e o estado basico do MQTT.
2. Listar a configuracao dos dispositivos cadastrados.
3. Abrir a pagina de um dispositivo e enviar comandos.
4. Oferecer controle imediato de LED por `set_led`, inclusive em lote.
5. Preparar a navegacao para diagnostico, fila e historico, sem inventar
   dados que a API ainda nao possui.
6. Quando a API privilegiada existir, cadastrar ESP32 LED, alterar somente
   `enabled` e remover dispositivos, aposentando a UI HTML de 8081.

### Fora do escopo inicial

- Login proprio, sessoes, usuarios, RBAC, TLS publico ou acesso pela internet.
- Mais de um gateway por instancia do app.
- PWA/offline, internacionalizacao e navegadores legados.
- Graficos; primeiro usam-se cartoes, tabelas e detalhes expansiveis.
- Confirmacao de execucao no ESP32, agendamento, presets e historico de
  comandos.
- Devices sem `profile`. Novos devices deverao sempre ter profile conhecido.
- Edicao administrativa alem de `enabled` e rotacao de credenciais MQTT.
- Operacoes de escrita/reprocessamento/descarte na outbox.
- Exposicao de telemetria, estado, eventos, `command_result` ou conteudo da
  fila: serao especificados depois que houver instrumentacao/RPCs no gateway.

## 3. Decisoes de produto

| Tema | Decisao |
| --- | --- |
| Idioma e visual | pt-BR, dark mode simples e responsivo desde o inicio. |
| Comandos | Por dispositivo; LED com toggle que envia imediatamente. |
| Comando em lote | Selecionar varios LEDs e aplicar ligar/desligar. Nao detalhar resultado individual nesta fase. |
| Resultado atual | Informar `Comando enviado ao MQTT`; nunca alegar execucao pelo ESP32. |
| Saude | Indicador binario `Online` quando a API responde; `Offline` quando nao responde. Nao inferir presenca de ESP32. |
| Atualizacao | Botao de atualizar e polling de 10 segundos enquanto a pagina estiver visivel. |
| Diagnostico | Cartoes tecnicos e erros de chamadas da API; sem falhas persistidas por device por enquanto. |
| Fila/historico | Rota visivel, em modo indisponivel com explicacao ate as futuras RPCs. A diretriz de sete dias fica adiada. |
| Administracao | Cadastro por template `ESP32 LED`, edicao apenas de `enabled`, remocao com confirmacao digitando o ID. |
| Provisionamento | Operacao versionada: credencial + registry SQLite; a politica MQTT e aplicada sem restart. Falha parcial exige reconciliacao. |
| Segredo MQTT | Exibir `secrets.h` e senha exatamente uma vez, com botao de copia. |

## 4. Stack proposta

O app usara React + TypeScript + Vite + TanStack Router, com npm. A escolha de
TanStack Router substitui a hipotese inicial de usar Next.js: nao havera
servidor Next nem BFF no primeiro corte.

- **Interface:** Tailwind CSS e shadcn/ui, com tokens de dark mode simples.
- **Roteamento:** TanStack Router, rotas tipadas e parametros validados para
  `deviceId`.
- **Dados remotos:** `fetch` encapsulado em um cliente pequeno de Connect
  HTTP/JSON. Nao ha necessidade inicial de gerar cliente TypeScript a partir
  de `.proto`.
- **Estado:** estado de servidor no cliente, com polling encapsulado; estado
  local minimo para selecao de LEDs, toast e dialogos.
- **Testes:** Vitest para unidades e componentes; testes de integracao contra
  a camada de transporte. Nao criar mock server dedicado e nao incluir
  Playwright/E2E no MVP. Validar manualmente o fluxo integrado contra o
  Orange Pi real disponivel.

Uma iteracao de implementacao escolhera bibliotecas de dados/formularios se
elas se justificarem; nao sao pre-requisito desta spec.

## 5. Topologia, configuracao e seguranca inicial

```text
Browser em localhost
       |
       | fetch com HTTP Basic Auth + CORS com credenciais
       v
Orange Pi: Connect HTTP/JSON :8082
       |
       +-- DeviceService / GatewayService (atual)
       `-- DeviceAdminService (futuro, mesma porta publica)
```

O browser chama o Orange Pi diretamente. Nao existira proxy/BFF e a senha da
API nao deve entrar em arquivo de ambiente do frontend. O HTTP Basic Auth atual
e deliberadamente simples; o browser apresentara e mantera sua credencial em
cache para o host do gateway. Nesta fase, o app e acessivel apenas em
`localhost` da maquina do operador; nao ha controle adicional para outra
pessoa que use essa mesma maquina.

A URL e publica porque entra no bundle Vite:

```dotenv
VITE_GATEWAY_API_BASE_URL=http://192.168.x.y:8082
```

Nao incluir senha, usuario ou outros segredos em `VITE_*`.

### Requisito de CORS no iot-gateway

Antes de a UI ser utilizavel, a API deve implementar CORS com credenciais para
uma allowlist exata, nunca `*`. No desenvolvimento, a configuracao deve
permitir, no minimo:

- `http://localhost:5173`
- `http://127.0.0.1:5173`

Tambem deve permitir `POST`, `Content-Type`, `Authorization` e responder
corretamente ao preflight `OPTIONS`; respostas autenticadas devem incluir
`Access-Control-Allow-Credentials: true`. O endereco/porta real de producao
substituira ou se somara a essa allowlist quando houver deploy fora de
localhost.

### Spike obrigatorio de autenticacao

No primeiro marco tecnico, validar nos navegadores alvo que uma chamada
cross-origin autenticada com Basic Auth abre/reutiliza a autenticacao nativa
do browser de modo confiavel. Caso isso nao seja consistente, a alternativa
mais simples sera uma tela local que recebe a credencial somente em memoria e
monta `Authorization` nas chamadas; ela continua sem contas, sessoes nem RBAC.

## 6. Rotas e experiencia

| Rota | Estado inicial | Conteudo e comportamento |
| --- | --- | --- |
| `/` | Implementavel | Visao geral: Online/Offline, MQTT conectado, inicio/uptime, subscriptions, contadores de mensagens e outbox. Atualizar manualmente e polling a cada 10 s. |
| `/devices` | Implementavel | Tabela sem busca/filtros: ID, tipo, profile, habilitado e topicos. Permite selecionar varios LEDs para ligar/desligar em lote. |
| `/devices/$deviceId` | Implementavel para LED | ID, tipo, profile, habilitado e topicos. Se `profile=led.v1`, toggle imediato `set_led`. Outras profiles terao estado explicito de ainda nao suportadas. |
| `/devices/new` | Implementavel | Cadastro por template unico `ESP32 LED`; ID manual validado antes do envio. Mostra segredo uma vez apos sucesso. |
| `/devices/$deviceId/settings` | Implementavel | Alterar somente `enabled`, com confirmacao; a politica e aplicada sem reiniciar o gateway. |
| `/devices/$deviceId/remove` | Implementavel | Dialogo destrutivo; exige digitar o ID e explica revogacao da credencial. |
| `/queue` | Indisponivel inicialmente | Explica que a API atual so fornece contadores globais e que nao ha historico/itens para consultar. |
| `/diagnostics` | Parcial | Replica contadores tecnicos de status e mostra erros de conectividade/validacao observados pela sessao do browser. |
| `/settings` | Implementavel | Exibe a URL efetiva da API, derivada exclusivamente de ambiente; nao permite editar/persistir configuracao pela UI. |

### Feedback de comando

O toggle envia `PublishCommand` imediatamente. Durante a requisicao, o controle
fica indisponivel. Em sucesso, um toast diz `Comando enviado ao MQTT` e pode
mostrar o horario/`command_id`; em erro, mostra mensagem legivel e detalhes
tecnicos expansiveis. A interface nao otimiza o estado como se o LED tivesse
mudado, porque o contrato atual e fire-and-forget.

Em lote, o app envia um comando por device selecionado. O retorno visual nesta
fase e apenas um resumo agregado de envio, sem painel de resultado individual.

## 7. Contrato de API: disponivel agora

O cliente inicial usa JSON simples nos caminhos Connect existentes, sempre por
`POST` e `Content-Type: application/json`:

| Necessidade web | RPC atual | Observacao |
| --- | --- | --- |
| Lista de configuracao | `DeviceService.ListDevices` | Suficiente para a tabela e detalhes configuracionais. |
| Descoberta de comandos | `DeviceService.ListDeviceCommands` | No MVP confirma capacidade/profile; LED recebe UI especializada. |
| Toggle e lote LED | `DeviceService.PublishCommand` | Envia `type: "set_led"`, `parameters: {"on": boolean}`. Sucesso nao confirma execucao. |
| Saude geral | `GatewayService.GetStatus` | Fornece MQTT, inicio, subscriptions e contadores globais. |

`GetStatus` e a unica base atual para `/` e `/diagnostics`. Seus contadores
nao sao historico, nao sao segmentados por device e nao permitem inspecionar
mensagens da SQLite.

## 8. Lacunas de API e fases futuras

### 8.1 Administracao privilegiada

O browser nunca coordena escrita de YAML, alteracao de Mosquitto ou
`systemctl`. A `DeviceAdminService` roda em processo privilegiado,
reutiliza a logica administrativa do gateway e expoe operacoes de alto nivel
na mesma porta publica `:8082`.

Contrato implementado no `iot-gateway`:

```proto
service DeviceAdminService {
  rpc ProvisionDevice(ProvisionDeviceRequest) returns (ProvisionDeviceResponse);
  rpc SetDeviceEnabled(SetDeviceEnabledRequest) returns (SetDeviceEnabledResponse);
  rpc RemoveDevice(RemoveDeviceRequest) returns (RemoveDeviceResponse);
}

message ProvisionDeviceRequest {
  string device_id = 1;
  string template = 2; // inicialmente somente "esp32_led.v1"
}

message ProvisionDeviceResponse {
  Device device = 1;
  string mqtt_username = 2;
  string mqtt_password = 3; // segredo de exibicao unica; nunca registrar
  google.protobuf.Timestamp applied_at = 4;
}

message SetDeviceEnabledRequest {
  string device_id = 1;
  bool enabled = 2;
}

message SetDeviceEnabledResponse {
  Device device = 1;
  google.protobuf.Timestamp applied_at = 2;
}

message RemoveDeviceRequest { string device_id = 1; }
message RemoveDeviceResponse { google.protobuf.Timestamp applied_at = 1; }
```

O template `esp32_led.v1` cria `type: esp32`, `profile: led.v1`, `enabled:
true` e somente o topico `devices/<id>/command` nesta primeira fase. A API
deve rejeitar IDs invalidos ou duplicados e nunca criar device sem profile.

`ProvisionDevice` e `RemoveDevice` sao transacoes operacionais. Em falha, a
implementacao deve registrar uma operacao recuperavel no registry SQLite e
reconciliar os efeitos ja aplicados. A resposta de erro deve identificar a
etapa que falhou sem vazar segredo. A politica MQTT e aplicada sem reiniciar o
gateway.

### 8.2 Uma porta publica e dois niveis de privilegio

O compositor de API ja atende a porta LAN `:8082`: ele roda com os privilegios
necessarios para `DeviceAdminService` e encaminha as RPCs operacionais para o
processo sandboxed por loopback. Assim, a mesma autenticacao Basic e a mesma
politica CORS envolvem todos os servicos publicos.

As rotas administrativas foram validadas fim a fim no Orange Pi em
21/09/2026. A UI 8081 foi removida em 22/09/2026 (Marco 4).

### 8.3 Observabilidade e fila

Para que `/queue` e o diagnostico por device se tornem reais, uma fase futura
deve primeiro persistir dados de observabilidade e depois expor uma API somente
de leitura. O contrato ainda nao sera congelado, mas deve cobrir:

- resumo de fila, capacidade, idade do item mais antigo e descarte;
- itens paginados/filtraveis por device, tipo e periodo;
- payloads permitidos para o operador local;
- falhas/rejeicoes com timestamp, device e causa;
- historico inicial de sete dias, quando houver modelo de retencao definido.

Nada disso e implementavel com a SQLite atual sem mudancas: ela e uma outbox
para dados habilitados ao futuro encaminhamento para VPS, nao um historico
operacional por device.

### 8.4 Matriz tela ↔ API

| Tela/capacidade | API atual | Nova API necessaria | Marco |
| --- | --- | --- | --- |
| Visao geral e diagnostico basico | `GetStatus` | Nenhuma | 1 |
| Lista e detalhe configuracional | `ListDevices` | Nenhuma | 1 |
| Toggle e lote de LED | `ListDeviceCommands`, `PublishCommand` | Nenhuma | 1 |
| Cadastro LED e segredo unico | `DeviceAdminService.ProvisionDevice` | Nenhuma | 2 |
| Alterar enabled | `DeviceAdminService.SetDeviceEnabled` | Nenhuma | 2 |
| Remover e revogar credencial | `DeviceAdminService.RemoveDevice` | Nenhuma | 2 |
| Fila, falhas e payloads | Somente contadores globais | API de observabilidade/read model | 3 |
| Confirmacao de execucao | Nao | Correlacao de `command_result` | Posterior |
| Outros profiles/formularios dinamicos | Descriptor ja existe | Metadados UX adicionais se necessarios | Posterior |

## 9. Marcos de entrega

### Marco 0 — Compatibilidade da integracao

- Adicionar CORS com allowlist exata ao `iot-gateway`.
- Validar CORS, preflight e Basic Auth cross-origin em Chrome, Edge, Firefox e
  Safari atuais, usando o Orange Pi real.
- Confirmar que erros Connect/HTTP sao traduziveis em mensagens operacionais.

### Marco 1 — Cliente operacional

- Inicializar o app conforme a stack desta spec.
- Entregar `/`, `/devices`, detalhe LED, toggle individual e lote,
  `/diagnostics` e as paginas de fila/configuracoes nos estados definidos.
- Usar somente as quatro RPCs existentes.
- Adicionar testes unitarios, de componentes e de integracao da camada HTTP.

### Marco 2 — Integracao administrativa e migracao gradual (concluido em 21/09/2026)

- `ProvisionDevice`, `SetDeviceEnabled` e `RemoveDevice` estao integrados
  ao `gateway-web`, com mensagens distintas para os codigos Connect.
- Cadastro LED, segredo de exibicao unica, habilitar/desabilitar e remocao foram
  entregues e validados fim a fim no Orange Pi real.
- Os criterios de aceite administrativos abaixo foram atendidos. A retirada da
  UI 8081 foi concluida no Marco 4.

### Marco 3 — Observabilidade historica

- Definir modelo de persistencia/retencao de sete dias e API somente leitura.
- Substituir o estado indisponivel de `/queue` por resumo, lista e detalhes.
- Evoluir `/diagnostics` para falhas por device e periodo.

### Marco 4 — Aposentadoria de 8081 (concluido em 22/09/2026)

- Operacao cotidiana migrada para `gateway-web`.
- `internal/admin` (lado `iot-gateway`) perdeu templates, handlers HTTP,
  Post/Redirect/Get e a porta 8081 - virou so o motor que
  `DeviceAdminService` ja consumia (ADR-015 em `docs/decisions.md` do
  `iot-gateway`). `iot-gateway-admin.service` continua existindo (ainda
  root, ainda a borda publica da API), so sem HTML proprio - sem `api:`
  configurado, agora recusa iniciar.
- Documentacao, deploy e runbooks do `iot-gateway` atualizados sem
  referencia ao painel HTML (`deploy/README.md`, `docs/api-v1.md`,
  `docs/security.md`, `docs/device-onboarding.md`,
  `docs/mosquitto-device-provisioning.md`).

### Marco 5 — Automações (concluído em 24/09/2026)

- `DeviceAdminService` ganhou `ListAutomationRules`, `CreateAutomationRule`,
  `UpdateAutomationRule`, `SetAutomationRuleEnabled` e `RemoveAutomationRule`
  (sem `Get`; a lista atende a frota de laboratório), e
  `DeviceService` ganhou `ListDeviceEvents` (espelha `ListDeviceCommands`
  pros eventos declarados no manifest).
- Nova página `/automations`: cria regra "evento → condição → ação" com
  formulário visual de condição (`ConditionBuilder`, um subconjunto de
  JSONLogic — `and`/`or`/comparações/`var`, sem aninhamento arbitrário),
  com fallback pra edição JSON crua quando a condição salva não cabe no
  formulário. Parâmetros da ação reaproveitam o mesmo formulário
  schema-driven que `/devices/$deviceId` já usa pra publicar comando
  (`ParametersForm`, extraído de `CommandForm`).
- A execução em si (casar evento com regra, avaliar condição, publicar a
  ação) é só do lado `iot-gateway` — a página apenas gerencia as regras,
  sem indicar quantas vezes uma regra já disparou (esse dado existe no
  SQLite mas não tem RPC ainda).
- **Atualização (mesmo dia):** `/automations` trocou o formulário +
  lista por um canvas React Flow (`@xyflow/react`) — um nó por
  dispositivo (`DeviceNode`), com handles de comando à esquerda e de
  evento à direita; cada regra existente é uma aresta entre dois
  dispositivos. Criar uma regra é arrastar uma conexão de um evento até
  um comando, o que abre `RuleDialog` já pré-preenchido (mesmo
  `ConditionBuilder`/`ParametersForm` reaproveitados); clicar numa aresta
  abre o mesmo dialog em modo detalhe (habilitar/desabilitar, remover).
  Sem posição de nó persistida e sem edição de regra — decisões já
  tomadas antes, só reforçadas pela interação de arrastar-para-criar.

## 10. Criterios de aceite

### Marco 1

- Em viewport mobile e desktop, o app renderiza somente em pt-BR e dark mode.
- Com a API acessivel, `/` mostra todos os campos de `GetStatus` e o estado
  Online; ao falhar, mostra Offline sem afirmar que ESP32s estao offline.
- Atualizacao manual e polling de 10 segundos funcionam sem sobrepor chamadas.
- `/devices` e `/devices/$deviceId` refletem a configuracao retornada pela API.
- Para `led.v1`, o toggle envia o payload canonico esperado e sucesso diz
  somente que o MQTT aceitou a publicacao.
- Lote envia um comando para cada LED selecionado e apresenta resumo agregado.
- `/queue` deixa claro que a capacidade ainda nao esta disponivel, sem dados
  falsos.
- A URL da API vem exclusivamente de `VITE_GATEWAY_API_BASE_URL`.
- Testes definidos passam e os fluxos principais sao validados contra o Orange
  Pi.

### Marco 2 (concluido em 21/09/2026)

- Nenhuma operacao privilegiada e feita pelo browser fora das RPCs de alto
  nivel.
- Cadastro fornece uma senha MQTT apenas na resposta de sucesso e a UI nao a
  registra em log, URL, storage persistente ou historico.
- Em falha de provisionamento, a configuracao e as credenciais ficam no estado
  anterior verificavel.
- Habilitar/desabilitar e remover reiniciam o gateway como parte do sucesso.
- Remocao exige que o operador digite o ID correto.
- A validacao fim a fim de cadastro, enable/disable, remocao, rollback e
  recuperacao apos reinicio foi concluida. A remocao da UI 8081 foi feita
  no Marco 4.

### Marco 4 (concluido em 22/09/2026)

- `iot-gateway-admin.service` nao serve mais HTML/templates; confirmado que
  a porta 8081 nao aceita mais conexoes.
- `gateway-web` continua operando `ProvisionDevice`/`SetDeviceEnabled`/
  `RemoveDevice` sem nenhuma mudanca de cliente - a remocao foi transparente.
- Documentacao e deploy do `iot-gateway` atualizados sem referencia ao
  painel HTML.
