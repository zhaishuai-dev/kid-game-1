'use strict';
// Node 冒烟测试用 DOM stub:在 vm 沙箱里把游戏脚本跑起来(零依赖)
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..');

function makeCtx2d(){
  const noop=()=>{};
  return {fillRect:noop,fillText:noop,strokeText:noop,beginPath:noop,arc:noop,fill:noop,
          moveTo:noop,lineTo:noop,closePath:noop,stroke:noop,save:noop,restore:noop,translate:noop,
          fillStyle:'',strokeStyle:'',font:'',lineWidth:1,globalAlpha:1};
}
function makeEl(id){
  return {id,style:{},textContent:'',innerHTML:'',disabled:false,onclick:null,dataset:{},
          addEventListener(){},setPointerCapture(){},
          getContext:()=>makeCtx2d()};
}
function createGame(jsSources){
  const els={};
  const el=id=>els[id]||(els[id]=makeEl(id));
  let timers=[],tid=1,rafCb=null,nowMs=0;
  const store={};
  const sandbox={
    console,
    document:{getElementById:el,querySelectorAll:()=>[]},
    performance:{now:()=>nowMs},
    requestAnimationFrame:fn=>{rafCb=fn;},
    localStorage:{
      getItem:k=>(k in store?store[k]:null),
      setItem:(k,v)=>{store[k]=String(v);},
      removeItem:k=>{delete store[k];}
    },
    setTimeout:(fn,ms)=>{timers.push({id:tid,fn,ms:ms||0});return tid++;},
    clearTimeout:id=>{timers=timers.filter(t=>t.id!==id);},
    setInterval:()=>tid++,
    clearInterval:()=>{}
  };
  sandbox.window=sandbox;
  sandbox.globalThis=sandbox;
  sandbox.addEventListener=()=>{};
  vm.createContext(sandbox);
  for(const src of jsSources)vm.runInContext(src.code,sandbox,{filename:src.name});
  return {
    sandbox,els:el,store,
    eval:code=>vm.runInContext(code,sandbox,{filename:'<test>'}),
    flushTimers(){
      for(let i=0;i<50&&timers.length;i++){
        const q=timers.sort((a,b)=>a.ms-b.ms);timers=[];
        q.forEach(t=>t.fn());
      }
    },
    frame(dt){nowMs+=(dt||16);if(rafCb){const cb=rafCb;rafCb=null;cb(nowMs);}}
  };
}
function loadSrcSources(){
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const tags=[...html.matchAll(/<script src="(src\/[^"]+)"><\/script>/g)];
  return tags.map(m=>({name:m[1],code:fs.readFileSync(path.join(root,m[1]),'utf8')}));
}
function loadDistSource(){
  const html=fs.readFileSync(path.join(root,'dist/lingshan-rpg.html'),'utf8');
  const m=html.match(/<script>\n([\s\S]*?)<\/script>/);
  if(!m)throw new Error('dist 里没有内联脚本');
  return [{name:'dist/lingshan-rpg.html',code:m[1]}];
}
module.exports={createGame,loadSrcSources,loadDistSource};
