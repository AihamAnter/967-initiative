import test from 'node:test';
import assert from 'node:assert/strict';
import {accountAuthErrorMessage as message} from '../lib/authErrors.js';

test('account sign-in distinguishes credential failures from unconfirmed email',()=>{
 assert.match(message({code:'invalid_credentials'}),/غير صحيحة/);
 assert.doesNotMatch(message({code:'invalid_credentials'}),/لم يُؤكَّد/);
 assert.match(message({code:'email_not_confirmed'}),/لم يُؤكَّد/);
});
test('account errors distinguish rate limiting, connection and service failures',()=>{
 assert.match(message({status:429}),/طلبات كثيرة/);
 assert.match(message({name:'AuthRetryableFetchError',status:0}),/الاتصال/);
 assert.match(message({name:'AuthRetryableFetchError',status:503}),/غير متاحة مؤقتاً/);
});
test('account messages do not render unexpected server details',()=>{
 const error={code:'unexpected_failure',message:'private database or token detail'};
 for(const action of ['login','register','forgot','update'])assert.doesNotMatch(message(error,action),/private|database|token/);
});
