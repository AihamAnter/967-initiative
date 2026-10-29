import Link from 'next/link';

// Compatibility fallback for stale local builds which still import the
// old friend-creation component. All new invitations are created inside a game.
export default function FriendChallengeCreate(){
 return <section aria-label="تحدي الصديق" style={{textAlign:'center',padding:'24px'}}>
  <p>أصبح إنشاء تحدي الصديق من داخل صفحة اللعبة نفسها، بجانب زر بدء الجولة.</p>
  <Link href="/games" style={{display:'inline-block',marginTop:'12px',textDecoration:'underline',fontWeight:700}}>
   اختر لعبة وتحدَّ صديقك
  </Link>
 </section>;
}
