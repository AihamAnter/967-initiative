import ManagedContentPage,{contentPageMetadata} from '@/components/ManagedContentPage';

export const generateMetadata=()=>contentPageMetadata('privacy');
export default function Page({searchParams}){return <ManagedContentPage slug="privacy" searchParams={searchParams}/>;}
