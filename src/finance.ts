// Finanzmodell: Kosten entstehen an Kostenstellen, Raten sind deren Tilgung.
// 0 EUR Unterkunftspreis kann in den Bestandsdaten auch "nicht eingetragen" bedeuten.
export type MoneyRow = {
  id: string;
  name?: string;
  title?: string;
  totalPriceMinor?: number;
  amountMinor?: number;
  accommodationId?: string;
  status?: string;
  dueDate?: string;
  deletedAt?: unknown;
};
const cents = (value:unknown) => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : 0;
export const sumCents = (rows:MoneyRow[], field:'amountMinor'|'totalPriceMinor') => rows.reduce((s,r)=>s+cents(r[field]),0);
export function calculateFinances(accommodations:MoneyRow[], payments:MoneyRow[], expenses:MoneyRow[]) {
  const rooms=accommodations.filter(x=>!x.deletedAt);
  const rates=payments.filter(x=>!x.deletedAt);
  const extras=expenses.filter(x=>!x.deletedAt);
  const perRoom=rooms.map(a=>{
    const own=rates.filter(p=>p.accommodationId===a.id);
    const price=cents(a.totalPriceMinor);
    const paid=sumCents(own.filter(x=>x.status==='paid'),'amountMinor');
    const scheduled=sumCents(own.filter(x=>x.status==='open'),'amountMinor');
    const priceMissing=price===0 && (own.length>0 || !Number.isFinite(a.totalPriceMinor));
    return {id:a.id,name:a.name||'Unbenannte Unterkunft',price,paid,scheduled,remaining:Math.max(0,price-paid),overpaid:Math.max(0,paid-price),unplanned:Math.max(0,price-paid-scheduled),overScheduled:Math.max(0,paid+scheduled-price),priceMissing};
  });
  const roomIds=new Set(rooms.map(x=>x.id));
  const unassigned=rates.filter(x=>!x.accommodationId || !roomIds.has(x.accommodationId));
  const unassignedPaid=sumCents(unassigned.filter(x=>x.status==='paid'),'amountMinor');
  const unassignedOpen=sumCents(unassigned.filter(x=>x.status==='open'),'amountMinor');
  const roomCost=perRoom.reduce((s,r)=>s+r.price,0);
  const extraCost=sumCents(extras,'amountMinor');
  const extraPaid=sumCents(extras.filter(x=>x.status==='actual'),'amountMinor');
  const paidRooms=perRoom.reduce((s,r)=>s+r.paid,0);
  const scheduled=perRoom.reduce((s,r)=>s+r.scheduled,0);
  const total=roomCost+extraCost;
  const paid=paidRooms+extraPaid;
  const open=Math.max(0,total-paid);
  return {perRoom,extras,roomCost,extraCost,extraPaid,paidRooms,scheduled,total,paid,open,
    unassigned,unassignedPaid,unassignedOpen,
    incomplete:perRoom.some(r=>r.priceMissing)||unassigned.length>0,
    overpaid:perRoom.reduce((s,r)=>s+r.overpaid,0),
    unplanned:perRoom.reduce((s,r)=>s+r.unplanned,0),
    unallocatedOpen:Math.max(0,open-scheduled-unassignedOpen)};
}
