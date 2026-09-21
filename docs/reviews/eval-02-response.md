# EVAL-02 순수 응답 대조기 독립 검토

- 판정: **PASS — 지정 hash의 순수 서비스 응답 대조 범위**. 재현된 수정 필요 결함 0건. 모델 품질·자료 의미 감사·전체 G1~G6·출시 승인이 아니다.
- 검토자: 이번 독립 response-review 역할. 구현자가 작성한 39개 검사를 독립 검사로 합산하지 않았다. 추가 에이전트 0.
- 실행: 2026-09-22 02:30~02:34 KST, 첫 인계 6분 제한 내. `/Users/gsr/.nvm/versions/node/v24.12.0/bin/node`, 실제 `v24.12.0`.
- 사용자 지정 base: `74d28283691e06619687bf285b597d65de1efb14`. Git 금지에 따라 HEAD/base를 Git으로 재확인하지 않았으며, 아래 실제 파일 SHA-256을 증거 대상으로 삼았다.
- consumed_context_hash / ACK: `b854718fe0d43ecbcb09c627cca8a6309a839ea014f958f883834b0cad81531a`. EVAL-02 revision1 전문을 읽고 좁은 검토 계약을 확인했다.
- 목적: 정상 고객 상품 식별·후속 정정과 경영주의 이번 묶음/지속 정책 해석을 보존하면서, 잘못된 응답을 성공으로 집계하지 않는 기반을 검증한다. CORE-03/05/11/21/22/23/25/26, ADR-002 revision2, EVAL-01 revision2 적용.

## 대상과 변경 범위

검토 시작 및 독립 검사 후 실제 hash가 모두 사용자 지정값과 일치했다.

| 파일 | SHA-256 |
|---|---|
| scripts/eval-response.mjs | bec1dadffe23bb9a785e7e86c9546055a60515193cebab7b6873647625c68eaf |
| scripts/eval-response.check.mjs | ec6d9d8eb8dae0df304a1fdba85cab66bfe56de0c2e6cd2b80e32c9511611836 |
| docs/context/EVAL-02.md | b854718fe0d43ecbcb09c627cca8a6309a839ea014f958f883834b0cad81531a |
| docs/context/EVAL-01.md | c9ad2d925058cf7b01f7c1d0359095316b36eeb9d656030ea33245e7cf766cf0 |
| scripts/eval-dataset.mjs | 9c62ee23198c633cda05c6366b22fa209e092c08c2698987c19daa64cc1fb98d |
| lib/assistant/contracts.ts | 822339cd0c6df48a2ab59a45ff4f63f75447bfdb3eea44cb7898cace1915a736 |
| lib/assistant/dialogue-contracts.ts | 1d7e48b400621ea5df32c6d77a4add012f4bcca62e6d3d61c083576a131f1e68 |
| lib/assistant/merchant-context-contracts.ts | 62b2385ead0e86daa417ac8da9f3100f25b9cb973e53b5cf6074b72b64e3b169 |
| lib/assistant/policy-contracts.ts | a47374ec8fa771ff32191157767aa7536850961a74a64f7b3ffab5594d516e18 |
| data/catalog.json | 2841a3bb812bff687bf128f4db8e428bd3194767fd02613ee3d11b59911db10e |
| data/stores.json | e6f39a73cafc5738f00a505a663d66550f234aef6a669cf7ecf3d9ef5ba93fd2 |

직접 읽은 기준: 루트 및 docs AGENTS, card, docs README, 현재 CORE/index/02 결정, PROGRESS 최신 진행, EVAL-01/02 전문, ADR-002 전문, docs 09/13/14/20/21/23/24/25, 게이트 보고서 양식과 docs15. 적용 스킬은 wanna-gs-verify와 ponytail이며, 기존 API 파서 재사용·정상 보존·반례와 상태 구분을 중심으로 검토했다. 새 프레임워크나 앱 수정은 없다.

