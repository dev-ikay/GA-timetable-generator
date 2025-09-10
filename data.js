// timetableGA.js
const GA = (() => {
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  function initPopulation(data, populationSize) {
    const { courses, timeslots, rooms } = data;
    const population = [];
    for (let p = 0; p < populationSize; p++) {
      const chromosome = courses.map(c => {
        const timeslotId = timeslots[Math.floor(Math.random() * timeslots.length)].id;
        const roomId = rooms[Math.floor(Math.random() * rooms.length)].id;
        return { courseId: c.id, timeslotId, roomId, lecturerId: c.lecturerId };
      });
      shuffle(chromosome);
      population.push(chromosome);
    }
    return population;
  }

  function fitness(chromosome, data) {
    const { courses, rooms, lecturers } = data;
    let violations = 0;
    const lecturerSchedule = {};
    const roomSchedule = {};
    const courseAssigned = new Set();

    for (const gene of chromosome) {
      const { courseId, timeslotId, roomId, lecturerId } = gene;
      const course = courses.find(c => c.id === courseId);
      const room = rooms.find(r => r.id === roomId);

      if (courseAssigned.has(courseId)) violations += 5;
      else courseAssigned.add(courseId);

      const lect = lecturers.find(l => l.id === lecturerId);
      if (lect && lect.unavailable.includes(timeslotId)) violations += 10;

      lecturerSchedule[lecturerId] = lecturerSchedule[lecturerId] || {};
      lecturerSchedule[lecturerId][timeslotId] =
        (lecturerSchedule[lecturerId][timeslotId] || 0) + 1;
      if (lecturerSchedule[lecturerId][timeslotId] > 1) violations += 10;

      roomSchedule[roomId] = roomSchedule[roomId] || {};
      roomSchedule[roomId][timeslotId] =
        (roomSchedule[roomId][timeslotId] || 0) + 1;
      if (roomSchedule[roomId][timeslotId] > 1) violations += 8;

      if (course && room && course.classSize > room.capacity) violations += 15;
    }

    return 1 / (1 + violations);
  }

  function select(population, data) {
    const contenders = [];
    for (let i = 0; i < 3; i++) {
      contenders.push(population[Math.floor(Math.random() * population.length)]);
    }
    return contenders.reduce((best, c) =>
      fitness(c, data) > fitness(best, data) ? c : best
    ).slice();
  }

  function crossover(p1, p2) {
    const pt = Math.floor(Math.random() * p1.length);
    return p1.slice(0, pt).concat(p2.slice(pt));
  }

  function mutate(chromosome, data, mRate = 0.05) {
    for (let i = 0; i < chromosome.length; i++) {
      if (Math.random() < mRate) {
        chromosome[i].timeslotId = data.timeslots[Math.floor(Math.random() * data.timeslots.length)].id;
        chromosome[i].roomId = data.rooms[Math.floor(Math.random() * data.rooms.length)].id;
      }
    }
    return chromosome;
  }

  async function generateTimetable(popSize = 100, generations = 200, data = {}) {
    let population = initPopulation(data, popSize);
    let best = population[0], bestScore = fitness(best, data);

    for (let gen = 0; gen < generations; gen++) {
      const newPop = [];
      const ranked = population.sort((a, b) => fitness(b, data) - fitness(a, data));
      const elite = Math.max(1, Math.floor(popSize * 0.05));
      newPop.push(...ranked.slice(0, elite));

      while (newPop.length < popSize) {
        const p1 = select(population, data);
        const p2 = select(population, data);
        let child = crossover(p1, p2);
        child = mutate(child, data);
        newPop.push(child);
      }

      population = newPop;
      const currentBest = population.sort((a, b) => fitness(b, data) - fitness(a, data))[0];
      const currentScore = fitness(currentBest, data);
      if (currentScore > bestScore) {
        best = currentBest.slice();
        bestScore = currentScore;
      }
    }
    return { timetable: best, score: bestScore };
  }

  return { generateTimetable, fitness };
})();
