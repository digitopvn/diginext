(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[4467],{67284:function(e,t,n){"use strict";n.d(t,{Z:function(){return s}});var i=n(30001),r=n(50959),a={icon:{tag:"svg",attrs:{viewBox:"64 64 896 896",focusable:"false"},children:[{tag:"path",attrs:{d:"M257.7 752c2 0 4-.2 6-.5L431.9 722c2-.4 3.9-1.3 5.3-2.8l423.9-423.9a9.96 9.96 0 000-14.1L694.9 114.9c-1.9-1.9-4.4-2.9-7.1-2.9s-5.2 1-7.1 2.9L256.8 538.8c-1.5 1.5-2.4 3.3-2.8 5.3l-29.5 168.2a33.5 33.5 0 009.4 29.8c6.6 6.4 14.9 9.9 23.8 9.9zm67.4-174.4L687.8 215l73.3 73.3-362.7 362.6-88.9 15.7 15.6-89zM880 836H144c-17.7 0-32 14.3-32 32v36c0 4.4 3.6 8 8 8h784c4.4 0 8-3.6 8-8v-36c0-17.7-14.3-32-32-32z"}}]},name:"edit",theme:"outlined"},o=n(47855),l=function(e,t){return r.createElement(o.Z,(0,i.Z)((0,i.Z)({},e),{},{ref:t,icon:a}))};l.displayName="EditOutlined";var s=r.forwardRef(l)},43397:function(e,t,n){(window.__NEXT_P=window.__NEXT_P||[]).push(["/framework",function(){return n(40023)}])},40023:function(e,t,n){"use strict";n.r(t),n.d(t,{default:function(){return E}});var i,r=n(11527),a=n(18820),o=n(67284),l=n(2164),s=n(59701),d=n(30388),c=n(64686),u=n(71370),f=n(69786),m=n(47749),x=n(48880),h=n(74637),g=n.n(h),w=n(50959),v=n(2765),k=n(14149),p=n(32352),j=n(81035),y=n(2513);let Z=n(64814),_=n(54498);g().extend(_),g().extend(Z);let C=[{title:"Name",width:70,dataIndex:"name",key:"name",fixed:"left",filterSearch:!0,filters:[{text:"goon",value:"goon"}],onFilter:(e,t)=>!t.name||t.name.indexOf(e.toString())>-1},{title:"Git",width:60,dataIndex:"git",key:"git",render(e,t){var n,i;return(0,r.jsx)(r.Fragment,{children:(null===(n=t.git)||void 0===n?void 0:n.name)?(0,r.jsx)(c.ZP,{type:"link",style:{padding:0},children:null===(i=t.git)||void 0===i?void 0:i.name}):(0,r.jsx)(c.ZP,{type:"link",style:{padding:0},children:t.gitProvider})})},filterSearch:!0,filters:[{text:"goon",value:"goon"}],onFilter:(e,t)=>!t.git||(t.git.name||"").indexOf(e.toString())>-1},{title:"Version",dataIndex:"version",key:"version",width:30},{title:"Created by",dataIndex:"owner",key:"owner",width:50,filterSearch:!0,filters:[{text:"goon",value:"goon"}],onFilter:(e,t)=>!t.owner||(t.owner.name||"").toLowerCase().indexOf(e.toString())>-1,render:(e,t)=>(0,r.jsx)(r.Fragment,{children:t.owner.name})},{title:"Created at",dataIndex:"createdAt",key:"createdAt",width:50,render:e=>(0,r.jsx)(k.q,{date:e}),sorter:(e,t)=>g()(e.createdAt).diff(g()(t.createdAt))},{title:"Action",key:"action",width:50,fixed:"right",render:(e,t)=>t.actions}],b=null!==(i=y.XL.tableConfig.defaultPageSize)&&void 0!==i?i:20,N=()=>{let[e,t]=(0,w.useState)(1),{data:n,status:i}=(0,v.Dh)({populate:"git,owner",pagination:{page:e,size:b}}),{list:a,pagination:h}=n||{},{total_items:g}=h||{};console.log("frameworks :>> ",a);let[k]=(0,v.mt)(),[y,{setQuery:Z}]=(0,j.o)(),_=async e=>{let t=await k({_id:e});(null==t?void 0:t.status)&&u.ZP.success({message:"Item deleted successfully."})},N=(null==a?void 0:a.map(e=>({...e,actions:(0,r.jsxs)(f.Z.Compact,{children:[(0,r.jsx)(c.ZP,{icon:(0,r.jsx)(o.Z,{}),onClick:()=>Z({lv1:"edit",type:"framework",framework_slug:e.slug})}),(0,r.jsx)(m.Z,{title:"Are you sure to delete this framework?",description:(0,r.jsx)("span",{className:"text-red-500",children:"Caution: this is permanent and cannot be rolled back."}),onConfirm:()=>_(e._id),okText:"Yes",cancelText:"No",children:(0,r.jsx)(c.ZP,{icon:(0,r.jsx)(l.Z,{})})})]})})))||[],P=e=>{let{current:n}=e;n&&t(n)},S=(0,w.useRef)(null),F=(0,d.Z)(S);return(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)(p.V,{title:"Frameworks",breadcrumbs:[{name:"Workspace"}],actions:[(0,r.jsx)(c.ZP,{type:"default",icon:(0,r.jsx)(s.Z,{className:"align-middle"}),onClick:()=>Z({lv1:"new",type:"framework"}),children:"New"},"workspace-setting-btn")]}),(0,r.jsx)("div",{className:"h-full flex-auto overflow-hidden",ref:S,children:(0,r.jsx)(x.Z,{size:"small",loading:"loading"===i,columns:C,dataSource:N,scroll:{x:1200,y:void 0!==(null==F?void 0:F.height)?F.height-140:void 0},sticky:!0,pagination:{pageSize:b,total:g,position:["bottomCenter"]},onChange:P})})]})};var P=n(46761),S=n(10769);let F=()=>{let[e,{setQuery:t}]=(0,j.o)();return(0,r.jsx)(a.Wk,{children:(0,r.jsx)(P.o,{meta:(0,r.jsx)(S.h,{title:"Frameworks",description:"The collection of boilerplate frameworks to start new project."}),children:(0,r.jsx)(N,{})})})};var E=F}},function(e){e.O(0,[8201,8564,2967,1003,7500,5371,9774,2888,179],function(){return e(e.s=43397)}),_N_E=e.O()}]);