import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {defaultBooks} from '../src/books-data.js';

// Optional developer QA. Reuse an installed Playwright; no dependency is downloaded.
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const base=process.env.READING_PREVIEW_URL||'http://127.0.0.1:5173';
const artifacts=process.env.READING_QA_ARTIFACTS||join(tmpdir(),'sahil-reading-qa');
await mkdir(artifacts,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE_PATH?{executablePath:process.env.BROWSER_EXECUTABLE_PATH}:{channel:'chrome'})});
const reports=[];
const noOverflow=async page=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'the page has no horizontal overflow');
const title=page=>page.locator('.ra-selected-info h3');
const waitTitle=(page,value)=>page.waitForFunction(expected=>document.querySelector('.ra-selected-info h3')?.textContent===expected,value);
const waitRotation=(page,playing)=>page.waitForFunction(label=>document.querySelector('.ra-play')?.getAttribute('aria-label')===label,playing?'Pause automatic rotation':'Start automatic rotation');
const openArchive=async page=>{await page.goto(`${base}/reading`,{waitUntil:'domcontentloaded'});await page.locator('.ra-book-selected').waitFor();};

async function contextFor(viewport,options={}){
  const context=await browser.newContext({viewport,deviceScaleFactor:1,...options});
  // Keep interaction tests independent of third-party availability. Real URLs are untouched.
  await context.route('https://fonts.googleapis.com/**',route=>route.abort());
  await context.route('https://fonts.gstatic.com/**',route=>route.abort());
  await context.route('https://covers.openlibrary.org/**',route=>route.abort());
  const page=await context.newPage();
  page.setDefaultTimeout(12000);
  page.setDefaultNavigationTimeout(20000);
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  return {context,page,errors};
}

