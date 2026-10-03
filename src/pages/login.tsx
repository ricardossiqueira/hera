import { type FormEvent, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Eye, EyeOff, Server } from "lucide-react";
import { setCredentials } from "@/api/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!username || !password) return;
    setCredentials(username, password);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="mb-1 flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Server className="size-5" />
          </div>
          <h1 className="text-lg font-semibold">Hera</h1>
          <p className="text-sm leading-6 text-muted-foreground">
            Informe a credencial HTTP Basic do gateway. Ela fica somente em
            memória nesta aba — não é salva, e você precisará informá-la de
            novo após recarregar a página.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="username">Usuário</Label>
              <Input
                id="username"
                autoFocus
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full">Entrar</Button>
            <Link to="/" className="block pt-2 text-center text-sm text-muted-foreground hover:text-foreground">Voltar ao início</Link>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
