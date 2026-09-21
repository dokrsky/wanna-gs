# EVAL-01 검증기 독립 코드·자료 계약 검토

2026-09-22 KST. 범위: 현재 `scripts/eval-dataset.mjs`와 `.check.mjs`의 offline 검증 계약. 판정 **FAIL — P1 1건, P2 5건 미해결**. 기존 자체검사 42개는 독립 재실행에서도 PASS지만 아래 계약 반례를 검출하지 못한다. 실제 평가셋·모델 품질·holdout·G1~G6 판정이 아니다.

## ACK·목적 보존·소유권

- `consumed_context_hash`: `15b4184e12744ba85d7da2d0667ddd72af10253fef23d29c16602d2dc035a21c`. `shasum -a 256 docs/context/EVAL-01.md` 실제값과 사용자 요청값 일치, revision1 ACK.
- ADR-002 adopted revision2 실제 SHA256: `48841b2f3e06881486636b1492c9198044a0e2ff91704a2ca2bf7c09837967a2`.
- card, CORE, DECISION_INDEX, 관련 D-44/45/46, ADR-002 revision2, docs 09/13/14/20/21/23/24, 시작 문서와 현재 PROGRESS, verify·ponytail 스킬을 확인했다. CORE-03/05/11/21/22/23/25/26 및 AC-01/02/03/07/08/23/24/26/28을 지탱하는 검증기만 대상으로 한다.
- 고객의 정상 상품 식별·정정과 미식별/거절, 경영주의 정상 묶음/정책 명령을 분리해 측정할 수 있어야 한다. 정상 요청을 모두 거절하거나 정상 match로 거절 slice를 채워 얻는 성적은 목적을 보존하지 않는다.
- reviewer는 구현자·curator와 별도 역할이다. 추가 agent를 만들지 않았다. verify에 따라 직접 반례/실제 API 정규화를 대조했고, ponytail에 따라 설치된 Node와 표준 assert, 메모리 합성 입력만 사용했다.
- 변경 소유 파일은 **이 보고서 하나**다. 앱/검증기/자료/README/package/registry/fingerprint/PROGRESS를 수정하지 않았다. PROGRESS 동기화와 수정·재검증은 main 인계 대상이다.

## 검토 fingerprint

검토 시작과 반례 실행 뒤 확인한 두 대상 파일 hash는 같았다. Git 명령을 실행하지 않았으므로 HEAD/branch를 독립 확인했다고 주장하지 않는다.

| 파일 | SHA256 |
|---|---|
| `scripts/eval-dataset.mjs` | `5168896229f38b09d6dab11f62abe19b6c36599f51e73bb84a44b56913b9d421` |
| `scripts/eval-dataset.check.mjs` | `69fae47aba86cd6125680211e735d4b6e03f25864d6b1b9310767530dc77c316` |
| `lib/assistant/dialogue-contracts.ts` | `1d7e48b400621ea5df32c6d77a4add012f4bcca62e6d3d61c083576a131f1e68` |
| `lib/assistant/merchant-context-contracts.ts` | `62b2385ead0e86daa417ac8da9f3100f25b9cb973e53b5cf6074b72b64e3b169` |
| `lib/assistant/policy-contracts.ts` | `a47374ec8fa771ff32191157767aa7536850961a74a64f7b3ffab5594d516e18` |
| `data/catalog.json` | `2841a3bb812bff687bf128f4db8e428bd3194767fd02613ee3d11b59911db10e` |
| `data/stores.json` | `e6f39a73cafc5738f00a505a663d66550f234aef6a669cf7ecf3d9ef5ba93fd2` |

## 발견 사항

### F1 · P1 — unknown/refusal slice에 matched 정답을 허용해 coverage를 잘못 승인

위치: `scripts/eval-dataset.mjs:69`, `:75`, `:118`.

고객의 마지막 status는 `normalCompletion:true`일 때만 matched인지 확인한다. 따라서 `slice:"unknown"` 또는 `"refusal"`, `normalCompletion:false`인데 `expect.status:["matched"]`, 필수 SKU `milk`인 사례가 통과하고 각각 미식별·거절 분모로 집계된다. 문자열 의미 판정이 없어도 검출할 수 있는 구조적 모순이다.

독립 메모리 반례로 dev180/validation60을 만들고 모든 정답을 matched로 유지했다. validation에서 clear36/correction6/ambiguous6/unknown6/refusal6, normal42, 모든 risk tag60으로 선언했을 때 실제 반환은 `coverageReady:true`, unknown6/refusal6이었다. clear 최소성공35와 risk 최소성공51의 산술은 맞지만 분모에 해당하는 행동이 없다. 합성 숫자는 검증기 반례이며 실제 corpus나 품질 성적이 아니다.

