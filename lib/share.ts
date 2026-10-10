import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

// Saves text as a file and opens the share sheet (Save to Files, AirDrop, Mail...). Returns false when sharing is not available.
export async function shareText(filename: string, text: string, mimeType: string): Promise<boolean> {
  const path = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(path, text);
  if (!(await Sharing.isAvailableAsync())) return false;
  await Sharing.shareAsync(path, { mimeType, dialogTitle: filename });
  return true;
}
