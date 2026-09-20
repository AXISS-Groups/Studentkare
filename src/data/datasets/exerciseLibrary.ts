import { PARQ_QUESTIONS, evaluateScreening } from '../../ai/wellbeing/screening';

export type ExerciseCategory = 'mobility' | 'strength' | 'balance' | 'cardio' | 'breathing';
export type ExerciseEquipment = 'none' | 'chair' | 'wall';
export type ExercisePose = 'seated' | 'open' | 'march' | 'ankle' | 'stand' | 'wall' | 'calf' | 'stretch' | 'side' | 'balance' | 'walk' | 'breathe';

export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  equipment: ExerciseEquipment;
  pose: ExercisePose;
  focus: string;
  description: string;
  steps: string[];
  cue: string;
  adaptation: string;
  source: { title: string; url: string };
}

const sitting = { title: 'NHS · Sitting exercises', url: 'https://www.nhs.uk/live-well/exercise/sitting-exercises/' };
const strength = { title: 'NHS · Strength exercises', url: 'https://www.nhs.uk/live-well/exercise/strength-exercises/' };
const flexibility = { title: 'NHS · Flexibility exercises', url: 'https://www.nhs.uk/live-well/exercise/flexibility-exercises/' };
const balance = { title: 'NHS · Balance exercises', url: 'https://www.nhs.uk/live-well/exercise/balance-exercises/' };

export const exerciseCategories: { id: ExerciseCategory; label: string; color: string; background: string }[] = [
  { id: 'mobility', label: 'Mobility', color: '#8b75b6', background: '#eee8f7' },
  { id: 'strength', label: 'Strength', color: '#b47c64', background: '#f6e9df' },
  { id: 'balance', label: 'Balance', color: '#648c78', background: '#e5f0e8' },
  { id: 'cardio', label: 'Walking', color: '#638f9e', background: '#e6f0f3' },
  { id: 'breathing', label: 'Breathing', color: '#9b7b9b', background: '#f1e8f1' },
];

