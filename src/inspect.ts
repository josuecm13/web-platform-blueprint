import './inspect.css';

type RecordEntry = { name: string; element: string; primitives: string[]; tier: string; fallback: string; why: string; docs: { label: string; url: string }[] };
const records: Record<string, RecordEntry> = {
  card: { name: 'Responsive card', element: '<article>', primitives: ['CSS Grid', '@container', 'container-type: inline-size'], tier: 'Baseline foundation + progressive enhancement', fallback: 'A readable single-column card without container queries.', why: 'Components should adapt to their own available width, not only the viewport.', docs: [{label:'MDN: Container queries',url:'https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Containment/Container_queries'}] },
  dialog: { name: 'Native modal dialog', element: '<dialog>', primitives: ['showModal()', 'method="dialog"', '::backdrop'], tier: 'Baseline foundation', fallback: 'Inline reference content or a dedicated page if dialog is unavailable.', why: 'The browser handles modality, Escape and focus behavior without a custom overlay manager.', docs: [{label:'MDN: dialog',url:'https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog'}] },
  motion: { name: 'Motion specimen', element: '<h1>', primitives: ['CSS transitions', ':hover', 'prefers-reduced-motion'], tier: 'Baseline foundation', fallback: 'The content remains visible and usable with transitions disabled.', why: 'Motion can add emphasis without becoming a requirement for understanding content.', docs: [{label:'MDN: Reduced motion',url:'https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion'}] }
};
type Mode = 'render' | 'wireframe' | 'inspect';
const specimens: {selector:string; key:keyof typeof records}[] = [
  {selector:'.resize-frame .adaptive',key:'card'},
  {selector:'#dialog-open',key:'dialog'},
  {selector:'.hero h1',key:'motion'}
];
const targets = specimens.flatMap(({selector,key}) => [...document.querySelectorAll<HTMLElement>(selector)].map(element=>({element,key})));
const toolbar=document.createElement('div');
toolbar.className='inspect-toolbar';
toolbar.setAttribute('aria-label','Blueprint display mode');
const group=document.createElement('div');
group.setAttribute('role','group');
group.setAttribute('aria-label','Display mode');
const buttons=(['render','wireframe','inspect'] as Mode[]).map(mode=>{
  const button=document.createElement('button');
  button.type='button'; button.textContent=mode[0].toUpperCase()+mode.slice(1);
  button.dataset.mode=mode; button.setAttribute('aria-pressed','false');
  group.append(button);return button;
});
toolbar.append(group);
const dock=document.createElement('aside');
dock.className='reference-dock';
dock.id='reference-dock';
dock.setAttribute('aria-label','Component reference');
dock.hidden=true;
const heading=document.createElement('h2');
heading.textContent='Reference Dock';
const close=document.createElement('button');
close.type='button';close.textContent='Close reference';close.className='dock-close';
const body=document.createElement('div');
body.className='dock-body';
dock.append(heading,close,body);
document.body.append(toolbar,dock);
let current:Mode='render';
let selected:HTMLElement|null=null;
let lastTrigger:HTMLElement|null=null;
function setMode(mode:Mode){
  current=mode;
  document.documentElement.dataset.inspectMode=mode;
  for(const button of buttons) button.setAttribute('aria-pressed',String(button.dataset.mode===mode));
  for(const {element} of targets) {
    const trigger=element.querySelector<HTMLButtonElement>(':scope > .inspect-select');
    if(trigger) trigger.hidden=mode!=='inspect';
  }
  if(mode!=='inspect') hideDock(false);
}
function hideDock(restore=true){
  dock.hidden=true;
  selected?.classList.remove('inspect-selected');
  selected=null;
  if(restore && lastTrigger?.isConnected) lastTrigger.focus();
}
function showReference(key:string,trigger:HTMLElement,target:HTMLElement){
  const record=records[key];
  if(!record)return;
  selected?.classList.remove('inspect-selected');
  selected=target;target.classList.add('inspect-selected');lastTrigger=trigger;
  body.replaceChildren();
  const title=document.createElement('h3');title.textContent=record.name;
  const semantic=document.createElement('p');semantic.textContent='Semantic element: '+record.element;
  const tier=document.createElement('p');tier.textContent='Support tier: '+record.tier;
  const why=document.createElement('p');why.textContent=record.why;
  const fallback=document.createElement('p');fallback.textContent='Fallback: '+record.fallback;
  const list=document.createElement('ul');
  for(const primitive of record.primitives){const item=document.createElement('li');item.textContent=primitive;list.append(item);}
  const links=document.createElement('ul');
  for(const doc of record.docs){const item=document.createElement('li');const link=document.createElement('a');link.href=doc.url;link.textContent=doc.label;link.target='_blank';link.rel='noopener noreferrer';item.append(link);links.append(item);}
  body.append(title,semantic,tier,why,fallback,list,links);
  dock.hidden=false;
  close.focus();
}
for(const {element,key} of targets){
  element.classList.add('inspect-target');
  const trigger=document.createElement('button');
  trigger.type='button';trigger.className='inspect-select';trigger.textContent='Inspect '+records[key].name;
  trigger.hidden=true;
  trigger.setAttribute('aria-controls','reference-dock');
  trigger.addEventListener('click',()=>showReference(key,trigger,element));
  element.prepend(trigger);
}
buttons.forEach(button=>button.addEventListener('click',()=>setMode(button.dataset.mode as Mode)));
close.addEventListener('click',()=>hideDock());
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!dock.hidden){event.preventDefault();hideDock();}});
setMode('render');
