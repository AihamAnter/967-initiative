import ManagedContentPage,{contentPageMetadata} from '@/components/ManagedContentPage';
import DebatePolicyNotice from '@/components/debates/DebatePolicyNotice';

export const generateMetadata=()=>contentPageMetadata('terms');
export default function Page({searchParams}){return <><ManagedContentPage slug="terms" searchParams={searchParams}/><DebatePolicyNotice/></>;}
