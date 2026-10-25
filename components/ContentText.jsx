import Link from '@/components/SiteLink';
import {safeContentHref} from '@/lib/contentPages';

function inline(text,availablePaths){
 const parts=[],pattern=/\[([^\]\n]{1,180})\]\(([^\s)]+)\)|\*\*([^*\n]+)\*\*/g;let offset=0;
 for(const match of text.matchAll(pattern)){
  parts.push(text.slice(offset,match.index));
  if(match[3])parts.push(<strong key={match.index}>{match[3]}</strong>);
  else{
   let href=safeContentHref(match[2]);
   if(href?.startsWith('/')&&availablePaths){const path=href.split(/[?#]/)[0];if((['/privacy','/terms','/about','/help','/privacy-requests'].includes(path)||path.startsWith('/pages/'))&&!availablePaths.includes(path))href=null;}
   parts.push(href?(href.startsWith('/')?<Link key={match.index} href={href}>{match[1]}</Link>:<a key={match.index} href={href} target="_blank" rel="noopener noreferrer">{match[1]}</a>):match[1]);
  }
  offset=match.index+match[0].length;
 }
 parts.push(text.slice(offset));return parts;
}

// Plain text, simple links, bold text and lists. HTML is always escaped by React.
export default function ContentText({text,availablePaths}){
 return <>{String(text||'').split(/\n\s*\n/).filter(Boolean).map((paragraph,index)=>{
  const lines=paragraph.split('\n');
  if(lines.every(line=>line.startsWith('- ')))return <ul key={index}>{lines.map((line,i)=><li key={i}>{inline(line.slice(2),availablePaths)}</li>)}</ul>;
  return <p className="content-text" key={index}>{inline(paragraph,availablePaths)}</p>;
 })}</>;
}
