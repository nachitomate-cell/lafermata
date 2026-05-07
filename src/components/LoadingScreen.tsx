'use client';

import { useEffect, useState } from 'react';

function PizzaSVG() {
  return (
    <svg
      width="140"
      height="140"
      viewBox="0 0 160 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer glow ring */}
      <circle cx="80" cy="80" r="76" fill="none" stroke="#e8411a" strokeWidth="1" opacity="0.25" />
      <circle cx="80" cy="80" r="78" fill="none" stroke="#c9a84c" strokeWidth="0.5" opacity="0.15" />

      {/* Crust */}
      <circle cx="80" cy="80" r="73" fill="#c9a84c" />
      {/* Crust inner shadow */}
      <circle cx="80" cy="80" r="73" fill="none" stroke="#a8883c" strokeWidth="3" opacity="0.5" />

      {/* Sauce */}
      <circle cx="80" cy="80" r="63" fill="#e8411a" />

      {/* Cheese base */}
      <circle cx="80" cy="80" r="59" fill="#f5d490" />

      {/* Slice cut lines — 6 slices at 60° intervals */}
      {/* 0°=top, 60°, 120°, 180°=bottom, 240°, 300° */}
      <line x1="80" y1="80" x2="80"     y2="7"      stroke="#6b3a1f" strokeWidth="1.8" opacity="0.55" />
      <line x1="80" y1="80" x2="143"    y2="44"     stroke="#6b3a1f" strokeWidth="1.8" opacity="0.55" />
      <line x1="80" y1="80" x2="143"    y2="116"    stroke="#6b3a1f" strokeWidth="1.8" opacity="0.55" />
      <line x1="80" y1="80" x2="80"     y2="153"    stroke="#6b3a1f" strokeWidth="1.8" opacity="0.55" />
      <line x1="80" y1="80" x2="17"     y2="116"    stroke="#6b3a1f" strokeWidth="1.8" opacity="0.55" />
      <line x1="80" y1="80" x2="17"     y2="44"     stroke="#6b3a1f" strokeWidth="1.8" opacity="0.55" />

      {/* Toppings — tomato/pomodoro (one per slice) */}
      <circle cx="80"  cy="40"  r="6"   fill="#c0392b" />
      <circle cx="111" cy="57"  r="5.5" fill="#c0392b" />
      <circle cx="111" cy="103" r="6"   fill="#c0392b" />
      <circle cx="80"  cy="120" r="5.5" fill="#c0392b" />
      <circle cx="49"  cy="103" r="6"   fill="#c0392b" />
      <circle cx="49"  cy="57"  r="5.5" fill="#c0392b" />

      {/* Inner tomato highlight */}
      <circle cx="80"  cy="40"  r="2.5" fill="#e74c3c" opacity="0.7" />
      <circle cx="111" cy="57"  r="2"   fill="#e74c3c" opacity="0.7" />
      <circle cx="111" cy="103" r="2.5" fill="#e74c3c" opacity="0.7" />
      <circle cx="80"  cy="120" r="2"   fill="#e74c3c" opacity="0.7" />
      <circle cx="49"  cy="103" r="2.5" fill="#e74c3c" opacity="0.7" />
      <circle cx="49"  cy="57"  r="2"   fill="#e74c3c" opacity="0.7" />

      {/* Basil / herbs */}
      <ellipse cx="95"  cy="67"  rx="5" ry="3" fill="#22c55e" opacity="0.9" transform="rotate(-30 95 67)" />
      <ellipse cx="65"  cy="93"  rx="5" ry="3" fill="#22c55e" opacity="0.9" transform="rotate(40 65 93)" />
      <ellipse cx="80"  cy="72"  rx="4" ry="2.5" fill="#16a34a" opacity="0.8" transform="rotate(15 80 72)" />

      {/* Mozzarella blobs */}
      <circle cx="80"  cy="56"  r="7"   fill="white"  opacity="0.55" />
      <circle cx="101" cy="82"  r="6"   fill="white"  opacity="0.5"  />
      <circle cx="68"  cy="97"  r="6.5" fill="white"  opacity="0.55" />
      <circle cx="88"  cy="105" r="5"   fill="white"  opacity="0.45" />
      <circle cx="60"  cy="70"  r="5.5" fill="white"  opacity="0.5"  />

      {/* Center dot */}
      <circle cx="80" cy="80" r="4" fill="#a8883c" opacity="0.6" />
      <circle cx="80" cy="80" r="2" fill="#c9a84c" opacity="0.9" />
    </svg>
  );
}

export default function LoadingScreen() {
  const [phase, setPhase] = useState<'enter' | 'visible' | 'exit' | 'done'>('enter');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('visible'), 50);
    const t2 = setTimeout(() => setPhase('exit'), 900);
    const t3 = setTimeout(() => setPhase('done'), 1400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  if (phase === 'done') return null;

  const opacity = phase === 'enter' ? 0 : phase === 'exit' ? 0 : 1;
  const scale   = phase === 'enter' ? 0.92 : 1;

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center select-none"
      style={{
        background: 'var(--bg)',
        transition: 'opacity 0.55s cubic-bezier(0.4,0,0.2,1)',
        opacity,
        pointerEvents: phase === 'exit' ? 'none' : 'auto',
      }}
    >
      {/* Ambient glow behind pizza */}
      <div
        style={{
          position: 'absolute',
          width: 260,
          height: 260,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(232,65,26,0.18) 0%, rgba(201,168,76,0.08) 50%, transparent 70%)',
          filter: 'blur(24px)',
          transform: 'translate(-50%,-50%)',
          left: '50%',
          top: '42%',
          animation: 'lf-glow-pulse 2.4s ease-in-out infinite',
        }}
      />

      {/* Pizza wrapper — float up/down */}
      <div
        style={{
          transform: `scale(${scale})`,
          transition: 'transform 0.6s cubic-bezier(0.34,1.56,0.64,1)',
          animation: 'lf-float 2.4s ease-in-out infinite',
        }}
      >
        {/* Inner wrapper — spin */}
        <div style={{ animation: 'lf-spin 4s linear infinite' }}>
          <PizzaSVG />
        </div>
      </div>

      {/* Brand name */}
      <div
        className="mt-8 text-center space-y-1.5"
        style={{
          transform: `scale(${scale})`,
          transition: 'transform 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.1s',
        }}
      >
        <p
          className="text-3xl font-black tracking-tight"
          style={{
            color: 'var(--cream)',
            letterSpacing: '-0.02em',
          }}
        >
          La Fermata
        </p>
        <p
          className="text-xs font-medium tracking-[0.2em] uppercase"
          style={{ color: 'var(--muted)' }}
        >
          Pizzería Napoletana · Viña del Mar
        </p>
      </div>

      {/* Loading dots */}
      <div className="flex gap-2 mt-10">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: i === 0 ? 'var(--fire)' : i === 1 ? 'var(--gold)' : 'var(--fire)',
              animation: `lf-dot 1.4s ease-in-out ${i * 0.18}s infinite`,
              opacity: 0.4,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes lf-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes lf-float {
          0%, 100% { transform: translateY(0px);  }
          50%       { transform: translateY(-10px); }
        }
        @keyframes lf-dot {
          0%, 80%, 100% { opacity: 0.25; transform: scale(0.8); }
          40%            { opacity: 1;    transform: scale(1.3);  }
        }
        @keyframes lf-glow-pulse {
          0%, 100% { opacity: 0.7; transform: translate(-50%,-50%) scale(1);   }
          50%       { opacity: 1;   transform: translate(-50%,-50%) scale(1.15); }
        }
      `}</style>
    </div>
  );
}
