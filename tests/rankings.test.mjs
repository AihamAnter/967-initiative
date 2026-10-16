import test from 'node:test';
import assert from 'node:assert/strict';
import {buildRanking, getDefaultRankingYear, getLastCompletedYear, getRankingSnapshotSummary, getRankingYears, getYemenNeighborhood, isRankingCode, isRankingSlug, validateRankingDataset} from '../lib/rankings.js';
import {fetchWorldBankDataset} from '../lib/rankingProvider.js';
import {createRankingRepository} from '../lib/rankingRepository.js';
import {defaultRankingIndicators} from '../lib/rankingCatalog.js';

const code = 'SP.POP.TOTL';
const countries = [
  {code: 'USA', iso2: 'US', name: 'الولايات المتحدة', arab: false},
  {code: 'FRA', iso2: 'FR', name: 'فرنسا', arab: false},
  {code: 'SAU', iso2: 'SA', name: 'السعودية', arab: true},
  {code: 'EGY', iso2: 'EG', name: 'مصر', arab: true},
  {code: 'JOR', iso2: 'JO', name: 'الأردن', arab: true},
  {code: 'YEM', iso2: 'YE', name: 'اليمن', arab: true},
  {code: 'CAN', iso2: 'CA', name: 'كندا', arab: false},
];
function dataset() {
  return {version: 1, indicatorCode: code, fromYear: 2000, toYear: 2022, fetchedAt: '2026-10-17T00:00:00Z', source: {name: 'WDI', url: `https://data.worldbank.org/indicator/${code}`, updatedAt: '2026-10-01'}, countries: structuredClone(countries), values: [
    ...[['USA',100],['FRA',70],['SAU',50],['EGY',50],['JOR',20],['YEM',0],['CAN',-1]].map(([country,value]) => ({country,year:2021,value})),
    {country:'USA',year:2022,value:999}, {country:'YEM',year:2020,value:4},
  ]};
}

test('ranking selects latest Yemen year, never the newest unrelated country year', () => {
  const data = dataset();
  assert.deepEqual(getRankingYears(data), [2022,2021,2020]);
  assert.equal(getDefaultRankingYear(data), 2021);
  assert.equal(buildRanking(data, {year:2021})[0].value, 100);
  assert.equal(buildRanking(data, {year:2022}).length, 1);
  assert.deepEqual(getYemenNeighborhood(buildRanking(data, {year:2022})), []);
  data.values = data.values.filter(value => value.country !== 'YEM');
  assert.equal(getDefaultRankingYear(data), null);
});

test('world and Arab rankings preserve zero, negative values and competition ties', () => {
  const data = dataset();
  const world = buildRanking(data, {year:2021});
  assert.deepEqual(world.map(row => row.rank), [1,2,3,3,5,6,7]);
  assert.equal(world.find(row => row.code === 'YEM').value, 0);
  assert.equal(world.find(row => row.code === 'SAU').tieCount, 2);
  const arab = buildRanking(data, {year:2021,scope:'arab'});
  assert.deepEqual(arab.map(row => row.rank), [1,1,3,4]);
  assert.equal(arab.find(row => row.code === 'YEM').rank, 4);
  assert.equal(buildRanking(data, {year:2021,direction:'asc'})[0].code, 'CAN');
  assert.equal(buildRanking(data, {year:2021,direction:'asc'}).find(row => row.code === 'YEM').rank, 2);
  assert.deepEqual(buildRanking({...data,values:data.values.toReversed()}, {year:2021}), world);
});

test('Yemen neighborhood fills a five-row edge window without changing global ranks', () => {
  const rows = buildRanking(dataset(), {year:2021});
  const window = getYemenNeighborhood(rows);
  assert.equal(window.length, 5);
  assert.ok(window.some(row => row.code === 'YEM'));
  assert.equal(window.find(row => row.code === 'YEM').rank, 6);
  const first = [{code:'YEM',rank:1},...rows.filter(row => row.code !== 'YEM')];
  assert.deepEqual(getYemenNeighborhood(first), first.slice(0,5));
  assert.equal(getYemenNeighborhood([{code:'YEM'}]).length, 1);
});

test('tied values always use ASCII country-code order regardless of names or ICU locale', () => {
  const data = dataset();
  const tied = input => buildRanking(input, {year:2021}).filter(row => row.value === 50);
  assert.deepEqual(tied(data).map(row => row.code), ['EGY','SAU']);
  data.countries = data.countries.toReversed().map(country => ({...country,name:country.code==='EGY'?'ZZZ':'AAA'}));
  assert.deepEqual(tied(data).map(row => row.code), ['EGY','SAU']);
  assert.deepEqual(tied(data).map(row => [row.rank,row.tieCount]), [[3,2],[3,2]]);
});