// Source-linked educational summaries, not individually prescribed exercise plans.
export const exercises: Exercise[] = [
  { id: 'neck', name: 'Gentle neck rotation', category: 'mobility', equipment: 'chair', pose: 'seated', focus: 'Neck & upper body', description: 'A small, unhurried movement for a break from your screen.', steps: ['Sit upright on a stable chair with feet on the floor and shoulders relaxed.', 'Slowly turn your head to one side, only as far as comfortable.', 'Return to the centre, then gently explore the other side.'], cue: 'Keep the movement small. Do not force or roll your neck.', adaptation: 'Reduce the turn or simply rest in a comfortable upright position.', source: flexibility },
  { id: 'chest', name: 'Seated chest opener', category: 'mobility', equipment: 'chair', pose: 'open', focus: 'Chest & shoulders', description: 'Create a little space across the front of your shoulders.', steps: ['Sit upright, a little away from the back of a stable chair.', 'Ease your shoulders back and down, allowing your arms to open gently to the sides.', 'Lift the chest a little, then release without arching your lower back.'], cue: 'A comfortable stretch, never a sharp or pinching feeling.', adaptation: 'Keep your arms lower and use a smaller range.', source: sitting },
  { id: 'march', name: 'Seated hip marching', category: 'mobility', equipment: 'chair', pose: 'march', focus: 'Hips & coordination', description: 'Explore a controlled alternating movement while seated.', steps: ['Sit tall on a stable chair, holding the sides for support.', 'Lift one bent knee only as far as feels comfortable.', 'Lower your foot with control and alternate sides.'], cue: 'Stay upright rather than leaning back to lift your leg.', adaptation: 'Lift the foot just slightly or take a seated rest.', source: sitting },
  { id: 'ankles', name: 'Seated ankle movement', category: 'mobility', equipment: 'chair', pose: 'ankle', focus: 'Ankles & lower legs', description: 'A gentle point-and-flex movement for your feet.', steps: ['Sit securely and hold the sides of a stable chair.', 'Extend one leg comfortably, keeping the foot just clear of the floor.', 'Point the toes gently away, then bring them back. Relax and change sides.'], cue: 'Move through the ankle without locking your knee.', adaptation: 'Keep the heel supported and make a smaller movement.', source: sitting },
  { id: 'sit-stand', name: 'Sit to stand', category: 'strength', equipment: 'chair', pose: 'stand', focus: 'Legs & everyday strength', description: 'Practise the familiar movement of getting up from a chair.', steps: ['Sit near the front of a solid chair with feet hip-width apart.', 'Lean slightly forward and rise slowly, keeping your eyes forward.', 'Stand comfortably, then lower back to the chair with control.'], cue: 'Make sure the chair cannot slide. Avoid dropping into the seat.', adaptation: 'Use your hands for support if needed; ask a professional if rising is difficult.', source: strength },
  { id: 'wall-press', name: 'Standing wall press', category: 'strength', equipment: 'wall', pose: 'wall', focus: 'Arms & upper body', description: 'An upright, supported introduction to pressing movements.', steps: ['Face a clear wall and place your palms against it around chest height.', 'Keep your back comfortable and bend your elbows slowly towards the wall.', 'Gently press back to your starting position.'], cue: 'Keep elbows near your sides and breathe naturally.', adaptation: 'Stand closer to the wall and use a shorter range.', source: strength },
  { id: 'calf-raise', name: 'Supported calf raise', category: 'strength', equipment: 'chair', pose: 'calf', focus: 'Calves & lower legs', description: 'A slow rise through your feet, with a stable support nearby.', steps: ['Stand behind a stable chair and rest your hands on the back.', 'Slowly lift your heels as far as comfortable.', 'Lower the heels gently and pause before repeating.'], cue: 'Keep the movement controlled; do not bounce.', adaptation: 'Use a smaller lift and keep both hands on the chair.', source: strength },
  { id: 'calf-stretch', name: 'Wall-supported calf stretch', category: 'mobility', equipment: 'wall', pose: 'stretch', focus: 'Calves & ankle mobility', description: 'Explore a gentle stretch with a wall for support.', steps: ['Place your hands against a wall and step one foot behind you.', 'Bend the front knee slightly while keeping the back heel on the floor.', 'Stay within a comfortable stretch, release, and swap sides.'], cue: 'Point your feet forward and avoid forcing your heel down.', adaptation: 'Shorten the stance and bend less deeply.', source: flexibility },
  { id: 'side-step', name: 'Sideways stepping', category: 'balance', equipment: 'wall', pose: 'side', focus: 'Balance & coordination', description: 'Take small, deliberate steps with support within reach.', steps: ['Stand near a wall or stable support with knees relaxed.', 'Take a small sideways step, then bring the other foot towards it.', 'Move slowly in the other direction, keeping your feet uncrossed.'], cue: 'Keep the floor clear and use the wall if you need support.', adaptation: 'Make the steps smaller and keep a hand on the support.', source: balance },
  { id: 'heel-toe', name: 'Supported heel-to-toe walk', category: 'balance', equipment: 'wall', pose: 'balance', focus: 'Steadiness & coordination', description: 'A deliberate walking pattern near a stable support.', steps: ['Stand upright beside a wall you can reach comfortably.', 'Place one heel just in front of the other foot’s toes.', 'Continue slowly, using your support as needed.'], cue: 'Look ahead and stop if you feel unsteady.', adaptation: 'Leave more space between your feet or choose ordinary supported walking.', source: balance },
  { id: 'walk', name: 'Easy walking break', category: 'cardio', equipment: 'none', pose: 'walk', focus: 'Everyday movement', description: 'A little change of scenery, at a pace that suits you.', steps: ['Choose a clear, even route and comfortable footwear.', 'Start at an easy pace with relaxed shoulders.', 'Keep breathing comfortably and slow down gradually before stopping.'], cue: 'Your pace is your choice. You should be able to speak comfortably.', adaptation: 'Use a shorter indoor route, or rest whenever you need.', source: { title: 'NHS · Walking for health', url: 'https://www.nhs.uk/live-well/exercise/walking-for-health/' } },
  { id: 'breathe', name: 'Comfortable breathing', category: 'breathing', equipment: 'none', pose: 'breathe', focus: 'A quieter moment', description: 'Settle into a comfortable position and let your breathing soften.', steps: ['Sit or lie comfortably, loosening restrictive clothing if needed.', 'Let the breath come in gently through your nose and out through your mouth.', 'Keep a comfortable rhythm without forcing a deep breath or holding it.'], cue: 'Breathe naturally. Stop the exercise if it makes you light-headed.', adaptation: 'Skip any counting and simply notice your ordinary breathing.', source: { title: 'NHS · Breathing exercises for stress', url: 'https://www.nhs.uk/mental-health/self-help/guides-tools-and-activities/breathing-exercises-for-stress/' } },
];

