/** Byte progress for a file the browser is sending. 0–100. */
export type UploadProgressHandler = (percent: number) => void;

export function dataUrlByteLength(dataUrl: string): number {
  const comma = dataUrl.indexOf(",");
  if (comma < 0) return 0;
  const payload = dataUrl.slice(comma + 1).replace(/\s/g, "");
  if (!payload) return 0;
  const padding = payload.endsWith("==") ? 2 : payload.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((payload.length * 3) / 4) - padding);
}

/** Share of a multi-file upload, weighted by each file's size. */
export function weightedUploadPercent(
  segments: { weight: number; percent: number }[]
): number | null {
  const weight = segments.reduce((sum, segment) => sum + segment.weight, 0);
  if (weight <= 0) return null;
  const loaded = segments.reduce(
    (sum, segment) =>
      sum + segment.weight * (Math.min(100, Math.max(0, segment.percent)) / 100),
    0
  );
  return Math.max(0, Math.min(100, Math.round((loaded / weight) * 100)));
}

/** Same body shape Supabase uses for a signed upload of a Blob. */
export function signedStorageUploadBody(
  file: Blob,
  cacheControl = "3600"
): FormData {
  const body = new FormData();
  body.append("cacheControl", cacheControl);
  body.append("", file);
  return body;
}

export function sendWithUploadProgress(
  url: string,
  init: {
    method: "PUT" | "POST";
    body: XMLHttpRequestBodyInit;
    headers?: Record<string, string>;
    onProgress?: UploadProgressHandler;
  }
): Promise<{ ok: boolean; status: number; text: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(init.method, url);
    for (const [key, value] of Object.entries(init.headers ?? {})) {
      xhr.setRequestHeader(key, value);
    }
    xhr.upload.onprogress = (event) => {
      if (!init.onProgress || !event.lengthComputable || event.total <= 0) return;
      const percent = Math.round((event.loaded / event.total) * 100);
      init.onProgress(Math.max(0, Math.min(100, percent)));
    };
    xhr.onload = () => {
      resolve({
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
        text: xhr.responseText,
      });
    };
    xhr.onerror = () => {
      reject(new Error("Upload failed. Check your connection and try again."));
    };
    xhr.onabort = () => {
      reject(new Error("Upload was cancelled."));
    };
    if (init.onProgress) init.onProgress(0);
    xhr.send(init.body);
  });
}
