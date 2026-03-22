import { useRef, useEffect, useCallback, useState } from 'react';
import type { Section, TensionPoint } from '../types';

interface Props {
  sections: Section[];
  totalMeasures: number;
  tensionPoints: TensionPoint[];
  onChange: (points: TensionPoint[]) => void;
}

export const PRESETS = {
  flat: (total: number) => [
    { measureIndex: 0, tension: 5 },
    { measureIndex: total, tension: 5 },
  ],
  rising: (total: number) => [
    { measureIndex: 0, tension: 2 },
    { measureIndex: total * 0.4, tension: 5 },
    { measureIndex: total * 0.75, tension: 8 },
    { measureIndex: total, tension: 9 },
  ],
  wave: (total: number) => [
    { measureIndex: 0, tension: 3 },
    { measureIndex: total * 0.25, tension: 6 },
    { measureIndex: total * 0.5, tension: 4 },
    { measureIndex: total * 0.75, tension: 9 },
    { measureIndex: total, tension: 5 },
  ],
  climax: (total: number) => [
    { measureIndex: 0, tension: 2 },
    { measureIndex: total * 0.6, tension: 9 },
    { measureIndex: total, tension: 4 },
  ],
};

/** ソート済みの点列から補間（呼び出し元でソートすること） */
function interpolateSorted(pts: TensionPoint[], m: number): number {
  if (pts.length === 0) return 5;
  if (m <= pts[0].measureIndex) return pts[0].tension;
  if (m >= pts[pts.length - 1].measureIndex) return pts[pts.length - 1].tension;
  const afterIdx = pts.findIndex(p => p.measureIndex > m);
  const after = pts[afterIdx];
  const before = pts[afterIdx - 1];
  const t = (m - before.measureIndex) / (after.measureIndex - before.measureIndex);
  const s = t * t * (3 - 2 * t); // smooth step
  return before.tension + (after.tension - before.tension) * s;
}

