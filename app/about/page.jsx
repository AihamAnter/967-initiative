import ManagedContentPage,{contentPageMetadata} from '@/components/ManagedContentPage';

export const generateMetadata=()=>contentPageMetadata('about');
export default function Page({searchParams}){return <ManagedContentPage slug="about" searchParams={searchParams}/>;}
