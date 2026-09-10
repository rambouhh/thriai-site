type Scenario={cash:number;burn:number;hires:number;cost:number};
const clamp=(n:number,a=0,b=1)=>Math.max(a,Math.min(b,n));
const smooth=(n:number)=>{const t=clamp(n);return t*t*(3-2*t);};
const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;

/** The original glass record surface persists. Live SVG is projected onto its
 * central face; readable values remain native HTML and independent arithmetic. */
export function startFinanceScene(){
  const slots=Array.from(document.querySelectorAll<HTMLElement>('[data-material-slot]'));
  const opening=document.getElementById('opening');
  const hero=slots.find(slot=>slot.dataset.materialSlot==='opening');
  const delivery=document.querySelector<HTMLElement>('.delivery-section');
  const reach=document.querySelector<HTMLElement>('.reach-section');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  if(!opening||!hero)return;
  const desktopStage=hero.parentElement!;
  const heroAnchor=document.querySelector<HTMLElement>('[data-material-anchor=hero]');
  const modelAnchor=document.querySelector<HTMLElement>('[data-material-anchor=model]');
  let values:Scenario|null=null,queued=0,ready=false,failed=false;
  const image=hero.querySelector('img')!;
  const money=(n:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
  function updateValues(next:Scenario|null){
    values=next;document.documentElement.dataset.instrumentState=next?'valid':'invalid';
    document.querySelectorAll<HTMLElement>('[data-record-value]').forEach(node=>{
      node.textContent=!next?'—':node.dataset.recordValue==='cash'?money(next.cash):node.dataset.recordValue==='burn'?money(next.burn):`${next.hires} × ${money(next.cost)}`;
    });
    requestPaint();
  }
  // Stable coordinates on the central ceramic surface in the original bitmap.
  const face=(x:number,y:number)=>{
    const top={x:lerp(1070,1240,x),y:lerp(245,315,x)};
    const bottom={x:lerp(1160,1390,x),y:lerp(575,690,x)};
    return {x:lerp(top.x,bottom.x,y),y:lerp(top.y,bottom.y,y)};
  };
  function trace(slot:HTMLElement,progress:number){
    const svg=slot.querySelector<SVGSVGElement>('.material-trace');if(!svg)return;
    svg.style.visibility=values?'visible':'hidden';
    if(!values){svg.querySelectorAll('path').forEach(path=>path.setAttribute('d',''));svg.querySelector('.material-result')?.removeAttribute('cx');svg.querySelector('.material-result')?.removeAttribute('cy');return;}
    const {cash,burn,hires,cost}=values;
    const monthly=burn+hires*cost;
    const point=(t:number,rate:number)=>face(t/12,clamp(t*rate/cash));
    const path=(rate:number,amount=1)=>{
      const stop=Math.min(12,cash/rate)*amount;
      return Array.from({length:25},(_,i)=>{const p=point(stop*i/24,rate);return `${i?'L':'M'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`;}).join('');
    };
    svg.querySelector('.material-base')?.setAttribute('d',path(burn));
    svg.querySelector('.material-plan')?.setAttribute('d',path(monthly,progress));
    const end=point(Math.min(12,cash/monthly)*progress,monthly);
    const result=svg.querySelector('.material-result');result?.setAttribute('cx',String(end.x));result?.setAttribute('cy',String(end.y));
  }
  function paint(){
    queued=0;if(document.hidden||!ready)return;
    const w=document.documentElement.clientWidth,h=innerHeight,mobile=innerWidth<768;
    const d=delivery?smooth((h-delivery.getBoundingClientRect().top)/(h*.95)):0;
    const r=reach?smooth((h-reach.getBoundingClientRect().top)/(h*.9)):0;
    const heading=reach?.querySelector('h2')?.getBoundingClientRect();
    const model=heading?smooth((h*.98-heading.bottom)/(h*.48)):0;
    const arrival=reduced.matches?0:d;
    const lowerTop=Math.max((heading?.bottom??h*.5)+20,h*.34);
    const starting=[0,0,w,h],aligned=[w*.71,-h*.035,w*.29,h*.29];
    const modeled=[w*.015,lowerTop,w*.52,w*.52*941/1672];
    const box=starting.map((n,i)=>lerp(lerp(n,aligned[i],arrival),modeled[i],reduced.matches?0:r));
    if(r>.01&&!reduced.matches)box[1]=Math.max(box[1],lowerTop);
    if(!mobile){
      if(hero.parentElement!==desktopStage)desktopStage.append(hero);
      hero.style.left=`${box[0]}px`;hero.style.top=`${box[1]}px`;hero.style.width=`${box[2]}px`;hero.style.height=`${box[3]}px`;
      hero.style.setProperty('--art-scrim',String(1-smooth(arrival/.7)));
      hero.style.setProperty('--record-opacity',String(smooth((arrival-.18)/.4)*(1-smooth(model/.18))));
      hero.style.setProperty('--trace-opacity',String(model));
    }else{
      // One object travels between two bounded document-flow slots. Switch only
      // after the opening slot has left view, before the model slot arrives.
      const anchor=reach&&reach.getBoundingClientRect().top<innerHeight?modelAnchor:heroAnchor;
      if(anchor&&hero.parentElement!==anchor)anchor.append(hero);
      for(const property of ['left','top','width','height'])hero.style.removeProperty(property);
      hero.style.setProperty('--record-opacity','0');hero.style.setProperty('--trace-opacity',anchor===modelAnchor?'1':'0');
    }
    hero.style.opacity='1';
    const label=document.querySelector<HTMLElement>('.scene-index');if(label)label.style.opacity=String(mobile?0:1-smooth(arrival/.16));
    const sceneLabel=document.getElementById('scene-label');if(sceneLabel)sceneLabel.textContent='RECORDS / MODELS / DECISIONS';
    // Placement clears reading areas; no fading duplicate or viewport scrim is needed.
    desktopStage.style.setProperty('--scene-scrim','0');
    slots.forEach(slot=>trace(slot,slot===hero&&!mobile?smooth((model-.25)/.75):1));
  }
  function requestPaint(){if(!queued)queued=requestAnimationFrame(paint);}
  const activate=()=>{if(failed)return;ready=true;document.documentElement.dataset.instrumentRenderer='native-svg';requestPaint();};
  const fallback=()=>{failed=true;ready=false;delete document.documentElement.dataset.instrumentRenderer;slots.forEach(slot=>slot.style.display='none');};
  image.addEventListener('load',activate,{once:true});slots.forEach(slot=>slot.querySelector('img')?.addEventListener('error',fallback,{once:true}));
  if(image.complete){if(image.naturalWidth)activate();else fallback();}
  window.addEventListener('scroll',requestPaint,{passive:true});window.addEventListener('resize',requestPaint,{passive:true});window.addEventListener('pageshow',requestPaint);document.addEventListener('visibilitychange',requestPaint);reduced.addEventListener('change',requestPaint);
  window.addEventListener('thriai:scenario',(event:Event)=>updateValues((event as CustomEvent<Scenario|null>).detail));
  const form=document.querySelector<HTMLFormElement>('#scenario-form');
  const inputs=form?Array.from(form.querySelectorAll<HTMLInputElement>('input')):[];
  const get=(id:string)=>Number((document.getElementById(id) as HTMLInputElement).value);
  updateValues(inputs.length&&inputs.every(input=>input.validity.valid)?{cash:get('cash'),burn:get('burn'),hires:get('hires'),cost:get('hire-cost')}:null);
}
