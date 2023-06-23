(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[7018],{92266:function(e,t,n){(window.__NEXT_P=window.__NEXT_P||[]).push(["/monitor/node",function(){return n(1066)}])},1066:function(e,t,n){"use strict";n.r(t),n.d(t,{default:function(){return O}});var i,r=n(11527),a=n(2154),l=n(13740),o=n(67918),d=n(46457),s=n(85273),c=n(58699),u=n(87078),x=n(2401),h=n(8584);n(5433);var m=n(36865),v=n(61663),j=n(75921),p=n(74637),f=n.n(p),g=n(32699),y=n(50959),Z=n(73621),N=n(19005);let k=e=>(0,N.wz)(["monitor-node","list"],"/api/v1/monitor/nodes",e);var C=n(22820),w=n(58012),S=n(97591),_=n(49309),b=n(90400),I=n(13557);let P=n(64814),T=n(54498);f().extend(T),f().extend(P);let E=null!==(i=I.XL.tableConfig.defaultPageSize)&&void 0!==i?i:20,z=()=>{var e;let{responsive:t}=(0,b.Jl)(),{data:n,status:i}=(0,Z.x7)(),{list:a=[]}=n||{},p=[{title:"Name",width:60,dataIndex:"name",key:"name",fixed:(null==t?void 0:t.md)?"left":void 0,filterSearch:!0,render(e,t){var n,i,a,l,o,c,u;return(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)(d.Z.Text,{strong:!0,className:"leading-8",children:null===(n=t.metadata)||void 0===n?void 0:n.name}),(0,r.jsx)("br",{}),(0,r.jsx)(s.Z,{color:"cyan",children:null===(i=t.status.nodeInfo)||void 0===i?void 0:i.osImage}),(0,r.jsx)(s.Z,{color:"cyan",children:null===(a=t.status.nodeInfo)||void 0===a?void 0:a.architecture}),(0,r.jsxs)(s.Z,{color:"cyan",children:["CPU: ",null===(l=t.status.capacity)||void 0===l?void 0:l.cpu]}),(0,r.jsxs)(s.Z,{color:"cyan",children:["MEM: ",(0,g.round)((0,g.toInteger)(null===(o=t.status.capacity)||void 0===o?void 0:null===(c=o.memory)||void 0===c?void 0:c.replace("Ki",""))/1024/1024),"Gb"]}),(0,r.jsxs)(s.Z,{color:"cyan",children:["Pods: ",t.podCount,"/",null===(u=t.status.capacity)||void 0===u?void 0:u.pods]})]})},onFilter(e,t){var n,i;return null===(n=t.metadata)||void 0===n||!n.name||(null===(i=t.metadata)||void 0===i?void 0:i.name.indexOf(e.toString()))>-1}},{title:"Cluster",dataIndex:"clusterShortName",key:"clusterShortName",width:30,render:e=>(0,r.jsx)(c.ZP,{type:"link",style:{padding:0},children:e}),filterSearch:!0,filters:a.map(e=>({text:e.shortName||"",value:e.shortName||""})),onFilter:(e,t)=>!t.clusterShortName||t.clusterShortName.indexOf(e.toString())>-1},{title:"Capacity",dataIndex:"capacity",key:"capacity",width:35,render(e,t){var n,i;let a=(0,g.toInteger)(null===(n=t.cpuPercent)||void 0===n?void 0:n.replace("%","")),l=(0,g.toInteger)(null===(i=t.memoryPercent)||void 0===i?void 0:i.replace("%",""));return(0,r.jsxs)(r.Fragment,{children:[(0,r.jsxs)(u.Z,{gutter:[0,0],children:[(0,r.jsx)(x.Z,{children:(0,r.jsx)(s.Z,{style:{width:44,textAlign:"center"},children:"CPU"})}),(0,r.jsx)(x.Z,{flex:"auto",children:(0,r.jsx)(h.Z,{percent:a,size:"small",strokeColor:a>90?"red":a>70?"orange":"#1668dc"})})]}),(0,r.jsxs)(u.Z,{gutter:[0,0],children:[(0,r.jsx)(x.Z,{children:(0,r.jsx)(s.Z,{children:"MEM"})}),(0,r.jsx)(x.Z,{flex:"auto",children:(0,r.jsx)(h.Z,{percent:l>99?99:l,size:"small",strokeColor:l>90?"red":l>70?"orange":"#1668dc"})})]})]})}},{title:"Created at",dataIndex:"createdAt",key:"createdAt",width:30,render(e,t){var n;return(0,r.jsx)(w.q,{date:null===(n=t.metadata)||void 0===n?void 0:n.creationTimestamp})},sorter(e,t){var n,i;return f()(null===(n=e.metadata)||void 0===n?void 0:n.creationTimestamp).diff(f()(null===(i=t.metadata)||void 0===i?void 0:i.creationTimestamp))}},{title:(0,r.jsx)(d.Z.Text,{className:"text-xs md:text-sm",children:"Action"}),key:"action",fixed:"right",width:(null==t?void 0:t.md)?30:26,render:(e,t)=>t.actions}],[N,I]=(0,y.useState)(0),[P,T]=(0,y.useState)(1),{data:z,status:A}=k({filter:{clusterShortName:""}}),{list:F,pagination:M}=z||{},{total_items:O}=M||{},[X]=(0,C.kZ)(),[L,{setQuery:U}]=(0,_.o)(),W=(e,t)=>{var n,i;let{current:r}=e;I(null!==(i=null===(n=t.currentDataSource)||void 0===n?void 0:n.length)&&void 0!==i?i:0),r&&T(r)};(0,y.useEffect)(()=>I(null!==(e=null==F?void 0:F.length)&&void 0!==e?e:0),[F]);let q=(null==F?void 0:F.map((e,t)=>({...e,key:"ns-".concat(t),actions:(0,r.jsx)(m.Z.Compact,{children:(0,r.jsx)(v.Z,{title:"Are you sure to delete this item?",description:(0,r.jsx)("span",{className:"text-red-500",children:"Caution: this is permanent and cannot be rolled back."}),okText:"Yes",cancelText:"No",children:(0,r.jsx)(c.ZP,{icon:(0,r.jsx)(l.Z,{})})})})})))||[],D=(0,y.useRef)(null),G=(0,o.Z)(D);return(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)(S.V,{title:"Nodes (".concat(N,")"),breadcrumbs:[{name:"Workspace"}],actions:[]}),(0,r.jsx)("div",{className:"h-full flex-auto overflow-hidden",ref:D,children:(0,r.jsx)(j.Z,{sticky:!0,size:"small",loading:"loading"===A,columns:p,dataSource:q,scroll:{x:1e3,y:void 0!==(null==G?void 0:G.height)?G.height-100:void 0},pagination:{pageSize:E,position:["bottomCenter"]},onChange:(e,t,n,i)=>W(e,i)})})]})};var A=n(7021),F=n(24810);let M=()=>(0,r.jsx)(a.Wk,{children:(0,r.jsx)(A.o,{meta:(0,r.jsx)(F.h,{title:"Nodes",description:"List of cluster's nodes."}),children:(0,r.jsx)(z,{})})});var O=M}},function(e){e.O(0,[8201,2967,5775,4799,9780,9774,2888,179],function(){return e(e.s=92266)}),_N_E=e.O()}]);