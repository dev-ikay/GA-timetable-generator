// app.js - Departmental GA Timetable Generator (client-side) - Patched for constraints and removable timeslots
let lecturers = []; // {id,name,title,unavailable:[]}
let courses = []; // {code,name,size,lecturerId}
let rooms = []; // {id,capacity}
let timeslots = []; // [{id:"Mon-08:00-10:00", day:"Mon", slot:"08:00-10:00"}]
let daysSelected = [];
let slotInputs = {};
let constraints = []; // array of {id, text}

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
  toggleGenerateSection();
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
  if(courses.length===0){ wrap.innerHTML='<p>No courses entered.</p>'; toggleGenerateSection(); return; }
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
    div.id = `dayDef-${d}`;
    div.innerHTML = `<h4>${d}</h4>
      <div id="slots-${d}" class="row slot-row">
        <input placeholder="e.g. 08:00-10:00" id="slot-${d}-0" />
      </div>
      <div style="margin-top:6px">
        <button type="button" onclick="addSlotInput('${d}')">Add slot for ${d}</button>
        <button type="button" onclick="saveTimeslotsForDay('${d}')">Save slots for ${d}</button>
      </div>`;
    container.appendChild(div);
    slotInputs[d] = [];
    attachSlotInputListener(d,0);
  });
  container.innerHTML += '<div style="margin-top:8px"><button onclick="saveAllTimeslots()">Save All Timeslots</button></div>';
  // clear saved timeslot list display
  renderSavedTimeslotList();
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

// Save slots for a single day (useful to quickly persist)
function saveTimeslotsForDay(day){
  const inputs = document.querySelectorAll(`#slots-${day} input`);
  let added = 0;
  inputs.forEach(inp=>{
    const txt = inp.value.trim();
    if(txt){
      const id = `${day}-${txt}`;
      // avoid duplicates
      if(!timeslots.find(t=>t.id===id)){
        timeslots.push({id:id, day:day, slot:txt});
        added++;
      }
    }
  });
  document.getElementById('timeslotCount').innerText = `Saved ${timeslots.length} timeslot(s).`;
  renderSavedTimeslotList();
  toggleGenerateSection();
}

// Save all selected day slots at once
function saveAllTimeslots(){
  timeslots = timeslots || [];
  daysSelected.forEach(d=>{
    const inputs = document.querySelectorAll(`#slots-${d} input`);
    inputs.forEach(inp=>{
      const txt = inp.value.trim();
      if(txt){
        const id = `${d}-${txt}`;
        if(!timeslots.find(t=>t.id===id)){
          timeslots.push({id:id, day:d, slot:txt});
        }
      }
    });
  });
  document.getElementById('timeslotCount').innerText = `Saved ${timeslots.length} timeslot(s).`;
  renderSavedTimeslotList();
  toggleGenerateSection();
}

// Render saved timeslots list with remove buttons
function renderSavedTimeslotList(){
  const wrap = document.getElementById('savedTimeslotList');
  if(!timeslots || timeslots.length===0){ wrap.innerHTML = '<p>No timeslots saved yet.</p>'; return; }
  let html = '<table><thead><tr><th>Timeslot ID</th><th>Day</th><th>Slot</th><th>Action</th></tr></thead><tbody>';
  timeslots.forEach((t,idx)=>{
    html += `<tr id="ts-row-${idx}"><td>${t.id}</td><td>${t.day}</td><td>${t.slot}</td><td><button onclick="removeTimeslot('${t.id}')">Remove</button></td></tr>`;
  });
  html += '</tbody></table>';
  wrap.innerHTML = html;
}

// Remove a timeslot by id
function removeTimeslot(id){
  const confirmDelete = confirm(`Remove timeslot ${id}?`);
  if(!confirmDelete) return;
  timeslots = timeslots.filter(t=> t.id !== id);
  document.getElementById('timeslotCount').innerText = `Saved ${timeslots.length} timeslot(s).`;
  renderSavedTimeslotList();
  toggleGenerateSection();
}

// ---------- Constraints (add/remove) ----------
function addConstraint(){
  const txt = document.getElementById('constraintText').value.trim();
  if(!txt){ alert('Enter a constraint text.'); return; }
  const id = 'c-'+Date.now();
  constraints.push({id, text: txt});
  document.getElementById('constraintText').value = '';
  renderConstraintList();
}

function removeConstraint(id){
  if(!confirm('Remove constraint?')) return;
  constraints = constraints.filter(c=> c.id !== id);
  renderConstraintList();
}

function renderConstraintList(){
  const wrap = document.getElementById('constraintList');
  if(constraints.length===0){ wrap.innerHTML = '<p>No constraints added.</p>'; return; }
  let html = '<table><thead><tr><th>#</th><th>Constraint</th><th>Action</th></tr></thead><tbody>';
  constraints.forEach((c,idx)=>{
    html += `<tr id="c-${c.id}"><td>${idx+1}</td><td>${escapeHtml(c.text)}</td><td><button onclick="removeConstraint('${c.id}')">Remove</button></td></tr>`;
  });
  html += '</tbody></table>';
  wrap.innerHTML = html;
}

// simple escape to prevent accidental HTML injection display issues
function escapeHtml(s){ return (''+s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// enable generate section only if prerequisites exist
function toggleGenerateSection(){
  if(courses.length>0 && rooms.length>0 && timeslots.length>0 && lecturers.length>0){
    document.getElementById('genSection').style.display='block';
  } else {
    document.getElementById('genSection').style.display='none';
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
    // simple constraint application (basic heuristics)
    constraints.forEach(ct=>{
      const text = ct.text.toLowerCase();
      // example: "no class after 16:00"
      const m = text.match(/no class after\s+(\d{1,2}:\d{2})/);
      if(m){
        const cutoff = m[1];
        // timeslot format assumed "HH:MM-HH:MM" in slot part
        const slotPart = g.timeslotId.split('-').slice(1).join('-');
        const end = slotPart.split('-')[1] || slotPart.split('-')[0];
        if(end && end.trim() > cutoff) penalty += 40;
      }
      // example: "dr x cannot teach on mon"
      const m2 = text.match(/([a-z0-9\s.]+)\s+cannot teach on\s+(mon|tue|wed|thu|fri)/);
      if(m2){
        const nameOrId = m2[1].trim();
        const day = m2[2].toUpperCase();
        // check lecturer id or name match
        const lec = lecturers.find(l=> (l.id.toLowerCase()===nameOrId || l.name.toLowerCase()===nameOrId) );
        if(lec && g.lecturerId===lec.id && g.timeslotId.startsWith(day)) penalty += 50;
      }
    });
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
