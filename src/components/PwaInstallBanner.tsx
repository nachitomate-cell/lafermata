'use client';

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'lf_pwa_dismissed_at';
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 días

function wasDismissedRecently(): boolean {
  try {
    const ts = localStorage.getItem(DISMISS_KEY);
    return !!ts && Date.now() - Number(ts) < DISMISS_DURATION;
  } catch {
    return false;
  }
}

function saveDismissed() {
  try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* noop */ }
}

export default function PwaInstallBanner() {
  const [mode, setMode] = useState<'android' | 'ios' | null>(null);
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // Ya instalada como PWA → no mostrar nada
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true;
    if (isStandalone) return;

    if (wasDismissedRecently()) return;

    const ua = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua) && !(window as any).MSStream;

    if (isIOS) {
      setMode('ios');
      const timer = setTimeout(() => setVisible(true), 2500);
      return () => clearTimeout(timer);
    }

    // Android / Chrome / Edge: esperar beforeinstallprompt
    function handleBeforeInstall(e: Event) {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
      setMode('android');
      setTimeout(() => setVisible(true), 1800);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  function dismiss() {
    setVisible(false);
    saveDismissed();
  }

  async function install() {
    if (!prompt) return;
    setInstalling(true);
    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === 'accepted') {
        setVisible(false);
      } else {
        dismiss();
      }
    } finally {
      setInstalling(false);
      setPrompt(null);
    }
  }

  if (!visible || !mode) return null;

  return (
    <div
      className="fixed left-3 right-3 z-50 anim-fade-in-up sm:left-auto sm:right-6 sm:w-80"
      style={{
        bottom: 'calc(4.5rem + env(safe-area-inset-bottom, 0px))',
        animationDuration: '0.42s',
      }}
    >
      <div
        className="flex items-center gap-3 rounded-2xl px-4 py-3"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.65)',
        }}
      >
        {/* Ícono de la app */}
        <img
          src="/icon-192.png"
          alt="La Fermata"
          width={40}
          height={40}
          className="rounded-xl shrink-0"
          style={{ border: '1px solid var(--border)' }}
        />

        {/* Texto */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold leading-snug" style={{ color: 'var(--cream)' }}>
            Instalar La Fermata
          </p>
          {mode === 'ios' ? (
            <p className="text-xs mt-0.5 leading-tight" style={{ color: 'var(--muted)' }}>
              Toca <ShareIcon /> y luego <span style={{ color: 'var(--cream)' }}>"Agregar a inicio"</span>
            </p>
          ) : (
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
              Acceso directo desde tu pantalla de inicio
            </p>
          )}
        </div>

        {/* Botón instalar (solo Android) */}
        {mode === 'android' && (
          <button
            onClick={install}
            disabled={installing}
            className="shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 hover:opacity-90"
            style={{ background: 'var(--fire)', color: '#fff' }}
          >
            {installing ? '…' : 'Instalar'}
          </button>
        )}

        {/* Cerrar */}
        <button
          onClick={dismiss}
          aria-label="Cerrar"
          className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full transition-colors hover:bg-white/10 text-xs"
          style={{ color: 'var(--muted)' }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}

function ShareIcon() {
  return (
    <svg
      className="inline-block align-[-2px] mx-0.5"
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}
