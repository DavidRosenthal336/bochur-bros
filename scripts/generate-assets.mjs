/**
 * A stub, for later: make art with the OpenAI image API instead of by hand.
 *
 *   npm run assets:generate                    list what it would make, cost nothing
 *   npm run assets:generate -- --only coin     the same, for one asset
 *
 * It reads the same prompts as ASSETS.md (tools/assets/manifest.mjs) and would
 * save each result into assets/raw/ under the name the pipeline expects, so
 * `npm run assets` picks it up exactly as it does art saved from ChatGPT.
 *
 * IT DOES NOT CALL THE API. Image generation is paid, so the request is
 * written but switched off (`ENABLED` below). Turning it on is a deliberate
 * edit, not a flag someone can pass by accident. It needs OPENAI_API_KEY in a
 * .env file at the root of the repo (see .env.example); .env is gitignored, so
 * the key never ends up in the repository.
 *
 * Reference images: the prompts say "using my reference images". The API's
 * image-edit endpoint takes input images for that; this stub sends none, so
 * when it is switched on, decide which references to attach (assets/reference/
 * holds the current art, enlarged).
 */
import { existsSync, readFileSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { ASSETS, promptFor } from '../tools/assets/manifest.mjs';

/** Off. Paid API. See the note at the top before changing this. */
const ENABLED = false;
const MODEL = 'gpt-image-1';

/** OPENAI_API_KEY from .env, without a dependency for it. */
function readEnv(file = '.env') {
  if (!existsSync(file)) return {};
  const env = {};
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return env;
}

/** Would ask for one image and save it as assets/raw/<id>.png. Never runs while ENABLED is false. */
async function generate(asset, apiKey) {
  if (!ENABLED) throw new Error('generation is switched off (ENABLED = false in scripts/generate-assets.mjs)');
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, prompt: promptFor(asset), size: '1536x1024', background: 'transparent' }),
  });
  if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
  const { data } = await response.json();
  const { writeFile } = await import('node:fs/promises');
  await writeFile(`assets/raw/${asset.id}.png`, Buffer.from(data[0].b64_json, 'base64'));
}

const args = process.argv.slice(2);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : undefined;
const have = new Set(
  existsSync('assets/raw')
    ? (await readdir('assets/raw')).map((f) => f.replace(/\.(png|jpe?g|webp)$/i, '').split('-')[0])
    : [],
);
const todo = ASSETS.filter((a) => (only ? a.id === only : !have.has(a.id)));
const key = readEnv().OPENAI_API_KEY ?? process.env.OPENAI_API_KEY;

console.log(`${todo.length} asset(s) with no raw art yet${only ? ` (only ${only})` : ''}, in priority order:`);
for (const a of todo) console.log(`  [${a.priority}] ${a.id}`);
console.log(
  `\nOPENAI_API_KEY: ${key ? 'found' : 'not set (put it in .env — see .env.example)'}. ` +
    `Generation: ${ENABLED ? 'ON' : 'OFF — nothing was sent, nothing was spent'}.`,
);
if (ENABLED && key) {
  for (const a of todo) {
    try { await generate(a, key); console.log(`  ✓ ${a.id}`); } catch (e) { console.error(`  ✗ ${a.id}: ${e.message}`); }
  }
}
