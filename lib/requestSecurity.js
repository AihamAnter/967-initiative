// Shared by route handlers and regression tests; never log request bodies or tokens.
export class RequestValidationError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

export function isSameOrigin(request) {
  if (request.headers.get('sec-fetch-site') === 'cross-site') return false;
  const origin = request.headers.get('origin');
  if (!origin) return true; // Non-browser clients still require API authorization.
  try {
    const source = new URL(origin);
    const target = new URL(request.url);
    return ['https:', 'http:'].includes(source.protocol) && !source.username && !source.password && source.origin === target.origin;
  } catch { return false; }
}

export async function readJsonObject(request, maxBytes = 12000) {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') || '')) {
    throw new RequestValidationError('نوع الطلب غير مدعوم. أرسل JSON.', 415);
  }
  const length = request.headers.get('content-length');
  if (length && (!/^\d+$/.test(length) || Number(length) > maxBytes)) {
    throw new RequestValidationError('الطلب أكبر من الحد المسموح.', 413);
  }
  const reader = request.body?.getReader();
  if (!reader) throw new RequestValidationError('الطلب فارغ.');
  const chunks = [];
  let total = 0;
  try {
    for (;;) {
      const {value, done} = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new RequestValidationError('الطلب أكبر من الحد المسموح.', 413);
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  let data;
  try { data = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(bytes)); }
  catch { throw new RequestValidationError('صيغة الطلب غير صالحة.'); }
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new RequestValidationError('بيانات الطلب غير صالحة.');
  return data;
}

export function createTimedFetch(timeoutMs = 10000) {
  return (input, init = {}) => fetch(input, {
    ...init,
    signal: init.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(timeoutMs)]) : AbortSignal.timeout(timeoutMs),
  });
}
