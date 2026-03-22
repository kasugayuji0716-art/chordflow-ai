import type { Section, SectionChords, SongSettings, TensionPoint } from '../types';

export interface AIRequest {
  settings: SongSettings;
  sections: Section[];
  tensionPoints: TensionPoint[];
}

export interface AIResponse {
  sectionChords: SectionChords[];
  explanation: string;
}

function buildPrompt(req: AIRequest): string {
  const { settings, sections, tensionPoints } = req;
  const totalMeasures = sections.reduce((s, sec) => s + sec.measures, 0);

  // Build tension map per measure (sort once outside loop)
  const pts = [...tensionPoints].sort((a, b) => a.measureIndex - b.measureIndex);
  const tensionMap: number[] = [];
  for (let m = 0; m <= totalMeasures; m++) {
    if (pts.length === 0) {
      tensionMap[m] = 5;
    } else if (m <= pts[0].measureIndex) {
      tensionMap[m] = pts[0].tension;
    } else if (m >= pts[pts.length - 1].measureIndex) {
      tensionMap[m] = pts[pts.length - 1].tension;
    } else {
      const afterIdx = pts.findIndex(p => p.measureIndex > m);
      const after = pts[afterIdx];
      const before = pts[afterIdx - 1];
      const t = (m - before.measureIndex) / (after.measureIndex - before.measureIndex);
      tensionMap[m] = before.tension + (after.tension - before.tension) * t;
    }
  }

  // Build section tension summary
  let measureOffset = 0;
  const sectionSummary = sections.map(sec => {
    const tensions = Array.from({ length: sec.measures }, (_, i) =>
      Math.round(tensionMap[measureOffset + i] * 10) / 10
    );
    measureOffset += sec.measures;
    const avgTension = Math.round((tensions.reduce((a, b) => a + b, 0) / tensions.length) * 10) / 10;
    return {
      id: sec.id,
      name: sec.name,
      measures: sec.measures,
      avgTension,
      tensionPerMeasure: tensions,
    };
  });

  return `あなたは音楽理論の専門家です。以下の条件に基づいてコード進行を提案してください。

## 楽曲設定
- キー: ${settings.key}
- スケール: ${settings.scale}
- BPM: ${settings.bpm}
- 拍子: ${settings.timeSignature}
- ジャンル: ${settings.genre}

## 楽曲構成とテンション
${sectionSummary.map(s =>
  `- ${s.name}: ${s.measures}小節, 平均テンション ${s.avgTension}/10, 小節別: [${s.tensionPerMeasure.join(', ')}]`
).join('\n')}

## ルール
1. テンション0-3: シンプルなダイアトニックコード（I, IV, V, vi等）
2. テンション4-6: 7thコード、sus2/sus4等を適度に使用
3. テンション7-10: 9th, 11th, dim7, aug等を積極的に使用
4. セクション間のつながりを自然にする
5. 各小節に1コード

## 出力形式
必ず以下のJSON形式のみで返答してください。日本語は explanation フィールドのみに入れてください。
コード名は英数字と記号のみ（例: Cmaj7, Am7, F#dim）。

{
  "sectionChords": [
    {
      "sectionId": "SECTION_ID_HERE",
      "patterns": [
        { "index": 0, "chord": "Cmaj7" },
        { "index": 1, "chord": "Am7" }
      ]
    }
  ],
  "explanation": "コード進行の解説"
}

セクションIDと小節数（必ずこの数だけpatternsを生成してください）:
${sections.map(s => `- ID: "${s.id}", 名前: ${s.name}, 小節数: ${s.measures}`).join('\n')}`;
}

export async function generateChords(req: AIRequest): Promise<AIResponse> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('VITE_ANTHROPIC_API_KEY が設定されていません。.env ファイルを確認してください。');
  }

  const prompt = buildPrompt(req);
  const body = JSON.stringify({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });
  const headers = {
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json',
    'anthropic-dangerous-direct-browser-access': 'true',
  };

  // 529(過負荷) / 529(レート制限) は指数バックオフでリトライ
  let response: Response | null = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', headers, body,
    });
    if (response.status !== 529) break;
    const wait = (attempt + 1) * 3000; // 3s, 6s, 9s
    await new Promise(r => setTimeout(r, wait));
  }

  if (!response!.ok) {
    const err = await response!.json().catch(() => ({}));
    const msg = (err as { error?: { message?: string } }).error?.message || response!.statusText;
    if (response!.status === 529) {
      throw new Error('Anthropic APIが混雑しています。しばらく待ってから再度お試しください。');
    }
    throw new Error(`API エラー ${response!.status}: ${msg}`);
  }

  const data = await response!.json() as {
    content: { type: string; text: string }[];
  };
  const text = data.content[0]?.text ?? '';

  // Extract outermost JSON object
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) {
    throw new Error('AIの応答からJSONを抽出できませんでした。再度お試しください。');
  }
  const jsonStr = text.slice(start, end + 1);

  let parsed: AIResponse;
  try {
    parsed = JSON.parse(jsonStr) as AIResponse;
  } catch (e) {
    // Try to fix common issues: trailing commas
    const fixed = jsonStr
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']');
    try {
      parsed = JSON.parse(fixed) as AIResponse;
    } catch {
      throw new Error(`JSONのパースに失敗しました: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return parsed;
}
