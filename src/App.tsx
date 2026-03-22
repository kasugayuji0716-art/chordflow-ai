import { useState, useCallback } from 'react';
import { Header } from './components/Header';
import { SectionList, createSection } from './components/SectionList';
import { ChordViewer } from './components/ChordViewer';
import { ExportPanel } from './components/ExportPanel';
import { MusicPanel } from './components/MusicPanel';
import { TemplateSelector } from './components/TemplateSelector';
import { generateChords } from './api/claudeApi';
import type { Section, SectionChords, SongSettings } from './types';
import type { SongTemplate } from './data/templates';
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
    ['Cmaj7', 'Am7', 'Fmaj7', 'G7'],
    ['Cmaj7', 'Am7', 'Fmaj7', 'G7', 'Em7', 'Am7', 'Dm7', 'G7'],
    ['Am7', 'Em7', 'Fmaj7', 'G7'],
    ['Cmaj7', 'Am7', 'Fmaj7', 'G7', 'Em7', 'Am7', 'Dm7', 'G7sus4'],
  ];
  return sections.map((sec, i) => ({
    sectionId: sec.id,
    patterns: (progressions[i] ?? progressions[0])
      .slice(0, sec.measures)
      .map((chord, index) => ({ index, chord })),
  }));
}

export default function App() {
  const [settings, setSettings] = useState<SongSettings>(DEFAULT_SETTINGS);
  const [sections, setSections] = useState<Section[]>(DEFAULT_SECTIONS);
  const [chordData, setChordData] = useState<SectionChords[]>(() => buildDefaultChords(DEFAULT_SECTIONS));
  const [explanation, setExplanation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);

  const totalMeasures = sections.reduce((s, sec) => s + sec.measures, 0);

  const handleSectionsChange = useCallback((newSections: Section[]) => {
    setSections(newSections);
  }, []);

  const handleTemplateSelect = (t: SongTemplate) => {
    const newSections: Section[] = t.sections.map(s => ({
      id: `s_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      name: s.name,
      measures: s.measures,
      color: s.color,
    }));
    setSettings(t.settings);
    setSections(newSections);
    setChordData(newSections.map(sec => ({
      sectionId: sec.id,
      patterns: (t.chords[sec.name] ?? [])
        .slice(0, sec.measures)
        .map((chord, index) => ({ index, chord })),
    })));
    setExplanation('');
    setError('');
  };

  const handleGenerate = async () => {
    if (sections.length === 0) {
      setError('セクションを1つ以上追加してください');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await generateChords({ settings, sections });
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
        return { ...sec, patterns: sec.patterns.map(p => p.index === measureIdx ? { ...p, chord } : p) };
      })
    );
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 overflow-hidden">
      <Header settings={settings} onChange={setSettings} />

      <div className="flex flex-1 overflow-hidden">
        <SectionList
          sections={sections}
          totalMeasures={totalMeasures}
          onChange={handleSectionsChange}
          onOpenTemplates={() => setShowTemplates(true)}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* AI提案バー */}
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
                <><span>✦</span> AIにコード進行を提案させる</>
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

          {/* コードビューア */}
          <div className="flex-1 overflow-auto flex flex-col">
            <ChordViewer
              sections={sections}
              chordData={chordData}
              settings={settings}
              onChordChange={handleChordChange}
            />
          </div>

          {chordData.length > 0 && (
            <MusicPanel settings={settings} sections={sections} chordData={chordData} />
          )}

          <ExportPanel settings={settings} sections={sections} chordData={chordData} />
        </div>
      </div>

      {showTemplates && (
        <TemplateSelector
          onSelect={handleTemplateSelect}
          onClose={() => setShowTemplates(false)}
        />
      )}
    </div>
  );
}
