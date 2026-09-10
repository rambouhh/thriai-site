const canvas = document.querySelector<HTMLCanvasElement>('#system-canvas');
const opening = document.getElementById('opening');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// The planes represent records, models and decisions. Their alignment is tied
// directly to scroll position, so reverse scrolling and mid-page loads agree.
if (canvas && opening) {
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const stage = canvas.parentElement;
    const delivery = opening.querySelector<HTMLElement>('.delivery-section');
    const reach = opening.querySelector<HTMLElement>('.reach-section');
    const sceneIndex = opening.querySelector<HTMLElement>('.scene-index');
    let width = 0, height = 0, frame = 0, lastFrame = 0, active = true;
    const clamp = (n: number, a = 0, b = 1) => Math.max(a, Math.min(b,n));
    const smooth = (n:number) => {const t=clamp(n);return t*t*(3-2*t);};
    const resize = () => {
      width = canvas.clientWidth; height = canvas.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr,0,0,dpr,0,0); draw(performance.now());
    };
    const draw = (time: number) => {
      const rect = opening.getBoundingClientRect();
      const p = reducedMotion.matches ? 0 : clamp(-rect.top / (opening.offsetHeight - height));
      const mobile = width < 768;
      const deliveryBounds = delivery?.getBoundingClientRect();
      const reachBounds = reach?.getBoundingClientRect();
      // Legibility belongs to the continuous viewport scene, never a moving
      // rectangular chapter overlay. Opacity is reversible scroll geometry.
      const presence = (bounds:DOMRect|undefined) => bounds ? smooth((height-bounds.top)/(height*.9))*smooth(bounds.bottom/(height*.85)) : 0;
      const deliveryPresence = presence(deliveryBounds);
      const reachPresence = presence(reachBounds);
      const scrim = Math.max(deliveryPresence*.93,reachPresence*(mobile?.62:.43));
      stage?.style.setProperty('--scene-scrim',scrim.toFixed(3));
      const labelAlpha = deliveryBounds ? smooth((deliveryBounds.top-height*.65)/(height*.35)) : 1;
      if(sceneIndex)sceneIndex.style.opacity=String(labelAlpha);
      const deliveryArrival=deliveryBounds?smooth((height-deliveryBounds.top)/(height*.85)):0;
      const reachArrival=reachBounds?smooth((height-reachBounds.top)/(height*.9)):0;
      const handoff=reachBounds?smooth((height*.6-reachBounds.bottom)/(height*.7)):0;
      const bluePhase = reachArrival;
      const scale = (mobile ? width * .00105 : Math.min(width * .00067,1.16)) * (1 - deliveryArrival*.29 + reachArrival*.40 - handoff*.2);
      const centerX = width * (mobile ? .60 - bluePhase * .1 : .76 + deliveryArrival*.16 - reachArrival*.53 + handoff*.12);
      const centerY = height * (mobile ? .49 + bluePhase * .12 : .49 - deliveryArrival*.19 + reachArrival*.36 + handoff*.10);
      const spin = -.36 + deliveryArrival*.60 - reachArrival*.15 + handoff*.18;
      const tilt = .86 + deliveryArrival*.18 - reachArrival*.40 + handoff*.65;
      ctx.clearRect(0,0,width,height);
      const atmosphere = ctx.createRadialGradient(centerX,centerY,0,centerX,centerY,Math.max(width,height)*.7);
      atmosphere.addColorStop(0,`rgba(22,64,${145 + Math.round(bluePhase*100)},${.16+bluePhase*.5})`);
      atmosphere.addColorStop(.55,`rgba(14,38,110,${bluePhase*.37})`);
      atmosphere.addColorStop(1,'rgba(6,10,18,0)');
      ctx.fillStyle=atmosphere;ctx.fillRect(0,0,width,height);
      const project = (x:number,y:number,z:number) => {
        const rotX=x*Math.cos(spin)-z*Math.sin(spin), rotZ=x*Math.sin(spin)+z*Math.cos(spin);
        const ry=y*Math.cos(tilt)-rotZ*Math.sin(tilt), rz=y*Math.sin(tilt)+rotZ*Math.cos(tilt);
        const persp=1150/(1150+rz);
        return {x:centerX+rotX*scale*persp,y:centerY+ry*scale*persp,z:rz};
      };
      const path = (points:{x:number,y:number}[]) => {ctx.beginPath();points.forEach((v,i)=>i?ctx.lineTo(v.x,v.y):ctx.moveTo(v.x,v.y));};
      const separation=195-deliveryArrival*133+reachArrival*172-handoff*175;
      const layers = [
        {y:separation,size:270,offset:-210,color:'65,111,255'},
        {y:0,size:265,offset:-60,color:'98,151,255'},
        {y:-separation,size:245,offset:70,color:'255,151,91'},
      ];
      layers.forEach((layer,li) => {
        const drift = layer.offset*(1-bluePhase*.22);
        const contour=(inset=0,depth=0)=>{
          const pts=[];
          for(let step=0;step<=128;step++) {
            const t=step/128*Math.PI*2;
            const x=Math.sign(Math.cos(t))*Math.pow(Math.abs(Math.cos(t)),.32)*(layer.size-inset);
            const z=Math.sign(Math.sin(t))*Math.pow(Math.abs(Math.sin(t)),.32)*(layer.size-inset);
            pts.push(project(x+drift,layer.y+depth+Math.sin(t*2+p*2)*9*(1-bluePhase),z));
          }
          return pts;
        };
        const outer=contour(),under=contour(0,14),inner=contour(29);
        const xs=outer.map(v=>v.x),ys=outer.map(v=>v.y);
        const left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys);
        // Physical thickness and contact shadow separate the planes. Surfaces
        // paint back-to-front; upper material occludes the lower structure.
        path(under);ctx.closePath();ctx.fillStyle='#061024';ctx.shadowColor='#000';ctx.shadowBlur=38;ctx.shadowOffsetY=18;ctx.fill();ctx.shadowBlur=0;ctx.shadowOffsetY=0;
        const side=ctx.createLinearGradient(left,top,right,bottom);
        side.addColorStop(0,'#081629');side.addColorStop(.45,'#123579');side.addColorStop(.73,'#1d54c5');side.addColorStop(1,'#080e1b');
        for(let j=0;j<128;j++){
          if((outer[j].y+outer[j+1].y)/2<centerY+layer.y*scale*.35)continue;
          path([outer[j],outer[j+1],under[j+1],under[j]]);ctx.closePath();ctx.fillStyle=side;ctx.fill();
        }
        path(outer);ctx.closePath();ctx.fillStyle=li===2?'rgba(5,9,18,.97)':'rgba(6,14,32,.96)';ctx.fill();
        // A broad blue reflection crosses smoked material. It has a dark core
        // and concentrated rim, rather than uniform wireframe illumination.
        ctx.save();path(outer);ctx.closePath();ctx.clip();
        const reflection=ctx.createLinearGradient(left,bottom,right,top);
        reflection.addColorStop(0,'rgba(87,157,255,.86)');
        reflection.addColorStop(.09,'rgba(36,93,249,.74)');
        reflection.addColorStop(.23,'rgba(22,49,143,.45)');
        reflection.addColorStop(.46,'rgba(6,14,36,.03)');
        reflection.addColorStop(.78,'rgba(5,9,18,0)');
        reflection.addColorStop(1,li===2?'rgba(219,94,31,.29)':'rgba(25,62,140,.14)');
        ctx.fillStyle=reflection;ctx.fillRect(left,top,right-left,bottom-top);
        const pool=ctx.createRadialGradient(left+(right-left)*.23,bottom-22,0,left+(right-left)*.23,bottom-22,(right-left)*.53);
        pool.addColorStop(0,'rgba(65,127,255,.48)');pool.addColorStop(.36,'rgba(25,67,199,.18)');pool.addColorStop(1,'rgba(9,17,34,0)');ctx.fillStyle=pool;ctx.fillRect(left,top,right-left,bottom-top);
        ctx.restore();
        // Recessed center leaves one clear quiet mass; just three etched
        // contours retain the connection to modeled records and data planes.
        path(inner);ctx.closePath();ctx.fillStyle='rgba(5,10,23,.31)';ctx.fill();
        for(const inset of [10,20,31]){
          path(contour(inset));ctx.strokeStyle=`rgba(111,158,248,${inset===31?.13:.07})`;ctx.lineWidth=.65;ctx.stroke();
        }
        // Each material surface carries a different, nonnumeric structure.
        // All marks share its world coordinates and are clipped before the
        // next, nearer plane is drawn, so the geometry obeys true occlusion.
        ctx.save();path(inner);ctx.closePath();ctx.clip();
        const structureScale=(layer.size-44)/240;
        const surface=(x:number,z:number)=>project(x*structureScale+drift,layer.y-1,z*structureScale);
        const line=(points:[number,number][],color:string,lineWidth=1)=>{
          path(points.map(([x,z])=>surface(x,z)));ctx.strokeStyle=color;ctx.lineWidth=lineWidth;ctx.stroke();
        };
        const tile=(x:number,z:number,w:number,h:number,color:string)=>{
          path([surface(x,z),surface(x+w,z),surface(x+w,z+h),surface(x,z+h)]);ctx.closePath();ctx.fillStyle=color;ctx.fill();
        };
        if(li===0){
          // RECORDS: regular entries and reconciliation rails. Equal units
          // describe structure, never a fabricated company data series.
          const strength=.72+(1-smooth(p/.5))*.22;
          for(let row=0;row<6;row++){
            const z=-184+row*72;
            tile(-228,z-4,14,14,`rgba(162,199,255,${strength})`);
            tile(-191,z,176,5,`rgba(110,166,255,${strength*.78})`);
            tile(24,z,66,5,`rgba(160,196,255,${strength*.85})`);
            tile(139,z,53,5,`rgba(160,196,255,${strength*.85})`);
          }
          line([[-204,-222],[-204,224]],'rgba(105,152,231,.16)');
          line([[114,-222],[114,224]],'rgba(105,152,231,.16)');
          line([[-228,241],[212,241]],'rgba(113,164,255,.42)',1.2);
        }else if(li===1){
          // MODEL: a governed dependency structure joins inputs to one spine.
          // Its paths brighten around the middle of the scroll argument.
          const strength=.72+Math.sin(clamp((p-.12)/.69)*Math.PI)*.22;
          const inputs:[number,number][]=[[-216,-176],[-216,0],[-216,176]];
          const branches:[number,number][]=[[-20,-130],[-20,130]];
          inputs.forEach((start,i)=>{
            const branch=branches[i===2?1:0];
            line([start,[-124,start[1]],[-124,branch[1]],branch],`rgba(113,171,255,${strength})`,2.2);
            if(i===1)line([start,[-124,0],[-124,130],branches[1]],`rgba(113,171,255,${strength*.8})`,2.2);
          });
          branches.forEach(point=>line([point,[82,point[1]],[82,0],[212,0]],`rgba(151,199,255,${strength})`,2.5));
          [...inputs,...branches,[212,0] as [number,number]].forEach(([x,z],i)=>{
            tile(x-11,z-11,22,22,'rgba(29,66,131,1)');
            line([[x-11,z-11],[x+11,z-11],[x+11,z+11],[x-11,z+11],[x-11,z-11]],`rgba(176,216,255,${strength})`,1.2);
            if(i===5)tile(x-5,z-5,10,10,'rgba(222,240,255,.95)');
          });
        }else{
          // DECISION: one deliberate route through alternate branches. The
          // selected warm trace becomes legible as the planes align, linking
          // this abstract system to the real cash/hiring model below.
          const strength=.75+smooth((p-.2)/.58)*.23;
          line([[-220,145],[-113,145],[-113,12],[-3,12],[-3,-131],[205,-131]],`rgba(73,119,210,${strength*.5})`,1.1);
          line([[-113,145],[-113,205],[190,205]],`rgba(80,120,190,${strength*.3})`,.8);
          line([[-3,12],[85,12],[85,108],[205,108]],`rgba(80,120,190,${strength*.3})`,.8);
          const trace:[number,number][]=[[-220,145],[-113,145],[-113,12],[-3,12],[-3,-131],[205,-131]];
          ctx.shadowColor='#fe9558';ctx.shadowBlur=8;
          line(trace,`rgba(255,187,123,${strength})`,2.8);ctx.shadowBlur=0;
          [[-220,145],[-113,12],[-3,-131],[205,-131]].forEach(([x,z],i)=>{
            tile(x-6,z-6,12,12,`rgba(${i===3?'255,217,171':'153,196,255'},${strength})`);
          });
          // The end is a larger open diamond, distinguishable without words.
          line([[205,-156],[230,-131],[205,-106],[180,-131],[205,-156]],`rgba(255,207,153,${strength})`,2);
        }
        ctx.restore();
        const rim=ctx.createLinearGradient(left,top,right,bottom);
        rim.addColorStop(0,li===2?'#ffbe86':'#4c83ed');rim.addColorStop(.19,li===2?'#ed8844':'#2b65ea');rim.addColorStop(.36,'#122e63');rim.addColorStop(.52,'#153ba5');rim.addColorStop(.74,'#428aff');rim.addColorStop(.86,'#a6d4ff');rim.addColorStop(1,'#2a60ce');
        // Bloom follows only the true outer edge. The bright core has a narrow
        // highlight while broad spill makes neighboring darkness feel deep.
        for(const pass of [{width:19,alpha:.09,blur:27},{width:6,alpha:.2,blur:16},{width:1.8,alpha:.96,blur:5}]){
          path(outer);ctx.strokeStyle=rim;ctx.lineWidth=pass.width;ctx.globalAlpha=pass.alpha;ctx.shadowColor=li===2?'#db7538':'#285fff';ctx.shadowBlur=pass.blur;ctx.stroke();
        }
        ctx.globalAlpha=1;ctx.shadowBlur=0;
        // One fine specular sliver makes the rounded edge read as material.
        const glint=outer.slice(72,101);path(glint);ctx.lineWidth=.9;ctx.strokeStyle='rgba(184,220,255,.76)';ctx.stroke();
        // Records enter through a small number of purposeful connections.
        for(let j=0;j<4;j++) {
          const z=-160+j*85;
          const start=project(-780,layer.y,z),join=project(-layer.size+95,layer.y,z),end=project(-80,layer.y,z);
          const grad=ctx.createLinearGradient(start.x,start.y,end.x,end.y);
          grad.addColorStop(0,'rgba(31,83,206,0)');grad.addColorStop(.68,`rgba(69,115,255,${.055+bluePhase*.08})`);grad.addColorStop(1,'rgba(89,135,255,0)');
          ctx.beginPath();ctx.moveTo(start.x,start.y);ctx.bezierCurveTo(join.x-90,join.y+30,join.x,join.y,end.x,end.y);ctx.strokeStyle=grad;ctx.lineWidth=.65;ctx.stroke();
        }
      });
      // One warm thread connects the surfaces: source -> model -> decision.
      const thread=[];
      for(let j=0;j<=70;j++){
        const t=j/70;
        thread.push(project(30+t*240+Math.sin(t*Math.PI*2)*10,separation+20-t*(separation*2+40),130+Math.cos(t*Math.PI*2)*18));
      }
      path(thread);ctx.strokeStyle='rgba(255,164,100,.8)';ctx.lineWidth=1.4;ctx.shadowColor='#ff8a44';ctx.shadowBlur=17;ctx.stroke();ctx.shadowBlur=0;
      [0,.5,1].forEach((t,i)=>{
        const at=thread[Math.round(t*70)];ctx.fillStyle=i===2?'#ffc390':'#8eb5ff';ctx.fillRect(at.x-2,at.y-2,4,4);
        if(!mobile && labelAlpha>.01){
          ctx.save();ctx.globalAlpha=labelAlpha;
          const name=['RECORDS','MODELS','DECISIONS'][i];
          ctx.font='12px monospace';ctx.letterSpacing='1px';
          const textWidth=ctx.measureText(name).width;
          const tx=clamp(at.x+14,Math.max(28,width*.52),width-textWidth-28),ty=clamp(at.y+4,125,height-75);
          if(Math.abs(tx-at.x)>28||Math.abs(ty-at.y)>20){ctx.beginPath();ctx.moveTo(at.x,at.y);ctx.lineTo(tx-8,ty-4);ctx.strokeStyle='rgba(143,173,217,.24)';ctx.lineWidth=.6;ctx.stroke();}
          ctx.fillStyle=i===2?'#efbd99':'#a4b8d8';ctx.fillText(name,tx,ty);
          ctx.restore();
        }
      });
      // A single pulse along the connection, never a decorative particle field.
      if(!reducedMotion.matches){const node=thread[Math.floor((time/4800)%1*70)];ctx.beginPath();ctx.arc(node.x,node.y,2.5,0,Math.PI*2);ctx.fillStyle='#fff1d8';ctx.shadowColor='#ff985c';ctx.shadowBlur=18;ctx.fill();ctx.shadowBlur=0;}
      const label=document.getElementById('scene-label');
      if(label)label.textContent=p<.25?'01 / CONNECT THE INFORMATION':p<.57?'02 / BUILD THE SYSTEM':'03 / EXTEND THE EXPERTISE';
    };
    const loop = (time:number) => {
      if(active && document.documentElement.dataset.instrumentRenderer!=='native-svg' && !document.hidden && time-lastFrame>33){draw(time);lastFrame=time;}
      if(!reducedMotion.matches)frame=requestAnimationFrame(loop);
    };
    new IntersectionObserver(([entry])=>{active=entry.isIntersecting;},{rootMargin:'100px'}).observe(opening);
    new ResizeObserver(resize).observe(canvas);
    reducedMotion.addEventListener('change',()=>{cancelAnimationFrame(frame);draw(performance.now());if(!reducedMotion.matches)frame=requestAnimationFrame(loop);});
    window.addEventListener('scroll',()=>{if(reducedMotion.matches)draw(performance.now());},{passive:true});
    canvas.parentElement?.classList.add('canvas-ready');resize();
    if(!reducedMotion.matches)frame=requestAnimationFrame(loop);
  }
}

