import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'reset'>('login');
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast({ title: "Error de autenticación", description: error.message, variant: "destructive" });
    }
    setLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Correo enviado", description: "Revise su bandeja de entrada para restablecer la contraseña." });
      setMode('login');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Sparkles size={28} className="text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-black text-foreground">HOGAR BELÉN</h1>
          <p className="text-sm text-muted-foreground mt-1">Buesaco S.A.S. • Sistema de Gestión</p>
        </div>

        <div className="bg-card border border-border rounded-3xl p-8 shadow-sm">
          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Correo</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                  placeholder="usuario@hogarbelen.com"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Contraseña</label>
                <div className="relative mt-1">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-ring focus:outline-none pr-12"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-primary-foreground py-3 rounded-xl text-sm font-black uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50 min-h-[48px]"
              >
                {loading ? "Ingresando..." : "Ingresar"}
              </button>
              <button
                type="button"
                onClick={() => setMode('reset')}
                className="w-full text-xs text-primary font-bold hover:underline"
              >
                ¿Olvidó su contraseña?
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <p className="text-sm text-muted-foreground mb-4">
                Ingrese su correo y le enviaremos un enlace para restablecer su contraseña.
              </p>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Correo</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-primary-foreground py-3 rounded-xl text-sm font-black uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50 min-h-[48px]"
              >
                {loading ? "Enviando..." : "Enviar enlace"}
              </button>
              <button
                type="button"
                onClick={() => setMode('login')}
                className="w-full text-xs text-primary font-bold hover:underline"
              >
                Volver al login
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-[10px] text-muted-foreground mt-6">
          Hogar Belén • Gestión Segura • Hecho en Colombia 🇨🇴
        </p>
      </div>
    </div>
  );
};

export default Login;
