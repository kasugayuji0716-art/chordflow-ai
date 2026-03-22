import type { Section, SectionChords, SongSettings } from '../types';

export interface AIRequest {
  settings: SongSettings;
  sections: Section[];
}

export interface AIResponse {
  sectionChords: SectionChords[];
  explanation: string;
}

function buildPrompt(req: AIRequest): string {
  const { settings, sections } = req;

  return `あなたは音楽理論の専門家です。以下の条件に基づいてコード進行を提案してください。

## 楽曲設定
- キー: ${settings.key}
- スケール: ${settings.scale}
- BPM: ${settings.bpm}
- 拍子: ${settings.timeSignature}
- ジャンル: ${settings.genre}

## 楽曲構成
${sections.map(s => `- ${s.name}: ${s.measures}小節`).join('\n')}

## ルール
1. イントロ・Aメロはシンプルなダイアトニックコードを中心に
2. Bメロはやや展開感のある進行（転調的動きも可）
3. サビはテンションを高め、クライマックス感を出す
4. セクション間のつながりを自然にする（ドミナントモーション等）
5. 各小節に1コード、コード名は英数字と記号のみ（例: Cmaj7, Am7, F#dim）

## 出力形式
必ず以下のJSON形式のみで返答してください。

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
  "explanation": "コード進行の解説（日本語、3文程度）"
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

  let response: Response | null = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', headers, body,
    });
    if (response.status !== 529) break;
    await new Promise(r => setTimeout(r, (attempt + 1) * 3000));
  }

  if (!response!.ok) {
    const err = await response!.json().catch(() => ({}));
    const msg = (err as { error?: { message?: string } }).error?.message || response!.statusText;
    if (response!.status === 529) {
      throw new Error('Anthropic APIが混雑しています。しばらく待ってから再度お試しください。');
    }
    throw new Error(`API エラー ${response!.status}: ${msg}`);
  }

  const data = await response!.json() as { content: { type: string; text: string }[] };
  const text = data.content[0]?.text ?? '';

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
    const fixed = jsonStr.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
    try {
      parsed = JSON.parse(fixed) as AIResponse;
    } catch {
      throw new Error(`JSONのパースに失敗しました: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return parsed;
}