수정: 고객 slice와 마지막 허용 status의 모순을 거절하고, unknown/refusal이 정상 SKU match를 정답으로 받아들이지 못하게 한다. clear·정정 후 정상 match와 진짜 unknown/unsupported의 양쪽 정상 입력을 보존하며 위 전부-matched 반례를 추가한다. ambiguous/단일 발화 correction의 의미 범위는 명시적 계약에 맞춰 처리한다. 단일 발화 correction이 수락된다는 관측만으로 별도 결함을 판정하지는 않았다.

### F2 · P2 — 실제 API가 만들 수 없는 세 번째 turn의 clarify 정답이 통과

위치: `scripts/eval-dataset.mjs:61`, `:74`.

3개 step 모두 `status:["clarify"]`, `slice:"ambiguous"`, `normalCompletion:false`인 합성 대화가 통과한다. 마지막 step에는 질문/turn 상한 검사가 없다. 반면 `lib/assistant/dialogue-contracts.ts:97`은 이미 두 답변이 있는 요청의 clarify 응답을 `MODEL_MALFORMED`로 거절한다. 같은 요청으로 실제 `parseDialogueModelOutput`도 세 번째 질문을 `unknown`/`question:null`로 정규화함을 독립 실행했다(후보가 있으면 matched로 정규화하는 코드 경로).

수정: 고객 oracle을 최종 브라우저 API 계약에 맞춰 검증하고 세 번째 turn에서 clarify를 허용하지 않는다. 1·2번째 clarify와 세 번째 정상 matched/unknown은 유지한다. 현재 파서는 입력만 호출하므로 고객 응답 계약과의 동등성을 보증하지 않는다.

### F3 · P2 — lineage는 ID 문법만 검사하며 실제 참조 무결성을 검사하지 않음

위치: `scripts/eval-dataset.mjs:45`, `:47`.

`scenarioId:"REVIEW-NONEXISTENT-SCENARIO"`, `researchCaseIds:["REVIEW-NONEXISTENT-RESEARCH","CORE-99999"]`가 통과한다. 공개 `data/scenarios.json`, `docs/research`, CORE 원장에서 세 식별자를 검색해 일치가 없음을 확인했다. `RC01`과 `SC-DATA-01`은 각각 공개 연구 표와 scenario 자료에 실제로 존재하는 정상 대조 입력이다.

EVAL-01은 researchCaseIds를 실제 현재 연구 ID 또는 유효 CORE로 요구한다. 이 두 가짜 참조가 통과하는 점이 확정 결함이다. scenarioId의 경우 EVAL-01 기계 계약은 안정 ASCII 식별자를 명시하므로, 새로운 합성 시나리오 ID가 기존 seed `data/scenarios.json`에 없다는 이유만으로 결함이라고 판정하지 않는다. 다만 현재 도구가 scenario 참조/파생 관계까지 검사한다는 주장은 할 수 없다. catalog/store FK가 검사된다는 사실을 연구·scenario FK 검사까지 확대하면 안 된다.

수정: 기존 공개 연구 원장에 대한 식별자 allowlist/FK를 적용하고 CORE 예외도 현재 CORE ID 집합으로 검사한다. 새 원장을 중복 구축할 필요는 없다. scenario는 curator/main이 선언한 현재 평가용 시나리오 계약과 연결하고, seed 시나리오만을 임의의 허용 목록으로 강제하지 않는다. 의미상 파생 관계 검토는 별도로 남긴다.

### F4 · P2 — 덮어쓰는 context 필드를 허용해 동일 API 입력의 중복을 우회

위치: `scripts/eval-dataset.mjs:59`, `:82`, `:106`.

merchant/policy context는 계약상 text/id/generation을 제외해야 하지만 정확한 context 키를 검사하지 않는다. `context.text`, `context.id`, `context.generation`에 임의 값을 넣어도 spread 다음에 덮어써져 API 입력 검사에 통과한다. 중복 key는 덮어쓰기 전 원래 context를 사용한다.

같은 merchant 예산 명령을 복제해 ID/group/split만 바꾸고 두 번째 사례에 `context.text:"ignored"`를 넣으면 dev와 validation 양쪽에 통과한다. 실제 API text/상태/정답은 같지만 숨은 비작동 필드로 중복 검사를 우회한다.

수정: service별 context의 정확한 키를 검사해 예약 필드를 거절한다. 중복 비교에는 실제 유효 API context만 사용한다. 정상 merchant/policy 입력과 이 세 예약 필드 반례를 함께 확인한다.