test('snapshot validator rejects missing, duplicate, wrong-code and future observations', () => {
  const invalid = [
    data => {data.indicatorCode = 'OTHER.CODE';},
    data => {data.values.push({...data.values[0]});},
    data => {data.values[0].value = null;},
    data => {data.values[0].value = '';},
    data => {data.values[0].value = Infinity;},
    data => {data.values[0].year = getLastCompletedYear() + 1;},
    data => {data.values[0].country = 'WLD';},
    data => {data.countries.push({...data.countries[0]});},
    data => {data.source.url = `https://data.worldbank.org:444/indicator/${code}`;},
    data => {data.source.url = 'javascript:alert(1)';},
  ];
  for (const mutate of invalid) { const data=dataset();mutate(data);assert.throws(() => validateRankingDataset(data,code)); }
  assert.throws(() => buildRanking(dataset(), {year:'2021'}));
  assert.throws(() => buildRanking(dataset(), {year:2021,scope:'region'}));
  assert.throws(() => buildRanking(dataset(), {year:2021,direction:'up'}));
  assert.throws(() => getYemenNeighborhood([], -1));
  assert.equal(getRankingSnapshotSummary(dataset()).countryCount,7);
});

test('provider code and bundle slugs cannot contain paths, URLs or query injection', async () => {
  for (const value of ['https://evil.test', '../SP.POP.TOTL', 'SP.POP.TOTL?source=3', 'SP.POP.TOTL;OTHER', 'code']) {
    assert.equal(isRankingCode(value), false);
    await assert.rejects(fetchWorldBankDataset(value));
  }
  for (const value of ['../population','https://evil.test','a/b','a%2fb','Population','a?b','']) assert.equal(isRankingSlug(value),false);
});

function page(rows, number=1, pages=1, total=rows.length, extra={}) { return new Response(JSON.stringify([{page:number,pages,total,...extra},rows]),{headers:{'content-type':'application/json'}}); }
const metadata = [{id:code,source:{id:'2'},sourceOrganization:'Original provider, CC BY-NC IGO exception',sourceNote:'Definition and limitations'}];
const wbCountries = [
  {id:'YEM',iso2Code:'YE',name:'Yemen',region:{id:'MEA'}},
  {id:'SAU',iso2Code:'SA',name:'Saudi Arabia',region:{id:'MEA'}},
  {id:'FRA',iso2Code:'FR',name:'France',region:{id:'ECS'}},
  {id:'WLD',iso2Code:'1W',name:'World',region:{id:'NA'}},
];
const observation = (country,year,value) => ({countryiso3code:country,country:{id:country==='YEM'?'YE':'SA'},date:String(year),value,indicator:{id:code}});
async function mockProvider(handler, work) {
  const original = globalThis.fetch;
  globalThis.fetch = async (input,init) => {
    const url = new URL(input);
    assert.equal(url.origin,'https://api.worldbank.org');
    assert.equal(init.redirect,'error');
    assert.equal(init.cache,'no-store');
    assert.ok(init.signal instanceof AbortSignal);
    return handler(url,init);
  };
  try { return await work(); } finally { globalThis.fetch = original; }
}

test('World Bank provider paginates actual totals, excludes aggregates and keeps original attribution', async () => {
  const seen = [];
  await mockProvider(url => {
    const number=Number(url.searchParams.get('page'));seen.push(url.pathname+':'+number);
    if (url.pathname===`/v2/indicator/${code}`) {assert.equal(url.searchParams.get('source'),'2');return page(metadata);}
    if (url.pathname==='/v2/country') return page(wbCountries);
    assert.equal(url.searchParams.get('source'),'2');assert.equal(url.searchParams.get('date'),'2000:2022');
    return number===1 ? page([observation('YEM',2021,0),observation('SAU',2021,null)],1,2,6,{lastupdated:'2026-10-01'}) : page([observation('FRA',2021,-2),observation('WLD',2021,99),observation('YEM',2027,123),observation('SAU',2022,'')],2,2,6,{lastupdated:'2026-10-01'});
  }, async () => {
    const data = await fetchWorldBankDataset(code,{fromYear:2000,toYear:2022});
    assert.equal(data.countries.length,3);
    assert.deepEqual(data.values,[{country:'FRA',year:2021,value:-2},{country:'YEM',year:2021,value:0}]);
    assert.equal(data.countries.find(country => country.code==='YEM').name,'اليمن');
    assert.equal(data.countries.find(country => country.code==='SAU').arab,true);
    assert.equal(data.countries.find(country => country.code==='FRA').arab,false);
    assert.equal(data.source.updatedAt,'2026-10-01');
    assert.equal(data.source.sourceOrganization,metadata[0].sourceOrganization);
    assert.equal(data.source.sourceNote,metadata[0].sourceNote);
    assert.equal(getRankingSnapshotSummary(data).countryCount,2);
    assert.ok(seen.includes(`/v2/country/all/indicator/${code}:2`));
  });
});

