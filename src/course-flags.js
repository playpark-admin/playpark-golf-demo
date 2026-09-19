// Course letters are local to each venue. E-H repeat the same four-color cycle.
// Color references and the distinction from physical dimensions are in docs/rules.md.
const colors=['#df343c','#246bd1','#ffda3d','#ffffff'];
export function courseFlagColor(course){
 const letter=String(course?.letter||'A').toUpperCase();
 const index=/^[A-Z]$/.test(letter)?letter.charCodeAt(0)-65:0;
 return colors[index%colors.length];
}
export function holeFlag(cup,course,number=1){
 const label=Number.isInteger(number)&&number>=1&&number<=18?number:1,color=courseFlagColor(course),ink=['#ffda3d','#ffffff'].includes(color)?'#14273b':'#ffffff';
 return `<g class="cup-flag" pointer-events="none"><path d="M${cup.x} ${cup.y}v-9" stroke="#20394d" stroke-width=".65"/><path d="M${cup.x} ${cup.y}v-9" stroke="#fffcdf" stroke-width=".4"/><g class="flag-panel" transform="translate(${cup.x+.2} ${cup.y-9})"><rect class="flag-cloth" x="0" y="0" width="4" height="3" fill="${color}" stroke="#20394d" stroke-width=".18"/><text class="flag-number" x="2" y="1.64" text-anchor="middle" dominant-baseline="middle" font-family="Arial,sans-serif" font-size="2.15" font-weight="800" fill="${ink}" stroke="${ink==='#ffffff'?'#17283d':'#ffffff'}" stroke-width=".07" paint-order="stroke">${label}</text></g></g>`;
}