### F5 · P2 — SKU 집합의 배열 순서만 바꾸면 같은 상태를 다른 family로 인정

위치: `scripts/eval-dataset.mjs:36`, `:106`.

canonical은 object 키만 정렬하고 array 순서를 그대로 보존한다. merchant의 같은 두 SKU를 `selectedProductIds`, `pendingProductIds`, `currentPolicy.productIds`에 넣고 순서만 뒤집은 뒤 ID/group/split을 바꾸면 동일 문장·예산 명령이 dev와 validation에 모두 통과한다.

실제 merchant/policy 계약은 해당 SKU 배열을 `sameIds`로 집합 비교하고, merchant proposal fingerprint도 selected/pending ID를 정렬한다. 따라서 이 반례는 추측한 의미상 패러프레이즈가 아니라 실제 계약상 같은 상태다.

수정: SKU 집합 필드만 canonical 정렬한다. 시간순 changes와 dialogue steps까지 정렬하면 의미를 잃으므로 순서가 의미 있는 배열은 그대로 유지한다. 원래 object-key 재배열 중복 검사는 이미 통과한다.

### F6 · P2 — 문장 정규화가 소수점을 지워 서로 다른 예산 명령을 중복으로 거절

위치: `scripts/eval-dataset.mjs:33`, `:106`.

동일 merchant context에서 `이번 예산 1.5만원`(oracle15000)과 `이번 예산 15만원`(oracle150000)은 서로 다른 정상 사례인데, 현재 정규화가 모든 punctuation/symbol을 없애 둘 다 같은 key로 만들고 `duplicate normalized conversation/context`로 거절한다. 두 label 자체는 API 계약에 맞는다.

수정: 숫자 소수점·부호 등 의미를 바꾸는 문자를 보존한다. 띄어쓰기/NFKC 같은 명확한 표현 변형의 중복 검출과 1.5/15 구별을 함께 회귀 확인한다. 평가셋에서 정상 사례를 삭제해 피하지 않는다.

## 실제 실행 명령·결과

실행 시작은 2026-09-21 17:03:10 UTC(09-22 02:03:10 KST) 이후이며, 요청한 6분 이내의 좁은 검토다. 명령 출력은 이 task의 도구 기록에 있고 결과를 아래 보존한다. 별도 artifact/log 파일은 만들거나 읽지 않았다.

1. `pwd`, `shasum -a 256 docs/context/EVAL-01.md` 및 위 fingerprint 대상 hash 확인: 경로·hash ACK 일치.
2. 최초 `node --version && node scripts/eval-dataset.check.mjs`: PATH의 Node **v20.11.0**, 종료1, `registerHooks` export 부재. 선언된 Node24 대상 코드 결함으로 분류하지 않았다. 설치 경로를 읽기만 하고 runtime을 바꾸거나 설치하지 않았다.
3. `/Users/gsr/.nvm/versions/node/v24.12.0/bin/node scripts/eval-dataset.check.mjs`: 종료0, **42 counterexamples PASS**. module type 경고는 발생했으나 테스트 실패는 아니다.
4. 같은 Node24의 `--input-type=module` stdin 명령으로 `inspectPack`, `inspectFiles`, `evalVersion`, `riskTags`, `catalogIds`를 import하고 `node:assert/strict`로 독립 메모리 검사를 실행: 종료0, **정상 방어 CHECK13 / 문제 동작 BUG REPRODUCED11**. 11은 독립 결함 수나 앱 테스트 suite 수가 아니라 위 6개 항목에 연결되는 실행 관측 수다.
5. 두 번째 Node24 stdin 명령에서 실제 dialogue request/response/model-output parser를 import: 세 번째 clarify는 실제 응답 parser에서 `MODEL_MALFORMED`, 모델 출력 parser에서 unknown/null question. 합성 holdout 객체의 5개 malformed 입력에 대해 오류 원문 canary 비노출 확인. Node 명령은 성공했으며 뒤이어 실행한 `rg -n 'REVIEW-NONEXISTENT-SCENARIO|REVIEW-NONEXISTENT-RESEARCH|CORE-99999' docs/research data/scenarios.json docs/CORE_REQUIREMENTS.md`는 예상대로 무일치 종료1이었다.
6. 보고서의 아래 shell snippet에서 Node 본문을 메모리로 추출해 동일 Node24 `execFileSync(..., ['--input-type=module'], {input:source})`로 실행: 종료0, `현재 결함 F1~F6 재현; 품질 PASS 아님`. 17:08:08 UTC까지 기록된 재현이며 6분 제한 이내다. 이후 문구 정리 외 추가 실행 없음.