// Deliberately simple arithmetic, exposed beside the synthetic scenario.
const form = document.querySelector<HTMLFormElement>('#scenario-form');
if(form){
  const currency = (value:number) => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(value);
  const setText = (id:string,value:string) => {const el=document.getElementById(id);if(el)el.textContent=value;};
  const update = () => {
    const error=document.getElementById('demo-error');
    const result=document.querySelector<HTMLElement>('.demo-result');
    const fields=Array.from(form.querySelectorAll<HTMLInputElement>('input'));
    fields.forEach(input=>input.setAttribute('aria-invalid',String(!input.validity.valid)));
    const invalid=fields.find(input=>!input.validity.valid);
    if(invalid){
      const names:Record<string,string>={cash:'Cash today',burn:'Monthly net cash burn','hire-cost':'Monthly cost per hire',hires:'Planned hires'};
      const issue=invalid.validity.valueMissing || invalid.validity.badInput ? 'enter a whole-dollar amount' : invalid.validity.stepMismatch ? 'use whole dollars' : `enter an amount from ${currency(Number(invalid.min))} to ${currency(Number(invalid.max))}`;
      if(error){error.textContent=`${names[invalid.id]}: ${issue}. Results will update when all inputs are valid.`;error.hidden=false;}
      if(result)result.dataset.state='invalid';
      setText('runway','—');setText('decision-answer','Complete the highlighted input to calculate this scenario.');setText('formula','The scenario is incomplete. No current result is available.');setText('chart-title','No current chart: complete all scenario inputs to calculate.');
      updateWorkingStory(null);
      return;
    }
    if(error)error.hidden=true;
    if(result)result.dataset.state='valid';
    const value=(id:string)=>Number((document.getElementById(id) as HTMLInputElement).value);
    const cash=value('cash'),burn=value('burn'),hires=value('hires'),cost=value('hire-cost');
    const additional=hires*cost,total=burn+additional,runway=cash/total,baseline=cash/burn,remaining=cash-total*12;
    const niceRunway = runway>=1000 ? new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:1}).format(runway) : runway.toFixed(1);
    setText('hire-count',`${hires} ${hires===1?'person':'people'}`);setText('runway',niceRunway);
    updateWorkingStory({cash,burn,hires,cost});
    const impact=hires===0 ? 'With no additional hires, the scenario keeps the current burn rate.' : `${hires} ${hires===1?'hire adds':'hires add'} ${currency(additional)} to monthly burn and ${hires===1?'reduces':'reduce'} runway by ${(baseline-runway).toFixed(1)} months.`;
    const outcome=remaining>=0 ? `At month 12, the model leaves ${currency(remaining)} in cash.` : `Cash reaches zero after ${runway.toFixed(1)} months, before the 12-month horizon.`;
    setText('decision-answer',`${impact} ${outcome}`);
    setText('formula',`${currency(cash)} ÷ (${currency(burn)} + ${hires} × ${currency(cost)}) = ${runway.toFixed(1)} months. Before hires: ${baseline.toFixed(1)} months. Month 12 cash = ${currency(cash)} − 12 × ${currency(total)} = ${currency(remaining)}.`);
    const endpoint=(monthly:number)=>({x:20+500*Math.min(1,cash/(monthly*12)),y:24+114*Math.min(1,monthly*12/cash)});
    const base=endpoint(burn),plan=endpoint(total);
    document.getElementById('baseline-line')?.setAttribute('d',`M20 24L${base.x} ${base.y}`);
    document.getElementById('hiring-line')?.setAttribute('d',`M20 24L${plan.x} ${plan.y}`);
    document.getElementById('cash-area')?.setAttribute('d',`M20 24L${plan.x} ${plan.y}L${plan.x} 138H20Z`);
    document.getElementById('cash-endpoint')?.setAttribute('cx',String(plan.x));document.getElementById('cash-endpoint')?.setAttribute('cy',String(plan.y));
    setText('chart-title',`Illustrative cash balance. Before hires, ${baseline.toFixed(1)} months of runway. With ${hires} hires, ${runway.toFixed(1)} months of runway. Chart horizon is 12 months.`);
  };
  form.addEventListener('input',()=>{update(); const signal=document.querySelector<HTMLElement>('.model-signal');if(signal&&!reducedMotion.matches)signal.animate([{transform:'scaleX(0)',opacity:.8},{transform:'scaleX(1)',opacity:1},{transform:'scaleX(1)',opacity:0}],{duration:650,easing:'ease-out'});});form.addEventListener('submit',e=>e.preventDefault());update();
}

