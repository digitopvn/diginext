(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[3523],{53759:function(e,l,t){(window.__NEXT_P=window.__NEXT_P||[]).push(["/deploy",function(){return t(48337)}])},8145:function(e,l,t){"use strict";var i=t(11527),a=t(76806),s=t(50959),o=t(1030);let n=e=>{let l=(0,a.useRouter)(),{isDarkMode:t}=(0,o.vs)(),[n,r]=(0,s.useState)("".concat(l.basePath,"/assets/images/diginext_logo_white.svg"));return(0,s.useEffect)(()=>{r(t?"".concat(l.basePath,"/assets/images/diginext_logo_white.svg"):"".concat(l.basePath,"/assets/images/diginext_logo.svg"))},[t]),(0,i.jsxs)("div",{className:"text-center",children:[(0,i.jsx)("div",{className:"mx-auto my-5 w-64 text-center ".concat(e.className||""),children:(0,i.jsx)("img",{src:n,alt:"DXUP Logo",className:"inline-block"})}),e.useTagline&&(0,i.jsx)("div",{className:"mb-6",children:"Build faster. Deploy easier. More flexible."})]})};l.Z=n},48337:function(e,l,t){"use strict";t.r(l),t.d(l,{default:function(){return T}});var i=t(11527),a=t(79789),s=t.n(a),o=t(18820),n=t(25616),r=t(8145),d=t(88383),c=t(9853),u=t(64378),p=t(35666),v=t(37528),m=t(27899),h=t(31494),g=t(73162),x=t(57237),j=t(90800),f=t(64686),b=t(32699),y=t(50959),w=t(43008),S=t(29834),Z=t(92961),N=t(70297),P=t(85410),C=t(11942),_=t(92931),L=t(95706),E=t(81035);let k=e=>{var l,t,a,s,o,n,r;let{className:k=""}=e,{token:{colorBgContainer:D}}=p.Z.useToken(),[I]=v.Z.useForm(),[R,{setQuery:T}]=(0,E.o)(),{project:V,app:q,env:B,registry:F,cluster:O,build:H,branch:z,port:U}=R,[X,G]=(0,y.useState)(),[M,A]=(0,y.useState)(),[W,Y]=(0,y.useState)(),[J,K]=(0,y.useState)(),[Q,$]=(0,y.useState)(),{data:{list:ee=[]}={},status:el}=(0,C.BT)({populate:"owner",pagination:{page:1,size:100}}),{data:{list:et}={}}=(0,w.VD)(),{data:{list:ei}={}}=(0,_.fy)(),{data:{list:ea}={}}=(0,Z.x7)(),{data:{list:es}={}}=(0,S.BY)({filter:{appSlug:null==X?void 0:X.slug}}),[eo,en]=(0,N._q)(),er=(0,L.t1)((null==X?void 0:null===(l=X.git)||void 0===l?void 0:l.repoSSH)||""),{data:{list:ed}={}}=(0,P.Td)(er.repoSlug||"",{enabled:void 0!==er.repoSlug&&void 0!==(null==X?void 0:X.gitProvider),filter:{_id:null==X?void 0:X.gitProvider}}),ec=(0,b.flatMap)(ee,"apps"),eu=async e=>{console.log("Submit:",e),eo({appSlug:e.app,gitBranch:e.gitBranch,deployParams:{env:e.env,cluster:e.cluster,registry:e.registry}}).then(e=>{var l,t;console.log("res.data?.logURL :>> ",null===(l=e.data)||void 0===l?void 0:l.logURL),$(null===(t=e.data)||void 0===t?void 0:t.logURL)})},ep=e=>{console.log("Failed:",e)};return(0,i.jsxs)(m.Z,{bordered:!1,title:(0,i.jsx)(h.Z.Title,{level:4,className:"!mb-0 text-center",children:"success"===en?"A deployment is being processed!":"loading"===en?"Processing...":"Deploy your app"}),children:["loading"===en&&(0,i.jsx)(d.Z,{}),"success"!==en?(0,i.jsxs)(v.Z,{className:["h-full","overflow-x-hidden",k].join(" "),layout:"vertical",form:I,onFinish:eu,onFinishFailed:ep,autoComplete:"off",children:[(0,i.jsx)(v.Z.Item,{name:"app",rules:[{required:!0,message:"Please select app."}],className:"mb-2",initialValue:q,children:(0,i.jsx)(g.Z,{placeholder:"Select app",onSelect(e){let l=ec.find(l=>l.slug===e);G(l)},showSearch:!0,filterOption:(e,l)=>(null!==(a=null==l?void 0:l.label)&&void 0!==a?a:"").toLowerCase().includes(e.toLowerCase()),options:null==ee?void 0:ee.map(e=>{var l;return{label:e.name,options:null===(l=e.apps)||void 0===l?void 0:l.map(e=>({label:e.name,value:e.slug}))}})})}),(0,i.jsx)(v.Z.Item,{name:"env",label:"Deploy environment",rules:[{required:!0,message:"Please select deploy environment."}],className:"mb-2",initialValue:B,children:(0,i.jsxs)(x.ZP.Group,{onChange(e){K(e.target.value),Y(((null==X?void 0:X.deployEnvironment)||{})[e.target.value])},children:[(0,i.jsx)(x.ZP,{value:"dev",children:"dev"}),(0,i.jsx)(x.ZP,{value:"prod",children:"prod"}),(0,i.jsx)(x.ZP,{value:"other",children:"other"===J?(0,i.jsx)(j.Z,{style:{width:100,marginLeft:10},onChange(e){Y(((null==X?void 0:X.deployEnvironment)||{})[e.target.value])}}):(0,i.jsx)(i.Fragment,{children:"+ other"})})]})}),(0,i.jsx)(v.Z.Item,{name:"registry",rules:[{required:!0,message:"Please select container registry."}],className:"mb-2",initialValue:(null==W?void 0:W.registry)||F||(null===(t=(ei||[])[0])||void 0===t?void 0:t.slug),children:(0,i.jsx)(g.Z,{placeholder:"Container registry",showSearch:!0,filterOption:(e,l)=>(null!==(s=null==l?void 0:l.label)&&void 0!==s?s:"").toLowerCase().includes(e.toLowerCase()),options:null==ei?void 0:ei.map(e=>({label:e.name,value:e.slug})),onSelect:e=>console.log("Select container registry > value :>> ",e)})}),(0,i.jsx)(v.Z.Item,{name:"cluster",rules:[{required:!0,message:"Please select cluster."}],className:"mb-2",initialValue:O,children:(0,i.jsx)(g.Z,{placeholder:"Cluster",showSearch:!0,filterOption:(e,l)=>(null!==(o=null==l?void 0:l.label)&&void 0!==o?o:"").toLowerCase().includes(e.toLowerCase()),options:null==ea?void 0:ea.map(e=>({label:e.name,value:e.shortName}))})}),(0,i.jsx)(v.Z.Item,{name:"build",className:"mb-2",children:(0,i.jsx)(g.Z,{placeholder:"Start new build",showSearch:!0,filterOption:(e,l)=>(null!==(n=null==l?void 0:l.label)&&void 0!==n?n:"").toLowerCase().includes(e.toLowerCase()),options:[{label:"Start new build",value:"new"},...(null==es?void 0:es.map(e=>({label:e.name,value:e.slug})))||[]],onSelect:e=>A(null==es?void 0:es.find(l=>l.slug===e))})}),void 0===M?(0,i.jsxs)("div",{className:"grid grid-cols-2 gap-2",children:[(0,i.jsx)(v.Z.Item,{name:"gitBranch",rules:[{required:!0,message:"Please git branch."}],initialValue:"main",children:(0,i.jsx)(g.Z,{placeholder:"Git branch",showSearch:!0,filterOption:(e,l)=>(null!==(r=null==l?void 0:l.label)&&void 0!==r?r:"").toLowerCase().includes(e.toLowerCase()),options:null==ed?void 0:ed.map(e=>({label:e.name,value:e.name}))})}),(0,i.jsx)(v.Z.Item,{name:"port",rules:[{required:!0,message:"Please enter exposed port."}],initialValue:(null==W?void 0:W.port)||U||"3000",children:(0,i.jsx)(j.Z,{placeholder:"Port",autoComplete:"off",autoCorrect:"off",autoCapitalize:"off"})})]}):(0,i.jsx)(i.Fragment,{}),(0,i.jsx)(v.Z.Item,{style:{marginBottom:0},className:"text-center",children:(0,i.jsx)(f.ZP,{type:"primary",htmlType:"submit",icon:(0,i.jsx)(c.Z,{}),size:"large",shape:"round",children:"Deploy Now"})})]}):(0,i.jsx)("div",{className:"text-center",children:(0,i.jsx)(f.ZP,{href:Q,icon:(0,i.jsx)(u.Z,{}),size:"large",shape:"round",children:"View build logs"})})]})};var D=t(46761),I=t(10769);let R=()=>(0,i.jsx)(o.Wk,{children:(0,i.jsx)(D.o,{useSidebar:!1,meta:(0,i.jsx)(I.h,{title:"Deploy Now",description:"Deploy your application to target environment."}),children:(0,i.jsxs)(n.Z,{className:"max-w-md ",children:[(0,i.jsx)(s(),{href:"/",children:(0,i.jsx)(r.Z,{})}),(0,i.jsx)(k,{})]})})});var T=R},95706:function(e,l,t){"use strict";function i(e){var l,t,i,a;let s,o,n,r;if(!e)return{};try{s=null===(l=e.split(":")[1])||void 0===l?void 0:l.split("/")[0]}catch(d){throw Error("Repository SSH (".concat(e,") is invalid"))}try{o=null===(t=null===(i=e.split(":")[1])||void 0===i?void 0:i.split("/")[1])||void 0===t?void 0:t.split(".")[0]}catch(c){throw Error("Repository SSH (".concat(e,") is invalid"))}try{n=null===(a=e.split(":")[0])||void 0===a?void 0:a.split("@")[1]}catch(u){throw Error("Repository SSH (".concat(e,") is invalid"))}try{r=null==n?void 0:n.split(".")[0]}catch(p){throw Error("Repository SSH (".concat(e,") is invalid"))}let v="".concat(s,"/").concat(o);return{namespace:s,repoSlug:o,fullSlug:v,gitDomain:n,gitProvider:r}}t.d(l,{t1:function(){return i}}),t(32699)}},function(e){e.O(0,[8201,8564,2967,1003,9521,5371,9774,2888,179],function(){return e(e.s=53759)}),_N_E=e.O()}]);