CHECK13은 empty/missing pack, validation0 불완료, 필수 필드 누락, 중복 ID, 같은 group의 split 누수, NFKC/공백 중복, public의 holdout split 거절, 합성 canary 집계/오류 비노출, 추가 phase/passed 거절, 없는 공개 파일의 sanitized 오류, 정상 merchant 예산 label, 잘못된 점포 sanitized 오류, 없는 복원 참조 거절이다.

대표 재현은 아래처럼 **메모리 전용**이다. 기존 selftest와 독립 검사에서 실제 사용한 merchant fixture의 최소 형태를 포함했다. 자료를 생성·저장하거나 보호 파일을 읽지 않는다.

```sh
/Users/gsr/.nvm/versions/node/v24.12.0/bin/node --input-type=module <<'NODE'
import assert from 'node:assert/strict';
import {inspectPack, evalVersion, riskTags, catalogIds} from './scripts/eval-dataset.mjs';
const cp = structuredClone;
const c = {id:'R-C',split:'dev',group:'R-G',scenarioId:'SC-DATA-01',
 researchCaseIds:['RC01'],origin:'synthetic_expansion',riskTags:['identity'],
 slice:'clear',normalCompletion:true,service:'search',context:{},
 steps:[{text:'검증기 합성 우유',expect:{status:['matched'],allowedCandidateIds:['milk'],
 requiredCandidateIds:['milk'],allowedKinds:['exact'],maxCandidates:3},
 semanticChecks:['검사기 합성 사례이며 실제 품질 증거가 아니다.']}],
 rationale:'검사기 독립 반례이며 실제 평가셋이나 품질 결과가 아니다.'};
const pack=(cases,role='customer')=>({version:1,evalVersion,role,cases});
const allMatched=['dev','validation'].flatMap(split=>Array.from(
 {length:split==='dev'?180:60},(_,i)=>{const x=cp(c);x.id=split+i;x.group=split+'G'+i;
 x.split=split;x.steps[0].text+=split+i;x.riskTags=[...riskTags.customer];
 x.slice=['clear','clear','clear','clear','clear','clear','correction','ambiguous','unknown','refusal'][i%10];
 x.normalCompletion=['clear','correction'].includes(x.slice);return x;}));
assert.equal(inspectPack(pack(allMatched)).coverageReady,true); // F1: 현재 잘못 수락
const third=cp(c);third.slice='ambiguous';third.normalCompletion=false;
third.steps=Array.from({length:3},(_,i)=>({...cp(c.steps[0]),text:'추가 답'+i,
 expect:{...cp(c.steps[0].expect),status:['clarify'],requiredCandidateIds:[]}}));
assert.doesNotThrow(()=>inspectPack(pack([third]))); // F2
const missing=cp(c);missing.scenarioId='REVIEW-NONEXISTENT-SCENARIO';
missing.researchCaseIds=['REVIEW-NONEXISTENT-RESEARCH','CORE-99999'];
assert.doesNotThrow(()=>inspectPack(pack([missing]))); // F3
const m={...cp(c),id:'R-M',group:'R-MG',service:'merchant',riskTags:['budget'],
 context:{storeId:'DEMO-ST-01',budgetWon:50000,selectedProductIds:['milk'],context:{
 uiSeq:0,changes:[],pendingProductIds:['milk'],currentPolicy:{enabled:false,
 productIds:['milk'],budgetWon:70000,version:2,spentWon:5000}}},
 steps:[{text:'이번 예산 2만원',semanticChecks:['이번 묶음 예산만 변경한다.'],expect:{fields:{
 action:'budget',scope:'current_batch',view:'requested',selection:'keep',productIds:[],
 budgetWon:20000,restoreSelectionChangeId:null,restoreBudgetChangeId:null,policyDraft:null}}}]};
const twin=cp(m);twin.id='R-M2';twin.group='R-MG2';twin.split='validation';
twin.context.text='ignored';
assert.equal(inspectPack(pack([m,twin],'merchant')).caseCount,2); // F4
const a=cp(m),b=cp(m);b.id='R-M2';b.group='R-MG2';b.split='validation';
for(const x of [a,b]) {x.context.selectedProductIds=catalogIds.slice(0,2);
 x.context.context.pendingProductIds=catalogIds.slice(0,2);
 x.context.context.currentPolicy.productIds=catalogIds.slice(0,2);}
b.context.selectedProductIds.reverse();b.context.context.pendingProductIds.reverse();
b.context.context.currentPolicy.productIds.reverse();
assert.equal(inspectPack(pack([a,b],'merchant')).caseCount,2); // F5
const d=cp(m),e=cp(m);e.id='R-M2';e.group='R-MG2';
d.steps[0].text='이번 예산 1.5만원';d.steps[0].expect.fields.budgetWon=15000;
e.steps[0].text='이번 예산 15만원';e.steps[0].expect.fields.budgetWon=150000;
assert.throws(()=>inspectPack(pack([d,e],'merchant')),/duplicate normalized/); // F6
console.log('현재 결함 F1~F6 재현; 품질 PASS 아님');
NODE
```

