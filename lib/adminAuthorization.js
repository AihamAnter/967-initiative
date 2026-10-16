import {RequestValidationError} from './requestSecurity.js';

// Use for every role-changing endpoint (including assigning an existing email).
// The proposed DB guard additionally serializes concurrent management removals.
export async function checkRoleChange(db, userId, nextRole, actorId) {
  if (typeof userId !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(userId)) throw new RequestValidationError('معرّف الحساب غير صالح.');
  const {data: current, error} = await db.from('editors').select('role').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  if (current?.role === 'management' && nextRole !== 'management') {
    if (userId === actorId) throw new RequestValidationError('لا يمكنك إزالة صلاحية الإدارة من حسابك الحالي.');
    const result = await db.from('editors').select('*', {count: 'exact', head: true}).eq('role', 'management');
    if (result.error) throw result.error;
    if ((result.count || 0) <= 1) throw new RequestValidationError('لا يمكن إزالة صلاحية آخر حساب إدارة.');
  }
  return current;
}
