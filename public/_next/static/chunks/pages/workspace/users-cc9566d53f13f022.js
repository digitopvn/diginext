(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[8875],{67284:function(e,t,n){"use strict";n.d(t,{Z:function(){return s}});var a=n(30001),l=n(50959),i={icon:{tag:"svg",attrs:{viewBox:"64 64 896 896",focusable:"false"},children:[{tag:"path",attrs:{d:"M257.7 752c2 0 4-.2 6-.5L431.9 722c2-.4 3.9-1.3 5.3-2.8l423.9-423.9a9.96 9.96 0 000-14.1L694.9 114.9c-1.9-1.9-4.4-2.9-7.1-2.9s-5.2 1-7.1 2.9L256.8 538.8c-1.5 1.5-2.4 3.3-2.8 5.3l-29.5 168.2a33.5 33.5 0 009.4 29.8c6.6 6.4 14.9 9.9 23.8 9.9zm67.4-174.4L687.8 215l73.3 73.3-362.7 362.6-88.9 15.7 15.6-89zM880 836H144c-17.7 0-32 14.3-32 32v36c0 4.4 3.6 8 8 8h784c4.4 0 8-3.6 8-8v-36c0-17.7-14.3-32-32-32z"}}]},name:"edit",theme:"outlined"},r=n(47855),o=function(e,t){return l.createElement(r.Z,(0,a.Z)((0,a.Z)({},e),{},{ref:t,icon:i}))};o.displayName="EditOutlined";var s=l.forwardRef(o)},85357:function(e,t,n){(window.__NEXT_P=window.__NEXT_P||[]).push(["/workspace/users",function(){return n(77898)}])},4514:function(e,t,n){"use strict";n.d(t,{Hg:function(){return r},av:function(){return l},hv:function(){return i}});var a=n(84886);let l=e=>(0,a.FF)(["workspaces"],"/api/v1/workspace",e),i=e=>(0,a.yt)(["workspaces"],"/api/v1/workspace",e),r=e=>(0,a.FF)(["workspaces","invite"],"/api/v1/workspace/invite",e)},77898:function(e,t,n){"use strict";n.r(t),n.d(t,{default:function(){return G}});var a,l=n(11527),i=n(18820),r=n(32352),o=n(30001),s=n(50959),c={icon:{tag:"svg",attrs:{viewBox:"64 64 896 896",focusable:"false"},children:[{tag:"path",attrs:{d:"M678.3 642.4c24.2-13 51.9-20.4 81.4-20.4h.1c3 0 4.4-3.6 2.2-5.6a371.67 371.67 0 00-103.7-65.8c-.4-.2-.8-.3-1.2-.5C719.2 505 759.6 431.7 759.6 349c0-137-110.8-248-247.5-248S264.7 212 264.7 349c0 82.7 40.4 156 102.6 201.1-.4.2-.8.3-1.2.5-44.7 18.9-84.8 46-119.3 80.6a373.42 373.42 0 00-80.4 119.5A373.6 373.6 0 00137 888.8a8 8 0 008 8.2h59.9c4.3 0 7.9-3.5 8-7.8 2-77.2 32.9-149.5 87.6-204.3C357 628.2 432.2 597 512.2 597c56.7 0 111.1 15.7 158 45.1a8.1 8.1 0 008.1.3zM512.2 521c-45.8 0-88.9-17.9-121.4-50.4A171.2 171.2 0 01340.5 349c0-45.9 17.9-89.1 50.3-121.6S466.3 177 512.2 177s88.9 17.9 121.4 50.4A171.2 171.2 0 01683.9 349c0 45.9-17.9 89.1-50.3 121.6C601.1 503.1 558 521 512.2 521zM880 759h-84v-84c0-4.4-3.6-8-8-8h-56c-4.4 0-8 3.6-8 8v84h-84c-4.4 0-8 3.6-8 8v56c0 4.4 3.6 8 8 8h84v84c0 4.4 3.6 8 8 8h56c4.4 0 8-3.6 8-8v-84h84c4.4 0 8-3.6 8-8v-56c0-4.4-3.6-8-8-8z"}}]},name:"user-add",theme:"outlined"},d=n(47855),u=function(e,t){return s.createElement(d.Z,(0,o.Z)((0,o.Z)({},e),{},{ref:t,icon:c}))};u.displayName="UserAddOutlined";var f=s.forwardRef(u),x=n(72784),h=n(64686),m=n(44177),p=n(73611),g=n(37528),_=n(31494),v=n(73162),F=n(68802),w=n.n(F),y=n(4514);let b=[],j=e=>{let{label:t,value:n,closable:a,onClose:i,color:r}=e,o=e=>{e.preventDefault(),e.stopPropagation()};return(0,l.jsx)(m.Z,{color:w()(n)?"default":"error",onMouseDown:o,closable:a,onClose:i,style:{marginRight:3},children:t})},k=()=>{let e=p.Z.useApp(),[t]=g.Z.useForm(),[n,a]=(0,s.useState)(!1),[i]=(0,y.Hg)(),r=()=>{t.resetFields(["emails"])},o=e=>{console.log("selected:",e),a(e.filter(e=>w()(e)).length>0)},c=async t=>{console.log("data :>> ",t);let n=await i(t);(null==n?void 0:n.status)&&(r(),e.modal.success({title:"Congrats!",content:(0,l.jsx)(l.Fragment,{children:"Invitation emails have been sent successfully."}),closable:!0}))},d=t=>{console.log("Failed:",t),e.notification.error({message:"Failed",description:"Something is wrong."})};return(0,l.jsxs)("div",{children:[(0,l.jsx)(_.Z.Title,{level:4,children:"Emails"}),(0,l.jsxs)(g.Z,{name:"invite",form:t,onFinish:c,onFinishFailed:d,layout:"vertical",children:[(0,l.jsx)(g.Z.Item,{name:"emails",children:(0,l.jsx)(v.Z,{style:{width:300},mode:"tags",showArrow:!1,onChange:o,tokenSeparators:[","," "],options:b,tagRender:e=>j(e),dropdownRender:e=>(0,l.jsx)(l.Fragment,{})})}),(0,l.jsx)(g.Z.Item,{name:"role",children:(0,l.jsx)(v.Z,{style:{width:300},options:[{value:"member",label:"Member"},{value:"guest",label:"Guest"}]})}),(0,l.jsx)(g.Z.Item,{children:(0,l.jsxs)("div",{className:"grid grid-cols-2 gap-2",children:[(0,l.jsx)(h.ZP,{type:"primary",htmlType:"submit",disabled:!n,children:"Invite"}),(0,l.jsx)(h.ZP,{children:"Clear"})]})})]})]})},Z=()=>(0,l.jsx)(x.Z,{placement:"bottomRight",trigger:"click",content:(0,l.jsx)(k,{}),children:(0,l.jsx)(h.ZP,{type:"default",icon:(0,l.jsx)(f,{className:"align-middle"}),children:"Invite"},"workspace-setting-btn")});var A=n(67284),C=n(2164),S=n(30388),E=n(71370),z=n(69786),M=n(47749),P=n(48880),$=n(74637),D=n.n($),I=n(88074),N=n(14149),O=n(81035),R=n(45581),q=n(2513);let L=n(64814),T=n(54498);D().extend(T),D().extend(L);let U=null!==(a=q.XL.tableConfig.defaultPageSize)&&void 0!==a?a:20,W=()=>{let{responsive:e}=(0,R.Jl)(),t=[{title:"Name",width:60,dataIndex:"name",key:"name",fixed:(null==e?void 0:e.md)?"left":void 0,filterSearch:!0,filters:[{text:"goon",value:"goon"}],onFilter:(e,t)=>!t.name||t.name.indexOf(e.toString())>-1},{title:"User name",dataIndex:"slug",key:"slug",width:50,filterSearch:!0,filters:[{text:"goon",value:"goon"}],render:e=>(0,l.jsx)(h.ZP,{type:"link",style:{padding:0},children:e}),onFilter:(e,t)=>!t.slug||t.slug.indexOf(e.toString())>-1},{title:"Email",dataIndex:"email",key:"email",width:80},{title:"Roles",dataIndex:"roles",key:"roles",width:40,filterSearch:!0,filters:[{text:"goon",value:"goon"}],render(e){var t;return(0,l.jsx)(l.Fragment,{children:null===(t=e[0])||void 0===t?void 0:t.name})}},{title:"Updated at",dataIndex:"updatedAt",key:"updatedAt",width:50,render:e=>(0,l.jsx)(N.q,{date:e}),sorter:(e,t)=>D()(e.updatedAt).diff(D()(t.updatedAt))},{title:"Created at",dataIndex:"createdAt",key:"createdAt",width:50,render:e=>(0,l.jsx)(N.q,{date:e}),sorter:(e,t)=>D()(e.createdAt).diff(D()(t.createdAt))},{title:(0,l.jsx)(_.Z.Text,{className:"text-xs md:text-sm",children:"Action"}),key:"action",fixed:"right",width:(null==e?void 0:e.md)?30:26,render:(e,t)=>t.actions}],[n,a]=(0,s.useState)(1),{data:i,status:r}=(0,I.mO)({populate:"roles,teams",pagination:{page:n,size:U}}),{list:o,pagination:c}=i||{},{total_items:d}=c||{},[u]=(0,I.kZ)(),[f,{setQuery:x}]=(0,O.o)(),m=async e=>{let t=await u({_id:e});(null==t?void 0:t.status)&&E.ZP.success({message:"Item deleted successfully."})},p=e=>{let{current:t}=e;t&&a(t)},g=(null==o?void 0:o.map((e,t)=>({...e,actions:(0,l.jsxs)(z.Z.Compact,{children:[(0,l.jsx)(h.ZP,{icon:(0,l.jsx)(A.Z,{}),onClick:()=>x({lv1:"edit",type:"user",user:e.slug})}),(0,l.jsx)(M.Z,{title:"Are you sure to delete this item?",description:(0,l.jsx)("span",{className:"text-red-500",children:"Caution: this is permanent and cannot be rolled back."}),onConfirm:()=>m(e._id),okText:"Yes",cancelText:"No",children:(0,l.jsx)(h.ZP,{icon:(0,l.jsx)(C.Z,{})})})]})})))||[],v=(0,s.useRef)(null),F=(0,S.Z)(v);return(0,l.jsx)("div",{className:"h-full flex-auto overflow-hidden",ref:v,children:(0,l.jsx)(P.Z,{sticky:!0,size:"small",loading:"loading"===r,columns:t,dataSource:g,scroll:{x:1e3,y:void 0!==(null==F?void 0:F.height)?F.height-140:void 0},pagination:{pageSize:U,total:d,position:["bottomCenter"]},onChange:p})})};var X=n(46761),H=n(10769);let B=()=>(0,l.jsx)(i.Wk,{children:(0,l.jsxs)(X.o,{meta:(0,l.jsx)(H.h,{title:"Users",description:"List of users in the workspace."}),children:[(0,l.jsx)(r.V,{title:"Users",breadcrumbs:[{name:"Workspace"}],actions:[(0,l.jsx)(Z,{},"invite-member-btn")]}),(0,l.jsx)(W,{})]})});var G=B},71827:function(e,t,n){"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.default=function(e,t){(0,l.default)(e),"object"===i(t)?(n=t.min||0,a=t.max):(n=arguments[1],a=arguments[2]);var n,a,r=encodeURI(e).split(/%..|./).length-1;return r>=n&&(void 0===a||r<=a)};var a,l=(a=n(5923))&&a.__esModule?a:{default:a};function i(e){return(i="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e})(e)}e.exports=t.default,e.exports.default=t.default},68802:function(e,t,n){"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.default=function(e,t){if((0,a.default)(e),(t=(0,l.default)(t,c)).require_display_name||t.allow_display_name){var n=e.match(d);if(n){var s,p,g=n[1];if(e=e.replace(g,"").replace(/(^<|>$)/g,""),g.endsWith(" ")&&(g=g.slice(0,-1)),!(p=(s=g).replace(/^"(.+)"$/,"$1")).trim()||/[\.";<>]/.test(p)&&(p===s||p.split('"').length!==p.split('\\"').length))return!1}else if(t.require_display_name)return!1}if(!t.ignore_max_length&&e.length>254)return!1;var _=e.split("@"),v=_.pop(),F=v.toLowerCase();if(t.host_blacklist.includes(F)||t.host_whitelist.length>0&&!t.host_whitelist.includes(F))return!1;var w=_.join("@");if(t.domain_specific_validation&&("gmail.com"===F||"googlemail.com"===F)){var y=(w=w.toLowerCase()).split("+")[0];if(!(0,i.default)(y.replace(/\./g,""),{min:6,max:30}))return!1;for(var b=y.split("."),j=0;j<b.length;j++)if(!f.test(b[j]))return!1}if(!1===t.ignore_max_length&&(!(0,i.default)(w,{max:64})||!(0,i.default)(v,{max:254})))return!1;if(!(0,r.default)(v,{require_tld:t.require_tld,ignore_max_length:t.ignore_max_length})){if(!t.allow_ip_domain)return!1;if(!(0,o.default)(v)){if(!v.startsWith("[")||!v.endsWith("]"))return!1;var k=v.slice(1,-1);if(0===k.length||!(0,o.default)(k))return!1}}if('"'===w[0])return w=w.slice(1,w.length-1),t.allow_utf8_local_part?m.test(w):x.test(w);for(var Z=t.allow_utf8_local_part?h:u,A=w.split("."),C=0;C<A.length;C++)if(!Z.test(A[C]))return!1;return!t.blacklisted_chars||-1===w.search(RegExp("[".concat(t.blacklisted_chars,"]+"),"g"))};var a=s(n(5923)),l=s(n(94983)),i=s(n(71827)),r=s(n(30314)),o=s(n(45947));function s(e){return e&&e.__esModule?e:{default:e}}var c={allow_display_name:!1,require_display_name:!1,allow_utf8_local_part:!0,require_tld:!0,blacklisted_chars:"",ignore_max_length:!1,host_blacklist:[],host_whitelist:[]},d=/^([^\x00-\x1F\x7F-\x9F\cX]+)</i,u=/^[a-z\d!#\$%&'\*\+\-\/=\?\^_`{\|}~]+$/i,f=/^[a-z\d]+$/,x=/^([\s\x01-\x08\x0b\x0c\x0e-\x1f\x7f\x21\x23-\x5b\x5d-\x7e]|(\\[\x01-\x09\x0b\x0c\x0d-\x7f]))*$/i,h=/^[a-z\d!#\$%&'\*\+\-\/=\?\^_`{\|}~\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+$/i,m=/^([\s\x01-\x08\x0b\x0c\x0e-\x1f\x7f\x21\x23-\x5b\x5d-\x7e\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]|(\\[\x01-\x09\x0b\x0c\x0d-\x7f\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))*$/i;e.exports=t.default,e.exports.default=t.default},30314:function(e,t,n){"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.default=function(e,t){(0,a.default)(e),(t=(0,l.default)(t,r)).allow_trailing_dot&&"."===e[e.length-1]&&(e=e.substring(0,e.length-1)),!0===t.allow_wildcard&&0===e.indexOf("*.")&&(e=e.substring(2));var n=e.split("."),i=n[n.length-1];return!(t.require_tld&&(n.length<2||!t.allow_numeric_tld&&!/^([a-z\u00A1-\u00A8\u00AA-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]{2,}|xn[a-z0-9-]{2,})$/i.test(i)||/\s/.test(i))||!t.allow_numeric_tld&&/^\d+$/.test(i))&&n.every(function(e){return!(e.length>63&&!t.ignore_max_length||!/^[a-z_\u00a1-\uffff0-9-]+$/i.test(e)||/[\uff01-\uff5e]/.test(e)||/^-|-$/.test(e)||!t.allow_underscores&&/_/.test(e))})};var a=i(n(5923)),l=i(n(94983));function i(e){return e&&e.__esModule?e:{default:e}}var r={require_tld:!0,allow_underscores:!1,allow_trailing_dot:!1,allow_numeric_tld:!1,allow_wildcard:!1,ignore_max_length:!1};e.exports=t.default,e.exports.default=t.default},45947:function(e,t,n){"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.default=function e(t){var n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:"";return((0,l.default)(t),n=String(n))?"4"===n?o.test(t):"6"===n&&c.test(t):e(t,4)||e(t,6)};var a,l=(a=n(5923))&&a.__esModule?a:{default:a},i="(?:[0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])",r="(".concat(i,"[.]){3}").concat(i),o=RegExp("^".concat(r,"$")),s="(?:[0-9a-fA-F]{1,4})",c=RegExp("^("+"(?:".concat(s,":){7}(?:").concat(s,"|:)|")+"(?:".concat(s,":){6}(?:").concat(r,"|:").concat(s,"|:)|")+"(?:".concat(s,":){5}(?::").concat(r,"|(:").concat(s,"){1,2}|:)|")+"(?:".concat(s,":){4}(?:(:").concat(s,"){0,1}:").concat(r,"|(:").concat(s,"){1,3}|:)|")+"(?:".concat(s,":){3}(?:(:").concat(s,"){0,2}:").concat(r,"|(:").concat(s,"){1,4}|:)|")+"(?:".concat(s,":){2}(?:(:").concat(s,"){0,3}:").concat(r,"|(:").concat(s,"){1,5}|:)|")+"(?:".concat(s,":){1}(?:(:").concat(s,"){0,4}:").concat(r,"|(:").concat(s,"){1,6}|:)|")+"(?::((?::".concat(s,"){0,5}:").concat(r,"|(?::").concat(s,"){1,7}|:))")+")(%[0-9a-zA-Z-.:]{1,})?$");e.exports=t.default,e.exports.default=t.default},94983:function(e,t){"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.default=function(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{},t=arguments.length>1?arguments[1]:void 0;for(var n in t)void 0===e[n]&&(e[n]=t[n]);return e},e.exports=t.default,e.exports.default=t.default}},function(e){e.O(0,[8201,8564,2967,1003,9521,5371,9774,2888,179],function(){return e(e.s=85357)}),_N_E=e.O()}]);