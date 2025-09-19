// app.js - Departmental GA Timetable Generator (client-side)
let lecturers = []; // {id,name,title,unavailable:[]}
let courses = []; // {code,name,size,lecturerId}
let rooms = []; // {id,capacity}
let timeslots = []; // [{id:"Mon-08:00-10:00"}]
let daysSelected = [];
let slotInputs = {};

// dynamic add functions
function addLecturer(){
  const idx = document.querySelectorAll('#lecturerForm input, #lecturerForm select').length/5; // rough
  const row = document.createElement('div');
  row.className='row';
  row.innerHTML = `<input placeholder="Lecturer ID (e.g. L001)" id="lec-id-${idx}" />
    <input placeholder="Lecturer Name (e.g. John Doe)" id="lec-name-${idx}" />
    <select id="lec-title-${idx}"><option>Mr</option><option>Miss</option><option>Mrs</option><option>Dr</option><option>Prof</option><option>Other</option></select>
    <input placeholder="If Other, enter title" id="lec-custom-${idx}" style="display:none" />
    <input placeholder="Unavailable times (comma sep e.g. Mon-08:00-10:00,Tue-10:00-12:00)" id="lec-unavail-${idx}" />`;
  document.getElementById('lecturerForm').appendChild(row);
  attachTitleListener(idx);
}

function attachTitleListener(idx){
  const sel = document.getElementById(`lec-title-${idx}`);
  const custom = document.getElementById(`lec-custom-${idx}`);
  if(!sel) return;
  sel.addEventListener('change', ()=>{
    if(sel.value==='Other') custom.style.display='inline-block'; else custom.style.display='none';
  });
}

// initial attach
attachTitleListener(0);

function saveLecturers(){
  lecturers = [];
  let idx=0;
  while(true){
    const idField = document.getElementById(`lec-id-${idx}`);
    if(!idField) break;
    const name = document.getElementById(`lec-name-${idx}`).value.trim();
    const id = idField.value.trim();
    const titleSel = document.getElementById(`lec-title-${idx}`).value;
    const custom = document.getElementById(`lec-custom-${idx}`).value.trim();
    const unavail = document.getElementById(`lec-unavail-${idx}`).value.trim();
    const title = titleSel==='Other' ? (custom || 'Other') : titleSel;
    const unavailArr = unavail? unavail.split(',').map(s=>s.trim()).filter(s=>s):[];
    if(id && name){
      lecturers.push({id,name,title,unavailable:unavailArr});
    }
    idx++;
  }
  document.getElementById('lecturerCount').innerText = `Saved ${lecturers.length} lecturer(s).`;
  console.log('lecturers',lecturers);
}

function addCourse(){
  const idx = document.querySelectorAll('#courseForm input').length/4;
  const row = document.createElement('div');
  row.className='row';
  row.innerHTML = `<input placeholder="Course Code (optional)" id="course-code-${idx}" />
    <input placeholder="Course Name" id="course-name-${idx}" />
    <input type="number" placeholder="Class Size" id="course-size-${idx}" />
    <input placeholder="Lecturer ID (e.g. L001)" id="course-lec-${idx}" />`;
  document.getElementById('courseForm').appendChild(row);
}

function createCourseAllocationTable(){
  // load courses from form
  courses = [];
  let idx=0;
  while(true){
    const codeField = document.getElementById(`course-code-${idx}`);
    if(!codeField) break;
    const code = codeField.value.trim();
    const name = document.getElementById(`course-name-${idx}`).value.trim();
    const size = parseInt(document.getElementById(`course-size-${idx}`).value) || 0;
    const lec = document.getElementById(`course-lec-${idx}`).value.trim();
    if(name && lec){
      courses.push({code,name,size,lecturerId:lec});
    }
    idx++;
  }
  // build table mapping lecturerId to name
  const wrap = document.getElementById('courseTableWrap');
  if(courses.length===0){ wrap.innerHTML='<p>No courses entered.</p>'; return; }
  let html = '<table id="courseAllocTable"><thead><tr><th>Course Code</th><th>Course Title</th><th>Lecturer Name</th></tr></thead><tbody>';
  courses.forEach(c=>{
    const lec = lecturers.find(l=>l.id===c.lecturerId);
    const lecName = lec? lec.name : `(ID:${c.lecturerId})`;
    html += `<tr><td>${c.code||''}</td><td>${c.name}</td><td>${lecName}</td></tr>`;
  });
  html += '</tbody></table><div style="margin-top:8px"><button onclick="downloadCourseAllocationPDF()">Download Course Allocation PDF</button></div>';
  wrap.innerHTML = html;
  toggleGenerateSection();
}

