# GATE-01 독립 좁은 검토

2026-09-22 KST · 1차 검토 · 판정: **현재 offline 실행기 범위 PASS, 확인된 P1/P2 지적 없음**.

구현자 main 및 registry 담당 Curie와 분리된 독립 reviewer가 코드·계약을 읽고 Node 24.12.0에서 selfcheck 34개, 별도 반례/확인 37개를 실행했다. main이 생성한 23개 suite+build의 실제 보고서·로그도 현재 소스와 대조했다. 전체 runner와 build를 reviewer가 다시 실행하지 않았다. 원격 Actions·required-check 강제·제품 G1~G6·브라우저/live/자연어 품질 통과 판정은 아니다.

## 소유권·목적 보존 ACK

- 소비한 manifest: `GATE-01 revision1`; `consumed_context_hash=7c806224dbcdbd6cc00a6967dda3d210d4c118ad4f1ef4a9378efec43beecc70`.
- 실제 루트: `/Users/gsr/Documents/2026/hackerton-ralphton/wanna-gs`; branch `codex/ui-preview-20260921`; HEAD `6db1d9bebf8db4647117cf4cbea2d0caefefbdb2`.
- 역할: 독립 code reviewer. 유일한 저장소 수정 파일은 이 보고서다. runtime/config/registry/README/PROGRESS는 다른 담당 소유로 읽기만 했다. 새 agent·network·live 호출·환경값 검사·Git 쓰기를 수행하지 않았다.
- 목적: 게시된 고객 자연어→수요→보수적 발주→픽업 기능을 유지하면서 기존 offline 검사를 실제 프로세스 증거에 연결한다. CORE-13/15/17/18/20/23, AC-26 및 RV-08, D-44/45/46, ADR-002 revision2를 적용했다.
- 유지할 정상 사례: 완전한 현재 실행 증거는 수락한다. 실패·누락·0개·skip·stale·log 변조·offline의 live 승격은 거절한다. 제품 기능·합격 기준을 수정하거나 축소하지 않았다.
- verify 스킬로 구현자 결론과 별개인 반례·raw evidence 대조를 수행했다. ponytail 스킬에 따라 Node 표준 라이브러리와 기존 verifier만 사용했으며 새 실행기·의존성·검증 프레임워크를 만들지 않았다.

필수 문서 실제 SHA-256 ACK:

| 입력 | SHA-256 |
|---|---|
| `AGENTS.md` | `07845a308711b944829fb61b756f765dd1c01e4f13434587d2e7cc5a76e56f6f` |
| `docs/AGENTS.md` | `141d5c7a0eeaffc61be80f7b97e730d568a3b8e1f1b961e16dfe6cb5589903ba` |
| `card.md` | `62fae686c1967902ac443a0a315f4c7f59f76df9e6de3a3568e4355d6e334e03` |
| `docs/CORE_REQUIREMENTS.md` | `65c7541d3549bf49b715da687aa5af060fce9a48e774a4130d9ac350349d8114` |
| `docs/DECISION_INDEX.md` | `fc0a5e4c748f4c2303ee7c4250d290517a58529d35fab8a824afa9f329e32523` |
| `docs/decisions/ADR-002-execution-and-evaluation.md` | `48841b2f3e06881486636b1492c9198044a0e2ff91704a2ca2bf7c09837967a2` |
| `docs/09-verification-and-evals.md` | `1b9d5c6a0a7ec6a03617bfa5ecd679d0c9fd3fa3d0caaf93d8239d9bc3f62c02` |
| `docs/13-review-checklist.md` | `a16bec44249806e25e06672709856407e880a1fa75abdd974dd1300c9539ddc7` |
| `docs/14-agent-development-loop.md` | `eb15ed27e5d30d8dbb7f3491d6317cd199f46d7e27e9ea34c2d162a2d768acd2` |
| `docs/20-agent-roles-and-context.md` | `73706b34d40155b35190a32ce6b69eabd3da0ad519fb18f95e7464eb38d2e238` |
| `.agents/skills/wanna-gs-verify/SKILL.md` | `20fb3877f8be40a302e9b2ed517bad5390ed3403e8ccf8a7495466b5fad2ff40` |
| ponytail `4.10.0/skills/ponytail/SKILL.md` | `1316a2f3f95741d2300b116fe0c2d81ce4a9568656ed0a62643f54aaf09957f2` |

추가로 docs README·02·PROGRESS의 현재 포인터, docs16 및 gate-report 양식을 확인했다. GATE-01 전체와 필수 기준 문서를 직접 읽었다. 기본 PATH의 Node는 20.11.0이므로 아래 실행은 설치된 Node 24 절대 경로를 사용했다.