유일한 쓰기는 이 문서에 대한 apply_patch다. 사용자 제한이 PROGRESS 갱신 일반 규칙보다 우선하므로 조정자가 이 결과를 후속 기록에 연결한다. Git·network·provider·env·브라우저·DB·전체 build/offline suite·공개/보호 authored eval pack 접근은 하지 않았다. 순수 matcher import가 기존 eval-dataset의 catalog/store 및 연구 문서 ID 수집을 수행하는 것은 확인했으며, authored corpus를 읽는 inspectFiles/CLI는 실행하지 않았다.

## 독립 실행 결과와 정상 보존

별도 인공 입력으로 **47개 실행 / 47 PASS / 0 FAIL / 0 skip**, 종료 코드 0. 구현자의 39개 자체 검사 파일은 읽기 검토만 했으며 반복 실행하지 않았다.

아래 문서 내 재현 명령도 실행해 같은 47/47·exit 0을 확인했다(02:34:23 KST). 이는 동일 검사 재현 확인이며 94개 독립 사례로 합산하지 않는다. 직후 context·matcher·selfcheck hash를 다시 대조했고 모두 위 값 그대로였다.

| 범위 | 독립 검사 수 | 관측 |
|---|---:|---|
| 고객 3turn 정상·누락·문맥·상관 ID·SKU/kind·오류·입력 불변 | 24 | 정상 3turn과 실제 새 질문 전달은 match. 이전 질문/답변·초기 문장·turn 순서/누락·conversation/generation 변경은 request_mismatch. 응답 ID/generation·후보 순서·허구 SKU·오류 envelope는 invalid_response. 잘못된 kind/필수 SKU 누락은 oracle_mismatch |
| 경영주 전체 대안 tuple·상태 문맥·복원·정책 인계 | 16 | 두 전체 대안 각각 match. 한 대안의 SKU와 다른 대안의 예산 혼합은 mismatch. store/uiSeq/history/policy version·spent/selection/pending 불일치 거절. 정상 복원·SKU 집합 순서 변경·지속 정책 인계는 match |
| 정책 전체 대안·버전·안전 정규화 | 6 | 각 전체 tuple match, 필드 혼합과 다른 policyVersion 거절. 원시 unsafe 제안은 response_not_normalized. 이미 정규화된 서비스 응답의 기계 match도 providerRawStatus=unobserved 유지 |
| 예외 출력 비노출 | 1 | 잘못된 case/evidence 예외는 고정 문구만 반환. canary 원문은 오류 출력에 없음 |

초기 reviewer harness는 매처가 TypeScript resolution hook을 등록하기 전에 policy parser를 정적 import하여 `ERR_MODULE_NOT_FOUND`로 종료했다(검사 0개, exit 1). reviewer harness에서 해당 import를 매처 로딩 뒤 dynamic import로 바꾼 후 47개를 실행했다. 앱/매처/기대값 수정은 없었으며 이 준비 실패를 제품 결함으로 분류하지 않는다. Node의 MODULE_TYPELESS_PACKAGE_JSON 경고는 관측됐고 성공 판정과 별도로 남긴다.

### 판정 경계

