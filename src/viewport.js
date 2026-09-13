// Follow the visible viewport when browser chrome or the software keyboard changes.
// Pinch zoom keeps its native scale; it must not trigger an automatic page rescale.
let frame=0;
function syncViewport(){cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{const view=window.visualViewport;if(view&&Math.abs(view.scale-1)>.01)return;document.documentElement.style.setProperty('--viewport-height',`${Math.round(view?.height||innerHeight)}px`);document.documentElement.style.setProperty('--viewport-top',`${Math.round(view?.offsetTop||0)}px`);});}
window.addEventListener('resize',syncViewport,{passive:true});
window.visualViewport?.addEventListener('resize',syncViewport,{passive:true});
syncViewport();

window.visualViewport?.addEventListener('scroll',syncViewport,{passive:true});
