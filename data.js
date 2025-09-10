// data.js
const data = {
  courses: [
    { id: 'CS101', lecturerId: 'L1', classSize: 80 },
    { id: 'CS102', lecturerId: 'L2', classSize: 35 },
    { id: 'CS103', lecturerId: 'L3', classSize: 60 }
  ],
  timeslots: [
    { id: 'Mon-8' }, { id: 'Mon-10' },
    { id: 'Tue-8' }, { id: 'Tue-10' }
  ],
  rooms: [
    { id: 'R1', capacity: 100 },
    { id: 'R2', capacity: 40 },
    { id: 'R3', capacity: 60 }
  ],
  lecturers: [
    { id: 'L1', unavailable: ['Mon-8'] },
    { id: 'L2', unavailable: [] },
    { id: 'L3', unavailable: [] }
  ]
};
