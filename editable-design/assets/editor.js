/* Editable design layer: click to edit text, resize, drag, add/delete, undo, autosave, save, download PNG.
   Expects one element <div id="design"> (fixed width/height) holding the whole design, and html2canvas loaded before this file.
   Optional on #design: data-key="unique-name" (storage key), data-file="name.png" (download name), data-v="1" (bump to discard old saved edits). */
(function(){
const design=document.getElementById('design');
if(!design){console.warn('editor: no #design');return;}
const TEXT='h1,h2,h3,h4,h5,h6,p,li,blockquote,figcaption,[data-edit]';
const MV='[contenteditable],img,svg,[data-move]';
const KEY='edit-design-'+(design.dataset.key||location.pathname)+'-v'+(design.dataset.v||'1');
const FILE=design.dataset.file||'design.png';
const ORIGINAL=design.innerHTML, TAB=String(Date.now())+Math.random();
let cur=null, moving=false, stale=false, drag=null, saveT=null;
const ls=fn=>{try{return fn();}catch(e){return null;}};

// toolbar and stale-tab cover
const bar=document.createElement('div');bar.id='ed-bar';bar.setAttribute('data-html2canvas-ignore','true');
bar.innerHTML='<button id="ed-mode">מצב הזזה: כבוי</button><button class="ed-sz" data-d="2">+ הגדלה</button><button class="ed-sz" data-d="-2">- הקטנה</button><button id="ed-wt">עובי הכתב</button>'+
 '<button id="ed-add">+ טקסט חדש</button><button id="ed-dup">שכפול</button><button id="ed-del">מחיקה</button><button id="ed-undo">ביטול פעולה</button>'+
 '<button id="ed-save" class="ed-teal">שמירה</button><button id="ed-reset">חזרה למקור</button><button id="ed-exp">שליחה לקלוד</button><button id="ed-dl" class="ed-cta">הורדת תמונה</button><span id="ed-saved">שמירה אוטומטית</span>';
document.body.appendChild(bar);
const cover=document.createElement('div');cover.id='ed-stale';cover.innerHTML='העורך נפתח בלשונית אחרת.<br>כדי לא לדרוס שינויים, הלשונית הזו כבר לא שומרת.<br>אפשר לסגור אותה.';
document.body.appendChild(cover);
const $=id=>document.getElementById(id);

function prep(){
  design.querySelectorAll(TEXT).forEach(el=>{if(!el.closest('[data-noedit]')&&!el.parentElement.closest('[contenteditable]'))el.setAttribute('contenteditable','true');});
  design.querySelectorAll('[contenteditable]').forEach(el=>el.setAttribute('contenteditable',moving?'false':'true'));
  design.querySelectorAll(MV).forEach(el=>el.setAttribute('data-mv',''));
}
const saved=ls(()=>localStorage.getItem(KEY));if(saved)design.innerHTML=saved;
prep();

// newest tab owns the editor; older tabs stop saving
ls(()=>localStorage.setItem(KEY+'-owner',TAB));
window.addEventListener('storage',e=>{if(e.key===KEY+'-owner'&&e.newValue!==TAB){stale=true;cover.style.display='flex';}});

const hist=[design.innerHTML];
function hhmm(){const d=new Date();return d.getHours()+':'+String(d.getMinutes()).padStart(2,'0');}
function flash(t){const s=$('ed-saved');s.textContent=t;s.style.opacity=1;clearTimeout(s._t);s._t=setTimeout(()=>s.style.opacity=.7,1500);}
function writeNow(label,noHist){if(stale)return;
  if(!noHist&&hist[hist.length-1]!==design.innerHTML){hist.push(design.innerHTML);if(hist.length>40)hist.shift();}
  const ok=ls(()=>{localStorage.setItem(KEY,design.innerHTML);return true;});flash(ok?label+' '+hhmm():'לא הצלחתי לשמור');}
function save(){clearTimeout(saveT);saveT=setTimeout(()=>writeNow('נשמר'),400);}
design.addEventListener('input',save);
// paste plain text only, so pasted styles cannot nest inside a text box
design.addEventListener('paste',e=>{e.preventDefault();document.execCommand('insertText',false,(e.clipboardData||window.clipboardData).getData('text/plain'));});
document.addEventListener('focusin',e=>{if(e.target.isContentEditable&&design.contains(e.target))cur=e.target.closest('.ed-added')||e.target.closest('[contenteditable]');});
bar.querySelectorAll('button').forEach(b=>b.addEventListener('mousedown',e=>e.preventDefault()));

bar.querySelectorAll('.ed-sz').forEach(b=>b.onclick=()=>{if(!cur){alert('קודם לוחצים על הטקסט שרוצים לשנות');return;}
  const fs=parseFloat(getComputedStyle(cur).fontSize);cur.style.fontSize=Math.max(8,fs+Number(b.dataset.d))+'px';
  cur.querySelectorAll('*').forEach(c=>{if(c.style.fontSize)c.style.fontSize='';});save();});


const WEIGHTS=[400,600,700,800],WNAMES={400:'רגיל',600:'בינוני',700:'מודגש',800:'מודגש מאוד'};
$('ed-wt').onclick=()=>{if(!cur){alert('קודם לוחצים על הטקסט שרוצים לשנות');return;}const w=Math.round(parseInt(getComputedStyle(cur).fontWeight)/100)*100;const i=WEIGHTS.findIndex(x=>x>=w);const n=WEIGHTS[(i+1)%WEIGHTS.length];cur.style.fontWeight=n;cur.querySelectorAll('*').forEach(c=>{if(c.style.fontWeight)c.style.fontWeight='';});flash('עובי: '+WNAMES[n]);save();};
// duplicate: a free-floating copy with the same look, placed just below the original
$('ed-dup').onclick=()=>{if(!cur||!design.contains(cur)){alert('קודם לוחצים על הטקסט שרוצים לשכפל');return;}
  const src=cur.closest('.ed-added')||cur,cs=getComputedStyle(src),r=src.getBoundingClientRect(),f=design.getBoundingClientRect();
  const c=src.cloneNode(true);c.removeAttribute('id');delete c.dataset.tx;delete c.dataset.ty;c.classList.add('ed-added');
  ['fontSize','fontWeight','fontFamily','color','lineHeight','textAlign','letterSpacing','background','backgroundColor','padding','borderRadius'].forEach(k=>c.style[k]=cs[k]);
  Object.assign(c.style,{position:'absolute',left:(r.left-f.left)+'px',top:(r.bottom-f.top+10)+'px',right:'auto',width:r.width+'px',margin:'0',transform:'',whiteSpace:'normal',zIndex:50});
  design.appendChild(c);c.querySelectorAll('[contenteditable]').forEach(x=>x.removeAttribute('contenteditable'));c.setAttribute('contenteditable',moving?'false':'true');c.setAttribute('data-mv','');cur=c;save();flash('שוכפל');};
// a text box whose text was fully erased is removed (undo brings it back), so no empty frames stay behind
function dropEmpty(){let n=0;design.querySelectorAll('[contenteditable]').forEach(el=>{if(!el.textContent.trim()&&!el.querySelector('img,svg')){el.remove();n++;}});return n;}
if(dropEmpty())ls(()=>localStorage.setItem(KEY,design.innerHTML));
design.addEventListener('focusout',e=>{const el=e.target;if(el.isContentEditable&&!el.textContent.trim()&&!el.querySelector('img,svg')){setTimeout(()=>{if(document.activeElement!==el&&!el.textContent.trim()){if(hist[hist.length-1]!==design.innerHTML)hist.push(design.innerHTML);el.remove();if(cur===el)cur=null;writeNow('תיבה ריקה נמחקה');}},0);}});
$('ed-mode').onclick=()=>{moving=!moving;document.body.classList.toggle('ed-move',moving);$('ed-mode').classList.toggle('on',moving);
  $('ed-mode').textContent=moving?'מצב הזזה: פועל, גוררים עם העכבר':'מצב הזזה: כבוי';prep();if(document.activeElement)document.activeElement.blur();};
design.addEventListener('pointerdown',e=>{if(!moving)return;let el=e.target.closest('[data-mv]');if(!el||!design.contains(el))return;e.preventDefault();
  el=el.closest('.ed-added')||el;drag={el,x0:e.clientX,y0:e.clientY,tx:+(el.dataset.tx||0),ty:+(el.dataset.ty||0)};design.setPointerCapture(e.pointerId);cur=el;});
design.addEventListener('pointermove',e=>{if(!drag)return;const el=drag.el,dx=drag.tx+e.clientX-drag.x0,dy=drag.ty+e.clientY-drag.y0;
  el.dataset.tx=dx;el.dataset.ty=dy;el.style.transform='translate('+dx+'px,'+dy+'px)';if(getComputedStyle(el).display==='inline')el.style.display='inline-block';});
design.addEventListener('pointerup',()=>{if(drag)save();drag=null;});

$('ed-add').onclick=()=>{const d=document.createElement('div');d.className='ed-added';d.textContent='טקסט חדש';
  d.setAttribute('contenteditable',moving?'false':'true');d.setAttribute('data-mv','');design.appendChild(d);cur=d;
  if(!moving){d.focus();document.getSelection().selectAllChildren(d);}save();};
$('ed-del').onclick=()=>{if(!cur||!design.contains(cur)){alert('קודם לוחצים על מה שרוצים למחוק');return;}
  const added=cur.closest('.ed-added'),el=added||cur;if(!added&&!confirm('למחוק את החלק הזה? אפשר להחזיר עם ביטול פעולה.'))return;
  clearTimeout(saveT);if(hist[hist.length-1]!==design.innerHTML)hist.push(design.innerHTML);el.remove();cur=null;writeNow('נמחק');};
$('ed-undo').onclick=()=>{clearTimeout(saveT);if(hist[hist.length-1]!==design.innerHTML)hist.push(design.innerHTML);
  if(hist.length<2){flash('אין מה לבטל');return;}hist.pop();design.innerHTML=hist[hist.length-1];prep();cur=null;writeNow('בוטל',true);};
$('ed-save').onclick=()=>{if(document.activeElement)document.activeElement.blur();clearTimeout(saveT);writeNow('נשמר');ls(()=>localStorage.setItem(KEY+'-backup',design.innerHTML));};
$('ed-reset').onclick=()=>{if(!confirm('למחוק את כל השינויים ולחזור לעיצוב המקורי?'))return;
  ls(()=>localStorage.setItem(KEY+'-before-reset',design.innerHTML));ls(()=>localStorage.removeItem(KEY));design.innerHTML=ORIGINAL;hist.length=0;hist.push(ORIGINAL);prep();flash('חזר למקור');};
// exports the current edit (images stripped) so Claude can read it from the download folder and rebuild the source
$('ed-exp').onclick=()=>{const t=document.createElement('div');t.innerHTML=design.innerHTML;t.querySelectorAll('img').forEach(i=>i.setAttribute('src',''));const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([t.innerHTML],{type:'text/html'}));a.download=(design.dataset.key||'design')+'-edit-for-claude.html';document.body.appendChild(a);a.click();a.remove();flash('הקובץ ירד להורדות');};
$('ed-dl').onclick=async()=>{if(document.activeElement)document.activeElement.blur();
  document.body.classList.add('ed-export');window.scrollTo(0,0);
  try{const c=await html2canvas(design,{scale:Number(design.dataset.scale||1),backgroundColor:null,useCORS:true});
    const a=document.createElement('a');a.download=FILE;a.href=c.toDataURL('image/png');document.body.appendChild(a);a.click();a.remove();}
  catch(e){alert('ההורדה לא הצליחה כאן. פתחו את הקובץ בדפדפן כרום ונסו שוב.');}
  document.body.classList.remove('ed-export');};
})();