export function TensionCurve({ sections, totalMeasures, tensionPoints, onChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [size, setSize] = useState({ width: 600, height: 200 });

  const PAD = { left: 40, right: 20, top: 16, bottom: 32 };

  const toCanvas = useCallback((m: number, t: number) => ({
    x: PAD.left + (m / Math.max(totalMeasures, 1)) * (size.width - PAD.left - PAD.right),
    y: PAD.top + (1 - t / 10) * (size.height - PAD.top - PAD.bottom),
  }), [size, totalMeasures]);

  const fromCanvas = useCallback((cx: number, cy: number) => ({
    measureIndex: Math.max(0, Math.min(totalMeasures,
      ((cx - PAD.left) / (size.width - PAD.left - PAD.right)) * totalMeasures)),
    tension: Math.max(0, Math.min(10,
      (1 - (cy - PAD.top) / (size.height - PAD.top - PAD.bottom)) * 10)),
  }), [size, totalMeasures]);

  // Resize observer
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const { width } = entries[0].contentRect;
      setSize({ width: Math.max(300, width), height: 200 });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const { width, height } = size;
    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);

    const gridW = width - PAD.left - PAD.right;
    const gridH = height - PAD.top - PAD.bottom;

    // Background
    ctx.fillStyle = '#1e2030';
    ctx.roundRect(PAD.left, PAD.top, gridW, gridH, 8);
    ctx.fill();

    // Section bands
    let offset = 0;
    sections.forEach((sec, i) => {
      const x1 = toCanvas(offset, 0).x;
      const x2 = toCanvas(offset + sec.measures, 0).x;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)';
      ctx.fillRect(x1, PAD.top, x2 - x1, gridH);

      // Section label
      ctx.fillStyle = sec.color + '99';
      ctx.font = '11px system-ui';
      ctx.textAlign = 'center';
      const mx = (x1 + x2) / 2;
      ctx.fillText(sec.name, mx, PAD.top + 14);

      // Section border
      ctx.strokeStyle = sec.color + '40';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(x1, PAD.top);
      ctx.lineTo(x1, PAD.top + gridH);
      ctx.stroke();
      ctx.setLineDash([]);

      offset += sec.measures;
    });

    // Horizontal grid lines (tension 0,2,4,6,8,10)
    for (let t = 0; t <= 10; t += 2) {
      const y = toCanvas(0, t).y;
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PAD.left, y);
      ctx.lineTo(PAD.left + gridW, y);
      ctx.stroke();

      ctx.fillStyle = '#475569';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(String(t), PAD.left - 6, y + 3);
    }

    // Smooth curve (ソートは1回、座標計算も1ループで fill + stroke 両方)
    if (totalMeasures > 0) {
      const sortedPts = [...tensionPoints].sort((a, b) => a.measureIndex - b.measureIndex);
      const steps = Math.min(totalMeasures * 4, 400);

      // 座標を1度だけ計算して再利用
      const curvePts = Array.from({ length: steps + 1 }, (_, i) => {
        const m = (i / steps) * totalMeasures;
        return toCanvas(m, interpolateSorted(sortedPts, m));
      });

      const path = new Path2D();
      curvePts.forEach(({ x, y }, i) => i === 0 ? path.moveTo(x, y) : path.lineTo(x, y));

      // Fill
      const fillPath = new Path2D(path);
      fillPath.lineTo(curvePts[curvePts.length - 1].x, PAD.top + gridH);
      fillPath.lineTo(curvePts[0].x, PAD.top + gridH);
      fillPath.closePath();
      const grad = ctx.createLinearGradient(0, PAD.top, 0, PAD.top + gridH);
      grad.addColorStop(0, 'rgba(167, 139, 250, 0.3)');
      grad.addColorStop(1, 'rgba(167, 139, 250, 0.03)');
      ctx.fillStyle = grad;
      ctx.fill(fillPath);

      // Stroke (同じ path を再利用)
      ctx.strokeStyle = '#a78bfa';
      ctx.lineWidth = 2.5;
      ctx.stroke(path);
    }

    // Control points
    tensionPoints.forEach((pt, i) => {
      const { x, y } = toCanvas(pt.measureIndex, pt.tension);
      const isHover = hoverIdx === i;
      const isDrag = draggingIdx === i;

      // Outer ring
      ctx.beginPath();
      ctx.arc(x, y, isDrag ? 10 : isHover ? 9 : 7, 0, Math.PI * 2);
      ctx.fillStyle = isDrag ? '#7c3aed' : isHover ? '#6d28d9' : '#4c1d95';
      ctx.fill();

      // Inner dot
      ctx.beginPath();
      ctx.arc(x, y, isDrag ? 5 : 4, 0, Math.PI * 2);
      ctx.fillStyle = '#c4b5fd';
      ctx.fill();

      // Tension value
      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(pt.tension.toFixed(1), x, y - 14);
    });

    // X axis labels (measure numbers)
    ctx.fillStyle = '#475569';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    const step = Math.max(1, Math.ceil(totalMeasures / 16));
    for (let m = 0; m <= totalMeasures; m += step) {
      const { x } = toCanvas(m, 0);
      ctx.fillText(String(m + 1), x, height - 6);
    }

  }, [size, sections, tensionPoints, totalMeasures, hoverIdx, draggingIdx, toCanvas]);

  const getPointIndex = useCallback((cx: number, cy: number) => {
    for (let i = 0; i < tensionPoints.length; i++) {
      const { x, y } = toCanvas(tensionPoints[i].measureIndex, tensionPoints[i].tension);
      if (Math.hypot(cx - x, cy - y) < 12) return i;
    }
    return -1;
  }, [tensionPoints, toCanvas]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const idx = getPointIndex(cx, cy);
    if (idx >= 0) {
      setDraggingIdx(idx);
    } else {
      // Add new point
      const newPt = fromCanvas(cx, cy);
      newPt.tension = Math.round(newPt.tension * 2) / 2; // snap to 0.5
      const newPoints = [...tensionPoints, newPt].sort((a, b) => a.measureIndex - b.measureIndex);
      onChange(newPoints);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    if (draggingIdx !== null) {
      const newPt = fromCanvas(cx, cy);
      const snapped = { ...newPt, tension: Math.round(newPt.tension * 2) / 2 };
      const updated = tensionPoints.map((p, i) => i === draggingIdx ? snapped : p)
        .sort((a, b) => a.measureIndex - b.measureIndex);
      onChange(updated);
      // Track index after sort using the snapped values (fromCanvas called only once)
      const newIdx = updated.findIndex(
        p => Math.abs(p.tension - snapped.tension) < 0.01 &&
             Math.abs(p.measureIndex - snapped.measureIndex) < 0.5
      );
      if (newIdx >= 0) setDraggingIdx(newIdx);
    } else {
      setHoverIdx(getPointIndex(cx, cy));
    }
  };

  const handleMouseUp = () => setDraggingIdx(null);

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const idx = getPointIndex(cx, cy);
    if (idx >= 0 && tensionPoints.length > 2) {
      onChange(tensionPoints.filter((_, i) => i !== idx));
    }
  };

  return (
    <div className="bg-slate-900 border-b border-slate-700">
      <div className="px-4 py-2 flex items-center justify-between border-b border-slate-800">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">テンションカーブ</h2>
        <div className="flex gap-2">
          <span className="text-xs text-slate-500">プリセット：</span>
          {Object.entries(PRESETS).map(([key, fn]) => (
            <button
              key={key}
              onClick={() => onChange(fn(totalMeasures))}
              className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-all"
            >
              {key === 'flat' ? 'フラット' : key === 'rising' ? '上昇' : key === 'wave' ? '波形' : 'クライマックス'}
            </button>
          ))}
          <span className="text-xs text-slate-600 ml-2">クリック: 追加 / ダブルクリック: 削除 / ドラッグ: 移動</span>
        </div>
      </div>
      <div ref={containerRef} className="w-full px-2 py-2">
        <canvas
          ref={canvasRef}
          width={size.width}
          height={size.height}
          className="tension-canvas w-full"
          style={{ height: size.height }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onDoubleClick={handleDoubleClick}
        />
      </div>
    </div>
  );
}
