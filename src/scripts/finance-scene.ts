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
  const environment=pmrem.fromScene(room,.04,0.1,100,{size:128});
  scene.environment=environment.texture;
  scene.environmentIntensity=.48;
  room.dispose();pmrem.dispose();
  const ambient=new THREE.HemisphereLight(0xb8d6ff,0x020713,.58);scene.add(ambient);
  const key=new THREE.DirectionalLight(0xffe7ce,3.0);key.position.set(-4,8,5);key.castShadow=true;
  key.shadow.mapSize.set(mobile()?512:1024,mobile()?512:1024);
  Object.assign(key.shadow.camera,{left:-8,right:8,top:8,bottom:-8,near:1,far:30});
  key.shadow.bias=-.0004;key.shadow.normalBias=.025;key.shadow.radius=3;scene.add(key);
  const rim=new THREE.DirectionalLight(0x72aaff,3.5);rim.position.set(3,4,-7);scene.add(rim);
  const warm=new THREE.DirectionalLight(0xff995d,.65);warm.position.set(6,3,2);scene.add(warm);
  const instrument=new THREE.Group();scene.add(instrument);

  // Fine physical roughness breaks large highlights; no image download needed.
  const grainCanvas=document.createElement('canvas');grainCanvas.width=128;grainCanvas.height=128;
  const grainCtx=grainCanvas.getContext('2d')!;const grainData=grainCtx.createImageData(128,128);
  let seed=247;for(let i=0;i<grainData.data.length;i+=4){seed=(seed*1664525+1013904223)>>>0;const v=170+(seed%70);grainData.data.set([v,v,v,255],i);}grainCtx.putImageData(grainData,0,0);
  const grain=new THREE.CanvasTexture(grainCanvas);grain.wrapS=grain.wrapT=THREE.RepeatWrapping;grain.repeat.set(10,6);
  const porcelain=new THREE.MeshPhysicalMaterial({color:0x06172e,metalness:.4,roughness:.34,roughnessMap:grain,clearcoat:.7,clearcoatRoughness:.22});
  const cobalt=new THREE.MeshPhysicalMaterial({color:0x073b9c,metalness:.48,roughness:.29,roughnessMap:grain,bumpMap:grain,bumpScale:.012,clearcoat:.85,clearcoatRoughness:.17});
  const copper=new THREE.MeshStandardMaterial({color:0xb3632d,metalness:.92,roughness:.29,roughnessMap:grain});
  const dark=new THREE.MeshStandardMaterial({color:0x071328,metalness:.62,roughness:.36,roughnessMap:grain});
  const chrome=new THREE.MeshStandardMaterial({color:0x95b4d8,metalness:.92,roughness:.23});
  const glass=new THREE.MeshPhysicalMaterial({color:0x4b6d93,metalness:0,roughness:.10,transmission:mobile()?0:.42,transparent:true,opacity:.37,thickness:.8,ior:1.45,depthWrite:false});
  const amber=new THREE.MeshPhysicalMaterial({color:0xf4a05a,metalness:.4,roughness:.18,clearcoat:1,emissive:0xad440e,emissiveIntensity:.14});

  function box(w:number,h:number,d:number,material:THREE.Material,x=0,y=0,z=0,r=.1){
    const mesh=new THREE.Mesh(new RoundedBoxGeometry(w,h,d,3,r),material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;return mesh;
  }
  const foundation=new THREE.Group();instrument.add(foundation);
  foundation.add(box(10.9,.48,4.6,dark,0,-.38,0,.13));
  foundation.add(box(10.72,.12,4.45,chrome,0,-.08,0,.10));
  foundation.add(box(10.60,.18,4.33,porcelain,0,.06,0,.10));
  // Ceramic channels, recessed fasteners and a warm perimeter inlay give scale.
  foundation.add(box(9.9,.015,.026,copper,0,.163,1.77,.006));
  for(const x of [-5.02,5.02])for(const z of [-1.9,1.9]){
    const screw=new THREE.Mesh(new THREE.CylinderGeometry(.045,.045,.018,16),chrome);screw.position.set(x,.165,z);foundation.add(screw);
    foundation.add(box(.055,.01,.009,dark,x,.181,z,.002));
  }
  for(let i=0;i<=12;i++){
    foundation.add(box(.019,.012,i%3===0?.18:.10,chrome,-4+i*8/12,.17,1.52,.003));
  }

  const horizon=new THREE.Group();horizon.position.set(0,.20,-.25);instrument.add(horizon);
  let liveBlue:THREE.Mesh|undefined,liveCopper:THREE.Mesh|undefined,liveGlass:THREE.Mesh|undefined;
  const seams=new THREE.Group();horizon.add(seams);
  const decision=new THREE.Group();horizon.add(decision);
  const diamond=new THREE.Mesh(new THREE.OctahedronGeometry(.22,0),amber);diamond.rotation.z=Math.PI/4;diamond.castShadow=true;decision.add(diamond);
  const decisionRing=new THREE.Mesh(new THREE.TorusGeometry(.31,.018,8,48),copper);decisionRing.rotation.x=-Math.PI/2;decisionRing.position.y=-.22;decision.add(decisionRing);

  function textTexture(text:string,color='#c3d3ec',size=44){
    const c=document.createElement('canvas');c.width=768;c.height=100;
    const ctx=c.getContext('2d')!;ctx.font=`500 ${size}px Arial`;ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,384,52);
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
  }
  function decal(text:string,w:number,d:number,color?:string){
    const m=new THREE.Mesh(new THREE.PlaneGeometry(w,d),new THREE.MeshBasicMaterial({map:textTexture(text,color),transparent:true,depthWrite:false}));m.rotation.x=-Math.PI/2;return m;
  }
  const timeMark=decal('TODAY     ·     03     ·     06     ·     09     ·     MONTH 12',8.4,.30);timeMark.position.set(0,.185,1.95);foundation.add(timeMark);
  const inputs=new THREE.Group();instrument.add(inputs);
  const sourceTokens:THREE.Group[]=[];
  ['CASH','MONTHLY BURN','PLANNED HIRES'].forEach((label,i)=>{
    const token=new THREE.Group();token.position.set(-3.1+i*3.1,.22,2.9);
    token.add(box(2.35,.28,.87,dark,0,0,0,.11));token.add(box(2.17,.06,.72,chrome,0,.17,0,.075));token.add(box(2.10,.04,.65,porcelain,0,.22,0,.05));
    const name=decal(label,1.85,.28);name.position.y=.248;token.add(name);
    const contact=box(.32,.08,.16,copper,0,.03,-.49,.018);token.add(contact);
    inputs.add(token);sourceTokens.push(token);
  });
  const tracks=new THREE.Group();instrument.add(tracks);
  function tube(points:THREE.Vector3[],radius:number,mat:THREE.Material){return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),24,radius,6,false),mat);}
  for(const x of [-3.1,0,3.1]){
    tracks.add(tube([new THREE.Vector3(x,.18,2.45),new THREE.Vector3(x,.18,1.7),new THREE.Vector3(x*.46,.18,.8),new THREE.Vector3(0,.18,.65)],.019,copper));
  }
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(40,30),new THREE.ShadowMaterial({opacity:.38}));ground.rotation.x=-Math.PI/2;ground.position.y=-.66;ground.receiveShadow=true;instrument.add(ground);

  // Extruded 12-month cash mass. The endpoint truncates exactly at zero;
  // negative month-12 cash remains explanatory HTML, never negative geometry.
  function wedge(top:(month:number)=>number,bottom:(month:number)=>number,depth:number,stop=12){
    const shape=new THREE.Shape();const samples=[0,...Array.from({length:12},(_,i)=>i+1).filter(n=>n<stop),stop];
    shape.moveTo(-4,bottom(0));for(const t of samples)shape.lineTo(-4+t*8/12,top(t));
    for(const t of [...samples].reverse())shape.lineTo(-4+t*8/12,bottom(t));shape.closePath();
    const geo=new THREE.ExtrudeGeometry(shape,{depth,steps:1,bevelEnabled:true,bevelSegments:3,bevelSize:.045,bevelThickness:.045,curveSegments:1});geo.translate(0,0,-depth/2);return geo;
  }
  let valid=true;let values:Scenario={cash:1200000,burn:75000,hires:2,cost:10000};
  function rebuild(next:Scenario|null){
    valid=!!next;horizon.visible=valid;
    document.documentElement.dataset.instrumentState=valid?'valid':'invalid';
    if(!next){requestPaint();return;}values=next;
    for(const mesh of [liveBlue,liveCopper,liveGlass])if(mesh){horizon.remove(mesh);mesh.geometry.dispose();}
    while(seams.children.length){const obj=seams.children.pop() as THREE.Mesh;obj.geometry.dispose();}
    const {cash,burn,hires,cost}=next,total=burn+hires*cost;
    const plan=(t:number)=>Math.max(0,1-total*t/cash)*2.45+.04;
    const base=(t:number)=>Math.max(0,1-burn*t/cash)*2.45+.04;
    const zero=Math.min(12,cash/total);
    liveBlue=new THREE.Mesh(wedge(plan,()=>.04,1.5,zero),cobalt);liveBlue.castShadow=true;liveBlue.receiveShadow=true;horizon.add(liveBlue);
    liveCopper=new THREE.Mesh(wedge(base,plan,.46,Math.min(12,cash/burn)),copper);liveCopper.position.z=.42;liveCopper.visible=hires>0;liveCopper.castShadow=true;horizon.add(liveCopper);
    liveGlass=new THREE.Mesh(wedge(base,()=>.04,.22,Math.min(12,cash/burn)),glass);liveGlass.position.z=-1.02;horizon.add(liveGlass);
    for(let m=1;m<zero;m++){
      const x=-4+m*8/12;const groove=box(.010,Math.max(.05,plan(m)-.04),.006,dark,x,plan(m)/2,.799,.002);seams.add(groove);
    }
    // Quarter-cash contours stop where they meet the actual plan horizon.
    // Together with month seams these are meaningful calibrated surface marks.
    for(const fraction of [.25,.5,.75]){
      const crossing=Math.min(12,cash*(1-fraction)/total),length=crossing*8/12;
      if(length>.02)seams.add(box(length,.009,.008,porcelain,-4+length/2,.04+2.45*fraction,.800,.002));
    }
    decision.position.set(-4+zero*8/12,plan(zero)+.16,0);
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
    let yaw=-.33,pitch=0,explode=0,lift=0,cameraY=9,cameraZ=13,scale=1,targetY=.6;
    instrument.position.set(0,0,0);instrument.rotation.set(0,0,0);
    inputs.visible=true;tracks.visible=true;foundation.visible=true;ground.visible=true;
    if(slot.kind==='opening'){
      const d=delivery?smooth((innerHeight-delivery.getBoundingClientRect().top)/(innerHeight*.85)):0;
      const r=reach?smooth((innerHeight-reach.getBoundingClientRect().top)/(innerHeight*.9)):0;
      const end=reach?smooth((innerHeight*.65-reach.getBoundingClientRect().bottom)/(innerHeight*.65)):0;
      const presence=(el:HTMLElement|null)=>{if(!el)return 0;const b=el.getBoundingClientRect();return smooth((innerHeight-b.top)/(innerHeight*.9))*smooth(b.bottom/(innerHeight*.85));};
      slot.canvas.parentElement?.style.setProperty('--scene-scrim',String(Math.max(presence(delivery)*.65,presence(reach)*.12)));
      const label=document.querySelector<HTMLElement>('.scene-index');
      if(label)label.style.opacity=String(delivery?smooth((delivery.getBoundingClientRect().top-innerHeight*.65)/(innerHeight*.35)):1);
      const sceneLabel=document.getElementById('scene-label');if(sceneLabel)sceneLabel.textContent=r>.5?'03 / EXTEND THE EXPERTISE':d>.5?'02 / BUILD THE SYSTEM':'01 / CONNECT THE INFORMATION';
      explode=reduced.matches?0:d*(1-r*.65);lift=reduced.matches?0:d*(1-r)+r*.25*(1-end);
      yaw=lerp(-.62,.42,d)-r*.55+end*.2;cameraY=6+d*3+r*1.5;cameraZ=13.5-d*1.5+r*1.5;
      scale=mobile()?1:.98-d*.20+r*.14;
      if(!mobile()){
        const heading=reach?.querySelector('h2')?.getBoundingClientRect();
        const lowerTop=clamp((heading?.bottom??innerHeight*.55)+26,innerHeight*.35,innerHeight*.74);
        const heroBox=[innerWidth*.49,innerHeight*.14,innerWidth*.61,innerHeight*.70];
        const deliveryBox=[innerWidth*.70,innerHeight*.025,innerWidth*.30,innerHeight*.34];
        const reachBox=[innerWidth*.025,lowerTop,innerWidth*.51,innerHeight-lowerTop-20];
        const box=heroBox.map((n,i)=>lerp(lerp(n,deliveryBox[i],d),reachBox[i],r));
        slot.canvas.style.left=`${box[0]}px`;slot.canvas.style.top=`${box[1]}px`;slot.canvas.style.width=`${box[2]}px`;slot.canvas.style.height=`${Math.max(170,box[3])}px`;
        slot.canvas.style.opacity='1';
      }else{
        for(const key of ['left','top','width','height'])slot.canvas.style.removeProperty(key);
      }
      if(mobile()){cameraY=10;cameraZ=16;scale=.92;}
      if(reduced.matches){yaw=-.35;explode=0;lift=0;cameraY=9;cameraZ=14;scale=mobile()?.92:.9;instrument.position.set(0,0,0);}
      // Confine the mobile scene to the hero artwork window. Body copy has its
      // own calm background; lower authored transformations use inline slots.
      if(mobile()&&opening){slot.canvas.style.opacity=String(1-smooth((-opening.getBoundingClientRect().top-520)/220));}
    }else if(slot.kind==='proof'){
      yaw=lerp(-.6,-.2,progress);explode=(1-progress)*.75;lift=(1-progress)*.7;cameraY=12;cameraZ=12;scale=1.02;
    }else if(slot.kind==='horizon'){
      yaw=lerp(-.48,-.05,progress);explode=(1-progress)*.65;lift=(1-progress)*1.1;cameraY=lerp(7,10,progress);cameraZ=14;scale=mobile()?1.1:1.75;
    }else if(slot.kind==='scope'){
      // Records withdraw from their sockets, while the copper hiring volume
      // lifts from the blue plan: source / calculation / decision are distinct.
      yaw=lerp(-.32,.28,progress);explode=progress*.95;lift=progress*.7;cameraY=7;cameraZ=15;scale=mobile()?1.1:1.44;targetY=1.5;
    }else if(slot.kind==='closing'){
      yaw=lerp(.28,-.5,progress);explode=(1-progress)*.9;lift=(1-progress)*.7;cameraY=7;cameraZ=13;scale=1.10;
    }
    sourceTokens.forEach((token,i)=>{token.position.set(-3.1+i*3.1,.22+explode*(i===1?1.55:1.05),2.9+explode*.75);token.rotation.set(explode*-.12,explode*(i-1)*.1,0);});
    if(liveCopper)liveCopper.position.y=lift*1.2;
    if(liveGlass){liveGlass.position.y=lift*.35;liveGlass.position.z=-1.02-lift*.65;}
    horizon.position.y=.20+explode*.23;
    instrument.rotation.set(pitch,yaw,0);instrument.scale.setScalar(scale);
    const actual=slot.canvas.getBoundingClientRect();const aspect=actual.width/actual.height;
    camera.aspect=aspect;camera.fov=mobile()?36:32;
    // Landscape slots fit the full physical horizon, portrait slots use a
    // slightly greater camera distance rather than clipping essential geometry.
    const fit=aspect<1.35?1.35/aspect:1;
    camera.position.set(.3,cameraY*fit,cameraZ*fit);camera.lookAt(0,targetY,0);camera.updateProjectionMatrix();
  }
  function paint(time:number){
    queued=0;if(disposed||document.hidden)return;
    // A 30 fps ceiling is sufficient for scroll-linked movement and keeps
    // mobile input latency independent of illustration complexity.
    if(time-lastPaint<32){queued=requestAnimationFrame(paint);return;}lastPaint=time;
    try{
      for(const slot of slots){
        if(!slot.visible)continue;
        frameFor(slot);
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
