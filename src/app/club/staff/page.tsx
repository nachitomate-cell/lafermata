'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import QRCode from 'react-qr-code';
import { setStaffSession, isStaffSessionValid, clearStaffSession } from '@/lib/staffSession';
import {
  collection, query, where, onSnapshot, orderBy, limit,
  Timestamp, addDoc, getDocs,
} from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import {
  confirmarHandshake, rechazarHandshake, marcarCanjeUsado, darSellosManual,
  FERMATA_VENDOR_ID, FERMATA_VENDOR_NAME,
} from '@/lib/puntos';

const STAFF_PIN      = process.env.NEXT_PUBLIC_STAFF_PIN      || '4321';
const STAFF_EMAIL    = process.env.NEXT_PUBLIC_STAFF_EMAIL    || '';
const STAFF_PASSWORD = process.env.NEXT_PUBLIC_STAFF_PASSWORD || '';
const STORE_QR_VALUE = `lafermata://staff?vendorId=${FERMATA_VENDOR_ID}&local=La+Fermata+Vina+del+Mar`;

const SEED_PREMIOS = [
  { nombre: 'Pan de Ajo',        descripcion: 'Pan artesanal de ajos asados, mozzarella y parmesano', sellosRequeridos: 5,  icono: '🧄', activo: true, stock: null },
  { nombre: 'Postre a elección', descripcion: 'Tiramisú, Cannoli o Brownie al Cioccolato',             sellosRequeridos: 8,  icono: '🍮', activo: true, stock: null },
  { nombre: 'Pizza Margherita',  descripcion: 'Pizza individual Margherita — la clásica napoletana',   sellosRequeridos: 12, icono: '🍕', activo: true, stock: null },
  { nombre: 'Pizza a elección',  descripcion: 'Una pizza individual de la carta a tu gusto',           sellosRequeridos: 15, icono: '🔥', activo: true, stock: null },
  { nombre: 'Cena para 2',       descripcion: '2 pizzas + 2 bebidas. Reserva previa requerida.',       sellosRequeridos: 30, icono: '🍷', activo: true, stock: null },
];

interface PendingStamp {
  id: string; userId: string; userName: string; createdAt: Timestamp | null; status: string;
}
interface LogEntry {
  id: string; usuarioNombre: string; accion: string; fecha: string; tipo: string;
}
interface ActiveCanje {
  id: string; clienteNombre: string; premioNombre: string; premioIcono: string;
  codigo: string; expiraEn: string; status: string;
}

function timeAgo(ts: Timestamp | null): string {
  if (!ts) return '';
  const s = Math.floor((Date.now() - ts.toMillis()) / 1000);
  if (s < 60) return `hace ${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `hace ${m}m`;
  return `hace ${Math.floor(m / 60)}h`;
}

// ── PIN screen ────────────────────────────────────────────────────────────────
function PinScreen({ onSuccess }: { onSuccess: () => void }) {
  const [pin, setPin]     = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  function handleDigit(d: string) {
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    setError(false);
    if (next.length === 4) {
      if (next === STAFF_PIN) { onSuccess(); }
      else {
        setShake(true); setError(true);
        setTimeout(() => { setPin(''); setShake(false); }, 700);
      }
    }
  }
  function handleDelete() { setPin(p => p.slice(0, -1)); setError(false); }
  const digits = [1,2,3,4,5,6,7,8,9,null,0,'⌫'];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 pb-20" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-xs space-y-8">
        <div className="text-center space-y-2">
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--cream)' }}>Panel Staff</h1>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Ingresa tu PIN para continuar</p>
        </div>
        <div className={`flex justify-center gap-4 ${shake ? 'animate-[shake_0.5s_ease]' : ''}`}>
          {[0,1,2,3].map(i => (
            <div key={i} className="w-4 h-4 rounded-full transition-all duration-200"
              style={{ background: i < pin.length ? (error ? '#ef4444' : 'var(--fire)') : 'var(--surface2)',
                border: `2px solid ${i < pin.length ? (error ? '#ef4444' : 'var(--fire)') : 'var(--border)'}` }} />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3">
          {digits.map((d, i) => (
            <button key={i}
              onClick={() => d === null ? null : d === '⌫' ? handleDelete() : handleDigit(String(d))}
              disabled={d === null}
              className="h-16 rounded-2xl text-xl font-black transition-all active:scale-90"
              style={{ background: d === null ? 'transparent' : 'var(--surface)',
                color: d === '⌫' ? 'var(--fire)' : 'var(--cream)',
                border: d === null ? 'none' : '1px solid var(--border)' }}>
              {d === null ? '' : d}
            </button>
          ))}
        </div>
      </div>
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}`}</style>
    </div>
  );
}

