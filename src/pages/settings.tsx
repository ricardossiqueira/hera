import { PageHeading } from "@/components/page-heading";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getGatewayUrl } from "@/config";

export function AppSettings() {
  const baseUrl = getGatewayUrl();
  return (
    <>
      <PageHeading title="Configurações" description="Esta versão recebe a URL da API apenas pelo ambiente de execução." />
      <Card>
        <CardHeader><CardTitle>API do gateway</CardTitle></CardHeader>
        <CardContent>
          <p className="break-all font-mono text-sm text-primary">{baseUrl || "VITE_GATEWAY_URL não configurada"}</p>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
            No container, configure VITE_GATEWAY_URL e VITE_GATEWAY_API_BASE_URL no ambiente de execução. No Vite local, use .env.local. Não coloque credenciais em variáveis VITE_*.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
