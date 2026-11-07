import test from 'node:test';
import assert from 'node:assert/strict';
import {categoryFor,chainConcern,matchedEvidence,openingFromEvidence} from './real-place-import.mjs';
test('categories use the actual provider category; cafes never default to nature',()=>{
 assert.equal(categoryFor('카페,디저트>카페'),'food');
 assert.equal(categoryFor('여행,명소>도시,테마공원'),'nature');
 assert.equal(categoryFor('문화,예술>박물관'),'culture');
 assert.equal(categoryFor('부동산>임대업'),null);
 assert.ok(chainConcern('스타벅스 안산')); assert.ok(chainConcern('식당 안산점'));
 assert.equal(chainConcern('문다방'),undefined); // This is not a positive non-franchise classification.
});
test('joins require matching name, road address and coordinates',()=>{
 const candidate={name:'실제 이름',address:'경기도 안산시 상록구 충장로 8',location:{lat:37.28,lng:126.85}};
 const evidence={name:'실제이름',address:{streetAddress:'경기 안산시 상록구 충장로 8 1층'},geo:{latitude:37.28,longitude:126.85}};
 assert.equal(matchedEvidence(candidate,[evidence]),evidence);
 assert.equal(matchedEvidence({...candidate,address:'경기도 안산시 상록구 충장로 80'},[evidence]),undefined);
 assert.equal(matchedEvidence({...candidate,location:{lat:37.3,lng:126.85}},[evidence]),undefined);
});
test('missing/overnight/complex hours never become inferred open or closed',()=>{
 const p=openingFromEvidence({hoursWeekly:{월:'정보 없음',화:'09:00 - 18:00',수:'17:00 - 02:00 다음 날',목:'휴무'}});
 assert.deepEqual(p.weekly[2],[{open:'09:00',close:'18:00'}]);
 assert.deepEqual(p.weekly[4],[]);assert.ok(p.unknownDays.includes(1));assert.ok(p.unknownDays.includes(3));
 assert.equal(openingFromEvidence({hoursWeekly:{화:'09:00 - 18:00'},complexHours:true}).status,'unknown');
});
