import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

const headers = () => ({
  Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
  'Content-Type': 'application/json',
});

// モデルの最新バージョンIDをキャッシュ
let cachedVersionId: string | null = null;

async function getLatestVersionId(): Promise<string> {
  if (cachedVersionId) return cachedVersionId;

  const res = await fetch('https://api.replicate.com/v1/models/meta/musicgen/versions', {
    headers: headers(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`モデルバージョン取得失敗 ${res.status}: ${text}`);
  }

  const data = await res.json() as { results: { id: string }[] };
  const versionId = data.results[0]?.id;
  if (!versionId) throw new Error('バージョンIDが見つかりませんでした');

  cachedVersionId = versionId;
  console.log(`[Replicate] using version: ${versionId}`);
  return versionId;
}

// POST /api/generate-music
app.post('/api/generate-music', async (req, res) => {
  if (!REPLICATE_API_TOKEN) {
    res.status(500).json({ error: 'REPLICATE_API_TOKEN が設定されていません' });
    return;
  }

  const { prompt, duration, temperature, guidance } = req.body as {
    prompt: string;
    duration: number;
    temperature: number;
    guidance: number;
  };

  try {
    const versionId = await getLatestVersionId();

    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        version: versionId,
        input: {
          prompt,
          duration: Math.min(30, Math.max(1, duration)),
          temperature,
          classifier_free_guidance: guidance,
          output_format: 'mp3',
          normalization_strategy: 'loudness',
        },
      }),
    });

    if (!response.ok) {
      const err = await response.json() as { detail?: string };
      res.status(response.status).json({ error: err.detail ?? 'Replicate API エラー' });
      return;
    }

    const prediction = await response.json() as { id: string; status: string };
    res.json({ predictionId: prediction.id, status: prediction.status });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// GET /api/prediction/:id
app.get('/api/prediction/:id', async (req, res) => {
  if (!REPLICATE_API_TOKEN) {
    res.status(500).json({ error: 'REPLICATE_API_TOKEN が設定されていません' });
    return;
  }

  try {
    const response = await fetch(
      `https://api.replicate.com/v1/predictions/${req.params.id}`,
      { headers: headers() }
    );

    if (!response.ok) {
      res.status(response.status).json({ error: 'prediction の取得に失敗しました' });
      return;
    }

    const pred = await response.json() as {
      status: string;
      output: string | null;
      error: string | null;
    };

    res.json({ status: pred.status, output: pred.output, error: pred.error });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`[API] http://localhost:${PORT}`);
});
