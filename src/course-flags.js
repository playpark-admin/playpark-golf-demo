// Course letters are local to each venue. E-H repeat the same four-color cycle.
// Color references and the distinction from physical dimensions are in docs/rules.md.
const colors=['#df343c','#246bd1','#ffda3d','#ffffff'];
export function courseFlagColor(course){
 const letter=String(course?.letter||'A').toUpperCase();
 const index=/^[A-Z]$/.test(letter)?letter.charCodeAt(0)-65:0;
 return colors[index%colors.length];
}
export function holeFlag(cup,course){
 return `<g class="cup-flag" pointer-events="none"><path d="M${cup.x} ${cup.y}v-9" stroke="#20394d" stroke-width=".65"/><path d="M${cup.x} ${cup.y}v-9" stroke="#fffcdf" stroke-width=".4"/><rect class="flag-cloth" x="${cup.x+.2}" y="${cup.y-9}" width="4" height="3" fill="${courseFlagColor(course)}" stroke="#20394d" stroke-width=".18"/></g>`;
}
