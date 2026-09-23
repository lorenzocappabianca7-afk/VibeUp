/**
 * Keeps Safari and Chrome page translation working on this React app.
 *
 * Both browsers rewrite text nodes in place (Chrome also wraps them in
 * <font>). React then either throws removeChild/insertBefore, or writes the
 * Italian source back over the translation. This script:
 * 1. Ignores those DOM calls when the node was already moved by the translator.
 * 2. Remembers Italian → English replacements from a real translation pass.
 * 3. Puts the English back when React renders the Italian source again.
 *
 * A pass counts as translation only when several strings gain English words,
 * so ordinary Italian → Italian screen changes are left alone.
 * Runs after the splash markup so it does not delay first paint.
 */
export const BROWSER_TRANSLATE_GUARD_SCRIPT = `(function(){
if(window.__vibeupTranslateGuard)return;
window.__vibeupTranslateGuard=1;
try{
var proto=Node.prototype;
function patch(name){
var original=proto[name];
if(typeof original!=="function")return;
proto[name]=function(a,b){
var child=name==="insertBefore"?b:name==="replaceChild"?b:a;
if(child&&child.parentNode!==this)return name==="insertBefore"?a:child;
return original.apply(this,arguments);
};
}
patch("removeChild");
patch("insertBefore");
patch("replaceChild");
var EN={the:1,and:1,your:1,you:1,for:1,with:1,this:1,that:1,from:1,have:1,are:1,was:1,not:1,can:1,will:1,into:1,about:1,please:1,enter:1,leave:1,try:1,name:1,phone:1,book:1,party:1,search:1,next:1,back:1,close:1,save:1,saving:1,welcome:1,guests:1,city:1,price:1,request:1,confirm:1,cancel:1,events:1,explore:1,profile:1,required:1,continue:1,message:1,notifications:1,calendar:1,favorites:1,compare:1,preview:1,details:1,sign:1,read:1,policy:1,notice:1,consent:1,agree:1,processing:1,understood:1,restart:1,completed:1,thanks:1,feedback:1,update:1,experience:1,stars:1,booking:1,choose:1,when:1,where:1,services:1,available:1,first:1,last:1,surname:1};
var IT={il:1,lo:1,la:1,gli:1,le:1,di:1,che:1,per:1,una:1,uno:1,con:1,non:1,del:1,della:1,dei:1,delle:1,tuo:1,tua:1,tuoi:1,tue:1,festa:1,feste:1,locale:1,prenota:1,nome:1,cognome:1,cerca:1,avanti:1,indietro:1,chiudi:1,salva:1,prova:1,anteprima:1,eventi:1,esplora:1,profilo:1,telefono:1,dati:1,lascia:1,entrare:1,entra:1,obbligatorio:1,continua:1,messaggio:1,notifiche:1,calendario:1,preferiti:1,confronto:1,ospiti:1,prezzo:1,disponibile:1,richiesta:1,conferma:1,annulla:1,accedi:1,password:1,inserisci:1,scegli:1,quando:1,dove:1,budget:1,servizi:1,informativa:1,acconsento:1,trattamento:1,capito:1,ricomincia:1,completato:1,grazie:1,parere:1,aggiornare:1,scrivici:1,salvataggio:1,prenotazione:1,esperienza:1,stelle:1,città:1};
function tokens(s){return(s||"").toLowerCase().match(/[a-zàèéìòù]+/g)||[]}
function hits(dict,s){var list=tokens(s),n=0;for(var i=0;i<list.length;i++)if(dict[list[i]])n++;return n}
function measure(source,translated){
var enDelta=hits(EN,translated)-hits(EN,source);
var itDelta=hits(IT,source)-hits(IT,translated);
var gain=enDelta+itDelta;
if(/[àèéìòù]/i.test(source)&&!/[àèéìòù]/i.test(translated))gain++;
return{enDelta:enDelta,gain:gain};
}
function ignorable(s){
if(!s||s.length>4000)return true;
if(/^https?:\\/\\//i.test(s))return true;
if(/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(s))return true;
if(/^[\\d\\s+()./-]+$/.test(s))return true;
return false;
}
function shell(el){
if(!el)return false;
if(el.nodeType===3)el=el.parentElement;
if(!el||!el.closest)return false;
return!!el.closest("#vibeup-boot-splash,script,style,[translate='no']");
}
function skipText(node){
if(shell(node))return true;
var el=node&&node.parentElement;
if(!el||!el.closest)return true;
return!!el.closest("textarea,input,[contenteditable='true']");
}
var dict=new Map();
var pending=new Map();
var active=false;
var timer=0;
function browserMarked(){
var name=document.documentElement.className;
if(typeof name!=="string")name="";
return name.indexOf("translated-ltr")!==-1||name.indexOf("translated-rtl")!==-1||(document.documentElement.getAttribute("lang")||"").toLowerCase().indexOf("en")===0;
}
function qualifies(slots){
var moves=0,gain=0;
for(var i=0;i<slots.length;i++){
if(slots[i].enDelta>0){moves++;if(slots[i].gain>0)gain+=slots[i].gain;}
}
if(browserMarked())return moves>=1;
return moves>=3&&gain>=4;
}
function remember(source,translated){
source=(source||"").trim();
translated=(translated||"").trim();
if(!source||source===translated||ignorable(source)||ignorable(translated))return;
var signal=measure(source,translated);
if(signal.enDelta<=0||signal.gain<=0)return;
var prev=pending.get(source);
if(!prev||signal.enDelta>prev.enDelta)pending.set(source,{source:source,translated:translated,enDelta:signal.enDelta,gain:signal.gain});
}
function applyWs(raw,trimmed,translated){
var start=raw.indexOf(trimmed);
if(start<0)return translated;
return raw.slice(0,start)+translated+raw.slice(start+trimmed.length);
}
function writeData(node,value){
if(node.data===value)return;
node.__vibeupSkip=(node.__vibeupSkip||0)+1;
node.data=value;
}
function writeAttr(el,name,value){
if(el.getAttribute(name)===value)return;
el.__vibeupSkipAttr=(el.__vibeupSkipAttr||0)+1;
el.setAttribute(name,value);
}
function restoreText(node){
if(!node||node.nodeType!==3||skipText(node))return;
var raw=node.data||"";
var key=raw.trim();
var translated=dict.get(key);
if(!translated||translated===key)return;
writeData(node,applyWs(raw,key,translated));
}
function restoreAttr(el,name){
if(!el||!el.getAttribute||shell(el))return;
var raw=el.getAttribute(name);
if(!raw)return;
var key=raw.trim();
var translated=dict.get(key);
if(!translated||translated===key)return;
writeAttr(el,name,applyWs(raw,key,translated));
}
function applyDict(root){
if(!root||!active)return;
if(root.nodeType===3){restoreText(root);return;}
if(root.nodeType===1&&shell(root))return;
if(root.nodeType!==1&&root.nodeType!==9&&root.nodeType!==11)return;
var walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:function(node){
return skipText(node)?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT;
}});
var batch=[];
while(walker.nextNode())batch.push(walker.currentNode);
for(var i=0;i<batch.length;i++)restoreText(batch[i]);
if(root.querySelectorAll){
var nodes=root.querySelectorAll("[placeholder],[aria-label],[title],[alt]");
for(var j=0;j<nodes.length;j++){
if(shell(nodes[j]))continue;
restoreAttr(nodes[j],"placeholder");
restoreAttr(nodes[j],"aria-label");
restoreAttr(nodes[j],"title");
restoreAttr(nodes[j],"alt");
}
}
}
function flush(){
var slots=[];
pending.forEach(function(slot){slots.push(slot);});
pending=new Map();
if(!qualifies(slots))return;
active=true;
for(var i=0;i<slots.length;i++)dict.set(slots[i].source,slots[i].translated);
applyDict(document.body);
}
function schedule(){clearTimeout(timer);timer=setTimeout(flush,700);}
function directText(n){
if(!n)return"";
if(n.nodeType===3){if(skipText(n))return"";return n.data||"";}
if(n.nodeType!==1||shell(n))return"";
if(n.childNodes.length===1&&n.firstChild&&n.firstChild.nodeType===3)return n.firstChild.data||"";
return"";
}
var textObserver=new MutationObserver(function(mutations){
try{
for(var i=0;i<mutations.length;i++){
var m=mutations[i];
if(m.type==="characterData"){
var node=m.target;
if(node.__vibeupSkip){node.__vibeupSkip--;continue;}
if(skipText(node))continue;
var prev=m.oldValue==null?"":m.oldValue;
var next=node.data||"";
var known=dict.get((next||"").trim());
if(active&&known&&known!==next.trim()){writeData(node,applyWs(next,next.trim(),known));continue;}
remember(prev,next);
}else if(m.type==="attributes"){
var el=m.target;
if(el.__vibeupSkipAttr){el.__vibeupSkipAttr--;continue;}
if(shell(el))continue;
var attr=m.attributeName;
if(!attr)continue;
var before=m.oldValue==null?"":m.oldValue;
var after=el.getAttribute(attr)||"";
var knownAttr=dict.get(after.trim());
if(active&&knownAttr&&knownAttr!==after.trim()){writeAttr(el,attr,applyWs(after,after.trim(),knownAttr));continue;}
remember(before,after);
}else if(m.type==="childList"){
if(shell(m.target))continue;
var removed="",added="";
if(m.removedNodes.length===1)removed=directText(m.removedNodes[0]);
if(m.addedNodes.length===1)added=directText(m.addedNodes[0]);
if(removed&&added)remember(removed,added);
if(active){
for(var k=0;k<m.addedNodes.length;k++)applyDict(m.addedNodes[k]);
}
}
}
if(pending.size)schedule();
}catch(e){}
});
textObserver.observe(document.documentElement,{
subtree:true,
characterData:true,
characterDataOldValue:true,
attributes:true,
attributeOldValue:true,
attributeFilter:["placeholder","aria-label","title","alt"],
childList:true
});
new MutationObserver(function(mutations){
try{
for(var i=0;i<mutations.length;i++){
var m=mutations[i];
if(m.target!==document.documentElement)continue;
if(m.attributeName==="class"){
var prev=m.oldValue||"";
var had=prev.indexOf("translated-ltr")!==-1||prev.indexOf("translated-rtl")!==-1;
if(had&&!browserMarked()){active=false;dict=new Map();pending=new Map();}
else if(browserMarked()&&pending.size)schedule();
}else if(m.attributeName==="lang"){
var lang=(document.documentElement.lang||"").toLowerCase();
if(lang.indexOf("en")===0&&pending.size)schedule();
if(lang.indexOf("it")===0&&active&&!browserMarked()){active=false;dict=new Map();pending=new Map();}
}
}
}catch(e){}
}).observe(document.documentElement,{attributes:true,attributeFilter:["class","lang"],attributeOldValue:true});
}catch(e){}
})();`;
