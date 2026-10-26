import { before, after, beforeEach, test } from 'node:test';
import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, serverTimestamp } from 'firebase/firestore';

let env;
const projectId = 'familytrip-rules-local';
const adm1 = 'test-admin-one';
const adm2 = 'test-admin-two';
const outsider = 'test-outsider';
const accessPath = 'config/access';
const tripPath = 'trips/test-trip';

function db(uid) { return uid ? env.authenticatedContext(uid).firestore() : env.unauthenticatedContext().firestore(); }
function tripData(overrides = {}) {
  return { title: 'Sommerurlaub', description: '', startDate: '2027-08-01', endDate: '2027-08-15', status: 'planning', createdAt: serverTimestamp(), updatedAt: serverTimestamp(), deletedAt: null, ...overrides };
}
function stageData(overrides = {}) {
  return { title: 'Gardasee', type: 'stay', startDate: '2027-08-01', endDate: '2027-08-06', country: 'Italien', place: 'Bardolino', address: '', transport: 'Auto', notes: '', createdAt: serverTimestamp(), updatedAt: serverTimestamp(), deletedAt: null, ...overrides };
}
function accommodationData(overrides = {}) {
  return { name: 'Ferienwohnung', stageId: '', address: '', city: 'Bardolino', country: 'Italien', platform: '', provider: '', bookingUrl: '', bookingReference: '', checkInDate: '2027-08-01', checkOutDate: '2027-08-06', checkInTime: '', checkOutTime: '', keyInfo: '', parkingInfo: '', hostName: '', hostPhone: '', hostEmail: '', totalPriceMinor: 85000, currency: 'EUR', cancellationUntil: '', cancellationPolicy: '', notes: '', createdAt: serverTimestamp(), updatedAt: serverTimestamp(), deletedAt: null, ...overrides };
}

before(async () => {
  env = await initializeTestEnvironment({
    projectId,
    firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8') }
  });
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async ctx => {
    await setDoc(doc(ctx.firestore(), accessPath), {adminUids: [adm1, adm2]});
  });
});

after(async () => { if (env) await env.cleanup(); });

test('anonym: config nicht lesbar', async () => {
  await assertFails(getDoc(doc(db(), accessPath)));
});
test('fremde UID: config nicht lesbar', async () => {
  await assertFails(getDoc(doc(db(outsider), accessPath)));
});
test('beide Admins: config lesbar', async () => {
  await assertSucceeds(getDoc(doc(db(adm1), accessPath)));
  await assertSucceeds(getDoc(doc(db(adm2), accessPath)));
});
test('auch Admin kann Freigabeliste nicht per App ändern', async () => {
  await assertFails(updateDoc(doc(db(adm1), accessPath), { adminUids: [adm1, outsider] }));
});
test('anonyme und fremde UID: Reise nicht lesbar', async () => {
  await assertFails(getDoc(doc(db(), tripPath)));
  await assertFails(getDoc(doc(db(outsider), tripPath)));
  await assertFails(getDocs(collection(db(outsider), 'trips')));
});
test('beide Admins: gültige Reise anlegen und lesen', async () => {
  await assertSucceeds(setDoc(doc(db(adm1), tripPath), tripData()));
  const snap = await assertSucceeds(getDoc(doc(db(adm2), tripPath)));
  assert.equal(snap.data().title, 'Sommerurlaub');
});
test('fremde UID kann keine Reise erstellen', async () => {
  await assertFails(setDoc(doc(db(outsider), tripPath), tripData()));
});
test('Admin: ungültiger Zeitraum wird abgewiesen', async () => {
  await assertFails(setDoc(doc(db(adm1), tripPath), tripData({endDate:'2027-07-30'})));
});
test('Admin: zusätzliche unerwartete Felder werden abgewiesen', async () => {
  await assertFails(setDoc(doc(db(adm1), tripPath), tripData({superUser:true})));
});
test('Admin: gültige Etappe erlaubt, fremde UID abgewiesen', async () => {
  const path = `${tripPath}/stages/etappe-1`;
  await assertSucceeds(setDoc(doc(db(adm1), path), stageData()));
  await assertFails(setDoc(doc(db(outsider), `${tripPath}/stages/etappe-2`), stageData()));
});
test('Admin: gültige Unterkunft erlaubt, ungültiges Datum abgewiesen', async () => {
  const path = `${tripPath}/accommodations/unterkunft-1`;
  await assertSucceeds(setDoc(doc(db(adm2), path), accommodationData()));
  await assertFails(setDoc(doc(db(adm2), `${tripPath}/accommodations/unterkunft-2`), accommodationData({checkOutDate:'2027-08-01'})));
});
test('hartes Löschen ist auch für Admin verboten', async () => {
  const { deleteDoc } = await import('firebase/firestore');
  await assertSucceeds(setDoc(doc(db(adm1), tripPath), tripData()));
  await assertFails(deleteDoc(doc(db(adm1), tripPath)));
});
test('unbekannte Pfade bleiben gesperrt', async () => {
  await assertFails(getDoc(doc(db(adm1), 'private/secret')));
});
