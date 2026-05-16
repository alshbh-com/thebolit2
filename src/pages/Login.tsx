import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Lock, Loader2 } from 'lucide-react';
import logo from '@/assets/logo.jpg';

export default function Login() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    setLoading(true);
    setError('');
    const result = await login(password);
    if (result.error) {
      setError(result.error);
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative neon orbs */}
      <div className="absolute top-[-15%] right-[-10%] w-[520px] h-[520px] rounded-full bg-secondary/25 blur-[130px] animate-orb" />
      <div className="absolute bottom-[-15%] left-[-10%] w-[460px] h-[460px] rounded-full bg-primary/25 blur-[120px] animate-orb" style={{ animationDelay: '2s' }} />

      <Card className="w-full max-w-sm glass-effect border-primary/30 shadow-glow relative z-10 scanline overflow-hidden">
        <div className="h-1 w-full gradient-neon" />
        <CardContent className="pt-8 pb-6 px-6">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="relative mx-auto w-24 h-24 mb-4">
              <div className="absolute inset-0 rounded-2xl gradient-neon blur-2xl opacity-70 animate-neon-pulse" />
              <img
                src={logo}
                alt="The Pilito"
                className="relative h-24 w-24 rounded-2xl object-cover shadow-glow"
              />
            </div>
            <h1 className="text-3xl font-display font-extrabold uppercase tracking-[0.15em] text-foreground neon-text">
              The Pilito
            </h1>
            <p className="text-[10px] font-mono-neon tracking-[0.3em] text-primary/80 mt-2 uppercase">
              // secured channel · v2.0
            </p>
            <div className="h-px w-3/4 mx-auto mt-3 bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
            <p className="text-sm text-muted-foreground mt-3">نظام إدارة الشحن</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="relative">
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
              <Input
                type="password"
                placeholder="ENTER ACCESS CODE"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 pr-10 text-base bg-input/70 border-primary/40 focus:border-primary focus:ring-primary/40 font-mono-neon tracking-widest placeholder:text-muted-foreground/60"
                dir="ltr"
                autoFocus
              />
            </div>

            {error && (
              <p className="text-sm text-destructive text-center bg-destructive/10 py-2 rounded-lg border border-destructive/30">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full h-12 text-base font-display font-bold uppercase tracking-[0.2em] gradient-neon text-primary-foreground hover:opacity-90 transition-opacity border-0 shadow-glow"
              disabled={loading}
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'تسجيل الدخول'}
            </Button>
          </form>

          {/* Credit */}
          <p className="mt-6 text-center text-[11px] text-muted-foreground leading-relaxed">
            تم صنع السيستم من شركة{' '}
            <span className="font-display tracking-widest text-secondary neon-text-magenta">دوبامين</span>{' '}
            للبرمجة <span className="text-muted-foreground/70">(الشبح سابقاً)</span>
            <span className="block mt-1 font-mono-neon tracking-widest text-primary" dir="ltr">
              <a href="https://wa.me/201061067966" target="_blank" rel="noopener noreferrer" className="hover:underline">
                01061067966
              </a>
            </span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
