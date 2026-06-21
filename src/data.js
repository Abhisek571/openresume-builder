// The whole resume is just this JSON object. Save/load/export all use it.
export const emptyResume = {
  personal: {
    name: 'Jane Doe',
    title: 'Software Engineer',
    email: 'jane@example.com',
    phone: '+1 555 0100',
    location: 'Melbourne, AU',
    website: 'github.com/janedoe',
    summary:
      'Engineer with 5 years building reliable web and desktop apps. Focused on clean architecture and shipping.',
  },
  experience: [
    {
      id: 1,
      role: 'Senior Developer',
      company: 'Acme Corp',
      start: '2022',
      end: 'Present',
      bullets: [
        'Led migration to a modular architecture, cutting build times 40%.',
        'Mentored 4 junior engineers.',
      ],
    },
  ],
  education: [
    {
      id: 1,
      degree: 'BSc Computer Science',
      school: 'University of Melbourne',
      start: '2015',
      end: '2018',
    },
  ],
  skills: ['JavaScript', 'React', 'Electron', 'Node.js', 'SQL'],
};