## 검토 revision과 실제 증거

| 대상 | SHA-256 / 결과 |
|---|---|
| `quality/checks.json` | `e534263c12c122e944ff053bf6117c8461c99b7ceb2c351e977f833de6020ac4`, 23개; inspector unittest와 quality selfcheck 추가 완료 revision |
| `scripts/quality.mjs` | `f2bfd75a433a1bfe9a268ca586bb4cda7536d93fe760c7a37d2bedba216a20cb` |
| `scripts/quality.check.mjs` | `aed6413cd61ab37b47d9f4e2a4b6410b1d105efe788fd794af2d3efc6316a93a` |
| `.github/workflows/quality.yml` | `b89c9d82eec6e739f9d5f6c2657bccb5aaf131d4f24b9b867c6e04303492c4bd` |
| runner source fingerprint | `084089c67176ca1d6f98e26553d5214cfc511960b186f7edb547dfe338dda4d1`, 100개 입력 |
| main report | `e019d3dc43a93c1f3e35f0acd8146cd32e5b6a9881ce94d36de60d775646339a` |
| main build raw log | `3f9e4669c05e1234e58b9deb960d23936a829f514982d2616c840c1c9fd78dde` |

main 증거 경로는 `test-results/quality/2026-09-21T16-47-08-810Z-35104/report.json`이며 같은 디렉터리에 각 ID의 raw JSON 로그가 있다. 시작 `2026-09-21T16:47:08.811Z`, 종료 `2026-09-21T16:47:47.047Z` (UTC). 24개 자식 결과 모두 exit 0, signal null, timeout false; 23개 suite 완료 marker와 build 완료 1개가 기록됐다. build의 `completedSuites`는 **0**이다. `sourceChanged=false`, Node 24.12.0, 현재 HEAD/fingerprint와 일치한다. 이 내용은 main 실행의 독립 증거 확인이며 reviewer의 앱 재실행이 아니다.

## 좁은 검토 결과

| 확인 대상 | 실제 확인과 한계 |
|---|---|
| 실제 spawn·argv | runner는 shell 없이 `spawnSync`로 순차 실행하며 Node에는 `process.execPath`를 사용한다. 등록 argv와 report argv를 verifier가 정확 비교한다. 별도 Node 자식의 정상/exit7/빈 출력/0개/skip/timeout/SIGTERM을 실제 실행해 outcome을 확인했다. |
| 누락·실패·0개·skip | selfcheck 34개 및 독립 반례에서 거절. 완전한 정상 증거도 수락해 전부 거절하는 검사기가 아님을 확인했다. |
| report 경로·raw log | 실행별 timestamp+PID 디렉터리, 자식별 저장, report 저장 후 `GITHUB_OUTPUT` 전달을 코드로 확인했다. 실제 main 보고서 경로로 CLI verify 성공, 존재하지 않는 report는 nonzero, actual report의 raw log 공백 변조도 거절했다. 로그 이름은 임의 report 필드 대신 registry ID로 결정되고 일반 파일 여부를 검사한다. |
| build 실패 | build 포함 여부·exit 실패·빈 marker 거절, 실제 main build의 `Route (app)` marker와 suite 0개를 확인했다. 실제 실패 build 재실행은 하지 않았고 실패 결과를 메모리에서 주입했다. |
| stale·Node·phase | HEAD/digest/파일 manifest 변경·실행 중 변경·미완료 시각을 selfcheck/반례로 검사. 실제 Node20 CLI verify가 Node24 결과를 거절했다. live/G4/G5/G6 CLI 요청은 모두 exit1. |
| source 입력 | 현재 registry의 모든 `.mjs`/`.py` 실행 파일 포함을 assert했다. `.agents` inspector 구현/테스트, docs/research의 generator 입력, context/09/14, app/lib/data/scripts/quality/.github, package/lockfile/tsconfig/.nvmrc, card/CORE/ADR 포함을 확인했다. generated public DB/WASM은 앞선 prepare 단계가 재생성하며 입력 소스·lockfile을 fingerprint한다. 배포 산출물 hash 또는 live 환경 동일성까지 보증하지 않는다. |
| 항상 실행하는 CI aggregate | path filter 없이 PR main/push main/dispatch, 단일 `gate` job, contents:read, fetch-depth0, persist-credentials:false, Node `.nvmrc`, npm ci, runner 다음 aggregate와 artifact에 `if: always()`가 있다. report 누락은 `test -n`에서 실패하고 artifact 누락도 error다. 개별 suite 실패 시에도 runner loop는 build까지 계속해 결과를 기록한다. 원격 Actions 실행·action pin 유효성·branch protection은 network 금지에 따라 미검증이다. |