function downloadCourseAllocationPDF(){
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.text('Course Allocation',14,16);
  doc.autoTable({ html: '#courseAllocTable' });
  doc.save('course_allocation.pdf');
}

function continueToTimetable(){
  document.getElementById('genSection').style.display='block';
  window.scrollTo(0,document.body.scrollHeight);
}

function addRoom(){
  const idx = document.querySelectorAll('#roomForm input').length/2;
  const row = document.createElement('div');
  row.className='row';
  row.innerHTML = `<input placeholder="Room Name (e.g. R101)" id="room-name-${idx}" />
    <input type="number" placeholder="Capacity" id="room-cap-${idx}" />`;
  document.getElementById('roomForm').appendChild(row);
}

function saveRooms(){
  rooms = [];
  let idx=0;
  while(true){
    const nameField = document.getElementById(`room-name-${idx}`);
    if(!nameField) break;
    const id = nameField.value.trim();
    const cap = parseInt(document.getElementById(`room-cap-${idx}`).value) || 0;
    if(id) rooms.push({id,capacity:cap});
    idx++;
  }
  document.getElementById('roomCount').innerText = `Saved ${rooms.length} room(s).`;
  toggleGenerateSection();
}

function enableDaySlots(){
  // detect selected days and show inputs
  daysSelected = [];
  ['Mon','Tue','Wed','Thu','Fri'].forEach(d=>{
    if(document.getElementById(`day-${d}`).checked) daysSelected.push(d);
  });
  const container = document.getElementById('timeslotDefs');
  container.innerHTML='';
  slotInputs = {};
  daysSelected.forEach(d=>{
    const div = document.createElement('div');
    div.innerHTML = `<h4>${d}</h4><div id="slots-${d}" class="row"><input placeholder="e.g. 08:00-10:00" id="slot-${d}-0" /></div><button onclick="addSlotInput('${d}')">Add slot for ${d}</button>`;
    container.appendChild(div);
    slotInputs[d] = [];
    attachSlotInputListener(d,0);
  });
  container.innerHTML += '<div style="margin-top:8px"><button onclick="saveTimeslots()">Save Timeslots</button></div>';
}

function addSlotInput(day){
  const idx = document.querySelectorAll(`#slots-${day} input`).length;
  const parent = document.getElementById(`slots-${day}`);
  const input = document.createElement('input');
  input.placeholder = 'e.g. 10:00-12:00'; input.id = `slot-${day}-${idx}`;
  parent.appendChild(input);
  attachSlotInputListener(day,idx);
}

function attachSlotInputListener(day,idx){
  const el = document.getElementById(`slot-${day}-${idx}`);
  if(!el) return;
  el.addEventListener('change', ()=>{});
}

function saveTimeslots(){
  timeslots = [];
  daysSelected.forEach(d=>{
    const inputs = document.querySelectorAll(`#slots-${d} input`);
    inputs.forEach(inp=>{
      const txt = inp.value.trim();
      if(txt) timeslots.push({id:`${d}-${txt}`, day:d, slot:txt});
    });
  });
  document.getElementById('timeslotCount').innerText = `Saved ${timeslots.length} timeslot(s).`;
  toggleGenerateSection();
}

// enable generate section only if prerequisites exist
function toggleGenerateSection(){
  if(courses.length>0 && rooms.length>0 && timeslots.length>0 && lecturers.length>0){
    document.getElementById('genSection').style.display='block';
  }
}

// ---------- Genetic Algorithm engine (simple client-side) ----------

function initPopulation(popSize){
  const pop = [];
  for(let p=0;p<popSize;p++){
    const chrom = courses.map(c=>{
      const t = timeslots[Math.floor(Math.random()*timeslots.length)].id;
      const r = rooms[Math.floor(Math.random()*rooms.length)].id;
      return {courseId:c.code||c.name, courseName:c.name, lecturerId:c.lecturerId, timeslotId:t, roomId:r, classSize:c.size};
    });
    pop.push(chrom);
  }
  return pop;
}

