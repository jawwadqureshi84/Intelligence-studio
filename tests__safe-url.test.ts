import test from 'node:test';
import assert from 'node:assert/strict';
import { isPrivateIp, parseTarget, variants } from '../lib/safe-url.ts';

test('blocks private and metadata addresses', () => {
  for (const ip of ['127.0.0.1','10.1.2.3','172.16.0.1','192.168.1.1','169.254.169.254','100.64.0.1','::1','fd00::1','::ffff:10.0.0.1','0.0.0.0'])
    assert.equal(isPrivateIp(ip), true, ip);
  for (const ip of ['8.8.8.8','93.184.216.34','2606:4700::1111']) assert.equal(isPrivateIp(ip), false, ip);
});
test('parseTarget rejects unsafe input', () => {
  for (const s of ['ftp://x.com','http://user:pw@x.com','https://x.com:8080','http://localhost','http://127.0.0.1','https://[::1]/','intranet','https://a.local','file:///etc/passwd','two words.com'])
    assert.equal(parseTarget(s), null, s);
});
test('parseTarget accepts bare domains', () => {
  assert.equal(parseTarget('example.com')?.toString(), 'https://example.com/');
  assert.equal(parseTarget('http://www.example.com/a#x')?.toString(), 'http://www.example.com/a');
});
test('variants try https/http and www/non-www', () => {
  assert.deepEqual(variants('example.com').map(String), ['https://example.com/','https://www.example.com/','http://example.com/','http://www.example.com/']);
  assert.deepEqual(variants('www.example.com').map(String), ['https://www.example.com/','https://example.com/','http://www.example.com/','http://example.com/']);
  assert.deepEqual(variants('localhost'), []);
});
