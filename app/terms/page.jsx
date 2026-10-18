import ManagedContentPage,{contentPageMetadata} from '@/components/ManagedContentPage';

export const generateMetadata=()=>contentPageMetadata('terms');
export default function Page({searchParams}){return <ManagedContentPage slug="terms" searchParams={searchParams}/>;}
