import type { Section, SectionChords, SongSettings } from '../types';

const GENRE_LABEL: Record<string, string> = {
  pop: 'pop music',
  rock: 'rock music',
  jazz: 'jazz music',
  edm: 'electronic dance music with synthesizers',
  rnb: 'R&B soul music',
  ballad: 'emotional ballad',
  folk: 'acoustic folk music',
};

const SCALE_LABEL: Record<string, string> = {
  major: 'major',
  minor: 'minor',
  dorian: 'dorian mode',
  mixolydian: 'mixolydian mode',
  lydian: 'lydian mode',
  phrygian: 'phrygian mode',
};

function getChordLine(sectionId: string, measures: number, chordData: SectionChords[]): string {
  const sec = chordData.find(d => d.sectionId === sectionId);
  if (!sec) return '';
  const arr = Array<string>(measures).fill('');
  sec.patterns.forEach(p => { if (p.index < measures) arr[p.index] = p.chord; });
  return arr.filter(Boolean).join(' - ');
}

export function buildMusicPrompt(
  settings: SongSettings,
  sections: Section[],
  chordData: SectionChords[]
): string {
  const genre = GENRE_LABEL[settings.genre] ?? settings.genre;
  const scale = SCALE_LABEL[settings.scale] ?? settings.scale;

  const chordSummary = sections
    .map(sec => {
      const line = getChordLine(sec.id, sec.measures, chordData);
      return line ? `${sec.name}(${line})` : null;
    })
    .filter(Boolean)
    .join(', ');

  return [
    `${genre}`,
    `key of ${settings.key} ${scale}`,
    `chord progression: ${chordSummary}`,
    `${settings.bpm} BPM`,
    `${settings.timeSignature} time signature`,
    'instrumental, high quality, studio recording',
  ].join(', ');
}

export interface GenerationOptions {
  prompt: string;
  duration: number;
  temperature: number;
  guidance: number;
}

export interface PredictionStatus {
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  output: string | null;
  error: string | null;
}

export async function startGeneration(opts: GenerationOptions): Promise<string> {
  const res = await fetch('/api/generate-music', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(opts),
  });
  const data = await res.json() as { predictionId?: string; error?: string };
  if (!res.ok || !data.predictionId) {
    throw new Error(data.error ?? '生成の開始に失敗しました');
  }
  return data.predictionId;
}

export async function getPrediction(id: string): Promise<PredictionStatus> {
  const res = await fetch(`/api/prediction/${id}`);
  const data = await res.json() as PredictionStatus & { error?: string };
  if (!res.ok) throw new Error((data as { error?: string }).error ?? 'ステータス取得失敗');
  return data;
}

export async function pollUntilDone(
  predictionId: string,
  onStatus: (s: string) => void,
  signal?: AbortSignal,
  intervalMs = 2000
): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = setInterval(async () => {
      if (signal?.aborted) {
        clearInterval(timer);
        reject(new DOMException('キャンセルされました', 'AbortError'));
        return;
      }
      try {
        const pred = await getPrediction(predictionId);
        onStatus(pred.status);
        if (pred.status === 'succeeded') {
          clearInterval(timer);
          resolve(pred.output!);
        } else if (pred.status === 'failed' || pred.status === 'canceled') {
          clearInterval(timer);
          reject(new Error(pred.error ?? '生成に失敗しました'));
        }
      } catch (e) {
        clearInterval(timer);
        reject(e);
      }
    }, intervalMs);

    signal?.addEventListener('abort', () => {
      clearInterval(timer);
      reject(new DOMException('キャンセルされました', 'AbortError'));
    });
  });
}
