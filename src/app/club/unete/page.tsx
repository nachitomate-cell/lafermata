'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { registrarNuevoMiembro } from '@/lib/puntos';

type Mode = 'welcome' | 'register' | 'login';

function Benefit({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xl">{icon}</span>
      <p className="text-sm" style={{ color: 'var(--cream)' }}>{text}</p>
    </div>
  );
}

export default function UnetePage() {
  const { user, loading, signIn, register } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('welcome');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [telefono, setTelefono] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace('/club');
  }, [user, loading, router]);

  const inputStyle = {
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    color: 'var(--cream)',
    borderRadius: '14px',
    padding: '14px 16px',
    width: '100%',
    fontSize: '0.875rem',
    outline: 'none',
  };

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim() || !email.trim() || password.length < 6) {
      setError('Completa todos los campos. La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const newUser = await register(email.trim(), password, nombre.trim());
      await registrarNuevoMiembro(newUser.uid, nombre.trim(), email.trim(), telefono || undefined, fechaNacimiento || undefined);
      router.replace('/club');
    } catch (err: any) {
      setError(
        err.code === 'auth/email-already-in-use'
          ? 'Ese correo ya tiene una cuenta. Inicia sesión.'
          : err.code === 'auth/weak-password'
          ? 'La contraseña es muy débil.'
          : 'Error al crear la cuenta. Inténtalo de nuevo.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) { setError('Ingresa tu correo y contraseña.'); return; }
    setSubmitting(true);
    setError('');
    try {
      await signIn(email.trim(), password);
      router.replace('/club');
    } catch {
      setError('Correo o contraseña incorrectos.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: 'var(--fire)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  // ── Welcome screen ─────────────────────────────────────────────────────────
  if (mode === 'welcome') {
    return (
      <div className="min-h-screen flex flex-col pb-20">
        {/* Hero */}
        <div
          className="flex flex-col items-center justify-center px-6 pt-16 pb-12 text-center space-y-4"
          style={{ background: 'linear-gradient(180deg, rgba(232,65,26,0.12) 0%, var(--bg) 100%)' }}
        >
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center text-5xl"
            style={{ background: 'linear-gradient(135deg, #e8411a, #c9a84c)' }}
          >
            🔥
          </div>
          <h1 className="text-3xl font-black" style={{ color: 'var(--cream)' }}>
            La Fermata Club
          </h1>
          <p className="text-sm max-w-xs" style={{ color: 'var(--muted)' }}>
            Acumula sellos con cada visita y canjéalos por pizzas, postres y más.
          </p>
        </div>

        <div className="max-w-sm mx-auto px-6 space-y-6 w-full">
          {/* Benefits */}
          <div
            className="rounded-3xl p-5 space-y-3"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
              Beneficios del club
            </p>
            <Benefit icon="🔥" text="1 sello por cada visita al local" />
            <Benefit icon="🎁" text="Premio gratis cada 5 sellos" />
            <Benefit icon="⭐" text="Sube de nivel con cada visita" />
            <Benefit icon="🎂" text="Sello extra en tu cumpleaños" />
            <Benefit icon="📱" text="QR personal para acumular sellos" />
          </div>

          {/* Tiers teaser */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { emoji: '🌱', name: 'Visitante' },
              { emoji: '⭐', name: 'Habitué' },
              { emoji: '🔥', name: 'Pizzaiolo' },
              { emoji: '👑', name: 'Maestro' },
            ].map(t => (
              <div
                key={t.name}
                className="rounded-2xl p-2 text-center space-y-1"
                style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}
              >
                <div className="text-lg">{t.emoji}</div>
                <p className="text-xs" style={{ color: 'var(--muted)', fontSize: '10px' }}>{t.name}</p>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div className="space-y-3">
            <button
              onClick={() => setMode('register')}
              className="w-full py-4 rounded-2xl font-black text-sm transition-all active:scale-95"
              style={{ background: 'var(--fire)', color: '#fff' }}
            >
              🚀 Unirme gratis
            </button>
            <button
              onClick={() => setMode('login')}
              className="w-full py-4 rounded-2xl font-bold text-sm transition-all active:scale-95"
              style={{ background: 'var(--surface2)', color: 'var(--cream)', border: '1px solid var(--border)' }}
            >
              Ya tengo cuenta
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Register / Login forms ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col pb-20">
      <div className="px-4 py-6 flex items-center gap-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <button onClick={() => setMode('welcome')} style={{ color: 'var(--muted)', fontSize: '1.5rem' }}>←</button>
        <h2 className="text-lg font-black" style={{ color: 'var(--cream)' }}>
          {mode === 'register' ? 'Crear cuenta' : 'Iniciar sesión'}
        </h2>
      </div>

      <form
        onSubmit={mode === 'register' ? handleRegister : handleLogin}
        className="max-w-sm mx-auto px-4 mt-6 space-y-4 w-full"
      >
        {mode === 'register' && (
          <div>
            <label className="block text-xs mb-2 font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
              Nombre completo *
            </label>
            <input
              type="text"
              placeholder="María González"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              required
              style={inputStyle}
            />
          </div>
        )}

        <div>
          <label className="block text-xs mb-2 font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
            Correo electrónico *
          </label>
          <input
            type="email"
            placeholder="tu@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={inputStyle}
          />
        </div>

        <div>
          <label className="block text-xs mb-2 font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
            Contraseña *
          </label>
          <input
            type="password"
            placeholder="Mínimo 6 caracteres"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={6}
            style={inputStyle}
          />
        </div>

        {mode === 'register' && (
          <>
            <div>
              <label className="block text-xs mb-2 font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
                Teléfono (opcional)
              </label>
              <input
                type="tel"
                placeholder="+56 9 1234 5678"
                value={telefono}
                onChange={e => setTelefono(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-xs mb-2 font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
                Fecha de nacimiento (opcional — sello extra 🎂)
              </label>
              <input
                type="date"
                value={fechaNacimiento}
                onChange={e => setFechaNacimiento(e.target.value)}
                style={inputStyle}
              />
            </div>
          </>
        )}

        {error && (
          <div
            className="rounded-xl px-4 py-3 text-sm"
            style={{ background: 'rgba(232,65,26,0.15)', border: '1px solid rgba(232,65,26,0.4)', color: '#f87171' }}
          >
            ⚠️ {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-4 rounded-2xl font-black text-sm transition-all active:scale-95 disabled:opacity-50"
          style={{ background: 'var(--fire)', color: '#fff' }}
        >
          {submitting
            ? '⏳ Un momento...'
            : mode === 'register'
            ? '🚀 Crear mi cuenta'
            : '🔓 Ingresar'}
        </button>

        <button
          type="button"
          onClick={() => setMode(mode === 'register' ? 'login' : 'register')}
          className="w-full text-sm py-2"
          style={{ color: 'var(--muted)' }}
        >
          {mode === 'register' ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate gratis'}
        </button>
      </form>
    </div>
  );
}
