import Link from 'next/link';
import ProfileAvatar from '@/components/design/ProfileAvatar';
import {memberProfilePath} from '@/lib/memberProfiles';
import styles from './MemberLink.module.css';

// Link the avatar AND name as a single keyboard-accessible target.
// A missing member ID (anonymous questions and pseudonyms) remains plain text.
export default function MemberLink({id,name,avatarUrl=null,showAvatar=true,className='',children}){
 const path=memberProfilePath(id);
 const contents=<>{showAvatar&&<ProfileAvatar name={name} src={avatarUrl} className={styles.avatar}/>}<span className={styles.name}>{children||name||'عضو 967'}</span></>;
 return path?
  <Link href={path} className={[styles.link,className].filter(Boolean).join(' ')} aria-label={'الملف الشخصي: '+(name||'عضو 967')}>{contents}</Link>:
  <span className={[styles.link,styles.plain,className].filter(Boolean).join(' ')}>{contents}</span>;
}
