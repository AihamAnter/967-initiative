import test from 'node:test';import assert from 'node:assert/strict';
import {formatDebateSchedule,publicRecordingAvailable,recordingPreviewState} from '../lib/debates.js';
test('release schedule consistently shows Yemen time, including UTC date rollover, without invented dates',()=>{
 assert.deepEqual(formatDebateSchedule('2026-10-30T17:00:00Z'),{iso:'2026-10-30T17:00:00.000Z',date:'30 أكتوبر 2026',time:'8:00 مساءً'});
 assert.match(formatDebateSchedule('2026-10-30T22:30:00Z').date,/31/);assert.equal(formatDebateSchedule('2026-10-30T22:30:00Z').time,'1:30 صباحاً');
 for(const value of [null,undefined,'','invalid-date'])assert.equal(formatDebateSchedule(value),null);
});
test('preview follows actual availability and distinguishes cancellation, postponement, external broadcasts and withdrawals',()=>{
 const d={publication_status:'published',debate_type:'prerecorded',stage:'announced',recording_published:false,recording_url:'https://www.youtube.com/watch?v=abcdefghijk'};
 assert.equal(publicRecordingAvailable(d),false);assert.equal(recordingPreviewState(d),'pending');assert.equal(recordingPreviewState({...d,stage:'upcoming'}),'pending');assert.equal(recordingPreviewState({...d,stage:'postponed'}),'postponed');assert.equal(recordingPreviewState({...d,stage:'cancelled'}),'cancelled');
 for(const stage of ['live','ended'])assert.equal(recordingPreviewState({...d,debate_type:'external_live',stage}),stage);
 assert.equal(publicRecordingAvailable({...d,recording_published:true,stage:'recording_available'}),true);assert.equal(recordingPreviewState({...d,recording_published:true,stage:'recording_available'}),'available');
 assert.equal(publicRecordingAvailable({...d,recording_published:true,recording_url:null}),false);assert.equal(publicRecordingAvailable({...d,recording_published:true,publication_status:'hidden'}),false);
 assert.equal(recordingPreviewState({...d,recording_first_published_at:'2026-10-01T10:00:00Z'}),'withdrawn');assert.equal(recordingPreviewState({...d,publication_status:'archived'}),'archived');
});
