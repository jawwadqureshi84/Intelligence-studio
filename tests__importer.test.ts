import test from 'node:test';
import assert from 'node:assert/strict';
import { build, normUrl, autoMap } from '../lib/importer';

test('normUrl cleans and rejects', () => {
  assert.equal(normUrl('example.com/'), 'https://example.com');
  assert.equal(normUrl('http://www.a.co/x'), 'http://www.a.co/x');
  for (const s of ['brightpath tutoring', 'ftp://a.com', 'localhost', 'http://u:p@a.com', '']) assert.equal(normUrl(s), null, s);
});
test('autoMap finds new columns', () => {
  const m = autoMap(['Company', 'Phone Number', 'Email 1', 'Email 2', 'Email 3', 'LinkedIn Profile', 'Website']);
  assert.deepEqual([m.company_name, m.phone, m.email1, m.email2, m.email3, m.linkedin_url, m.website], [0, 1, 2, 3, 4, 5, 6]);
});
const header = ['Company', 'Email 1', 'Website'];
const map = autoMap(header);
test('flags missing/invalid website, bad email and in-file duplicates', () => {
  const rows = [['Acme', 'a@acme.com', 'acme.com'], ['Acme', 'x@acme.com', 'https://www.acme.com'], ['Bad Site', 'nope', 'not a url'], ['No Site', '', ''], ['', 'z@z.com', 'z.com']];
  const r = build(rows, map, [], false);
  assert.equal(r.records.length, 4); assert.equal(r.skipped.length, 1);
  assert.deepEqual([r.stats.dupCompany, r.stats.badWebsite, r.stats.badEmail, r.stats.noWebsite, r.stats.noCompany], [1, 1, 1, 1, 1]);
  assert.ok(r.records[1].flags.includes('Duplicate company'));
  assert.match(r.records[2].notes, /not a url/);
});
test('skip duplicates against existing', () => {
  const r = build([['Acme', 'a@acme.com', 'acme.com'], ['New Co', 'n@n.com', 'n.com']], map, [{ company_name: 'ACME', website: 'https://acme.com', email1: '' }], true);
  assert.equal(r.records.length, 1); assert.equal(r.records[0].company_name, 'New Co');
});