// One real synthetic scenario supplies every later material view. This is a
// projection of the demo's values, not a second model or an invented report.
function refreshStorySummary(){
  const visual=document.querySelector<HTMLElement>('.story-visual');
  const view=visual?.querySelector<HTMLElement>('.scenario-stack')?.dataset.view||'sources';
  const summary=visual?.querySelector<HTMLElement>('[data-scenario="mobile"]');
  if(!visual||!summary)return;
  summary.textContent=visual.dataset.state==='invalid'?'Complete the demo inputs to update this scenario.':view==='sources'?`Cash ${visual.dataset.cash} · ${visual.dataset.hires} planned hires`:view==='model'?`${visual.dataset.runway} months of runway · ${visual.dataset.total}/month burn`:`Month 12 cash: ${visual.dataset.remaining}. Review timing and cash buffer.`;
}
function updateWorkingStory(values:{cash:number;burn:number;hires:number;cost:number}|null){
  const baseline=values?values.cash/values.burn:0;
  const baselineValues=values?{runway:baseline>=1000?new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:1}).format(baseline):baseline.toFixed(1),remaining:new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(values.cash-values.burn*12)}:{runway:'—',remaining:'—'};
  document.querySelectorAll<HTMLElement>('[data-baseline-value]').forEach(node=>node.textContent=baselineValues[node.dataset.baselineValue as keyof typeof baselineValues]);
  window.dispatchEvent(new CustomEvent('thriai:scenario',{detail:values}));
  const workingMoney=(n:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
  const workingValues=values?{hiring:`${values.hires} × ${workingMoney(values.cost)}`,additional:workingMoney(values.hires*values.cost),remaining:workingMoney(values.cash-(values.burn+values.hires*values.cost)*12)}:{hiring:'—',additional:'—',remaining:'—'};
  document.querySelectorAll<HTMLElement>('[data-working-value]').forEach(node=>node.textContent=workingValues[node.dataset.workingValue as keyof typeof workingValues]);
  const visual=document.querySelector<HTMLElement>('.story-visual');
  if(!visual)return;
  const write=(key:string,value:string)=>visual.querySelectorAll<HTMLElement>(`[data-scenario="${key}"]`).forEach(node=>node.textContent=value);
  if(!values){visual.dataset.state='invalid';['cash','burn','hires','cost','runway','total','remaining'].forEach(key=>write(key,'—'));write('decision','Complete the highlighted demo input to calculate this scenario.');refreshStorySummary();return;}
  visual.dataset.state='valid';
  const {cash,burn,hires,cost}=values;
  const money=(n:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
  const total=burn+hires*cost,runway=cash/total,remaining=cash-total*12;
  const runwayLabel=runway>=1000?new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:1}).format(runway):runway.toFixed(1);
  const entries={cash:money(cash),burn:money(burn),hires:`${hires} ${hires===1?'person':'people'}`,cost:money(cost),runway:runwayLabel,total:money(total),remaining:money(remaining)};
  Object.entries(entries).forEach(([key,value])=>write(key,value));
  Object.assign(visual.dataset,{cash:money(cash),hires:String(hires),runway:runwayLabel,total:money(total),remaining:money(remaining)});
  write('decision',hires===0?'With no additional hires, this scenario keeps the current burn rate.':`${hires} ${hires===1?'hire adds':'hires add'} ${money(hires*cost)} to monthly burn and ${hires===1?'reduces':'reduce'} runway by ${(cash/burn-runway).toFixed(1)} months.`);
  const endpoint=(monthly:number)=>({x:20+440*Math.min(1,cash/(monthly*12)),y:25+140*Math.min(1,monthly*12/cash)});
  const base=endpoint(burn),plan=endpoint(total);
  visual.querySelectorAll('[data-scenario-path="base"]').forEach(node=>node.setAttribute('d',`M20 25L${base.x} ${base.y}`));
  visual.querySelectorAll('[data-scenario-path="plan"]').forEach(node=>node.setAttribute('d',`M20 25L${plan.x} ${plan.y}`));
  visual.querySelectorAll('[data-scenario-path="area"]').forEach(node=>node.setAttribute('d',`M20 25L${plan.x} ${plan.y}L${plan.x} 165H20Z`));
  visual.querySelectorAll('[data-scenario-point="plan"]').forEach(node=>node.setAttribute('cx',String(plan.x)));
  visual.querySelectorAll('[data-scenario-point="plan"]').forEach(node=>node.setAttribute('cy',String(plan.y)));
  refreshStorySummary();
}

