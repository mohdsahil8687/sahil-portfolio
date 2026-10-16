import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from 'vite';
import React from 'react';
import {renderToString} from 'react-dom/server';
import {MemoryRouter} from 'react-router-dom';

const vite=await createServer({server:{middlewareMode:true,hmr:false},optimizeDeps:{noDiscovery:true,include:[]},appType:'custom'});
try{
  const data=await vite.ssrLoadModule('/src/books-data.js');
  const {default:Archive,BookGallery,BookJacket,BookNotes}=await vite.ssrLoadModule('/src/ReadingArchive.jsx');
  const {default:Editor}=await vite.ssrLoadModule('/src/BooksEditor.jsx');
  const render=element=>renderToString(React.createElement(MemoryRouter,null,element));
  const {defaultBooks,bookOffset,wrapIndex,validBook,publicBooks,coverSource,safeBookLink}=data;
  const expected=[['Atomic Habits','James Clear'],['Rich Dad Poor Dad','Robert T. Kiyosaki'],['The Alchemist','Paulo Coelho'],['The 7 Habits of Highly Effective People','Stephen R. Covey'],['Buy Back Your Time','Dan Martell'],['Thinking, Fast and Slow','Daniel Kahneman'],['Deep Work','Cal Newport'],['Think and Grow Rich','Napoleon Hill']];
  assert.equal(defaultBooks.length,8);
  expected.forEach(([title,author],i)=>{assert.equal(defaultBooks[i].title,title);assert.equal(defaultBooks[i].author,author);assert.equal(defaultBooks[i].reading_status,'Read');assert.equal(defaultBooks[i].personal_reflection,'');assert.ok(validBook(defaultBooks[i]));});
  assert.equal(new Set(defaultBooks.map(b=>b.slug)).size,8);
  for(let selected=0;selected<8;selected++){
    assert.equal(bookOffset(selected,selected,8),0);
    assert.equal(bookOffset(wrapIndex(selected-1,8),selected,8),-1);
    assert.equal(bookOffset(wrapIndex(selected+1,8),selected,8),1);
    const gallery=render(React.createElement(BookGallery,{books:defaultBooks,selectedId:defaultBooks[selected].id,onSelect:()=>{},onOpenNotes:()=>{},playing:false,setPlaying:()=>{}}));
    assert.equal((gallery.match(/class="ra-book-slot ra-book-selected"/g)||[]).length,1);
    assert.equal((gallery.match(/class="ra-book-slot ra-book-previous"/g)||[]).length,1);
    assert.equal((gallery.match(/class="ra-book-slot ra-book-next"/g)||[]).length,1);
    assert.equal((gallery.match(/<img /g)||[]).length,3);
    assert.ok(gallery.includes('Start automatic rotation'));
    assert.ok(gallery.indexOf('class="ra-play"')<gallery.indexOf('class="ra-book-slot'),'rotation can be reached before the moving books');
  }
  let index=0;for(let i=0;i<1001;i++)index=wrapIndex(index+1,8);assert.equal(index,1);
  for(let i=0;i<1001;i++)index=wrapIndex(index-1,8);assert.equal(index,0);
  assert.equal(publicBooks([{...defaultBooks[0],published:false}]).length,0);
  assert.equal(publicBooks([]).length,0);assert.equal(publicBooks(undefined).length,8);
  assert.equal(publicBooks([{...defaultBooks[0],author:null}]).length,0);
  const archive=render(React.createElement(Archive));
  assert.ok(archive.includes('08 Books Explored'));
  assert.match(archive,/<h1 id="reading-title">/,'the standalone archive has a page heading');
  assert.match(archive,/<div class="ra-book-details" aria-live="polite" aria-atomic="true">/,'selected notes have a stable announcement region');
  assert.ok(archive.includes('href="/resources"'));
  for(const b of defaultBooks){
    assert.ok(archive.includes(b.title),'every original book remains in the gallery');
    const notes=render(React.createElement(BookNotes,{book:b}));
    for(const label of ['Key ideas','My reflections','Practical applications','Related learning interests','Back to reading archive'])assert.ok(notes.includes(label),label);
    assert.ok(notes.includes(b.title));assert.ok(notes.includes(b.author));assert.ok(notes.includes('Personal reflections haven’t been added'));
    assert.match(notes,/<a(?=[^>]*href="\/reading")(?=[^>]*class="ra-back")[^>]*>/,'notes return to the standalone archive');
    assert.ok(!notes.includes('Download book'));
  }
  const empty=render(React.createElement(Archive,{books:[]}));assert.ok(empty.includes('Published reading notes will appear here.'));
  const notFound=render(React.createElement(BookNotes,{book:null}));assert.ok(notFound.includes('Notes not found.'));
  const fallback=render(React.createElement(BookJacket,{book:{...defaultBooks[0],isbn:'',cover_image_url:'javascript:alert(1)'}}));
  assert.ok(!fallback.includes('<img'));assert.ok(fallback.includes('Atomic Habits'));assert.ok(fallback.includes('James Clear'));
  assert.equal(coverSource({...defaultBooks[0],cover_image_url:'https://example.com/authorized-cover.webp'}),'https://example.com/authorized-cover.webp');
  assert.equal(safeBookLink('javascript:alert(1)'),'');assert.equal(safeBookLink('//example.com'),'');assert.equal(safeBookLink('/resources/my-guide'),'/resources/my-guide');
  const editor=render(React.createElement(Editor,{db:null,onRefresh:()=>{},onUpload:()=>{}}));assert.ok(editor.includes('No backend connected'));
  const sql=await readFile(new URL('../supabase/migrations/20261015_reading_archive.sql',import.meta.url),'utf8');
  assert.ok(sql.includes('enable row level security'));
  assert.ok(sql.includes('to anon, authenticated using (published)'));
  assert.equal((sql.match(/create policy "admin books/g)||[]).length,4);
  for(const b of defaultBooks)assert.ok(sql.includes(b.slug));
  assert.ok(sql.includes('on conflict do nothing'));
  assert.ok(!sql.includes('alter table public.resources'));
  console.log('PASS: eight books/authors, every notes page/link, all coverflow positions, 2,002 wrapping steps, three-image loading, private/empty filtering, cover fallback markup, safe links, missing-backend editor and migration structure.');
}finally{await vite.close();}
