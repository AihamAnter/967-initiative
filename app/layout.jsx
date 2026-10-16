import './fonts.css';
import './globals.css';
import './design-system.css';
import {site} from '@/lib/config';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import {getSiteSettings} from '@/lib/data';
import {getSiteOrigin, pageMetadata} from '@/lib/seo';
import {JsonLd, siteSchema} from '@/lib/seo-schema';
export const dynamic='force-dynamic';

export const metadata = {
 ...pageMetadata({title:'مبادرة 967', description:site.description}),
 metadataBase:new URL(getSiteOrigin()),
 title:{default:'مبادرة 967 | صوت ومعرفة ومجتمع',template:'%s | مبادرة 967'},
 description:site.description,
};
export default async function RootLayout({children}){
 const settings=await getSiteSettings();
 return <html lang="ar" dir="rtl"><head><link rel="preload" href="/fonts/ibm-plex-arabic-1.woff2" as="font" type="font/woff2" crossOrigin="anonymous"/><link rel="preload" href="/fonts/ibm-plex-arabic-13.woff2" as="font" type="font/woff2" crossOrigin="anonymous"/></head><body><JsonLd data={siteSchema(settings)}/><a className="skip-link" href="#content">انتقل إلى المحتوى</a><Header actionLabel={settings.headerActionLabel}/><main id="content">{children}</main><Footer settings={settings}/></body></html>;
}