// Natural-scroll arrivals: each folio opens while entering, then rests fully
// readable. No pinned chapter, timer, or hidden text controls reading speed.
const financeScenes=Array.from(document.querySelectorAll<HTMLElement>('[data-finance-scene]'));
let financeFrame=0;
const renderFinanceScenes=()=>{
  financeFrame=0;
  financeScenes.forEach(scene=>{
    const material=scene.querySelector('.runway-landscape,.finance-folio,.open-brief')||scene;
    const bounds=material.getBoundingClientRect();
    const entry=reducedMotion.matches?1:Math.max(0,Math.min(1,(window.innerHeight-bounds.top)/(window.innerHeight*.75)));
    scene.style.setProperty('--arrival',String(entry*entry*(3-2*entry)));
  });
};
const scheduleFinanceScenes=()=>{if(!financeFrame)financeFrame=requestAnimationFrame(renderFinanceScenes);};
window.addEventListener('scroll',scheduleFinanceScenes,{passive:true});
window.addEventListener('resize',scheduleFinanceScenes,{passive:true});
window.addEventListener('pageshow',scheduleFinanceScenes);
reducedMotion.addEventListener('change',scheduleFinanceScenes);
document.fonts.ready.then(scheduleFinanceScenes);scheduleFinanceScenes();

