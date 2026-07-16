import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = path.join(root, 'public');
const targetDir = path.join(root, 'pages');
const files = ['index.html', 'styles.css', 'app.js', 'manifest.webmanifest', 'sw.js', 'icons/icon.svg'];
const checkOnly = process.argv.includes('--check');

fs.mkdirSync(targetDir, { recursive: true });

for (const file of files) {
  const source = path.join(sourceDir, file);
  const target = path.join(targetDir, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  if (checkOnly) {
    if (!fs.existsSync(target) || fs.readFileSync(source, 'utf8') !== fs.readFileSync(target, 'utf8')) {
      console.error(`Interface fora de sincronia: ${file}. Rode npm run ui:sync.`);
      process.exit(1);
    }
    continue;
  }
  fs.copyFileSync(source, target);
}

if (!checkOnly) {
  fs.writeFileSync(path.join(targetDir, '.nojekyll'), '', 'utf8');
  console.log('Dashboard sincronizado: public e pages usam a mesma interface.');
} else {
  console.log('Dashboard local e GitHub Pages estão idênticos.');
}
