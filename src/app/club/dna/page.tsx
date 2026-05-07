'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import AuraDNA from '@/components/AuraDNA';
import {
  FLAVOR_NODES, coerceProfile, normalizeProfile, dominantFlavor,
  actualizarDNAFlavor, FlavorId, FlavorProfile,
} from '@/lib/dna';

function FlavorPicker({ onSubmit, onClose }: {
  onSubmit: (deltas: Partial<FlavorProfile>) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<Set<FlavorId>>(new Set());

  function toggle(id: FlavorId) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleSubmit() {
    if (selected.size === 0) { onClose(); return; }
    const deltas: Partial<FlavorProfile> = {};
    for (const id of selected) deltas[id] = 1;
    onSubmit(deltas);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full rounded-t-3xl px-5 pt-5 pb-10 space-y-5"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <div className="w-10 h-1 rounded-full mx-auto mb-2" style={{ background: 'var(--border)' }} />
        <div>
          <p className="text-lg font-black" style={{ color: 'var(--cream)' }}>¿Qué sabores pediste hoy?</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Selecciona todo lo que aplique — actualiza tu ADN gastronómico</p>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {FLAVOR_NODES.map(node => {
            const active = selected.has(node.id);
            return (
              <button
                key={node.id}
                onClick={() => toggle(node.id)}
                className="flex flex-col items-center gap-1.5 py-3 rounded-2xl transition-all active:scale-90"
                style={{
                  background: active ? `${node.color}22` : 'var(--surface2)',
                  border: `2px solid ${active ? node.color : 'var(--border)'}`,
                  boxShadow: active ? `0 0 14px ${node.color}44` : 'none',
                }}
              >
                <span className="text-2xl">{node.emoji}</span>
                <span className="text-xs font-bold" style={{ color: active ? node.color : 'var(--muted)' }}>
                  {node.label}
                </span>
              </button>
            );
          })}
          {/* empty cell so grid looks balanced */}
          <div />
        </div>

        <button
          onClick={handleSubmit}
          className="w-full py-4 rounded-2xl font-black text-sm transition-all active:scale-95"
          style={{
            background: selected.size > 0
              ? 'linear-gradient(135deg,#e8411a,#c9a84c)'
              : 'var(--surface2)',
            color: selected.size > 0 ? '#fff' : 'var(--muted)',
          }}
        >
          {selected.size > 0 ? `🧬 Actualizar ADN (${selected.size} sabor${selected.size !== 1 ? 'es' : ''})` : 'Cancelar'}
        </button>
      </div>
    </div>
  );
}

export default function DNAPage() {
  const { user, userData } = useAuth();
  const router = useRouter();
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);

  if (!user || !userData) {
    router.replace('/club/unete');
    return null;
  }

  const profile = coerceProfile(userData.flavorProfile);
  const normalized = normalizeProfile(profile);
  const dominant = dominantFlavor(profile);
  const hasData = Object.values(profile).some(v => v > 0);

  async function handlePickerSubmit(deltas: Partial<FlavorProfile>) {
    setShowPicker(false);
    setSaving(true);
    try {
      await actualizarDNAFlavor(user!.uid, deltas);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch { /* no crítico */ }
    finally { setSaving(false); }
  }

  return (
    <div className="min-h-screen pb-28" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div
        className="sticky top-0 z-20 px-4 py-4 flex items-center justify-between"
        style={{
          background: 'rgba(12,11,9,0.92)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <Link href="/club" style={{ color: 'var(--muted)', fontSize: '1.4rem' }}>←</Link>
        <p className="text-sm font-black" style={{ color: 'var(--cream)' }}>Tu ADN Gastronómico</p>
        <div className="w-8" />
      </div>

      <div className="max-w-lg mx-auto px-4">

        {/* ── Aura canvas ──────────────────────────────────── */}
        <div className="flex flex-col items-center py-8 space-y-4">
          <div className="relative">
            <AuraDNA
              profile={profile}
              size={220}
              style={{
                boxShadow: hasData
                  ? `0 0 60px ${dominant.color}55, 0 0 120px ${dominant.color}22`
                  : '0 0 40px rgba(232,65,26,0.2)',
              }}
            />
            {saving && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full" style={{ background: 'rgba(0,0,0,0.5)' }}>
                <div className="w-8 h-8 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: 'var(--fire)', borderTopColor: 'transparent' }} />
              </div>
            )}
          </div>

          <div className="text-center space-y-1">
            <p className="text-xl font-black" style={{ color: 'var(--cream)' }}>
              {userData.nombre.split(' ')[0]}
            </p>
            {hasData ? (
              <p className="text-sm" style={{ color: dominant.color }}>
                {dominant.emoji} Alma de {dominant.label}
              </p>
            ) : (
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                Tu aura se formará con cada visita
              </p>
            )}
          </div>

          {saved && (
            <div
              className="px-4 py-2 rounded-full text-sm font-bold"
              style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)' }}
            >
              ✅ ADN actualizado
            </div>
          )}
        </div>

        {/* ── Flavor bars ──────────────────────────────────── */}
        <div
          className="rounded-3xl p-5 space-y-4 mb-5"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
            Perfil de sabores
          </p>

          {!hasData && (
            <p className="text-sm text-center py-4" style={{ color: 'var(--muted)' }}>
              Aún no hay datos — actualiza tu ADN después de cada visita
            </p>
          )}

          {FLAVOR_NODES.map(node => {
            const pct = Math.round(normalized[node.id] * 100);
            const raw = profile[node.id];
            return (
              <div key={node.id} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{node.emoji}</span>
                    <span className="text-sm font-bold" style={{ color: pct > 0 ? node.color : 'var(--muted)' }}>
                      {node.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: 'var(--muted)' }}>{raw} pts</span>
                    <span className="text-xs font-black w-8 text-right" style={{ color: pct > 0 ? node.color : 'var(--muted)' }}>
                      {pct}%
                    </span>
                  </div>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface2)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${pct}%`,
                      background: pct > 0 ? `linear-gradient(90deg, ${node.color}99, ${node.color})` : 'transparent',
                      boxShadow: pct > 15 ? `0 0 8px ${node.color}66` : 'none',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Dominant flavor personality ───────────────────── */}
        {hasData && (
          <div
            className="rounded-3xl p-5 mb-5 space-y-2"
            style={{
              background: `${dominant.color}12`,
              border: `1px solid ${dominant.color}33`,
            }}
          >
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: dominant.color }}>
              Tu personalidad gastronómica
            </p>
            <p className="text-2xl font-black" style={{ color: 'var(--cream)' }}>
              {dominant.emoji} El/La amante del {dominant.label}
            </p>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>{dominant.desc}</p>
          </div>
        )}

        {/* ── Update DNA button ─────────────────────────────── */}
        <button
          onClick={() => setShowPicker(true)}
          className="w-full py-4 rounded-2xl font-black text-sm transition-all active:scale-95 mb-5"
          style={{ background: 'linear-gradient(135deg,#e8411a,#c9a84c)', color: '#fff' }}
        >
          🧬 Actualizar mi ADN
        </button>

        <p className="text-xs text-center pb-5" style={{ color: 'var(--muted)' }}>
          Actualiza después de cada visita para que tu aura refleje tu verdadero gusto
        </p>
      </div>

      {showPicker && (
        <FlavorPicker
          onSubmit={handlePickerSubmit}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}
