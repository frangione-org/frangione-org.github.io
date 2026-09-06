// Tutor data for ABC Tutoring.
// Scope from Dana's chat: elementary math through Algebra II, science, and
// elementary reading; students mainly K–12 (middle school especially);
// hourly rates $40–$55. Six tutors, all shown.
//
// PLACEHOLDER names/photos/bios — Dana will send real tutor details & photos.
// Each `subject` is the top-level filter category (Math / Science / Reading).
export const tutors = [
  {
    id: 't1',
    name: 'Sarah Chen',
    subject: 'Math',
    focus: 'Elementary math – Algebra II',
    grades: 'Grades 3–10',
    rate: 50,
    rating: 4.9,
    bio: 'Patient math tutor covering everything from times tables to Algebra II. Middle-school specialty.',
    emoji: '📐',
    slots: ['Mon 4:00 PM', 'Tue 5:00 PM', 'Wed 4:00 PM', 'Thu 6:00 PM'],
  },
  {
    id: 't2',
    name: 'Marcus Reed',
    subject: 'Reading',
    focus: 'Elementary reading',
    grades: 'Grades K–5',
    rate: 40,
    rating: 4.8,
    bio: 'Early-literacy specialist helping young readers build confidence and comprehension.',
    emoji: '📖',
    slots: ['Mon 3:00 PM', 'Wed 5:00 PM', 'Fri 4:00 PM'],
  },
  {
    id: 't3',
    name: 'Priya Nair',
    subject: 'Science',
    focus: 'Elementary & middle-school science',
    grades: 'Grades 4–9',
    rate: 52,
    rating: 5.0,
    bio: 'Makes science click with hands-on examples — earth science, life science, and intro chemistry.',
    emoji: '🔬',
    slots: ['Tue 4:00 PM', 'Thu 5:00 PM', 'Sat 10:00 AM', 'Sat 11:00 AM'],
  },
  {
    id: 't4',
    name: 'David Okafor',
    subject: 'Math',
    focus: 'Pre-Algebra, Algebra I & II',
    grades: 'Grades 7–10',
    rate: 55,
    rating: 4.9,
    bio: 'Focused on the jump into algebra — clear, step-by-step, and confidence-building.',
    emoji: '🧮',
    slots: ['Mon 6:00 PM', 'Wed 6:00 PM', 'Sun 1:00 PM'],
  },
  {
    id: 't5',
    name: 'Elena Rossi',
    subject: 'Reading',
    focus: 'Reading & writing, elementary–middle',
    grades: 'Grades 2–7',
    rate: 42,
    rating: 4.7,
    bio: 'Helps students become stronger readers and writers, from phonics to first essays.',
    emoji: '✏️',
    slots: ['Tue 6:00 PM', 'Thu 4:00 PM', 'Fri 5:00 PM'],
  },
  {
    id: 't6',
    name: 'James Whitfield',
    subject: 'Science',
    focus: 'Elementary math & science',
    grades: 'Grades 3–8',
    rate: 45,
    rating: 4.8,
    bio: 'Friendly generalist for younger students who need a boost in math and science together.',
    emoji: '🧪',
    slots: ['Mon 5:00 PM', 'Wed 3:00 PM', 'Sat 2:00 PM'],
  },
]

export const subjects = ['All', 'Math', 'Science', 'Reading']
