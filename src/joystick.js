// A quadratic response gives short putts more finger travel than full shots.
export function powerLimit(distance) {
  // Do not compensate for sand: it nearly doubled launch speed on short shots.
  return distance <= 12 ? Math.min(100, Math.max(3, (distance + 5) / 85 * 100)) : 100;
}
export function joystickShot(dx, dy, radius, limit = 100) {
  const travel = Math.hypot(dx, dy), deadZone = radius * .12;
  if (travel <= deadZone) return null;
  const strength = Math.min(1, (travel - deadZone) / (radius - deadZone));
  return {angle: Math.atan2(dy, dx), power: Math.max(.1, strength ** 2 * limit), strength};
}
export function bindJoystick(element, {limit, canPlay, preview, release, cancel, start=()=>{}}) {
  let pointer = null, current = null, interrupted = false;
  const pressed = new Set();
  const controller=new AbortController();
  function update(event) {
    const box = element.getBoundingClientRect(), radius = box.width / 2 - 26;
    const dx = event.clientX - box.left - box.width / 2, dy = event.clientY - box.top - box.height / 2;
    const travel = Math.hypot(dx, dy);
    current = travel > radius * 2.7 ? null : joystickShot(dx, dy, radius, limit());
    const ratio = Math.min(1, radius / (travel || 1));
    element.style.setProperty('--stick-x', `${dx * ratio}px`);
    element.style.setProperty('--stick-y', `${dy * ratio}px`);
    element.classList.toggle('cancel-shot', !current);
    preview(current);
  }
  function finish(event, shouldRelease) {
    if (event.pointerId !== pointer) return;
    if (shouldRelease) update(event);
    const shot = current;
    pointer = null; current = null;
    element.classList.remove('dragging', 'cancel-shot');
    element.style.setProperty('--stick-x', '0px');element.style.setProperty('--stick-y', '0px');
    if (element.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId);
    if (shouldRelease && shot && canPlay()) release(shot); else cancel();
  }
  element.addEventListener('pointerdown', event => {
    if (interrupted || pointer !== null || !canPlay() || (event.pointerType === 'mouse' && event.button !== 0)) return;
    const box = element.getBoundingClientRect();
    if (Math.hypot(event.clientX - box.left - box.width / 2, event.clientY - box.top - box.height / 2) > 42) return;
    event.preventDefault();element.focus({preventScroll:true});pointer = event.pointerId;
    element.setPointerCapture(pointer);element.classList.add('dragging');start();update(event);
  });
  document.addEventListener('pointerdown',event=>{pressed.add(event.pointerId);if(pressed.size>1){interrupted=true;if(pointer!==null)finish({pointerId:pointer},false);}},{capture:true,signal:controller.signal});
  for(const type of ['pointerup','pointercancel'])document.addEventListener(type,event=>{pressed.delete(event.pointerId);if(!pressed.size)interrupted=false;},{capture:true,signal:controller.signal});
  element.addEventListener('pointermove', event => {if (event.pointerId === pointer) {event.preventDefault();update(event);}});
  element.addEventListener('pointerup', event => finish(event, true));
  element.addEventListener('pointercancel', event => finish(event, false));
  element.addEventListener('lostpointercapture', event => finish(event, false));
  element.addEventListener('keydown', event => {
    if (event.key === 'Escape' && pointer !== null) {finish({pointerId:pointer}, false);event.preventDefault();}
  });
  return ()=>{controller.abort();if(pointer!==null)finish({pointerId:pointer},false);};
}
