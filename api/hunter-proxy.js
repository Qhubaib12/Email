const BASE_URL = 'https://api.hunter.io/v2';
const DEFAULT_API_KEY = '0d7789b66ef5f1b8cdad6d0cc2b87d0a76be360e';

const allowedEndpoints = new Set([
  'discover',
  'domain-search',
  'email-finder',
  'email-verifier',
  'companies/find',
  'people/find',
  'combined/find',
]);

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });

  const { endpoint, method = 'GET', params = {}, apiKey } = req.body ?? {};
  if (!endpoint || !allowedEndpoints.has(endpoint)) return res.status(400).json({ error: 'Unsupported endpoint.' });

  const key = apiKey || process.env.API_KEY || process.env.HUNTER_API_KEY || DEFAULT_API_KEY;
  if (!key) return res.status(500).json({ error: 'Missing API key.' });

  const normalizedMethod = method.toUpperCase();
  if (!['GET', 'POST'].includes(normalizedMethod)) return res.status(400).json({ error: 'Unsupported method.' });

  try {
    const url = new URL(`${BASE_URL}/${endpoint}`);
    url.searchParams.set('api_key', key);
    for (const [k, v] of Object.entries(params)) {
      if (v !== null && v !== undefined && String(v).trim() !== '') url.searchParams.set(k, String(v));
    }

    const hunterRes = await fetch(url.toString(), {
      method: normalizedMethod,
      headers: normalizedMethod === 'POST' ? { 'Content-Type': 'application/json' } : undefined,
      body: normalizedMethod === 'POST' ? JSON.stringify(params) : undefined,
    });

    const text = await hunterRes.text();
    try {
      return res.status(hunterRes.status).json(JSON.parse(text));
    } catch {
      return res.status(hunterRes.status).json({ raw: text });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Request failed.', detail: error.message });
  }
}
