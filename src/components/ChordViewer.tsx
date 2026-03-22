import { useState, useMemo } from 'react';
import type { Section, SectionChords } from '../types';
import { getSectionChords } from '../utils/chords';

const ALL_CHORDS = [
  'C', 'Cm', 'C7', 'Cmaj7', 'Cm7', 'Cdim', 'Caug', 'Csus2', 'Csus4', 'C9', 'Cmaj9',
  'C#', 'C#m', 'C#7', 'C#maj7', 'C#m7', 'C#dim', 'C#sus4',
  'Db', 'Dbmaj7',
  'D', 'Dm', 'D7', 'Dmaj7', 'Dm7', 'Ddim', 'Daug', 'Dsus2', 'Dsus4', 'D9',
  'D#', 'D#m', 'D#7', 'Ebmaj7', 'Eb', 'Ebm', 'Ebm7',
  'E', 'Em', 'E7', 'Emaj7', 'Em7', 'Edim', 'Esus4',
  'F', 'Fm', 'F7', 'Fmaj7', 'Fm7', 'Fdim', 'Faug',
  'F#', 'F#m', 'F#7', 'F#maj7', 'F#m7', 'F#dim',
  'G', 'Gm', 'G7', 'Gmaj7', 'Gm7', 'Gdim', 'Gaug', 'Gsus4', 'G9',
  'G#', 'G#m', 'G#7', 'Abmaj7', 'Ab', 'Abm',
  'A', 'Am', 'A7', 'Amaj7', 'Am7', 'Adim', 'Asus2', 'Asus4', 'A9',
  'A#', 'A#m', 'Bbmaj7', 'Bb', 'Bbm', 'Bb7',
  'B', 'Bm', 'B7', 'Bmaj7', 'Bm7', 'Bdim', 'Bsus4',
];

function chordComplexity(chord: string): 'simple' | 'medium' | 'complex' {
  if (/dim|aug|b5|#11|add|11|13/.test(chord)) return 'complex';
  if (/maj7|m7|sus|9th|7/.test(chord)) return 'medium';
  return 'simple';
}

function ChordBadge({ chord, onClick }: { chord: string; color?: string; onClick?: () => void }) {
  const complexity = chordComplexity(chord);
  const bg = complexity === 'complex' ? 'from-rose-900/60 to-rose-800/40 border-rose-700/50'
    : complexity === 'medium' ? 'from-violet-900/60 to-violet-800/40 border-violet-700/50'
    : 'from-slate-800/80 to-slate-700/60 border-slate-600/50';

  return (
    <button
      onClick={onClick}
      className={`chord-cell bg-gradient-to-b ${bg} border rounded-lg px-3 py-2 min-w-[56px] text-center`}
    >
      <span className="text-sm font-bold text-white">{chord}</span>
    </button>
  );
}

function ChordEditor({ chord, onSave, onClose }: { chord: string; onSave: (c: string) => void; onClose: () => void }) {
  const [search, setSearch] = useState('');
  const filtered = useMemo(
    () => ALL_CHORDS.filter(c => c.toLowerCase().includes(search.toLowerCase())),
    [search]
  );

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-slate-800 border border-slate-600 rounded-2xl p-4 w-80 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-200">コードを選択</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-lg">×</button>
        </div>
        <input
          autoFocus
          type="text"
          placeholder="検索..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white mb-3 focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
        <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
          {filtered.map(c => (
            <button
              key={c}
              onClick={() => { onSave(c); onClose(); }}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                c === chord
                  ? 'bg-violet-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <button
          onClick={() => {
            const custom = search.trim();
            if (custom) { onSave(custom); onClose(); }
          }}
          className="mt-3 w-full text-xs py-2 rounded-lg border border-dashed border-slate-600 text-slate-400 hover:border-violet-500 hover:text-violet-400 transition-all"
        >
          カスタム: "{search}" を使用
        </button>
      </div>
    </div>
  );
}

interface Props {
  sections: Section[];
  chordData: SectionChords[];
  onChordChange: (sectionId: string, measureIdx: number, chord: string) => void;
}

export function ChordViewer({ sections, chordData, onChordChange }: Props) {
  const [editing, setEditing] = useState<{ sectionId: string; idx: number; chord: string } | null>(null);

  const getChords = (sectionId: string, measures: number) =>
    getSectionChords(sectionId, measures, chordData);

  const isEmpty = chordData.length === 0;

  return (
    <div className="flex-1 overflow-auto px-4 py-4">
      {isEmpty ? (
        <div className="flex flex-col items-center justify-center h-48 text-slate-500">
          <div className="text-4xl mb-3">♪</div>
          <p className="text-sm">「AIにコード進行を提案させる」ボタンを押してください</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sections.map(sec => {
            const chords = getChords(sec.id, sec.measures);
            return (
              <div key={sec.id} className="bg-slate-800/50 rounded-2xl border border-slate-700 overflow-hidden">
                {/* Section header */}
                <div className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-700"
                  style={{ borderLeftColor: sec.color, borderLeftWidth: 3 }}>
                  <span className="text-sm font-semibold text-white">{sec.name}</span>
                  <span className="text-xs text-slate-500">{sec.measures}小節</span>
                </div>

                {/* Chords grid */}
                <div className="px-4 py-3 flex flex-wrap gap-2">
                  {chords.map((chord, idx) => (
                    <div key={idx} className="flex flex-col items-center gap-1">
                      <span className="text-xs text-slate-600 font-mono">{idx + 1}</span>
                      <ChordBadge
                        chord={chord}
                        color={sec.color}
                        onClick={() => chord !== '—' && setEditing({ sectionId: sec.id, idx, chord })}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <ChordEditor
          chord={editing.chord}
          onSave={c => onChordChange(editing.sectionId, editing.idx, c)}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
