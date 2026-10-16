// Browser validation supplements storage bucket MIME/size policies. It does not
// make a public storage bucket suitable for confidential draft attachments.
const types = {pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp'};
export async function validateMediaUpload(file, kind = 'image') {
  const extension = (file?.name?.split('.').pop() || '').toLowerCase();
  const contentType = types[extension];
  if (!contentType || (kind === 'pdf' ? extension !== 'pdf' : extension === 'pdf')) throw Error('صيغة الملف غير مدعومة.');
  if (!file.size || file.size > (kind === 'pdf' ? 40 : 5) * 1024 * 1024) throw Error('حجم الملف غير صالح أو أكبر من الحد المسموح.');
  if (file.type && file.type !== contentType) throw Error('نوع الملف لا يطابق امتداده.');
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const text = String.fromCharCode(...bytes);
  const valid = extension === 'pdf' ? text.startsWith('%PDF-') :
    extension === 'png' ? [137,80,78,71,13,10,26,10].every((n, i) => bytes[i] === n) :
    extension === 'webp' ? text.startsWith('RIFF') && text.slice(8, 12) === 'WEBP' :
    bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (!valid) throw Error('محتوى الملف لا يطابق صيغته.');
  return {extension, contentType};
}
