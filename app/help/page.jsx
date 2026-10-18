import ManagedContentPage,{contentPageMetadata} from '@/components/ManagedContentPage';

export const generateMetadata=()=>contentPageMetadata('help');
export default function Page({searchParams}){return <ManagedContentPage slug="help" searchParams={searchParams}/>;}
