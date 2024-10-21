(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[662],{6800:function(e,i,s){(window.__NEXT_P=window.__NEXT_P||[]).push(["/settings",function(){return s(85399)}])},4514:function(e,i,s){"use strict";s.d(i,{Hg:function(){return o},av:function(){return n},d1:function(){return a},hv:function(){return t}});var l=s(84886);let n=e=>(0,l.FF)(["workspaces"],"/api/v1/workspace",e),t=e=>(0,l.yt)(["workspaces"],"/api/v1/workspace",e),o=e=>(0,l.FF)(["workspaces","invite"],"/api/v1/workspace/invite",e),a=()=>(0,l.FF)(["workspaces","test-upload"],"/api/v1/workspace/test-cloud-storage")},85399:function(e,i,s){"use strict";s.r(i),s.d(i,{default:function(){return O}});var l=s(11527),n=s(18820),t=s(32352),o=s(65338),a=s(47749),r=s(64686);let d=()=>(0,l.jsx)(a.Z,{title:"Are you sure?",description:"This action cannot be undone.",placement:"bottomRight",children:(0,l.jsx)(r.ZP,{type:"default",danger:!0,icon:(0,l.jsx)(o.Z,{className:"align-middle"}),children:"Destroy"})});var u=s(73611),c=s(69786),v=s(31494),p=s(91273),g=s(50959),x=s(4514),h=s(2186);let j=()=>{let e=u.Z.useApp(),i=(0,h.c)(),[s,n]=(0,g.useState)(null==i?void 0:i.public),[t,o]=(0,x.hv)({filter:{_id:null==i?void 0:i._id}}),a=async s=>{let l=await t({public:s});(null==l?void 0:l.status)&&(n(s),e.notification.success({message:"Congrats!",description:'Made "'.concat(null==i?void 0:i.name,'" workspace ').concat(s?"PUBLIC":"PRIVATE"," successfully.")}))};return(0,l.jsxs)(c.Z,{direction:"horizontal",size:6,children:[(0,l.jsx)(v.Z.Title,{level:5,style:{marginBottom:0},children:"Public"}),(0,l.jsx)(p.Z,{checked:s,onChange:a,loading:"loading"===o})]})};var m=s(27899),Z=s(56070),k=s(24695),_=s(74637),y=s.n(_),f=s(85410),b=s(84886);let w=e=>(0,b.wz)(["users","list"],"/api/v1/api_key",e);var C=s(99657),F=s(88383),q=s(37528),I=s(73162),E=s(90800);let S=["cloudflare","aws_s3","do_space","google"],P=()=>{var e,i,s,n,t,o,a,d,c,v,p,j,m,Z,k,_,y;let f=(0,h.c)(),{message:b}=u.Z.useApp(),[w]=q.Z.useForm(),[C,P]=(0,x.hv)({filter:{_id:null==f?void 0:f._id},enabled:!!(null==f?void 0:f._id)}),[V,K]=(0,x.d1)(),N=async e=>{console.log(e);try{await (null==C?void 0:C({"settings.cloud_storage":e})),b.success("Cloud storage updated successfully")}catch(i){console.error(i),b.error("Failed to update cloud storage")}},T=e=>{console.log("Failed:",e)};return(0,g.useEffect)(()=>{},[]),(0,l.jsx)("div",{children:(0,l.jsxs)(q.Z,{form:w,labelCol:{span:8},wrapperCol:{span:16},className:"max-w-xl",onFinish:N,onFinishFailed:T,children:[(0,l.jsx)(q.Z.Item,{label:"Cloud Storage",name:"provider",rules:[{required:!0,message:"Cloud Storage is required"}],initialValue:null==f?void 0:null===(e=f.settings)||void 0===e?void 0:null===(i=e.cloud_storage)||void 0===i?void 0:i.provider,children:(0,l.jsx)(I.Z,{options:S.map(e=>({label:e,value:e}))})}),(0,l.jsx)(q.Z.Item,{label:"Access Key",name:"accessKey",rules:[{required:!0,message:"Access Key is required"}],initialValue:null==f?void 0:null===(s=f.settings)||void 0===s?void 0:null===(n=s.cloud_storage)||void 0===n?void 0:n.accessKey,children:(0,l.jsx)(E.Z,{type:"password"})}),(0,l.jsx)(q.Z.Item,{label:"Secret Key",name:"secretKey",rules:[{required:!0,message:"Secret Key is required"}],initialValue:null==f?void 0:null===(t=f.settings)||void 0===t?void 0:null===(o=t.cloud_storage)||void 0===o?void 0:o.secretKey,children:(0,l.jsx)(E.Z,{type:"password"})}),(0,l.jsx)(q.Z.Item,{label:"Bucket",name:"bucket",rules:[{required:!0,message:"Bucket is required"}],initialValue:null==f?void 0:null===(a=f.settings)||void 0===a?void 0:null===(d=a.cloud_storage)||void 0===d?void 0:d.bucket,children:(0,l.jsx)(E.Z,{})}),(0,l.jsx)(q.Z.Item,{label:"Region",name:"region",initialValue:null==f?void 0:null===(c=f.settings)||void 0===c?void 0:null===(v=c.cloud_storage)||void 0===v?void 0:v.region,children:(0,l.jsx)(E.Z,{})}),(0,l.jsx)(q.Z.Item,{label:"Origin Endpoint",name:"endpoint",rules:[{required:!0,message:"Origin Endpoint is required"}],initialValue:null==f?void 0:null===(p=f.settings)||void 0===p?void 0:null===(j=p.cloud_storage)||void 0===j?void 0:j.endpoint,children:(0,l.jsx)(E.Z,{})}),(0,l.jsx)(q.Z.Item,{label:"Base URL",name:"baseUrl",rules:[{required:!0,message:"Base URL is required"}],initialValue:null==f?void 0:null===(m=f.settings)||void 0===m?void 0:null===(Z=m.cloud_storage)||void 0===Z?void 0:Z.baseUrl,children:(0,l.jsx)(E.Z,{})}),(0,l.jsx)(q.Z.Item,{label:"Base Path",name:"basePath",initialValue:null!==(y=null==f?void 0:null===(k=f.settings)||void 0===k?void 0:null===(_=k.cloud_storage)||void 0===_?void 0:_.basePath)&&void 0!==y?y:"",children:(0,l.jsx)(E.Z,{})}),(0,l.jsx)(q.Z.Item,{wrapperCol:{offset:8,span:16},children:(0,l.jsx)(r.ZP,{type:"primary",htmlType:"submit",children:"loading"===P?(0,l.jsxs)(l.Fragment,{children:[(0,l.jsx)(F.Z,{})," Saving..."]}):"Save"})})]})})},V=s(64814),K=s(54498);y().extend(K),y().extend(V);let N=()=>{let e=(0,h.c)(),{data:{list:i=[]}={list:[]}}=w(),{data:s}=(0,f.sc)();return(0,l.jsxs)("div",{className:"px-4 py-6",children:[(0,l.jsxs)(v.Z.Title,{children:[null==e?void 0:e.name," Workspace"]}),(0,l.jsx)(m.Z,{title:"DX_KEY",children:(0,l.jsx)("div",{children:(0,l.jsx)(C.Z,{mode:"inline",value:(null==e?void 0:e.dx_key)||""})},"dx-key")}),(0,l.jsx)(Z.Z,{dashed:!0}),i.length>0&&(0,l.jsx)(k.Z,{dataSource:i,renderItem(e,i){let{name:s,email:n,token:{access_token:t}={access_token:""}}=e;return(0,l.jsx)(m.Z,{title:s,children:(0,l.jsx)("div",{children:(0,l.jsx)(C.Z,{type:"password",mode:"inline",value:t})},"api-key-".concat(t))})}}),(0,l.jsx)(Z.Z,{dashed:!0}),(0,l.jsx)(m.Z,{title:"CLOUD STORAGE",children:(0,l.jsx)("div",{children:(0,l.jsx)(P,{})},"cloud-storage")})]})};var T=s(64060),A=s(10769);let B=()=>(0,l.jsx)(n.Wk,{children:(0,l.jsxs)(T.o,{meta:(0,l.jsx)(A.h,{title:"Settings",description:"Workspace's configuration."}),children:[(0,l.jsx)(t.V,{title:"Workspace Settings",breadcrumbs:[{name:"Workspace"}],actions:[(0,l.jsx)(j,{},"workspace-privacy-switch"),(0,l.jsx)(d,{},"destroy-workspace-button")]}),(0,l.jsx)(N,{})]})});var O=B},2186:function(e,i,s){"use strict";s.d(i,{c:function(){return n}});var l=s(18820);let n=function(){arguments.length>0&&void 0!==arguments[0]&&arguments[0];let[e]=(0,l.aC)();return null==e?void 0:e.activeWorkspace}}},function(e){e.O(0,[8201,8564,2967,1003,1203,2982,299,9774,2888,179],function(){return e(e.s=6800)}),_N_E=e.O()}]);