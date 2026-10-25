import test from 'node:test';
import assert from 'node:assert/strict';
import {addExplorationId, restoreExplorationIds} from '../lib/exploration.js';

const catalog = [{id:'a', name:'أبين'}, {id:'b', name:'عدن'}, {id:'c', name:'تعز'}, {id:'d', name:'إب'}];

test('a tour records distinct real choices, stops at three and never mutates its input', () => {
  const initial = [];
  const first = addExplorationId(initial, 'a', catalog);
  assert.deepEqual(initial, []);
  assert.deepEqual(first, ['a']);
  assert.equal(addExplorationId(first, 'a', catalog), first);
  assert.equal(addExplorationId(first, 'unknown', catalog), first);
  const complete = ['a', 'b', 'c'];
  assert.equal(addExplorationId(complete, 'd', catalog), complete);
});

test('a returning visit restores only current catalog IDs, ignoring duplicates and obsolete or forged entries', () => {
  assert.deepEqual(restoreExplorationIds('["a","unknown","b","a",123,"c","d"]', catalog), ['a','b','c']);
  assert.deepEqual(restoreExplorationIds('[{"id":"a","name":"forged label"},"b"]', catalog), ['b']);
  assert.deepEqual(restoreExplorationIds('["a"]', []), []);
  for (const value of [null, '', 'broken', '{}', 'null', '42']) assert.deepEqual(restoreExplorationIds(value, catalog), []);
  assert.deepEqual(restoreExplorationIds('[]', catalog), []);
});
