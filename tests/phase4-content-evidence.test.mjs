import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validEvidenceDate,medicalOperatingEvidence,indicatorMeasurementEvidence,hasFigureImageProvenance} from '../lib/contentEvidence.js';
import {indicatorReading} from '../lib/indicatorPresentation.js';
import {validateCompanySources} from '../lib/companySources.js';
import {validateIndicatorEditorial} from '../lib/indicatorEditorial.js';
import {validateHistoryEntry} from '../lib/historyRepository.js';
import {historyStarter} from '../lib/yemenHistory.js';
import {latestEvidenceDate} from '../lib/institutionDirectories.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const asOf=new Date('2026-10-31T12:00:00.000Z');

test('verified timestamps must be actual past or present calendar dates',()=>{
 for(const date of ['2026-10-31','2024-02-29','2023-12-31'])assert.equal(validEvidenceDate(date,asOf),true,date);
 for(const date of ['2026-11-01','2027-01-01','2026-02-30','2023-02-29','2026-13-05','0000-00-00','2026-10'])assert.equal(validEvidenceDate(date,asOf),false,date);
});
test('an impossible source date cannot make directory evidence look newer',()=>{
 const source={sources:[{status_as_of:'2026-02-30',source_published_at:'2024-01-01'},{status_as_of:'2025-05-01'}]};
 assert.equal(latestEvidenceDate(source).label,'2025-05-01');
 assert.equal(latestEvidenceDate({sources:[{status_as_of:'2026-02-30'}]}),null);
});
test('medical operational status is historical when a source dates back to 2023',()=>{
 const old=medicalOperatingEvidence({operatingStatus:'fully_operational',operatingStatusAsOf:'2023-12-31'},asOf);
 assert.equal(old.kind,'historical');
 assert.match(old.message,/2023-12-31/);
 assert.match(old.message,/ليس تأكيدًا/);
 const fresh=medicalOperatingEvidence({operating_status:'partially_operational',operating_status_as_of:'2026-10-01'},asOf);
 assert.equal(fresh.kind,'dated');
 assert.equal(medicalOperatingEvidence({operatingStatus:'unknown'},asOf).kind,'unknown');
 assert.equal(medicalOperatingEvidence({operatingStatus:'fully_operational'},asOf).kind,'undated');
});
test('statistical years never become current claims through recent CMS edits',()=>{
 assert.equal(indicatorMeasurementEvidence(1994,asOf).kind,'historical');
 assert.equal(indicatorMeasurementEvidence(2014,asOf).kind,'historical');
 assert.equal(indicatorMeasurementEvidence(2022,asOf).kind,'older');
 assert.equal(indicatorMeasurementEvidence(2025,asOf).kind,'recent');
 assert.equal(indicatorMeasurementEvidence(2027,asOf).kind,'future');
 const note=indicatorReading({latestValue:{value:12,year:2014,value_status:'estimated'},values:[{year:2014}],unit:'%'});
 assert.match(note,/سنة 2014/);
 assert.match(note,/لا تعبّر بالضرورة/);
});
test('show figure photographs only with traceable source and credit, allowing gallery provenance',()=>{
 const photo={imageUrl:'https://example.org/img.jpg',imageCredit:'مصور',imageSourceUrl:'https://example.org/source'};
 assert.equal(hasFigureImageProvenance(photo),true);
 assert.equal(hasFigureImageProvenance({...photo,imageCredit:''}),false);
 assert.equal(hasFigureImageProvenance({...photo,imageSourceUrl:'javascript:bad'}),false);
 assert.equal(hasFigureImageProvenance({imageUrl:photo.imageUrl},{credit:'تصوير فني',sourceUrl:'https://example.org/attribution'}),true);
 assert.equal(hasFigureImageProvenance({imageUrl:''}),false);
 const directory=read('components/yemen-map/YemeniFiguresDirectory.jsx');
 const profile=read('app/yemeni-figures/[slug]/page.jsx');
 assert.match(directory,/hasFigureImageProvenance\(figure\)/);
 assert.match(profile,/hasAttributedPortrait/);
});
test('future or impossible editorial review dates cannot assert source verification',()=>{
 const companySource={title:'مصدر',url:'https://example.org/source',reviewedAt:'2099-01-01'};
 assert.throws(()=>validateCompanySources([companySource]),/تاريخ/);
 assert.throws(()=>validateCompanySources([{...companySource,reviewedAt:'2026-02-30'}]),/تاريخ/);
 const base={intro:'',why_it_matters:'',historical_context:'',limitations:'',source_notes:'',reference_links:[],reviewed_on:'2099-01-01',is_published:false};
 assert.throws(()=>validateIndicatorEditorial(base),/تاريخ/);
 assert.throws(()=>validateIndicatorEditorial({...base,reviewed_on:'2026-02-30'}),/تاريخ/);
 const file=read('lib/figureProfiles.js');
 assert.match(file,/validEvidenceDate\(value\)/);
});
test('historical catalog rejects future entries but keeps BCE years and source references',()=>{
 const first=historyStarter[0];
 assert.throws(()=>validateHistoryEntry({...first,year:2099}),/المستقبل/);
 assert.doesNotThrow(()=>validateHistoryEntry(first));
 const detail=read('components/InstitutionDetail.jsx');
 assert.match(detail,/medicalOperatingEvidence\(item\)/);
 assert.match(detail,/التحقق من الهوية لا يثبتان الاعتماد الأكاديمي/);
 assert.match(read('app/yemeni-products/[id]/page.jsx'),/لم يُرفق مصدر مستقل لهذا المنتج/);
 assert.match(read('components/IndicatorCard.jsx'),/indicatorMeasurementEvidence\(latest.year\)/);
});
test('Yemen map profiles demand cited district facts and photo provenance',()=>{
 const code=read('lib/districtProfiles.js');
 assert.match(code,/if\(value\.image_url&&\(!value\.image_credit\|\|!value\.image_source_url\)\)/);
 assert.match(code,/if\(!value\.sources\.length/);
 assert.match(code,/boundarySource/);
});
