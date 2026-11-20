import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEchoFilter, words } from '../../web/js/core/echo-filter.js';

// Without a headset the customer's voice from the speakers reaches the microphone and
// comes back as Agent text (test-log, real call 2026-10-03). The echo filter spots an
// Agent line that repeats what the customer is saying at the same time.

const cust = (id, text, at) => ({ id, side: 'customer', text, at });
const agent = (id, text, at) => ({ id, side: 'agent', text, at });

test('words: lower case, no punctuation, Arabic yeh/kaf normalised to Urdu', () => {
  assert.deepEqual(words('Hello, I want the PRICE!'), ['hello', 'i', 'want', 'the', 'price']);
  assert.deepEqual(words('كراچي؟ ٹھیک۔'), ['کراچی', 'ٹھیک']);
});

test('the same words at the same time are echo', () => {
  const f = createEchoFilter();
  f.noteCustomer(cust('c1', 'hello I want the price of a Toyota Corolla', 1000), 4000);
  assert.equal(f.isEcho(agent('a1', 'hello I want the price of Toyota Corolla', 1200), 4200), true);
});

test('the customer line may arrive after the agent line', () => {
  const f = createEchoFilter();
  const a = agent('a1', 'how many days to Karachi', 1000);
  assert.equal(f.isEcho(a, 2000), false);
  f.noteCustomer(cust('c1', 'how many days will shipping to Karachi take', 1100), 2500);
  assert.equal(f.isEcho(a, 2600), true);
});

test('Urdu echo with different letter forms is caught', () => {
  const f = createEchoFilter();
  f.noteCustomer(cust('c1', 'گاڑی کراچی کتنے دن میں پہنچے گی', 0), 3000);
  assert.equal(f.isEcho(agent('a1', 'گاڑی كراچي کتنے دن میں', 200), 3100), true);
});

test('different words are not echo', () => {
  const f = createEchoFilter();
  f.noteCustomer(cust('c1', 'hello I want the price of a Toyota Corolla', 1000), 4000);
  assert.equal(f.isEcho(agent('a1', 'sure let me check that for you', 1500), 4500), false);
});

test('repeating the customer much later is not echo', () => {
  const f = createEchoFilter();
  f.noteCustomer(cust('c1', 'the price of a Toyota Corolla', 1000), 3000);
  assert.equal(f.isEcho(agent('a1', 'the price of a Toyota Corolla', 12000), 14000), false);
});

test('a single word is never judged', () => {
  const f = createEchoFilter();
  f.noteCustomer(cust('c1', 'Karachi', 1000), 2000);
  assert.equal(f.isEcho(agent('a1', 'Karachi', 1000), 2000), false);
});

test('needs at least 60% of the agent words in the customer words', () => {
  const f = createEchoFilter();
  f.noteCustomer(cust('c1', 'one two three four five', 0), 2000);
  assert.equal(f.isEcho(agent('a1', 'one two three six seven', 0), 2000), true);    // 3/5
  assert.equal(f.isEcho(agent('a2', 'one two six seven eight', 0), 2000), false);   // 2/5
});

// Review 2026-11-12 (B1): an agent who repeats the customer's words back ("0300 1234567,
// theek hai") within a few seconds was hidden as echo, headset or not. Echo is heard by the
// microphone WHILE the customer speaks; a repeat-back comes after. `overlap` is the share
// of the agent's speaking time during which the customer was speaking too.
test('an agent repeating the customer after they stop is not echo', () => {
  const f = createEchoFilter();
  const c = cust('c1', 'my number is 0300 1234567', 0);
  f.noteCustomer(c, 3000);
  f.noteCustomer(c, 4700);                                   // final after the pause
  const a = agent('a1', '0300 1234567', 4500);
  assert.equal(f.isEcho(a, 6000), true);                     // the words alone look like echo
  assert.equal(f.isEcho(a, 6000, 0.05), false);              // but the mic heard them while the call was quiet
});

test('real echo is heard while the customer is speaking', () => {
  const f = createEchoFilter();
  f.noteCustomer(cust('c1', 'hello I want the price of a Toyota Corolla', 1000), 4000);
  assert.equal(f.isEcho(agent('a1', 'hello I want the price of Toyota Corolla', 1200), 4200, 0.9), true);
  assert.equal(f.isEcho(agent('a1', 'hello I want the price of Toyota Corolla', 1200), 4200, 0.5), true);
});

test('when the overlap is unknown, the words decide', () => {
  const f = createEchoFilter();
  f.noteCustomer(cust('c1', 'hello I want the price of a Toyota Corolla', 1000), 4000);
  assert.equal(f.isEcho(agent('a1', 'hello I want the price of Toyota Corolla', 1200), 4200, null), true);
});
