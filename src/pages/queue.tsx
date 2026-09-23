import { Link } from "@tanstack/react-router";
import { PageHeading } from "@/components/page-heading";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function Queue() {
  return (
    <>
      <PageHeading title="Fila" description="A observabilidade detalhada da outbox ainda será exposta por uma API futura." />
      <Card>
        <CardHeader><CardTitle>Ainda não disponível</CardTitle></CardHeader>
        <CardContent>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            A API atual fornece somente contadores globais. Ela não expõe itens, payloads, falhas por device ou histórico consultável, então esta tela não inventa dados.
          </p>
          <Link to="/" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">Ver contadores globais na visão geral</Link>
        </CardContent>
      </Card>
    </>
  );
}
