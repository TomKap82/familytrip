import {useEffect,useState} from 'react';
import {calculateFinances} from './finance';
import {addDoc,collection,doc,onSnapshot,serverTimestamp,updateDoc, type DocumentData} from 'firebase/firestore';
import {db} from './firebase';

type RecordRow=DocumentData&{id:string;deletedAt?:unknown};
type ItemKind='payment'|'expense'|'place';
const euro=(cents:number)=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(cents/100);
const fromEuro=(v:string)=>Math.round(Number(v)*100);
function live(path:string){return path;}
function useEntries(path:string){const [items,setItems]=useState<RecordRow[]>([]);const [error,setError]=useState('');useEffect(()=>onSnapshot(collection(db,live(path)),s=>{setItems(s.docs.map(x=>({id:x.id,...x.data()})));setError('')},e=>setError(e.message)),[path]);return {items,error};}
const defaults={payment:{title:'',accommodationId:'',dueDate:'',amount:'',status:'open',paidDate:'',recipient:'',iban:'',reference:'',notes:''},expense:{title:'',category:'other',amount:'',status:'planned',date:'',notes:''},place:{name:'',type:'sight',category:'sight',stageId:'',address:'',url:'',date:'',visitTime:'',price:'',priority:'maybe',notes:''}};
export function Sprint2({tripId,tab,accommodations,stages}:{tripId:string;tab:'finances'|'discover';accommodations:RecordRow[];stages:RecordRow[]}){
 const payments=useEntries(`trips/${tripId}/payments`);const expenses=useEntries(`trips/${tripId}/expenses`);const places=useEntries(`trips/${tripId}/places`);
 const [edit,setEdit]=useState<{kind:ItemKind;item?:RecordRow}|null>(null);const [error,setError]=useState('');const [saving,setSaving]=useState(false);
 const [values,setValues]=useState<Record<string,string>>({});
 const [placeFilter,setPlaceFilter]=useState<'all'|'sight'|'restaurant'>('all');
 const [onlyPlanned,setOnlyPlanned]=useState(false);
 const open=(kind:ItemKind,item?:RecordRow)=>{const template=defaults[kind];setValues(Object.fromEntries(Object.keys(template).map(k=>[k,item?(k==='amount'?String((item.amountMinor||0)/100):k==='price'?String((item.priceMinor||0)/100):String(item[k]??'')):String((template as Record<string,string>)[k])])));setError('');setEdit({kind,item})};
 const actualPayments=payments.items.filter(x=>!x.deletedAt);
 const actualExpenses=expenses.items.filter(x=>!x.deletedAt);
 const actualPlaces=places.items.filter(x=>!x.deletedAt);
 const finance=calculateFinances(accommodations,actualPayments,actualExpenses);
 const {perRoom,roomCost,extraCost,paid,scheduled,total,open:outstanding}=finance;
 const dataError=payments.error||expenses.error||places.error;
 const accommodationName=(id:string)=>accommodations.find(a=>a.id===id)?.name||'Ohne Unterkunft';
 async function save(e:React.FormEvent){e.preventDefault();if(!edit)return;setError('');
  if(edit.kind==='payment'&&values.status==='paid'&&!values.paidDate){setError('Bitte Zahlungsdatum eintragen.');return;}
  if(edit.kind==='payment'&&values.status==='open'&&values.paidDate){setError('Bei offenen Zahlungen darf kein Zahlungsdatum eingetragen sein.');return;}
  if(edit.kind==='place'&&values.url&&!/^https:\/\//i.test(values.url)){setError('Links müssen mit https:// beginnen.');return;}
  if(edit.kind==='place'&&values.date&&values.stageId){const stage=stages.find(s=>s.id===values.stageId);if(stage&&((stage.startDate&&values.date<stage.startDate)||(stage.endDate&&values.date>stage.endDate))){setError('Der Besuchstag liegt außerhalb der ausgewählten Etappe. Bitte Tag oder Etappe anpassen.');return;}}
  const amount=fromEuro(values.amount||'0');const price=fromEuro(values.price||'0');
  if(!Number.isSafeInteger(amount)||amount<0||!Number.isSafeInteger(price)||price<0){setError('Bitte einen gültigen Betrag größer oder gleich null eingeben.');return;}
  const {kind,item}=edit;const path=`trips/${tripId}/${kind==='payment'?'payments':kind==='expense'?'expenses':'places'}`;
  const data:Record<string,unknown>={...values};if(kind==='payment'||kind==='expense'){data.amountMinor=amount;delete data.amount;}else{data.priceMinor=price;delete data.price;data.category=values.type==='restaurant'?'restaurant':(values.category||'sight');data.visitTime=values.visitTime||'';}
  setSaving(true);try{if(item){await updateDoc(doc(db,path,item.id),{...data,updatedAt:serverTimestamp()})}else{await addDoc(collection(db,path),{...data,createdAt:serverTimestamp(),updatedAt:serverTimestamp(),deletedAt:null})}setEdit(null)}catch(ex){setError((ex as Error).message)}finally{setSaving(false)}
 }
 async function remove(kind:ItemKind,item:RecordRow){if(!window.confirm(`„${item.title||item.name}“ wirklich in den Papierkorb verschieben?`))return;const path=`trips/${tripId}/${kind==='payment'?'payments':kind==='expense'?'expenses':'places'}`;try{await updateDoc(doc(db,path,item.id),{deletedAt:serverTimestamp(),updatedAt:serverTimestamp()})}catch(e){alert((e as Error).message)}}
 const field=(key:string,label:string,type='text',opts?:{value:string;label:string}[])=> <label key={key}><span>{label}</span>{opts?<select value={values[key]||''} onChange={e=>setValues({...values,[key]:e.target.value})}>{opts.map(o=><option value={o.value} key={o.value}>{o.label}</option>)}</select>:type==='textarea'?<textarea rows={3} value={values[key]||''} onChange={e=>setValues({...values,[key]:e.target.value})}/>:<input type={type} min={type==='number'?'0':undefined} step={type==='number'?'0.01':undefined} value={values[key]||''} onChange={e=>setValues({...values,[key]:e.target.value})} required={['title','name','amount','dueDate'].includes(key)}/>}</label>;
 return <><div className="pageheading"><div><p className="eyebrow">SPRINT 2</p><h2>{tab==='finances'?'Finanzen und Zahlungen':'Ausflüge und Restaurants'}</h2></div><div className="actions">{tab==='finances'?<><button className="btn primary" onClick={()=>open('payment')}>+ Zahlung</button><button className="btn subtle" onClick={()=>open('expense')}>+ Weitere Ausgabe</button></>:<button className="btn primary" onClick={()=>open('place')}>+ Ort hinzufügen</button>}</div></div>{dataError&&<div className="error">{dataError}</div>}
 {tab==='finances'?<>
 <div className="stats"><div><span>Gesamtkosten (erfasst)</span><strong>{euro(total)}</strong></div><div><span>Bereits bezahlt (erfasst)</span><strong>{euro(paid)}</strong></div><div><span>Noch zu bezahlen (erfasst)</span><strong>{euro(outstanding)}</strong></div><div><span>Davon als offene Raten terminiert</span><strong>{euro(scheduled)}</strong></div></div>
 <p className="muted">Gesamtkosten: {euro(roomCost)} Unterkünfte + {euro(extraCost)} weitere Ausgaben. Die als „Tatsächlich / bezahlt“ erfassten weiteren Ausgaben zählen als bezahlt. Raten werden <b>nicht</b> erneut zu den Reisekosten addiert.</p>
 {finance.incomplete&&<div className="error" role="alert"><b>Finanzplan unvollständig:</b> {perRoom.some(r=>r.priceMissing)?'Mindestens eine Unterkunft hat keinen erkennbaren Gesamtpreis. Bitte den Gesamtpreis unter „Unterkünfte“ nachtragen. ':''}{finance.unassigned.length?'Mindestens eine Zahlung ist keiner aktiven Unterkunft zugeordnet. ':''}Die Gesamtkosten und der Restbetrag sind daher möglicherweise nicht vollständig.</div>}
 {finance.overpaid>0&&<div className="error">Bei mindestens einer Unterkunft übersteigen bereits bezahlte Raten den Unterkunftspreis. Bitte Beträge und Zuordnung prüfen (Abweichung: {euro(finance.overpaid)}).</div>}
 <h2 className="section-title">Kosten und Zahlungen nach Unterkunft</h2>
 <div className="items">{perRoom.length===0?<p className="muted">Noch keine Unterkunft erfasst.</p>:perRoom.map(r=><article className="item" key={r.id}><div className="item-detail"><h3>{r.name}</h3><p>Gesamtpreis: <b>{r.priceMissing?'Nicht erfasst / prüfen':euro(r.price)}</b> · Bezahlt: <b>{euro(r.paid)}</b> · Offen: <b>{r.priceMissing?'nicht berechenbar':euro(r.remaining)}</b></p><small>Terminierte offene Raten: {euro(r.scheduled)}{r.priceMissing?' · Gesamtpreis in der Unterkunft nachtragen':r.unplanned>0?' · Noch ohne Zahlungstermin: '+euro(r.unplanned):''}</small>{r.overScheduled>0&&!r.priceMissing&&<p className="error">Die erfassten Raten übersteigen den Unterkunftspreis um {euro(r.overScheduled)}.</p>}</div></article>)}</div>
 <h2 className="section-title">Weitere Ausgaben</h2><p className="muted">Kosten: <b>{euro(extraCost)}</b> · Als tatsächlich / bezahlt erfasst: <b>{euro(finance.extraPaid)}</b></p>
 {finance.unassigned.length>0&&<div className="error"><b>Nicht zugeordnete Zahlungen:</b> {euro(finance.unassignedPaid)} bezahlt und {euro(finance.unassignedOpen)} offen. Diese sind unten sichtbar, fließen aber nicht als Kosten einer Unterkunft in den Zahlungsfortschritt ein. Bitte über „Bearbeiten“ zuordnen oder eine eigene Kostenstelle als weitere Ausgabe erfassen.</div>}
 {finance.unallocatedOpen>0&&!finance.incomplete&&<p className="muted">Noch nicht mit einer offenen Rate terminiert: <b>{euro(finance.unallocatedOpen)}</b> (einschließlich weiterer geplanter Ausgaben).</p>}
 <h2 className="section-title">Zahlungsplan</h2>
 <div className="items">{actualPayments.length===0?<p className="muted">Noch keine Zahlungen angelegt.</p>:actualPayments.sort((a,b)=>String(a.dueDate).localeCompare(String(b.dueDate))).map(p=><article className="item" key={p.id}><div className="item-detail"><h3>{p.title}</h3><p>{accommodationName(p.accommodationId)} · fällig {p.dueDate||'–'} · {p.status==='paid'?'Bezahlt':'Offen'}</p><small>{p.status==='paid'?'Bezahlt am '+p.paidDate:'Empfänger: '+(p.recipient||'–')}</small><p><b>{euro(p.amountMinor||0)}</b></p></div><div className="actions"><button className="btn subtle" onClick={()=>open('payment',p)}>Bearbeiten</button><button className="iconbtn danger-text" onClick={()=>remove('payment',p)}>✕</button></div></article>)}</div>
 <h2 className="section-title">Weitere Ausgaben und Schätzungen im Detail</h2><div className="items">{actualExpenses.length===0?<p className="muted">Noch keine weiteren Ausgaben erfasst.</p>:actualExpenses.map(p=><article className="item" key={p.id}><div className="item-detail"><h3>{p.title}</h3><p>{p.category} · {p.status==='actual'?'tatsächlich / bezahlt':'geplant'} · {p.date||'ohne Datum'}</p><b>{euro(p.amountMinor||0)}</b></div><div className="actions"><button className="btn subtle" onClick={()=>open('expense',p)}>Bearbeiten</button><button className="iconbtn danger-text" onClick={()=>remove('expense',p)}>✕</button></div></article>)}</div>
 </>:<section className="discover-board">
 <p className="muted">Plane Ausflüge und Restaurants nach Reiseetappen. Vorhandene Einträge bleiben erhalten; Besuchstag und Uhrzeit sind optional.</p>
 <div className="actions" style={{marginBottom:16,flexWrap:'wrap',alignItems:'center'}}>
  <label style={{display:'flex',alignItems:'center',gap:8}}>Anzeigen <select aria-label="Orte filtern" value={placeFilter} onChange={e=>setPlaceFilter(e.target.value as 'all'|'sight'|'restaurant')}><option value="all">Alle Orte</option><option value="sight">Ausflüge</option><option value="restaurant">Restaurants</option></select></label>
  <label style={{display:'flex',alignItems:'center',gap:8}}><input type="checkbox" checked={onlyPlanned} onChange={e=>setOnlyPlanned(e.target.checked)}/> Nur mit Besuchstag</label>
 </div>
 {actualPlaces.length===0?<div className="empty">Noch keine Ausflugsziele oder Restaurants gespeichert.</div>:(()=>{
  const filtered=actualPlaces.filter(p=>(placeFilter==='all'||p.type===placeFilter)&&(!onlyPlanned||Boolean(p.date)));
  const groups=[...stages.filter(s=>!s.deletedAt).sort((a,b)=>String(a.startDate).localeCompare(String(b.startDate))).map(s=>({id:s.id,label:s.title||s.place||'Etappe',date:`${s.startDate||''} – ${s.endDate||''}`})),{id:'',label:'Noch keiner Etappe zugeordnet',date:''}];
  return filtered.length===0?<p className="muted">Für diesen Filter gibt es keine Einträge.</p>:groups.filter(g=>filtered.some(p=>(p.stageId||'')===g.id)||g.id===''&&filtered.some(p=>!stages.some(s=>s.id===p.stageId&&!s.deletedAt))).map(g=>{
   const entries=filtered.filter(p=>g.id?p.stageId===g.id:!stages.some(s=>s.id===p.stageId&&!s.deletedAt)).sort((a,b)=>String(a.date||'9999-99-99').localeCompare(String(b.date||'9999-99-99'))||String(a.visitTime||'99:99').localeCompare(String(b.visitTime||'99:99'))||String(a.name).localeCompare(String(b.name)));
   return <section key={g.id||'unassigned'} style={{marginBottom:26}}><h2 className="section-title">{g.label} <small style={{fontWeight:400,opacity:.7}}>({entries.length}) {g.date}</small></h2>
    <div className="items">{entries.map(p=><article className="item" key={p.id}><div className="item-detail"><h3>{p.name}</h3><p><b>{p.type==='restaurant'?'Restaurant / Essen':({sight:'Sehenswürdigkeit',beach:'Strand / Baden',hike:'Wanderung',museum:'Museum',activity:'Aktivität',other:'Sonstiges'} as Record<string,string>)[p.category]||'Ausflug / Sehenswürdigkeit'}</b> · {p.date?`${new Date(p.date+'T12:00:00').toLocaleDateString('de-DE')}${p.visitTime?' · '+p.visitTime+' Uhr':''}`:'Noch nicht fest eingeplant'}</p><p>{p.address||'Keine Adresse hinterlegt'}</p><small>Priorität: {p.priority==='must'?'Unbedingt':p.priority==='rain'?'Bei Regen':'Vielleicht'} · geschätzte Kosten: {euro(p.priceMinor||0)}</small><details style={{marginTop:8}}><summary>Details und Hinweise</summary><div style={{paddingTop:8}}>{p.notes&&<p className="note">{p.notes}</p>}{!p.notes&&<p className="muted">Keine zusätzlichen Hinweise.</p>}</div></details><div className="actions" style={{marginTop:10,flexWrap:'wrap'}}>{p.url&&<a href={p.url} target="_blank" rel="noopener noreferrer">Website öffnen ↗</a>}{p.address&&<a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.address)}`} target="_blank" rel="noopener noreferrer">Navigation öffnen ↗</a>}</div></div><div className="actions"><button className="btn subtle" onClick={()=>open('place',p)}>Bearbeiten</button><button className="iconbtn danger-text" aria-label={`${p.name} entfernen`} onClick={()=>remove('place',p)}>✕</button></div></article>)}</div>
   </section>;
  });
 })()}
 </section>}

 {edit&&<div className="overlay"><div className="modal"><div className="modal-head"><h2>{edit.item?'Bearbeiten':'Neu anlegen'} – {edit.kind==='payment'?'Zahlung':edit.kind==='expense'?'Ausgabe':'Ausflugsziel / Restaurant'}</h2><button className="iconbtn" onClick={()=>setEdit(null)}>✕</button></div><form onSubmit={save} className="form"><div className="fields">{edit.kind==='payment'?<>{field('title','Bezeichnung')}{field('accommodationId','Unterkunft','select',[{value:'',label:'Keine Zuordnung'},...accommodations.filter(a=>!a.deletedAt).map(a=>({value:a.id,label:a.name||a.id}))])}{field('dueDate','Fällig am','date')}{field('amount','Betrag in EUR','number')}{field('status','Status','select',[{value:'open',label:'Offen'},{value:'paid',label:'Bezahlt'}])}{field('paidDate','Tatsächlich bezahlt am','date')}{field('recipient','Empfänger')}{field('iban','IBAN (optional)')}{field('reference','Verwendungszweck')}{field('notes','Hinweise','textarea')}</>:edit.kind==='expense'?<>{field('title','Ausgabe')}{field('category','Kategorie','select',[{value:'other',label:'Sonstiges'},{value:'travel',label:'Anreise / Transport'},{value:'tolls',label:'Maut / Parken'},{value:'food',label:'Verpflegung'},{value:'activities',label:'Aktivitäten'}])}{field('amount','Betrag in EUR','number')}{field('status','Art','select',[{value:'planned',label:'Geplant'},{value:'actual',label:'Tatsächlich / bereits bezahlt'}])}{field('date','Datum','date')}{field('notes','Notizen','textarea')}</>:<>{field('name','Name')}{field('type','Typ','select',[{value:'sight',label:'Ausflug / Sehenswürdigkeit'},{value:'restaurant',label:'Restaurant / Essen'}])}{values.type!=='restaurant'&&field('category','Kategorie','select',[{value:'sight',label:'Sehenswürdigkeit'},{value:'beach',label:'Strand / Baden'},{value:'hike',label:'Wanderung'},{value:'museum',label:'Museum'},{value:'activity',label:'Aktivität'},{value:'other',label:'Sonstiges'}])}{field('stageId','Etappe','select',[{value:'',label:'Nicht zugeordnet'},...stages.filter(s=>!s.deletedAt).map(s=>({value:s.id,label:s.title||s.id}))])}{field('address','Adresse / Ort')}{field('url','Webseite (https://...)','url')}{field('date','Geplanter Tag','date')}{field('visitTime','Uhrzeit (optional)','time')}{field('price','Geschätzte Kosten in EUR','number')}{field('priority','Priorität','select',[{value:'maybe',label:'Vielleicht'},{value:'must',label:'Unbedingt'},{value:'rain',label:'Bei Regen'}])}{field('notes','Notizen / Öffnungszeiten','textarea')}</>}</div>{error&&<div className="error">{error}</div>}<div className="modal-actions"><button className="btn subtle" type="button" onClick={()=>setEdit(null)}>Abbrechen</button><button className="btn primary" disabled={saving}>{saving?'Speichere …':'Speichern'}</button></div></form></div></div>}
 </>;
}


/** Raten direkt an einer Unterkunft verwalten; nutzt dieselbe Firestore-Sammlung wie Finanzen. */
export function AccommodationPayments({tripId,accommodation}:{tripId:string;accommodation:RecordRow}){
 const {items,error}=useEntries(`trips/${tripId}/payments`);
 const rows=items.filter(p=>!p.deletedAt&&p.accommodationId===accommodation.id).sort((a,b)=>String(a.dueDate).localeCompare(String(b.dueDate)));
 const paid=rows.filter(p=>p.status==='paid').reduce((s,p)=>s+(Number(p.amountMinor)||0),0);
 const scheduled=rows.filter(p=>p.status==='open').reduce((s,p)=>s+(Number(p.amountMinor)||0),0);
 const price=Number(accommodation.totalPriceMinor)||0;
 const missing=price===0&&rows.length>0;
 const [editing,setEditing]=useState<RecordRow|null|undefined>(undefined);
 const [form,setForm]=useState({title:'',amount:'',dueDate:'',status:'open',paidDate:'',recipient:'',iban:'',reference:'',notes:''});
 const [saving,setSaving]=useState(false);
 const [formError,setFormError]=useState('');
 const open=(row:RecordRow|null)=>{
  setEditing(row);setForm({title:String(row?.title||''),amount:row?String((Number(row.amountMinor)||0)/100):'',dueDate:String(row?.dueDate||''),status:String(row?.status||'open'),paidDate:String(row?.paidDate||''),recipient:String(row?.recipient||''),iban:String(row?.iban||''),reference:String(row?.reference||''),notes:String(row?.notes||'')});setFormError('');
 };
 const change=(key:keyof typeof form,value:string)=>setForm(v=>({...v,[key]:value,...(key==='status'&&value==='open'?{paidDate:''}:{})}));
 async function save(e:React.FormEvent){e.preventDefault();setFormError('');
  const amount=Number(form.amount.replace(',','.'));
  if(!Number.isFinite(amount)||amount<=0||Math.round(amount*100)>1000000000){setFormError('Bitte einen gültigen positiven Betrag eintragen.');return;}
  if(!form.title.trim()||!form.dueDate){setFormError('Bezeichnung und Fälligkeitsdatum sind erforderlich.');return;}
  if(form.status==='paid'&&!form.paidDate){setFormError('Für bezahlte Raten ist ein Zahlungsdatum erforderlich.');return;}
  const data={title:form.title.trim(),accommodationId:accommodation.id,amountMinor:Math.round(amount*100),dueDate:form.dueDate,status:form.status,paidDate:form.status==='paid'?form.paidDate:'',recipient:form.recipient,iban:form.iban,reference:form.reference,notes:form.notes};
  setSaving(true);try{
   const path=`trips/${tripId}/payments`;
   if(editing){await updateDoc(doc(db,path,editing.id),{...data,updatedAt:serverTimestamp()});}
   else{await addDoc(collection(db,path),{...data,createdAt:serverTimestamp(),updatedAt:serverTimestamp(),deletedAt:null});}
   setEditing(undefined);
  }catch(e){setFormError((e as Error).message)}finally{setSaving(false)}
 }
 async function archive(row:RecordRow){if(!window.confirm(`Zahlung „${row.title}“ in den Papierkorb verschieben?`))return;
  try{await updateDoc(doc(db,`trips/${tripId}/payments`,row.id),{deletedAt:serverTimestamp(),updatedAt:serverTimestamp()})}catch(e){setFormError((e as Error).message)}
 }
 return <section className="accommodation-payments" style={{marginTop:16,paddingTop:12,borderTop:'1px solid #d7e3e0'}}>
  <h4 style={{margin:'0 0 8px'}}>Zahlungen für diese Unterkunft</h4>
  {error&&<p className="error">{error}</p>}
  <p><b>Gesamtpreis:</b> {price>0?euro(price):'Nicht erfasst'} · <b>Bezahlt:</b> {euro(paid)} · <b>Noch offen:</b> {missing?'nicht berechenbar':euro(Math.max(0,price-paid))}</p>
  <p className="muted" style={{marginTop:4}}>Davon als Raten geplant: {euro(scheduled)}. Raten erhöhen die Gesamtkosten nicht.</p>
  {missing&&<p className="error">Bitte den Gesamtpreis über „Bearbeiten“ bei der Unterkunft ergänzen.</p>}
  {price>0&&paid+scheduled>price&&<p className="error">Die Summe der Raten übersteigt den Unterkunftspreis um {euro(paid+scheduled-price)}.</p>}
  {rows.length===0?<p className="muted">Noch keine Raten hinterlegt.</p>:<div className="items">{rows.map(p=><div key={p.id} style={{padding:'10px 0',borderBottom:'1px solid #edf0ef'}}><div><b>{p.title}</b> · {euro(Number(p.amountMinor)||0)} · {p.status==='paid'?'Bezahlt':'Offen'}</div><small>Fällig: {p.dueDate||'–'}{p.status==='paid'?` · bezahlt: ${p.paidDate||'–'}`:''}</small><div className="actions"><button type="button" className="btn subtle" onClick={()=>open(p)}>Bearbeiten</button><button type="button" className="btn subtle" onClick={()=>archive(p)}>Entfernen</button></div></div>)}</div>}
  <button type="button" className="btn primary" style={{marginTop:10}} onClick={()=>open(null)}>+ Rate hinzufügen</button>
  {editing!==undefined&&<div className="overlay"><div className="modal"><div className="modal-head"><h2>{editing?'Zahlung bearbeiten':'Neue Zahlungsrate'} · {accommodation.name}</h2><button type="button" className="iconbtn" onClick={()=>setEditing(undefined)}>✕</button></div>
   <form className="form" onSubmit={save}><div className="fields">
   {([['title','Bezeichnung','text'],['amount','Betrag in EUR','number'],['dueDate','Fällig am','date']] as const).map(([key,label,type])=><label key={key}><span>{label}</span><input type={type} step={type==='number'?'0.01':undefined} min={type==='number'?'0.01':undefined} required value={form[key]} onChange={e=>change(key,e.target.value)}/></label>)}
   <label><span>Status</span><select value={form.status} onChange={e=>change('status',e.target.value)}><option value="open">Offen</option><option value="paid">Bezahlt</option></select></label>
   {form.status==='paid'&&<label><span>Tatsächlich bezahlt am</span><input type="date" required value={form.paidDate} onChange={e=>change('paidDate',e.target.value)}/></label>}
   {([['recipient','Empfänger'],['iban','IBAN'],['reference','Verwendungszweck']] as const).map(([key,label])=><label key={key}><span>{label}</span><input value={form[key]} onChange={e=>change(key,e.target.value)}/></label>)}
   <label className="wide"><span>Notizen</span><textarea value={form.notes} onChange={e=>change('notes',e.target.value)}/></label>
   </div>{formError&&<div className="error" role="alert">{formError}</div>}
   <div className="modal-actions"><button type="button" className="btn subtle" onClick={()=>setEditing(undefined)}>Abbrechen</button><button className="btn primary" disabled={saving}>{saving?'Speichere …':'Speichern'}</button></div></form>
  </div></div>}
 </section>;
}
