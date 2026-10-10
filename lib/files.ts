import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { API_URL } from './config';
import { UPLOADS } from './fs';
import { getToken } from './session';
import { shortId } from './ids';
import type { Attachment } from './types';

// Files on an item, kept on the phone in uploads/<item id>/<file id>. Limits are the web app's: 10 MB each, 10 per item.
export const MAX_BYTES = 10 * 1024 * 1024, MAX_FILES = 10;
export type Picked = { uri: string; name: string; size: number; type: string };

export const bytes = (n: number) => (n < 1024 ? `${n} B` : n < 1048576 ? `${Math.round(n / 1024)} KB` : `${(n / 1048576).toFixed(1)} MB`);

export async function pickFiles(): Promise<{ files: Picked[]; skipped: string[] }> {
  const r = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true });
  if (r.canceled) return { files: [], skipped: [] };
  const files: Picked[] = [], skipped: string[] = [];
  for (const a of r.assets) {
    if ((a.size ?? 0) > MAX_BYTES) skipped.push(`${a.name} is larger than 10 MB.`);
    else files.push({ uri: a.uri, name: a.name, size: a.size ?? 0, type: a.mimeType ?? 'application/octet-stream' });
  }
  return { files, skipped };
}

const dirOf = (itemId: string) => `${UPLOADS}${itemId}/`;
const pathOf = (itemId: string, attId: string) => `${dirOf(itemId)}${attId}`;

export async function storeFile(itemId: string, f: Picked): Promise<Attachment> {
  const id = shortId();
  await FileSystem.makeDirectoryAsync(dirOf(itemId), { intermediates: true });
  await FileSystem.copyAsync({ from: f.uri, to: pathOf(itemId, id) });
  // `local` until the file has been uploaded to the account (see uploadLocalFiles): the cloud has no bytes for it yet
  return { id, name: f.name, size: f.size, type: f.type, addedAt: Date.now(), local: true };
}

export const removeFile = (itemId: string, attId: string) => FileSystem.deleteAsync(pathOf(itemId, attId), { idempotent: true });

// Opens the share sheet, which on a phone is how you view, save or send a file.
export async function openFile(itemId: string, a: Attachment): Promise<boolean> {
  if (!(await Sharing.isAvailableAsync())) return false;
  const tmp = `${FileSystem.cacheDirectory}${a.name}`;
  // a file added on another device is fetched from the account the first time it is opened
  if (!(await FileSystem.getInfoAsync(pathOf(itemId, a.id))).exists && !a.local) {
    await FileSystem.makeDirectoryAsync(dirOf(itemId), { intermediates: true });
    const res = await FileSystem.downloadAsync(`${API_URL}/api/files/${itemId}/${a.id}`, pathOf(itemId, a.id), { headers: { Authorization: `Bearer ${getToken() ?? ''}` } });
    if (res.status !== 200) { await FileSystem.deleteAsync(pathOf(itemId, a.id), { idempotent: true }); return false; }
  }
  await FileSystem.copyAsync({ from: pathOf(itemId, a.id), to: tmp }).catch(() => undefined);
  await Sharing.shareAsync(tmp, { mimeType: a.type });
  return true;
}

// Sends files that only exist on this phone to the account, one by one. Returns what to put in the item in their place:
// the cloud's own record of each file (it picks the file's id), with the local copy moved to that id.
export async function uploadLocalFiles(itemId: string, list: Attachment[]): Promise<Record<string, Attachment>> {
  const done: Record<string, Attachment> = {};
  for (const a of list.filter((x) => x.local)) {
    try {
      const res = await FileSystem.uploadAsync(`${API_URL}/api/items/${itemId}/files?name=${encodeURIComponent(a.name)}`, pathOf(itemId, a.id), {
        httpMethod: 'POST', uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT, headers: { Authorization: `Bearer ${getToken() ?? ''}`, 'Content-Type': a.type || 'application/octet-stream' },
      });
      if (res.status !== 200) continue;
      const meta = JSON.parse(res.body) as Attachment;
      await FileSystem.moveAsync({ from: pathOf(itemId, a.id), to: pathOf(itemId, meta.id) });
      done[a.id] = { id: meta.id, name: meta.name, size: meta.size, type: meta.type, addedAt: meta.addedAt };
    } catch { /* offline or too large: tried again next sync */ }
  }
  return done;
}
