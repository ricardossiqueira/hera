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
chave privada nas respostas. A UI usa fixtures quando `VITE_DEVICE_V2_MOCKS=true`
ou quando não há `VITE_GATEWAY_API_BASE_URL`; com uma URL configurada, exige os
RPCs acima.
