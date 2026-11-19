import { getStore } from '@netlify/blobs';

const KEY = 'top';
const LIMIT = 20;

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
}

export default async (req) => {
  const store = getStore('lingzhi');
  if (req.method === 'GET') {
    const top = (await store.get(KEY, { type: 'json' })) || [];
    return json({ ok: true, top });
  }
  if (req.method !== 'POST') return json({ ok: false, error: 'method' }, 405);

  let body;
  try { body = await req.json(); } catch (e) { return json({ ok: false, error: 'json' }, 400); }

  const name = String(body.name || '无名鲸').slice(0, 12).replace(/[<>&\"]/g, '');
  const wave = Number(body.wave);
  if (!Number.isInteger(wave) || wave < 1 || wave > 400) return json({ ok: false, error: 'wave' }, 400);

  const ip = req.headers.get('x-nf-client-connection-ip') || 'unknown';
  const rk = 'rl:' + ip;
  const last = Number(await store.get(rk)) || 0;
  const now = Date.now();
  if (now - last < 20000) return json({ ok: false, error: 'slow' }, 429);
  await store.set(rk, String(now));

  const top = (await store.get(KEY, { type: 'json' })) || [];
  top.push({ name, wave, ts: now });
  top.sort((a, b) => b.wave - a.wave || a.ts - b.ts);
  await store.setJSON(KEY, top.slice(0, LIMIT));
  return json({ ok: true });
};
