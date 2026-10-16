import {NextResponse} from 'next/server';
import {serverDb} from '@/lib/supabase-server';
import {isSameOrigin, readJsonObject, RequestValidationError} from '@/lib/requestSecurity';
import {checkRoleChange} from '@/lib/adminAuthorization';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const validRoles = new Set(['admin', 'management']);
const json = (body, status = 200) => NextResponse.json(body, {status, headers: {'Cache-Control': 'no-store, private'}});
const fail = (message, status = 400) => json({error: message}, status);
const requestFailure = (error, message) => error instanceof RequestValidationError ? fail(error.message, error.status) : fail(message, 503);

async function authorize(request) {
  if (!isSameOrigin(request)) return {error: fail('طلب غير مسموح.', 403)};
  const token = request.headers.get('authorization')?.match(/^Bearer\s+([^\s]+)$/i)?.[1];
  const db = serverDb();
  if (!token) return {error: fail('تعذر التحقق من الجلسة.', 401)};
  if (!db) return {error: fail('خدمة إدارة الحسابات غير متاحة حالياً.', 503)};

  try {
  const {data: authData, error: authError} = await db.auth.getUser(token);
  if (authError || !authData.user) return {error: fail('انتهت الجلسة. سجّل الدخول مجددًا.', 401)};

  const {data: editor, error: editorError} = await db
    .from('editors')
    .select('user_id,role')
    .eq('user_id', authData.user.id)
    .maybeSingle();
  if (editorError) return {error: fail('شغّل ملف supabase/admin-roles.sql أولًا.', 503)};
  if (editor?.role !== 'management') return {error: fail('هذه العملية متاحة للإدارة فقط.', 403)};
  return {db, user: authData.user};
  } catch { return {error: fail('تعذر التحقق من الجلسة حالياً.', 503)}; }
}

async function authUsersById(db) {
  const users = new Map();
  let page = 1;
  while (page <= 10) {
    const {data, error} = await db.auth.admin.listUsers({page, perPage: 1000});
    if (error) throw error;
    for (const user of data.users) users.set(user.id, user);
    if (data.users.length < 1000) break;
    page += 1;
  }
  if (page > 10) throw new Error('Account lookup exceeded its safety limit');
  return users;
}

async function findAuthUserByEmail(db, email) {
  const users = await authUsersById(db);
  return [...users.values()].find(user => user.email?.toLowerCase() === email) || null;
}

export async function GET(request) {
  const auth = await authorize(request);
  if (auth.error) return auth.error;
  try {
    const [{data: editors, error}, users] = await Promise.all([
      auth.db.from('editors').select('user_id,role,added_at').order('added_at'),
      authUsersById(auth.db),
    ]);
    if (error) throw error;
    return json({
      editors: (editors || []).map(editor => ({
        ...editor,
        email: users.get(editor.user_id)?.email || 'بريد غير متاح',
        full_name: users.get(editor.user_id)?.user_metadata?.full_name || '',
        is_current: editor.user_id === auth.user.id,
      })),
    });
  } catch (error) {
    console.error('list editors failed', error);
    return fail('تعذر تحميل حسابات المشرفين.', 503);
  }
}

export async function POST(request) {
  const auth = await authorize(request);
  if (auth.error) return auth.error;
  try {
    const body = await readJsonObject(request, 4000);
    const fullName = String(body.full_name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const role = String(body.role || 'admin');
    if (fullName.length < 2 || fullName.length > 100) return fail('أدخل الاسم الكامل للمشرف.');
    if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 250) return fail('أدخل بريدًا إلكترونيًا صالحًا.');
    if (!validRoles.has(role)) return fail('مستوى الصلاحية غير صالح.');

    let target = await findAuthUserByEmail(auth.db, email);
    let delivery = 'password_reset';
    const configuredSiteUrl = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '');
    const siteUrl = new URL(configuredSiteUrl || request.url).origin;
    const redirectTo = `${siteUrl}/admin`;
    if (!target) {
      const {data, error} = await auth.db.auth.admin.inviteUserByEmail(email, {redirectTo, data: {full_name: fullName}});
      if (error) throw error;
      target = data.user;
      delivery = 'invite';
    } else {
      await checkRoleChange(auth.db, target.id, role, auth.user.id);
      const {error: metadataError} = await auth.db.auth.admin.updateUserById(target.id, {user_metadata: {...(target.user_metadata || {}), full_name: fullName}});
      if (metadataError) throw metadataError;
      const {error} = await auth.db.auth.resetPasswordForEmail(email, {redirectTo});
      if (error) throw error;
    }

    const {error} = await auth.db.from('editors').upsert({
      user_id: target.id,
      role,
      added_by: auth.user.id,
    }, {onConflict: 'user_id'});
    if (error) throw error;
    return json({ok: true, delivery});
  } catch (error) {
    console.error('assign editor failed', error);
    return requestFailure(error, 'تعذرت إضافة المشرف.');
  }
}

export async function PATCH(request) {
  const auth = await authorize(request);
  if (auth.error) return auth.error;
  try {
    const body = await readJsonObject(request, 4000);
    const userId = String(body.user_id || '');
    const role = String(body.role || '');
    if (!userId || !validRoles.has(role)) return fail('بيانات الصلاحية غير مكتملة.');

    const current = await checkRoleChange(auth.db, userId, role, auth.user.id);
    if (!current) return fail('الحساب غير موجود.', 404);
    const {error} = await auth.db.from('editors').update({role, added_by: auth.user.id}).eq('user_id', userId);
    if (error) throw error;
    return json({ok: true});
  } catch (error) {
    console.error('update editor failed', error);
    return requestFailure(error, 'تعذر تغيير الصلاحية.');
  }
}

export async function DELETE(request) {
  const auth = await authorize(request);
  if (auth.error) return auth.error;
  try {
    const {user_id: userId} = await readJsonObject(request, 4000);
    if (!userId) return fail('الحساب غير محدد.');
    if (userId === auth.user.id) return fail('لا يمكنك إزالة صلاحيتك من الحساب الحالي.');

    const target = await checkRoleChange(auth.db, userId, null, auth.user.id);
    if (!target) return fail('الحساب غير موجود.', 404);
    const {error} = await auth.db.from('editors').delete().eq('user_id', userId);
    if (error) throw error;
    return json({ok: true});
  } catch (error) {
    console.error('remove editor failed', error);
    return requestFailure(error, 'تعذرت إزالة المشرف.');
  }
}