## 통과한 범위와 명시적 한계

### 추가 요청 · M-V-16의 정확한 alternatives 표현

사용자 추가 요청으로 공개 `evals/merchant.json`의 **M-V-16 한 사례만 출력·검토**했다. 읽은 파일 SHA256은 `1b37be610b80289c7f8e725a5ce0890f2680b46d7edd565ee7956add4232f5e9`이며 작성 중인 curator 파일의 당시 snapshot이다. 전체 pack의 라벨·coverage를 승인하지 않는다.

발화는 “팝콘을 계속 포함할지 이번만 넣을지 아직 못 정했어. 일단 반영해줘.”이고, semanticChecks도 두 범위 중 하나를 질문하며 아무 범위도 몰래 변경하지 말 것을 요구한다. 저장된 oracle은 `action:clarify, scope:future_policy` 하나다.

Node24 stdin에서 이 공개 사례를 복제한 뒤 scope만 `future_policy`/`current_batch`로 바꾼 두 **완전한** fields 객체를 각각 `inspectPack` 및 실제 `parseMerchantContextOutput`에 통과시켰다(종료0). 둘 다 selection=keep, productIds=[], budgetWon=null, restore refs=null, policyDraft=null이고, message는 동일한 범위 확인 질문이었다. 실제 API는 두 scope 모두 무변경 clarify로 인정한다. `expect:{anyOf:[{fields:...},{fields:...}]}` 형태는 현재 `merchant oracle wrapper`로 거절됨도 확인했다.

판정: **계약 표현력의 제한 확인 / 실제 오채점 미실행**. 현재 EVAL-01 자체가 단일 fields 형식을 정했으므로 추가 형식 요구를 기존 구현 위반 F1~F6에 합산하지 않는다. 그러나 단일 fields의 strict equality로 후속 채점을 구현하면, curator가 동등하게 인정한 안전한 다른 scope의 확인 질문을 실패로 세는 위험이 있다. API에 유효하다는 사실만으로 발화의 모든 가능한 응답이 의미상 정답임을 선언하지 않으며, 최종 정답 채택·수정은 curator/main 소유다.

최소 보완안은 기존 fields를 유지하면서 **완전한 fields 객체들의 명시적 alternatives**만 추가하는 것이다. 각 대안을 기존 service API parser/정규화 검증으로 개별 검사하고, 채점은 어느 하나의 전체 tuple과 일치해야 한다. 필드별 허용값 조합·부분 필드 생략·scope 전체 무시로 완화하면 선언하지 않은 조합까지 통과하므로 사용하지 않는다. 모든 대안에 같은 concrete semanticChecks와 무변경 조건을 적용하고, nonempty/중복 대안/유효하지 않은 대안의 거절 반례를 둔다. 형식·evalVersion/manifest와 영향 사례를 main이 함께 갱신하고 실제 scoring 전에 고정한다. 이번에는 이 형식이나 자료를 수정하지 않았다.

### 검토 경계

