import {Search, ArrowLeft} from 'lucide-react';

export default function SearchForm({query = '', compact = false, placeholder = 'ما الذي تريد معرفته عن اليمن؟'}) {
  return <form action="/search" className={`global-search ${compact ? 'global-search-compact' : ''}`} role="search">
    <Search size={21} aria-hidden="true"/><label className="sr-only" htmlFor={compact ? 'nav-search' : 'platform-search'}>ابحث في منصة 967</label>
    <input id={compact ? 'nav-search' : 'platform-search'} name="q" type="search" defaultValue={query} placeholder={placeholder} maxLength={150}/>
    <button type="submit" aria-label="ابحث في المنصة"><span>ابحث</span><ArrowLeft size={18}/></button>
  </form>;
}
