'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { setStaffSession, isStaffSessionValid, clearStaffSession } from '@/lib/staffSession';

const STAFF_PIN   = process.env.NEXT_PUBLIC_STAFF_PIN || '4321';
const TOTAL_MESAS = 16;

// ─── Types ────────────────────────────────────────────────────────────────────

interface Stats {
  reservas:      { pendientes: number; confirmadas: number; llegaron: number; canceladas: number };
  cocina:        { en_preparacion: number; en_horno: number; lista: number };
  pedidosNuevos: number;
  mesas:         { libre: number; ocupada: number; reservada: number };
  pendingStamps: number;
}

function emptyStats(): Stats {
  return {
    reservas:      { pendientes: 0, confirmadas: 0, llegaron: 0, canceladas: 0 },
    cocina:        { en_preparacion: 0, en_horno: 0, lista: 0 },
    pedidosNuevos: 0,
    mesas:         { libre: TOTAL_MESAS, ocupada: 0, reservada: 0 },
    pendingStamps: 0,
  };
}

function todayISO() { return new Date().toISOString().split('T')[0]; }

// ─── Live stats hook ──────────────────────────────────────────────────────────

function useLiveStats(active: boolean) {
  const [stats, setStats] = useState<Stats>(emptyStats);

  useEffect(() => {
    if (!active) return;
    const today = todayISO();

    const unsubReservas = onSnapshot(
      query(collection(db, 'fermata_reservas'), where('fecha', '==', today)),
      snap => {
        const docs = snap.docs.map(d => d.data());
        setStats(s => ({
          ...s,
          reservas: {
            pendientes:  docs.filter(d => d.status === 'pendiente').length,
            confirmadas: docs.filter(d => d.status === 'confirmada').length,
            llegaron:    docs.filter(d => d.status === 'llegó').length,
            canceladas:  docs.filter(d => d.status === 'cancelada' || d.status === 'no_show').length,
          },
        }));
      },
    );

    const unsubCocina = onSnapshot(
      query(collection(db, 'fermata_pedidos'), where('status', 'in', ['nuevo', 'en_preparacion', 'en_horno', 'lista'])),
      snap => {
        const docs = snap.docs.map(d => d.data());
        setStats(s => ({
          ...s,
          pedidosNuevos: docs.filter(d => d.status === 'nuevo').length,
          cocina: {
            en_preparacion: docs.filter(d => d.status === 'en_preparacion').length,
            en_horno:       docs.filter(d => d.status === 'en_horno').length,
            lista:          docs.filter(d => d.status === 'lista').length,
          },
        }));
      },
    );

    const unsubMesas = onSnapshot(collection(db, 'fermata_mesas'), snap => {
      const docs = snap.docs.map(d => d.data());
      const ocupadas   = docs.filter(d => d.estado === 'ocupada').length;
      const reservadas = docs.filter(d => d.estado === 'reservada').length;
      setStats(s => ({
        ...s,
        mesas: {
          ocupada:   ocupadas,
          reservada: reservadas,
          libre:     TOTAL_MESAS - ocupadas - reservadas,
        },
      }));
    });

    const unsubStamps = onSnapshot(
      query(collection(db, 'fermata_pending_stamps'), where('status', '==', 'pending')),
      snap => setStats(s => ({ ...s, pendingStamps: snap.size })),
    );

    return () => { unsubReservas(); unsubCocina(); unsubMesas(); unsubStamps(); };
  }, [active]);

  return stats;
}

// ─── PIN Screen (desktop style) ───────────────────────────────────────────────

function PinScreen({ onSuccess }: { onSuccess: () => void }) {
  const [pin, setPin]     = useState('');
  const [error, setError] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pin === STAFF_PIN) {
      onSuccess();
    } else {
      setError(true);
      setPin('');
      setTimeout(() => setError(false), 1200);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ width: 340, padding: '40px 32px', background: 'var(--surface)', borderRadius: 24, border: '1px solid var(--border)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔐</div>
          <h1 style={{ color: 'var(--cream)', fontWeight: 900, fontSize: 22, margin: 0 }}>Panel Interno</h1>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 6 }}>La Fermata — Control de Operaciones</p>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="password"
            value={pin}
            onChange={e => setPin(e.target.value)}
            placeholder="PIN de acceso"
            autoFocus
            maxLength={8}
            style={{
              background: 'var(--surface2)',
              border: `1px solid ${error ? '#ef4444' : 'var(--border)'}`,
              color: 'var(--cream)',
              borderRadius: 12,
              padding: '14px 16px',
              fontSize: 22,
              textAlign: 'center',
              letterSpacing: '0.4em',
              fontWeight: 900,
              outline: 'none',
              width: '100%',
              boxSizing: 'border-box',
              transition: 'border-color 0.2s',
            }}
          />
          <button type="submit" style={{
            background: 'var(--fire)', color: '#fff',
            border: 'none', borderRadius: 12,
            padding: '14px 16px', fontWeight: 900, fontSize: 14,
            cursor: 'pointer',
          }}>
            Ingresar →
          </button>
          {error && (
            <p style={{ color: '#ef4444', textAlign: 'center', fontSize: 13, margin: 0 }}>PIN incorrecto</p>
          )}
        </form>
        <p style={{ color: 'var(--muted)', fontSize: 11, textAlign: 'center', marginTop: 20 }}>
          Presiona <kbd style={{ background: 'var(--surface2)', padding: '1px 6px', borderRadius: 4, border: '1px solid var(--border)' }}>Enter</kbd> para ingresar
        </p>
      </div>
    </div>
  );
}

