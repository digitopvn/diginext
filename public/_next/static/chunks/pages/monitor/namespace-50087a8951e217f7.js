(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[1956],{82526:function(e,t,n){(window.__NEXT_P=window.__NEXT_P||[]).push(["/monitor/namespace",function(){return n(23506)}])},22923:function(e,t,n){"use strict";n.d(t,{T:function(){return i},Y:function(){return l}});var a=n(84886);let i=e=>(0,a.wz)(["monitor-namespace","list"],"/api/v1/monitor/namespaces",e),l=e=>(0,a.TV)(["monitor-namespace","delete"],"/api/v1/monitor/namespaces",e)},23506:function(e,t,n){"use strict";n.r(t),n.d(t,{default:function(){return b}});var a=n(11527),i=n(18820),l=n(2164),r=n(30388),o=n(64686),d=n(31494),s=n(69786),c=n(47749),u=n(48880),m=n(74637),v=n.n(m),x=n(79789),f=n.n(x),h=n(50959),p=n(92961),g=n(22923),j=n(14149),k=n(32352),S=n(81035),w=n(45581);let N=n(64814),_=n(54498);v().extend(_),v().extend(N);let T=()=>{var e;let{responsive:t}=(0,w.Jl)(),[n,{setQuery:i}]=(0,S.o)(),{cluster:m}=n,{data:x,status:N}=(0,p.x7)(),{list:_=[]}=x||{},[T,y]=(0,h.useState)(0),[C,Z]=(0,h.useState)(1),{data:b,status:E}=(0,g.T)({filter:{cluster:m}}),{list:A,pagination:O}=b||{},{total_items:P}=O||{},[z,F]=(0,g.Y)(),I=(e,t)=>{var n,a;let{current:i}=e;y(null!==(a=null===(n=t.currentDataSource)||void 0===n?void 0:n.length)&&void 0!==a?a:0),i&&Z(i)};(0,h.useEffect)(()=>y(null!==(e=null==A?void 0:A.length)&&void 0!==e?e:0),[A]);let Y=[{title:"Name",width:60,dataIndex:"name",key:"name",fixed:(null==t?void 0:t.md)?"left":void 0,filterSearch:!0,render(e,t){var n,i;return(0,a.jsx)(f(),{href:"/monitor/namespace/resources?cluster=".concat(t.clusterSlug,"&namespace=").concat(null===(n=t.metadata)||void 0===n?void 0:n.name),children:null===(i=t.metadata)||void 0===i?void 0:i.name})},filters:null==A?void 0:A.map(e=>{var t,n;return{text:(null===(t=e.metadata)||void 0===t?void 0:t.name)||"",value:(null===(n=e.metadata)||void 0===n?void 0:n.name)||""}}),onFilter(e,t){var n,a;return null===(n=t.metadata)||void 0===n||!n.name||(null===(a=t.metadata)||void 0===a?void 0:a.name.indexOf(e.toString()))>-1}},{title:"Cluster",dataIndex:"clusterSlug",key:"clusterSlug",width:30,render:e=>(0,a.jsx)(o.ZP,{type:"link",style:{padding:0},onClick(t){i({...n,cluster:e})},children:e}),filterSearch:!0,filters:_.map(e=>({text:e.slug||"",value:e.slug||""})),onFilter:(e,t)=>!t.clusterSlug||t.clusterSlug.indexOf(e.toString())>-1},{title:"Created at",dataIndex:"createdAt",key:"createdAt",width:30,render(e,t){var n;return(0,a.jsx)(j.q,{date:null===(n=t.metadata)||void 0===n?void 0:n.creationTimestamp})},sorter(e,t){var n,a;return v()(null===(n=e.metadata)||void 0===n?void 0:n.creationTimestamp).diff(v()(null===(a=t.metadata)||void 0===a?void 0:a.creationTimestamp))}},{title:(0,a.jsx)(d.Z.Text,{className:"text-xs md:text-sm",children:"Action"}),key:"action",fixed:"right",width:(null==t?void 0:t.md)?30:26,render:(e,t)=>t.actions}],V=(null==A?void 0:A.map((e,t)=>({...e,key:"ns-".concat(t),actions:(0,a.jsx)(s.Z.Compact,{children:(0,a.jsx)(c.Z,{title:"Are you sure to delete this item?",description:(0,a.jsx)("span",{className:"text-red-500",children:"Caution: this is permanent and cannot be rolled back."}),onConfirm(){var t;return z({cluster:e.cluster,name:null===(t=e.metadata)||void 0===t?void 0:t.name})},okText:"Yes",cancelText:"No",children:(0,a.jsx)(o.ZP,{icon:(0,a.jsx)(l.Z,{})})})})})))||[],W=(0,h.useRef)(null),X=(0,r.Z)(W);return(0,a.jsxs)(a.Fragment,{children:[(0,a.jsx)(k.V,{title:"Namespaces (".concat(T,")"),breadcrumbs:[{name:"Workspace"}],actions:[]}),(0,a.jsx)("div",{className:"h-full flex-auto overflow-hidden",ref:W,children:(0,a.jsx)(u.Z,{sticky:!0,size:"small",loading:"loading"===E,columns:Y,dataSource:V,scroll:{x:1e3,y:void 0!==(null==X?void 0:X.height)?X.height-140:void 0},pagination:{pageSize:200,position:["bottomCenter"]},onChange:(e,t,n,a)=>I(e,a)})})]})};var y=n(46761),C=n(10769);let Z=()=>(0,a.jsx)(i.Wk,{children:(0,a.jsx)(y.o,{meta:(0,a.jsx)(C.h,{title:"Namespaces",description:"List of namespaces."}),children:(0,a.jsx)(T,{})})});var b=Z}},function(e){e.O(0,[8201,8564,2967,1003,7500,5371,9774,2888,179],function(){return e(e.s=82526)}),_N_E=e.O()}]);