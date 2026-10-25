import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {buildDistrictProfile,validateDistrictProfile} from '../lib/districtProfiles.js';
import {reviewedDistrictProfiles} from '../lib/reviewedDistrictProfiles.js';
const bounds=JSON.parse(await readFile(new URL('../public/data/yemen-map/yemen-boundaries.json',import.meta.url),'utf8'));

test('each district receives its real administrative identity without invented population or area',()=>{
 for(const region of bounds.districts){const profile=validateDistrictProfile(buildDistrictProfile(region,{},reviewedDistrictProfiles[region.id]));assert.ok(profile.description.includes(region.nameAr)||reviewedDistrictProfiles[region.id]);assert.equal(profile.population,null);assert.equal(profile.population_year,null);assert.equal(profile.area_km2,null);assert.ok(profile.sources.length);assert.ok(!Object.hasOwn(profile,'figures'));}
 for(const id of Object.keys(reviewedDistrictProfiles))assert.ok(bounds.districts.some(region=>region.id===id),id);
});
test('district profiles preserve deliberate empty values and require sources for numeric claims',()=>{
 const base=buildDistrictProfile(bounds.districts[0]),profile=validateDistrictProfile({...base,description:'',population:0,population_year:2024});
 assert.equal(profile.population,0);assert.equal(profile.description,'');
 for(const patch of [{population:3,population_year:null},{population:3.5,population_year:2024},{population_year:2035},{area_km2:-2},{population:10,population_year:2024,sources:[]}])assert.throws(()=>validateDistrictProfile({...base,...patch}));
});
test('district profile writes reject figure associations, unsafe URLs and unattributed images',()=>{
 const base=buildDistrictProfile(bounds.districts[0]);
 for(const patch of [{figure_ids:['private-person']},{governorate_id:'YE19'},{id:'YE9999'},{history:3},{sources:[{title:'source',url:'javascript:alert(1)'}]},{image_url:'https://example.test/photo.jpg'},{image_url:'data:image/png;base64,test'}])assert.throws(()=>validateDistrictProfile({...base,...patch}));
 const photo=validateDistrictProfile({...base,image_url:'https://example.test/photo.jpg',image_credit:'Photographer, CC BY 4.0',image_source_url:'https://example.test/source'});assert.ok(photo.image_url);
});
