'use client';

import {useCallback, useEffect, useState} from 'react';
import {Crown, MailPlus, RefreshCw, ShieldCheck, Trash2, UserRoundCog} from 'lucide-react';

const roleLabels = {admin: 'أدمن تحرير', management: 'إدارة'};

export default function AdminUsersPanel({db}) {
  const [editors, setEditors] = useState([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('admin');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');

  const request = useCallback(async (method = 'GET', body) => {
    const {data} = await db.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw Error('انتهت الجلسة. سجّل الدخول مجددًا.');
    const response = await fetch('/api/admin/editors', {
      method,
      headers: {Authorization: `Bearer ${token}`, ...(body ? {'Content-Type': 'application/json'} : {})},
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    });
    const result = await response.json();
    if (!response.ok) throw Error(result.error || 'تعذر تنفيذ العملية.');
    return result;
  }, [db]);

  const loadEditors = useCallback(async () => {
    setLoading(true);
    try {
      const result = await request();
      setEditors(result.editors || []);
      setNotice('');
    } catch (error) {
      setNotice('خطأ: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => { loadEditors(); }, [loadEditors]);

  async function addEditor(event) {
    event.preventDefault();
    setBusy(true);
    setNotice('');
    try {
      const result = await request('POST', {email, role});
      setNotice(result.invited ? 'تمت إضافة الحساب وإرسال دعوة إلى بريده.' : 'تم تحديث صلاحية الحساب بنجاح.');
      setEmail('');
      setRole('admin');
      await loadEditors();
    } catch (error) {
      setNotice('خطأ: ' + error.message);
    } finally {
      setBusy(false);
    }
  }

  async function changeRole(editor, nextRole) {
    if (nextRole === editor.role) return;
    setBusy(true);
    setNotice('');
    try {
      await request('PATCH', {user_id: editor.user_id, role: nextRole});
      setNotice('تم تغيير مستوى الصلاحية.');
      await loadEditors();
    } catch (error) {
      setNotice('خطأ: ' + error.message);
    } finally {
      setBusy(false);
    }
  }

  async function removeEditor(editor) {
    if (!window.confirm(`إزالة صلاحية لوحة التحرير من ${editor.email}؟`)) return;
    setBusy(true);
    setNotice('');
    try {
      await request('DELETE', {user_id: editor.user_id});
      setNotice('تمت إزالة صلاحية المشرف. لم يُحذف حسابه أو المحتوى الذي أضافه.');
      await loadEditors();
    } catch (error) {
      setNotice('خطأ: ' + error.message);
    } finally {
      setBusy(false);
    }
  }

  return <div className="admin-users-layout">
    <section className="admin-panel">
      <h2><MailPlus size={20}/> إضافة مشرف</h2>
      <p className="small-muted">أدخل البريد وحدد الصلاحية. إذا لم يكن الحساب موجودًا، ستصله دعوة لإنشاء كلمة المرور.</p>
      {notice && <p className={'feedback ' + (notice.startsWith('خطأ') ? 'error' : 'success')} role="status">{notice}</p>}
      <form className="admin-form" onSubmit={addEditor}>
        <label>البريد الإلكتروني<input required type="email" dir="ltr" value={email} onChange={event => setEmail(event.target.value)} placeholder="editor@example.com"/></label>
        <label>مستوى الصلاحية<select value={role} onChange={event => setRole(event.target.value)}><option value="admin">أدمن تحرير</option><option value="management">إدارة</option></select></label>
        <div className="admin-role-help">
          <div><UserRoundCog size={18}/><span><strong>أدمن تحرير</strong> يضيف المحتوى ويعدله وينشره، ولا يحذف البيانات أو يدير الحسابات.</span></div>
          <div><Crown size={18}/><span><strong>إدارة</strong> تملك جميع صلاحيات المحتوى، والحذف، وتعيين المشرفين وإزالتهم.</span></div>
        </div>
        <button className="btn btn-red" disabled={busy}><ShieldCheck size={17}/>{busy ? 'جارٍ التنفيذ...' : 'إضافة المشرف'}</button>
      </form>
    </section>

    <section className="admin-panel admin-users-list">
      <div className="admin-panel-title"><h2><ShieldCheck size={20}/> حسابات لوحة التحرير ({editors.length})</h2><button onClick={loadEditors} disabled={loading || busy} title="تحديث"><RefreshCw size={17}/></button></div>
      {loading && <p className="small-muted">جارٍ تحميل الحسابات...</p>}
      {!loading && !editors.length && <p className="small-muted">لا توجد حسابات مسجلة.</p>}
      {editors.map(editor => <div className="admin-user-row" key={editor.user_id}>
        <div><strong dir="ltr">{editor.email}</strong><small>{roleLabels[editor.role] || editor.role}{editor.is_current ? ' · حسابك الحالي' : ''}</small></div>
        <div>
          <select aria-label={`صلاحية ${editor.email}`} value={editor.role} disabled={busy} onChange={event => changeRole(editor, event.target.value)}><option value="admin">أدمن تحرير</option><option value="management">إدارة</option></select>
          <button className="admin-danger-button" disabled={busy || editor.is_current} onClick={() => removeEditor(editor)} title={editor.is_current ? 'لا يمكن إزالة الحساب الحالي' : 'إزالة الصلاحية'}><Trash2 size={17}/></button>
        </div>
      </div>)}
    </section>
  </div>;
}
