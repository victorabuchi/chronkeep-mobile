import * as FileSystem from 'expo-file-system/legacy';
import type { FS } from './store';

// The phone's file system, for the store.
export const phoneFs: FS = {
  async read(path) { const info = await FileSystem.getInfoAsync(path); return info.exists ? FileSystem.readAsStringAsync(path) : null; },
  write: (path, text) => FileSystem.writeAsStringAsync(path, text),
  async remove(path) { await FileSystem.deleteAsync(path, { idempotent: true }); },
  move: (from, to) => FileSystem.moveAsync({ from, to }),
  copy: (from, to) => FileSystem.copyAsync({ from, to }),
  async list(dir) { return FileSystem.readDirectoryAsync(dir); },
  async mkdir(dir) { const info = await FileSystem.getInfoAsync(dir); if (!info.exists) await FileSystem.makeDirectoryAsync(dir, { intermediates: true }); },
  async exists(path) { return (await FileSystem.getInfoAsync(path)).exists; },
};

export const ROOT = `${FileSystem.documentDirectory ?? ''}chronkeep/`;
export const UPLOADS = `${ROOT}uploads/`;
