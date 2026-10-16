import './globals.css';
import './design-system.css';
import {site} from '@/lib/config';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import {getSiteSettings} from '@/lib/data';
export const dynamic='force-dynamic';

export const metadata = {
 metadataBase:new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
 title:{default:'مبادرة 967 | صوت ومعرفة ومجتمع',template:'%s | مبادرة 967'},
 description:site.description,
 openGraph:{title:'مبادرة 967',description:site.description,type:'website',locale:'ar_YE',images:['/images/og.png']},
 robots:{index:true,follow:true}
};
export default async function RootLayout({children}){
 const settings=await getSiteSettings();
 return <html lang="ar" dir="rtl"><body><a className="skip-link" href="#content">انتقل إلى المحتوى</a><Header actionLabel={settings.headerActionLabel}/><main id="content">{children}</main><Footer settings={settings}/></body></html>;
}
