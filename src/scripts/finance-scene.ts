import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

type Scenario={cash:number;burn:number;hires:number;cost:number};
type Slot={canvas:HTMLCanvasElement;ctx:CanvasRenderingContext2D;kind:string;visible:boolean};
const clamp=(n:number,a=0,b=1)=>Math.max(a,Math.min(b,n));
const smooth=(n:number)=>{const t=clamp(n);return t*t*(3-2*t);};
const lerp=THREE.MathUtils.lerp;

/** One WebGL context paints the same physical instrument into native page slots.
 * Only visible slots render, and only when scroll, size or model values change.
 * The 2D renderer and native HTML remain an independent failure path. */
export function startFinanceScene(){
  const slots:Slot[]=Array.from(document.querySelectorAll<HTMLCanvasElement>('[data-instrument]')).flatMap(canvas=>{
    const ctx=canvas.getContext('2d');return ctx?[{canvas,ctx,kind:canvas.dataset.instrument||'',visible:false}]:[];
  });
  if(!slots.length)return;
  const mobile=()=>window.innerWidth<768;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power',preserveDrawingBuffer:false});
  renderer.domElement.hidden=true;renderer.domElement.style.display='none';renderer.domElement.dataset.instrumentBuffer='';document.body.append(renderer.domElement);
  renderer.setPixelRatio(1);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=.88;
  renderer.setClearColor(0x000000,0);
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFShadowMap;
  renderer.transmissionResolutionScale=.35;
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(32,1,.1,100);
  const pmrem=new THREE.PMREMGenerator(renderer);
  const room=new RoomEnvironment();
  const blueReflection=new THREE.Mesh(new THREE.PlaneGeometry(8,12),new THREE.MeshBasicMaterial({color:new THREE.Color(0x2564df).multiplyScalar(2.8)}));blueReflection.position.set(-6,1,2);blueReflection.lookAt(0,0,0);room.add(blueReflection);
  const warmReflection=new THREE.Mesh(new THREE.PlaneGeometry(8,4),new THREE.MeshBasicMaterial({color:new THREE.Color(0xffb579).multiplyScalar(1.8)}));warmReflection.position.set(2,6,1);warmReflection.lookAt(0,0,0);room.add(warmReflection);
  const environment=pmrem.fromScene(room,.04,0.1,100,{size:128});
  scene.environment=environment.texture;
  scene.environmentIntensity=.7;
  room.dispose();pmrem.dispose();
  const ambient=new THREE.HemisphereLight(0xb8d6ff,0x020713,.25);scene.add(ambient);
  const key=new THREE.DirectionalLight(0xffe7ce,3.0);key.position.set(-4,8,5);key.castShadow=true;
  key.shadow.mapSize.set(mobile()?512:1024,mobile()?512:1024);
  Object.assign(key.shadow.camera,{left:-8,right:8,top:8,bottom:-8,near:1,far:30});
  key.shadow.bias=-.0004;key.shadow.normalBias=.025;key.shadow.radius=3;scene.add(key);
  const rim=new THREE.DirectionalLight(0x72aaff,3.5);rim.position.set(3,4,-7);scene.add(rim);
  const warm=new THREE.DirectionalLight(0xff995d,.65);warm.position.set(6,3,2);scene.add(warm);
  const instrument=new THREE.Group();scene.add(instrument);

  const grainCanvas=document.createElement('canvas');grainCanvas.width=128;grainCanvas.height=128;
  const gc=grainCanvas.getContext('2d')!,gd=gc.createImageData(128,128);let seed=127;
  for(let i=0;i<gd.data.length;i+=4){seed=(seed*1664525+1013904223)>>>0;const v=160+seed%85;gd.data.set([v,v,v,255],i);}gc.putImageData(gd,0,0);
  const grain=new THREE.CanvasTexture(grainCanvas);grain.wrapS=grain.wrapT=THREE.RepeatWrapping;grain.repeat.set(6,4);
  const ceramic=new THREE.MeshPhysicalMaterial({color:0x08172b,metalness:.40,roughness:.29,bumpMap:grain,bumpScale:.008,clearcoat:.8,clearcoatRoughness:.14});
  const shell=new THREE.MeshPhysicalMaterial({color:0x09233f,metalness:.35,roughness:.28,bumpMap:grain,bumpScale:.018,clearcoat:1,clearcoatRoughness:.18});
  const inset=new THREE.MeshStandardMaterial({color:0x08172b,metalness:.15,roughness:.45});
  const silver=new THREE.MeshStandardMaterial({color:0x8ea7c3,metalness:.94,roughness:.24});
  const copper=new THREE.MeshStandardMaterial({color:0xbe713d,metalness:.82,roughness:.25});
  const blue=new THREE.MeshStandardMaterial({color:0x659bfa,metalness:.4,roughness:.3,emissive:0x143364,emissiveIntensity:.35});
  const orange=new THREE.MeshPhysicalMaterial({color:0xffa264,metalness:.3,roughness:.16,clearcoat:1,emissive:0xa13f12,emissiveIntensity:.2});
  const ink=new THREE.MeshStandardMaterial({color:0x102b53,metalness:.2,roughness:.5});
  const glass=new THREE.MeshPhysicalMaterial({color:0x153154,roughness:.22,metalness:.18,transparent:true,opacity:.44,depthWrite:false});
  function box(w:number,h:number,d:number,material:THREE.Material,x=0,y=0,z=0,r=.08){const m=new THREE.Mesh(new RoundedBoxGeometry(w,h,d,4,r),material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;return m;}
  function tube(points:THREE.Vector3[],radius:number,mat:THREE.Material){return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),Math.max(16,points.length*4),radius,8,false),mat);}
  const inputs=new THREE.Group();instrument.add(inputs);
  const sourceTokens:THREE.Group[]=[];const valueTextures:THREE.CanvasTexture[]=[];const valueCanvases:HTMLCanvasElement[]=[];
  const names=['CASH TODAY','MONTHLY BURN','PLANNED HIRES'];
  for(let i=0;i<3;i++){
    const token=new THREE.Group();
    token.add(box(3.55,2.20,.9,shell,0,0,0,.30));
    token.add(box(3.33,1.98,.24,ceramic,0,0,-.44,.10));
    token.add(box(3.05,1.74,.14,inset,0,0,.43,.06));
    token.add(box(.045,1.25,.018,i===0?blue:i===1?silver:copper,-1.39,0,.506,.008));
    // Data lives on the physical record, prominently readable at normal size.
    const c=document.createElement('canvas');c.width=1200;c.height=650;valueCanvases.push(c);
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;valueTextures.push(t);
    const face=new THREE.Mesh(new THREE.PlaneGeometry(2.77,1.47),new THREE.MeshBasicMaterial({map:t,transparent:true,depthWrite:false}));face.position.set(.07,0,.507);token.add(face);
    for(const x of [-1.12,0,1.12])token.add(box(.33,.085,.18,silver,x,-1.14,-.15,.025));
    inputs.add(token);sourceTokens.push(token);
  }
  const calculation=new THREE.Group();instrument.add(calculation);
  // A fine calibrated glass frame replaces the opaque triangular cash wall.
  const frame=new THREE.Group();calculation.add(frame);
  frame.add(box(8.6,4.7,.55,shell,0,.5,-.35,.20));
  frame.add(box(8.20,4.3,.11,ink,0,.5,-.10,.05));
  frame.add(box(8.05,4.14,.018,glass,0,.5,-.037,.008));
  for(let i=0;i<=4;i++)frame.add(box(7.4,.009,.006,silver,0,-1+i*.8,-.035,.002));
  for(let i=0;i<=12;i++)frame.add(box(.009,3.2,.005,ink,-3.7+i*7.4/12,.6,-.03,.002));
  const contacts=new THREE.Group();instrument.add(contacts);
  const paths:THREE.Mesh[]=[];
  for(const x of [-2.7,0,2.7]){
    const path=tube([new THREE.Vector3(x,-2.4,.06),new THREE.Vector3(x,-1.85,.06),new THREE.Vector3(x*.55,-1.5,.06),new THREE.Vector3(0,-1.3,.06)],.025,copper);contacts.add(path);paths.push(path);
  }
  const traceGroup=new THREE.Group();calculation.add(traceGroup);
  const decision=new THREE.Mesh(new THREE.SphereGeometry(.13,24,16),orange);calculation.add(decision);
  const decisionRing=new THREE.Mesh(new THREE.TorusGeometry(.24,.014,8,48),copper);calculation.add(decisionRing);
  let planTrace:THREE.Mesh|undefined;let endpoint=new THREE.Vector3(3.7,-.9,.05);
  let valid=true,values:Scenario={cash:1200000,burn:75000,hires:2,cost:10000};
  function rebuild(next:Scenario|null){
    valid=!!next;document.documentElement.dataset.instrumentState=valid?'valid':'invalid';
    if(next)values=next;
    const money=(n:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
    const labels=valid?[money(values.cash),money(values.burn),`${values.hires} × ${money(values.cost)}`]:['—','—','—'];
    valueCanvases.forEach((c,i)=>{const ctx=c.getContext('2d')!;ctx.clearRect(0,0,c.width,c.height);ctx.fillStyle='#b2c5df';ctx.font='500 84px Arial';ctx.fillText(names[i],42,135);ctx.fillStyle='#edf4ff';ctx.font=`500 ${i===2?148:168}px Arial`;ctx.fillText(labels[i],38,345);ctx.fillStyle='#849dbf';ctx.font='500 48px Arial';ctx.fillText(i===0?'SOURCE 01':i===1?'SOURCE 02 / BEFORE HIRES':'SOURCE 03 / MONTHLY COST',42,520);valueTextures[i].needsUpdate=true;});
    while(traceGroup.children.length){const child=traceGroup.children[0] as THREE.Mesh;traceGroup.remove(child);child.geometry.dispose();}
    if(!next){requestPaint();return;}
    const {cash,burn,hires,cost}=next,total=burn+hires*cost;
    const point=(t:number,monthly:number)=>new THREE.Vector3(-3.7+t*7.4/12,-1+Math.max(0,1-monthly*t/cash)*3.2,.08);
    const stop=Math.min(12,cash/total),baseStop=Math.min(12,cash/burn);
    endpoint=point(stop,total);const pp=Array.from({length:49},(_,i)=>point(stop*i/48,total));
    planTrace=tube(pp,.035,orange);traceGroup.add(planTrace);
    for(let t=0;t<baseStop;t+=.42){traceGroup.add(tube([point(t,burn),point(Math.min(t+.23,baseStop),burn)],.018,blue));}
    requestPaint();
  }

  let queued=0,lastPaint=0,disposed=false,bufferW=1,bufferH=1;
  function fallback(){
    disposed=true;cancelAnimationFrame(queued);
    delete document.documentElement.dataset.instrumentRenderer;
    slots.forEach(slot=>{slot.canvas.style.opacity='0';slot.canvas.parentElement?.classList.remove('instrument-ready');});
    renderer.dispose();environment.dispose();
    renderer.domElement.remove();
  }
  renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();fallback();});
  const opening=document.getElementById('opening');
  const delivery=document.querySelector<HTMLElement>('.delivery-section');
  const reach=document.querySelector<HTMLElement>('.reach-section');

  function frameFor(slot:Slot){
    const rect=slot.canvas.getBoundingClientRect();
    const progress=reduced.matches?1:smooth((innerHeight*.96-rect.top)/(innerHeight*.65));
    let assembly=1,model=1,resolve=1,yaw=-.12,scale=1,cameraY=2.5,cameraZ=15,targetY=-.15;
    instrument.position.set(0,0,0);
    if(slot.kind==='opening'){
      const d=delivery?smooth((innerHeight-delivery.getBoundingClientRect().top)/(innerHeight*.95)):0;
      const r=reach?smooth((innerHeight-reach.getBoundingClientRect().top)/(innerHeight*.9)):0;
      const reachHeading=reach?.querySelector('h2')?.getBoundingClientRect();
      const modelArrival=reachHeading?smooth((innerHeight*.98-reachHeading.bottom)/(innerHeight*.48)):0;
      assembly=d;model=modelArrival;resolve=smooth((modelArrival-.45)/.55);yaw=lerp(-.15,.05,d)-r*.12;scale=1.07+d*.90-model*.90;
      targetY=lerp(lerp(-.15,-2,d),-.15,model);
      const presence=(el:HTMLElement|null)=>{if(!el)return 0;const b=el.getBoundingClientRect();return smooth((innerHeight-b.top)/(innerHeight*.9))*smooth(b.bottom/(innerHeight*.85));};
      slot.canvas.parentElement?.style.setProperty('--scene-scrim',String(Math.max(presence(delivery)*.42,presence(reach)*.08)));
      const label=document.querySelector<HTMLElement>('.scene-index');if(label)label.style.opacity=String(delivery?smooth((delivery.getBoundingClientRect().top-innerHeight*.65)/(innerHeight*.35)):1);
      const sceneLabel=document.getElementById('scene-label');if(sceneLabel)sceneLabel.textContent='RECORDS / MODELS / DECISIONS';
      if(!mobile()){
        const lowerTop=Math.max((reachHeading?.bottom??innerHeight*.5)+20,innerHeight*.34);
        const heroBox=[innerWidth*.48,innerHeight*.13,innerWidth*.52,innerHeight*.73];
        const deliveryBox=[innerWidth*.57,-innerHeight*.075,innerWidth*.42,innerHeight*.32];
        const reachBox=[innerWidth*.025,lowerTop,innerWidth*.51,innerHeight-lowerTop-20];
        const box=heroBox.map((n,i)=>lerp(lerp(n,deliveryBox[i],d),reachBox[i],r));
        if(r>.01)box[1]=Math.max(box[1],lowerTop);
        slot.canvas.style.left=`${box[0]}px`;slot.canvas.style.top=`${box[1]}px`;slot.canvas.style.width=`${box[2]}px`;slot.canvas.style.height=`${Math.max(180,box[3])}px`;slot.canvas.style.opacity=String(reduced.matches?0:smooth(-(opening?.getBoundingClientRect().top||0)/(innerHeight*.6)));
      }else{for(const key of ['left','top','width','height'])slot.canvas.style.removeProperty(key);slot.canvas.style.opacity=opening?String(1-smooth((-opening.getBoundingClientRect().top-520)/220)):'1';scale=.9;}
      if(reduced.matches){assembly=0;model=0;resolve=0;yaw=-.12;}
    }else if(slot.kind==='proof'){
      assembly=1;model=1;resolve=progress;yaw=lerp(-.2,.04,progress);scale=1.15;cameraY=2;
    }
    // The exact same record capsules move into governed sockets and stay there.
    // No preassembled model exists during the opening records state.
    const loose=[[-2.15,1.45,.4],[1.0,.1,-.4],[2.35,-1.55,.65]];
    sourceTokens.forEach((token,i)=>{
      const dock=[-2.7+i*2.7,-2.65,.1];
      token.position.set(lerp(loose[i][0],dock[0],assembly),lerp(loose[i][1],dock[1],assembly),lerp(loose[i][2],dock[2],assembly));
      token.rotation.set(lerp(-.12,0,assembly),lerp([.50,-.18,.38][i],0,assembly),lerp((i-1)*.08,0,assembly));token.scale.setScalar(lerp(1,.68,assembly));
    });
    // Contact rails extend before the governed plotting field builds around them.
    contacts.visible=assembly>.05;paths.forEach(path=>{const n=path.geometry.index?.count||0;path.geometry.setDrawRange(0,Math.floor(n*smooth(assembly)/3)*3);});
    calculation.visible=model>.005&&valid;frame.scale.set(1,Math.max(.01,model),1);frame.position.y=-(1-model)*1.8;
    traceGroup.visible=model>.85;
    if(planTrace){const n=planTrace.geometry.index?.count||0;planTrace.geometry.setDrawRange(0,Math.floor(n*resolve/3)*3);}
    const from=new THREE.Vector3(-3.7,2.2,.08);decision.position.copy(from).lerp(endpoint,resolve);decisionRing.position.copy(decision.position);decisionRing.scale.setScalar(lerp(1.8,1,resolve));decision.visible=decisionRing.visible=model>.85;
    instrument.rotation.set(0,yaw,0);instrument.scale.setScalar(scale);
    const actual=slot.canvas.getBoundingClientRect(),aspect=actual.width/actual.height;camera.aspect=aspect;camera.fov=32;
    const fit=aspect<1.2?1.2/aspect:1;camera.position.set(.3,cameraY*fit,cameraZ*fit);camera.lookAt(0,targetY,0);camera.updateProjectionMatrix();
  }
  function paint(time:number){
    queued=0;if(disposed||document.hidden)return;
    // A 30 fps ceiling is sufficient for scroll-linked movement and keeps
    // mobile input latency independent of illustration complexity.
    if(time-lastPaint<32){queued=requestAnimationFrame(paint);return;}lastPaint=time;
    try{
      for(const slot of slots){
        if(slot.kind==='opening')frameFor(slot);
        if(!slot.visible)continue;
        if(slot.kind!=='opening')frameFor(slot);
        const bounds=slot.canvas.getBoundingClientRect();if(bounds.width<1||bounds.height<1)continue;
        const ratio=Math.min(devicePixelRatio||1,mobile()?1.25:1.5);
        const w=Math.round(Math.min(bounds.width,1500)*ratio),h=Math.round(Math.min(bounds.height,950)*ratio);
        if(w>bufferW||h>bufferH){bufferW=Math.max(bufferW,w);bufferH=Math.max(bufferH,h);renderer.setSize(bufferW,bufferH,false);}
        if(slot.canvas.width!==w||slot.canvas.height!==h){slot.canvas.width=w;slot.canvas.height=h;}
        renderer.setViewport(0,bufferH-h,w,h);renderer.setScissor(0,bufferH-h,w,h);renderer.setScissorTest(true);
        renderer.render(scene,camera);
        slot.ctx.clearRect(0,0,w,h);slot.ctx.drawImage(renderer.domElement,0,0,w,h,0,0,w,h);
        slot.canvas.parentElement?.classList.add('instrument-ready');
      }
      document.documentElement.dataset.instrumentRenderer='webgl';
    }catch{fallback();}
  }
  function requestPaint(){if(!disposed&&!queued)queued=requestAnimationFrame(paint);}
  const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{const slot=slots.find(s=>s.canvas===entry.target);if(slot)slot.visible=entry.isIntersecting;});requestPaint();},{rootMargin:'100px'});
  slots.forEach(slot=>observer.observe(slot.canvas));
  const resize=new ResizeObserver(requestPaint);slots.forEach(slot=>resize.observe(slot.canvas));
  window.addEventListener('scroll',requestPaint,{passive:true});window.addEventListener('resize',requestPaint,{passive:true});window.addEventListener('pageshow',requestPaint);
  document.addEventListener('visibilitychange',requestPaint);reduced.addEventListener('change',requestPaint);
  window.addEventListener('thriai:scenario',(event:Event)=>rebuild((event as CustomEvent<Scenario|null>).detail));
  // Catch up after the arithmetic module has initialized; no race can leave a
  // default graphic beside a changed or invalid scenario.
  const form=document.querySelector<HTMLFormElement>('#scenario-form');
  const readInitial=()=>{
    if(!form||!Array.from(form.querySelectorAll<HTMLInputElement>('input')).every(input=>input.validity.valid)){rebuild(null);return;}
    const get=(id:string)=>Number((document.getElementById(id) as HTMLInputElement).value);
    rebuild({cash:get('cash'),burn:get('burn'),hires:get('hires'),cost:get('hire-cost')});
  };
  readInitial();
  window.addEventListener('pagehide',()=>{observer.disconnect();resize.disconnect();fallback();},{once:true});
}