test('provider rejects incomplete pagination and non-WDI metadata instead of accepting partial rankings', async () => {
  for (const kind of ['missing-page','changed-total','duplicate','wrong-source','html']) {
    await mockProvider(url => {
      if (url.pathname===`/v2/indicator/${code}`) return kind==='wrong-source'?page([{id:code,source:{id:'6'}}]):page(metadata);
      if (url.pathname==='/v2/country') return page(wbCountries);
      if (kind==='html') return new Response('<html>service unavailable</html>');
      if (kind==='duplicate') return page([observation('YEM',2021,1),observation('YEM',2021,2)]);
      const number=Number(url.searchParams.get('page'));
      if (number===1) return page([observation('YEM',2021,1)],1,2,2,{lastupdated:'2026-10-01'});
      if (kind==='changed-total') return page([observation('FRA',2021,1)],2,2,3,{lastupdated:'2026-10-01'});
      return page([],2,2,2,{lastupdated:'2026-10-01'});
    }, () => assert.rejects(fetchWorldBankDataset(code,{toYear:2022}),undefined,kind));
  }
});

function mockDb({indicators=[],snapshots=[],indicatorError=null,snapshotError=null}={}) {
  return {from(table) {
    const filters=[];
    const builder={select(){return this;},order(){return this;},eq(key,value){filters.push(row=>row[key]===value);return this;},in(key,values){filters.push(row=>values.includes(row[key]));return this;},
      result(){const error=table==='ranking_indicators'?indicatorError:snapshotError;const rows=(table==='ranking_indicators'?indicators:snapshots).filter(row=>filters.every(filter=>filter(row)));return {data:rows,error};},
      async range(from,to){const result=this.result();return {...result,data:result.data.slice(from,to+1)};},
      async maybeSingle(){const result=this.result();return {...result,data:result.data[0]||null};},
      then(resolve,reject){return Promise.resolve(this.result()).then(resolve,reject);},
    };return builder;
  }};
}
const defaultIndicator = defaultRankingIndicators.find(item=>item.code===code);
const published = {...defaultIndicator,id:'00000000-0000-4000-8000-000000000001',updated_at:'2026-10-17T00:00:00Z',is_published:true};
function repository(db, readBundledDataset=async()=>dataset()) { return createRankingRepository({getDb:()=>db,defaultIndicators:[defaultIndicator],readBundledDataset}); }

test('missing schema falls back, while an existing empty or draft-only DB catalog remains authoritative', async () => {
  const missing=await repository(mockDb({indicatorError:{code:'PGRST205'}})).getRankingCatalog();
  assert.equal(missing.setupRequired,true);assert.equal(missing.mode,'bundled');assert.equal(missing.indicators.length,1);
  const empty=await repository(mockDb()).getRankingCatalog();assert.deepEqual(empty.indicators,[]);assert.equal(empty.setupRequired,false);assert.equal(empty.mode,'database');
  const db=mockDb({indicators:[{...published,is_published:false}]});
  assert.deepEqual((await repository(db).getRankingCatalog()).indicators,[]);
  assert.equal((await repository(db).getRankingCatalog({includeDrafts:true})).indicators.length,1);
});

test('permission failures, missing columns and connection failures never masquerade as missing setup', async () => {
  for (const code of ['42501','PGRST204','08006']) {
    await assert.rejects(repository(mockDb({indicatorError:{code,message:'unavailable'}})).getRankingCatalog(),error=>error.code===code);
    await assert.rejects(repository(mockDb({snapshotError:{code}})).getRankingCatalog());
    await assert.rejects(repository(mockDb({snapshotError:{code}})).getRankingDataset(published));
  }
});

test('missing DB snapshot can use only a matching shipped slug and code, never a stale or corrupt snapshot', async () => {
  const repo=repository(mockDb());
  assert.equal((await repo.getRankingDataset(published)).indicatorCode,code);
  assert.equal(await repo.getRankingDataset({...published,code:'OTHER.CODE'}),null);
  assert.equal(await repo.getRankingDataset({...published,slug:'custom-population'}),null);
  const stale=repository(mockDb({snapshots:[{indicator_id:published.id,payload:{indicatorCode:'OLD.CODE'}}]}));
  assert.equal(await stale.getRankingDataset(published),null);
  const corrupt=dataset();corrupt.values[0].value=null;
  await assert.rejects(repository(mockDb({snapshots:[{indicator_id:published.id,payload:corrupt}]})).getRankingDataset(published));
  const wrongBundle=repository(null,async()=>({...dataset(),indicatorCode:'WRONG.CODE'}));
  await assert.rejects(wrongBundle.getRankingDataset(published));
});

test('catalog snapshot summary is hidden after a code edit and missing snapshot schema is explicit', async () => {
  const summary={...getRankingSnapshotSummary(dataset()),indicatorCode:code};
  const db=mockDb({indicators:[published],snapshots:[{indicator_id:published.id,summary,updated_at:'2026-10-17T01:00:00Z'}]});
  assert.equal((await repository(db).getRankingCatalog()).indicators[0].snapshot.updatedAt,'2026-10-17T01:00:00Z');
  db.from = mockDb({indicators:[{...published,code:'NEW.CODE'}],snapshots:[{indicator_id:published.id,summary}]}).from;
  assert.equal((await repository(db).getRankingCatalog()).indicators[0].snapshot,null);
  const incomplete=await repository(mockDb({indicators:[published],snapshotError:{code:'42P01'}})).getRankingCatalog();
  assert.equal(incomplete.setupRequired,true);assert.equal(incomplete.indicators[0].id,published.id);
});
