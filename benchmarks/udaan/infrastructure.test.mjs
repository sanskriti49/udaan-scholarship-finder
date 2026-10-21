import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
process.env.BENCH_DATABASE='udaan_audit_tests';
await import('./environment.cjs');
const {default:mongoose}=await import('../../backend/node_modules/mongoose/index.js');
const {Worker,QueueEvents}=await import('../../backend/node_modules/bullmq/dist/cjs/index.js');
const {MongoStore}=await import('../../backend/src/pipeline/store/mongoStore.js');
const {Pipeline}=await import('../../backend/src/pipeline/pipeline.js');
const {makeHarness,LISTING_URL,listingText,textResponse,failing}=await import('../../backend/test/helpers.js');
const {makeEvidence}=await import('../../backend/src/pipeline/core/evidence.js');
const {sha256}=await import('../../backend/src/pipeline/core/http.js');
const {verifyEvidence}=await import('../../backend/src/pipeline/core/evidence.js');
const {default:Scholarship}=await import('../../backend/src/models/Scholarship.js');
const {default:SourceSnapshot}=await import('../../backend/src/models/SourceSnapshot.js');
const {default:ScholarshipVersion}=await import('../../backend/src/models/ScholarshipVersion.js');
const {default:EligibilityRuleVersion}=await import('../../backend/src/models/EligibilityRuleVersion.js');
const {default:User}=await import('../../backend/src/models/User.js');
const {default:UserProfile}=await import('../../backend/src/models/UserProfile.js');
const {default:Bookmark}=await import('../../backend/src/models/Bookmark.js');
const {default:NotificationPreference}=await import('../../backend/src/models/NotificationPreference.js');
const {default:Notification}=await import('../../backend/src/models/Notification.js');
const {default:NotificationLog}=await import('../../backend/src/models/NotificationLog.js');
const {default:EligibilityAlertDelivery}=await import('../../backend/src/models/EligibilityAlertDelivery.js');
const {notificationService}=await import('../../backend/src/services/notificationService.js');
const {processReminderJob}=await import('../../backend/src/workers/processReminderJob.js');
const {deliverEligibilityNotification}=await import('../../backend/src/services/eligibilityDelivery.js');
const {reminderQueue,scheduleDeadlineReminder,closeReminderQueue}=await import('../../backend/src/queues/reminderQueue.js');
const {bullMqConnection,redisClient,closeRedisClient}=await import('../../backend/src/config/redis.js');
const report={measuredAt:new Date().toISOString(),transport:'Recorded captures and synthetic data; no live portal or SMTP delivery',checks:{}};
let events;
before(async()=>{
  await mongoose.connect(process.env.MONGO_URI,{maxPoolSize:20});
  assert.equal(mongoose.connection.name,'udaan_audit_tests');
  await mongoose.connection.dropDatabase();
  await Promise.all(Object.values(mongoose.models).map(model=>model.init()));
  await redisClient.ping();await reminderQueue.obliterate({force:true});
  events=new QueueEvents('scholarshipReminders',{connection:bullMqConnection});await events.waitUntilReady();
});
after(async()=>{fs.writeFileSync(new URL('./results/infrastructure.json',import.meta.url),JSON.stringify(report,null,2));await events?.close();await closeReminderQueue();await closeRedisClient();await mongoose.disconnect()});
test('actual MongoStore persists recorded ingestion, reuses hashes, versions changed deadlines and survives upstream failure',{timeout:90000},async()=>{
  const store=new MongoStore(),h=makeHarness({store});
  const first=await h.run();assert.equal(first.status,'success');assert.equal(first.counts.published,31);
  const initialSnapshots=await SourceSnapshot.countDocuments({}),initialVersions=await ScholarshipVersion.countDocuments({});
  const record=(await store.listScholarships())[0];
  for(const e of record.fieldEvidence){const snapshot=await store.getSnapshot(e.snapshotId);assert.equal(verifyEvidence(e,snapshot).ok,true)}
  const second=await h.run();assert.equal(second.counts.dataChanged,0);
  assert.equal(await SourceSnapshot.countDocuments({}),initialSnapshots);assert.equal(await ScholarshipVersion.countDocuments({}),initialVersions);
  h.setOverrides({[LISTING_URL]:textResponse(listingText.replaceAll('31-10-2026','15-11-2026'))});
  const changed=await h.run();assert.equal(changed.status,'success');assert.ok(changed.counts.dataChanged>0);
  assert.equal(await Scholarship.countDocuments({}),31);assert.ok(await ScholarshipVersion.countDocuments({})>initialVersions);
  const before=(await Scholarship.find({}).sort({schemeKey:1}).lean()).map(x=>[x.schemeKey,x.dataHash]);
  h.setOverrides({[LISTING_URL]:failing()});assert.equal((await h.run()).status,'failed');
  assert.deepEqual((await Scholarship.find({}).sort({schemeKey:1}).lean()).map(x=>[x.schemeKey,x.dataHash]),before);
  report.checks.ingestion={published:31,initialSnapshots,initialVersions,unchangedCreatesNoVersions:true,changedDeadlineRecords:changed.counts.dataChanged,upstreamFailurePreservesData:true};
});
test('actual MongoStore keeps immutable cited eligibility versions and a pending recoverable change event',async()=>{
  const store=new MongoStore(),pipeline=new Pipeline({store,onDataChange:async()=>{}});
  async function record(ceiling){
    const text=`Synthetic scholarship annual income must not exceed ${ceiling}.`;
    const snapshot=await store.saveSnapshot({url:'https://bench.invalid/rules',textHash:sha256(text),text,fetchedAt:new Date(),authorityTier:1});
    return {schemeKey:'synthetic-audit-rules',title:'Synthetic audit rules',organization:'Test provider',state:'All India',fieldEvidence:[makeEvidence(snapshot,text,{field:'familyIncome'})],
      rules:[{id:'income',field:'familyIncome',operator:'LTE',targetValue:ceiling,evidenceSnapshotId:snapshot.id}],
      provenanceQuotes:[{ruleId:'income',quote:text,sourceUrl:snapshot.url,snapshotId:snapshot.id}],eligibility:{familyIncome:{max:ceiling,operator:'LTE'}},dataQuality:{unknownFields:['eligibility']},cycles:[],requiredDocuments:[],publication:{state:'published'}};
  }
  const context={blocking:false,at:new Date(),runId:'synthetic-audit',guideline:{fetched:true}};
  await pipeline.upsert({id:'synthetic'},await record(250000),context);
  const s1=await store.getScholarship('synthetic-audit-rules'),v1=await store.getEligibilityVersion(s1.eligibilityVersion);
  await pipeline.upsert({id:'synthetic'},await record(300000),context);
  const s2=await store.getScholarship('synthetic-audit-rules'),v2=await store.getEligibilityVersion(s2.eligibilityVersion);
  assert.equal(v1.verified,true);assert.equal(v2.verified,true);assert.equal(String(v2.previousVersion),v1.id);
  assert.equal(v1.snapshot.rules[0].targetValue,250000);assert.equal(v2.alert.status,'pending');
  const count=await EligibilityRuleVersion.countDocuments({schemeKey:'synthetic-audit-rules'});
  await pipeline.upsert({id:'synthetic'},await record(300000),context);
  assert.equal(await EligibilityRuleVersion.countDocuments({schemeKey:'synthetic-audit-rules'}),count);
  report.checks.ruleVersions={linkedVersions:count,oldRulePreserved:true,pendingEvent:true,repeatDoesNotDuplicate:true};
});
test('real BullMQ retries a transient failure, retains work without a worker, and MongoDB suppresses replayed reminders',{timeout:45000},async()=>{
  const user=await User.create({name:'Synthetic audit student',email:'audit@bench.invalid'});
  const scholarship=await Scholarship.create({schemeKey:'synthetic-reminder',title:'Synthetic reminder fixture',publication:{state:'published'},deadline:new Date(Date.now()+3600000),amount:{value:10000}});
  await Bookmark.create({user:user._id,scholarship:scholarship._id});
  await NotificationPreference.create({user:user._id,channels:{inApp:true,email:false},deadlineAlerts:true,deadline7Days:true});
  const input={userId:String(user._id),email:user.email,scholarshipId:String(scholarship._id),scholarshipName:scholarship.title,deadlineDate:scholarship.deadline,reminderWindow:'7_days'};
  const duplicates=await Promise.all(Array.from({length:20},()=>scheduleDeadlineReminder(input)));
  assert.equal(new Set(duplicates.map(x=>x.id)).size,1);assert.equal(await reminderQueue.getWaitingCount(),1);
  let attempts=0,worker;
  try{
    worker=new Worker('scholarshipReminders',async job=>{if(++attempts===1)throw Error('Synthetic transient database failure');return processReminderJob(job,{Scholarship,Bookmark,notificationService,NotificationLog})},{connection:bullMqConnection,concurrency:2});
    const outcome=await duplicates[0].waitUntilFinished(events,30000);assert.equal(outcome.status,'COMPLETED');
    await worker.close();worker=null;
    const replay=await reminderQueue.add('sendDeadlineReminder',duplicates[0].data,{jobId:'synthetic-replay'});
    assert.equal(await replay.getState(),'waiting');
    worker=new Worker('scholarshipReminders',job=>processReminderJob(job,{Scholarship,Bookmark,notificationService,NotificationLog}),{connection:bullMqConnection});
    const replayResult=await replay.waitUntilFinished(events,10000);assert.equal(replayResult.status,'SKIPPED');
    assert.equal(await Notification.countDocuments({user:user._id}),1);
    report.checks.reminders={concurrentEnqueues:20,uniqueQueuedJobs:1,processorAttemptsBeforeSuccess:attempts,replaySuppressed:true,notifications:1,emailDisabled:true,workerRestartRetainsQueuedJob:true};
  }finally{await worker?.close()}
});
test('actual MongoDB eligibility delivery retries transport failure without duplicating inbox records and retains its receipt after dismissal',async()=>{
  const userId=new mongoose.Types.ObjectId(),scholarship=new mongoose.Types.ObjectId(),version=new mongoose.Types.ObjectId();
  let emails=0;
  const payload={type:'ELIGIBILITY_CHANGED',title:'Synthetic eligibility change',message:'Synthetic audit only',scholarship,data:{currentVersionId:version},dedupKey:'synthetic-delivery'};
  const dependencies={Notification,EligibilityAlertDelivery,User:{findById:()=>({select:()=>({lean:async()=>({email:'nobody@bench.invalid'})})})},emailService:{sendEmail:async()=>++emails===1?{success:false,error:'Synthetic SMTP outage'}:{success:true,messageId:'synthetic-only'}}};
  const prefs={channels:{inApp:true,email:true}};
  await assert.rejects(deliverEligibilityNotification(userId,payload,prefs,dependencies),/Synthetic SMTP/);
  await deliverEligibilityNotification(userId,payload,prefs,dependencies);
  assert.equal(await Notification.countDocuments({user:userId}),1);assert.equal(emails,2);
  await Notification.updateMany({user:userId},{$set:{isDismissed:true}});
  assert.equal(await deliverEligibilityNotification(userId,payload,prefs,dependencies),null);
  assert.equal(emails,2);assert.equal((await EligibilityAlertDelivery.findOne({user:userId}).lean()).status,'completed');
  report.checks.delivery={inboxRecords:1,simulatedTransportAttempts:2,completedReceiptSuppressesRetry:true,realEmailSent:false};
});
test('real pending-event relay and BullMQ worker deliver a cited rule-change alert only to an opted-in affected student',{timeout:20000},async()=>{
  const {relayEligibilityAlerts}=await import('../../backend/src/services/eligibilityAlertRelay.js');
  const {createReminderWorker,closeReminderWorker}=await import('../../backend/src/workers/reminderWorker.js');
  const scheme=await Scholarship.findOne({schemeKey:'synthetic-audit-rules'}).lean();
  for(const optedIn of [true,false]){
    const user=await User.create({name:'Synthetic affected student',email:`opt-${optedIn}@bench.invalid`});
    await Bookmark.create({user:user._id,scholarship:scheme._id});
    await UserProfile.create({user:user._id,familyIncome:275000,educationLevel:'UG',state:'Uttar Pradesh'});
    await NotificationPreference.create({user:user._id,eligibilityChanges:optedIn,channels:{inApp:true,email:false}});
  }
  assert.equal((await relayEligibilityAlerts()).queued,1);
  const job=await reminderQueue.getJob(`eligibility_${scheme._id}_${scheme.eligibilityVersion}`);
  assert.ok(job);
  try{
    createReminderWorker();
    const result=await job.waitUntilFinished(events,12000);
    assert.equal(result.status,'COMPLETED');assert.equal(result.recipients,2);assert.equal(result.dispatched,1);assert.equal(result.skipped,1);
    const notices=await Notification.find({scholarship:scheme._id,type:'ELIGIBILITY_CHANGED'}).lean();
    assert.equal(notices.length,1);assert.ok(notices[0].data.changes[0].newEvidence.quote);
    const replay=await reminderQueue.add('handleEligibilityChangeAlert',job.data,{jobId:'synthetic-eligibility-replay'});
    assert.equal((await replay.waitUntilFinished(events,8000)).dispatched,0);
    assert.equal(await Notification.countDocuments({scholarship:scheme._id,type:'ELIGIBILITY_CHANGED'}),1);
    report.checks.eligibilityFanout={pendingEventRelayed:true,realWorker:true,recipients:2,optedInAffectedNotifications:1,optedOutSkipped:true,sourceQuotePresent:true,replayDoesNotDuplicate:true,emailDisabled:true};
  }finally{await closeReminderWorker()}
});
