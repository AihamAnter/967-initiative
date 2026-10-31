import ManagedContentPage,{contentPageMetadata} from '@/components/ManagedContentPage';
import DebatePolicyNotice from '@/components/debates/DebatePolicyNotice';
import AnalyticsPrivacyControls from '@/components/analytics/AnalyticsPrivacyControls';

export const generateMetadata=()=>contentPageMetadata('privacy');
export default function Page({searchParams}){return <><ManagedContentPage slug="privacy" searchParams={searchParams}/><DebatePolicyNotice privacy/><AnalyticsPrivacyControls/></>;}
