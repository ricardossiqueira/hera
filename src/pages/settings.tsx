import { PageHeading } from "@/components/page-heading";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AppSettings() {
  const baseUrl = import.meta.env.VITE_GATEWAY_URL?.trim();
  return (
    <>
      <PageHeading title="Configurações" description="Esta versão recebe a URL da API apenas pelo ambiente de execução." />
      <Card>
        <CardHeader><CardTitle>API do gateway</CardTitle></CardHeader>
        <CardContent>
          <p className="break-all font-mono text-sm text-primary">{baseUrl || "VITE_GATEWAY_URL não configurada"}</p>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
            Para alterar o destino, atualize VITE_GATEWAY_URL em .env.local e reinicie o servidor Vite. Não coloque credenciais em variáveis VITE_*.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
