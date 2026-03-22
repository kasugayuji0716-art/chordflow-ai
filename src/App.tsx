import { useState, useCallback } from 'react';
import { Header } from './components/Header';
import { SectionList, createSection } from './components/SectionList';
import { TensionCurve } from './components/TensionCurve';
import { ChordViewer } from './components/ChordViewer';
import { ExportPanel } from './components/ExportPanel';
import { MusicPanel } from './components/MusicPanel';
import { generateChords } from './api/claudeApi';
import type { Section, SectionChords, SongSettings, TensionPoint } from './types';
import './index.css';

const DEFAULT_SETTINGS: SongSettings = {
  key: 'C',
  scale: 'major',
  bpm: 120,
  timeSignature: '4/4',
  genre: 'pop',
};

const DEFAULT_SECTIONS: Section[] = [
  createSection('イントロ', 4),
  createSection('Aメロ', 8),
  createSection('Bメロ', 4),
  createSection('サビ', 8),
];

function buildDefaultChords(sections: Section[]): SectionChords[] {
  const progressions: string[][] = [
    ['Cmaj7', 'Am7', 'Fmaj7', 'G7'],                                           // イントロ (4)
    ['Cmaj7', 'Am7', 'Fmaj7', 'G7', 'Em7', 'Am7', 'Dm7', 'G7'],               // Aメロ (8)
    ['Am7', 'Em7', 'Fmaj7', 'G7'],                                             // Bメロ (4)
    ['Cmaj7', 'Am7', 'Fmaj7', 'G7', 'Em7', 'Am7', 'Dm7', 'G7sus4'],          // サビ (8)
  ];
  return sections.map((sec, i) => ({
    sectionId: sec.id,
    patterns: (progressions[i] ?? progressions[0])
      .slice(0, sec.measures)
      .map((chord, index) => ({ index, chord })),
  }));
}

function defaultTensionPoints(total: number): TensionPoint[] {
  return [
    { measureIndex: 0, tension: 3 },
    { measureIndex: total * 0.5, tension: 5 },
    { measureIndex: total * 0.75, tension: 8.5 },
    { measureIndex: total, tension: 6 },
  ];
}

export default function App() {
  const [settings, setSettings] = useState<SongSettings>(DEFAULT_SETTINGS);
  const [sections, setSections] = useState<Section[]>(DEFAULT_SECTIONS);
  const [chordData, setChordData] = useState<SectionChords[]>(() => buildDefaultChords(DEFAULT_SECTIONS));
  const [explanation, setExplanation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const totalMeasures = sections.reduce((s, sec) => s + sec.measures, 0);

  const [tensionPoints, setTensionPoints] = useState<TensionPoint[]>(() =>
    defaultTensionPoints(DEFAULT_SECTIONS.reduce((s, sec) => s + sec.measures, 0))
  );

  // When sections change, adjust tension points if total measures changed
  const handleSectionsChange = useCallback((newSections: Section[]) => {
    const newTotal = newSections.reduce((s, sec) => s + sec.measures, 0);
    const oldTotal = sections.reduce((s, sec) => s + sec.measures, 0);
    if (newTotal !== oldTotal && newTotal > 0) {
      // Scale tension points proportionally
      setTensionPoints(pts =>
        pts.map(p => ({ ...p, measureIndex: (p.measureIndex / oldTotal) * newTotal }))
      );
    }
    setSections(newSections);
  }, [sections]);

  const handleGenerate = async () => {
    if (sections.length === 0) {
      setError('セクションを1つ以上追加してください');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await generateChords({ settings, sections, tensionPoints });
      setChordData(result.sectionChords);
      setExplanation(result.explanation);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleChordChange = (sectionId: string, measureIdx: number, chord: string) => {
    setChordData(prev =>
      prev.map(sec => {
        if (sec.sectionId !== sectionId) return sec;
        const patterns = sec.patterns.map(p => p.index === measureIdx ? { ...p, chord } : p);
        return { ...sec, patterns };
      })
    );
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 overflow-hidden">
      <Header settings={settings} onChange={setSettings} />

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Section list */}
        <SectionList
          sections={sections}
          totalMeasures={totalMeasures}
          onChange={handleSectionsChange}
        />

        {/* Right: Main area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tension curve */}
          <TensionCurve
            sections={sections}
            totalMeasures={totalMeasures}
            tensionPoints={tensionPoints}
            onChange={setTensionPoints}
          />

          {/* Generate button + explanation */}
          <div className="px-4 py-3 bg-slate-900 border-b border-slate-700 flex items-center gap-4">
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all
                bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500
                text-white shadow-lg shadow-violet-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  AI が考え中...
                </>
              ) : (
                <>
                  <span>✦</span>
                  AIにコード進行を提案させる
                </>
              )}
            </button>

            {error && (
              <div className="text-sm text-red-400 bg-red-950/40 border border-red-800/50 rounded-lg px-3 py-1.5 flex-1">
                {error}
              </div>
            )}

            {explanation && !error && (
              <div className="text-xs text-slate-400 flex-1 leading-relaxed">
                <span className="text-violet-400 font-semibold">AI解説: </span>
                {explanation}
              </div>
            )}
          </div>

          {/* Chord viewer */}
          <div className="flex-1 overflow-auto flex flex-col">
            <ChordViewer
              sections={sections}
              chordData={chordData}
              onChordChange={handleChordChange}
            />
          </div>

          {/* Music generation */}
          {chordData.length > 0 && (
            <MusicPanel settings={settings} sections={sections} chordData={chordData} />
          )}

          {/* Export */}
          <ExportPanel settings={settings} sections={sections} chordData={chordData} />
        </div>
      </div>
    </div>
  );
}