// ─── Stat mini-chip ───────────────────────────────────────────────────────────

function Chip({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div style={{ textAlign: 'center', background: 'var(--surface2)', borderRadius: 10, padding: '10px 8px', minWidth: 60 }}>
      <p style={{ color, fontWeight: 900, fontSize: 24, margin: 0, lineHeight: 1 }}>{value}</p>
      <p style={{ color: 'var(--muted)', fontSize: 11, margin: '4px 0 0' }}>{label}</p>
    </div>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────

interface SectionCardProps {
  icon: string;
  title: string;
  subtitle: string;
  href: string;
  accentColor: string;
  badge?: number;
  chips: { value: number; label: string; color: string }[];
  alert?: string;
}

function SectionCard({ icon, title, subtitle, href, accentColor, badge, chips, alert }: SectionCardProps) {
  const [hovered, setHovered] = useState(false);
  return (
    <Link
      href={href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        background: hovered ? accentColor + '10' : 'var(--surface)',
        border: `2px solid ${hovered ? accentColor : 'var(--border)'}`,
        borderRadius: 16,
        padding: 20,
        textDecoration: 'none',
        transition: 'border-color 0.15s, box-shadow 0.15s, background 0.15s',
        boxShadow: hovered ? `0 4px 32px ${accentColor}30` : 'none',
        cursor: 'pointer',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 28, marginBottom: 4 }}>{icon}</div>
          <h3 style={{ color: 'var(--cream)', fontWeight: 900, fontSize: 15, margin: 0 }}>{title}</h3>
          <p style={{ color: 'var(--muted)', fontSize: 12, margin: '2px 0 0' }}>{subtitle}</p>
        </div>
        {badge !== undefined && badge > 0 && (
          <span style={{
            background: accentColor, color: '#fff',
            borderRadius: 999, padding: '3px 10px',
            fontSize: 12, fontWeight: 900,
            whiteSpace: 'nowrap',
          }}>
            {badge} {badge === 1 ? 'nuevo' : 'nuevos'}
          </span>
        )}
      </div>

      {/* Alert */}
      {alert && (
        <p style={{ color: accentColor, fontSize: 12, fontWeight: 700, margin: 0,
          background: accentColor + '18', borderRadius: 8, padding: '6px 10px' }}>
          ⚠️ {alert}
        </p>
      )}

      {/* Chips */}
      {chips.length > 0 && (
        <div style={{ display: 'flex', gap: 8 }}>
          {chips.map(c => <Chip key={c.label} {...c} />)}
        </div>
      )}

      {/* Footer */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4,
        color: hovered ? accentColor : 'var(--muted)',
        fontSize: 12, fontWeight: 700,
        transition: 'color 0.15s',
        marginTop: 'auto',
      }}>
        Abrir panel <span style={{ fontSize: 16, lineHeight: 1 }}>→</span>
      </div>
    </Link>
  );
}

// ─── Sidebar nav item ─────────────────────────────────────────────────────────

function NavItem({
  icon, label, href, badge, color,
}: {
  icon: string; label: string; href: string; badge?: number; color?: string;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <Link
      href={href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 12px', borderRadius: 10,
        background: hovered ? 'var(--surface2)' : 'transparent',
        color: hovered ? 'var(--cream)' : 'var(--muted)',
        textDecoration: 'none', fontSize: 13, fontWeight: 600,
        transition: 'background 0.15s, color 0.15s',
        position: 'relative',
      }}
    >
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {badge !== undefined && badge > 0 && (
        <span style={{
          background: color ?? 'var(--fire)', color: '#fff',
          borderRadius: 999, padding: '1px 7px',
          fontSize: 11, fontWeight: 900,
        }}>
          {badge}
        </span>
      )}
    </Link>
  );
}

