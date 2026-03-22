import { useState } from 'react';
import { TEMPLATES, type SongTemplate } from '../data/templates';
import { playChord } from '../utils/tonePlayer';

interface Props {
  onSelect: (t: SongTemplate) => void;
  onClose: () => void;
}

export function TemplateSelector({ onSelect, onClose }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);

  const preview = (t: SongTemplate) => {
    // イントロの最初の4コードを順番にプレビュー
    const firstSection = t.sections[0].name;
    const chords = t.chords[firstSection] ?? [];
    chords.slice(0, 4).forEach((chord, i) => {
      setTimeout(() => playChord(chord, 0.6), i * 700);
    });
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-2xl shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-white">テンプレートから始める</h2>
            <p className="text-xs text-slate-500 mt-0.5">ホバーでサウンドプレビュー</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">×</button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {TEMPLATES.map(t => (
            <button
              key={t.id}
              onClick={() => { onSelect(t); onClose(); }}
              onMouseEnter={() => { setHovered(t.id); preview(t); }}
              onMouseLeave={() => setHovered(null)}
              className={`text-left p-4 rounded-xl border transition-all ${
                hovered === t.id
                  ? 'border-violet-500 bg-violet-950/40'
                  : 'border-slate-700 bg-slate-800 hover:border-slate-500'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-3xl">{t.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white text-sm">{t.name}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{t.description}</div>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">
                      {t.settings.key} {t.settings.scale}
                    </span>
                    <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">
                      {t.settings.bpm} BPM
                    </span>
                    <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">
                      {t.sections.length}セクション
                    </span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full text-sm py-2 rounded-xl border border-dashed border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-500 transition-all"
        >
          空白から始める
        </button>
      </div>
    </div>
  );
}
