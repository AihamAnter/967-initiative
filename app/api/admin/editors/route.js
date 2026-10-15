import {NextResponse} from 'next/server';
import {serverDb} from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const validRoles = new Set(['admin', 'management']);
const fail = (message, status = 400) => NextResponse.json({error: message}, {status});

function sameOrigin(request) {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  return !origin || !host || new URL(origin).host === host;
}

async function authorize(request) {
  if (!sameOrigin(request)) return {error: fail('طلب غير مسموح.', 403)};
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const db = serverDb();
  if (!db || !token) return {error: fail('تعذر التحقق من الجلسة.', 401)};

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
    return NextResponse.json({
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
    const body = await request.json();
    const fullName = String(body.full_name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const role = String(body.role || 'admin');
    if (fullName.length < 2 || fullName.length > 100) return fail('أدخل الاسم الكامل للمشرف.');
    if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 250) return fail('أدخل بريدًا إلكترونيًا صالحًا.');
    if (!validRoles.has(role)) return fail('مستوى الصلاحية غير صالح.');

    let target = await findAuthUserByEmail(auth.db, email);
    let delivery = 'password_reset';
    const origin = request.headers.get('origin');
    const configuredSiteUrl = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '');
    const siteUrl = (origin || configuredSiteUrl).replace(/\/$/, '');
    const redirectTo = `${siteUrl}/admin`;
    if (!target) {
      const {data, error} = await auth.db.auth.admin.inviteUserByEmail(email, {redirectTo, data: {full_name: fullName}});
      if (error) throw error;
      target = data.user;
      delivery = 'invite';
    } else {
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
    return NextResponse.json({ok: true, delivery});
  } catch (error) {
    console.error('assign editor failed', error);
    return fail(error.message || 'تعذرت إضافة المشرف.', 503);
  }
}

export async function PATCH(request) {
  const auth = await authorize(request);
  if (auth.error) return auth.error;
  try {
    const body = await request.json();
    const userId = String(body.user_id || '');
    const role = String(body.role || '');
    if (!userId || !validRoles.has(role)) return fail('بيانات الصلاحية غير مكتملة.');

    const {data: current} = await auth.db.from('editors').select('role').eq('user_id', userId).maybeSingle();
    if (!current) return fail('الحساب غير موجود.', 404);
    if (current.role === 'management' && role !== 'management') {
      const {count} = await auth.db.from('editors').select('*', {count: 'exact', head: true}).eq('role', 'management');
      if ((count || 0) <= 1) return fail('لا يمكن تخفيض صلاحية آخر حساب إدارة.');
    }
    const {error} = await auth.db.from('editors').update({role, added_by: auth.user.id}).eq('user_id', userId);
    if (error) throw error;
    return NextResponse.json({ok: true});
  } catch (error) {
    console.error('update editor failed', error);
    return fail(error.message || 'تعذر تغيير الصلاحية.', 503);
  }
}

export async function DELETE(request) {
  const auth = await authorize(request);
  if (auth.error) return auth.error;
  try {
    const {user_id: userId} = await request.json();
    if (!userId) return fail('الحساب غير محدد.');
    if (userId === auth.user.id) return fail('لا يمكنك إزالة صلاحيتك من الحساب الحالي.');

    const {data: target} = await auth.db.from('editors').select('role').eq('user_id', userId).maybeSingle();
    if (!target) return fail('الحساب غير موجود.', 404);
    if (target.role === 'management') {
      const {count} = await auth.db.from('editors').select('*', {count: 'exact', head: true}).eq('role', 'management');
      if ((count || 0) <= 1) return fail('لا يمكن حذف آخر حساب إدارة.');
    }
    const {error} = await auth.db.from('editors').delete().eq('user_id', userId);
    if (error) throw error;
    return NextResponse.json({ok: true});
  } catch (error) {
    console.error('remove editor failed', error);
    return fail(error.message || 'تعذرت إزالة المشرف.', 503);
  }
}
