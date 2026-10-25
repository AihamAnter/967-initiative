import PageIntro from '@/components/PageIntro';
import ReadingList from '@/components/reading/ReadingList';
import {pageMetadata} from '@/lib/seo';

export const metadata = pageMetadata({title:'للقراءة لاحقاً',description:'المواضيع والملفات التي حفظتها لتعود إليها في وقتك.',path:'/read-later',noindex:true});

export default function ReadLaterPage() {
  return <><PageIntro title="قراءات تنتظرك." category="للقراءة لاحقاً" description="المواضيع والملفات التي حفظتها، لتعود إليها في وقتك." tone="plum"/><section className="section reading-list-section"><div className="container"><ReadingList/></div></section></>;
}
