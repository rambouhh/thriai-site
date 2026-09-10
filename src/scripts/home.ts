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
      const bluePhase = clamp((p - .35) / .5);
      const scale = (mobile ? width * .00123 : Math.min(width * .00084,1.4)) * (1 + bluePhase * .28);
      const centerX = width * (mobile ? .69 - bluePhase * .2 : .79 - bluePhase * .37);
      const centerY = height * (mobile ? .49 + bluePhase * .12 : .49 + bluePhase * .08);
      const spin = -.29 + p * .43;
      const tilt = .86 - bluePhase * .18;
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
      const separation=130+Math.sin(p*Math.PI)*62;
      const layers = [
        {y:separation,size:329,color:'65,111,255'},
        {y:0,size:343-bluePhase*24,color:'98,151,255'},
        {y:-separation,size:355-bluePhase*62,color:'255,151,91'},
      ];
      layers.forEach((layer,li) => {
        const drift = (1-bluePhase) * (li-1) * 38;
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
        const surface=(x:number,z:number)=>project(x+drift,layer.y-1,z);
        const line=(points:[number,number][],color:string,lineWidth=1)=>{
          path(points.map(([x,z])=>surface(x,z)));ctx.strokeStyle=color;ctx.lineWidth=lineWidth;ctx.stroke();
        };
        const tile=(x:number,z:number,w:number,h:number,color:string)=>{
          path([surface(x,z),surface(x+w,z),surface(x+w,z+h),surface(x,z+h)]);ctx.closePath();ctx.fillStyle=color;ctx.fill();
        };
        if(li===0){
          // RECORDS: regular entries and reconciliation rails. Equal units
          // describe structure, never a fabricated company data series.
          const strength=.3+(1-smooth(p/.5))*.45;
          for(let row=0;row<8;row++){
            const z=-203+row*55;
            tile(-228,z,7,7,`rgba(115,169,255,${strength})`);
            tile(-191,z,176,2,`rgba(82,130,218,${strength*.45})`);
            tile(24,z,66,2,`rgba(112,153,222,${strength*.65})`);
            tile(139,z,53,2,`rgba(112,153,222,${strength*.65})`);
          }
          line([[-204,-222],[-204,224]],'rgba(105,152,231,.16)');
          line([[114,-222],[114,224]],'rgba(105,152,231,.16)');
          line([[-228,241],[212,241]],'rgba(113,164,255,.42)',1.2);
        }else if(li===1){
          // MODEL: a governed dependency structure joins inputs to one spine.
          // Its paths brighten around the middle of the scroll argument.
          const strength=.22+Math.sin(clamp((p-.12)/.69)*Math.PI)*.46;
          const inputs:[number,number][]=[[-216,-176],[-216,0],[-216,176]];
          const branches:[number,number][]=[[-20,-130],[-20,130]];
          inputs.forEach((start,i)=>{
            const branch=branches[i===2?1:0];
            line([start,[-124,start[1]],[-124,branch[1]],branch],`rgba(82,142,252,${strength})`,1.05);
            if(i===1)line([start,[-124,0],[-124,130],branches[1]],`rgba(82,142,252,${strength*.65})`,1.05);
          });
          branches.forEach(point=>line([point,[82,point[1]],[82,0],[212,0]],`rgba(103,162,255,${strength})`,1.4));
          [...inputs,...branches,[212,0] as [number,number]].forEach(([x,z],i)=>{
            tile(x-6,z-6,12,12,'rgba(9,24,55,.95)');
            line([[x-6,z-6],[x+6,z-6],[x+6,z+6],[x-6,z+6],[x-6,z-6]],`rgba(149,191,255,${strength+.15})`,.85);
            if(i===5)tile(x-2,z-2,4,4,'rgba(200,226,255,.8)');
          });
        }else{
          // DECISION: one deliberate route through alternate branches. The
          // selected warm trace becomes legible as the planes align, linking
          // this abstract system to the real cash/hiring model below.
          const strength=.16+smooth((p-.2)/.58)*.62;
          line([[-220,145],[-113,145],[-113,12],[-3,12],[-3,-131],[205,-131]],`rgba(73,119,210,${strength*.5})`,1.1);
          line([[-113,145],[-113,205],[190,205]],`rgba(80,120,190,${strength*.3})`,.8);
          line([[-3,12],[85,12],[85,108],[205,108]],`rgba(80,120,190,${strength*.3})`,.8);
          const trace:[number,number][]=[[-220,145],[-113,145],[-113,12],[-3,12],[-3,-131],[205,-131]];
          ctx.shadowColor='#fe9558';ctx.shadowBlur=8;
          line(trace,`rgba(247,164,104,${strength})`,1.25);ctx.shadowBlur=0;
          [[-220,145],[-113,12],[-3,-131],[205,-131]].forEach(([x,z],i)=>{
            tile(x-3,z-3,6,6,`rgba(${i===3?'255,205,149':'118,157,220'},${strength})`);
          });
          // The end is a larger open diamond, distinguishable without words.
          line([[205,-149],[223,-131],[205,-113],[187,-131],[205,-149]],`rgba(255,190,129,${strength})`,1.1);
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
        thread.push(project(230+Math.sin(t*Math.PI*2)*10,separation+30-t*(separation*2+60),130+Math.cos(t*Math.PI*2)*18));
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
      if(active && !document.hidden && time-lastFrame>33){draw(time);lastFrame=time;}
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
      return;
    }
    if(error)error.hidden=true;
    if(result)result.dataset.state='valid';
    const value=(id:string)=>Number((document.getElementById(id) as HTMLInputElement).value);
    const cash=value('cash'),burn=value('burn'),hires=value('hires'),cost=value('hire-cost');
    const additional=hires*cost,total=burn+additional,runway=cash/total,baseline=cash/burn,remaining=cash-total*12;
    const niceRunway = runway>=1000 ? new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:1}).format(runway) : runway.toFixed(1);
    setText('hire-count',`${hires} ${hires===1?'person':'people'}`);setText('runway',niceRunway);
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
  form.addEventListener('input',update);form.addEventListener('submit',e=>e.preventDefault());update();
}