검사 자체의 crash/강제 취소/runner 또는 업로드 서비스 장애가 있어도 artifact 생성까지 절대 보장한다고 해석하지 않는다. 로컬 report와 로그는 무서명이며, 둘을 일관되게 다시 만드는 악의적 위조 방지 증거가 아니다. 독립 검토자 신원·전체 제품 필수 게이트의 기계 강제는 이 offline 단계에서 구현됐다고 판정하지 않았다.

## 실제 실행 명령과 결과

저장소 루트에서 실행했다. 모두 exit 0이며, 아래에서 의도적으로 실행한 실패 CLI/자식은 기대한 nonzero를 assert했다. tool 실행 출력 `5a65a2`는 selfcheck, `093481`은 독립 28개, `408e32`는 추가 9개다. 아래 두 heredoc은 파일을 생성하지 않는다.

```sh
/Users/gsr/.nvm/versions/node/v24.12.0/bin/node scripts/quality.check.mjs
```

결과: `QUALITY self-check: 34 cases PASS; validator only, no app/live evidence.`

독립 28개 실행:

```sh
/Users/gsr/.nvm/versions/node/v24.12.0/bin/node --input-type=module <<'NODE'
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { definitions, fingerprint, hash, outcome, validate, root } from './scripts/quality.mjs';
const registry = JSON.parse(readFileSync('quality/checks.json','utf8'));
assert.equal(registry.checks.length,23);
const d={id:'independent',command:'node',args:['-e','process.stdout.write("COMPLETE\\n")'],marker:'^COMPLETE$',minMatches:1,mode:'offline',scope:'unit',core:['CORE-17'],limitation:'Synthetic process only'};
const defs=definitions({version:1,checks:[d]});
const source=fingerprint();
let count=0;
function check(name,fn){fn();count++;console.log(`PASS ${name}`);}
function actual(code,opts={}){const x=spawnSync(process.execPath,['-e',code],{cwd:root,encoding:'utf8',timeout:1000,env:{},...opts});return {result:{exitCode:x.status,signal:x.signal,timedOut:x.error?.code==='ETIMEDOUT'},log:{stdout:x.stdout??'',stderr:x.stderr??''}};}
for(const [name,code,wanted,opts] of [
 ['real spawn success','process.stdout.write("COMPLETE\\n")',true],
 ['real failed child after marker','process.stdout.write("COMPLETE\\n");process.exit(7)',false],
 ['real empty child','',false],
 ['real zero despite marker','process.stdout.write("COMPLETE\\nRan 0 tests\\n")',false],
 ['real skipped despite marker','process.stdout.write("COMPLETE\\nOK (skipped=1)\\n")',false],
 ['real timeout','process.stdout.write("COMPLETE\\n");setInterval(()=>{},1000)',false,{timeout:50}],
 ['real signalled child','process.stdout.write("COMPLETE\\n");process.kill(process.pid,"SIGTERM")',false],
]) {check(name,()=>{const x=actual(code,opts);assert.equal(outcome(d,x.result,x.log).ok,wanted);});}
const logs={independent:JSON.stringify(actual(d.args[1]).log),build:JSON.stringify({stdout:'Route (app)\n/',stderr:''})};
const results=defs.map(def=>{const x={id:def.id,argv:[def.command,...def.args],mode:'offline',exitCode:0,signal:null,timedOut:false,durationMs:1,logHash:hash(logs[def.id])};return {...x,outcome:outcome(def,x,JSON.parse(logs[def.id]))};});
const report={version:1,phase:'offline',source,sourceChanged:false,runtime:{node:process.versions.node},startedAt:'2026-09-22T00:00:00Z',finishedAt:'2026-09-22T00:00:01Z',results};
const errors=(r=report,l=logs,s=source)=>validate(r,defs,s,id=>{if(!(id in l))throw Error('Missing log');return l[id];});
check('synthetic aggregate normal succeeds',()=>assert.deepEqual(errors(),[]));
for(const [name,mutate] of [
 ['missing build',r=>r.results.pop()],['build failure',r=>r.results[1].exitCode=2],['wrong command argv',r=>r.results[0].argv[2]='process.exit(0)'],['stale HEAD',r=>r.source.head='old'],['stale input hash',r=>r.source.files['quality/checks.json']='old'],['live phase',r=>r.phase='live'],['G4 phase',r=>r.phase='G4'],['G5 phase',r=>r.phase='G5'],['G6 phase',r=>r.phase='G6'],['passed flag without children',r=>{r.passed=true;r.results=[];}]
])check(name,()=>{const copy=structuredClone(report);mutate(copy);assert(errors(copy).length);});
check('log tamper',()=>assert(errors(report,{...logs,independent:logs.independent+' '}).length));
check('missing log',()=>assert(errors(report,{build:logs.build}).length));
check('build has zero completed suites',()=>assert.equal(report.results[1].outcome.completedSuites,0));
for(const phase of ['live','G4','G5','G6'])check(`CLI unsupported ${phase}`,()=>{const x=spawnSync(process.execPath,['scripts/quality.mjs','--phase',phase],{cwd:root,encoding:'utf8',env:{}});assert.equal(x.status,1);assert.match(x.stderr,/only offline phase/);});
check('CLI missing report path rejects',()=>{const x=spawnSync(process.execPath,['scripts/quality.mjs','--verify','/nonexistent/gate-01-report.json'],{cwd:root,encoding:'utf8',env:{}});assert.equal(x.status,1);assert.match(x.stderr,/Quality gate rejected/);});
check('registry required inputs fingerprinted',()=>{for(const def of registry.checks)for(const arg of def.args)if(/\.(?:mjs|py)$/.test(arg))assert(arg in source.files,arg);});
check('research inspector context fingerprinted',()=>{for(const name of ['.agents/skills/wanna-gs-preflight/scripts/inspect_environment.py','docs/context/GATE-01.md','docs/09-verification-and-evals.md','docs/14-agent-development-loop.md'])assert(name in source.files,name);assert(Object.keys(source.files).some(p=>p.startsWith('docs/research/')));});
console.log(JSON.stringify({independentChecks:count,node:process.versions.node,head:source.head,digest:source.digest,fileCount:Object.keys(source.files).length,registryHash:hash(readFileSync('quality/checks.json')),runnerHash:hash(readFileSync('scripts/quality.mjs'))}));
NODE
```

