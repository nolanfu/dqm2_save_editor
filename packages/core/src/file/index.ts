/** Reads a user-selected file into memory. The file never leaves the browser. */
export async function readFileBytes(file: Blob): Promise<Uint8Array> {
  return new Uint8Array(await file.arrayBuffer());
}

/** Prompts the browser to save `bytes` as a file named `fileName`. */
export function downloadBytes(bytes: Uint8Array, fileName: string): void {
  const blob = new Blob([bytes as Uint8Array<ArrayBuffer>], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.style.display = 'none';
  document.body.append(link);
  link.click();
  link.remove();
  // Some mobile browsers start the download asynchronously; give them time before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
