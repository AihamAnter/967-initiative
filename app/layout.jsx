import './fonts.css';
import './design-tokens.css';
import './globals.css';
import './design-system.css';
import './platform-refinements.css';
import './visual-polish.css';
import './ux-improvements.css';
import './visual-foundation.css';
import './completion-polish.css';
import './team-collaboration.css';
import {site} from '@/lib/config';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import {getSiteSettings} from '@/lib/data';
import {getSiteOrigin, pageMetadata} from '@/lib/seo';
import {JsonLd, siteSchema} from '@/lib/seo-schema';
import {contentPagePath} from '@/lib/contentPages';
import InlineEditorProvider from '@/components/inline/InlineEditorProvider';
import OperationalMonitor from '@/components/OperationalMonitor';
import NavigationMemory from '@/components/NavigationMemory';
import PageVisibilityProvider from '@/components/PageVisibilityProvider';
import {pageIsVisible} from '@/lib/pageVisibility';
export const dynamic='force-dynamic';

export const metadata = {
 ...pageMetadata({title:'مبادرة 967', description:site.description}),
 metadataBase:new URL(getSiteOrigin()),
 title:{default:'مبادرة 967 | صوت ومعرفة ومجتمع',template:'%s | مبادرة 967'},
 description:site.description,
 icons:{icon:'/images/967%20logo%20no%20background.png'},
};
export default async function RootLayout({children}){
 const settings=await getSiteSettings();
 return <html lang="ar" dir="rtl"><head><link rel="preload" href="/fonts/ibm-plex-arabic-1.woff2" as="font" type="font/woff2" crossOrigin="anonymous"/><link rel="preload" href="/fonts/ibm-plex-arabic-13.woff2" as="font" type="font/woff2" crossOrigin="anonymous"/></head><body><OperationalMonitor/><NavigationMemory/><JsonLd data={siteSchema(settings)}/><a className="skip-link" href="#content">انتقل إلى المحتوى</a><PageVisibilityProvider visibility={settings.pageVisibility} pages={(settings.contentPages||[]).map(({slug,isPublished})=>({slug,isPublished}))}><InlineEditorProvider><Header actionLabel={settings.headerActionLabel} contentLinks={(settings.contentPages||[]).filter(page=>pageIsVisible(contentPagePath(page),settings.pageVisibility,settings.contentPages)).map(page=>({slug:page.slug,title:page.title,href:contentPagePath(page)}))}/><main id="content" className="visual-foundation">{children}</main><Footer settings={settings}/></InlineEditorProvider></PageVisibilityProvider></body></html>;
}
