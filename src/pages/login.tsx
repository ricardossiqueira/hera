import { type FormEvent, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Eye, EyeOff, Server } from "lucide-react";
import { login, registerOperator, restoreSession } from "@/api/auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function Login({ needsRegistration, initialError }: { needsRegistration: boolean; initialError?: string }) {
  const [registering, setRegistering] = useState(needsRegistration);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!username || !password || pending) return;
    if (registering && password !== confirmation) { setError("As senhas não conferem."); return; }
    setPending(true);
    setError(undefined);
    try {
      if (registering) {
        await registerOperator(username, password, adminUsername, adminPassword);
        setRegistering(false);
        setAdminUsername("");
        setAdminPassword("");
      }
      await login(username, password);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível entrar.");
    } finally {
      setPending(false);
    }
  };

  return <div className="flex min-h-screen items-center justify-center bg-background px-4">
    <Card className="w-full max-w-sm">
      <CardHeader className="items-center text-center">
        <div className="mb-1 flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary"><Server className="size-5" /></div>
        <h1 className="text-lg font-semibold">{registering ? "Cadastrar operador" : "Entrar na Hera"}</h1>
        <p className="text-sm leading-6 text-muted-foreground">{registering
          ? "Crie a primeira conta usando a credencial admin do Hestia uma única vez."
          : "Entre com sua conta de operador. Sua sessão continuará após fechar o navegador."}</p>
      </CardHeader>
      <CardContent>
        {initialError ? <Alert variant="destructive" className="mb-4"><AlertDescription>{initialError} <Button variant="link" onClick={() => void restoreSession()}>Tentar novamente</Button></AlertDescription></Alert> : null}
        {error ? <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert> : null}
        <form onSubmit={(event) => void submit(event)} className="space-y-3">
          <div className="space-y-1.5"><Label htmlFor="username">Usuário</Label><Input id="username" autoFocus autoComplete="username" minLength={3} maxLength={64} required value={username} onChange={(event) => setUsername(event.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="password">Senha</Label><div className="relative">
            <Input id="password" type={showPassword ? "text" : "password"} autoComplete={registering ? "new-password" : "current-password"} minLength={registering ? 12 : undefined} required value={password} onChange={(event) => setPassword(event.target.value)} className="pr-9" />
            <button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-muted-foreground hover:text-foreground">{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>
          </div></div>
          {registering ? <>
            <div className="space-y-1.5"><Label htmlFor="confirmation">Confirmar senha</Label><Input id="confirmation" type="password" autoComplete="new-password" required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></div>
            <div className="border-t pt-4 text-sm text-muted-foreground">Credencial admin atual do Hestia para autorizar o cadastro</div>
            <div className="space-y-1.5"><Label htmlFor="admin-username">Usuário admin</Label><Input id="admin-username" autoComplete="off" required value={adminUsername} onChange={(event) => setAdminUsername(event.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="admin-password">Senha admin</Label><Input id="admin-password" type="password" autoComplete="off" required value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} /></div>
          </> : null}
          <Button type="submit" className="w-full" disabled={pending}>{pending ? "Aguarde…" : registering ? "Cadastrar e entrar" : "Entrar"}</Button>
          {needsRegistration && <Button type="button" variant="ghost" className="w-full" onClick={() => { setRegistering((value) => !value); setError(undefined); }}>{registering ? "Já tenho uma conta" : "Cadastrar primeira conta"}</Button>}
          <Link to="/" className="block pt-2 text-center text-sm text-muted-foreground hover:text-foreground">Voltar ao início</Link>
        </form>
      </CardContent>
    </Card>
  </div>;
}