export interface ExerciseRoutine {
  id: string;
  name: string;
  description: string;
  category: ExerciseCategory;
  pose: ExercisePose;
  steps: { exerciseId: string; seconds: number; label: string }[];
}

export const routines: ExerciseRoutine[] = [
  { id: 'desk-reset', name: 'The desk-side reset', description: 'A seated pause between study sessions.', category: 'mobility', pose: 'open', steps: [
    { exerciseId: 'breathe', seconds: 30, label: 'Settle in' },
    { exerciseId: 'neck', seconds: 60, label: 'Explore a gentle turn' },
    { exerciseId: 'ankles', seconds: 60, label: 'Move your ankles' },
    { exerciseId: 'breathe', seconds: 30, label: 'A quiet finish' },
  ] },
  { id: 'steady-start', name: 'A steadier start', description: 'Explore simple movements with support.', category: 'strength', pose: 'stand', steps: [
    { exerciseId: 'walk', seconds: 60, label: 'Begin at an easy pace' },
    { exerciseId: 'sit-stand', seconds: 60, label: 'Move with control' },
    { exerciseId: 'calf-raise', seconds: 60, label: 'Keep your support close' },
    { exerciseId: 'walk', seconds: 60, label: 'Slow things down' },
  ] },
  { id: 'unwind', name: 'Room to unwind', description: 'Make a little space at the end of your day.', category: 'breathing', pose: 'breathe', steps: [
    { exerciseId: 'breathe', seconds: 60, label: 'Find a comfortable rhythm' },
    { exerciseId: 'chest', seconds: 60, label: 'Open gently' },
    { exerciseId: 'neck', seconds: 60, label: 'Ease into a smaller movement' },
    { exerciseId: 'breathe', seconds: 60, label: 'Finish in your own time' },
  ] },
];

export function filterExercises({ query = '', category = 'all', equipment = 'all', savedOnly = false, savedIds = [] }: {
  query?: string; category?: ExerciseCategory | 'all'; equipment?: ExerciseEquipment | 'all'; savedOnly?: boolean; savedIds?: string[];
} = {}) {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return exercises.filter(item => terms.every(term => `${item.name} ${item.focus} ${item.equipment}`.toLowerCase().includes(term))
    && (category === 'all' || item.category === category)
    && (equipment === 'all' || item.equipment === equipment)
    && (!savedOnly || savedIds.includes(item.id)));
}

export function canStartExerciseSession(answers: Record<string, boolean>) {
  return PARQ_QUESTIONS.every((question: { id: string }) => typeof answers[question.id] === 'boolean')
    && !evaluateScreening(answers).blocksStructuredContent;
}

export const routineSeconds = (routine: ExerciseRoutine) => routine.steps.reduce((sum, step) => sum + step.seconds, 0);
