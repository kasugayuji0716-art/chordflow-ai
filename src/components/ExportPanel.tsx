import { useState } from 'react';
import type { Section, SectionChords, SongSettings } from '../types';
import { getSectionChords } from '../utils/chords';

interface Props {
  settings: SongSettings;
  sections: Section[];
  chordData: SectionChords[];
}

export function ExportPanel({ settings, sections, chordData }: Props) {
  const [copied, setCopied] = useState(false);

  const getChords = (sectionId: string, measures: number) =>
    getSectionChords(sectionId, measures, chordData);

  const toText = () => {
    const lines = [`ChordFlow AI - コード進行`, `キー: ${settings.key} ${settings.scale} / BPM: ${settings.bpm} / ${settings.timeSignature} / ${settings.genre}`, ''];
    sections.forEach(sec => {
      const chords = getChords(sec.id, sec.measures);
      lines.push(`【${sec.name}】(${sec.measures}小節)`);
      lines.push(chords.join(' - '));
      lines.push('');
    });
    return lines.join('\n');
  };

  const toJSON = () => {
    return JSON.stringify({ settings, sections, chordData }, null, 2);
  };

  const copy = async () => {
    await navigator.clipboard.writeText(toText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const download = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (chordData.length === 0) return null;

  return (
    <div className="border-t border-slate-700 bg-slate-900 px-4 py-3 flex items-center gap-3">
      <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">エクスポート</span>
      <button
        onClick={copy}
        className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white transition-all"
      >
        {copied ? '✓ コピー済み' : 'テキストコピー'}
      </button>
      <button
        onClick={() => download(toText(), 'chord-progression.txt', 'text/plain')}
        className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white transition-all"
      >
        .txt 保存
      </button>
      <button
        onClick={() => download(toJSON(), 'chord-progression.json', 'application/json')}
        className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white transition-all"
      >
        .json 保存
      </button>
    </div>
  );
}
