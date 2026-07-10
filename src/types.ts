export type Urgency = 'none' | 'low' | 'medium' | 'high';

export type MoodEmoji = '生气！' | '不开心' | '一般' | '开心' | '超级开心' | '';

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  order: number;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  date?: string; // YYYY-MM-DD (start date), optional
  endDate?: string; // YYYY-MM-DD (end date), optional to support cross-day
  time?: string; // HH:MM, optional
  scheduledWeek?: string; // YYYY-MM-DD of Monday of scheduled week, optional
  scheduledMonth?: string; // YYYY-MM of scheduled month, optional
  categoryId?: string; // undefined/empty means "待安排" (Unscheduled)
  subtasks: Subtask[];
  urgency: Urgency;
  repeat?: 'none' | 'daily' | 'weekly' | 'weekly-friday' | 'monthly';
  reminder?: 'none' | '5m' | '15m' | '1h' | '1d';
  completedDates?: string[]; // list of completed dates for recurring tasks
  order: number; // For manual ordering within custom lists/categories
}

export interface Category {
  id: string;
  name: string;
  color: string; // TailWind color class, e.g., 'blue', 'purple', 'orange', 'red', 'green', 'neutral'
  colorHex: string; // Hex representation, e.g., '#3b82f6'
  order: number;
  visible: boolean; // Controlling category tasks visibility in calendar
}

export interface Note {
  id: string;
  content: string;
  date: string; // YYYY-MM-DD
  order: number;
  visible: boolean;
}

export interface Mood {
  date: string; // YYYY-MM-DD (also acts as ID since there's one mood per day)
  emoji: MoodEmoji;
  text: string;
  visible: boolean;
}

export interface PlannerState {
  schemaVersion: 1;
  categories: Category[];
  tasks: Task[];
  notes: Note[];
  moods: Mood[];
  userName: string;
  userAvatar: string;
}
