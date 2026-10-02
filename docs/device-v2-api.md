# Contrato provisório da Web para device platform v2

Esta interface é usada pela vertical slice da Web enquanto a Frente B não está
pronta. O transporte é Connect/JSON sobre `POST` e todos os caminhos pertencem
a `iot.gateway.api.v2.DevicePlatformService`.

| RPC | Request | Response |
| --- | --- | --- |
| `ListDiscovery` | `{}` | `{ entries: DiscoveredDeviceV2[] }` |
| `RegisterDiscoveredDevice` | `{ deviceUid, deviceId }` | `{ device, steps }` |
| `ListDevices` | `{}` | `{ devices: RegisteredDeviceV2[] }` |
| `GetDevice` | `{ deviceId }` | `RegisteredDeviceV2` |
| `ListAutomationRules` | `{}` | `{ rules: AutomationRuleV2[] }` |
| `CreateAutomationRule` | `{ rule: AutomationRuleV2 }` | `{ rule: AutomationRuleV2 }` |

Os tipos completos estão em `src/api/device-v2.ts`. Nunca há senha MQTT ou
chave privada nas respostas. A UI usa fixtures somente quando
`VITE_DEVICE_V2_MOCKS=true`; em qualquer outro caso, exige os RPCs acima.

## Configuracao do transporte

O cliente v2 usa `VITE_GATEWAY_URL` como a raiz HTTP(S) do Gateway. Por
exemplo:

```dotenv
VITE_GATEWAY_URL=http://192.168.x.y:8082
```

Com essa variavel configurada, todas as chamadas usam `POST` para os RPCs
acima, com `Content-Type: application/json`, `credentials: include` e o
cabecalho Basic Auth mantido somente em memoria pelo app. A ausencia de URL e
um erro de configuracao; a UI nunca troca silenciosamente para dados falsos.

Fixtures so sao usados quando o desenvolvedor define explicitamente
`VITE_DEVICE_V2_MOCKS=true`. Esse modo nao deve ser usado contra um Gateway
real.
