import { build } from 'esbuild';

// The sprite module imports `?inline` assets the way Vite does; esbuild gets the same data URLs
const inlineQuery = {
  name: 'inline-query',
  setup(b) {
    b.onResolve({ filter: /\?inline$/ }, async (args) => {
      const r = await b.resolve(args.path.replace(/\?inline$/, ''), { resolveDir: args.resolveDir, kind: args.kind });
      return { path: r.path, namespace: 'inline-png' };
    });
    b.onLoad({ filter: /.*/, namespace: 'inline-png' }, async (args) => {
      const { readFile } = await import('node:fs/promises');
      return { contents: await readFile(args.path), loader: 'dataurl' };
    });
  },
};

await build({
  entryPoints: ['src/site/pet.ts'],
  outfile: 'site/pet.js',
  bundle: true,
  minify: true,
  format: 'iife',
  target: 'es2020',
  plugins: [inlineQuery],
  logLevel: 'info',
});