try{
  if(!process.argv.includes('--layouts-only')){
  const {context,page,errors}=await contextFor({width:1440,height:1000});
  await openArchive(page);
  assert.equal(await page.locator('.ra-book-slot').count(),8);
  assert.equal(await page.locator('.ra-play').getAttribute('aria-label'),'Start automatic rotation');
  assert.equal(await page.locator('.ra-gallery button').first().getAttribute('class'),'ra-play');
  assert.equal(await page.locator('#reading-title').evaluate(node=>node.tagName),'H1');
  await noOverflow(page);

  // Regression: pointer capture must not turn a Pause click into another Play click.
  const play=page.locator('.ra-play');
  await play.click();await waitRotation(page,true);
  await play.click();await waitRotation(page,false);
  await play.focus();await page.keyboard.press('Space');await waitRotation(page,true);
  await page.keyboard.press('Enter');await waitRotation(page,false);

  // Verify optional timed movement, then immediate pause on entry to the whole gallery.
  await play.click();await page.mouse.move(1,1);
  await waitTitle(page,defaultBooks[1].title);
  const galleryBox=await page.locator('.ra-gallery').boundingBox();
  await page.mouse.move(galleryBox.x+8,galleryBox.y+8);
  await page.waitForFunction(()=>document.querySelector('.ra-play')?.getAttribute('aria-label')==='Start automatic rotation');
  await play.click();await page.mouse.move(1,1);
  await page.getByRole('button',{name:'Next book',exact:true}).focus();
  await waitRotation(page,false);
  console.log('PASS: mouse/keyboard Play and Pause, timed rotation, gallery entry and focus pause.');

  const beforePause=await title(page).textContent();
  await play.click();await page.mouse.move(1,1);
  await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
  await page.waitForTimeout(6900);
  assert.equal(await title(page).textContent(),beforePause,'offscreen rotation is suspended');
  await play.scrollIntoViewIfNeeded();await play.click();await waitRotation(page,false);
  await play.click();await page.mouse.move(1,1);
  // Exercise the visibility event handler without depending on OS tab scheduling in headless mode.
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
  await page.waitForTimeout(6900);
  assert.equal(await title(page).textContent(),beforePause,'hidden-page visibility events suspend rotation');
  await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
  await play.click();await waitRotation(page,false);
  console.log('PASS: real offscreen pause and simulated hidden-page visibility pause.');

  for(let index=0;index<8;index++){
    await page.getByRole('button',{name:`Select ${defaultBooks[index].title}`,exact:true}).click();
    await waitTitle(page,defaultBooks[index].title);
  }
  await page.getByRole('button',{name:'Next book',exact:true}).click();await waitTitle(page,defaultBooks[0].title);
  await page.getByRole('button',{name:'Previous book',exact:true}).click();await waitTitle(page,defaultBooks[7].title);
  for(let i=0;i<20;i++)await page.getByRole('button',{name:'Next book',exact:true}).click();
  await waitTitle(page,defaultBooks[3].title);
  assert.equal(await page.locator('.ra-book-selected').count(),1,'rapid interactions keep one selection');

  await page.locator('.ra-book-selected').focus();
  await page.keyboard.press('Home');await waitTitle(page,defaultBooks[0].title);
  await page.keyboard.press('ArrowRight');await waitTitle(page,defaultBooks[1].title);
  await page.keyboard.press('ArrowLeft');await waitTitle(page,defaultBooks[0].title);
  await page.keyboard.press('End');await waitTitle(page,defaultBooks[7].title);
  await page.keyboard.press('Enter');await page.waitForURL(`**/reading/${defaultBooks[7].slug}`);
  await page.locator('.ra-back').click();await waitTitle(page,defaultBooks[0].title);

  // Hover must move adjacent books into the center, without selecting again at rest.
  const hoverNeighbor=async (side,index)=>{
    await page.mouse.move(1,1);await page.waitForTimeout(850);
    await page.locator('.ra-book-scene').scrollIntoViewIfNeeded();
    const book=await page.locator(side==='next'?'.ra-book-next':'.ra-book-previous').boundingBox();
    const gallery=await page.locator('.ra-gallery').boundingBox();
    const x=side==='next'?Math.min(book.x+book.width-12,gallery.x+gallery.width-12):Math.max(book.x+12,gallery.x+12);
    await page.mouse.move(x,book.y+book.height*.45);
    await waitTitle(page,defaultBooks[index].title);
    await page.waitForTimeout(1100);
    assert.equal(await title(page).textContent(),defaultBooks[index].title,'hover settles without a feedback loop');
  };
  await hoverNeighbor('next',1);await hoverNeighbor('previous',0);
  for(const mode of ['Learnings in progress','What I think','Books I’ve read']){
    await page.getByRole('tab',{name:mode,exact:false}).click();
    assert.equal(await page.getByRole('tab',{name:mode,exact:false}).getAttribute('aria-selected'),'true');
    assert.equal(await page.locator('.ra-book-selected').count(),1);
  }

  console.log('PASS: all 8 selections, wrapping, rapid input, keyboard navigation, stable adjacent hover and reading perspectives.');
  for(const book of defaultBooks){
    await page.getByRole('button',{name:`Select ${book.title}`,exact:true}).click();await waitTitle(page,book.title);
    assert.equal(await page.locator('.ra-info-note>a').getAttribute('href'),`/reading/${book.slug}`);
    await page.locator('.ra-info-note>a').click();
    await page.waitForURL(`**/reading/${book.slug}`);
    assert.equal(await page.locator('.reading-notes h1').textContent(),book.title);
    assert.deepEqual(await page.locator('#key-ideas li').allTextContents(),book.key_ideas);
    assert.deepEqual(await page.locator('#applications li').allTextContents(),book.practical_applications);
    assert.deepEqual(await page.locator('.rn-interests span').allTextContents(),book.related_interests);
    assert.ok((await page.locator('.rn-author').textContent()).includes(book.author));
    assert.equal(await page.locator('.rn-unwritten').count(),book.personal_reflection?0:1);
    assert.equal(await page.locator('.rn-footer a').getAttribute('href'),'/resources');
    await page.locator('.ra-back').click();await page.locator('.ra-book-selected').waitFor();
  }
  console.log('PASS: all 8 notes links, original authors, ideas, applications, interests and back/resource links.');
  await page.locator('#reading-archive').screenshot({path:join(artifacts,'desktop-reading.png')});
  await page.goto(`${base}/resources`,{waitUntil:'domcontentloaded'});await page.locator('.resources-grid,.resources-empty').waitFor();
  await page.goto(`${base}/`,{waitUntil:'domcontentloaded'});await page.locator('.hero-artwork').waitFor();
  assert.equal(await page.locator('#reading-archive').count(),0,'the homepage archive remains removed');
  const reading=page.locator('nav[aria-label="Main navigation"] a[href="/reading"]');
  await reading.click();await page.reload({waitUntil:'domcontentloaded'});await page.locator('.ra-book-selected').waitFor();
  reports.push({viewport:'1440 desktop',checks:'mouse/keyboard play and pause, timed rotation, hover/focus/offscreen pause, simulated hidden-page visibility pause, all 8 selections, wraparound, rapid input, arrow/Home/End/Enter, left/right hover and stability, 3 perspectives, all 8 notes links/content, resources, homepage exclusion, menu/direct reload',runtimeErrors:errors});
  assert.deepEqual(errors,[]);await context.close();
  }

  for(const width of [1024,768,390,320]){
    const mobile=width<600;
    const {context,page,errors}=await contextFor({width,height:900},{isMobile:mobile,hasTouch:mobile});
    await openArchive(page);await noOverflow(page);
    const heights=[];
    for(const mode of ['Learnings in progress','What I think','Books I’ve read']){
      await page.getByRole('tab',{name:mode,exact:false}).click();
      for(const book of defaultBooks){
        await page.getByRole('button',{name:`Select ${book.title}`,exact:true}).click();await waitTitle(page,book.title);
        heights.push(await page.locator('.ra-selected-info').evaluate(node=>node.offsetHeight));
        const titleFits=await title(page).evaluate(node=>node.scrollWidth<=node.clientWidth);
        assert.ok(titleFits,`full title fits at ${width}px: ${book.title}`);
      }
    }
    await noOverflow(page);
    assert.equal(new Set(heights).size,1,`selected notes reserve a stable height across all books and perspectives at ${width}px`);
    if(mobile){
      await page.getByRole('button',{name:`Select ${defaultBooks[0].title}`,exact:true}).click();await waitTitle(page,defaultBooks[0].title);
      await page.locator('.ra-book-scene').scrollIntoViewIfNeeded();
      const client=await context.newCDPSession(page);
      const swipe=async direction=>{
        const box=await page.locator('.ra-book-scene').boundingBox();
        const y=box.y+box.height*.5,start=direction==='left'?width*.75:width*.25,end=width-start;
        await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:start,y}]});
        for(let i=1;i<=5;i++)await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:start+(end-start)*i/5,y}]});
        await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      };
      await swipe('left');await waitTitle(page,defaultBooks[1].title);
      await swipe('right');await waitTitle(page,defaultBooks[0].title);
      assert.equal(new URL(page.url()).pathname,'/reading','a swipe does not activate a book link');
      await page.waitForTimeout(850);
      await page.evaluate(()=>{document.activeElement?.blur();window.scrollTo(0,0);});
      await page.screenshot({path:join(artifacts,`mobile-${width}-reading.png`),fullPage:true});
      await page.locator('.ra-gallery').evaluate(node=>window.scrollTo(0,node.getBoundingClientRect().top+scrollY-120));
      await page.locator('.ra-gallery').screenshot({path:join(artifacts,`mobile-${width}-gallery.png`)});
    }
    reports.push({viewport:width,selectedPanelHeights:heights,checks:mobile?'8 readable titles across 3 perspectives, stable note panel, no overflow, native touch swipes both ways without accidental navigation':'8 readable titles across 3 perspectives, stable note panel, no overflow',runtimeErrors:errors});
    console.log(`PASS: ${width}px reading layout${mobile?', native left/right touch swipes':''}; panel heights ${heights.join('/')}.`);
    assert.deepEqual(errors,[]);await context.close();
  }

  const reduced=await contextFor({width:390,height:844},{isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  await openArchive(reduced.page);await reduced.page.waitForFunction(()=>!document.querySelector('.ra-play'));
  await reduced.page.getByRole('button',{name:'Next book',exact:true}).click();await waitTitle(reduced.page,defaultBooks[1].title);
  assert.equal(await reduced.page.locator('.ra-book-selected').evaluate(node=>getComputedStyle(node).transitionDuration),'0s');
  await noOverflow(reduced.page);assert.deepEqual(reduced.errors,[]);
  reports.push({viewport:'390 reduced motion',checks:'optional motion disabled, next control works, no transition or overflow'});await reduced.context.close();

  // An in-memory image fixture exercises decoding only; it is never shipped as a cover.
  const loaded=await contextFor({width:1440,height:1000});
  await loaded.context.unroute('https://covers.openlibrary.org/**');
  await loaded.context.route('https://covers.openlibrary.org/**',route=>route.fulfill({status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="240" height="360"><rect width="240" height="360" fill="#e7dcc8"/></svg>'}));
  await openArchive(loaded.page);await loaded.page.locator('.ra-book-selected img.ra-cover-loaded').waitFor();
  assert.equal(await loaded.page.locator('.ra-book-selected img').getAttribute('alt'),`Cover of ${defaultBooks[0].title} by ${defaultBooks[0].author}`);
  reports.push({checks:'real image element decode/onLoad path using test-only image response; aborted image requests show original typographic jackets in other checks'});await loaded.context.close();

  const remote=await contextFor({width:1440,height:1000});
  await remote.context.unroute('https://covers.openlibrary.org/**');
  const coverResponses=[];
  remote.page.on('response',response=>{if(response.url().includes('covers.openlibrary.org'))coverResponses.push({url:response.url(),status:response.status()});});
  await openArchive(remote.page);await remote.page.locator('.ra-gallery').scrollIntoViewIfNeeded();
  const coverLoaded=await remote.page.locator('.ra-book-selected img.ra-cover-loaded').waitFor({timeout:10000}).then(()=>true,()=>false);
  reports.push({checks:'bounded live Open Library cover request',coverLoaded,coverResponses,remoteAvailabilityGuaranteed:false});
  await remote.context.close();
  await writeFile(join(artifacts,'report.json'),JSON.stringify(reports,null,2));
  console.log(JSON.stringify({status:'PASS',artifacts,reports},null,2));
}finally{await browser.close();}
