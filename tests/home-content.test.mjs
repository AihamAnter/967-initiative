import test from 'node:test';
import assert from 'node:assert/strict';
import {selectHomeContent} from '../lib/homeContent.js';

const recording = {id:'debate',slug:'dialogue',stage:'recording_available',cover_url:'https://example.com/cover.jpg',created_at:'2026-10-01'};

test('an empty home has section invitations without fabricated records or numbers', () => {
  const result = selectHomeContent({});
  for (const key of ['work','issue','debate','company','professional']) assert.equal(result[key],null);
  assert.deepEqual(result.highlights,[]);
  assert.deepEqual(result.moreWorks,[]);
  assert.deepEqual(result.moreIssues,[]);
});

test('a published cover leads when the work lacks a thumbnail, preserving all four types', () => {
  const work = {id:'work',slug:'story'};
  const issue = {id:'issue',slug:'issue-1'};
  const indicator = {id:'metric',latestValue:{value:0,year:2025}};
  const result = selectHomeContent({works:[work],issues:[issue],indicators:[indicator],debates:[recording]});
  assert.equal(result.leadKind,'debate');
  assert.equal(result.work,work);
  assert.equal(result.issue,issue);
  assert.equal(result.highlights[0],indicator);
});

test('a work with a thumbnail can lead without removing the debate', () => {
  const work = {id:'work',thumbnail_url:'/images/local-cover.png'};
  const result = selectHomeContent({works:[work],debates:[recording]});
  assert.equal(result.leadKind,'video');
  assert.equal(result.debate,recording);
});

test('a debate listed as a work is not promoted a second time as another story', () => {
  const linked = {id:'linked',debate_slug:recording.slug};
  const independent = {id:'independent',slug:'other'};
  const extra = {id:'extra',slug:'third'};
  const result = selectHomeContent({works:[linked,independent,extra],debates:[recording]});
  assert.equal(result.work,independent);
  assert.deepEqual(result.moreWorks,[extra]);
  assert.equal(selectHomeContent({works:[linked],debates:[recording]}).work,null);
});

test('highlights retain zero, use the newest measurement years, and do not mutate the catalog', () => {
  const indicators = [
    {id:'old',latestValue:{value:12,year:2020}},
    {id:'missing',latestValue:null},
    {id:'zero',latestValue:{value:0,year:2026}},
    {id:'middle',latestValue:{value:4,year:2024}},
    {id:'recent',latestValue:{value:9,year:2025}},
  ];
  const before = structuredClone(indicators);
  const result = selectHomeContent({indicators});
  assert.deepEqual(result.highlights.map(item=>item.id),['zero','recent','middle']);
  assert.deepEqual(indicators,before);
});

test('demo directory records are excluded and promoted issues are not repeated', () => {
  const issue = {id:'issue-1'}, second = {id:'issue-2'};
  const company = {id:'company'}, professional = {id:'professional'};
  const result = selectHomeContent({issues:[issue,second],companies:[{isDemo:true},company],professionals:[{isDemo:true},professional]});
  assert.equal(result.company,company);
  assert.equal(result.professional,professional);
  assert.deepEqual(result.moreIssues,[second]);
  assert.equal(selectHomeContent({companies:[{isDemo:true}]}).company,null);
});
