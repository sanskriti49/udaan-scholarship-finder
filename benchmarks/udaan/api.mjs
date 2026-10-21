import './environment.cjs';
const {default:mongoose}=await import('../../backend/node_modules/mongoose/index.js');
const {default:express}=await import('../../backend/node_modules/express/index.js');
const {default:helmet}=await import('../../backend/node_modules/helmet/index.cjs');
const {default:router}=await import('../../backend/src/routes/scholarshipRoutes.js');
const {isRedisAvailable,closeRedisClient}=await import('../../backend/src/config/redis.js');
const databaseCalls={};
mongoose.set('debug',(collection,method)=>{const key=`${collection}.${method}`;databaseCalls[key]=(databaseCalls[key]||0)+1});
await mongoose.connect(process.env.MONGO_URI,{maxPoolSize:20,minPoolSize:2});
await new Promise(resolve=>setTimeout(resolve,1200));
const app=express();app.use(helmet());app.use(express.json());
// The production router/middleware/controllers are unchanged. The per-IP global
// quota, logging and background schedulers are excluded from endpoint capacity tests.
app.use('/api/scholarships',router);
app.get('/health',(_,res)=>res.json({ready:mongoose.connection.readyState===1,cache:isRedisAvailable(),databaseCalls}));
app.use((err,req,res,next)=>res.status(err.status||500).json({success:false,message:err.message}));
const port=process.env.BENCH_CACHE==='off'?5103:5102;
const server=app.listen(port,'127.0.0.1',()=>console.log(`Real scholarship router listening on ${port}; cache=${process.env.BENCH_CACHE||'on'}`));
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>server.close(async()=>{await closeRedisClient();await mongoose.disconnect();process.exit(0)}));
