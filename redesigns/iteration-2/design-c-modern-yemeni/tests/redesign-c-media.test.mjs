import test from 'node:test';
import assert from 'node:assert/strict';
import {canOptimizeImage,safeImageUrl} from '../lib/media.js';
test('image optimization follows configured provider paths and safely rejects malformed URLs',()=>{
 assert.equal(canOptimizeImage('https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg'),true);
 assert.equal(canOptimizeImage('https://i.ytimg.com/unconfigured/image.jpg'),false);
 assert.equal(canOptimizeImage('http://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg'),false);
 assert.equal(canOptimizeImage('https://unconfigured.example/photo.jpg'),false);
 assert.equal(safeImageUrl('javascript:alert(1)'),null);
 assert.equal(safeImageUrl('//unconfigured.example/image.jpg'),null);
 assert.equal(safeImageUrl('https://user:pass@example.com/image.jpg'),null);
});