- `scripts/eval-response.mjs:62`~67은 **실제 앞 응답의 질문**, 초기 문장, 누적 답변과 같은 conversation/generation을 대조한다. 단순히 준비된 고정 질문을 사용하는 구현이 아니다. 3turn의 첫 질문과 마지막 질문을 각각 바꾼 반례가 모두 거절됐다.
- :86~90은 recall 진단과 허용 status/SKU/kind의 기계 판정을 분리한다. 후보 원문/질문/semanticChecks의 의미는 자동 판정하지 않는다.
- :96~99는 파서가 다시 안전 정규화해야 하는 wire tuple을 거절하고, 전체 tuple 대안 중 하나만 허용한다. 전체 대안의 일부 필드끼리 섞인 인공 응답은 실패했다. SKU 집합만 순서 무관이며 history/turn 순서는 유지됐다.
- :103~106에서 아무 응답 없음·정상 clarify 이후 후속 미수행은 incomplete, 이미 관측된 잘못된 응답은 mismatch다. 앞선 잘못된 terminal 응답 뒤에 정상 최종 응답을 붙여도 실패가 지워지지 않았다.
- 안전 정규화 **이전** 모델 payload는 이 함수의 입력이 아니다. 이미 서버에서 안전 정규화된 clarify 응답은 서비스 기준 match가 가능하며, 이를 원래 모델 정답으로 해석하면 안 된다. providerRawStatus=unobserved가 이 한계를 정확히 표시한다. 후속 실행기는 raw-model 오류/서비스 차단 지표를 별도 보존해야 한다.
- 의도적으로 잘못된 성공 주장 message를 넣어도 기계 match는 가능하지만 semanticStatus=pending, qualityStatus=not_evaluated가 유지됐다. 이 결과를 전체 case 성공·최종 품질 분자에 바로 넣으면 안 된다.
- 초기 자체 fixture의 `unrequested`는 실제 enum 밖이다. 현재 `all` 대안은 허용 enum이고 정상 대안/혼합 거절 검사를 유지한다. 독립 검사에서도 `unrequested`는 invalid_response였다. 이 변경을 생산 기대값 완화로 볼 근거는 없다.

정상 고객 정정 완료, 정상 경영주 선택/복원/정책 인계, 정책 제안과 동등 SKU 집합 순서는 계속 성공한다. 모든 요청 거절·대안 삭제·정답 축소로 반례를 통과시킨 흔적은 이번 범위에서 발견하지 못했다. 제품 동의·예산·48시간 규칙이나 원래 정상 기능은 수정하지 않았다.

## 한계와 인계

이번 판정은 위 hash에서 수행한 유한 인공 단위 검사와 코드 검토다. 공개/보호 자료의 라벨·의미상 family·coverage·전체 분모는 감사하지 않았다. 실제 HTTP provenance, provider 원시 출력, semantic grading, model baseline, token/cost 합계, latency, 거래 상태, 브라우저, CI/배포는 미실행이며 이 PASS에 포함되지 않는다. 다른 파일에서 진행 중인 main의 package/quality/README/context fingerprint 변경은 검토하지 않았다.

현재 매처에 요구할 수정 사항은 없다. 조정자는 이 hash와 독립 결과를 EVAL-02에 연결하고, 별도 자료 감사 및 후속 실행기의 원시 모델/서비스/semantic 분리·전체 case 분모/미실행 처리를 진행한다. 대상 또는 파서/catalog가 바뀌면 영향 범위의 검토는 stale로 갱신해야 한다.

## 재현 가능한 독립 harness

다음 블록은 이번에 실행한 인공 입력 전체다. 평가 corpus나 private fixture를 사용하지 않으며 출력은 고정 검사 ID·집계뿐이다. 저장소 루트에서 아래 명령은 이 문서의 마지막 JavaScript 블록만 메모리에서 실행한다. 별도 파일 쓰기·모델 호출은 없다.

```sh
/Users/gsr/.nvm/versions/node/v24.12.0/bin/node --input-type=module <<'RUN_REVIEW'
import { readFileSync } from 'node:fs';
const text = readFileSync('docs/reviews/eval-02-response.md', 'utf8');
const source = text.match(/(?:^|\n)```javascript\n([\s\S]*?)\n```/)[1];
await import('data:text/javascript,' + encodeURIComponent(source.replaceAll("'./scripts/", "'" + new URL('./scripts/', import.meta.url).href).replaceAll("'./lib/", "'" + new URL('./lib/', import.meta.url).href)));
RUN_REVIEW
```