// ─── Clock ────────────────────────────────────────────────────────────────────

function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{ textAlign: 'center', padding: '12px 0' }}>
      <p style={{ color: 'var(--cream)', fontWeight: 900, fontSize: 22, fontVariantNumeric: 'tabular-nums', margin: 0 }}>
        {now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </p>
      <p style={{ color: 'var(--muted)', fontSize: 11, marginTop: 2 }}>
        {now.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}
      </p>
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [unlocked, setUnlocked] = useState(() => isStaffSessionValid());
  const stats = useLiveStats(unlocked);

  if (!unlocked) return <PinScreen onSuccess={() => { setStaffSession(); setUnlocked(true); }} />;

  const reservasTotal = stats.reservas.pendientes + stats.reservas.confirmadas + stats.reservas.llegaron;
  const cocinaTotal   = stats.cocina.en_preparacion + stats.cocina.en_horno + stats.cocina.lista;
  const today = new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const totalPedidosActivos = stats.pedidosNuevos + stats.cocina.en_preparacion + stats.cocina.en_horno + stats.cocina.lista;

  const sections: SectionCardProps[] = [
    {
      icon: '📋',
      title: 'Pedidos',
      subtitle: 'Kanban · gestión y chat en tiempo real',
      href: '/admin/orders',
      accentColor: '#e8411a',
      badge: stats.pedidosNuevos,
      alert: stats.pedidosNuevos > 0
        ? `${stats.pedidosNuevos} pedido${stats.pedidosNuevos > 1 ? 's' : ''} nuevo${stats.pedidosNuevos > 1 ? 's' : ''} sin atender`
        : undefined,
      chips: [
        { value: stats.pedidosNuevos,                                        label: 'Nuevos',    color: '#c9a84c' },
        { value: stats.cocina.en_preparacion + stats.cocina.en_horno,        label: 'Cocinando', color: '#f59e0b' },
        { value: stats.cocina.lista,                                          label: 'Listos',    color: '#4ade80' },
      ],
    },
    {
      icon: '📅',
      title: 'Reservas',
      subtitle: `Hoy — ${today}`,
      href: '/reservas/staff',
      accentColor: '#f59e0b',
      badge: stats.reservas.pendientes,
      alert: stats.reservas.pendientes > 0 ? `${stats.reservas.pendientes} reserva${stats.reservas.pendientes > 1 ? 's' : ''} sin confirmar` : undefined,
      chips: [
        { value: stats.reservas.pendientes,  label: 'Pendientes',  color: '#f59e0b' },
        { value: stats.reservas.confirmadas, label: 'Confirmadas', color: '#4ade80' },
        { value: stats.reservas.llegaron,    label: 'Llegaron',    color: '#60a5fa' },
        { value: reservasTotal,              label: 'Total hoy',   color: 'var(--cream)' },
      ],
    },
    {
      icon: '🍕',
      title: 'Cocina',
      subtitle: 'Pedidos online activos',
      href: '/cocina',
      accentColor: '#e8411a',
      badge: cocinaTotal,
      alert: stats.cocina.lista > 0 ? `${stats.cocina.lista} pedido${stats.cocina.lista > 1 ? 's' : ''} listo${stats.cocina.lista > 1 ? 's' : ''} para retirar` : undefined,
      chips: [
        { value: stats.cocina.en_preparacion, label: 'Preparando', color: '#f59e0b' },
        { value: stats.cocina.en_horno,       label: 'En horno',   color: '#e8411a' },
        { value: stats.cocina.lista,          label: 'Listos',     color: '#4ade80' },
      ],
    },
    {
      icon: '🪑',
      title: 'Mesas',
      subtitle: `${stats.mesas.ocupada + stats.mesas.reservada} / ${TOTAL_MESAS} ocupadas`,
      href: '/reservas/staff/mesas',
      accentColor: '#60a5fa',
      chips: [
        { value: stats.mesas.libre,     label: 'Libres',      color: '#4ade80' },
        { value: stats.mesas.ocupada,   label: 'Ocupadas',    color: '#e8411a' },
        { value: stats.mesas.reservada, label: 'Reservadas',  color: '#c9a84c' },
      ],
    },
    {
      icon: '⭐',
      title: 'Club & Sellos',
      subtitle: 'Gestión de fidelidad',
      href: '/club/staff',
      accentColor: '#c9a84c',
      badge: stats.pendingStamps,
      alert: stats.pendingStamps > 0 ? `${stats.pendingStamps} solicitud${stats.pendingStamps > 1 ? 'es' : ''} de sello pendiente${stats.pendingStamps > 1 ? 's' : ''}` : undefined,
      chips: [
        { value: stats.pendingStamps, label: 'En cola', color: '#c9a84c' },
      ],
    },
    {
      icon: '📊',
      title: 'Métricas',
      subtitle: 'Análisis del club de fidelidad',
      href: '/panel',
      accentColor: '#a855f7',
      chips: [],
    },
  ];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'var(--bg)',
      display: 'grid',
      gridTemplateColumns: '220px 1fr',
      gridTemplateRows: '1fr',
      overflow: 'hidden',
    }}>

      {/* ── Sidebar ──────────────────────────────────────────────── */}
      <aside style={{
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        overflow: 'auto',
        background: 'rgba(12,11,9,0.7)',
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 16px', borderBottom: '1px solid var(--border)' }}>
          <p style={{ color: 'var(--fire)', fontWeight: 900, fontSize: 16, margin: 0 }}>🔥 La Fermata</p>
          <p style={{ color: 'var(--muted)', fontSize: 11, marginTop: 2 }}>Panel Interno</p>
        </div>

        {/* Clock */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
          <LiveClock />
        </div>

        {/* Nav */}
        <nav style={{ padding: '12px 8px', flex: 1 }}>
          <p style={{ color: 'var(--muted)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0 8px 8px' }}>
            Operaciones
          </p>
          <NavItem icon="📋" label="Pedidos"       href="/admin/orders"         badge={totalPedidosActivos}        color="#e8411a" />
          <NavItem icon="📅" label="Reservas"     href="/reservas/staff"       badge={stats.reservas.pendientes}  color="#f59e0b" />
          <NavItem icon="🍕" label="Cocina"        href="/cocina"               badge={cocinaTotal}                color="#e8411a" />
          <NavItem icon="🪑" label="Mesas"         href="/reservas/staff/mesas"                                              />
          <div style={{ marginTop: 16 }}>
            <p style={{ color: 'var(--muted)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0 8px 8px' }}>
              Club
            </p>
            <NavItem icon="⭐" label="Sellos"       href="/club/staff"           badge={stats.pendingStamps}        color="#c9a84c" />
            <NavItem icon="📊" label="Métricas"     href="/panel"                                                             />
          </div>
          <div style={{ marginTop: 16 }}>
            <a href="/" style={{
              display: 'block', padding: '6px 8px',
              color: 'var(--muted)', fontSize: 11, textDecoration: 'none',
              opacity: 0.55,
            }}>
              ↗ Ver app pública
            </a>
          </div>
        </nav>

        {/* Footer */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
          <button
            onClick={() => { clearStaffSession(); setUnlocked(false); }}
            style={{
              width: '100%', padding: '8px 12px', borderRadius: 8,
              background: 'var(--surface2)', color: 'var(--muted)',
              border: '1px solid var(--border)', cursor: 'pointer',
              fontSize: 12, fontWeight: 600,
            }}
          >
            🔒 Bloquear panel
          </button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────── */}
      <main style={{ overflow: 'auto', padding: 28 }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ color: 'var(--cream)', fontWeight: 900, fontSize: 22, margin: 0 }}>
            Panel de Control
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>
            Estado en tiempo real · {today}
          </p>
        </div>

        {/* Alert strip */}
        {(stats.reservas.pendientes > 0 || cocinaTotal > 0 || stats.pendingStamps > 0) && (
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24,
            padding: '12px 16px', borderRadius: 12,
            background: 'rgba(232,65,26,0.08)', border: '1px solid rgba(232,65,26,0.25)',
          }}>
            {stats.reservas.pendientes > 0 && (
              <Link href="/reservas/staff" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#f59e0b', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
                📅 {stats.reservas.pendientes} reserva{stats.reservas.pendientes > 1 ? 's' : ''} pendiente{stats.reservas.pendientes > 1 ? 's' : ''}
              </Link>
            )}
            {cocinaTotal > 0 && (
              <Link href="/cocina" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#e8411a', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
                🍕 {cocinaTotal} pedido{cocinaTotal > 1 ? 's' : ''} en cocina
              </Link>
            )}
            {stats.pendingStamps > 0 && (
              <Link href="/club/staff" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#c9a84c', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
                ⭐ {stats.pendingStamps} sello{stats.pendingStamps > 1 ? 's' : ''} por confirmar
              </Link>
            )}
          </div>
        )}

        {/* Section cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 16,
        }}>
          {sections.map(s => (
            <SectionCard key={s.href} {...s} />
          ))}
        </div>

        {/* Footer note */}
        <p style={{ color: 'var(--muted)', fontSize: 11, marginTop: 32, textAlign: 'center' }}>
          Datos en tiempo real vía Firestore · La Fermata — Av. Libertad 1040, Viña del Mar
        </p>
      </main>
    </div>
  );
}
