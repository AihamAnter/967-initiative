import './globals.css';
import {site} from '@/lib/config';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata = {
 metadataBase:new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
 title:{default:'مبادرة 967 | صوت ومعرفة ومجتمع',template:'%s | مبادرة 967'},
 description:site.description,
 openGraph:{title:'مبادرة 967',description:site.description,type:'website',locale:'ar_YE',images:['/images/og.png']},
 robots:{index:true,follow:true}
};
export default function RootLayout({children}){
 return <html lang="ar" dir="rtl"><body><Header/><main id="content">{children}</main><Footer/></body></html>;
}