- public CLI는 role만 받고 임의 private 파일 인자를 받지 않는다. 실제 import 경로는 browser-safe 계약과 공개 catalog/store다. 반환값은 aggregate이며 case 원문/정답/group을 포함하지 않는다. 오류에는 case index와 고정 메시지/API code가 남고, 검사한 synthetic canary는 누출되지 않았다. **실제 보호 원문·파일 보안·접근 통제 전수 검사 결과는 아니다.**
- empty/missing/zero 필수 slice가 `coverageReady:true`로 바뀌지 않았고, 선언된 분모의 ceil95/90/85% 산술과 한 대화의 case/turn 구분은 기존42·독립 반례에서 맞았다. F1처럼 선언 자체가 모순될 때 coverage 신뢰성은 별도 실패다.
- 명시된 같은 group의 split 누수와 단순 canonical object-key 중복은 거절한다. 의미상 family 전체 분리, 공개 smoke family의 dev 전용 여부, private와 public 사이의 실제 누수는 이번에 검증하지 않았다. F4/F5는 그보다 좁은 기계적 중복 결함이다.
- merchant/policy는 실제 입력/출력 parser와 정규화 전후 비교를 재사용해 외부 SKU/점포, 불가능한 복원, 사용액 이하 policy 등 자체검사 반례를 거절한다. 정답의 언어적 타당성·최종 거래/UI 안전은 이 검사만으로 확인되지 않는다.
- public customer pack과 holdout summary는 읽지 않았다. merchant 공개 JSON은 추가 요청의 M-V-16을 선택하기 위해 파싱했고 출력·라벨 검토는 해당 한 사례에 한정했다. **어떠한 artifacts/private 또는 protected holdout 파일에도 접근하지 않았다.** 합성 메모리 객체에 `split:"holdout"`를 붙인 경계 검사는 보호 데이터 검사와 다르다. 공개 summary도 보호 원문 검증 증거가 될 수 없다.
- network/model/환경변수·키/Git/PR/browser 명령0. 전체23/24 suite와 build 재실행0. source/data 쓰기0, 보고서만 apply_patch로 작성. main의 병행 README/package/registry/fingerprint 변경은 이 보고서의 승인 범위가 아니다.
- 다음 행동: main이 F1~F6의 검증기·반례를 수정한 뒤 새 hash로 영향 범위만 독립 재검증한다. curator는 공개 pack의 원본 정답·family/lineage를 소유하며 이번 결과가 curator 자료의 결함이나 수정 완료를 뜻하지 않는다. 수정 전 이 hash의 검증기로 자료 계약 완료를 승인하지 않는다.

---

## 2026-09-22 revision2 독립 재검증 — 최신 판정

**PASS — 아래 특정 hash에서 F1~F6 해소, 이번 좁은 검토의 미해결/신규 P1·P2 없음.** 위 최초 FAIL·반례·당시 hash는 변경 없이 보존한다. v1을 소급 PASS로 바꾸지 않으며, 이 판정은 검증기의 수정 및 인접 정상 계약만을 대상으로 한다.

### revision2 ACK와 실제 fingerprint

시작: 2026-09-21 17:12:04 UTC(09-22 02:12:04 KST). 반례·정상 검사와 마지막 대상 hash 대조는 17:13:51 UTC까지 수행했다. 사용자 지정 6분 이내의 검토이며, 마지막에는 이 보고서만 추가 작성했다.

| 입력 | 실제 SHA256·ACK |
|---|---|
| `docs/context/EVAL-01.md` revision2 | `c9ad2d925058cf7b01f7c1d0359095316b36eeb9d656030ea33245e7cf766cf0` — 요청값 일치, `consumed_context_hash`로 ACK |
| `scripts/eval-dataset.mjs` | `9c62ee23198c633cda05c6366b22fa209e092c08c2698987c19daa64cc1fb98d` — 시작/마지막 값 일치 |
| `scripts/eval-dataset.check.mjs` | `98cda43dfa29d521ad6e8281bb463508a0deebb69c82dcd144721005461e3cba` — 시작/마지막 값 일치 |
| evalVersion | `EVAL-01-20260922-v2`; JSON pack의 version은 1 |
| `docs/CORE_REQUIREMENTS.md` | `65c7541d3549bf49b715da687aa5af060fce9a48e774a4130d9ac350349d8114` |
| 공개 연구 Markdown 의존성 | 9파일. 경로를 정렬한 `{path,sha256}` 배열의 `JSON.stringify` SHA256: `53ed031fd588f3954f2603f26946109108dba5566b127c638703101441c475d6` — 종료 시점 보조 fingerprint |

card와 관련 CORE/유효 DECISION_INDEX를 재확인했다. ADR-002 revision2, dialogue/merchant-context/policy 계약 및 catalog/stores의 실제 hash도 위 최초 검토 표와 같음을 재확인했다. 이전에 직접 읽은 verify·ponytail 스킬을 적용해 원래 반례의 결과 반전, 정상 동작 보존, 의미 검증과 형식 검증의 경계를 확인했다. 자료 revision 변경은 출시 기준/동의/48시간/모델 설정 변경이 아니다.

### F1~F6의 독립 재검증

이 보고서에 남겨 둔 **최초 독립 재현 코드의 입력을 그대로** 사용했다. 코드 본문을 메모리로 추출하고 6개의 assert 기대 결과만 새 계약에 맞게 바꿔 Node24에서 실행했다. 구현자의 새 selftest fixture만으로 수정 여부를 판정하지 않았다.

