// Runs before `next build`. The repo is stored flat (no folders); this rebuilds app/, lib/ and tests/.
import fs from 'node:fs'; import path from 'node:path';
const stray = ['analyze.ts','csv.ts','globals.css','layout.tsx','page.tsx','reader.ts','review.tsx','route.ts','safe-url.ts','supabase-browser.ts','supabase-server.ts','safe-url.test.ts'];
for (const s of stray) { try { fs.rmSync(s); } catch {} }
let moved = 0;
for (const f of fs.readdirSync('.')) {
  if (!/^(app|lib|tests)__/.test(f)) continue;
  const dest = f.replace(/_ID_/g, '[id]').split('__').join('/');
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.renameSync(f, dest); moved++;
}
console.log(`restructure: placed ${moved} files`);
