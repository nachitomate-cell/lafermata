'use client';

import { useEffect, useRef, useMemo } from 'react';
import { FLAVOR_NODES, FlavorProfile, normalizeProfile } from '@/lib/dna';

interface Props {
  profile: FlavorProfile;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

interface Blob {
  cx: number;
  cy: number;
  r: number;
  color: string;
  alpha: number;
  phase: number;
  orbitR: number;
  orbitSpeed: number;
  orbitAngle: number;
}

function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export default function AuraDNA({ profile, size = 240, className, style }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const normalized = useMemo(() => normalizeProfile(profile), [profile]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | null;
    if (!ctx) return;
    const gfx = ctx;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    const W = size;
    const H = size;
    const cx = W / 2;
    const cy = H / 2;

    // Build blobs: large base blobs + medium orbital blobs + sparkles
    const blobs: Blob[] = [];

    for (const node of FLAVOR_NODES) {
      const w = normalized[node.id];
      if (w < 0.01) continue;

      // Large diffuse base blob
      blobs.push({
        cx, cy,
        r: W * (0.18 + w * 0.22),
        color: node.color,
        alpha: 0.18 + w * 0.28,
        phase: Math.random() * Math.PI * 2,
        orbitR: W * (0.04 + w * 0.08),
        orbitSpeed: 0.004 + Math.random() * 0.003,
        orbitAngle: Math.random() * Math.PI * 2,
      });

      // Medium orbital blobs (1-3 based on weight)
      const count = Math.max(1, Math.round(w * 3));
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
        const dist = W * (0.12 + Math.random() * 0.15);
        blobs.push({
          cx: cx + Math.cos(angle) * dist,
          cy: cy + Math.sin(angle) * dist,
          r: W * (0.07 + w * 0.1),
          color: node.color,
          alpha: 0.22 + w * 0.3,
          phase: Math.random() * Math.PI * 2,
          orbitR: W * (0.03 + Math.random() * 0.06),
          orbitSpeed: 0.006 + Math.random() * 0.005,
          orbitAngle: Math.random() * Math.PI * 2,
        });
      }
    }

    // Center soul glow
    blobs.push({
      cx, cy, r: W * 0.06,
      color: '#ffffff',
      alpha: 0.12,
      phase: 0,
      orbitR: 0,
      orbitSpeed: 0,
      orbitAngle: 0,
    });

    let t = 0;

    function draw() {
      gfx.clearRect(0, 0, W, H);

      // Dark radial background
      const bg = gfx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.6);
      bg.addColorStop(0, 'rgba(22,18,14,1)');
      bg.addColorStop(1, 'rgba(12,11,9,1)');
      gfx.fillStyle = bg;
      gfx.fillRect(0, 0, W, H);

      gfx.globalCompositeOperation = 'screen';

      for (const blob of blobs) {
        const ox = blob.orbitR * Math.sin(t * blob.orbitSpeed + blob.orbitAngle);
        const oy = blob.orbitR * Math.cos(t * blob.orbitSpeed * 0.7 + blob.orbitAngle + blob.phase);
        const pulse = 1 + 0.06 * Math.sin(t * 0.02 + blob.phase);

        const px = blob.cx + ox;
        const py = blob.cy + oy;
        const pr = blob.r * pulse;

        const grad = gfx.createRadialGradient(px, py, 0, px, py, pr);
        grad.addColorStop(0,    hexToRgba(blob.color, blob.alpha));
        grad.addColorStop(0.45, hexToRgba(blob.color, blob.alpha * 0.5));
        grad.addColorStop(1,    'rgba(0,0,0,0)');

        gfx.fillStyle = grad;
        gfx.beginPath();
        gfx.arc(px, py, pr, 0, Math.PI * 2);
        gfx.fill();
      }

      gfx.globalCompositeOperation = 'source-over';
      t++;
      rafRef.current = requestAnimationFrame(draw);
    }

    draw();

    return () => cancelAnimationFrame(rafRef.current);
  }, [profile, size, normalized]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ borderRadius: '50%', display: 'block', ...style }}
    />
  );
}