| 항목 | 실제 결과 | 인접 정상·경계 확인 |
|---|---|---|
| F1 | 모든 status가 matched인데 unknown/refusal/ambiguous를 선언한 과거 합성 bulk는 `slice/final status contradiction`으로 거절 | 5개 slice×4개 단일 status 조합을 검사. clear/correction→matched, unknown→unknown, refusal→unsupported, ambiguous→clarify/unknown만 수락. 올바른 합성240개의 coverage/분모/ceil은 유지 |
| F2 | 과거 세 번째 clarify가 `third-step clarification forbidden by API`로 거절 | 1/2/3 step×matched/unknown/clarify의 9조합에서 허용된 입력은 유지하고 세 번째 clarify만 거절. 한 대화=1case, plannedTurns=실제 step 수 |
| F3 | 과거 가짜 연구/CORE 참조가 `unknown research/CORE reference`로 거절 | RC01+CORE-03과 새로운 합성 scenarioId는 수락. RC99, RC01-NONEXISTENT, CORE-00/99/99999는 거절. source에 등장하는 ID 집합의 membership 검사이며 의미상 파생 관계나 scenario 원장 검증을 대신하지 않음 |
| F4 | 과거 `context.text` 우회가 `exact service context required`로 거절 | search/merchant/policy의 정상 context는 유지. text/id/generation/extra 주입 및 merchant/policy storeId 누락을 거절 |
| F5 | 과거 SKU 집합 순서만 다른 dev/validation 쌍은 `duplicate normalized conversation/context`로 거절 | 원본 배열을 변경하지 않음. 대화 순서가 실제로 다른 두 입력은 별도로 수락. 정상 시간순 changes는 유지하며 역순 seq는 실제 API가 거절 |
| F6 | 과거 1.5만원/15만원 두 정상 입력을 서로 다른 2case로 수락 | 1.5/15/+1.5/-1.5 네 문장을 보존. NFKC·대소문자·공백만 다른 입력은 여전히 중복 거절 |

F1의 정상 bulk 검사 결과: 합성240case, validation60/normal42, clear 최소성공35, unknown 최소성공6, risk 최소성공51. 동일 family 하나로 validation을 축소하면 coverageReady=false. 이 숫자는 검증기 산술 검사이고 실제 모델 성적이나 curator corpus 수량이 아니다.

### exact tuple alternatives와 인접 회귀

메모리 합성 merchant 입력에서 기존 `expect.fields`의 current_batch+clarify와 `alternatives:[future_policy+clarify의 완전한 fields]`를 넣었다. 두 응답 모두 selection=keep/productIds=[]/budgetWon=null/restore refs=null/policyDraft=null이며 실제 API parser로 검증된다. 결과는 **1case·1plannedTurn·normal0·ambiguous1**이다. 대안 수를 사례/분모에 더하지 않는다.

다음 반례를 모두 거절했다: 빈/null/object alternatives, 부분 fields, primary와 동일한 대안, object 키만 재배열한 primary 중복, 후속 대안끼리의 중복, 첫 대안 뒤에 붙인 가짜 SKU 대안, clarify의 예산 변경, normalCompletion과 맞지 않는 정상 budget 대안, scope에 배열을 넣는 필드별 허용값 형태, semanticChecks 누락. SKU 순서만 뒤집은 동일한 complete tuple도 중복 대안으로 거절한다.

정상 policy 제안의 두 완전한 대안(서로 다른 유효 예산)은 수락했다. 그 뒤에 이미 사용한 금액보다 낮은 예산 대안을 붙이면 전체 사례가 normalized API contract 불일치로 거절된다. 첫 대안만 검사하고 나머지를 누락하는 문제가 관측되지 않았다.

**형식 준비 PASS / 실제 채점기 미실행.** 완전한 tuple마다 schema/API/normalCompletion을 검사하는 구현은 확인했지만, 모델 결과가 정확히 한 tuple 전체와 일치하는지 판정하는 후속 scorer는 이번 대상이 아니다. 대안들이 발화 의미상 동등한지와 모든 대안의 semanticChecks 충족 여부는 독립 평가자/curator의 책임이다. M-V-16의 v2 원본 수정 여부도 이번에는 읽거나 승인하지 않았다.

### 실제 명령·결과

1. `shasum -a 256 docs/context/EVAL-01.md scripts/eval-dataset.mjs scripts/eval-dataset.check.mjs`: 시작/마지막 모두 위 요청 hash와 일치.
2. `/Users/gsr/.nvm/versions/node/v24.12.0/bin/node scripts/eval-dataset.check.mjs`: 종료0, **66 counterexamples PASS** 독립 재실행. 기존과 같은 MODULE_TYPELESS_PACKAGE_JSON 경고는 있었으나 실패는 아니다.
3. 동일 Node24 `--input-type=module` stdin에서 아래 원본 반례 반전 명령 실행: 종료0, **Independent original F1-F6 reversal: 6/6 PASS**.
4. 별도 Node24 `--input-type=module` stdin에서 직접 구성한 메모리 fixtures와 `node:assert/strict`로 정상/경계/alternatives 검사: 종료0, **Independent adjacent/alternatives checks: 47 PASS**. 47은 검사 그룹 수이며 corpus 사례·suite·AC 개수가 아니다. 위 66개의 자체검사와 구분한다.

