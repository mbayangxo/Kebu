import type {CSSProperties} from 'react';

/** Decorative, page-entry-only celebration. Never captures a click or tracks the pointer. */
export function MayPageEffects({pageSlug}:{pageSlug:string}){
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(pageSlug))return null;
  const foundation=pageSlug==='mayjor-good';
  const music=['music','audio','videos'].includes(pageSlug);
  const symbol=foundation?'♥':music?'♪':'✦';
  const color=foundation?'#ff86b5':music?'#e9be68':'#ffffff';
  const cursor=`data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><text x="4" y="25" font-size="27" fill="${color}" stroke="#9d064b" stroke-width=".7">${symbol}</text></svg>`)}`;
  return <>
    <style>{`
      @keyframes may-entry-burst{0%{opacity:0;transform:translate(0,0) scale(.3) rotate(0deg)}15%{opacity:.85}100%{opacity:0;transform:translate(var(--may-x),var(--may-y)) scale(.5) rotate(var(--may-turn))}}
      [data-may-celebration]{position:fixed;inset:0;z-index:150;pointer-events:none;overflow:hidden;contain:strict}
      [data-may-celebration] span{position:absolute;left:50%;top:42%;font-size:clamp(16px,3vw,32px);line-height:1;opacity:0;animation:may-entry-burst 760ms ease-out both;pointer-events:none;text-shadow:0 1px 2px #9d064b}
      @media(hover:hover) and (pointer:fine){[data-kebu-aesthetic="may-reference"][data-kebu-page="${pageSlug}"]{cursor:url("${cursor}") 12 12,auto}}
      @media(prefers-reduced-motion:reduce){[data-may-celebration]{display:none}}
      @media print{[data-may-celebration]{display:none}}
    `}</style>
    <div data-may-celebration={pageSlug} aria-hidden="true">{Array.from({length:14},(_,index)=>{
      const angle=index/14*Math.PI*2,distance=index%2?170:115;
      const style={color:index%3?color:'#ffb9d5','--may-x':`${Math.cos(angle)*distance}px`,'--may-y':`${Math.sin(angle)*distance}px`,'--may-turn':`${index%2?40:-40}deg`,animationDelay:`${index%3*25}ms`} as CSSProperties;
      return <span key={index} style={style}>{symbol}</span>;
    })}</div>
  </>;
}
