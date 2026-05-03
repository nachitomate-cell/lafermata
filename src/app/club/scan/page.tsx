'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { crearPendingStamp, cancelarPendingStamp } from '@/lib/puntos';

type Phase =
  | 'scanning'
  | 'creating'
  | 'waiting'
  | 'confirmed'
  | 'rejected'
  | 'expired'
  | 'error_camera'
  | 'error_qr';

const FERMATA_QR_PREFIX = 'lafermata://staff?vendorId=';
const FERMATA_VENDOR_PHRASE = 'lafermata';

export default function ScanPage() {
  const { user, userData } = useAuth();
  const router = useRouter();
  const scannerRef = useRef<any>(null);
  const isScanningRef = useRef(false);
  const pendingIdRef = useRef<string | null>(null);

  const [phase, setPhase] = useState<Phase>('scanning');
  const [nuevoTotal, setNuevoTotal] = useState(0);
  const [scannerReady, setScannerReady] = useState(false);

  useEffect(() => {
    if (!user) { router.replace('/club/unete'); return; }
    setScannerReady(true);
    return () => { stopScanner(); };
  }, [user, router]);

  useEffect(() => {
    if (scannerReady && phase === 'scanning') startScanner();
  }, [scannerReady, phase]);

  const startScanner = useCallback(async () => {
    isScanningRef.current = false;
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      await new Promise(r => setTimeout(r, 300));
      const container = document.getElementById('lf-qr-reader');
      if (!container) return;

      if (scannerRef.current) {
        try { await scannerRef.current.stop(); } catch { /* ok */ }
        scannerRef.current = null;
      }

      const scanner = new Html5Qrcode('lf-qr-reader', { verbose: false });
      scannerRef.current = scanner;
      const shortSide = Math.min(container.offsetWidth, container.offsetHeight);
      const boxSize = Math.round(shortSide * 0.68);

      await scanner.start(
        { facingMode: { ideal: 'environment' } },
        {
          fps: 15,
          qrbox: { width: boxSize, height: boxSize },
          videoConstraints: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        },
        (decoded) => onScanSuccess(decoded),
        () => {}
      );
    } catch {
      setPhase('error_camera');
    }
  }, []);

  const stopScanner = async () => {
    if (scannerRef.current) {
      try { if (scannerRef.current.isScanning) await scannerRef.current.stop(); } catch { /* ok */ }
      scannerRef.current = null;
    }
  };

  const onScanSuccess = useCallback(async (decoded: string) => {
    if (isScanningRef.current) return;
    isScanningRef.current = true;
    await stopScanner();

    const raw = decoded.trim().toLowerCase();
    const isValid = raw.includes(FERMATA_VENDOR_PHRASE);
    if (!isValid) { setPhase('error_qr'); return; }

    if (!user || !userData) { router.replace('/club/unete'); return; }

    setPhase('creating');
    try {
      const pendingId = await crearPendingStamp(user.uid, userData.nombre);
      pendingIdRef.current = pendingId;
      setPhase('waiting');

      // Real-time listener on the pending stamp
      const unsub = onSnapshot(doc(db, 'fermata_pending_stamps', pendingId), (snap) => {
        if (!snap.exists()) return;
        const status = snap.data().status;
        if (status === 'confirmed') {
          setNuevoTotal(snap.data().nuevoTotal ?? 0);
          setPhase('confirmed');
          unsub();
        } else if (status === 'rejected') {
          setPhase('rejected');
          unsub();
        } else if (status === 'expired') {
          setPhase('expired');
          unsub();
        }
      });

      // Auto-expire client-side after 5 min
      setTimeout(() => {
        if (pendingIdRef.current === pendingId) setPhase('expired');
      }, 5 * 60 * 1000);

    } catch (err: any) {
      setPhase('error_qr');
    }
  }, [user, userData, router]);

  async function handleCancel() {
    if (pendingIdRef.current) {
      await cancelarPendingStamp(pendingIdRef.current).catch(() => {});
      pendingIdRef.current = null;
    }
    setPhase('scanning');
    isScanningRef.current = false;
  }

  // ── Phases that don't need the camera ─────────────────────────────────────
  if (phase !== 'scanning') {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center px-6 text-center" style={{ background: 'var(--bg)' }}>
        {phase === 'creating' && (
          <>
            <div className="w-16 h-16 rounded-full border-4 border-t-transparent animate-spin mb-6" style={{ borderColor: 'var(--fire)', borderTopColor: 'transparent' }} />
            <p className="text-lg font-black" style={{ color: 'var(--cream)' }}>Creando solicitud...</p>
          </>
        )}

        {phase === 'waiting' && (
          <div className="space-y-6 w-full max-w-xs">
            <div
              className="w-20 h-20 mx-auto rounded-full flex items-center justify-center text-4xl"
              style={{ background: 'rgba(232,65,26,0.15)', border: '2px solid rgba(232,65,26,0.4)' }}
            >
              ⏳
            </div>
            <div>
              <p className="text-xl font-black mb-2" style={{ color: 'var(--cream)' }}>Esperando al staff</p>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>El staff de La Fermata está confirmando tu sello. Muéstrale esta pantalla.</p>
            </div>
            <div className="flex gap-2 justify-center">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full animate-bounce"
                  style={{ background: 'var(--fire)', animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
            <button
              onClick={handleCancel}
              className="w-full py-3 rounded-2xl font-bold text-sm"
              style={{ background: 'var(--surface2)', color: 'var(--muted)', border: '1px solid var(--border)' }}
            >
              Cancelar
            </button>
          </div>
        )}

        {phase === 'confirmed' && (
          <div
            className="fixed inset-0 flex flex-col items-center justify-center px-6"
            style={{ background: 'linear-gradient(135deg, #e8411a 0%, #c9a84c 100%)' }}
          >
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full border border-white/15"
                style={{
                  width: `${160 + i * 80}px`, height: `${160 + i * 80}px`,
                  top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                  animation: `ping ${1.6 + i * 0.3}s cubic-bezier(0,0,0.2,1) infinite`,
                  animationDelay: `${i * 0.2}s`,
                }}
              />
            ))}
            <div className="relative z-10 space-y-5 text-center w-full max-w-xs">
              <div className="text-7xl" style={{ animation: 'bounce 1.2s infinite' }}>🔥</div>
              <h1 className="text-3xl font-black text-white">¡Sello confirmado!</h1>
              <p className="text-white/80">Ahora tienes <span className="font-black text-white">{nuevoTotal} sello{nuevoTotal !== 1 ? 's' : ''}</span></p>
              <div
                className="rounded-3xl p-4 space-y-1"
                style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)' }}
              >
                {nuevoTotal % 5 === 0 && nuevoTotal > 0 && (
                  <p className="font-black text-white">🎁 ¡Tienes una recompensa disponible!</p>
                )}
                <p className="text-sm text-white/75">
                  {5 - (nuevoTotal % 5) === 5 ? 'Ve a canjear tu premio' : `${5 - (nuevoTotal % 5)} sellos para la siguiente recompensa`}
                </p>
              </div>
              <div className="flex gap-3">
                <Link
                  href="/club"
                  className="flex-1 py-4 rounded-2xl font-black text-sm text-center active:scale-95 transition-transform"
                  style={{ background: 'rgba(255,255,255,0.25)', border: '2px solid rgba(255,255,255,0.5)', color: '#fff' }}
                >
                  Mi Club
                </Link>
                {nuevoTotal % 5 === 0 && (
                  <Link
                    href="/club/premios"
                    className="flex-1 py-4 rounded-2xl font-black text-sm text-center active:scale-95 transition-transform"
                    style={{ background: '#fff', color: '#e8411a' }}
                  >
                    🎁 Canjear
                  </Link>
                )}
              </div>
            </div>
            <style>{`
              @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
              @keyframes ping { 75%,100%{transform:translate(-50%,-50%) scale(1.5);opacity:0} }
            `}</style>
          </div>
        )}

        {(phase === 'rejected' || phase === 'expired' || phase === 'error_qr') && (
          <div className="space-y-5 w-full max-w-xs">
            <div className="text-5xl">
              {phase === 'rejected' ? '❌' : phase === 'expired' ? '⏰' : '⚠️'}
            </div>
            <h2 className="text-xl font-black" style={{ color: 'var(--cream)' }}>
              {phase === 'rejected' ? 'Solicitud rechazada'
                : phase === 'expired' ? 'Solicitud expirada'
                : 'QR no reconocido'}
            </h2>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              {phase === 'rejected'
                ? 'El staff no aprobó la solicitud. Consulta en caja.'
                : phase === 'expired'
                ? 'La solicitud expiró (5 minutos). Escanea de nuevo.'
                : 'Asegúrate de escanear el QR oficial de La Fermata.'}
            </p>
            <button
              onClick={() => { setPhase('scanning'); isScanningRef.current = false; pendingIdRef.current = null; }}
              className="w-full py-4 rounded-2xl font-black text-sm"
              style={{ background: 'var(--fire)', color: '#fff' }}
            >
              Intentar de nuevo
            </button>
            <Link href="/club" className="block text-sm text-center" style={{ color: 'var(--muted)' }}>
              Volver al club
            </Link>
          </div>
        )}

        {phase === 'error_camera' && (
          <div className="space-y-5 w-full max-w-xs">
            <div className="text-5xl">📷</div>
            <h2 className="text-xl font-black" style={{ color: 'var(--cream)' }}>Sin acceso a cámara</h2>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              Permite el acceso a la cámara desde los ajustes de tu dispositivo e inténtalo de nuevo.
            </p>
            <Link href="/club" className="block w-full py-4 rounded-2xl font-black text-sm text-center" style={{ background: 'var(--fire)', color: '#fff' }}>
              Volver al club
            </Link>
          </div>
        )}
      </div>
    );
  }

  // ── Camera scanner ──────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 px-4 pt-6 pb-4 flex items-center justify-between" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.85), transparent)' }}>
        <Link href="/club">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg" style={{ background: 'rgba(255,255,255,0.1)' }}>←</div>
        </Link>
        <p className="text-white text-sm font-bold tracking-widest uppercase">Escanear local</p>
        <div className="w-10" />
      </div>

      {/* Camera container */}
      <div className="flex-1 relative overflow-hidden">
        <div id="lf-qr-reader" className="absolute inset-0 w-full h-full" />

        {/* Overlay */}
        <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/45" />
          <div className="relative w-64 h-64 z-10">
            <div className="absolute inset-0 border-2 border-white/15 rounded-2xl" />
            {[
              'top-0 left-0 border-t-4 border-l-4 rounded-tl-xl',
              'top-0 right-0 border-t-4 border-r-4 rounded-tr-xl',
              'bottom-0 left-0 border-b-4 border-l-4 rounded-bl-xl',
              'bottom-0 right-0 border-b-4 border-r-4 rounded-br-xl',
            ].map((cls, i) => (
              <div key={i} className={`absolute w-7 h-7 border-[var(--fire)] ${cls}`} />
            ))}
            <div
              className="absolute left-2 right-2 h-0.5 rounded-full"
              style={{
                background: 'var(--fire)',
                boxShadow: '0 0 8px 2px rgba(232,65,26,0.6)',
                animation: 'scanLine 2s ease-in-out infinite',
              }}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-8 text-center space-y-1 z-10" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)' }}>
        <p className="text-white font-bold text-base">Apunta al QR del local</p>
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>La Fermata Club · Sistema de fidelización</p>
      </div>

      <style>{`
        @keyframes scanLine {
          0%, 100% { top: 10%; opacity: 0.4; }
          50% { top: 90%; opacity: 1; }
        }
        #lf-qr-reader__dashboard { display: none !important; }
        #lf-qr-reader__scan_region { position: absolute !important; inset: 0 !important; width: 100% !important; height: 100% !important; }
        #lf-qr-reader video { object-fit: cover !important; width: 100% !important; height: 100% !important; position: absolute !important; top: 0 !important; left: 0 !important; }
      `}</style>
    </div>
  );
}
