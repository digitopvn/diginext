(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[2888],{3042:function(t,e,i){"use strict";i.r(e),i.d(e,{default:function(){return _app}});var n=i(59499);i(57070),i(19020);var r=i(32161),s=i(30819),a=i(30081),u=i(72379),o=i(89643);let Query=class Query extends o.F{constructor(t){super(),this.abortSignalConsumed=!1,this.defaultOptions=t.defaultOptions,this.setOptions(t.options),this.observers=[],this.cache=t.cache,this.logger=t.logger||s._,this.queryKey=t.queryKey,this.queryHash=t.queryHash,this.initialState=t.state||function(t){let e="function"==typeof t.initialData?t.initialData():t.initialData,i=void 0!==e,n=i?"function"==typeof t.initialDataUpdatedAt?t.initialDataUpdatedAt():t.initialDataUpdatedAt:0;return{data:e,dataUpdateCount:0,dataUpdatedAt:i?null!=n?n:Date.now():0,error:null,errorUpdateCount:0,errorUpdatedAt:0,fetchFailureCount:0,fetchFailureReason:null,fetchMeta:null,isInvalidated:!1,status:i?"success":"loading",fetchStatus:"idle"}}(this.options),this.state=this.initialState,this.scheduleGc()}get meta(){return this.options.meta}setOptions(t){this.options={...this.defaultOptions,...t},this.updateCacheTime(this.options.cacheTime)}optionalRemove(){this.observers.length||"idle"!==this.state.fetchStatus||this.cache.remove(this)}setData(t,e){let i=(0,r.oE)(this.state.data,t,this.options);return this.dispatch({data:i,type:"success",dataUpdatedAt:null==e?void 0:e.updatedAt,manual:null==e?void 0:e.manual}),i}setState(t,e){this.dispatch({type:"setState",state:t,setStateOptions:e})}cancel(t){var e;let i=this.promise;return null==(e=this.retryer)||e.cancel(t),i?i.then(r.ZT).catch(r.ZT):Promise.resolve()}destroy(){super.destroy(),this.cancel({silent:!0})}reset(){this.destroy(),this.setState(this.initialState)}isActive(){return this.observers.some(t=>!1!==t.options.enabled)}isDisabled(){return this.getObserversCount()>0&&!this.isActive()}isStale(){return this.state.isInvalidated||!this.state.dataUpdatedAt||this.observers.some(t=>t.getCurrentResult().isStale)}isStaleByTime(t=0){return this.state.isInvalidated||!this.state.dataUpdatedAt||!(0,r.Kp)(this.state.dataUpdatedAt,t)}onFocus(){var t;let e=this.observers.find(t=>t.shouldFetchOnWindowFocus());e&&e.refetch({cancelRefetch:!1}),null==(t=this.retryer)||t.continue()}onOnline(){var t;let e=this.observers.find(t=>t.shouldFetchOnReconnect());e&&e.refetch({cancelRefetch:!1}),null==(t=this.retryer)||t.continue()}addObserver(t){this.observers.includes(t)||(this.observers.push(t),this.clearGcTimeout(),this.cache.notify({type:"observerAdded",query:this,observer:t}))}removeObserver(t){this.observers.includes(t)&&(this.observers=this.observers.filter(e=>e!==t),this.observers.length||(this.retryer&&(this.abortSignalConsumed?this.retryer.cancel({revert:!0}):this.retryer.cancelRetry()),this.scheduleGc()),this.cache.notify({type:"observerRemoved",query:this,observer:t}))}getObserversCount(){return this.observers.length}invalidate(){this.state.isInvalidated||this.dispatch({type:"invalidate"})}fetch(t,e){var i,n,s,a;if("idle"!==this.state.fetchStatus){if(this.state.dataUpdatedAt&&null!=e&&e.cancelRefetch)this.cancel({silent:!0});else if(this.promise)return null==(s=this.retryer)||s.continueRetry(),this.promise}if(t&&this.setOptions(t),!this.options.queryFn){let t=this.observers.find(t=>t.options.queryFn);t&&this.setOptions(t.options)}let o=(0,r.G9)(),l={queryKey:this.queryKey,pageParam:void 0,meta:this.meta},addSignalProperty=t=>{Object.defineProperty(t,"signal",{enumerable:!0,get:()=>{if(o)return this.abortSignalConsumed=!0,o.signal}})};addSignalProperty(l);let c={fetchOptions:e,options:this.options,queryKey:this.queryKey,state:this.state,fetchFn:()=>this.options.queryFn?(this.abortSignalConsumed=!1,this.options.queryFn(l)):Promise.reject("Missing queryFn for queryKey '"+this.options.queryHash+"'")};addSignalProperty(c),null==(i=this.options.behavior)||i.onFetch(c),this.revertState=this.state,("idle"===this.state.fetchStatus||this.state.fetchMeta!==(null==(n=c.fetchOptions)?void 0:n.meta))&&this.dispatch({type:"fetch",meta:null==(a=c.fetchOptions)?void 0:a.meta});let onError=t=>{if((0,u.DV)(t)&&t.silent||this.dispatch({type:"error",error:t}),!(0,u.DV)(t)){var e,i,n,r;null==(e=(i=this.cache.config).onError)||e.call(i,t,this),null==(n=(r=this.cache.config).onSettled)||n.call(r,this.state.data,t,this)}this.isFetchingOptimistic||this.scheduleGc(),this.isFetchingOptimistic=!1};return this.retryer=(0,u.Mz)({fn:c.fetchFn,abort:null==o?void 0:o.abort.bind(o),onSuccess:t=>{var e,i,n,r;if(void 0===t){onError(Error(this.queryHash+" data is undefined"));return}this.setData(t),null==(e=(i=this.cache.config).onSuccess)||e.call(i,t,this),null==(n=(r=this.cache.config).onSettled)||n.call(r,t,this.state.error,this),this.isFetchingOptimistic||this.scheduleGc(),this.isFetchingOptimistic=!1},onError,onFail:(t,e)=>{this.dispatch({type:"failed",failureCount:t,error:e})},onPause:()=>{this.dispatch({type:"pause"})},onContinue:()=>{this.dispatch({type:"continue"})},retry:c.options.retry,retryDelay:c.options.retryDelay,networkMode:c.options.networkMode}),this.promise=this.retryer.promise,this.promise}dispatch(t){this.state=(e=>{var i,n;switch(t.type){case"failed":return{...e,fetchFailureCount:t.failureCount,fetchFailureReason:t.error};case"pause":return{...e,fetchStatus:"paused"};case"continue":return{...e,fetchStatus:"fetching"};case"fetch":return{...e,fetchFailureCount:0,fetchFailureReason:null,fetchMeta:null!=(i=t.meta)?i:null,fetchStatus:(0,u.Kw)(this.options.networkMode)?"fetching":"paused",...!e.dataUpdatedAt&&{error:null,status:"loading"}};case"success":return{...e,data:t.data,dataUpdateCount:e.dataUpdateCount+1,dataUpdatedAt:null!=(n=t.dataUpdatedAt)?n:Date.now(),error:null,isInvalidated:!1,status:"success",...!t.manual&&{fetchStatus:"idle",fetchFailureCount:0,fetchFailureReason:null}};case"error":let r=t.error;if((0,u.DV)(r)&&r.revert&&this.revertState)return{...this.revertState,fetchStatus:"idle"};return{...e,error:r,errorUpdateCount:e.errorUpdateCount+1,errorUpdatedAt:Date.now(),fetchFailureCount:e.fetchFailureCount+1,fetchFailureReason:r,fetchStatus:"idle",status:"error"};case"invalidate":return{...e,isInvalidated:!0};case"setState":return{...e,...t.state}}})(this.state),a.V.batch(()=>{this.observers.forEach(e=>{e.onQueryUpdate(t)}),this.cache.notify({query:this,type:"updated",action:t})})}};var l=i(33989);let QueryCache=class QueryCache extends l.l{constructor(t){super(),this.config=t||{},this.queries=[],this.queriesMap={}}build(t,e,i){var n;let s=e.queryKey,a=null!=(n=e.queryHash)?n:(0,r.Rm)(s,e),u=this.get(a);return u||(u=new Query({cache:this,logger:t.getLogger(),queryKey:s,queryHash:a,options:t.defaultQueryOptions(e),state:i,defaultOptions:t.getQueryDefaults(s)}),this.add(u)),u}add(t){this.queriesMap[t.queryHash]||(this.queriesMap[t.queryHash]=t,this.queries.push(t),this.notify({type:"added",query:t}))}remove(t){let e=this.queriesMap[t.queryHash];e&&(t.destroy(),this.queries=this.queries.filter(e=>e!==t),e===t&&delete this.queriesMap[t.queryHash],this.notify({type:"removed",query:t}))}clear(){a.V.batch(()=>{this.queries.forEach(t=>{this.remove(t)})})}get(t){return this.queriesMap[t]}getAll(){return this.queries}find(t,e){let[i]=(0,r.I6)(t,e);return void 0===i.exact&&(i.exact=!0),this.queries.find(t=>(0,r._x)(i,t))}findAll(t,e){let[i]=(0,r.I6)(t,e);return Object.keys(i).length>0?this.queries.filter(t=>(0,r._x)(i,t)):this.queries}notify(t){a.V.batch(()=>{this.listeners.forEach(({listener:e})=>{e(t)})})}onFocus(){a.V.batch(()=>{this.queries.forEach(t=>{t.onFocus()})})}onOnline(){a.V.batch(()=>{this.queries.forEach(t=>{t.onOnline()})})}};var c=i(89886);let MutationCache=class MutationCache extends l.l{constructor(t){super(),this.config=t||{},this.mutations=[],this.mutationId=0}build(t,e,i){let n=new c.m({mutationCache:this,logger:t.getLogger(),mutationId:++this.mutationId,options:t.defaultMutationOptions(e),state:i,defaultOptions:e.mutationKey?t.getMutationDefaults(e.mutationKey):void 0});return this.add(n),n}add(t){this.mutations.push(t),this.notify({type:"added",mutation:t})}remove(t){this.mutations=this.mutations.filter(e=>e!==t),this.notify({type:"removed",mutation:t})}clear(){a.V.batch(()=>{this.mutations.forEach(t=>{this.remove(t)})})}getAll(){return this.mutations}find(t){return void 0===t.exact&&(t.exact=!0),this.mutations.find(e=>(0,r.X7)(t,e))}findAll(t){return this.mutations.filter(e=>(0,r.X7)(t,e))}notify(t){a.V.batch(()=>{this.listeners.forEach(({listener:e})=>{e(t)})})}resumePausedMutations(){var t;return this.resuming=(null!=(t=this.resuming)?t:Promise.resolve()).then(()=>{let t=this.mutations.filter(t=>t.state.isPaused);return a.V.batch(()=>t.reduce((t,e)=>t.then(()=>e.continue().catch(r.ZT)),Promise.resolve()))}).then(()=>{this.resuming=void 0}),this.resuming}};var h=i(15761),d=i(96474);function getNextPageParam(t,e){return null==t.getNextPageParam?void 0:t.getNextPageParam(e[e.length-1],e)}var f=i(85945);let ReactQueryDevtools=function(){return null};var y=i(85893);function ownKeys(t,e){var i=Object.keys(t);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(t);e&&(n=n.filter(function(e){return Object.getOwnPropertyDescriptor(t,e).enumerable})),i.push.apply(i,n)}return i}var p=new class{constructor(t={}){this.queryCache=t.queryCache||new QueryCache,this.mutationCache=t.mutationCache||new MutationCache,this.logger=t.logger||s._,this.defaultOptions=t.defaultOptions||{},this.queryDefaults=[],this.mutationDefaults=[],this.mountCount=0}mount(){this.mountCount++,1===this.mountCount&&(this.unsubscribeFocus=h.j.subscribe(()=>{h.j.isFocused()&&(this.resumePausedMutations(),this.queryCache.onFocus())}),this.unsubscribeOnline=d.N.subscribe(()=>{d.N.isOnline()&&(this.resumePausedMutations(),this.queryCache.onOnline())}))}unmount(){var t,e;this.mountCount--,0===this.mountCount&&(null==(t=this.unsubscribeFocus)||t.call(this),this.unsubscribeFocus=void 0,null==(e=this.unsubscribeOnline)||e.call(this),this.unsubscribeOnline=void 0)}isFetching(t,e){let[i]=(0,r.I6)(t,e);return i.fetchStatus="fetching",this.queryCache.findAll(i).length}isMutating(t){return this.mutationCache.findAll({...t,fetching:!0}).length}getQueryData(t,e){var i;return null==(i=this.queryCache.find(t,e))?void 0:i.state.data}ensureQueryData(t,e,i){let n=(0,r._v)(t,e,i),s=this.getQueryData(n.queryKey);return s?Promise.resolve(s):this.fetchQuery(n)}getQueriesData(t){return this.getQueryCache().findAll(t).map(({queryKey:t,state:e})=>{let i=e.data;return[t,i]})}setQueryData(t,e,i){let n=this.queryCache.find(t),s=null==n?void 0:n.state.data,a=(0,r.SE)(e,s);if(void 0===a)return;let u=(0,r._v)(t),o=this.defaultQueryOptions(u);return this.queryCache.build(this,o).setData(a,{...i,manual:!0})}setQueriesData(t,e,i){return a.V.batch(()=>this.getQueryCache().findAll(t).map(({queryKey:t})=>[t,this.setQueryData(t,e,i)]))}getQueryState(t,e){var i;return null==(i=this.queryCache.find(t,e))?void 0:i.state}removeQueries(t,e){let[i]=(0,r.I6)(t,e),n=this.queryCache;a.V.batch(()=>{n.findAll(i).forEach(t=>{n.remove(t)})})}resetQueries(t,e,i){let[n,s]=(0,r.I6)(t,e,i),u=this.queryCache,o={type:"active",...n};return a.V.batch(()=>(u.findAll(n).forEach(t=>{t.reset()}),this.refetchQueries(o,s)))}cancelQueries(t,e,i){let[n,s={}]=(0,r.I6)(t,e,i);void 0===s.revert&&(s.revert=!0);let u=a.V.batch(()=>this.queryCache.findAll(n).map(t=>t.cancel(s)));return Promise.all(u).then(r.ZT).catch(r.ZT)}invalidateQueries(t,e,i){let[n,s]=(0,r.I6)(t,e,i);return a.V.batch(()=>{var t,e;if(this.queryCache.findAll(n).forEach(t=>{t.invalidate()}),"none"===n.refetchType)return Promise.resolve();let i={...n,type:null!=(t=null!=(e=n.refetchType)?e:n.type)?t:"active"};return this.refetchQueries(i,s)})}refetchQueries(t,e,i){let[n,s]=(0,r.I6)(t,e,i),u=a.V.batch(()=>this.queryCache.findAll(n).filter(t=>!t.isDisabled()).map(t=>{var e;return t.fetch(void 0,{...s,cancelRefetch:null==(e=null==s?void 0:s.cancelRefetch)||e,meta:{refetchPage:n.refetchPage}})})),o=Promise.all(u).then(r.ZT);return null!=s&&s.throwOnError||(o=o.catch(r.ZT)),o}fetchQuery(t,e,i){let n=(0,r._v)(t,e,i),s=this.defaultQueryOptions(n);void 0===s.retry&&(s.retry=!1);let a=this.queryCache.build(this,s);return a.isStaleByTime(s.staleTime)?a.fetch(s):Promise.resolve(a.state.data)}prefetchQuery(t,e,i){return this.fetchQuery(t,e,i).then(r.ZT).catch(r.ZT)}fetchInfiniteQuery(t,e,i){let n=(0,r._v)(t,e,i);return n.behavior={onFetch:t=>{t.fetchFn=()=>{var e,i,n,r,s,a,u;let o;let l=null==(e=t.fetchOptions)?void 0:null==(i=e.meta)?void 0:i.refetchPage,c=null==(n=t.fetchOptions)?void 0:null==(r=n.meta)?void 0:r.fetchMore,h=null==c?void 0:c.pageParam,d=(null==c?void 0:c.direction)==="forward",f=(null==c?void 0:c.direction)==="backward",y=(null==(s=t.state.data)?void 0:s.pages)||[],p=(null==(a=t.state.data)?void 0:a.pageParams)||[],v=p,m=!1,addSignalProperty=e=>{Object.defineProperty(e,"signal",{enumerable:!0,get:()=>{var e,i;return null!=(e=t.signal)&&e.aborted?m=!0:null==(i=t.signal)||i.addEventListener("abort",()=>{m=!0}),t.signal}})},b=t.options.queryFn||(()=>Promise.reject("Missing queryFn for queryKey '"+t.options.queryHash+"'")),buildNewPages=(t,e,i,n)=>(v=n?[e,...v]:[...v,e],n?[i,...t]:[...t,i]),fetchPage=(e,i,n,r)=>{if(m)return Promise.reject("Cancelled");if(void 0===n&&!i&&e.length)return Promise.resolve(e);let s={queryKey:t.queryKey,pageParam:n,meta:t.options.meta};addSignalProperty(s);let a=b(s),u=Promise.resolve(a).then(t=>buildNewPages(e,n,t,r));return u};if(y.length){if(d){let e=void 0!==h,i=e?h:getNextPageParam(t.options,y);o=fetchPage(y,e,i)}else if(f){let e=void 0!==h,i=e?h:null==(u=t.options).getPreviousPageParam?void 0:u.getPreviousPageParam(y[0],y);o=fetchPage(y,e,i,!0)}else{v=[];let e=void 0===t.options.getNextPageParam,i=!l||!y[0]||l(y[0],0,y);o=i?fetchPage([],e,p[0]):Promise.resolve(buildNewPages([],p[0],y[0]));for(let i=1;i<y.length;i++)o=o.then(n=>{let r=!l||!y[i]||l(y[i],i,y);if(r){let r=e?p[i]:getNextPageParam(t.options,n);return fetchPage(n,e,r)}return Promise.resolve(buildNewPages(n,p[i],y[i]))})}}else o=fetchPage([]);let g=o.then(t=>({pages:t,pageParams:v}));return g}}},this.fetchQuery(n)}prefetchInfiniteQuery(t,e,i){return this.fetchInfiniteQuery(t,e,i).then(r.ZT).catch(r.ZT)}resumePausedMutations(){return this.mutationCache.resumePausedMutations()}getQueryCache(){return this.queryCache}getMutationCache(){return this.mutationCache}getLogger(){return this.logger}getDefaultOptions(){return this.defaultOptions}setDefaultOptions(t){this.defaultOptions=t}setQueryDefaults(t,e){let i=this.queryDefaults.find(e=>(0,r.yF)(t)===(0,r.yF)(e.queryKey));i?i.defaultOptions=e:this.queryDefaults.push({queryKey:t,defaultOptions:e})}getQueryDefaults(t){if(!t)return;let e=this.queryDefaults.find(e=>(0,r.to)(t,e.queryKey));return null==e?void 0:e.defaultOptions}setMutationDefaults(t,e){let i=this.mutationDefaults.find(e=>(0,r.yF)(t)===(0,r.yF)(e.mutationKey));i?i.defaultOptions=e:this.mutationDefaults.push({mutationKey:t,defaultOptions:e})}getMutationDefaults(t){if(!t)return;let e=this.mutationDefaults.find(e=>(0,r.to)(t,e.mutationKey));return null==e?void 0:e.defaultOptions}defaultQueryOptions(t){if(null!=t&&t._defaulted)return t;let e={...this.defaultOptions.queries,...this.getQueryDefaults(null==t?void 0:t.queryKey),...t,_defaulted:!0};return!e.queryHash&&e.queryKey&&(e.queryHash=(0,r.Rm)(e.queryKey,e)),void 0===e.refetchOnReconnect&&(e.refetchOnReconnect="always"!==e.networkMode),void 0===e.useErrorBoundary&&(e.useErrorBoundary=!!e.suspense),e}defaultMutationOptions(t){return null!=t&&t._defaulted?t:{...this.defaultOptions.mutations,...this.getMutationDefaults(null==t?void 0:t.mutationKey),...t,_defaulted:!0}}clear(){this.queryCache.clear(),this.mutationCache.clear()}},_app=function(t){var e=t.Component,i=t.pageProps;return(0,y.jsxs)(f.aH,{client:p,children:[(0,y.jsx)(e,function(t){for(var e=1;e<arguments.length;e++){var i=null!=arguments[e]?arguments[e]:{};e%2?ownKeys(Object(i),!0).forEach(function(e){(0,n.Z)(t,e,i[e])}):Object.getOwnPropertyDescriptors?Object.defineProperties(t,Object.getOwnPropertyDescriptors(i)):ownKeys(Object(i)).forEach(function(e){Object.defineProperty(t,e,Object.getOwnPropertyDescriptor(i,e))})}return t}({},i)),(0,y.jsx)(ReactQueryDevtools,{initialIsOpen:!1})]})}},6840:function(t,e,i){(window.__NEXT_P=window.__NEXT_P||[]).push(["/_app",function(){return i(3042)}])},19020:function(){},57070:function(){},15761:function(t,e,i){"use strict";i.d(e,{j:function(){return s}});var n=i(33989),r=i(32161);let FocusManager=class FocusManager extends n.l{constructor(){super(),this.setup=t=>{if(!r.sk&&window.addEventListener){let listener=()=>t();return window.addEventListener("visibilitychange",listener,!1),window.addEventListener("focus",listener,!1),()=>{window.removeEventListener("visibilitychange",listener),window.removeEventListener("focus",listener)}}}}onSubscribe(){this.cleanup||this.setEventListener(this.setup)}onUnsubscribe(){if(!this.hasListeners()){var t;null==(t=this.cleanup)||t.call(this),this.cleanup=void 0}}setEventListener(t){var e;this.setup=t,null==(e=this.cleanup)||e.call(this),this.cleanup=t(t=>{"boolean"==typeof t?this.setFocused(t):this.onFocus()})}setFocused(t){let e=this.focused!==t;e&&(this.focused=t,this.onFocus())}onFocus(){this.listeners.forEach(({listener:t})=>{t()})}isFocused(){return"boolean"==typeof this.focused?this.focused:"undefined"==typeof document||[void 0,"visible","prerender"].includes(document.visibilityState)}};let s=new FocusManager},30819:function(t,e,i){"use strict";i.d(e,{_:function(){return n}});let n=console},89886:function(t,e,i){"use strict";i.d(e,{R:function(){return getDefaultState},m:function(){return Mutation}});var n=i(30819),r=i(30081),s=i(89643),a=i(72379);let Mutation=class Mutation extends s.F{constructor(t){super(),this.defaultOptions=t.defaultOptions,this.mutationId=t.mutationId,this.mutationCache=t.mutationCache,this.logger=t.logger||n._,this.observers=[],this.state=t.state||getDefaultState(),this.setOptions(t.options),this.scheduleGc()}setOptions(t){this.options={...this.defaultOptions,...t},this.updateCacheTime(this.options.cacheTime)}get meta(){return this.options.meta}setState(t){this.dispatch({type:"setState",state:t})}addObserver(t){this.observers.includes(t)||(this.observers.push(t),this.clearGcTimeout(),this.mutationCache.notify({type:"observerAdded",mutation:this,observer:t}))}removeObserver(t){this.observers=this.observers.filter(e=>e!==t),this.scheduleGc(),this.mutationCache.notify({type:"observerRemoved",mutation:this,observer:t})}optionalRemove(){this.observers.length||("loading"===this.state.status?this.scheduleGc():this.mutationCache.remove(this))}continue(){var t,e;return null!=(t=null==(e=this.retryer)?void 0:e.continue())?t:this.execute()}async execute(){var t,e,i,n,r,s,u,o,l,c,h,d,f,y,p,v,m,b,g,C;let O="loading"===this.state.status;try{if(!O){this.dispatch({type:"loading",variables:this.options.variables}),await (null==(l=(c=this.mutationCache.config).onMutate)?void 0:l.call(c,this.state.variables,this));let t=await (null==(h=(d=this.options).onMutate)?void 0:h.call(d,this.state.variables));t!==this.state.context&&this.dispatch({type:"loading",context:t,variables:this.state.variables})}let f=await (()=>{var t;return this.retryer=(0,a.Mz)({fn:()=>this.options.mutationFn?this.options.mutationFn(this.state.variables):Promise.reject("No mutationFn found"),onFail:(t,e)=>{this.dispatch({type:"failed",failureCount:t,error:e})},onPause:()=>{this.dispatch({type:"pause"})},onContinue:()=>{this.dispatch({type:"continue"})},retry:null!=(t=this.options.retry)?t:0,retryDelay:this.options.retryDelay,networkMode:this.options.networkMode}),this.retryer.promise})();return await (null==(t=(e=this.mutationCache.config).onSuccess)?void 0:t.call(e,f,this.state.variables,this.state.context,this)),await (null==(i=(n=this.options).onSuccess)?void 0:i.call(n,f,this.state.variables,this.state.context)),await (null==(r=(s=this.mutationCache.config).onSettled)?void 0:r.call(s,f,null,this.state.variables,this.state.context,this)),await (null==(u=(o=this.options).onSettled)?void 0:u.call(o,f,null,this.state.variables,this.state.context)),this.dispatch({type:"success",data:f}),f}catch(t){try{throw await (null==(f=(y=this.mutationCache.config).onError)?void 0:f.call(y,t,this.state.variables,this.state.context,this)),await (null==(p=(v=this.options).onError)?void 0:p.call(v,t,this.state.variables,this.state.context)),await (null==(m=(b=this.mutationCache.config).onSettled)?void 0:m.call(b,void 0,t,this.state.variables,this.state.context,this)),await (null==(g=(C=this.options).onSettled)?void 0:g.call(C,void 0,t,this.state.variables,this.state.context)),t}finally{this.dispatch({type:"error",error:t})}}}dispatch(t){this.state=(e=>{switch(t.type){case"failed":return{...e,failureCount:t.failureCount,failureReason:t.error};case"pause":return{...e,isPaused:!0};case"continue":return{...e,isPaused:!1};case"loading":return{...e,context:t.context,data:void 0,failureCount:0,failureReason:null,error:null,isPaused:!(0,a.Kw)(this.options.networkMode),status:"loading",variables:t.variables};case"success":return{...e,data:t.data,failureCount:0,failureReason:null,error:null,status:"success",isPaused:!1};case"error":return{...e,data:void 0,error:t.error,failureCount:e.failureCount+1,failureReason:t.error,isPaused:!1,status:"error"};case"setState":return{...e,...t.state}}})(this.state),r.V.batch(()=>{this.observers.forEach(e=>{e.onMutationUpdate(t)}),this.mutationCache.notify({mutation:this,type:"updated",action:t})})}};function getDefaultState(){return{context:void 0,data:void 0,error:null,failureCount:0,failureReason:null,isPaused:!1,status:"idle",variables:void 0}}},30081:function(t,e,i){"use strict";i.d(e,{V:function(){return r}});var n=i(32161);let r=function(){let t=[],e=0,notifyFn=t=>{t()},batchNotifyFn=t=>{t()},schedule=i=>{e?t.push(i):(0,n.A4)(()=>{notifyFn(i)})},flush=()=>{let e=t;t=[],e.length&&(0,n.A4)(()=>{batchNotifyFn(()=>{e.forEach(t=>{notifyFn(t)})})})};return{batch:t=>{let i;e++;try{i=t()}finally{--e||flush()}return i},batchCalls:t=>(...e)=>{schedule(()=>{t(...e)})},schedule,setNotifyFunction:t=>{notifyFn=t},setBatchNotifyFunction:t=>{batchNotifyFn=t}}}()},96474:function(t,e,i){"use strict";i.d(e,{N:function(){return a}});var n=i(33989),r=i(32161);let s=["online","offline"];let OnlineManager=class OnlineManager extends n.l{constructor(){super(),this.setup=t=>{if(!r.sk&&window.addEventListener){let listener=()=>t();return s.forEach(t=>{window.addEventListener(t,listener,!1)}),()=>{s.forEach(t=>{window.removeEventListener(t,listener)})}}}}onSubscribe(){this.cleanup||this.setEventListener(this.setup)}onUnsubscribe(){if(!this.hasListeners()){var t;null==(t=this.cleanup)||t.call(this),this.cleanup=void 0}}setEventListener(t){var e;this.setup=t,null==(e=this.cleanup)||e.call(this),this.cleanup=t(t=>{"boolean"==typeof t?this.setOnline(t):this.onOnline()})}setOnline(t){let e=this.online!==t;e&&(this.online=t,this.onOnline())}onOnline(){this.listeners.forEach(({listener:t})=>{t()})}isOnline(){return"boolean"==typeof this.online?this.online:"undefined"==typeof navigator||void 0===navigator.onLine||navigator.onLine}};let a=new OnlineManager},89643:function(t,e,i){"use strict";i.d(e,{F:function(){return Removable}});var n=i(32161);let Removable=class Removable{destroy(){this.clearGcTimeout()}scheduleGc(){this.clearGcTimeout(),(0,n.PN)(this.cacheTime)&&(this.gcTimeout=setTimeout(()=>{this.optionalRemove()},this.cacheTime))}updateCacheTime(t){this.cacheTime=Math.max(this.cacheTime||0,null!=t?t:n.sk?1/0:3e5)}clearGcTimeout(){this.gcTimeout&&(clearTimeout(this.gcTimeout),this.gcTimeout=void 0)}}},72379:function(t,e,i){"use strict";i.d(e,{DV:function(){return isCancelledError},Kw:function(){return canFetch},Mz:function(){return createRetryer}});var n=i(15761),r=i(96474),s=i(32161);function defaultRetryDelay(t){return Math.min(1e3*2**t,3e4)}function canFetch(t){return(null!=t?t:"online")!=="online"||r.N.isOnline()}let CancelledError=class CancelledError{constructor(t){this.revert=null==t?void 0:t.revert,this.silent=null==t?void 0:t.silent}};function isCancelledError(t){return t instanceof CancelledError}function createRetryer(t){let e,i,a,u=!1,o=0,l=!1,c=new Promise((t,e)=>{i=t,a=e}),shouldPause=()=>!n.j.isFocused()||"always"!==t.networkMode&&!r.N.isOnline(),resolve=n=>{l||(l=!0,null==t.onSuccess||t.onSuccess(n),null==e||e(),i(n))},reject=i=>{l||(l=!0,null==t.onError||t.onError(i),null==e||e(),a(i))},pause=()=>new Promise(i=>{e=t=>{let e=l||!shouldPause();return e&&i(t),e},null==t.onPause||t.onPause()}).then(()=>{e=void 0,l||null==t.onContinue||t.onContinue()}),run=()=>{let e;if(!l){try{e=t.fn()}catch(t){e=Promise.reject(t)}Promise.resolve(e).then(resolve).catch(e=>{var i,n;if(l)return;let r=null!=(i=t.retry)?i:3,a=null!=(n=t.retryDelay)?n:defaultRetryDelay,c="function"==typeof a?a(o,e):a,h=!0===r||"number"==typeof r&&o<r||"function"==typeof r&&r(o,e);if(u||!h){reject(e);return}o++,null==t.onFail||t.onFail(o,e),(0,s.Gh)(c).then(()=>{if(shouldPause())return pause()}).then(()=>{u?reject(e):run()})})}};return canFetch(t.networkMode)?run():pause().then(run),{promise:c,cancel:e=>{l||(reject(new CancelledError(e)),null==t.abort||t.abort())},continue:()=>{let t=null==e?void 0:e();return t?c:Promise.resolve()},cancelRetry:()=>{u=!0},continueRetry:()=>{u=!1}}}},33989:function(t,e,i){"use strict";i.d(e,{l:function(){return Subscribable}});let Subscribable=class Subscribable{constructor(){this.listeners=new Set,this.subscribe=this.subscribe.bind(this)}subscribe(t){let e={listener:t};return this.listeners.add(e),this.onSubscribe(),()=>{this.listeners.delete(e),this.onUnsubscribe()}}hasListeners(){return this.listeners.size>0}onSubscribe(){}onUnsubscribe(){}}},32161:function(t,e,i){"use strict";i.d(e,{A4:function(){return scheduleMicrotask},G9:function(){return getAbortController},Gh:function(){return sleep},I6:function(){return parseFilterArgs},Kp:function(){return timeUntilStale},PN:function(){return isValidTimeout},Rm:function(){return hashQueryKeyByOptions},SE:function(){return functionalUpdate},VS:function(){return shallowEqualObjects},X7:function(){return matchMutation},ZT:function(){return noop},_v:function(){return parseQueryArgs},_x:function(){return matchQuery},lV:function(){return parseMutationArgs},oE:function(){return replaceData},sk:function(){return n},to:function(){return partialMatchKey},yF:function(){return hashQueryKey}});let n="undefined"==typeof window||"Deno"in window;function noop(){}function functionalUpdate(t,e){return"function"==typeof t?t(e):t}function isValidTimeout(t){return"number"==typeof t&&t>=0&&t!==1/0}function timeUntilStale(t,e){return Math.max(t+(e||0)-Date.now(),0)}function parseQueryArgs(t,e,i){return isQueryKey(t)?"function"==typeof e?{...i,queryKey:t,queryFn:e}:{...e,queryKey:t}:t}function parseMutationArgs(t,e,i){return isQueryKey(t)?"function"==typeof e?{...i,mutationKey:t,mutationFn:e}:{...e,mutationKey:t}:"function"==typeof t?{...e,mutationFn:t}:{...t}}function parseFilterArgs(t,e,i){return isQueryKey(t)?[{...e,queryKey:t},i]:[t||{},e]}function matchQuery(t,e){let{type:i="all",exact:n,fetchStatus:r,predicate:s,queryKey:a,stale:u}=t;if(isQueryKey(a)){if(n){if(e.queryHash!==hashQueryKeyByOptions(a,e.options))return!1}else{if(!partialDeepEqual(e.queryKey,a))return!1}}if("all"!==i){let t=e.isActive();if("active"===i&&!t||"inactive"===i&&t)return!1}return("boolean"!=typeof u||e.isStale()===u)&&(void 0===r||r===e.state.fetchStatus)&&(!s||!!s(e))}function matchMutation(t,e){let{exact:i,fetching:n,predicate:r,mutationKey:s}=t;if(isQueryKey(s)){if(!e.options.mutationKey)return!1;if(i){if(hashQueryKey(e.options.mutationKey)!==hashQueryKey(s))return!1}else{if(!partialDeepEqual(e.options.mutationKey,s))return!1}}return("boolean"!=typeof n||"loading"===e.state.status===n)&&(!r||!!r(e))}function hashQueryKeyByOptions(t,e){let i=(null==e?void 0:e.queryKeyHashFn)||hashQueryKey;return i(t)}function hashQueryKey(t){return JSON.stringify(t,(t,e)=>isPlainObject(e)?Object.keys(e).sort().reduce((t,i)=>(t[i]=e[i],t),{}):e)}function partialMatchKey(t,e){return partialDeepEqual(t,e)}function partialDeepEqual(t,e){return t===e||typeof t==typeof e&&!!t&&!!e&&"object"==typeof t&&"object"==typeof e&&!Object.keys(e).some(i=>!partialDeepEqual(t[i],e[i]))}function shallowEqualObjects(t,e){if(t&&!e||e&&!t)return!1;for(let i in t)if(t[i]!==e[i])return!1;return!0}function isPlainArray(t){return Array.isArray(t)&&t.length===Object.keys(t).length}function isPlainObject(t){if(!hasObjectPrototype(t))return!1;let e=t.constructor;if(void 0===e)return!0;let i=e.prototype;return!!(hasObjectPrototype(i)&&i.hasOwnProperty("isPrototypeOf"))}function hasObjectPrototype(t){return"[object Object]"===Object.prototype.toString.call(t)}function isQueryKey(t){return Array.isArray(t)}function sleep(t){return new Promise(e=>{setTimeout(e,t)})}function scheduleMicrotask(t){sleep(0).then(t)}function getAbortController(){if("function"==typeof AbortController)return new AbortController}function replaceData(t,e,i){return null!=i.isDataEqual&&i.isDataEqual(t,e)?t:"function"==typeof i.structuralSharing?i.structuralSharing(t,e):!1!==i.structuralSharing?function replaceEqualDeep(t,e){if(t===e)return t;let i=isPlainArray(t)&&isPlainArray(e);if(i||isPlainObject(t)&&isPlainObject(e)){let n=i?t.length:Object.keys(t).length,r=i?e:Object.keys(e),s=r.length,a=i?[]:{},u=0;for(let n=0;n<s;n++){let s=i?n:r[n];a[s]=replaceEqualDeep(t[s],e[s]),a[s]===t[s]&&u++}return n===s&&u===n?t:a}return e}(t,e):e}},85945:function(t,e,i){"use strict";i.d(e,{NL:function(){return useQueryClient},aH:function(){return QueryClientProvider}});var n=i(67294);let r=n.createContext(void 0),s=n.createContext(!1);function getQueryClientContext(t,e){return t||(e&&"undefined"!=typeof window?(window.ReactQueryClientContext||(window.ReactQueryClientContext=r),window.ReactQueryClientContext):r)}let useQueryClient=({context:t}={})=>{let e=n.useContext(getQueryClientContext(t,n.useContext(s)));if(!e)throw Error("No QueryClient set, use QueryClientProvider to set one");return e},QueryClientProvider=({client:t,children:e,context:i,contextSharing:r=!1})=>{n.useEffect(()=>(t.mount(),()=>{t.unmount()}),[t]);let a=getQueryClientContext(i,r);return n.createElement(s.Provider,{value:!i&&r},n.createElement(a.Provider,{value:t},e))}},59499:function(t,e,i){"use strict";function _defineProperty(t,e,i){return e in t?Object.defineProperty(t,e,{value:i,enumerable:!0,configurable:!0,writable:!0}):t[e]=i,t}i.d(e,{Z:function(){return _defineProperty}})}},function(t){var __webpack_exec__=function(e){return t(t.s=e)};t.O(0,[9774,179],function(){return __webpack_exec__(6840),__webpack_exec__(27985)}),_N_E=t.O()}]);