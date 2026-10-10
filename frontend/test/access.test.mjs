import test from 'node:test';
import assert from 'node:assert/strict';
import { safeReturnPath, authDestination } from '../src/utils/authNavigation.js';
import { fulfillPendingBookmarkAndRedirect } from '../src/utils/bookmarkSync.js';

test('auth return paths stay local and avoid auth loops', () => {
  for (const path of ['https://example.com', '//example.com', '/\\example.com', '/login', '/signup?redirect=/saved', '/saved\n']) assert.equal(safeReturnPath(path), '/');
  assert.equal(safeReturnPath('/settings?tab=notifications#email'), '/settings?tab=notifications#email');
});
test('switching auth forms preserves query strings, percent signs and anchors', () => {
  const target = '/scholarships?search=100%25+funding%26books#catalog';
  const login = authDestination('/login', target);
  const redirect = new URL(login, 'https://udaan.local').searchParams.get('redirect');
  assert.equal(redirect, target);
  assert.equal(new URL(authDestination('/signup', redirect), 'https://udaan.local').searchParams.get('redirect'), target);
});
test('post-auth navigation decodes only once and tolerates literal percent signs', async () => {
  const target = '/scholarships?search=50%25+%26+STEM';
  globalThis.window = {location:{search:new URL(authDestination('/login', target),'https://udaan.local').search}};
  globalThis.sessionStorage = {getItem:()=>null};
  let destination;
  await fulfillPendingBookmarkAndRedirect(path=>{destination=path;});
  assert.equal(destination,target);
  delete globalThis.window; delete globalThis.sessionStorage;
});