// ── Firebase login screen (shown after correct PIN if no auto-credentials) ────
function FirebaseLoginScreen({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      onSuccess();
    } catch {
      setError('Credenciales incorrectas. Verifica tu email y contraseña.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 pb-20" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-xs space-y-6">
        <div className="text-center">
          <div className="text-4xl mb-3">🔑</div>
          <h1 className="text-xl font-black" style={{ color: 'var(--cream)' }}>Acceso Staff</h1>
          <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>Ingresa con tu cuenta de staff</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-3">
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
            placeholder="staff@lafermata.cl" autoComplete="email"
            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--cream)' }} />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
            placeholder="Contraseña" autoComplete="current-password"
            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--cream)' }} />
          {error && <p className="text-xs text-center" style={{ color: '#ef4444' }}>{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl font-black text-sm transition-all active:scale-95 disabled:opacity-50"
            style={{ background: 'var(--fire)', color: '#fff' }}>
            {loading ? 'Verificando...' : 'Ingresar'}
          </button>
        </form>
        <p className="text-center text-xs" style={{ color: 'var(--muted)' }}>
          La cuenta de staff debe ser creada en Firebase Console y tener{' '}
          <code style={{ color: 'var(--gold)' }}>rol: &quot;staff&quot;</code> en Firestore.
        </p>
      </div>
    </div>
  );
}

// ── Manual stamp tab ──────────────────────────────────────────────────────────

interface ClienteResult {
  id: string;
  nombre: string;
  correo: string;
  sellos: number;
  totalSellosHistoricos: number;
}

function ManualStampTab() {
  const [search,    setSearch]    = useState('');
  const [results,   setResults]   = useState<ClienteResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [giving,    setGiving]    = useState(false);
  const [feedback,  setFeedback]  = useState('');

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const term = search.trim().toLowerCase();
    if (!term) return;
    setSearching(true);
    setResults([]);
    setConfirmId(null);
    setFeedback('');
    try {
      const snap = await getDocs(query(
        collection(db, 'fermata_usuarios'),
        where('rol', '==', 'cliente'),
        limit(100),
      ));
      const matched = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as ClienteResult))
        .filter(u =>
          u.nombre?.toLowerCase().includes(term) ||
          u.correo?.toLowerCase().includes(term)
        )
        .slice(0, 10);
      setResults(matched);
    } finally {
      setSearching(false);
    }
  }

  async function handleGive(userId: string, userName: string) {
    setGiving(true);
    try {
      const { nuevoTotal } = await darSellosManual(userId, userName);
      setFeedback(`✅ Sello dado a ${userName} — ahora tiene ${nuevoTotal}`);
      setConfirmId(null);
      setResults(prev => prev.map(r =>
        r.id === userId
          ? { ...r, sellos: r.sellos + 1, totalSellosHistoricos: r.totalSellosHistoricos + 1 }
          : r
      ));
    } catch (err: unknown) {
      alert((err as Error)?.message || 'Error al dar sello.');
    } finally {
      setGiving(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
        ✏️ Dar sello manual
      </p>

      {/* Search form */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setFeedback(''); }}
          placeholder="Nombre o email del cliente..."
          className="flex-1 px-4 py-3 rounded-xl text-sm outline-none"
          style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--cream)' }}
        />
        <button type="submit" disabled={searching || !search.trim()}
          className="px-4 py-3 rounded-xl font-bold text-sm disabled:opacity-40 transition-all active:scale-95"
          style={{ background: 'var(--fire)', color: '#fff' }}>
          {searching ? '⏳' : '🔍'}
        </button>
      </form>

      {/* Feedback */}
      {feedback && (
        <div className="rounded-2xl px-4 py-3 text-sm font-bold"
          style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', color: '#4ade80' }}>
          {feedback}
        </div>
      )}

      {/* No results */}
      {results.length === 0 && search && !searching && (
        <p className="text-sm text-center py-8" style={{ color: 'var(--muted)' }}>
          Sin resultados para &ldquo;{search}&rdquo;
        </p>
      )}

      {/* Results */}
      {results.map(u => (
        <div key={u.id} className="rounded-2xl p-4 space-y-3 transition-all"
          style={{
            background: 'var(--surface)',
            border: `1px solid ${confirmId === u.id ? 'rgba(232,65,26,0.45)' : 'var(--border)'}`,
          }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-base font-black shrink-0"
              style={{ background: 'rgba(201,168,76,0.15)', color: 'var(--gold)' }}>
              {u.nombre.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate" style={{ color: 'var(--cream)' }}>{u.nombre}</p>
              <p className="text-xs truncate" style={{ color: 'var(--muted)' }}>{u.correo}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xl font-black" style={{ color: 'var(--fire)' }}>{u.sellos}</p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>{u.totalSellosHistoricos} total</p>
            </div>
          </div>

          {confirmId !== u.id ? (
            <button
              onClick={() => { setConfirmId(u.id); setFeedback(''); }}
              className="w-full py-3 rounded-xl font-black text-sm transition-all active:scale-95"
              style={{ background: 'rgba(232,65,26,0.1)', color: 'var(--fire)', border: '1px solid rgba(232,65,26,0.3)' }}>
              🍕 Dar 1 pedazo
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-center font-bold" style={{ color: 'var(--cream)' }}>
                ¿Dar 1 sello a <span style={{ color: 'var(--fire)' }}>{u.nombre}</span>?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleGive(u.id, u.nombre)}
                  disabled={giving}
                  className="flex-1 py-3 rounded-xl font-black text-sm transition-all active:scale-95 disabled:opacity-50"
                  style={{ background: 'var(--fire)', color: '#fff' }}>
                  {giving ? '⏳' : '✅ Confirmar'}
                </button>
                <button
                  onClick={() => setConfirmId(null)}
                  disabled={giving}
                  className="px-4 py-3 rounded-xl font-bold text-sm transition-all active:scale-95"
                  style={{ background: 'var(--surface2)', color: 'var(--muted)', border: '1px solid var(--border)' }}>
                  ✕
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      <p className="text-xs text-center" style={{ color: 'var(--muted)' }}>
        Úsalo solo cuando el cliente no pueda escanear el QR del local.
      </p>
    </div>
  );
}

// ── Main panel ─────────────────────────────────────────────────────────────────
export default function StaffPage() {
  const [step, setStep]           = useState<'pin' | 'login' | 'panel'>(() => isStaffSessionValid() ? 'panel' : 'pin');
  const [tab, setTab]             = useState<'queue' | 'manual' | 'qr' | 'canjes' | 'log'>('queue');
  const [pending, setPending]     = useState<PendingStamp[]>([]);
  const [logs, setLogs]           = useState<LogEntry[]>([]);
  const [activeCanjes, setActiveCanjes] = useState<ActiveCanje[]>([]);
  const [processing, setProcessing]     = useState<string | null>(null);
  const [seeding, setSeeding]     = useState(false);
  const [seedDone, setSeedDone]   = useState(false);

  // After correct PIN, try auto-sign-in with env credentials, else show login form
  async function handlePinSuccess() {
    setStaffSession();
    if (STAFF_EMAIL && STAFF_PASSWORD) {
      try {
        await signInWithEmailAndPassword(auth, STAFF_EMAIL, STAFF_PASSWORD);
        setStep('panel');
      } catch {
        setStep('login');
      }
    } else {
      setStep('login');
    }
  }

  async function handleLoginSuccess() { setStaffSession(); setStep('panel'); }

  async function handleSignOut() {
    clearStaffSession();
    await signOut(auth).catch(() => {});
    setStep('pin');
  }

  useEffect(() => {
    if (step !== 'panel') return;

    const q = query(
      collection(db, 'fermata_pending_stamps'),
      where('status', '==', 'pending'),
      where('vendorId', '==', FERMATA_VENDOR_ID),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    const unsubQ = onSnapshot(q, snap => {
      setPending(snap.docs.map(d => ({ id: d.id, ...d.data() } as PendingStamp)));
    });

    const qLogs = query(collection(db, 'fermata_logs'), orderBy('fecha', 'desc'), limit(30));
    const unsubLogs = onSnapshot(qLogs, snap => {
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as LogEntry)));
    });

    const qCanjes = query(
      collection(db, 'fermata_canjes'),
      where('status', '==', 'pending'),
      orderBy('creadoEn', 'desc'),
      limit(20)
    );
    const unsubCanjes = onSnapshot(qCanjes, snap => {
      setActiveCanjes(snap.docs.map(d => ({ id: d.id, ...d.data() } as ActiveCanje)));
    });

    return () => { unsubQ(); unsubLogs(); unsubCanjes(); };
  }, [step]);

  const confirm = useCallback(async (pendingId: string) => {
    setProcessing(pendingId);
    try { await confirmarHandshake(pendingId); }
    catch (err: unknown) { alert((err as Error)?.message || 'Error al confirmar.'); }
    finally { setProcessing(null); }
  }, []);

  const reject = useCallback(async (pendingId: string) => {
    setProcessing(pendingId);
    try { await rechazarHandshake(pendingId); }
    finally { setProcessing(null); }
  }, []);

  const markUsed = useCallback(async (canjeId: string) => {
    setProcessing(canjeId);
    try { await marcarCanjeUsado(canjeId); }
    catch { alert('Error al marcar como usado.'); }
    finally { setProcessing(null); }
  }, []);

  async function seedPremios() {
    setSeeding(true);
    try {
      const existing = await getDocs(collection(db, 'fermata_premios'));
      if (!existing.empty) { setSeedDone(true); return; }
      for (const p of SEED_PREMIOS) {
        await addDoc(collection(db, 'fermata_premios'), p);
      }
      setSeedDone(true);
    } catch (err: unknown) {
      alert('Error al crear premios: ' + (err as Error)?.message);
    } finally {
      setSeeding(false);
    }
  }

  if (step === 'pin')   return <PinScreen onSuccess={handlePinSuccess} />;
  if (step === 'login') return <FirebaseLoginScreen onSuccess={handleLoginSuccess} />;

  const tabs = [
    { id: 'queue',  label: 'Cola',    icon: '📋', badge: pending.length },
    { id: 'manual', label: 'Manual',  icon: '✏️' },
    { id: 'qr',     label: 'Mi QR',   icon: '🔲' },
    { id: 'canjes', label: 'Validar', icon: '🎫', badge: activeCanjes.length },
    { id: 'log',    label: 'Log',     icon: '📊' },
  ] as const;

  return (
    <div className="min-h-screen pb-28" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="sticky top-0 z-20 px-4 py-4 flex items-center justify-between"
        style={{ background: 'rgba(12,11,9,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)' }}>
        <Link href="/club" style={{ color: 'var(--muted)', fontSize: '1.4rem' }}>←</Link>
        <div className="text-center">
          <p className="text-sm font-black" style={{ color: 'var(--cream)' }}>Panel Staff</p>
          <p className="text-xs" style={{ color: 'var(--fire)' }}>🔥 La Fermata</p>
        </div>
        <button onClick={handleSignOut}
          className="text-xs px-3 py-1.5 rounded-full"
          style={{ background: 'var(--surface2)', color: 'var(--muted)', border: '1px solid var(--border)' }}>
          Salir
        </button>
      </div>

      {/* Quick links to other staff tools */}
      <div className="flex overflow-x-auto gap-2 px-4 py-2 no-scrollbar"
        style={{ background: 'rgba(201,168,76,0.05)', borderBottom: '1px solid var(--border)' }}>
        <Link href="/reservas/staff"
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
          style={{ background: 'var(--surface2)', color: 'var(--gold)', border: '1px solid rgba(201,168,76,0.3)' }}>
          📅 Reservas
        </Link>
        <Link href="/cocina"
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
          style={{ background: 'var(--surface2)', color: '#e8411a', border: '1px solid rgba(232,65,26,0.3)' }}>
          🍕 Cocina
        </Link>
        <Link href="/panel"
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
          style={{ background: 'var(--surface2)', color: 'var(--muted)', border: '1px solid var(--border)' }}>
          📊 Métricas
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-2 px-4 py-3 no-scrollbar"
        style={{ borderBottom: '1px solid var(--border)' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold relative"
            style={{ background: tab === t.id ? 'var(--fire)' : 'var(--surface2)',
              color: tab === t.id ? '#fff' : 'var(--muted)', border: '1px solid var(--border)' }}>
            {t.icon} {t.label}
            {'badge' in t && t.badge > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs font-black flex items-center justify-center"
                style={{ background: tab === t.id ? '#fff' : 'var(--fire)', color: tab === t.id ? 'var(--fire)' : '#fff' }}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="max-w-lg mx-auto px-4 py-5">

        {/* ── Manual stamp ─────────────────────────────────── */}
        {tab === 'manual' && <ManualStampTab />}

        {/* ── Cola ─────────────────────────────────────────── */}
        {tab === 'queue' && (
          <div className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
              📋 Solicitudes de sellos pendientes
            </p>
            {pending.length === 0 ? (
              <div className="rounded-3xl border-2 border-dashed py-16 text-center space-y-3"
                style={{ borderColor: 'var(--border)' }}>
                <div className="text-4xl">✅</div>
                <p className="font-bold" style={{ color: 'var(--cream)' }}>Sin solicitudes pendientes</p>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>
                  Cuando un cliente escanee el QR del local, aparecerá aquí.
                </p>
              </div>
            ) : pending.map(p => (
              <div key={p.id} className="rounded-2xl p-4 space-y-3"
                style={{ background: 'var(--surface)', border: '1px solid rgba(232,65,26,0.35)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center text-xl font-black shrink-0"
                    style={{ background: 'rgba(232,65,26,0.15)', color: 'var(--fire)' }}>
                    {p.userName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm" style={{ color: 'var(--cream)' }}>{p.userName}</p>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>{timeAgo(p.createdAt)} · Solicita 1 sello</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--fire)' }} />
                    <span className="text-xs font-bold" style={{ color: 'var(--fire)' }}>Pendiente</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => confirm(p.id)} disabled={processing === p.id}
                    className="flex-1 py-3 rounded-xl font-black text-sm transition-all active:scale-95 disabled:opacity-50"
                    style={{ background: 'var(--fire)', color: '#fff' }}>
                    {processing === p.id ? '⏳' : '✅ Confirmar sello'}
                  </button>
                  <button onClick={() => reject(p.id)} disabled={processing === p.id}
                    className="px-4 py-3 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-50"
                    style={{ background: 'var(--surface2)', color: 'var(--muted)', border: '1px solid var(--border)' }}>
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── QR del local ──────────────────────────────────── */}
        {tab === 'qr' && (
          <div className="space-y-5 text-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
                🔲 QR del local
              </p>
              <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
                Muestra este QR para que los clientes lo escaneen con la app
              </p>
            </div>
            <div className="mx-auto w-fit rounded-3xl p-6" style={{ background: '#fff' }}>
              <QRCode value={STORE_QR_VALUE} size={220} bgColor="#ffffff" fgColor="#0c0b09" level="M" />
            </div>
            <div className="rounded-2xl px-4 py-3 text-sm"
              style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--muted)' }}>
              <p className="font-bold" style={{ color: 'var(--cream)' }}>{FERMATA_VENDOR_NAME}</p>
              <p className="text-xs mt-0.5">Imprime este QR y colócalo en el mostrador</p>
            </div>

            {/* Seed premios (first-time setup) */}
            <div className="rounded-2xl p-4 text-left space-y-3"
              style={{ background: 'var(--surface)', border: '1px solid rgba(201,168,76,0.3)' }}>
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--gold)' }}>
                ⚙️ Setup inicial
              </p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                La primera vez que configures el club, crea los premios en Firestore.
              </p>
              {seedDone ? (
                <div className="py-2 text-center text-sm font-bold" style={{ color: '#4ade80' }}>
                  ✅ Premios inicializados correctamente
                </div>
              ) : (
                <button onClick={seedPremios} disabled={seeding}
                  className="w-full py-3 rounded-xl font-black text-sm transition-all active:scale-95 disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg,#e8411a,#c9a84c)', color: '#fff' }}>
                  {seeding ? '⏳ Creando premios...' : '🎁 Inicializar premios del club'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Validar canjes ────────────────────────────────── */}
        {tab === 'canjes' && (
          <div className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
              🎫 Canjes activos a validar
            </p>
            {activeCanjes.length === 0 ? (
              <div className="rounded-3xl border-2 border-dashed py-16 text-center space-y-3"
                style={{ borderColor: 'var(--border)' }}>
                <div className="text-4xl">🎫</div>
                <p className="font-bold" style={{ color: 'var(--cream)' }}>Sin canjes pendientes</p>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>Los canjes de clientes aparecerán aquí.</p>
              </div>
            ) : activeCanjes.map(canje => {
              const isExpired = new Date(canje.expiraEn).getTime() < Date.now();
              return (
                <div key={canje.id} className="rounded-2xl p-4 space-y-3"
                  style={{ background: 'var(--surface)',
                    border: `1px solid ${isExpired ? 'var(--border)' : 'rgba(74,222,128,0.3)'}`,
                    opacity: isExpired ? 0.6 : 1 }}>
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{canje.premioIcono || '🎁'}</div>
                    <div className="flex-1">
                      <p className="font-bold text-sm" style={{ color: 'var(--cream)' }}>{canje.premioNombre}</p>
                      <p className="text-xs" style={{ color: 'var(--muted)' }}>{canje.clienteNombre}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black tracking-widest" style={{ color: 'var(--fire)' }}>{canje.codigo}</p>
                      <p className="text-xs" style={{ color: isExpired ? '#ef4444' : 'var(--muted)' }}>
                        {isExpired ? 'EXPIRADO' : `Vence ${new Date(canje.expiraEn).toLocaleString('es-CL')}`}
                      </p>
                    </div>
                  </div>
                  {!isExpired && (
                    <button onClick={() => markUsed(canje.id)} disabled={processing === canje.id}
                      className="w-full py-3 rounded-xl font-black text-sm transition-all active:scale-95 disabled:opacity-50"
                      style={{ background: '#4ade80', color: '#14532d' }}>
                      {processing === canje.id ? '⏳ Marcando...' : '✅ Marcar como usado'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Log ───────────────────────────────────────────── */}
        {tab === 'log' && (
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
              📊 Actividad reciente
            </p>
            {logs.length === 0 ? (
              <p className="text-sm text-center py-12" style={{ color: 'var(--muted)' }}>Sin actividad registrada</p>
            ) : logs.map(log => (
              <div key={log.id} className="flex items-start gap-3 rounded-2xl p-3"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <span className="text-lg mt-0.5">
                  {log.tipo === 'SELLO' ? '🔥' : log.tipo === 'CANJE' ? '🎁' : log.tipo === 'BIENVENIDA' ? '🌱' : '📋'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold" style={{ color: 'var(--cream)' }}>{log.usuarioNombre}</p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>{log.accion}</p>
                </div>
                <p className="text-xs shrink-0" style={{ color: 'var(--muted)', fontSize: '10px' }}>
                  {new Date(log.fecha).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
