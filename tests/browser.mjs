const web = new URL('../web/', location.href);
const docs = new URL('../docs/', location.href); // Built by `npm run build:pages`.
const config = await (await fetch(new URL('content/commands.json', web))).json();
const cjk = /[\u4e00-\u9fff]/;
const wait = ms => new Promise(r => setTimeout(r, ms));
const until = async test => { for(let i=0;i<150;i++){if(test())return;await wait(20);} throw Error('Timed out'); };
const assert = (ok, message) => { if (!ok) throw Error(message); };
let frame, doc, win, passed=0, failed=0, skipped=0;
class Skip extends Error {}
// root/page picks the site (web/ sources or the docs/ build) and the language page. Overrides are keyed by the
// path after /content/, e.g. zh/whoami.md; window.__requests records every content request the page makes.
async function fixture(overrides = {}, size = {width:390,height:844}, {root = web, page = 'index.html'} = {}) {
  const base = new URL(page, root);
  const source = await (await fetch(base, {cache:'no-store'})).text();
  document.querySelector('#fixture').replaceChildren();
  frame = document.createElement('iframe'); frame.style.width=size.width+'px'; frame.style.height=size.height+'px'; document.querySelector('#fixture').append(frame); frame.scrollIntoView({block:'start'}); // offscreen frames skip resize observers
  const setup = `const overrides=${JSON.stringify(overrides).replaceAll('<','\\u003c')};const realFetch=window.fetch.bind(window);window.__requests=[];window.fetch=async(url,options)=>{const key=new URL(url,location.href).pathname.split('/content/')[1];if(key)window.__requests.push(key);const replacement=overrides[key];if(replacement){if(replacement.delay)await new Promise(r=>setTimeout(r,replacement.delay));return new Response(replacement.body??'',{status:replacement.status??200});}return realFetch(url,options);};await import(${JSON.stringify(new URL('app.js',root).href)});document.documentElement.dataset.testReady='yes';`;
  frame.srcdoc=source.replace('<head>',`<head><base href="${base.href}">`).replace(/<script type="module" src="[^"]*app\.js"><\/script>/,`<script type="module">${setup}</script>`);
  await until(()=>frame.contentDocument?.documentElement.dataset.testReady==='yes');doc=frame.contentDocument;win=frame.contentWindow;
}
const entries=()=>[...doc.querySelectorAll('.entry')];
const replies=()=>[...doc.querySelectorAll('.reply')];
const idle=()=>until(()=>!doc.querySelector('[aria-busy="true"]'));
async function submit(value) {
  const input=doc.querySelector('input');input.value=value;doc.querySelector('form').requestSubmit();
  await idle();
}
const send=value=>{doc.querySelector('input').value=value;doc.querySelector('form').requestSubmit();};
const scroller=()=>doc.querySelector('#scrollback');
const jump=()=>doc.querySelector('#jump-latest');
const atBottom=()=>{const s=scroller();return s.scrollHeight-s.scrollTop-s.clientHeight<2;};
const inView=el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.bottom<=win.innerHeight+1;};
const scrollUp=async()=>{scroller().scrollTop=0;scroller().dispatchEvent(new win.Event('scroll'));await wait(50);};
async function fill(count){for(let i=0;i<count;i++)await submit(['/whoami','/hobby','/skill','/projects'][i%4]);}
async function test(name, fn){try{await fn();passed++;const li=document.createElement('li');li.className='pass';li.textContent='PASS '+name;document.querySelector('#results').append(li);}catch(e){if(e instanceof Skip){skipped++;const li=document.createElement('li');li.className='skip';li.textContent='SKIP '+name+' — '+e.message;document.querySelector('#results').append(li);return;}failed++;const li=document.createElement('li');li.className='fail';li.textContent='FAIL '+name+' — '+e.message;document.querySelector('#results').append(li);}}
await fixture();
await test('First screen has no quick commands or pre-rendered command bodies',async()=>{assert(!doc.querySelector('.quick-commands'),'quick command area present');const outside=[...doc.querySelectorAll('[data-command]')].filter(b=>!b.closest('#history'));assert(outside.length===1&&outside[0].dataset.command==='/help','unexpected entry points');assert(entries().length===0,'pre-rendered entries');for(const text of ['后台进程','patchpilot','~/notes/'])assert(!doc.body.textContent.includes(text),'command body visible: '+text);});
await test('Empty input adds no entries',async()=>{await submit('   ');assert(entries().length===0,'empty entry');});
await test('Help derives commands and aliases from config',async()=>{await submit('/help');assert(replies()[0].querySelectorAll('.command-row button').length===config.length+4,'help missing commands');assert(replies()[0].textContent.includes('/habit'),'alias missing');});
await test('Trim, case normalization, and Markdown',async()=>{await submit('  /WHOAMI  ');assert(replies().at(-1).querySelector('strong'),'Markdown strong missing');assert(replies().at(-1).textContent.includes('AngeCrystal'),'missing response');});
await test('Click and typed command produce identical replies',async()=>{const previous=replies().at(-1).textContent;doc.querySelector('#history [data-command="/whoami"]').click();await idle();assert(replies().at(-1).textContent===previous,'different response');doc.querySelector('.hint-command').click();await idle();assert(replies().at(-1).textContent===replies()[0].textContent,'hint /help differs from typed /help');});
await test('Hobby alias works',async()=>{await submit('/habit');const aliasReply=replies().at(-1).textContent;await submit('/hobby');assert(replies().at(-1).textContent===aliasReply,'alias failed');assert(replies().at(-1).querySelectorAll('br').length===2&&!replies().at(-1).textContent.includes('<br>'),'line breaks wrong');});
await test('Content migrated from README is available',async()=>{await submit('/skill');assert(replies().at(-1).textContent.includes('~/notes/'),'skill missing');await submit('/exit');assert(replies().at(-1).textContent.includes('Logout cancelled'),'exit missing');});
await test('Projects include real project commands; demo is labelled',async()=>{await submit('/projects');assert(replies().at(-1).querySelectorAll('.command-row button').length===config.filter(item=>item.category==='project').length,'project count');replies().at(-1).querySelector('button').click();await until(()=>!doc.querySelector('[aria-busy="true"]'));assert(replies().at(-1).textContent.toLowerCase().includes('patchpilot'),'project failed');await submit('/aaa');assert(replies().at(-1).textContent.includes('尚未对应真实项目'),'example misleading');});
await test('Unknown, arguments, Chinese, and HTML input remain inert',async()=>{for(const value of ['/unknown','/whoami | ls','你好','<img src=x onerror=alert(1)>']){await submit(value);assert(replies().at(-1).textContent.includes('没有找到'),'unknown accepted');}assert(!doc.querySelector('#history img'),'input became HTML');});
await test('IME composition blocks form submission and Enter',async()=>{const input=doc.querySelector('input');const count=entries().length;input.dispatchEvent(new win.CompositionEvent('compositionstart'));input.value='中文';doc.querySelector('form').requestSubmit();const event=new win.KeyboardEvent('keydown',{key:'Enter',isComposing:true,bubbles:true,cancelable:true});input.dispatchEvent(event);assert(event.defaultPrevented&&entries().length===count,'composition submitted');input.dispatchEvent(new win.CompositionEvent('compositionend'));const endEnter=new win.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true});input.dispatchEvent(endEnter);assert(endEnter.defaultPrevented,'composition-end Enter');await wait(90);await submit('/whoami');assert(entries().length===count+1,'subsequent submit failed');});
await test('390px layout has no horizontal overflow with long content',async()=>{await submit('x'.repeat(500));assert(doc.documentElement.scrollWidth<=390,'horizontal overflow');});
await test('Clear removes entries and input continues working',async()=>{await submit('/clear');assert(entries().length===0&&!doc.querySelector('#empty-state').hidden,'clear failed');await submit('/whoami');assert(entries().length===1,'not usable after clear');});
await test('Inline command mentions run the command; other inline code stays code',async()=>{await submit('/whoami');const link=replies().at(-1).querySelector('p [data-command="/skill"], li [data-command="/skill"]');assert(link,'inline /skill not clickable');link.click();await idle();assert(replies().at(-1).textContent.includes('~/notes/'),'inline command did not run');});
await test('/files lists content as commands, never as file links',async()=>{await submit('/files');const reply=replies().at(-1);assert(reply.querySelectorAll('.command-row button').length===config.length,'missing commands');assert(!reply.querySelector('a')&&!reply.textContent.includes('.md'),'file link exposed');});
await test('Every content command has a readable Chinese file',async()=>{for(const item of config){await submit(item.command);assert(!replies().at(-1).textContent.includes('暂时无法读取'),item.command+' unreadable');}});
const longBody='## Long reply\n\n'+Array.from({length:60},(_,i)=>`Paragraph ${i+1}.`).join('\n\n');
await fixture({},{width:1280,height:800});
await test('Desktop: 20+ commands keep the panel bounded and the newest reply visible',async()=>{const height=doc.querySelector('.terminal').offsetHeight;await fill(22);assert(entries().length===22,'missing entries');assert(doc.documentElement.scrollHeight<=win.innerHeight,'page grew with history');assert(doc.querySelector('.terminal').offsetHeight===height,'panel grew');assert(scroller().scrollHeight>scroller().clientHeight,'history not scrollable');assert(inView(doc.querySelector('input'))&&inView(doc.querySelector('.submit')),'input not visible');assert(atBottom(),'not at newest');assert(jump().hidden,'jump shown while following');});
await fixture({'zh/whoami.md':{delay:300,body:longBody}});
await test('Mobile: 20+ commands keep input usable without horizontal overflow',async()=>{await fill(21);assert(inView(doc.querySelector('input'))&&inView(doc.querySelector('.submit')),'input not visible');assert(doc.documentElement.scrollWidth<=390,'horizontal overflow');assert(atBottom(),'not at newest');});
await test('Long async reply keeps following when the reader stays at the bottom',async()=>{await submit('/whoami');assert(replies().at(-1).textContent.includes('Paragraph 60'),'long reply missing');assert(atBottom()&&jump().hidden,'did not follow async reply');});
await test('Loading text stays until a slow reply arrives',async()=>{send('/whoami');await wait(100);assert(replies().at(-1).textContent==='读取内容…','loading text cleared early');await idle();assert(replies().at(-1).textContent.includes('Paragraph 1.'),'reply missing');});
await test('Scrolling up while a reply loads is respected; jump returns to latest',async()=>{send('/whoami');await scrollUp();await idle();await wait(50);assert(scroller().scrollTop<5,'scroll was pulled down');assert(!jump().hidden,'jump not shown');jump().click();await wait(50);assert(atBottom()&&jump().hidden,'jump did not restore');assert(doc.activeElement===doc.querySelector('input'),'input lost focus');send('/hobby');await idle();await wait(50);assert(atBottom()&&jump().hidden,'following not resumed');});
await test('Submitting a command after scrolling up returns to latest',async()=>{await scrollUp();await submit('/hobby');await wait(50);assert(atBottom()&&jump().hidden,'not at newest after submit');});
await test('Clear with a late reply causes no stale scroll or jump',async()=>{send('/whoami');await scrollUp();await submit('/clear');assert(jump().hidden&&scroller().scrollTop===0,'stale state after clear');await wait(400);assert(entries().length===0&&jump().hidden&&scroller().scrollTop===0,'late reply changed scroll');});
await test('Shrinking viewport (soft keyboard) shrinks history, keeps input and newest output visible',async()=>{await fill(8);const before=scroller().clientHeight;frame.style.height='480px';const start=performance.now();try{await until(atBottom);}catch{}const took=Math.round(performance.now()-start);assert(scroller().clientHeight<before,'history did not shrink');assert(inView(doc.querySelector('input'))&&inView(doc.querySelector('.submit')),'input hidden');if(!atBottom()&&document.hidden)throw new Skip('page is hidden, so resize observers never run; rerun with the page visible');assert(atBottom(),`newest output hidden after ${took}ms`);});
await fixture({'zh/whoami.md':{delay:250,body:'# Slow first'},'zh/hobby.md':{body:'# Fast second'}});
await test('Delayed replies preserve submission order',async()=>{const input=doc.querySelector('input');for(const cmd of ['/whoami','/hobby']){input.value=cmd;doc.querySelector('form').requestSubmit();}await until(()=>!doc.querySelector('[aria-busy="true"]'));assert(replies()[0].textContent.includes('Slow first')&&replies()[1].textContent.includes('Fast second'),'reordered');});
await test('Clear suppresses a late pending reply',async()=>{doc.querySelector('input').value='/whoami';doc.querySelector('form').requestSubmit();await submit('/clear');await wait(300);assert(entries().length===0,'late reply reappeared');});
await fixture({'zh/whoami.md':{status:404}});
await test('Read failure is recoverable',async()=>{await submit('/whoami');assert(replies().at(-1).textContent.includes('暂时无法读取'),'no failure message');await submit('/hobby');assert(replies().at(-1).textContent.includes('curiosity.daemon'),'next command broken');});
await fixture({'commands.json':{body:'not json'}});
await test('Bad configuration preserves built-in help and clear',async()=>{await submit('/help');assert(replies().at(-1).querySelectorAll('button').length===4,'help unavailable');await submit('/clear');assert(entries().length===0,'clear unavailable');});
await fixture({'zh/whoami.md':{body:'<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>\n\n[bad](javascript:alert%281%29)\n\n[good](https://github.com/AngeCrystal)'}});
await test('Raw HTML and unsafe Markdown URLs cannot execute',async()=>{await submit('/whoami');assert(!doc.querySelector('#history script,#history img'),'unsafe element');const links=[...doc.querySelectorAll('#history a')];assert(links.length===1&&links[0].protocol==='https:','unsafe link');});
await fixture({'commands.json':{body:JSON.stringify([...config,{command:'/new',description:{zh:'new content',en:'new content'},file:'new.md'}])},'zh/new.md':{body:'## New config content'}});
await test('Config-only addition appears in help and executes',async()=>{await submit('/help');assert(replies().at(-1).textContent.includes('/new'),'missing from help');await submit('/new');assert(replies().at(-1).textContent.includes('New config content'),'cannot execute');});
await fixture({'zh/whoami.md':{body:'## Edited Markdown'}});
await test('Reload reads updated Markdown and clears session',async()=>{assert(entries().length===0,'history persisted');await submit('/whoami');assert(replies().at(-1).textContent.includes('Edited Markdown'),'stale content');});
await fixture({}, undefined, {page:'en/index.html'});
await test('English page: interface and help are in English',async()=>{assert(doc.documentElement.lang==='en','lang');assert(!cjk.test(doc.querySelector('main').textContent),'Chinese UI text on English page');await submit('/help');const reply=replies().at(-1).textContent;assert(reply.includes(config[0].description.en)&&!cjk.test(reply),'help not English');});
await test('English page: every command reads its English file',async()=>{for(const item of config){await submit(item.command);const reply=replies().at(-1).textContent;assert(!reply.includes('could not be loaded'),item.command+' unreadable');assert(!cjk.test(reply),item.command+' contains Chinese');}assert(win.__requests.every(k=>k==='commands.json'||k.startsWith('en/')),'requested non-English content');});
await test('English page: unknown commands and /files reply in English',async()=>{await submit('/nope');assert(replies().at(-1).textContent.includes('Command not found'),'unknown not English');await submit('/files');assert(replies().at(-1).textContent.includes('only be read through commands'),'/files not English');});
for (const page of ['index.html','en/index.html']) {
  await fixture({}, undefined, {root:docs, page});
  await test(`Published ${page}: content comes from the bundle, never from Markdown requests`,async()=>{await submit('/whoami');await submit('/hobby');assert(replies().at(-1).querySelector('pre'),'bundle content missing');assert(win.__requests.length===0,'fetched '+win.__requests.join(', '));});
}
await test('Published site serves no Markdown content files',async()=>{for(const path of ['content/commands.json','content/zh/whoami.md','content/en/whoami.md','content/whoami.md']){const response=await fetch(new URL(path,docs),{cache:'no-store'});assert(response.status===404,path+' is reachable');}});
document.querySelector('#result').textContent=`${passed} passed, ${failed} failed`+(skipped?`, ${skipped} skipped`:'');
document.title=`${failed?'FAIL':'PASS'} — Terminal acceptance tests`;