// Visual enhancement is isolated from all arithmetic and navigation.
import('./finance-scene').then(({startFinanceScene})=>{try{startFinanceScene();}catch{/* Native artwork remains available. */}}).catch(()=>{});

// One actual H–01 record docks into one actual graph and stays in its brief.
// Scroll changes their arrangement; it never gates arithmetic or replaces DOM.
const workingScene=document.querySelector<HTMLElement>('.demo-result');
const workingWorkspace=document.querySelector<HTMLElement>('.demo-workspace');
const workingJourney=document.querySelector<HTMLElement>('.working-journey');
const workingBenefits=document.querySelector<HTMLElement>('[data-working-benefits]');
let workingFrame=0,workingOverride=false;
const paintWorkingSequence=()=>{
  workingFrame=0;if(!workingScene||!workingWorkspace)return;
  const mobile=innerWidth<768;
  const bounds=(mobile?(workingJourney||workingScene):workingWorkspace).getBoundingClientRect();
  const clamp=(n:number)=>Math.max(0,Math.min(1,n));
  const smooth=(n:number)=>{const t=clamp(n);return t*t*(3-2*t);};
  const progress=reducedMotion.matches||workingOverride?1:mobile?clamp((12-bounds.top)/700):clamp((70-bounds.top)/Math.max(300,(workingWorkspace.querySelector<HTMLElement>('.demo-controls')?.offsetHeight||1146)-workingScene.offsetHeight));
  const dockEnd=mobile?.3:.55,forecastEnd=mobile?.5:.8,briefStart=mobile?.85:.8;
  const dock=smooth(progress/dockEnd),resolve=smooth((progress-briefStart)/(1-briefStart));
  // Measure the benefit boundary after docking changes mobile flow height.
  workingScene.style.setProperty('--dock',String(dock));workingScene.style.setProperty('--resolve',String(resolve));
  workingJourney?.style.setProperty('--journey-dock',String(dock));
  const benefitsTop=workingBenefits?.getBoundingClientRect().top??innerHeight;
  const carry=reducedMotion.matches?0:smooth((innerHeight*.82-benefitsTop)/(innerHeight*.3));
  workingScene.style.setProperty('--carry',String(carry));
  workingScene.style.setProperty('--carry-place',String(smooth(carry/.5)));
  workingScene.style.setProperty('--carry-lift',String(smooth((carry-.8)/.2)));
  workingScene.dataset.workingCarry=carry.toFixed(3);
  workingScene.dataset.workingView=carry>.35?'carried':'full';
  const firstBenefit=workingBenefits?.querySelector('article');
  const release=mobile&&!reducedMotion.matches?Math.min(0,(firstBenefit?.getBoundingClientRect().bottom??innerHeight)-360):0;
  workingScene.style.setProperty('--carry-release',`${release}px`);
  workingScene.dataset.workingRelease=String(Math.round(release));
  const workingChart=workingScene.querySelector<SVGElement>('.cash-chart');
  workingScene.style.setProperty('--graph-height',`${(workingChart?.clientWidth||276)/3}px`);
  workingChart?.setAttribute('preserveAspectRatio',mobile&&carry>0?'none':'xMidYMid meet');
  const applied=progress>=(mobile?forecastEnd:dockEnd),brief=progress>=briefStart,valid=workingScene.dataset.state!=='invalid';
  const forecast=smooth((progress-dockEnd)/(forecastEnd-dockEnd));
  workingScene.style.setProperty('--forecast',String(forecast));
  workingScene.dataset.hiringState=applied?'applied':'unapplied';
  workingScene.dataset.workingMode=reducedMotion.matches?'reduced':workingOverride?'interaction':'scroll';
  const show=(selector:string,visible:boolean)=>workingScene.querySelectorAll<HTMLElement>(selector).forEach(node=>node.hidden=!visible);
  show('[data-baseline-value]',!applied);show('#runway,[data-working-value="remaining"]',applied);
  show('#decision-answer',brief||!valid);show('[data-working-explanation]',!brief&&valid);
  show('[data-working-skip]',!brief&&valid);
  const label=workingScene.querySelector<HTMLElement>('[data-runway-context]');
  if(label)label.innerHTML=mobile&&carry>.35?'months<br />with hires':applied?'months of runway<br />with the planned hires':'months of runway<br />before planned hires';
  const title=workingScene.querySelector<HTMLElement>('.sheet-model-title');if(title)title.textContent=applied?'HIRING APPLIED':mobile?'BEFORE HIRES':'BASELINE / NO HIRES';
  const context=workingScene.querySelector<HTMLElement>('[data-answer-context]');if(context)context.textContent=brief?'THE TRADEOFF / SYNTHETIC SCENARIO':applied?'H–01 CONNECTED / SYNTHETIC':'H–01 NOT APPLIED / SYNTHETIC';
  const explanation=workingScene.querySelector<HTMLElement>('[data-working-explanation]');if(explanation)explanation.textContent=applied?'The hiring cost now joins monthly burn. The copper forecast traces its effect on cash.':'Current burn only. H–01 has not yet been applied to this forecast.';
  const recordLabel=workingScene.querySelector<HTMLElement>('.working-record-label');if(recordLabel)recordLabel.textContent=mobile&&carry>.35?'SYNTHETIC HIRES':applied?'HIRES APPLIED / SYNTHETIC':'PLANNED / NOT YET APPLIED';
  const legend=workingScene.querySelector<HTMLElement>('.legend-hire')?.parentElement;if(legend)legend.hidden=!applied;
  const chart=workingScene.querySelector('.cash-chart');chart?.setAttribute('aria-label',applied?'Synthetic cash forecast: before and with planned hires.':'Synthetic baseline cash forecast, before planned hires.');
  workingScene.style.setProperty('--dock',String(dock));workingScene.style.setProperty('--resolve',String(resolve));
  workingJourney?.style.setProperty('--journey-dock',String(dock));
  const endpoint=document.getElementById('cash-endpoint');
  const endpointX=Number(endpoint?.getAttribute('cx')||520),endpointY=Number(endpoint?.getAttribute('cy')||138);
  document.querySelector('[data-working-reveal]')?.setAttribute('width',String((endpointX-20)*forecast));
  if(endpoint){endpoint.style.transform=`translate(${(20-endpointX)*(1-forecast)}px,${(24-endpointY)*(1-forecast)}px)`;endpoint.style.visibility=forecast>0?'visible':'hidden';}
  workingScene.dataset.workingPhase=progress<dockEnd?'record':progress<briefStart?'model':'decision';
  workingScene.dataset.workingProgress=progress.toFixed(3);
};
const scheduleWorkingSequence=()=>{if(!workingFrame)workingFrame=requestAnimationFrame(paintWorkingSequence);};
const showWorkingResult=()=>{workingOverride=true;paintWorkingSequence();};
form?.addEventListener('input',showWorkingResult);
document.querySelector('[data-working-skip]')?.addEventListener('click',showWorkingResult);
// Editing is immediate, including the forward trip from mobile inputs to the
// result. Reverse navigation replays the sequence; focus scrolling does not.
const resumeWorkingScroll=()=>{if(workingOverride){workingOverride=false;scheduleWorkingSequence();}};
window.addEventListener('wheel',event=>{if(event.deltaY<0)resumeWorkingScroll();},{passive:true});
let workingTouchY=0,workingScrollY=scrollY;
window.addEventListener('touchstart',event=>{workingTouchY=event.touches[0]?.clientY||0;},{passive:true});
window.addEventListener('touchmove',event=>{const y=event.touches[0]?.clientY||0;if(y>workingTouchY+2)resumeWorkingScroll();workingTouchY=y;},{passive:true});
window.addEventListener('keydown',event=>{if((['PageUp','Home','ArrowUp'].includes(event.key)||(event.key===' '&&event.shiftKey))&&!(event.target instanceof HTMLInputElement))resumeWorkingScroll();});
window.addEventListener('scroll',()=>{if(scrollY<workingScrollY-1&&!form?.contains(document.activeElement)&&document.activeElement!==document.querySelector('[data-working-skip]'))resumeWorkingScroll();workingScrollY=scrollY;},{passive:true});
window.addEventListener('scroll',scheduleWorkingSequence,{passive:true});window.addEventListener('resize',scheduleWorkingSequence,{passive:true});window.addEventListener('pageshow',scheduleWorkingSequence);window.addEventListener('thriai:scenario',scheduleWorkingSequence);reducedMotion.addEventListener('change',scheduleWorkingSequence);document.fonts.ready.then(scheduleWorkingSequence);scheduleWorkingSequence();