function fitness(chrom){
  let penalty=0;
  const lecSched = {}; const roomSched = {};
  chrom.forEach(g=>{
    const lec = lecturers.find(l=>l.id===g.lecturerId);
    if(lec && lec.unavailable.includes(g.timeslotId)) penalty += 25;
    lecSched[g.lecturerId] = lecSched[g.lecturerId]||{}; lecSched[g.lecturerId][g.timeslotId] = (lecSched[g.lecturerId][g.timeslotId]||0)+1;
    if(lecSched[g.lecturerId][g.timeslotId] > 1) penalty += 35;
    roomSched[g.roomId] = roomSched[g.roomId]||{}; roomSched[g.roomId][g.timeslotId] = (roomSched[g.roomId][g.timeslotId]||0)+1;
    if(roomSched[g.roomId][g.timeslotId] > 1) penalty += 30;
    const room = rooms.find(r=>r.id===g.roomId);
    if(room && g.classSize > room.capacity) penalty += 50;
  });
  return 1/(1+penalty);
}

function selectOne(pop){
  const a = pop[Math.floor(Math.random()*pop.length)];
  const b = pop[Math.floor(Math.random()*pop.length)];
  return fitness(a)>fitness(b)? a.slice() : b.slice();
}

function crossover(a,b){
  const pt = Math.floor(Math.random()*a.length);
  return a.slice(0,pt).concat(b.slice(pt));
}

function mutate(chrom,rate=0.03){
  chrom.forEach(g=>{
    if(Math.random()<rate){
      g.timeslotId = timeslots[Math.floor(Math.random()*timeslots.length)].id;
    }
    if(Math.random()<rate){
      g.roomId = rooms[Math.floor(Math.random()*rooms.length)].id;
    }
  });
  return chrom;
}

async function generateTimetable(){
  if(courses.length===0){ alert('No courses.'); return; }
  const popSize = parseInt(document.getElementById('popSize').value)||150;
  const generations = parseInt(document.getElementById('generations').value)||300;
  let population = initPopulation(popSize);
  let best = population[0]; let bestScore = fitness(best);
  for(let gen=0; gen<generations; gen++){
    const newPop = [];
    population.sort((x,y)=> fitness(y)-fitness(x));
    newPop.push(...population.slice(0, Math.max(1, Math.floor(popSize*0.05))));
    while(newPop.length<popSize){
      const p1 = selectOne(population);
      const p2 = selectOne(population);
      let child = crossover(p1,p2);
      child = mutate(child, 0.05);
      newPop.push(child);
    }
    population = newPop;
    const currentBest = population.sort((x,y)=> fitness(y)-fitness(x))[0];
    if(fitness(currentBest) > bestScore){
      best = currentBest.slice(); bestScore = fitness(currentBest);
    }
  }
  renderTimetable(best);
}

function renderTimetable(chrom){
  // create grid: rows = timeslot labels, cols = days
  const days = [...new Set(timeslots.map(t=> t.day))];
  const slotLabels = [...new Set(timeslots.map(t=> t.slot))];
  let html = '<table id="timetableTable"><thead><tr><th>Time/Day</th>';
  days.forEach(d=> html += `<th>${d}</th>`);
  html += '</tr></thead><tbody>';
  slotLabels.forEach(slot=>{
    html += `<tr><td>${slot}</td>`;
    days.forEach(day=>{
      const slotId = `${day}-${slot}`;
      const entries = chrom.filter(c=> c.timeslotId===slotId);
      if(entries.length===0){ html += '<td>-</td>'; }
      else{
        let cell = '';
        entries.forEach(e=>{
          const room = rooms.find(r=>r.id===e.roomId);
          const lec = lecturers.find(l=>l.id===e.lecturerId);
          const lecName = lec? lec.name : e.lecturerId;
          cell += `${e.courseName} (${e.roomId}, ${lecName}, ${e.classSize}/${room?room.capacity:'?'})<br/>`;
        });
        html += `<td>${cell}</td>`;
      }
    });
    html += '</tr>';
  });
  html += '</tbody></table>';
  document.getElementById('timetableWrap').innerHTML = html;
}

function downloadTimetablePDF(){
  const tbl = document.querySelector('#timetableTable');
  if(!tbl){ alert('No timetable to download'); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({orientation:'landscape'});
  doc.text('Generated Department Timetable',14,16);
  doc.autoTable({ html: '#timetableTable', startY:22 });
  doc.save('department_timetable.pdf');
}
