import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {arcadeMapProjection,arcadeRegionPath} from '../lib/arcadeMapProjection.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const atlas=JSON.parse(read('public/data/yemen-map/yemen-boundaries.json'));

test('game map uses a pixel-sized SVG viewport, not longitude-degree stroke widths',()=>{
 const p=arcadeMapProjection(atlas.country.bounds);
 assert.equal(p.width,1000);
 assert.ok(p.height>300&&p.height<700);
 assert.ok(p.viewBox.startsWith('0 0 1000 '));
 const [minLon,minLat,maxLon,maxLat]=atlas.country.bounds;
 const a=p.point(minLon,minLat),b=p.point(maxLon,maxLat);
 assert.ok(a[0]>0&&a[0]<1000);
 assert.ok(a[1]>0&&a[1]<p.height);
 assert.ok(b[0]>0&&b[0]<1000);
 assert.ok(b[1]>0&&b[1]<p.height);
 assert.throws(()=>arcadeMapProjection([3,4,2,9]));
 assert.throws(()=>arcadeMapProjection([1,2,3,4],{width:0}));
});

test('all Yemen governorates including multi-polygon islands fit safely inside game viewBox',()=>{
 const p=arcadeMapProjection(atlas.country.bounds);
 assert.equal(atlas.governorates.length,22);
 for(const g of atlas.governorates){
  const svgPath=arcadeRegionPath(g.geometry,p);
  assert.ok(svgPath.length>20,g.id);
  assert.ok(svgPath.startsWith('M'),g.id);
  assert.ok(svgPath.includes(' Z'),g.id);
  const points=[...svgPath.matchAll(/[ML](-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)].map(match=>[Number(match[1]),Number(match[2])]);
  assert.ok(points.length>15,g.id);
  for(const [x,y]of points){
   assert.ok(x>=0&&x<=p.width, g.id+' x:'+x);
   assert.ok(y>=0&&y<=p.height, g.id+' y:'+y);
  }
 }
});

test('hover and click highlighting use small constant SVG stroke width rather than huge degree-scale circles',()=>{
 const board=read('components/games/ArcadeBoards.jsx');
 const css=read('components/games/ArcadeChallenge.module.css');
 assert.ok(board.includes('d={arcadeRegionPath(region.geometry,projection)}'));
 assert.ok(board.includes('viewBox={projection.viewBox}'));
 assert.ok(board.includes('vectorEffect="non-scaling-stroke"'));
 assert.ok(board.includes('strokeLinejoin="round"'));
 assert.ok(board.includes("onAnswer(region.id)"));
 assert.ok(board.includes('onKeyDown'));
 const base=css.match(/\.region\{[^}]+\}/)?.[0]||'';
 const hover=css.match(/\.region:hover,\.region:focus-visible\{[^}]+\}/)?.[0]||'';
 assert.match(base,/stroke-width:1\.2/);
 assert.match(hover,/stroke-width:2\.3/);
 assert.ok(!base.includes('stroke-width:.02'));
 assert.ok(!board.includes('geometryToPath(region.geometry)'));
});
