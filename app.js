const $ = id => document.getElementById(id);
const STORAGE_KEY = "my-ai-calendar-events-v1";
let events = loadEvents();
let viewDate = new Date(); viewDate.setDate(1);
let selectedDate = dateKey(new Date());
let editingId = null;

function loadEvents(){ try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]")}catch{return []} }
function saveEvents(){localStorage.setItem(STORAGE_KEY,JSON.stringify(events)); render()}
function dateKey(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
function parseDate(s){const [y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d)}
function fmtDate(s){const d=parseDate(s);return `${d.getMonth()+1}月${d.getDate()}日（${"日月火水木金土"[d.getDay()]}）`}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function sortEvents(a,b){return a.date.localeCompare(b.date)||(a.allDay?-1:b.allDay?1:(a.time||"").localeCompare(b.time||""))}
function render(){
  $("monthLabel").textContent=`${viewDate.getFullYear()}年${viewDate.getMonth()+1}月`;
  const first=new Date(viewDate.getFullYear(),viewDate.getMonth(),1), start=new Date(first); start.setDate(1-first.getDay());
  const grid=$("calendarGrid");grid.innerHTML="";
  for(let i=0;i<42;i++){
    const d=new Date(start);d.setDate(start.getDate()+i);const key=dateKey(d);
    const dayEvents=events.filter(e=>e.date===key);
    const b=document.createElement("button");b.className="day"+(d.getMonth()!==viewDate.getMonth()?" muted":"")+(key===dateKey(new Date())?" today":"")+(key===selectedDate?" selected":"");
    b.innerHTML=`<span class="day-num">${d.getDate()}</span><span class="dots">${dayEvents.slice(0,3).map(()=>'<i class="dot"></i>').join("")}</span>`;
    b.addEventListener("click",()=>{selectedDate=key;if(d.getMonth()!==viewDate.getMonth())viewDate=new Date(d.getFullYear(),d.getMonth(),1);render()});grid.appendChild(b);
  }
  $("selectedDateLabel").textContent=fmtDate(selectedDate);
  const list=$("eventList"), dayEvents=events.filter(e=>e.date===selectedDate).sort(sortEvents);
  if(!dayEvents.length){list.innerHTML='<div class="empty">この日の予定はまだないよ</div>';return}
  list.innerHTML=dayEvents.map(e=>`<div class="event"><div class="event-time">${e.allDay?"終日":esc(e.time||"時間未定")}</div><div class="event-mark"></div><div class="event-main"><strong>${esc(e.title)}</strong>${e.note?`<p>${esc(e.note)}</p>`:""}${e.end&&!e.allDay?`<p>終了 ${esc(e.end)}</p>`:""}</div><button class="event-edit" data-id="${e.id}" aria-label="編集">⋯</button></div>`).join("");
  list.querySelectorAll(".event-edit").forEach(b=>b.addEventListener("click",()=>openEdit(b.dataset.id)));
}
function openDialog(e=null){
  editingId=e?.id||null;$("dialogTitle").textContent=e?"予定を編集":"予定を追加";
  $("eventTitle").value=e?.title||"";$("eventDate").value=e?.date||selectedDate;$("eventTime").value=e?.time||"09:00";$("eventEnd").value=e?.end||"";
  $("allDay").checked=!!e?.allDay;$("eventNote").value=e?.note||"";$("deleteEvent").classList.toggle("hidden",!e);
  syncAllDay();$("eventDialog").showModal();
}
function openEdit(id){const e=events.find(x=>x.id===id);if(e)openDialog(e)}
function syncAllDay(){$("eventTime").disabled=$("allDay").checked;$("eventEnd").disabled=$("allDay").checked}
$("allDay").addEventListener("change",syncAllDay);
$("addBtn").onclick=()=>openDialog();$("closeDialog").onclick=$("cancelDialog").onclick=()=>$("eventDialog").close();
$("eventForm").addEventListener("submit",ev=>{ev.preventDefault();const title=$("eventTitle").value.trim();if(!title)return;
 const item={id:editingId||crypto.randomUUID(),title,date:$("eventDate").value,time:$("allDay").checked?"":$("eventTime").value,end:$("allDay").checked?"":$("eventEnd").value,allDay:$("allDay").checked,note:$("eventNote").value.trim()};
 if(item.end&&item.time&&item.end<item.time){alert("終了時刻は開始時刻より後にしてね");return}
 if(editingId)events=events.map(e=>e.id===editingId?item:e);else events.push(item);
 selectedDate=item.date;viewDate=new Date(parseDate(item.date).getFullYear(),parseDate(item.date).getMonth(),1);$("eventDialog").close();saveEvents();$("assistantReply").textContent=`「${title}」を${fmtDate(item.date)}に登録したよ。`;
});
$("deleteEvent").onclick=()=>{if(!editingId)return;if(confirm("この予定を削除する？")){events=events.filter(e=>e.id!==editingId);$("eventDialog").close();saveEvents()}};
$("prevMonth").onclick=()=>{viewDate.setMonth(viewDate.getMonth()-1);render()};$("nextMonth").onclick=()=>{viewDate.setMonth(viewDate.getMonth()+1);render()};
$("todayBtn").onclick=()=>{const d=new Date();selectedDate=dateKey(d);viewDate=new Date(d.getFullYear(),d.getMonth(),1);render()};

// Rule-based Japanese command parser. Ambiguous or unsupported commands are not silently saved.
function resolveDate(text){
 const now=new Date();let d=new Date(now.getFullYear(),now.getMonth(),now.getDate());
 if(/明後日/.test(text))d.setDate(d.getDate()+2);else if(/明日/.test(text))d.setDate(d.getDate()+1);else if(/今日/.test(text)){}
 else {
   const rel=text.match(/(\d+)\s*日後/);if(rel)d.setDate(d.getDate()+Number(rel[1]));
   const m=text.match(/(\d{1,2})月(\d{1,2})日/);if(m)d=new Date(now.getFullYear(),Number(m[1])-1,Number(m[2]));
   const w=text.match(/来週の?(日|月|火|水|木|金|土)曜日?/);
   if(w){const target="日月火水木金土".indexOf(w[1]);let diff=(target-d.getDay()+7)%7;if(diff===0)diff=7;d.setDate(d.getDate()+diff+(text.includes("来週")?7:0));}
   else {const w2=text.match(/(日|月|火|水|木|金|土)曜日/);if(w2){const target="日月火水木金土".indexOf(w2[1]);let diff=(target-d.getDay()+7)%7;if(diff===0)diff=7;d.setDate(d.getDate()+diff);}}
 }
 return dateKey(d);
}
function parseCommand(raw){
 const t=raw.trim();if(!t)return {type:"error",message:"入力してから実行してね。"};
 if(/(今週|今月|今日|明日).*(予定|スケジュール)|予定を教えて|予定ある/.test(t)){
   let from=new Date(),to=new Date();
   if(t.includes("今週")){from.setDate(from.getDate()-from.getDay());to=new Date(from);to.setDate(from.getDate()+6)}
   else if(t.includes("今月")){from=new Date(from.getFullYear(),from.getMonth(),1);to=new Date(from.getFullYear(),from.getMonth()+1,0)}
   else {const k=resolveDate(t);from=parseDate(k);to=new Date(from)}
   const found=events.filter(e=>e.date>=dateKey(from)&&e.date<=dateKey(to)).sort(sortEvents);
   return {type:"answer",message:found.length?found.map(e=>`${fmtDate(e.date)} ${e.allDay?"終日":e.time||""} ${e.title}`).join("\n"):"その期間に登録されている予定はないよ。"};
 }
 if(/(削除|消して|取り消し)/.test(t)){
   const target=events.find(e=>t.includes(e.title));
   return target?{type:"delete",event:target}:{type:"error",message:"削除したい予定の名前を、登録名と同じ言葉で入れてね。"};
 }
 if(/(変更|ずらして|後ろに|前に)/.test(t)){
   const target=events.find(e=>t.includes(e.title));
   if(target)return {type:"edit",event:target,message:`「${target.title}」を編集する画面を開くね。変更内容を確認して保存してね。`};
   return {type:"error",message:"変更する予定を特定できなかったよ。予定名を含めて入力してね。"};
 }
 const date=resolveDate(t);
 const timeMatch=t.match(/([01]?\d|2[0-3])時(?:([0-5]?\d)分?)?/);
 const range=t.match(/([01]?\d|2[0-3])[:：]([0-5]\d)\s*[〜~\-－から]\s*([01]?\d|2[0-3])[:：]?([0-5]\d)?/);
 const rangeHour=t.match(/([01]?\d|2[0-3])時(?:([0-5]?\d)分?)?\s*[〜~\-－から]\s*([01]?\d|2[0-3])時(?:([0-5]?\d)分?)?/);
 let start="",end="";
 if(range){start=`${String(+range[1]).padStart(2,"0")}:${range[2]}`;end=`${String(+range[3]).padStart(2,"0")}:${range[4]||"00"}`}
 else if(rangeHour){start=`${String(+rangeHour[1]).padStart(2,"0")}:${String(+(rangeHour[2]||0)).padStart(2,"0")}`;end=`${String(+rangeHour[3]).padStart(2,"0")}:${String(+(rangeHour[4]||0)).padStart(2,"0")}`}
 else if(timeMatch)start=`${String(+timeMatch[1]).padStart(2,"0")}:${String(+(timeMatch[2]||0)).padStart(2,"0")}`;
 let title=t.replace(/明後日|明日|今日|来週の?(日|月|火|水|木|金|土)曜日?|(\d+日後)|\d{1,2}月\d{1,2}日/g,"")
   .replace(/([01]?\d|2[0-3])時(?:([0-5]?\d)分?)?/g,"").replace(/[〜~\-－から]/g," ").replace(/([01]?\d|2[0-3])[:：][0-5]\d/g,"")
   .replace(/(に|の|予定|を|登録|追加して|入れて|入れる|追加|登録して|終日)/g," ").replace(/\s+/g," ").trim();
 if(!title||title.length>50)return {type:"error",message:"予定名を読み取れなかったよ。「明日9時に歯医者」のように入力してね。"};
 return {type:"create",item:{title,date,time:start,end,allDay:/終日/.test(t)}};
}
$("commandForm").addEventListener("submit",ev=>{ev.preventDefault();const result=parseCommand($("command").value);
 if(result.type==="create"){const item={...result.item,id:crypto.randomUUID(),note:""};if(item.end&&item.time&&item.end<item.time){$("assistantReply").textContent="終了時刻が開始時刻より前になっているみたい。入力を確認してね。";return}
 openDialog(item);$("assistantReply").textContent=`登録内容を確認してね：${fmtDate(item.date)} ${item.allDay?"終日":item.time||"時間未定"}「${item.title}」`; }
 else if(result.type==="answer"){$("assistantReply").textContent=result.message}
 else if(result.type==="edit"){openEdit(result.event.id);$("assistantReply").textContent=result.message}
 else if(result.type==="delete"){if(confirm(`「${result.event.title}」を削除する？`)){events=events.filter(e=>e.id!==result.event.id);saveEvents();$("assistantReply").textContent="予定を削除したよ。"}}
 else $("assistantReply").textContent=result.message;
});
const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
if(SpeechRecognition){const rec=new SpeechRecognition();rec.lang="ja-JP";rec.interimResults=false;rec.maxAlternatives=1;
 $("micBtn").onclick=()=>{try{rec.start();$("voiceStatus").textContent="聞き取り中…"}catch{$("voiceStatus").textContent="音声入力を開始できなかったよ"}};
 rec.onresult=e=>{$("command").value=e.results[0][0].transcript;$("voiceStatus").textContent="音声を文字にしたよ。実行を押してね。"};
 rec.onerror=()=>{$("voiceStatus").textContent="音声入力を使えなかったよ。文字入力を試してね。"};rec.onend=()=>{if($("voiceStatus").textContent==="聞き取り中…")$("voiceStatus").textContent="音声入力が終了したよ。"};
}else{$("micBtn").disabled=true;$("micBtn").style.opacity=".45";$("voiceStatus").textContent="このブラウザでは音声入力に対応していないみたい。"}
if("serviceWorker" in navigator && location.protocol.startsWith("http"))navigator.serviceWorker.register("sw.js").catch(()=>{});
render();