실제 main 보고서를 대상으로 추가 9개 실행:

```sh
/Users/gsr/.nvm/versions/node/v24.12.0/bin/node --input-type=module <<'NODE'
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { definitions, fingerprint, hash, validate } from './scripts/quality.mjs';
const file='test-results/quality/2026-09-21T16-47-08-810Z-35104/report.json';
const report=JSON.parse(readFileSync(file,'utf8'));
const defs=definitions(JSON.parse(readFileSync('quality/checks.json','utf8')));
const current=fingerprint();
const logs=Object.fromEntries(defs.map(d=>[d.id,readFileSync(join(dirname(file),d.id+'.json'),'utf8')]));
let cases=0;
for(const [name,mutate] of [['failed build',r=>r.results.at(-1).exitCode=1],['missing suite',r=>r.results.splice(0,1)],['changed argv',r=>r.results[0].argv.push('--skip')],['stale source',r=>r.source.digest='old'],['unsupported live phase',r=>r.phase='live']]){
 const copy=structuredClone(report);mutate(copy);assert(validate(copy,defs,current,id=>logs[id]).length);cases++;console.log('PASS actual report rejects '+name);
}
assert(validate(report,defs,current,id=>logs[id]+' ').length);cases++;console.log('PASS actual report rejects changed raw logs');
const cli=spawnSync(process.execPath,['scripts/quality.mjs','--verify',file],{encoding:'utf8',env:{PATH:'/usr/bin:/bin'}});assert.equal(cli.status,0,cli.stderr);cases++;console.log(cli.stdout.trim());
const wrong=spawnSync('/Users/gsr/.nvm/versions/node/v20.11.0/bin/node',['scripts/quality.mjs','--verify',file],{encoding:'utf8',env:{PATH:'/usr/bin:/bin'}});assert.equal(wrong.status,1);assert.match(wrong.stderr,/requires Node24/);cases++;console.log('PASS Node20 verifier rejects Node24 report');
const build=JSON.parse(logs.build);assert.match(build.stdout+'\n'+build.stderr,/^Route \(app\)/m);assert.equal(report.results.at(-1).outcome.completedSuites,0);cases++;console.log('PASS actual build Route marker counted as zero suites');
console.log(JSON.stringify({additionalChecks:cases,reportHash:hash(readFileSync(file)),buildLogHash:hash(logs.build),currentDigest:current.digest}));
NODE
```

## 인계

수정 요청 없이 1차 좁은 검토를 종료한다. registry는 전달받은 완료 hash의 23개 revision을 사용했고 반복 polling하지 않았다. 보고서 작성은 source fingerprint 밖의 문서 변경이다. main은 정확한 PR/checkout의 원격 Actions 및 보호 규칙 상태를 별도 확인하고 PROGRESS에 이 보고서를 연결한다. 해당 결과가 없으면 원격 CI 강제나 상위 제품 완료를 선언하지 않는다. 이후 실제 코드 수정으로 revision이 바뀌면 영향받는 반례만 두 번째 검토에서 확인한다.
