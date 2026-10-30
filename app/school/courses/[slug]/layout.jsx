// Scoped to School course pages: these fonts are for calligraphy examples only.
// The interface and the rest of the site retain IBM Plex Sans Arabic.
const googleCalligraphyFonts='https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Aref+Ruqaa:wght@400;700&family=Reem+Kufi:wght@400;700&family=Noto+Nastaliq+Urdu:wght@400;700&display=swap';
export default function CourseTypographyLayout({children}){
 return <>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/>
  <link rel="stylesheet" href={googleCalligraphyFonts}/>
  {children}
 </>;
}
