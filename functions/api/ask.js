const OPENAI_URL="https://api.openai.com/v1/responses";
function j(data,status=200){return new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8"}})}
function cleanJournal(x){if(!x||typeof x!=="object")return null;const keys=["date","morning","body","thought","goal","urge","resisted","result","success","evening"],o={};for(const k of keys)if(x[k]!==undefined)o[k]=typeof x[k]==="string"?x[k].slice(0,1200):x[k];return o}
function extract(d){let answer="";const sources=[],seen=new Set();for(const item of d.output||[]){if(item.type!=="message")continue;for(const p of item.content||[]){if(p.type==="output_text"){answer+=(answer?"\n":"")+(p.text||"");for(const a of p.annotations||[])if(a.type==="url_citation"&&a.url&&!seen.has(a.url)){seen.add(a.url);sources.push({title:a.title||a.url,url:a.url})}}}}return{answer:answer.trim(),sources:sources.slice(0,8)}}
export async function onRequestPost(context){
 const env=context.env;if(!env.OPENAI_API_KEY)return j({error:"OPENAI_API_KEY is not configured"},500);
 let body;try{body=await context.request.json()}catch{return j({error:"Invalid JSON"},400)}
 const question=String(body?.question||"").trim();if(!question)return j({error:"question is required"},400);if(question.length>4000)return j({error:"question too long"},400);
 const journal=cleanJournal(body?.journal);
 const instructions=`אתה עוזר מידע בעברית בתוך אפליקציית CBT לחרדת בריאות.
ענה באופן ברור, ענייני ומרגיע אך ללא reassurance מוגזם.
כאשר נדרש מידע עדכני השתמש בחיפוש רשת ובמקורות אמינים ועדכניים.
בנושאים רפואיים ספק מידע כללי והקשר, לא אבחנה אישית ולא הבטחה שהכול תקין.
אל תעודד בדיקות חוזרות, ניטור כפייתי, חיפוש ודאות אינסופי או פירוש קטסטרופלי.
אם יש סימני אזהרה משמעותיים אמור בקצרה שיש לפנות להערכה רפואית מתאימה.
אם אין סימני אזהרה ברורים אל תעמיס רשימות של מחלות נדירות.
העדף גופי בריאות, הנחיות מקצועיות, מאמרים רפואיים ומוסדות אקדמיים.
ענה בעברית אלא אם התבקש אחרת. אם מתאים, סיים ב"מה לעשות עכשיו" קצר בגישת CBT.`;
 const input="שאלת המשתמש:\n"+question+(journal?"\n\nנתוני היומן שהמשתמש בחר לצרף:\n"+JSON.stringify(journal,null,2):"");
 let r;try{r=await fetch(OPENAI_URL,{method:"POST",headers:{Authorization:`Bearer ${env.OPENAI_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({model:env.OPENAI_MODEL||"gpt-6-luna",tools:[{type:"web_search"}],instructions,input,max_output_tokens:1800})})}catch{return j({error:"Could not reach OpenAI"},502)}
 const d=await r.json();if(!r.ok)return j({error:d?.error?.message||"OpenAI request failed"},502);const out=extract(d);return j({answer:out.answer||"לא התקבלה תשובה.",sources:out.sources,response_id:d.id||null,model:d.model||null});
}