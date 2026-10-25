import test from 'node:test';
import assert from 'node:assert/strict';
import {safeNavigationSource,contextualHref,navigationMemoryPath} from '../lib/navigationContext.js';
import {figureFilterDefaults,readFigureFilters,figureFilterSearch,filterFigures} from '../lib/figureFilters.js';
test('contextual return keeps bounded internal list state and rejects redirects or secrets',()=>{
 for(const input of ['https://evil.test/search','//evil.test/search','/\\evil.test/search','/%2f%2fevil.test','/admin','/api/admin/tasks','javascript:alert(1)','/search\n'])assert.equal(safeNavigationSource(input),null,input);
 const source=safeNavigationSource('/search?q=اليمن&type=figures&scope=title&exclude=سابق&access_token=secret#results');assert.ok(source.includes('scope=title'));assert.ok(!source.includes('secret'));
 const href=new URL(contextualHref('/yemen-map/figures/local',source),'https://local.test');assert.equal(href.searchParams.get('from'),source);
 assert.equal(contextualHref('/login',source),'/login');assert.equal(contextualHref('https://external.test/path',source),'https://external.test/path');
 assert.equal(new URL(contextualHref('/works/local?from=%2Fread-later',source),'https://local.test').searchParams.get('from'),'/read-later');
 assert.equal(navigationMemoryPath('/yemen-map?photo=1&era=تاريخية#yemeni-figures'),navigationMemoryPath('/yemen-map?era=تاريخية&photo=1'));
});
test('figure filters combine only recorded metadata; stable sorts put unknown dates last',()=>{
 const rows=[{id:'a',fullName:'ألف',knownFor:'كاتب',shortBio:'سيرة',field:'أدب',era:'تاريخية',governorateId:'YE19',birthYear:1900,imageUrl:'image',website:'https://example.test',createdAt:'2026-10-01'},
 {id:'b',fullName:'باء',knownFor:'باحث',field:'علم',era:'معاصرة',governorateId:'YE15',birthYear:1970,createdAt:'2026-10-02'},
 {id:'c',fullName:'جيم',knownFor:'كاتب',field:'أدب',era:'تاريخية',governorateId:'YE19',birthYear:null,imageUrl:'image'}];
 const filters={...figureFilterDefaults,region:'YE19',field:'أدب',era:'تاريخية',photo:true,social:true,century:'19',birthFrom:'1850',birthTo:'1900'};
 assert.deepEqual(filterFigures(rows,filters).map(f=>f.id),['a']);
 assert.deepEqual(filterFigures(rows,{...figureFilterDefaults,figureSort:'youngest'}).map(f=>f.id),['b','a','c']);
 assert.deepEqual(filterFigures(rows,{...figureFilterDefaults,birthFrom:'2000',birthTo:'1900'}),[]);
 const search=figureFilterSearch('?region=YE19&district=YE1901',{...filters,visible:24});const parsed=readFigureFilters(search);assert.equal(parsed.photo,true);assert.equal(parsed.visible,24);assert.equal(search.get('region'),'YE19');
 assert.equal(readFigureFilters('?photo=yes&visible=-1&birthFrom=unknown&figureSort=madeup').figureSort,'default');
 assert.deepEqual(filterFigures(rows,{...figureFilterDefaults,figureSort:'newest'}).map(f=>f.id),['b','a','c']);
});
