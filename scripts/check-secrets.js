import fs from 'node:fs';
import path from 'node:path';

const roots = ['src', 'scripts', 'test', 'public', 'pages', 'backend', '.github'];
const rootFiles = ['README.md', 'package.json', '.env.example'];
const ignored = new Set(['check-secrets.js', 'package-lock.json']);
const patterns = [
  ['chave OpenAI', /sk-(?:proj-)?[A-Za-z0-9_-]{20,}/g],
  ['chave Gemini/Google', /AIza[0-9A-Za-z_-]{30,}/g],
  ['segredo OAuth Google', /GOCSPX-[A-Za-z0-9_-]{15,}/g],
  ['refresh token Google', /"refresh_token"\s*:\s*"(?!COLE_|SEU_)[^"]{20,}"/gi],
  ['chave privada', /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/g]
];

const files = [...rootFiles.filter(fs.existsSync), ...roots.flatMap(listFiles)];
const findings = [];
for (const file of files) {
  if (ignored.has(path.basename(file)) || !isTextFile(file)) continue;
  const content = fs.readFileSync(file, 'utf8');
  for (const [label, pattern] of patterns) {
    pattern.lastIndex = 0;
    if (pattern.test(content)) findings.push(`${file}: possível ${label}`);
  }
}

if (findings.length) {
  console.error('Possíveis segredos encontrados em arquivos publicáveis:');
  findings.forEach((item) => console.error(`- ${item}`));
  process.exit(1);
}
console.log(`Auditoria de segredos OK em ${files.length} arquivos publicáveis.`);

function listFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.wrangler'].includes(entry.name)) return [];
      return listFiles(full);
    }
    return [full];
  });
}

function isTextFile(file) {
  return ['.js', '.mjs', '.json', '.md', '.yml', '.yaml', '.toml', '.sql', '.html', '.css', '.webmanifest', '.example', ''].includes(path.extname(file).toLowerCase());
}
