import { useEffect, useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { setDeviceEnabled } from "@/api/gateway";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useGateway } from "@/context/gateway-context";

export function DeviceSettings() {
  const { deviceId } = useParams({ from: "/devices/$deviceId/settings" });
  const { devices, refreshDevices } = useGateway();
  const device = devices.data?.find((item) => item.id === deviceId);
  const [enabled, setEnabled] = useState(device?.enabled ?? false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (device) setEnabled(device.enabled); }, [device]);
  if (!device) return <Card><CardContent><p className="text-destructive">Dispositivo não encontrado. Atualize a lista e tente novamente.</p></CardContent></Card>;

  const save = async () => {
    setSubmitting(true);
    try {
      const response = await setDeviceEnabled(device.id, enabled);
      setEnabled(response.device.enabled);
      toast.success("Alteração aplicada. O gateway foi reiniciado brevemente.");
      void refreshDevices();
    } catch (requestError) {
      toast.error(requestError instanceof Error ? requestError.message : "Não foi possível alterar o dispositivo.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHeading
        title={"Configurações: " + device.id}
        description="Alterar esta opção reinicia brevemente o gateway para aplicar a configuração."
        action={<Button variant="outline" asChild><Link to="/devices/$deviceId" params={{ deviceId }}><ArrowLeft /> Voltar</Link></Button>}
      />
      <Card className="max-w-xl">
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="device-enabled" className="flex-col items-start gap-1">
              <span className="font-medium text-foreground">Dispositivo habilitado</span>
              <span className="text-sm font-normal text-muted-foreground">Um dispositivo desabilitado permanece cadastrado, mas deixa de participar do roteamento.</span>
            </Label>
            <Switch id="device-enabled" checked={enabled} onCheckedChange={setEnabled} />
          </div>
          <div className="mt-5">
            <Button disabled={submitting || enabled === device.enabled} onClick={() => void save()}>
              {submitting ? "Aplicando…" : "Salvar alteração"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
