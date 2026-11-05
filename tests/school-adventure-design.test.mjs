import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('the school home is a four-world adventure map, not a grid of duplicate course cards',()=>{
 const home=read('app/school/page.jsx');
 const map=read('components/school/SchoolWorldMap.jsx');
 const css=read('components/school/SchoolWorldMap.module.css');
 assert.ok(home.includes('id="school-paths"'));
 assert.ok(home.includes('<SchoolWorldMap/>'));
 assert.ok(home.includes('href="/school/dashboard"'));
 assert.ok(home.includes('15 مسارًا و180 محطة'));
 for(const href of ['/school/writing','/school/nature','/school/logic','/school/civic'])assert.ok(map.includes("href:'"+href+"'"),href);
 assert.ok(map.includes("id:'writing'")&&map.includes("id:'nature'")&&map.includes("id:'logic'")&&map.includes("id:'civic'"));
 assert.ok(map.includes('const worlds=['));
 assert.ok(map.includes('قيد الإعداد'));
 assert.ok(!map.includes('href="/school/art"'));
 for(const cls of ['.worldList','.worldItem','.roadNode','.scene','.worldAction','.worldPending','.mapEnd'])assert.ok(css.includes(cls),cls);
 assert.ok(css.includes(':global(:root[data-ed-theme="dark"])'));
 assert.ok(css.includes('@media(max-width:700px)'));
 assert.ok(css.includes('@media(max-width:360px)'));
 assert.ok(css.includes('prefers-reduced-motion:reduce'));
 assert.equal(css.split('{').length,css.split('}').length);
});

test('every department uses a connected expedition trail and preserves its public content source',()=>{
 const trail=read('components/school/SchoolTrackTrail.jsx');
 const css=read('components/school/SchoolTrackTrail.module.css');
 const pages=[
 ['app/school/writing/page.jsx','writing'],
 ['app/school/nature/page.jsx','nature'],
 ['app/school/logic/page.jsx','logic'],
 ['app/school/civic/page.jsx','civic']
 ];
 for(const [p,theme] of pages){
  const src=read(p);
  assert.ok(src.includes('<SchoolTrackTrail theme="'+theme+'"'),p);
  assert.ok(src.includes('publishedSchoolCatalog'),p);
  assert.ok(src.includes('href="/school/dashboard"')||src.includes("href='/school/dashboard'"),p);
 }
 assert.ok(read('app/school/nature/page.jsx').includes('publishedSchoolStages'));
 assert.ok(read('app/school/logic/page.jsx').includes('publishedSchoolStages'));
 assert.ok(read('app/school/civic/page.jsx').includes('publishedSchoolStages'));
 assert.ok(read('app/school/writing/page.jsx').includes("href:'/school/writing/musnad'"));
 assert.ok(read('app/school/writing/page.jsx').includes("href:'/school/writing/arud'"));
 assert.ok(trail.includes('tracks.map((track,index)'));
 assert.ok(trail.includes('track.href||'));
 assert.ok(trail.includes('اختر أي مسار')||trail.includes('يمكنك اختيار أي مسار منشور'));
 assert.ok(css.includes('.steps:before'));
 assert.ok(css.includes('.pathPin'));
 assert.ok(css.includes('.step:nth-child(even)'));
 assert.ok(css.includes('@media(max-width:680px)'));
 assert.ok(css.includes(':global(:root[data-ed-theme="dark"])'));
 assert.equal(css.split('{').length,css.split('}').length);
});

test('course station map uses true API progress and never unlocks a station cosmetically',()=>{
 const map=read('components/school/SchoolCourseMap.jsx');
 const css=read('components/school/SchoolCourseMap.module.css');
 assert.ok(map.includes("Authorization:'Bearer '+auth.session.access_token"));
 assert.ok(map.includes("const completed=Boolean(info?.completed)"));
 assert.ok(map.includes("const locked=!info||info.locked"));
 assert.ok(map.includes("const available=!state.loading&&!state.error&&!guest&&!locked"));
 assert.ok(map.includes("available?<Link href={'/school/courses/'+slug+'/'+(stage.index+1)}"));
 assert.ok(map.includes("const nextInfo=summary?.stages.find(item=>!item.completed&&!item.locked)"));
 assert.ok(map.includes("const nextStage=stages.find(item=>item.index===nextInfo?.index)"));
 assert.ok(map.includes('summary?.stages.filter(s=>s.completed)'));
 assert.ok(map.includes('summary.staffPreview'));
 assert.ok(map.includes('state.authRequired&&'));
 assert.ok(map.includes('aria-valuenow={done}'));
 assert.ok(map.includes('styles.timelineNode'));
 assert.ok(map.includes('styles.timelineDone'));
 assert.ok(map.includes('styles.timelineOpen'));
 for(const cls of ['.courseTimeline','.timelineStage','.timelineNode','.timelineDone','.timelineOpen','.courseProgress','.courseContinue'])assert.ok(css.includes(cls),cls);
 assert.ok(css.includes('max-width:630px'));
 assert.ok(css.includes('max-width:375px'));
 assert.ok(css.includes(':global(:root[data-ed-theme="dark"])'));
 assert.ok(css.includes('prefers-reduced-motion:reduce'));
 assert.equal(css.split('{').length,css.split('}').length);
});
