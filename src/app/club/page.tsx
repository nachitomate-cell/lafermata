'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import QRCode from 'react-qr-code';
import { useAuth } from '@/context/AuthContext';
import { getTier, STAMPS_PER_REWARD, TIERS } from '@/lib/puntos';

function formatCLP(n: number) {
  return '$' + n.toLocaleString('es-CL');
}

function StampGrid({ count, total }: { count: number; total: number }) {
  const inCycle = count % STAMPS_PER_REWARD;
  const filled = inCycle === 0 && count > 0 ? STAMPS_PER_REWARD : inCycle;

  return (
    <div className="flex items-center justify-center gap-2 flex-wrap">
      {Array.from({ length: STAMPS_PER_REWARD }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-center w-11 h-11 rounded-full text-xl transition-all"
          style={{
            background: i < filled
              ? 'linear-gradient(135deg, #e8411a, #c9a84c)'
              : 'var(--surface2)',
            border: `2px solid ${i < filled ? '#e8411a' : 'var(--border)'}`,
            boxShadow: i < filled ? '0 0 12px rgba(232,65,26,0.4)' : 'none',
          }}
        >
          {i < filled ? '🔥' : '○'}
        </div>
      ))}
    </div>
  );
}

export default function ClubPage() {
  const { user, userData, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/club/unete');
  }, [user, loading, router]);

  if (loading || !user || !userData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: 'var(--fire)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  const tier = getTier(userData.totalSellosHistoricos);
  const inCycle = userData.sellos % STAMPS_PER_REWARD;
  const remaining = inCycle === 0 && userData.sellos > 0 ? 0 : STAMPS_PER_REWARD - inCycle;
  const progressPct = ((inCycle === 0 && userData.sellos > 0 ? STAMPS_PER_REWARD : inCycle) / STAMPS_PER_REWARD) * 100;
  const nextTier = TIERS.find(t => t.min > userData.totalSellosHistoricos);

  return (
    <div className="min-h-screen pb-28">
      {/* Club hero header */}
      <div
        className="relative overflow-hidden px-4 pt-8 pb-10 text-center"
        style={{
          background: 'linear-gradient(180deg, rgba(232,65,26,0.12) 0%, var(--bg) 100%)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        {/* Badge logo */}
        <div className="flex justify-center mb-4">
          <div
            className="relative w-16 h-16 rounded-full overflow-hidden"
            style={{
              border: `2px solid ${tier.color}88`,
              boxShadow: `0 0 20px ${tier.color}33`,
            }}
          >
            <Image src="/images/logo2.jpg" alt="La Fermata Club" fill className="object-cover" />
          </div>
        </div>

        <div className="relative z-10 space-y-2">
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold mb-1"
            style={{
              background: `${tier.color}22`,
              border: `1px solid ${tier.color}66`,
              color: tier.color,
            }}
          >
            {tier.emoji} {tier.name}
          </div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--cream)' }}>
            {userData.nombre.split(' ')[0]}
          </h1>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            Miembro desde {new Date(userData.createdAt).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 space-y-5 mt-5">

        {/* ── Sello Progress Card ─────────────────────────────── */}
        <div
          className="rounded-3xl p-5 space-y-4"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
                Sellos actuales
              </p>
              <p className="text-4xl font-black mt-0.5" style={{ color: 'var(--cream)' }}>
                {userData.sellos}
                <span className="text-base ml-1" style={{ color: 'var(--muted)' }}>/ ciclo</span>
              </p>
            </div>
            {userData.recompensaDisponible && (
              <Link
                href="/club/premios"
                className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-sm font-black animate-pulse"
                style={{ background: 'var(--fire)', color: '#fff' }}
              >
                🎁 Canjear
              </Link>
            )}
          </div>

          {/* Stamps visual */}
          <StampGrid count={userData.sellos} total={userData.totalSellosHistoricos} />

          {/* Progress bar */}
          <div>
            <div
              className="h-2 rounded-full overflow-hidden"
              style={{ background: 'var(--surface2)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${progressPct}%`,
                  background: 'linear-gradient(90deg, #e8411a, #c9a84c)',
                }}
              />
            </div>
            <p className="text-xs mt-2 text-center" style={{ color: 'var(--muted)' }}>
              {userData.recompensaDisponible
                ? '🎉 ¡Tienes una recompensa disponible!'
                : `${remaining} sello${remaining !== 1 ? 's' : ''} para tu próxima recompensa`}
            </p>
          </div>
        </div>

        {/* ── QR Card ─────────────────────────────────────────── */}
        <div
          className="rounded-3xl overflow-hidden"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <div className="px-5 pt-5 pb-3">
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
              Tu código QR
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--cream)' }}>
              Muéstralo al staff para sumar un sello
            </p>
          </div>
          <div className="flex justify-center pb-5 px-5">
            <div
              className="rounded-2xl p-4"
              style={{ background: '#fff' }}
            >
              <QRCode
                value={`lafermata://stamp?userId=${user.uid}&name=${encodeURIComponent(userData.nombre)}`}
                size={180}
                bgColor="#ffffff"
                fgColor="#0c0b09"
                level="M"
              />
            </div>
          </div>
          <div
            className="px-5 py-3 flex items-center justify-between"
            style={{ background: 'var(--surface2)', borderTop: '1px solid var(--border)' }}
          >
            <p className="text-xs font-mono" style={{ color: 'var(--muted)' }}>
              ID: {user.uid.substring(0, 12)}...
            </p>
            <Link
              href="/club/scan"
              className="text-xs font-bold flex items-center gap-1"
              style={{ color: 'var(--fire)' }}
            >
              📷 Escanear local
            </Link>
          </div>
        </div>

        {/* ── Stats ───────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total sellos', value: userData.totalSellosHistoricos, icon: '🔥' },
            { label: 'Canjes', value: userData.totalCanjesHistoricos, icon: '🎁' },
            { label: 'Nivel', value: tier.name, icon: tier.emoji },
          ].map(stat => (
            <div
              key={stat.label}
              className="rounded-2xl p-3 text-center"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <div className="text-2xl mb-1">{stat.icon}</div>
              <p className="text-base font-black" style={{ color: 'var(--cream)' }}>{stat.value}</p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>{stat.label}</p>
            </div>
          ))}
        </div>

        {/* ── Tier Progress ────────────────────────────────────── */}
        <div
          className="rounded-3xl p-5 space-y-4"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
            Niveles del club
          </p>
          <div className="space-y-2">
            {TIERS.map(t => {
              const isActive = tier.name === t.name;
              const isUnlocked = userData.totalSellosHistoricos >= t.min;
              return (
                <div
                  key={t.name}
                  className="flex items-center gap-3 rounded-2xl p-3 transition-all"
                  style={{
                    background: isActive ? `${t.color}18` : 'var(--surface2)',
                    border: `1px solid ${isActive ? t.color + '44' : 'var(--border)'}`,
                  }}
                >
                  <span className="text-xl">{t.emoji}</span>
                  <div className="flex-1">
                    <p
                      className="text-sm font-bold"
                      style={{ color: isUnlocked ? t.color : 'var(--muted)' }}
                    >
                      {t.name}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>
                      Desde {t.min} sellos acumulados
                    </p>
                  </div>
                  {isActive && (
                    <span
                      className="text-xs font-black px-2 py-0.5 rounded-full"
                      style={{ background: t.color, color: '#fff' }}
                    >
                      Actual
                    </span>
                  )}
                  {!isActive && isUnlocked && (
                    <span className="text-lg">✅</span>
                  )}
                </div>
              );
            })}
          </div>
          {nextTier && (
            <p className="text-xs text-center" style={{ color: 'var(--muted)' }}>
              Faltan {nextTier.min - userData.totalSellosHistoricos} sellos para {nextTier.emoji} {nextTier.name}
            </p>
          )}
        </div>

        {/* ── Actions ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/club/premios"
            className="flex flex-col items-center gap-2 rounded-2xl p-4 text-center transition-all active:scale-95"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <span className="text-3xl">🎁</span>
            <p className="text-sm font-bold" style={{ color: 'var(--cream)' }}>Ver Premios</p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>Canjea tus sellos</p>
          </Link>
          <Link
            href="/club/scan"
            className="flex flex-col items-center gap-2 rounded-2xl p-4 text-center transition-all active:scale-95"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <span className="text-3xl">📷</span>
            <p className="text-sm font-bold" style={{ color: 'var(--cream)' }}>Escanear</p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>QR del local</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
