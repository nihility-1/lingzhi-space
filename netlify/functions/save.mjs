import { getStore } from '@netlify/blobs';

const SSO = 'https://sso.umrc.cn';

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
}

async function whoami(token) {
  if (!token) return null;
  try {
    const r = await fetch(SSO + '/userinfo.php', { headers: { authorization: 'Bearer ' + token } });
    if (!r.ok) return null;
    const j = await r.json();
    return j && j.sub ? String(j.sub) : null;
  } catch (e) { return null; }
}

export default async (req) => {
  if (req.method !== 'POST') return json({ ok: false, error: 'method' }, 405);
  let body;
  try { body = await req.json(); } catch (e) { return json({ ok: false, error: 'json' }, 400); }

  const sub = await whoami(body.token);
  if (!sub) return json({ ok: false, error: 'auth' }, 401);

  const store = getStore('lingzhi');
  const key = 'save:' + sub;

  if (body.op === 'load') {
    const run = (await store.get(key, { type: 'json' })) || null;
    return json({ ok: true, run });
  }
  if (body.op === 'save') {
    const run = body.run;
    if (!run || typeof run !== 'object') return json({ ok: false, error: 'run' }, 400);
    const wave = Number(run.wave) || 0;
    if (wave < 1 || wave > 400) return json({ ok: false, error: 'wave' }, 400);
    const prev = (await store.get(key, { type: 'json' })) || null;
    if (prev && Number(prev.ts) > Number(run.ts || 0)) return json({ ok: true, kept: prev.ts });
    run.ts = Date.now();
    run.at = new Date().toISOString();
    await store.setJSON(key, run);
    return json({ ok: true, ts: run.ts });
  }
  return json({ ok: false, error: 'op' }, 400);
};
