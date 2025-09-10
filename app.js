let data = {};

function addCourse() {
  const div = document.createElement('div');
  div.innerHTML = `
    <input type="text" placeholder="Course ID">
    <input type="text" placeholder="Lecturer ID">
    <input type="number" placeholder="Class Size">`;
  document.getElementById('courseInputs').appendChild(div);
}

function addRoom() {
  const div = document.createElement('div');
  div.innerHTML = `
    <input type="text" placeholder="Room ID">
    <input type="number" placeholder="Capacity">`;
  document.getElementById('roomInputs').appendChild(div);
}

function addLecturer() {
  const div = document.createElement('div');
  div.innerHTML = `
    <input type="text" placeholder="Lecturer ID">
    <input type="text" placeholder="Unavailable Times (comma-separated)">`;
  document.getElementById('lecturerInputs').appendChild(div);
}

function prepareData() {
  const parseGroup = (selector, fields) =>
    Array.from(document.querySelectorAll(`${selector} div`)).map(d => {
      const inputs = d.querySelectorAll('input');
      return fields.reduce((obj, f, i) => {
        obj[f] = f === 'classSize' || f === 'capacity' ? parseInt(inputs[i].value) : inputs[i].value;
        if (f === 'unavailable') obj[f] = inputs[i].value.split(',').map(x => x.trim()).filter(x => x);
        return obj;
      }, {});
    });

  const courses = parseGroup('#courseInputs', ['id', 'lecturerId', 'classSize']);
  const rooms = parseGroup('#roomInputs', ['id', 'capacity']);
  const lecturers = parseGroup('#lecturerInputs', ['id', 'unavailable']);
  const timeslots = document.getElementById('timeslotInput').value.split(',').map(t => ({ id: t.trim() }));

  data = { courses, rooms, lecturers, timeslots };
  generate();
}

async function generate() {
  const { timetable } = await GA.generateTimetable(150, 300, data);
  renderTimetable(timetable, data);
}

function renderTimetable(timetable, data) {
  const days = [...new Set(data.timeslots.map(t => t.id.split('-')[0]))];
  const slots = [...new Set(data.timeslots.map(t => t.id.split('-')[1]))];

  let html = '<table id="ttable"><tr><th>Time/Day</th>';
  days.forEach(d => html += `<th>${d}</th>`);
  html += '</tr>';

  slots.forEach(slot => {
    html += `<tr><td>${slot}:00</td>`;
    days.forEach(day => {
      const entry = timetable.find(t => t.timeslotId === `${day}-${slot}`);
      if (entry) {
        const course = data.courses.find(c => c.id === entry.courseId);
        const room = data.rooms.find(r => r.id === entry.roomId);
        html += `<td>${course.id} (${room.id}, ${entry.lecturerId}, ${course.classSize}/${room.capacity})</td>`;
      } else {
        html += '<td>-</td>';
      }
    });
    html += '</tr>';
  });

  html += '</table>';
  document.getElementById('timetable').innerHTML = html;
}

function downloadPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.text('Generated Timetable', 14, 16);
  doc.autoTable({ html: '#ttable' });
  doc.save('timetable.pdf');
}
