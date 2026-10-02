# Frente C — Gateway Web v2

## Estado atual

- 2026-10-01 — Início da implementação. A especificação `DEVICE_PLATFORM_V2_IMPLEMENTATION.md` foi revisada e o front-end atual ainda depende de APIs/fluxos v1 (templates, rotas e manifests manuais).
- 2026-10-01 — Contrato provisório concluído em `src/api/device-v2.ts` e documentado em `docs/device-v2-api.md`. Inclui tipos de manifest v2, discovery, registro, devices e automações, além de fixtures determinísticos de LED/CYD/Orange Pi.
- 2026-10-01 — Discovery inbox e fluxo de registro concluídos (`/devices/discovery`). A confirmação mostra identidade, hash, confiança e interface antes de registrar; o navegador não manipula segredos.
- 2026-10-01 — Listagem e detalhe de devices agora são projeções do binding v2 e do manifest observado, sem templates, migração manual ou ramificações por hardware.
- 2026-10-01 — Editor de automação v2 concluído: seleciona source/output, evento quando aplicável, JSONLogic opcional, proteção contra replay de `state`, target/command e parâmetros fixos. Todas as opções derivam do manifest registrado.
- 2026-10-01 — Testes de contrato de API v2 adicionados para fixtures independentes e RPC remoto sem segredos.
- 2026-10-01 — Validação concluída: `npm test` passou com 35 testes em 5 arquivos; `npm run build` passou. O build relata apenas o aviso preexistente/esperado de bundle JavaScript acima de 500 kB.

## Contrato a implementar pela Frente B

- Serviço `iot.gateway.api.v2.DevicePlatformService`, documentado em `docs/device-v2-api.md`.
- Os nomes de campos estão em camelCase no transporte da Web; manifest conserva os nomes canônicos snake_case definidos na especificação.
- Enquanto o serviço não existe, use `VITE_DEVICE_V2_MOCKS=true` (ou não configure URL de gateway) para exercitar LED, CYD e Orange Pi.
- O endpoint de registro retorna passos de pairing, aceitação de manifest, binding/ACL, provisionamento e ativação. Nunca retorna senha MQTT.

## Resultado

Vertical slice da Frente C pronta para integração com a Frente B. Não houve alterações em `iot-gateway` ou `iot-device-core`.

## Escopo desta frente

- Discovery inbox e registro orientado pelo manifest observado.
- Detalhe de device com interface `publish`/`subscribe` derivada.
- Editor de automação `trigger → condition → action`, filtrado por interfaces declaradas.
- Mocks determinísticos enquanto os endpoints do gateway não existem.

## Não alterado

- `iot-gateway` e `iot-device-core` estão fora do escopo desta frente.
- Nenhuma credencial MQTT é exibida, persistida ou enviada pelo navegador.
