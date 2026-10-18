import ManagedContentPage,{contentPageMetadata} from '@/components/ManagedContentPage';

export const generateMetadata=()=>contentPageMetadata('privacy-requests');
export default function Page({searchParams}){return <ManagedContentPage slug="privacy-requests" searchParams={searchParams}/>;}
