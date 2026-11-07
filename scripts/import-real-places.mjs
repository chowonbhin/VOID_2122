import fs from 'node:fs';
import { categoryFor, chainConcern, matchedEvidence, normalizeName, distanceMeters, openingFromEvidence, ratingFromEvidence } from './lib/real-place-import.mjs';
const args=process.argv.slice(2);
if(args.length!==2) throw new Error('Usage: node scripts/import-real-places.mjs candidates.json evidence.json');
const snapshot=JSON.parse(fs.readFileSync(args[0]));
const evidence=JSON.parse(fs.readFileSync(args[1]));
const reviews=JSON.parse(fs.readFileSync('src/data/research/franchise-reviews.json'));
const existing=JSON.parse(fs.readFileSync('src/data/naver-places.json'));
const regions=JSON.parse(fs.readFileSync('src/data/regions.json'));
const retained=[];
let duplicates=0;
for(const candidate of snapshot.candidates){
 const category=categoryFor(candidate.naverCategory);if(!category)continue;
 if(retained.some(p=>normalizeName(p.name)===normalizeName(candidate.name) && distanceMeters(p.location,candidate.location)<60)){duplicates++;continue;}
 retained.push({...candidate,category});
}
const places=retained.map(c=>{
 const e=matchedEvidence(c,evidence),review=reviews.find(r=>r.id===c.id);
 const previous=existing.find(p=>normalizeName(p.name)===normalizeName(c.name) && p.location && distanceMeters(p.location,c.location)<60);
 const excludedReason=review?.status==='non_franchise'?undefined:chainConcern(c.name);
 const source=e?{label:'함께할개 공개 매장 시간표 · 네이버 플레이스 재인용',url:e.sourceUrl,checkedAt:e.checkedAt}:null;
 return {id:previous?.id??c.id,regionId:c.regionId,name:c.name,category:c.category,
  franchise:review?{status:review.status,source:review.source}:previous?.franchise??{status:'unknown',source:null},
  location:c.location,address:c.address,
  regionSource:{label:'네이버 응답 좌표와 SGIS 2026-10-01 행정동 경계 대조',url:'https://github.com/vuski/admdongkor',checkedAt:snapshot.checkedAt},
  searchSource:c.searchSource,discovery:{category:c.naverCategory,...(excludedReason?{excludedReason}:{})},
  baseValue:70,
  ...(ratingFromEvidence(e) ? { ratingEvidence: ratingFromEvidence(e) } : {}),
  ...(e&&Number.isSafeInteger(e.visitorReviews)&&e.visitorReviews>=0?{popularityEvidence:{provider:'naver_place',metric:'visitor_reviews',count:e.visitorReviews,period:'cumulative',observedAt:e.updatedAt??undefined,
   source:{label:'함께할개가 기재한 네이버 방문자 리뷰 수 (2차 출처)',url:e.sourceUrl,checkedAt:e.checkedAt}}}:{}),
  opening:e?openingFromEvidence(e):previous?.opening??{status:'unknown'},source:source??previous?.source??null,isVirtual:false};
});
const counts=regions.map(r=>({regionId:r.id,name:r.name,candidates:places.filter(p=>p.regionId===r.id).length,
 discoverable:places.filter(p=>p.regionId===r.id&&!p.discovery.excludedReason&&p.franchise.status!=='franchise').length,
 reviewCounts:places.filter(p=>p.regionId===r.id&&p.popularityEvidence).length}));
if(counts.some(c=>c.discoverable<20))throw new Error('Under 20 actual candidates: '+JSON.stringify(counts.filter(c=>c.discoverable<20)));
fs.writeFileSync('src/data/research/real-places.json',JSON.stringify(places,null,2)+'\n');
fs.writeFileSync('src/data/real-collection.json',JSON.stringify({provider:snapshot.provider,checkedAt:snapshot.checkedAt,queryCount:snapshot.queries.length,rawCandidateCount:snapshot.candidates.length,duplicateCount:duplicates,importedCount:places.length,reviewCount:places.filter(p=>p.popularityEvidence).length,counts},null,2)+'\n');
console.log(JSON.stringify({places:places.length,duplicates,counts},null,2));
await import('./prepare-place-runtime.mjs');
