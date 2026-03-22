import { useState, useRef, useEffect } from 'react';
import type { Section, SectionChords, SongSettings } from '../types';
import { buildMusicPrompt, startGeneration, pollUntilDone } from '../api/replicateApi';

interface Props {
  settings: SongSettings;
  sections: Section[];
  chordData: SectionChords[];
}

type GenState = 'idle' | 'starting' | 'processing' | 'succeeded' | 'failed';

const STATUS_LABEL: Record<GenState, string> = {
  idle: '',
  starting: '生成を開始しています...',
  processing: 'AI が作曲中です（30秒〜2分かかります）',
  succeeded: '生成完了',
  failed: '生成に失敗しました',
};

export function MusicPanel({ settings, sections, chordData }: Props) {
  const [duration, setDuration] = useState(30);
  const [temperature, setTemperature] = useState(1.0);
  const [guidance, setGuidance] = useState(3.0);
  const [state, setState] = useState<GenState>('idle');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [prompt, setPrompt] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const audioRef = useRef<HTMLAudioElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // コンポーネントアンマウント時にポーリングをキャンセル
  useEffect(() => () => { abortRef.current?.abort(); }, []);

  const isGenerating = state === 'starting' || state === 'processing';

  const generate = async () => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setError('');
    setAudioUrl(null);
    const p = buildMusicPrompt(settings, sections, chordData);
    setPrompt(p);
    setState('starting');

    try {
      const predictionId = await startGeneration({ prompt: p, duration, temperature, guidance });
      setState('processing');

      const url = await pollUntilDone(predictionId, (s) => {
        if (s === 'processing') setState('processing');
      }, abortRef.current.signal);

      setAudioUrl(url);
      setHistory(prev => [url, ...prev].slice(0, 5));
      setState('succeeded');
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setError(e instanceof Error ? e.message : String(e));
      setState('failed');
    }
  };

  return (
    <div className="border-t border-slate-700 bg-slate-900">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-violet-400 text-lg">♫</span>
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">AI 作曲</h2>
          <span className="text-xs text-slate-600 bg-slate-800 px-2 py-0.5 rounded-full">Powered by MusicGen</span>
        </div>
      </div>

      <div className="px-4 py-4 flex flex-wrap gap-6 items-start">
        {/* Controls */}
        <div className="flex flex-wrap gap-4 items-end">
          {/* Duration */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400 uppercase tracking-wider">長さ</label>
            <div className="flex gap-1">
              {[8, 15, 30].map(d => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    duration === d
                      ? 'bg-violet-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {d}秒
                </button>
              ))}
            </div>
          </div>

          {/* Temperature */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400 uppercase tracking-wider">
              多様性 <span className="text-slate-500 normal-case">{temperature.toFixed(1)}</span>
            </label>
            <input
              type="range" min={0.5} max={1.5} step={0.1}
              value={temperature}
              onChange={e => setTemperature(Number(e.target.value))}
              className="w-24 accent-violet-500"
            />
          </div>

          {/* Guidance */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400 uppercase tracking-wider">
              忠実度 <span className="text-slate-500 normal-case">{guidance.toFixed(1)}</span>
            </label>
            <input
              type="range" min={1} max={8} step={0.5}
              value={guidance}
              onChange={e => setGuidance(Number(e.target.value))}
              className="w-24 accent-violet-500"
            />
          </div>

          {/* Generate button */}
          <button
            onClick={generate}
            disabled={isGenerating}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all
              bg-gradient-to-r from-fuchsia-600 to-violet-600 hover:from-fuchsia-500 hover:to-violet-500
              text-white shadow-lg shadow-fuchsia-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                作曲中...
              </>
            ) : (
              <>♪ 音楽を生成する</>
            )}
          </button>
        </div>

        {/* Status + Player */}
        <div className="flex-1 min-w-60 flex flex-col gap-3">
          {/* Status message */}
          {state !== 'idle' && (
            <div className={`text-xs px-3 py-2 rounded-lg flex items-center gap-2 ${
              state === 'failed'
                ? 'bg-red-950/40 border border-red-800/50 text-red-400'
                : state === 'succeeded'
                ? 'bg-green-950/40 border border-green-800/50 text-green-400'
                : 'bg-violet-950/40 border border-violet-800/50 text-violet-300'
            }`}>
              {isGenerating && (
                <div className="flex gap-0.5">
                  {[0, 1, 2].map(i => (
                    <div key={i}
                      className="w-1 bg-violet-400 rounded-full animate-bounce"
                      style={{ height: 10 + (i % 3) * 4, animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              )}
              <span>{error || STATUS_LABEL[state]}</span>
            </div>
          )}

          {/* Prompt preview */}
          {prompt && (
            <div className="text-xs text-slate-600 bg-slate-800/50 rounded-lg px-3 py-2 font-mono leading-relaxed">
              <span className="text-slate-500">prompt: </span>{prompt}
            </div>
          )}

          {/* Audio player */}
          {audioUrl && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 flex items-center gap-3">
              <span className="text-violet-400 text-xl">♬</span>
              <audio
                ref={audioRef}
                src={audioUrl}
                controls
                className="flex-1 h-8"
                style={{ colorScheme: 'dark' }}
              />
              <a
                href={audioUrl}
                download="chordflow-music.mp3"
                className="text-xs px-2 py-1 rounded-lg bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-white transition-all whitespace-nowrap"
              >
                保存
              </a>
            </div>
          )}
        </div>
      </div>

      {/* History */}
      {history.length > 1 && (
        <div className="px-4 pb-4">
          <p className="text-xs text-slate-600 mb-2">生成履歴（最新5件）</p>
          <div className="flex flex-col gap-2">
            {history.slice(1).map((url, i) => (
              <div key={url} className="flex items-center gap-2">
                <span className="text-xs text-slate-600 w-4">{i + 2}</span>
                <audio src={url} controls className="flex-1 h-7" style={{ colorScheme: 'dark' }} />
                <a href={url} download={`chordflow-${i + 2}.mp3`}
                  className="text-xs text-slate-600 hover:text-slate-400">↓</a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
