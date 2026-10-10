import type { FS } from '../lib/store';

// A file system in memory, for tests. (A call that would be a crash on the phone throws here too.)
export function memFs(): FS & { files: Map<string, string>; failNextMove: boolean } {
  const files = new Map<string, string>();
  const dirs = new Set<string>();
  const fs = {
    files, failNextMove: false,
    async read(p: string) { return files.has(p) ? files.get(p)! : null; },
    async write(p: string, t: string) { files.set(p, t); },
    async remove(p: string) { files.delete(p); },
    async move(from: string, to: string) { if (fs.failNextMove) { fs.failNextMove = false; throw new Error('closed mid-save'); } if (!files.has(from)) throw new Error('missing ' + from); if (files.has(to)) throw new Error('target exists ' + to); files.set(to, files.get(from)!); files.delete(from); },
    async copy(from: string, to: string) { if (!files.has(from)) throw new Error('missing ' + from); if (files.has(to)) throw new Error('target exists ' + to); files.set(to, files.get(from)!); },
    async list(d: string) { return [...files.keys()].filter((k) => k.startsWith(d) && !k.slice(d.length).includes('/')).map((k) => k.slice(d.length)); },
    async mkdir(d: string) { dirs.add(d); },
    async exists(p: string) { return files.has(p) || dirs.has(p) || [...files.keys()].some((k) => k.startsWith(p) && p.endsWith('/')); },
  };
  return fs;
}
