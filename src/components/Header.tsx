import type { SongSettings } from '../types';

const KEYS = ['C', 'C#/Db', 'D', 'D#/Eb', 'E', 'F', 'F#/Gb', 'G', 'G#/Ab', 'A', 'A#/Bb', 'B',
  'Am', 'A#m/Bbm', 'Bm', 'Cm', 'C#m/Dbm', 'Dm', 'D#m/Ebm', 'Em', 'Fm', 'F#m/Gbm', 'Gm', 'G#m/Abm'];
const SCALES = [
  { value: 'major', label: 'メジャー' },
  { value: 'minor', label: 'マイナー' },
  { value: 'dorian', label: 'ドリアン' },
  { value: 'mixolydian', label: 'ミクソリディアン' },
  { value: 'lydian', label: 'リディアン' },
  { value: 'phrygian', label: 'フリジアン' },
];
const GENRES = [
  { value: 'pop', label: 'ポップ' },
  { value: 'rock', label: 'ロック' },
  { value: 'jazz', label: 'ジャズ' },
  { value: 'edm', label: 'EDM' },
  { value: 'rnb', label: 'R&B' },
  { value: 'ballad', label: 'バラード' },
  { value: 'folk', label: 'フォーク' },
];
const TIME_SIGNATURES = ['4/4', '3/4', '6/8'];

interface Props {
  settings: SongSettings;
  onChange: (s: SongSettings) => void;
}

function Select({ label, value, options, onChange }: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-slate-400 font-medium uppercase tracking-wider">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="bg-slate-800 border border-slate-600 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

export function Header({ settings, onChange }: Props) {
  const set = (partial: Partial<SongSettings>) => onChange({ ...settings, ...partial });

  return (
    <header className="bg-slate-900 border-b border-slate-700 px-6 py-4">
      <div className="flex items-center gap-6 flex-wrap">
        {/* Logo */}
        <div className="flex items-center gap-2 mr-4">
          <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">CF</span>
          </div>
          <span className="font-bold text-white text-lg">ChordFlow AI</span>
        </div>

        {/* Key */}
        <Select
          label="キー"
          value={settings.key}
          options={KEYS.map(k => ({ value: k, label: k }))}
          onChange={v => set({ key: v })}
        />

        {/* Scale */}
        <Select
          label="スケール"
          value={settings.scale}
          options={SCALES}
          onChange={v => set({ scale: v as SongSettings['scale'] })}
        />

        {/* BPM */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400 font-medium uppercase tracking-wider">BPM</label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={60}
              max={200}
              value={settings.bpm}
              onChange={e => set({ bpm: Number(e.target.value) })}
              className="w-24 accent-violet-500"
            />
            <span className="text-slate-200 text-sm font-mono w-8">{settings.bpm}</span>
          </div>
        </div>

        {/* Time Signature */}
        <Select
          label="拍子"
          value={settings.timeSignature}
          options={TIME_SIGNATURES.map(t => ({ value: t, label: t }))}
          onChange={v => set({ timeSignature: v as SongSettings['timeSignature'] })}
        />

        {/* Genre */}
        <Select
          label="ジャンル"
          value={settings.genre}
          options={GENRES}
          onChange={v => set({ genre: v as SongSettings['genre'] })}
        />
      </div>
    </header>
  );
}
