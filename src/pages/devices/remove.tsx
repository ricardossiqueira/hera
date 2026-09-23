import { useState } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";
import { removeDevice } from "@/api/gateway";
import { PageHeading } from "@/components/page-heading";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGateway } from "@/context/gateway-context";

export function RemoveDevice() {
  const { deviceId } = useParams({ from: "/devices/$deviceId/remove" });
  const { devices, refreshDevices } = useGateway();
  const navigate = useNavigate();
  const device = devices.data?.find((item) => item.id === deviceId);
  const [confirmation, setConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  if (!device) return <Card><CardContent><p className="text-destructive">Dispositivo não encontrado. Atualize a lista e tente novamente.</p></CardContent></Card>;

  const remove = async () => {
    setSubmitting(true);
    setError(undefined);
    try {
      await removeDevice(device.id);
      void refreshDevices();
      await navigate({ to: "/devices" });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível remover o dispositivo.");
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHeading
        title={"Remover: " + device.id}
        description="Esta ação revoga a credencial MQTT, remove o dispositivo da configuração e reinicia brevemente o gateway."
        action={<Button variant="outline" asChild><Link to="/devices/$deviceId" params={{ deviceId }}>Cancelar</Link></Button>}
      />
      <Card className="max-w-xl border-destructive/30">
        <CardContent>
          <Alert variant="destructive">
            <TriangleAlert />
            <AlertTitle>Ação destrutiva</AlertTitle>
            <AlertDescription>
              Digite <code className="text-destructive">{device.id}</code> para confirmar a remoção definitiva.
            </AlertDescription>
          </Alert>
          <div className="mt-4 space-y-1.5">
            <Label htmlFor="confirm-id">Confirmar ID do dispositivo</Label>
            <Input id="confirm-id" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
          </div>
          {error ? (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <div className="mt-5">
            <Button variant="destructive" disabled={submitting || confirmation !== device.id} onClick={() => void remove()}>
              {submitting ? "Removendo…" : "Remover dispositivo"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
