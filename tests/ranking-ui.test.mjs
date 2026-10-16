import test from 'node:test';
import assert from 'node:assert/strict';
import {rankingBarGeometry, rankingHistoryPoints, rankingLocation, rankingSharePath} from '../lib/rankingUi.js';

test('ranking share links preserve valid Arabic-year, metric, scope, and comparison state', () => {
  const indicators = [{slug: 'population'}, {slug: 'life-expectancy'}];
  const state = rankingLocation('?indicator=life-expectancy&year=٢٠٢٣&scope=arab&compare=egy', indicators);
  assert.deepEqual(state, {indicator: 'life-expectancy',year: 2023,scope: 'arab',compare: 'EGY'});
  assert.deepEqual(rankingLocation(rankingSharePath(state).split('?')[1], indicators),state);
  assert.equal(rankingLocation('?indicator=private&year=NaN&compare=YEM', indicators).indicator,'population');
  assert.equal(rankingLocation('?compare=javascript:alert(1)', indicators).compare,'');
});

test('neighbor bars retain zero, align negative and positive values, and stay within their track', () => {
  const rows = [{code: 'A',value: -20},{code: 'B',value: 0},{code: 'YEM',value: 80}];
  const bars = rankingBarGeometry(rows);
  assert.equal(bars.baseline,20);
  assert.deepEqual(bars.bars.A,{left: 0,width: 20});
  assert.deepEqual(bars.bars.B,{left: 20,width: 0});
  assert.deepEqual(bars.bars.YEM,{left: 20,width: 80});
  assert.deepEqual(rankingBarGeometry([{code:'YEM',value:0}]).bars.YEM,{left:0,width:0});
});

test('Yemen history excludes missing values and other countries without filling absent years', () => {
  const points=rankingHistoryPoints([{country:'YEM',year:2020,value:0},{country:'YEM',year:2021,value:null},{country:'YEM',year:2023,value:3},{country:'EGY',year:2022,value:99}]);
  assert.deepEqual(points.map(item=>[item.year,item.value]),[[2020,0],[2023,3]]);
  assert.ok(points.every(item=>Number.isFinite(item.x)&&Number.isFinite(item.y)));
  assert.ok(rankingHistoryPoints([{country:'YEM',year:2023,value:0}]).every(item=>Number.isFinite(item.x)&&Number.isFinite(item.y)));
});
