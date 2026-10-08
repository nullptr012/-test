import { readFile, mkdir, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const [html, css, engine, app] = await Promise.all(
  ['index.html', 'style.css', 'engine.js', 'app.js'].map(file => readFile(new URL(file, root), 'utf8'))
);
const code = engine.replace(/^export /gm, '') + '\n' + app.replace(/^import .* from '\.\/engine\.js';\n/m, '');
const standalone = html
  .replace('<link rel="stylesheet" href="style.css">', () => `<style>\n${css}\n</style>`)
  .replace('<script type="module" src="app.js"></script>', () => `<script type="module">\n${code}\n</script>`);
await mkdir(new URL('dist/', root), { recursive: true });
await writeFile(new URL('dist/chinese-chess.html', root), standalone);
console.log('Built dist/chinese-chess.html — open directly in a browser, no server needed.');