독립47의 구성: slice/status5, turn/status9, 정상/미등록 lineage6, 서비스별 context3, SKU 중복/비변경1, 대화 순서1, 변경 이력1, NFKC 중복1, 문장부호 구별1, 정상 clarify alternatives1, 잘못된 alternatives12, policy alternatives1, SKU 대안 중복1, 옛 revision/empty/zero1, 합성 coverage/family1, 합성 holdout 비노출1, 없는 공개 입력 파일1.

원본 입력을 보존한 반전 명령:

```sh
/Users/gsr/.nvm/versions/node/v24.12.0/bin/node --input-type=module <<'NODE'
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
let source=readFileSync('docs/reviews/eval-01-tooling.md','utf8')
 .match(/<<'NODE'\n([\s\S]*?)\nNODE\n```/)[1];
const swaps=[
 ["assert.equal(inspectPack(pack(allMatched)).coverageReady,true);",
  "assert.throws(()=>inspectPack(pack(allMatched)),/slice\\/final/);"],
 ["assert.doesNotThrow(()=>inspectPack(pack([third])));",
  "assert.throws(()=>inspectPack(pack([third])),/third-step/);"],
 ["assert.doesNotThrow(()=>inspectPack(pack([missing])));",
  "assert.throws(()=>inspectPack(pack([missing])),/unknown research/);"],
 ["assert.equal(inspectPack(pack([m,twin],'merchant')).caseCount,2);",
  "assert.throws(()=>inspectPack(pack([m,twin],'merchant')),/exact service context/);"],
 ["assert.equal(inspectPack(pack([a,b],'merchant')).caseCount,2);",
  "assert.throws(()=>inspectPack(pack([a,b],'merchant')),/duplicate normalized/);"],
 ["assert.throws(()=>inspectPack(pack([d,e],'merchant')),/duplicate normalized/);",
  "assert.equal(inspectPack(pack([d,e],'merchant')).caseCount,2);"],
 ["현재 결함 F1~F6 재현; 품질 PASS 아님",
  "Independent original F1-F6 reversal: 6/6 PASS; no corpus or live approval"]
];
for(const [before,after] of swaps) {
 assert.ok(source.includes(before));source=source.replace(before,after);
}
process.stdout.write(execFileSync('/Users/gsr/.nvm/versions/node/v24.12.0/bin/node',
 ['--input-type=module'],{input:source,encoding:'utf8'}));
NODE
```

### 제한·인계

- source와 context의 위 hash에 한정해 F1~F6를 닫는다. 앞으로 관련 코드·계약·공개 연구/CORE 의존성이 바뀌면 영향받는 증거를 stale로 취급한다. 공개 연구 MD 전체에서 ID를 모으는 방식은 의미상 정의/출처 타당성 검증이 아니며, 자체 membership 한계는 남는다.
- 기존 evalVersion v1, 빈 pack, validation0, 필수 family 부족은 새 PASS로 승격되지 않았다. synthetic holdout의 집계·오류에서 원문/ID/group/SKU canary가 누출되지 않았다. 파일 경계·권한 자체의 보안 인증이나 실제 holdout 검증은 아니다.
- 이번 재검증에서 customer/merchant public pack·holdout summary·artifacts/private·protected holdout 파일을 읽지 않았다. import가 읽은 자료는 공개 catalog/stores와 공개 연구 Markdown/CORE이며, 모든 실행 사례는 메모리 합성이었다.
- network/model/env·키/Git/PR/browser 접근0, 추가 agent0, 전체23/24 suites·build 재실행0. README/package/registry/fingerprint의 병행 변경은 검토하지 않았다. 수정 파일은 이 보고서 하나이며 기존 FAIL 부분은 보존했다.
- main 인계: 좁은 도구 재검증 완료. curator의 v2 자료 준비와 독립 라벨/family·scenario 검토, 실제 scorer의 whole-tuple 일치·semantic 판정, private 담당자의 보호 자료 검증, live baseline/holdout/최종 제품 게이트는 후속이다. 이 PASS를 corpus 준비 완료·모델 성능·제품 출시 승인으로 확대하지 않는다.