<!-- independent-harness -->
```javascript
import { readFileSync } from 'node:fs';
import { matchCaseResponses as match } from './scripts/eval-response.mjs';
const { parsePolicyOutput } = await import('./lib/assistant/policy-contracts.ts');
const cat = JSON.parse(readFileSync('data/catalog.json','utf8'));
const cp = structuredClone, ids = cat.map(p=>p.id);
let pass=0, fail=0;
const check=(id,fn)=>{try{if(!fn())throw Error();pass++;console.log('PASS '+id);}catch{fail++;console.log('FAIL '+id);}};
const c={id:'REVIEW-C',split:'dev',group:'REVIEW-G',scenarioId:'REVIEW-S',researchCaseIds:['CORE-03'],origin:'synthetic_expansion',riskTags:['correction'],slice:'correction',normalCompletion:true,service:'search',context:{},rationale:'독립 대조기 검토 전용 인공 사례이며 평가 원자료가 아니다.',steps:[]};
const oracle=status=>({status:[status],allowedCandidateIds:['milk','coffee'],requiredCandidateIds:status==='matched'?['milk']:[],allowedKinds:['exact'],maxCandidates:3});
c.steps=['검토 처음 조건','검토 첫 번째 정정','검토 최종 정정'].map((text,i)=>({text,expect:oracle(i===2?'matched':'clarify'),semanticChecks:['정정 조건과 앞선 질문을 보존한다.']}));
const env=req=>({ok:true,id:req.id,generation:req.generation,mode:'live',model:'synthetic-review',usage:{inputTokens:1,outputTokens:1}});
const candidate=(id,kind='exact')=>({productId:id,kind,reason:'인공 근거',catalogEvidence:[{code:id+':name',value:cat.find(p=>p.id===id).name}]});
const sr=(req,status,skus=[])=>({...env(req),status,candidateIds:skus,message:'인공 응답',dialogue:{conversationId:req.dialogue.conversationId,question:status==='clarify'?'실제 합성 질문 '+req.id:null,clues:[],candidates:skus.map(id=>candidate(id))}});
function conv(){const out=[];for(let i=0;i<3;i++){const request={id:'review-'+i,generation:9,text:c.steps[i].text,dialogue:{conversationId:'review-chat',initialText:c.steps[0].text,turns:out.map((p,j)=>({question:p.response.dialogue.question,answer:c.steps[j+1].text}))}};out.push({request,response:sr(request,i===2?'matched':'clarify',i===2?['milk']:[])});}return out;}
const status=(case_,pairs)=>match(case_,pairs).mechanicalStatus;
check('C01_three_turn_normal',()=>status(c,conv())==='match');
check('C02_zero_steps_incomplete',()=>status(c,[])==='incomplete');
check('C03_one_step_incomplete',()=>status(c,conv().slice(0,1))==='incomplete');
check('C04_two_steps_incomplete',()=>status(c,conv().slice(0,2))==='incomplete');
for(const [name,mut,idx,want] of [
 ['old_question',p=>p[2].request.dialogue.turns[0].question='발명된 앞 질문',2,'request_mismatch'],
 ['last_question',p=>p[2].request.dialogue.turns[1].question='발명된 끝 질문',2,'request_mismatch'],
 ['old_answer',p=>p[2].request.dialogue.turns[0].answer='바뀐 이전 답',2,'request_mismatch'],
 ['initial_text',p=>p[2].request.dialogue.initialText='교체된 시작',2,'request_mismatch'],
 ['turn_order',p=>p[2].request.dialogue.turns.reverse(),2,'request_mismatch'],
 ['lost_history',p=>p[2].request.dialogue.turns.shift(),2,'request_mismatch'],
 ['conversation',p=>{p[2].request.dialogue.conversationId='other';p[2].response.dialogue.conversationId='other';},2,'request_mismatch'],
 ['generation',p=>{p[2].request.generation++;p[2].response.generation++;},2,'request_mismatch'],
 ['wire_id',p=>p[2].response.id='cross-request',2,'invalid_response'],
 ['wire_generation',p=>p[2].response.generation++,2,'invalid_response'],
 ['candidate_order',p=>{p[2].response=sr(p[2].request,'matched',['milk','coffee']);p[2].response.dialogue.candidates.reverse();},2,'invalid_response'],
 ['fictional_sku',p=>{p[2].response.candidateIds=['review-fiction'];p[2].response.dialogue.candidates[0].productId='review-fiction';},2,'invalid_response'],
 ['wrong_kind',p=>p[2].response.dialogue.candidates[0].kind='alternative',2,'oracle_mismatch'],
 ['missing_required',p=>p[2].response=sr(p[2].request,'matched',['coffee']),2,'oracle_mismatch'],
 ['null_response',p=>p[1].response=null,1,'invalid_response'],
 ['error_envelope',p=>p[1].response={ok:false,error:{code:'MODEL_INCOMPLETE',message:'synthetic'}},1,'invalid_response']
])check('C_mut_'+name,()=>{const p=conv();mut(p);const r=match(c,p);return r.mechanicalStatus==='mismatch'&&r.steps[idx].status===want;});
check('C05_actual_new_question_preserved',()=>{const p=conv();p[0].response.dialogue.question='새로 나온 합성 질문';p[1].request.dialogue.turns[0].question=p[0].response.dialogue.question;p[2].request.dialogue.turns[0].question=p[0].response.dialogue.question;return status(c,p)==='match';});
check('C06_early_terminal_not_repaired',()=>{const p=conv();p[0].response=sr(p[0].request,'matched',['milk']);const r=match(c,p);return r.mechanicalStatus==='mismatch'&&r.steps.slice(1).every(s=>!s.responseParsed);});
check('C07_semantics_remain_pending',()=>{const p=conv();p[2].response.message='실제 결제를 완료했습니다';const r=match(c,p);return r.mechanicalStatus==='match'&&r.semanticStatus==='pending'&&r.providerRawStatus==='unobserved'&&r.qualityStatus==='not_evaluated';});
check('C08_no_input_mutation',()=>{const p=conv(),before=JSON.stringify([c,p]);match(c,p);return JSON.stringify([c,p])===before;});
const policy={enabled:false,productIds:['milk'],budgetWon:80000,version:4,spentWon:6000};
const fields={action:'select',scope:'current_batch',view:'requested',selection:'include',productIds:['milk'],budgetWon:20000,restoreSelectionChangeId:null,restoreBudgetChangeId:null,policyDraft:null};
const m={...cp(c),id:'REVIEW-M',riskTags:['context'],slice:'clear',service:'merchant',context:{storeId:'demo-central',budgetWon:50000,selectedProductIds:['milk'],context:{uiSeq:2,changes:[{id:'change-one',seq:1,addedProductIds:[],removedProductIds:['coffee'],beforeBudgetWon:60000,afterBudgetWon:50000},{id:'change-two',seq:2,addedProductIds:[],removedProductIds:[],beforeBudgetWon:50000,afterBudgetWon:40000}],pendingProductIds:['milk','coffee'],currentPolicy:policy}},steps:[{text:'이번 묶음에 선택과 예산 변경',expect:{fields,alternatives:[{...fields,productIds:['coffee'],budgetWon:30000}]},semanticChecks:['이번 선택과 예산만 수정한다.']}]};
function mp(case_=m,tuple=case_.steps[0].expect.fields){const request={...cp(case_.context),text:case_.steps[0].text,id:'review-merchant',generation:9};return {request,response:{...env(request),...cp(tuple),message:'합성 응답',storeId:request.storeId,...(case_.service==='policy'?{policyVersion:request.currentPolicy.version}:{uiSeq:request.context.uiSeq})}};}
check('M01_tuple_primary',()=>status(m,[mp()])==='match');
check('M02_tuple_alternative',()=>status(m,[mp(m,m.steps[0].expect.alternatives[0])])==='match');
check('M03_tuple_mix_A',()=>{const p=mp();p.response.budgetWon=30000;return status(m,[p])==='mismatch';});
check('M04_tuple_mix_B',()=>{const p=mp();p.response.productIds=['coffee'];return status(m,[p])==='mismatch';});
for(const [name,mut,want] of [
 ['store',p=>p.response.storeId='demo-neighborhood','invalid_response'],
 ['ui_seq',p=>p.response.uiSeq++,'invalid_response'],
 ['policy_version',p=>p.request.context.currentPolicy.version++,'request_mismatch'],
 ['policy_spent',p=>p.request.context.currentPolicy.spentWon++,'request_mismatch'],
 ['history_reorder',p=>p.request.context.changes.reverse(),'request_mismatch'],
 ['history_content',p=>p.request.context.changes[0].beforeBudgetWon++,'request_mismatch'],
 ['selected',p=>p.request.selectedProductIds=['coffee'],'request_mismatch'],
 ['pending',p=>p.request.context.pendingProductIds=['milk'],'request_mismatch'],
 ['invalid_enum',p=>p.response.view='unrequested','invalid_response']
])check('M_mut_'+name,()=>{const p=mp();mut(p);return match(m,[p]).steps[0].status===want;});
check('M05_restore_normalized',()=>{const x=cp(m);delete x.steps[0].expect.alternatives;Object.assign(x.steps[0].expect.fields,{productIds:['milk','coffee'],budgetWon:60000,restoreSelectionChangeId:'change-one',restoreBudgetChangeId:'change-one'});return status(x,[mp(x)])==='match';});
check('M06_set_order_preserved',()=>{const x=cp(m);delete x.steps[0].expect.alternatives;x.steps[0].expect.fields.productIds=['milk','coffee'];const p=mp(x);p.response.productIds.reverse();p.request.context.pendingProductIds.reverse();return status(x,[p])==='match';});
check('M07_normalized_policy_handoff',()=>{const x=cp(m);delete x.steps[0].expect.alternatives;Object.assign(x.steps[0].expect.fields,{action:'policy',scope:'future_policy',selection:'keep',productIds:[],budgetWon:null,policyDraft:{action:'propose',enabled:true,productIds:['milk'],budgetWon:90000}});const p=mp(x);p.response.policyDraft.message='지속 정책 제안';return status(x,[p])==='match';});
const pol={...cp(m),service:'policy',context:{storeId:'demo-central',currentPolicy:policy},steps:[{text:'앞으로 예산 조정',expect:{fields:{action:'propose',enabled:null,productIds:null,budgetWon:90000},alternatives:[{action:'propose',enabled:true,productIds:['coffee'],budgetWon:100000}]},semanticChecks:['정책 제안만 반환한다.']}]};
check('P01_normal_policy',()=>status(pol,[mp(pol)])==='match');
check('P02_alternative_policy',()=>status(pol,[mp(pol,pol.steps[0].expect.alternatives[0])])==='match');
check('P03_mixed_policy_tuple',()=>{const p=mp(pol);p.response.enabled=true;return match(pol,[p]).steps[0].status==='oracle_mismatch';});
check('P04_policy_version_reject',()=>{const p=mp(pol);p.response.policyVersion++;return match(pol,[p]).steps[0].status==='invalid_response';});
const safe=cp(pol);safe.slice='ambiguous';safe.normalCompletion=false;safe.steps[0].expect={fields:{action:'clarify',enabled:null,productIds:null,budgetWon:null}};
check('P05_raw_unsafe_not_correct',()=>{const p=mp(safe);p.response.action='propose';p.response.budgetWon=1;return match(safe,[p]).steps[0].status==='response_not_normalized';});
check('P06_service_normalization_not_provider_success',()=>{const p=mp(safe);Object.assign(p.response,parsePolicyOutput({action:'propose',enabled:null,productIds:null,budgetWon:1,message:'인공 응답'},ids,policy));const r=match(safe,[p]);return r.mechanicalStatus==='match'&&r.providerRawStatus==='unobserved'&&r.semanticStatus==='pending';});
check('X01_errors_redacted',()=>{const marker='REVIEW_PRIVATE_'+'SENTINEL';let messages=[];const bad=cp(c);bad.steps[0].expect.allowedCandidateIds=[marker];for(const fn of [()=>match(bad,[]),()=>match(c,[{request:marker,response:marker,extra:marker}])]){try{fn();return false;}catch(e){messages.push(e.message);}}return messages.join('|')==='Invalid evaluation case|Invalid response evidence'&&!messages.join('|').includes(marker);});
console.log(JSON.stringify({runtime:process.version,independentChecks:pass+fail,pass,fail,providerCalls:0,authoredCasesRead:0}));
process.exitCode=fail?1:0;
```
