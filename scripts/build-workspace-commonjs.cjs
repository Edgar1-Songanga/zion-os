const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const outputName = process.argv[2];
if (!outputName || !/^[a-z0-9-]+$/.test(outputName)) {
  throw new Error('Pass a safe output directory name, e.g. dist-cjs');
}

const sourceDirectory = path.resolve(process.cwd(), 'src');
const stagedSource = path.resolve(process.cwd(), '.cjs-build-src');
const outputDirectory = path.resolve(process.cwd(), outputName);
const packageJsonPath = path.join(path.resolve(process.cwd()), 'package.json');
const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

if (!fs.existsSync(sourceDirectory)) throw new Error(`Missing source directory: ${sourceDirectory}`);
fs.rmSync(stagedSource, { recursive: true, force: true });
fs.mkdirSync(stagedSource, { recursive: true });
fs.cpSync(sourceDirectory, path.join(stagedSource, 'src'), { recursive: true });
fs.writeFileSync(path.join(stagedSource, 'package.json'), '{"type":"commonjs"}\n');
fs.writeFileSync(path.join(stagedSource, 'tsconfig.json'), `${JSON.stringify({
  compilerOptions: {
    target: 'ES2022',
    module: 'Node16',
    moduleResolution: 'Node16',
    rootDir: './src',
    outDir: `../${outputName}`,
    declaration: false,
    declarationMap: false,
    sourceMap: true,
    strict: true,
    skipLibCheck: true,
    noEmitOnError: true,
  },
  include: ['src/**/*.ts'],
}, null, 2)}\n`);

try {
  const compiler = spawnSync('tsc', ['-p', path.join(stagedSource, 'tsconfig.json')], {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (compiler.error) throw compiler.error;
  if (compiler.status !== 0) process.exitCode = compiler.status ?? 1;
  else {
    fs.writeFileSync(path.join(outputDirectory, 'package.json'), '{"type":"commonjs"}\n');
    console.log(`${pkg.name}: CommonJS output written to ${outputName}`);
  }
} finally {
  fs.rmSync(stagedSource, { recursive: true, force: true });
}
