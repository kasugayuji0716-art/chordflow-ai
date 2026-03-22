import { useState } from 'react';
import type { Section } from '../types';

const SECTION_PRESETS = [
  { name: 'イントロ', color: '#6366f1' },
  { name: 'Aメロ', color: '#22d3ee' },
  { name: 'Bメロ', color: '#f59e0b' },
  { name: 'サビ', color: '#ec4899' },
  { name: 'Cメロ', color: '#10b981' },
  { name: 'ラスサビ', color: '#f43f5e' },
  { name: 'アウトロ', color: '#8b5cf6' },
];

const COLORS = [
  '#6366f1', '#22d3ee', '#f59e0b', '#ec4899',
  '#10b981', '#f43f5e', '#8b5cf6', '#06b6d4',
  '#84cc16', '#f97316',
];

let colorIndex = 0;
function nextColor() {
  const c = COLORS[colorIndex % COLORS.length];
  colorIndex++;
  return c;
}

export function createSection(name: string, measures = 4): Section {
  return {
    id: `s_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    name,
    measures,
    color: nextColor(),
  };
}

interface Props {
  sections: Section[];
  totalMeasures: number;
  onChange: (sections: Section[]) => void;
  onOpenTemplates: () => void;
}

export function SectionList({ sections, totalMeasures, onChange, onOpenTemplates }: Props) {
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const add = (preset?: { name: string; color: string }) => {
    const name = preset?.name ?? `セクション${sections.length + 1}`;
    const color = preset?.color ?? nextColor();
    onChange([...sections, { id: `s_${Date.now()}`, name, measures: 4, color }]);
  };

  const remove = (id: string) => onChange(sections.filter(s => s.id !== id));

  const update = (id: string, partial: Partial<Section>) => {
    onChange(sections.map(s => s.id === id ? { ...s, ...partial } : s));
  };

  const handleDragStart = (id: string) => setDragging(id);
  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    setDragOver(id);
  };
  const handleDrop = (targetId: string) => {
    if (!dragging || dragging === targetId) return;
    const newSections = [...sections];
    const fromIdx = newSections.findIndex(s => s.id === dragging);
    const toIdx = newSections.findIndex(s => s.id === targetId);
    const [item] = newSections.splice(fromIdx, 1);
    newSections.splice(toIdx, 0, item);
    onChange(newSections);
    setDragging(null);
    setDragOver(null);
  };

  return (
    <div className="bg-slate-900 border-r border-slate-700 flex flex-col h-full" style={{ width: 260, minWidth: 260 }}>
      <div className="px-4 py-3 border-b border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">楽曲構成</h2>
          <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded font-mono">
            {totalMeasures} 小節
          </span>
        </div>
        <button
          onClick={onOpenTemplates}
          className="w-full text-xs py-1.5 rounded-lg bg-violet-950/50 border border-violet-800/50
            text-violet-400 hover:bg-violet-900/50 hover:text-violet-300 transition-all"
        >
          🎵 テンプレートから選ぶ
        </button>
      </div>

      {/* Section list */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {sections.map(sec => (
          <div
            key={sec.id}
            draggable
            onDragStart={() => handleDragStart(sec.id)}
            onDragOver={e => handleDragOver(e, sec.id)}
            onDrop={() => handleDrop(sec.id)}
            onDragEnd={() => { setDragging(null); setDragOver(null); }}
            className={`rounded-xl border transition-all ${
              dragOver === sec.id ? 'border-violet-400 bg-slate-700' : 'border-slate-700 bg-slate-800'
            } ${dragging === sec.id ? 'opacity-50' : ''}`}
          >
            <div className="flex items-center gap-2 px-3 py-2">
              {/* Color indicator + drag handle */}
              <div className="drag-handle flex flex-col gap-0.5 opacity-40 hover:opacity-70">
                <div className="w-3 h-0.5 bg-slate-400 rounded" />
                <div className="w-3 h-0.5 bg-slate-400 rounded" />
                <div className="w-3 h-0.5 bg-slate-400 rounded" />
              </div>
              <div className="w-2.5 h-8 rounded-full flex-shrink-0" style={{ background: sec.color }} />

              {/* Name input */}
              <input
                type="text"
                value={sec.name}
                onChange={e => update(sec.id, { name: e.target.value })}
                className="flex-1 bg-transparent text-slate-200 text-sm font-medium focus:outline-none focus:text-white min-w-0"
              />

              {/* Remove */}
              <button
                onClick={() => remove(sec.id)}
                className="text-slate-600 hover:text-red-400 transition-colors text-lg leading-none flex-shrink-0"
              >
                ×
              </button>
            </div>

            {/* Measures control */}
            <div className="px-3 pb-2 flex items-center gap-2">
              <span className="text-xs text-slate-500">小節数</span>
              <button
                onClick={() => update(sec.id, { measures: Math.max(1, sec.measures - 1) })}
                className="w-5 h-5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs flex items-center justify-center transition-colors"
              >−</button>
              <input
                type="number"
                min={1}
                max={64}
                value={sec.measures}
                onChange={e => update(sec.id, { measures: Math.max(1, Math.min(64, Number(e.target.value))) })}
                className="w-10 bg-slate-700 text-slate-200 text-xs text-center rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
              <button
                onClick={() => update(sec.id, { measures: Math.min(64, sec.measures + 1) })}
                className="w-5 h-5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs flex items-center justify-center transition-colors"
              >+</button>
            </div>
          </div>
        ))}
      </div>

      {/* Add section */}
      <div className="px-3 py-3 border-t border-slate-700 space-y-2">
        <p className="text-xs text-slate-500 mb-2">プリセットから追加</p>
        <div className="flex flex-wrap gap-1">
          {SECTION_PRESETS.map(p => (
            <button
              key={p.name}
              onClick={() => add(p)}
              className="text-xs px-2 py-1 rounded-lg border border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200 transition-all"
              style={{ borderColor: `${p.color}40`, color: p.color }}
            >
              {p.name}
            </button>
          ))}
        </div>
        <button
          onClick={() => add()}
          className="w-full text-sm py-2 rounded-xl border border-dashed border-slate-600 text-slate-400 hover:border-violet-500 hover:text-violet-400 transition-all"
        >
          + カスタム追加
        </button>
      </div>
    </div>
  );
}
