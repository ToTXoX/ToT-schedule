import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Category, Task, Subtask, Urgency, Note, Mood, MoodEmoji 
} from '../types';
import { 
  Calendar, ChevronLeft, ChevronRight, CheckSquare, Square, Eye, EyeOff,
  Plus, Trash2, Edit2, GripVertical, Smile, Frown, Flame, Heart, Meh,
  AlertTriangle, ArrowUp, ArrowDown, MoveRight, X, Trash, Clock, Bell, Repeat,
  Check, Eraser
} from '../icons';
import PlannerDatePicker from './PlannerDatePicker';
import Select from './Select';

interface CalendarSectionProps {
  categories: Category[];
  tasks: Task[];
  notes: Note[];
  moods: Mood[];
  currentDateStr: string; // "2026-07-06"
  onAddTask: (title: string, categoryId?: string, initialData?: Partial<Task>) => void;
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onDeleteTask: (id: string) => void;
  onUpdateCategory: (id: string, updates: Partial<Category>) => void;
  onUpdateCategories?: (batch: { id: string; updates: Partial<Category> }[]) => void;
  // Notes
  onAddNote: (content: string, date: string) => void;
  onUpdateNote: (id: string, updates: Partial<Note>) => void;
  onDeleteNote: (id: string) => void;
  onReorderNotes: (notes: Note[]) => void;
  // Moods
  onUpdateMood: (date: string, emoji: MoodEmoji, text: string) => void;
}

type ViewMode = 'three-day' | 'week' | 'month';

interface TaskDragPayload {
  taskId: string;
  sourceDate: string;
  sourceIndex: number;
}

type TaskDropPosition = 'before' | 'after';
type TaskDragSurface = 'calendar' | 'context';

interface TaskDropIndicator {
  taskId: string;
  position: TaskDropPosition;
}

const getRealTodayStr = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getNotionColorStyles = (colorHex: string, isCompleted: boolean) => {
  if (isCompleted) {
    return {
      background: 'rgba(241, 241, 239, 0.55)',
      border: '1px solid rgba(220, 220, 218, 0.7)',
      color: 'rgba(55, 53, 47, 0.45)',
    };
  }

  const hex = colorHex.toLowerCase();

  // Map hex values of categories to matching Notion pastel colors:
  // Work: #4cc9f0 (cyan/light-blue) -> Notion Blue or Notion Cyan
  if (hex.includes('4cc9f0') || hex.includes('blue') || hex.includes('3b82f6') || hex.includes('06b6d4')) {
    return {
      background: 'rgba(232, 242, 248, 0.95)',
      border: '1px solid rgba(189, 217, 235, 0.9)',
      color: '#0b6e9f',
    };
  }
  // Study: #b388ff (purple) -> Notion Purple
  if (hex.includes('b388ff') || hex.includes('purple') || hex.includes('8b5cf6') || hex.includes('a855f7')) {
    return {
      background: 'rgba(245, 238, 248, 0.95)',
      border: '1px solid rgba(224, 204, 234, 0.9)',
      color: '#5a2a7a',
    };
  }
  // Life: #52b788 (green) -> Notion Green
  if (hex.includes('52b788') || hex.includes('green') || hex.includes('10b981') || hex.includes('22c55e')) {
    return {
      background: 'rgba(237, 243, 235, 0.95)',
      border: '1px solid rgba(202, 224, 196, 0.9)',
      color: '#2b5e3f',
    };
  }
  // Fitness: #ffb5a7 (coral/orange) -> Notion Pink or Notion Red
  if (hex.includes('ffb5a7') || hex.includes('orange') || hex.includes('pink') || hex.includes('f97316') || hex.includes('ec4899') || hex.includes('ff758f')) {
    return {
      background: 'rgba(253, 235, 236, 0.95)',
      border: '1px solid rgba(248, 199, 201, 0.9)',
      color: '#8e2a2a',
    };
  }

  // General programmatic fallback for other colors:
  return {
    background: `${colorHex}15`,
    border: `1px solid ${colorHex}35`,
    color: colorHex,
  };
};

const getCategoryBadgeStyles = (category?: Category) => {
  const color = category?.colorHex || '#737373';
  return {
    color,
    borderColor: category ? `${color}35` : '#e5e5e5',
    backgroundColor: category ? `${color}12` : '#f5f5f5',
  };
};

const MOOD_OPTIONS: { emoji: MoodEmoji; char: string; label: string; color: string; hoverColor: string }[] = [
  { emoji: '超级开心', char: '🤩', label: '超级开心', color: 'text-pink-600 bg-pink-100 border-pink-300', hoverColor: 'hover:bg-pink-200' },
  { emoji: '开心', char: '😊', label: '开心', color: 'text-green-700 bg-green-100 border-green-300', hoverColor: 'hover:bg-green-200' },
  { emoji: '一般', char: '😐', label: '一般', color: 'text-blue-700 bg-blue-100 border-blue-300', hoverColor: 'hover:bg-blue-200' },
  { emoji: '不开心', char: '🙁', label: '不开心', color: 'text-indigo-700 bg-indigo-100 border-indigo-300', hoverColor: 'hover:bg-indigo-200' },
  { emoji: '生气！', char: '😡', label: '生气！', color: 'text-red-700 bg-red-100 border-red-300', hoverColor: 'hover:bg-red-200' },
];

const getMoodChar = (emoji: MoodEmoji) =>
  MOOD_OPTIONS.find(option => option.emoji === emoji)?.char;

export default function CalendarSection({
  categories,
  tasks,
  notes,
  moods,
  currentDateStr,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onUpdateCategory,
  onUpdateCategories,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  onReorderNotes,
  onUpdateMood
}: CalendarSectionProps) {
  // Calendar View State
  const [viewMode, setViewMode] = useState<ViewMode>('three-day');
  const [baseDate, setBaseDate] = useState<Date>(new Date(getRealTodayStr()));
  const [selectedDateStr, setSelectedDateStr] = useState<string>(getRealTodayStr());

  React.useEffect(() => {
    setSelectedDateStr(currentDateStr);
  }, [currentDateStr]);

  // Sidebars Visibility Toggles (Persistent via state)
  const [showNotesSection, setShowNotesSection] = useState(true);
  const [showMoodSection, setShowMoodSection] = useState(true);
  const [moodVisibilityByView, setMoodVisibilityByView] = useState<Record<ViewMode, boolean>>(() => {
    const defaults: Record<ViewMode, boolean> = { 'three-day': true, week: true, month: true };
    try {
      const saved = localStorage.getItem('planner_mood_visibility_by_view');
      return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
    } catch {
      return defaults;
    }
  });
  const showMoodEmojis = moodVisibilityByView[viewMode];

  useEffect(() => {
    localStorage.setItem('planner_mood_visibility_by_view', JSON.stringify(moodVisibilityByView));
  }, [moodVisibilityByView]);

  const toggleMoodVisibility = () => {
    setMoodVisibilityByView(previous => ({
      ...previous,
      [viewMode]: !previous[viewMode],
    }));
  };
  const [uncategorizedVisible, setUncategorizedVisible] = useState<boolean>(() => {
    const saved = localStorage.getItem('planner_uncategorized_visible');
    return saved !== 'false'; // default to true
  });

  const toggleUncategorizedVisible = () => {
    setUncategorizedVisible(prev => {
      const next = !prev;
      localStorage.setItem('planner_uncategorized_visible', String(next));
      return next;
    });
  };

  const handleSelectAllFilters = () => {
    if (onUpdateCategories) {
      const batch = categories.map(cat => ({ id: cat.id, updates: { visible: true } }));
      onUpdateCategories(batch);
    } else {
      categories.forEach(cat => {
        onUpdateCategory(cat.id, { visible: true });
      });
    }
    setUncategorizedVisible(true);
    localStorage.setItem('planner_uncategorized_visible', 'true');
  };

  const handleClearAllFilters = () => {
    if (onUpdateCategories) {
      const batch = categories.map(cat => ({ id: cat.id, updates: { visible: false } }));
      onUpdateCategories(batch);
    } else {
      categories.forEach(cat => {
        onUpdateCategory(cat.id, { visible: false });
      });
    }
    setUncategorizedVisible(false);
    localStorage.setItem('planner_uncategorized_visible', 'false');
  };

  // New Note State
  const [newNoteText, setNewNoteText] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteText, setEditNoteText] = useState('');

  // Editing Mood Text State
  const [isEditingTodayMoodText, setIsEditingTodayMoodText] = useState(false);
  const [todayMoodText, setTodayMoodText] = useState('');

  // Drag and drop notes state
  const [draggedNoteIndex, setDraggedNoteIndex] = useState<number | null>(null);

  // Active click-to-pick mood date state (Fixing monthly mood selection)
  const [activeMoodPickerDate, setActiveMoodPickerDate] = useState<string | null>(null);
  const [moodPickerPosition, setMoodPickerPosition] = useState<{ top: number; left: number } | null>(null);
  const moodPickerAnchorRef = useRef<HTMLButtonElement | null>(null);

  const updateMonthMoodPickerPosition = (button: HTMLButtonElement) => {
    const rect = button.getBoundingClientRect();
    const popupWidth = 268;
    const popupHeight = 52;
    const centeredLeft = rect.left + rect.width / 2 - popupWidth / 2;
    const left = Math.max(8, Math.min(centeredLeft, window.innerWidth - popupWidth - 8));
    const top = rect.bottom + popupHeight + 8 <= window.innerHeight
      ? rect.bottom + 6
      : rect.top - popupHeight - 6;
    setMoodPickerPosition({ top, left });
  };

  const toggleMonthMoodPicker = (dateStr: string, button: HTMLButtonElement) => {
    if (activeMoodPickerDate === dateStr) {
      setActiveMoodPickerDate(null);
      setMoodPickerPosition(null);
      moodPickerAnchorRef.current = null;
      return;
    }

    moodPickerAnchorRef.current = button;
    updateMonthMoodPickerPosition(button);
    setActiveMoodPickerDate(dateStr);
  };

  useEffect(() => {
    if (!activeMoodPickerDate) return;
    const reposition = () => {
      if (moodPickerAnchorRef.current?.isConnected) {
        updateMonthMoodPickerPosition(moodPickerAnchorRef.current);
      }
    };
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [activeMoodPickerDate]);

  // Editing Task details modal state (Fixing click to edit in calendar)
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState('');
  const [editTaskDesc, setEditTaskDesc] = useState('');
  const [editTaskDate, setEditTaskDate] = useState('');
  const [editTaskEndDate, setEditTaskEndDate] = useState('');
  const [editTaskTime, setEditTaskTime] = useState('');
  const [editTaskUrgency, setEditTaskUrgency] = useState<Urgency>('none');
  const [editTaskCatId, setEditTaskCatId] = useState('');
  const [editTaskRepeat, setEditTaskRepeat] = useState<'none' | 'daily' | 'weekly' | 'weekly-friday' | 'monthly'>('none');
  const [editTaskReminder, setEditTaskReminder] = useState<'none' | '5m' | '15m' | '1h' | '1d'>('none');
  const [editTaskScheduleType, setEditTaskScheduleType] = useState<'date' | 'week' | 'month' | 'none'>('date');
  const [editTaskScheduledWeek, setEditTaskScheduledWeek] = useState('');
  const [editTaskScheduledMonth, setEditTaskScheduledMonth] = useState('');
  const [isWeekFocused, setIsWeekFocused] = useState(false);
  const [isMonthFocused, setIsMonthFocused] = useState(false);
  const [editTaskSubtasks, setEditTaskSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editSubtaskTitle, setEditSubtaskTitle] = useState('');
  const [draggedSubIndex, setDraggedSubIndex] = useState<number | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<'basic' | 'content'>('basic');

  // Quick Add Task inline form state (Fixing support adding tasks in calendar view)
  const [quickAddTaskDate, setQuickAddTaskDate] = useState<string | null>(null);
  const [quickAddUnscheduledWeek, setQuickAddUnscheduledWeek] = useState<string | null>(null);
  const [quickAddUnscheduledMonth, setQuickAddUnscheduledMonth] = useState<string | null>(null);
  const [quickAddTaskTitle, setQuickAddTaskTitle] = useState('');
  const [quickAddTaskCatId, setQuickAddTaskCatId] = useState('');

  // Drag-resize state for multi-day tasks
  const [resizingTask, setResizingTask] = useState<{ id: string; edge: 'start' | 'end'; deltaDays: number } | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [taskDragSurface, setTaskDragSurface] = useState<TaskDragSurface | null>(null);
  const [taskDropIndicator, setTaskDropIndicator] = useState<TaskDropIndicator | null>(null);
  const draggedTaskRef = useRef<TaskDragPayload | null>(null);

  const todayStr = getRealTodayStr();

  // Draggable floating trash window state
  const [trashPosition, setTrashPosition] = useState<{ x: number; y: number }>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('planner_trash_position');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          // ignore
        }
      }
    }
    return { x: 100, y: 500 };
  });
  const [isDraggingTrash, setIsDraggingTrash] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const justResizedRef = useRef(false);
  const filterContainerRef = useRef<HTMLDivElement>(null);
  const calendarGridRef = useRef<HTMLDivElement>(null);
  const [gridHeight, setGridHeight] = useState<number>(500);
  const [isLargeScreen, setIsLargeScreen] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    setIsLargeScreen(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setIsLargeScreen(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (!calendarGridRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        if (entry.contentRect.height) {
          setGridHeight(entry.contentRect.height);
        }
      }
    });
    observer.observe(calendarGridRef.current);
    return () => observer.disconnect();
  }, [viewMode]);

  const handleTrashMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    setIsDraggingTrash(true);
    dragStartPos.current = {
      x: e.clientX - trashPosition.x,
      y: e.clientY - trashPosition.y
    };
    e.preventDefault();
  };

  useEffect(() => {
    if (!isDraggingTrash) return;

    const handleMouseMove = (e: MouseEvent) => {
      setTrashPosition({
        x: e.clientX - dragStartPos.current.x,
        y: e.clientY - dragStartPos.current.y
      });
    };

    const handleMouseUp = () => {
      setIsDraggingTrash(false);
      setTrashPosition((curr) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('planner_trash_position', JSON.stringify(curr));
        }
        return curr;
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingTrash]);

  useEffect(() => {
    // If we already have a cached trash position, do not run default positioning
    if (typeof window !== 'undefined' && localStorage.getItem('planner_trash_position')) {
      return;
    }

    const positionTrash = () => {
      if (filterContainerRef.current) {
        const rect = filterContainerRef.current.getBoundingClientRect();
        setTrashPosition({
          x: Math.max(20, rect.right - 90),
          y: rect.bottom + 8
        });
      } else if (typeof window !== 'undefined') {
        setTrashPosition({
          x: window.innerWidth - 240,
          y: 180
        });
      }
    };

    positionTrash();
    const timer = setTimeout(positionTrash, 300);
    return () => clearTimeout(timer);
  }, []);

  // Helper: Format Date object to YYYY-MM-DD
  const formatDate = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getMondayOfWeek = (offsetWeeks: number = 0): Date => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1) + (offsetWeeks * 7);
    return new Date(today.getFullYear(), today.getMonth(), diff);
  };

  const getYearMonthStr = (offsetMonths: number = 0): string => {
    const today = new Date();
    const d = new Date(today.getFullYear(), today.getMonth() + offsetMonths, 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  const getWeekNumber = (d: Date): number => {
    const date = new Date(d.getTime());
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    const week1 = new Date(date.getFullYear(), 0, 4);
    return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000
                          - 3 + (week1.getDay() + 6) % 7) / 7);
  };

  const getWeekOptionLabel = (dateStr: string): string => {
    if (!dateStr) return '';
    const monday = new Date(dateStr);
    if (isNaN(monday.getTime())) return dateStr;
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    const todayMonday = getMondayOfWeek(0);
    const todayMondayStr = formatDate(todayMonday);
    const nextMondayStr = formatDate(getMondayOfWeek(1));
    const lastMondayStr = formatDate(getMondayOfWeek(-1));
    const nextNextMondayStr = formatDate(getMondayOfWeek(2));

    const mStr = String(monday.getMonth() + 1).padStart(2, '0') + '-' + String(monday.getDate()).padStart(2, '0');
    const sStr = String(sunday.getMonth() + 1).padStart(2, '0') + '-' + String(sunday.getDate()).padStart(2, '0');

    if (dateStr === todayMondayStr) {
      return `本周 (${mStr} ~ ${sStr})`;
    } else if (dateStr === nextMondayStr) {
      return `下周 (${mStr} ~ ${sStr})`;
    } else if (dateStr === lastMondayStr) {
      return `上周 (${mStr} ~ ${sStr})`;
    } else if (dateStr === nextNextMondayStr) {
      return `下下周 (${mStr} ~ ${sStr})`;
    }
    
    return `${monday.getFullYear()}年第${getWeekNumber(monday)}周 (${mStr} 起)`;
  };

  const getMonthOptionLabel = (monthStr: string, offset: number): string => {
    const parts = monthStr.split('-');
    const year = parts[0];
    const month = parseInt(parts[1], 10);
    
    if (offset === 0) {
      return `本月 (${year}年${month}月)`;
    } else if (offset === 1) {
      return `下月 (${year}年${month}月)`;
    } else if (offset === -1) {
      return `上月 (${year}年${month}月)`;
    } else if (offset === 2) {
      return `下下月 (${year}年${month}月)`;
    }
    
    return `${year}年${month}月`;
  };

  // Helper: check if a week (by Monday string YYYY-MM-DD) has any days within a specific month YYYY-MM
  const isWeekInMonth = (weekStartStr: string, yearMonth: string): boolean => {
    if (!weekStartStr) return false;
    const d = new Date(weekStartStr);
    if (isNaN(d.getTime())) return false;
    
    // Check start of week and end of week (6 days later)
    const dEnd = new Date(d);
    dEnd.setDate(d.getDate() + 6);
    
    const dStartYearMonth = weekStartStr.substring(0, 7);
    const dEndYearMonth = formatDate(dEnd).substring(0, 7);
    
    return dStartYearMonth === yearMonth || dEndYearMonth === yearMonth;
  };

  const getDayName = (d: Date): string => {
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return days[d.getDay()];
  };

  // Helper to adjust baseline date by days
  const adjustBaseDate = (days: number) => {
    const next = new Date(baseDate);
    next.setDate(next.getDate() + days);
    setBaseDate(next);
  };

  // Get active categories list (ids)
  const visibleCategoryIds = categories
    .filter(c => c.visible !== false)
    .map(c => c.id);

  // Helper: check if a task occurs on a given date (supporting cross-day duration & optimized recurrence settings)
  const isTaskOnDay = (task: Task, dateStr: string): boolean => {
    if (!task.date) return false;
    
    // Recurrence events can only start on or after task.date
    if (dateStr < task.date) return false;

    // Direct starting date match
    if (task.date === dateStr) return true;

    // Recurrence evaluation
    if (task.repeat && task.repeat !== 'none') {
      const taskDateObj = new Date(task.date);
      const targetDateObj = new Date(dateStr);
      
      if (task.repeat === 'daily') {
        return true;
      }
      if (task.repeat === 'weekly') {
        return targetDateObj.getDay() === taskDateObj.getDay();
      }
      if (task.repeat === 'weekly-friday') {
        return targetDateObj.getDay() === 5; // 5 is Friday
      }
      if (task.repeat === 'monthly') {
        return targetDateObj.getDate() === taskDateObj.getDate();
      }
    }

    // Standard cross-day date range match
    if (!task.endDate) return task.date === dateStr;
    return dateStr >= task.date && dateStr <= task.endDate;
  };

  // Helper to determine if a task is completed on a specific day
  const isTaskCompletedOnDay = (task: Task, dateStr: string): boolean => {
    if (task.repeat && task.repeat !== 'none') {
      return !!task.completedDates && task.completedDates.includes(dateStr);
    }
    return task.completed;
  };

  // Toggle completion of task on a specific day
  const toggleTaskCompletionOnDay = (task: Task, dateStr: string) => {
    if (task.repeat && task.repeat !== 'none') {
      const completedDates = task.completedDates ? [...task.completedDates] : [];
      if (completedDates.includes(dateStr)) {
        onUpdateTask(task.id, {
          completedDates: completedDates.filter(d => d !== dateStr)
        });
      } else {
        onUpdateTask(task.id, {
          completedDates: [...completedDates, dateStr]
        });
      }
    } else {
      onUpdateTask(task.id, { completed: !task.completed });
    }
  };

  // Helper: check if task is a multi-day / cross-day task, supporting resizing simulation
  const isMultiDay = (task: Task): boolean => {
    return !!task.date;
  };

  const isMultiDayForRender = (task: Task): boolean => {
    return !!task.date && (!task.repeat || task.repeat === 'none');
  };

  const getTaskRenderRange = (task: Task) => {
    let start = task.date || '';
    let end = task.endDate || task.date || '';
    if (resizingTask?.id === task.id) {
      if (resizingTask.edge === 'start') {
        const date = new Date(start);
        date.setDate(date.getDate() + resizingTask.deltaDays);
        start = formatDate(date);
        if (start > end) start = end;
      } else {
        const date = new Date(end);
        date.setDate(date.getDate() + resizingTask.deltaDays);
        end = formatDate(date);
        if (end < start) end = start;
      }
    }
    return { start, end };
  };

  const getActiveMultiDayTasks = (activeDates: string[]) => {
    return visibleTasks.filter(task => {
      if (!isMultiDayForRender(task)) return false;
      const range = getTaskRenderRange(task);
      return activeDates.some(date => date >= range.start && date <= range.end);
    });
  };

  const layoutMultiDayTasks = (activeTasks: Task[], activeDates: string[]) => {
    const rows: Task[][] = [];
    const sorted = [...activeTasks].sort((a, b) => {
      const rangeA = getTaskRenderRange(a);
      const rangeB = getTaskRenderRange(b);
      const startA = rangeA.start;
      const endA = rangeA.end;
      const startB = rangeB.start;
      const endB = rangeB.end;

      if (startA !== startB) return startA.localeCompare(startB);
      if (a.order !== b.order) return a.order - b.order;
      const durA = new Date(endA).getTime() - new Date(startA).getTime();
      const durB = new Date(endB).getTime() - new Date(startB).getTime();
      return durB - durA;
    });

    sorted.forEach(task => {
      let rowPlaced = false;
      for (let r = 0; r < rows.length; r++) {
        const overlaps = rows[r].some(existing => {
          const taskRange = getTaskRenderRange(task);
          const existingRange = getTaskRenderRange(existing);
          return taskRange.start <= existingRange.end && taskRange.end >= existingRange.start;
        });
        if (!overlaps) {
          rows[r].push(task);
          rowPlaced = true;
          break;
        }
      }
      if (!rowPlaced) {
        rows.push([task]);
      }
    });

    return rows;
  };

  // Filter tasks that belong to visible categories or have no category (待安排)
  const visibleTasks = tasks.filter(task => {
    if (!task.categoryId) return uncategorizedVisible;
    return visibleCategoryIds.includes(task.categoryId);
  });

  // Fetch mood helper
  const getMoodForDate = (dateStr: string): Mood => {
    const m = moods.find(x => x.date === dateStr);
    return m || { date: dateStr, emoji: '', text: '', visible: true };
  };

  // --- HTML5 Drag & Drop scheduling for Tasks ---
  const handleTaskDragStart = (e: React.DragEvent, taskId: string, srcDate: string, index: number, surface: TaskDragSurface = 'calendar') => {
    const payload: TaskDragPayload = { taskId, sourceDate: srcDate, sourceIndex: index };
    draggedTaskRef.current = payload;
    setDraggedTaskId(taskId);
    setTaskDragSurface(surface);
    setTaskDropIndicator(null);

    const serializedPayload = JSON.stringify(payload);
    e.dataTransfer.setData('application/x-tot-task', serializedPayload);
    e.dataTransfer.setData('text/plain', serializedPayload);
    e.dataTransfer.effectAllowed = 'move';

    // WebView's default drag preview loses the card's rounded clipping. Draw a
    // dedicated rounded preview so the drag feedback stays visible without the
    // native square outline.
    if (surface === 'context') {
      const task = tasks.find(item => item.id === taskId);
      const category = categories.find(item => item.id === task?.categoryId);
      const cssWidth = Math.min(320, Math.max(220, e.currentTarget.getBoundingClientRect().width));
      const cssHeight = 58;
      const pixelRatio = Math.max(1, window.devicePixelRatio || 1);
      const canvas = document.createElement('canvas');
      canvas.width = cssWidth * pixelRatio;
      canvas.height = cssHeight * pixelRatio;
      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${cssHeight}px`;
      canvas.setAttribute('aria-hidden', 'true');
      Object.assign(canvas.style, {
        position: 'fixed',
        top: '-1000px',
        left: '-1000px',
        pointerEvents: 'none',
      });
      document.body.appendChild(canvas);

      const context = canvas.getContext('2d');
      if (context) {
        context.scale(pixelRatio, pixelRatio);
        const x = 8;
        const y = 7;
        const width = cssWidth - 16;
        const height = 44;
        const radius = 12;
        context.beginPath();
        context.moveTo(x + radius, y);
        context.lineTo(x + width - radius, y);
        context.arcTo(x + width, y, x + width, y + radius, radius);
        context.lineTo(x + width, y + height - radius);
        context.arcTo(x + width, y + height, x + width - radius, y + height, radius);
        context.lineTo(x + radius, y + height);
        context.arcTo(x, y + height, x, y + height - radius, radius);
        context.lineTo(x, y + radius);
        context.arcTo(x, y, x + radius, y, radius);
        context.closePath();
        context.shadowColor = 'rgba(24, 32, 48, 0.18)';
        context.shadowBlur = 10;
        context.shadowOffsetY = 3;
        context.fillStyle = 'rgba(255, 255, 255, 0.98)';
        context.fill();
        context.shadowColor = 'transparent';

        context.beginPath();
        context.arc(25, cssHeight / 2, 4, 0, Math.PI * 2);
        context.fillStyle = category?.colorHex || '#9ca3af';
        context.fill();

        context.fillStyle = '#343a45';
        context.font = '600 12px Inter, -apple-system, BlinkMacSystemFont, sans-serif';
        context.textBaseline = 'middle';
        const title = task?.title || '日程';
        const maxTextWidth = cssWidth - 56;
        let previewTitle = title;
        while (previewTitle.length > 1 && context.measureText(previewTitle).width > maxTextWidth) {
          previewTitle = previewTitle.slice(0, -1);
        }
        if (previewTitle !== title) previewTitle = `${previewTitle}…`;
        context.fillText(previewTitle, 38, cssHeight / 2);
      }

      e.dataTransfer.setDragImage(canvas, 24, cssHeight / 2);
      window.setTimeout(() => canvas.remove(), 0);
    }
  };

  const clearTaskDragState = () => {
    draggedTaskRef.current = null;
    setDraggedTaskId(null);
    setTaskDragSurface(null);
    setTaskDropIndicator(null);
  };

  const handleTaskDragEnd = clearTaskDragState;

  const getTaskDragPayload = (e: React.DragEvent): TaskDragPayload | null => {
    const serializedPayload =
      e.dataTransfer.getData('application/x-tot-task') ||
      e.dataTransfer.getData('text/plain');

    if (serializedPayload) {
      try {
        const payload = JSON.parse(serializedPayload) as Partial<TaskDragPayload>;
        if (payload.taskId) {
          return {
            taskId: payload.taskId,
            sourceDate: payload.sourceDate || '',
            sourceIndex: Number.isFinite(payload.sourceIndex) ? Number(payload.sourceIndex) : 0,
          };
        }
      } catch {
        // Accept legacy/plain task IDs from older drag payloads.
        if (tasks.some(task => task.id === serializedPayload)) {
          return { taskId: serializedPayload, sourceDate: '', sourceIndex: 0 };
        }
      }
    }

    return draggedTaskRef.current;
  };

  const handleTaskDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Required to allow drop
    e.dataTransfer.dropEffect = 'move';
    setTaskDropIndicator(null);
  };

  const getPointerDropPosition = (e: React.DragEvent): TaskDropPosition => {
    const rect = e.currentTarget.getBoundingClientRect();
    return e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
  };

  const handleTaskItemDragOver = (e: React.DragEvent, targetTaskId: string) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';

    if (draggedTaskRef.current?.taskId === targetTaskId) {
      setTaskDropIndicator(null);
      return;
    }

    const nextIndicator = { taskId: targetTaskId, position: getPointerDropPosition(e) };
    setTaskDropIndicator(previous =>
      previous?.taskId === nextIndicator.taskId && previous.position === nextIndicator.position
        ? previous
        : nextIndicator
    );
  };

  const getInsertionOrder = (
    targetTask: Task,
    position: TaskDropPosition,
    candidateTasks: Task[],
    draggedId: string
  ) => {
    const orderedTasks = candidateTasks
      .filter(task => task.id !== draggedId)
      .sort((a, b) => a.order - b.order);
    const targetIndex = orderedTasks.findIndex(task => task.id === targetTask.id);
    if (targetIndex === -1) return targetTask.order;

    if (position === 'before') {
      const previousTask = orderedTasks[targetIndex - 1];
      return previousTask ? (previousTask.order + targetTask.order) / 2 : targetTask.order - 1;
    }

    const nextTask = orderedTasks[targetIndex + 1];
    return nextTask ? (targetTask.order + nextTask.order) / 2 : targetTask.order + 1;
  };

  const getTaskDropPosition = (taskId: string, surface: TaskDragSurface = 'calendar') =>
    taskDragSurface === surface && taskDropIndicator?.taskId === taskId
      ? taskDropIndicator.position
      : undefined;

  const getGanttPointerDate = (e: React.DragEvent, activeDates: string[]): string => {
    const target = e.target as HTMLElement;
    const ganttGrid = target.closest<HTMLElement>('[data-gantt-grid]') || e.currentTarget as HTMLElement;
    const rect = ganttGrid.getBoundingClientRect();
    if (!rect.width || activeDates.length === 0) return activeDates[0] || todayStr;
    const relativeX = Math.max(0, Math.min(e.clientX - rect.left, rect.width - 1));
    const columnIndex = Math.min(activeDates.length - 1, Math.floor(relativeX / (rect.width / activeDates.length)));
    return activeDates[columnIndex];
  };

  const handleTaskDropOnGanttBackground = (e: React.DragEvent, activeDates: string[]) => {
    e.preventDefault();
    e.stopPropagation();
    handleTaskDropOnDate(e, getGanttPointerDate(e, activeDates));
  };

  const handleTaskDropOnGanttItem = (
    e: React.DragEvent,
    targetTask: Task,
    activeDates: string[]
  ) => {
    e.preventDefault();
    e.stopPropagation();
    handleTaskDropOnTaskItem(e, targetTask, getGanttPointerDate(e, activeDates));
  };

  const handleTaskDropOnDate = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    const payload = getTaskDragPayload(e);
    clearTaskDragState();
    if (payload) {
      const { taskId } = payload;
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        const updates: Partial<Task> = { 
          date: dateStr,
          scheduledWeek: undefined,
          scheduledMonth: undefined
        };
        if (task.date && task.endDate) {
          const startD = new Date(task.date);
          const endD = new Date(task.endDate);
          const diffTime = endD.getTime() - startD.getTime();
          if (diffTime > 0) {
            const newStartD = new Date(dateStr);
            const newEndD = new Date(newStartD.getTime() + diffTime);
            updates.endDate = formatDate(newEndD);
          } else {
            updates.endDate = undefined;
          }
        } else if (task.endDate && task.endDate < dateStr) {
          updates.endDate = undefined;
        }
        onUpdateTask(taskId, updates);
      }
    }
  };

  const handleTaskDropOnTaskItem = (e: React.DragEvent, targetTask: Task, targetDateStr: string) => {
    e.preventDefault();
    e.stopPropagation();
    const position = getPointerDropPosition(e);
    const payload = getTaskDragPayload(e);
    clearTaskDragState();
    if (!payload || payload.taskId === targetTask.id) return;
    const { taskId } = payload;
    const targetDateTasks = tasks.filter(task => task.date === targetDateStr);
    const insertionOrder = getInsertionOrder(targetTask, position, targetDateTasks, taskId);

    if (payload.sourceDate === targetDateStr) {
      onUpdateTask(taskId, { order: insertionOrder });
    } else {
      // Move to a new day at the indicated position.
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        const updates: Partial<Task> = { 
          date: targetDateStr, 
          order: insertionOrder,
          scheduledWeek: undefined,
          scheduledMonth: undefined
        };
        if (task.date && task.endDate) {
          const startD = new Date(task.date);
          const endD = new Date(task.endDate);
          const diffTime = endD.getTime() - startD.getTime();
          if (diffTime > 0) {
            const newStartD = new Date(targetDateStr);
            const newEndD = new Date(newStartD.getTime() + diffTime);
            updates.endDate = formatDate(newEndD);
          } else {
            updates.endDate = undefined;
          }
        } else if (task.endDate && task.endDate < targetDateStr) {
          updates.endDate = undefined;
        }
        onUpdateTask(taskId, updates);
      }
    }
  };

  const handleTaskRemoveSchedule = (e: React.DragEvent) => {
    e.preventDefault();
    const payload = getTaskDragPayload(e);
    clearTaskDragState();
    if (payload) {
      const { taskId } = payload;
      onUpdateTask(taskId, { 
        date: undefined, 
        endDate: undefined, 
        time: undefined,
        scheduledWeek: undefined,
        scheduledMonth: undefined
      });
    }
  };

  // 1. --- THREE DAY VIEW DATES ---
  const getThreeDays = () => {
    const today = new Date(baseDate);
    
    const prevDay = new Date(today);
    prevDay.setDate(prevDay.getDate() - 1);
    
    const nextDay = new Date(today);
    nextDay.setDate(nextDay.getDate() + 1);

    const prevDateStr = formatDate(prevDay);
    const todayDateStr = formatDate(today);
    const nextDateStr = formatDate(nextDay);

    return [
      { label: prevDateStr === todayStr ? '今日' : '', dateObj: prevDay, dateStr: prevDateStr },
      { label: todayDateStr === todayStr ? '今日' : '', dateObj: today, dateStr: todayDateStr },
      { label: nextDateStr === todayStr ? '今日' : '', dateObj: nextDay, dateStr: nextDateStr }
    ];
  };

  // 2. --- WEEK VIEW DATES ---
  const getWeekDates = () => {
    const current = new Date(baseDate);
    const day = current.getDay();
    // Adjust to Monday
    const distance = day === 0 ? -6 : 1 - day;
    const monday = new Date(current);
    monday.setDate(monday.getDate() + distance);

    const week = [];
    for (let i = 0; i < 7; i++) {
      const next = new Date(monday);
      next.setDate(monday.getDate() + i);
      week.push({
        dateObj: next,
        dateStr: formatDate(next),
        dayName: getDayName(next),
        dayNum: next.getDate()
      });
    }
    return week;
  };

  // 3. --- MONTH VIEW DAYS ---
  const getMonthDates = () => {
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    
    // First day of month
    const firstDay = new Date(year, month, 1);
    // Find previous Monday or fill-in days
    const firstDayOfWeek = firstDay.getDay(); // 0 is Sunday, 1 is Monday...
    const fillCount = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

    const startCellDate = new Date(firstDay);
    startCellDate.setDate(firstDay.getDate() - fillCount);

    const monthDays = [];
    // Total 42 cells for full grid coverage
    for (let i = 0; i < 42; i++) {
      const cellDate = new Date(startCellDate);
      cellDate.setDate(startCellDate.getDate() + i);
      monthDays.push({
        dateObj: cellDate,
        dateStr: formatDate(cellDate),
        dayNum: cellDate.getDate(),
        isCurrentMonth: cellDate.getMonth() === month
      });
    }
    return monthDays;
  };

  // --- Quick adding a note ---
  const handleAddNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    onAddNote(newNoteText.trim(), selectedDateStr);
    setNewNoteText('');
  };

  const todayNotes = notes
    .filter(n => n.date === selectedDateStr)
    .sort((a, b) => a.order - b.order);

  const startEditNote = (note: Note) => {
    setEditingNoteId(note.id);
    setEditNoteText(note.content);
  };

  const saveNoteEdit = (id: string) => {
    if (!editNoteText.trim()) return;
    onUpdateNote(id, { content: editNoteText.trim() });
    setEditingNoteId(null);
  };

  // Drag and Drop sort notes
  const handleNoteDragStart = (e: React.DragEvent, idx: number) => {
    setDraggedNoteIndex(idx);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleNoteDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleNoteDrop = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (draggedNoteIndex === null || draggedNoteIndex === idx) return;
    const reordered = [...todayNotes];
    const [removed] = reordered.splice(draggedNoteIndex, 1);
    reordered.splice(idx, 0, removed);
    
    // Sync back to parents list
    const updatedNotes = notes.map(n => {
      if (n.date === selectedDateStr) {
        const foundIdx = reordered.findIndex(r => r.id === n.id);
        return { ...n, order: foundIdx !== -1 ? foundIdx : n.order };
      }
      return n;
    });
    onReorderNotes(updatedNotes);
    setDraggedNoteIndex(null);
  };

  // --- Mood handling ---
  const todayMood = getMoodForDate(selectedDateStr);

  const handleUpdateTodayMoodEmoji = (emoji: MoodEmoji) => {
    if (todayMood.emoji === emoji) {
      onUpdateMood(selectedDateStr, '', '');
      setTodayMoodText('');
      setIsEditingTodayMoodText(false);
      return;
    }
    onUpdateMood(selectedDateStr, emoji, todayMood.text);
  };

  const handleSaveTodayMoodText = () => {
    onUpdateMood(selectedDateStr, todayMood.emoji, todayMoodText);
    setIsEditingTodayMoodText(false);
  };

  // --- Filtered lists for Week/Month right sidebars ---
  const weekDates = getWeekDates();
  const startOfWeekStr = weekDates[0].dateStr;
  const endOfWeekStr = weekDates[6].dateStr;

  const thisWeekTasks = visibleTasks.filter(task => {
    if (task.scheduledWeek && task.scheduledWeek === startOfWeekStr) {
      return true;
    }
    if (!task.date) return false;
    return (task.date >= startOfWeekStr && task.date <= endOfWeekStr) ||
           (task.endDate && task.endDate >= startOfWeekStr && task.date <= endOfWeekStr);
  });

  const currentMonthYearStr = baseDate.toLocaleString('zh-CN', { year: 'numeric', month: 'long' });
  const startOfMonthStr = formatDate(new Date(baseDate.getFullYear(), baseDate.getMonth(), 1));
  const endOfMonthStr = formatDate(new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0));

  const thisMonthTasks = visibleTasks.filter(task => {
    const curYearMonth = startOfMonthStr.substring(0, 7);
    if (task.scheduledMonth && task.scheduledMonth === curYearMonth) {
      return true;
    }
    if (task.scheduledWeek && isWeekInMonth(task.scheduledWeek, curYearMonth)) {
      return true;
    }
    if (!task.date) return false;
    return (task.date >= startOfMonthStr && task.date <= endOfMonthStr) ||
           (task.endDate && task.endDate >= startOfMonthStr && task.date <= endOfMonthStr);
  });

  // --- Handlers for Unscheduled Task List Sorting and Clear Scheduling ---
  const handleUnscheduledTaskDropOnTask = (e: React.DragEvent, targetTask: Task, view: 'week' | 'month') => {
    e.preventDefault();
    e.stopPropagation();
    const position = getPointerDropPosition(e);
    const payload = getTaskDragPayload(e);
    clearTaskDragState();
    if (!payload || payload.taskId === targetTask.id) return;
    const { taskId } = payload;

    const draggedTask = tasks.find(t => t.id === taskId);
    if (!draggedTask) return;

    const curYearMonth = startOfMonthStr.substring(0, 7);
    const isInSameUnscheduledList = 
      (view === 'week' && !draggedTask.date && draggedTask.scheduledWeek === startOfWeekStr) ||
      (view === 'month' && !draggedTask.date && draggedTask.scheduledMonth === curYearMonth);
    const unscheduledTasks = view === 'week'
      ? thisWeekTasks.filter(task => !task.date)
      : thisMonthTasks.filter(task => !task.date);
    const insertionOrder = getInsertionOrder(targetTask, position, unscheduledTasks, taskId);

    if (isInSameUnscheduledList) {
      onUpdateTask(taskId, { order: insertionOrder });
    } else {
      const updates: Partial<Task> = {
        date: undefined,
        endDate: undefined,
        time: undefined,
        order: insertionOrder
      };

      if (view === 'week') {
        updates.scheduledWeek = startOfWeekStr;
        updates.scheduledMonth = undefined;
      } else {
        updates.scheduledWeek = undefined;
        updates.scheduledMonth = curYearMonth;
      }

      onUpdateTask(taskId, updates);
    }
  };

  const handleUnscheduledContainerDrop = (e: React.DragEvent, view: 'week' | 'month') => {
    e.preventDefault();
    const payload = getTaskDragPayload(e);
    clearTaskDragState();
    if (!payload) return;
    const { taskId } = payload;

    const updates: Partial<Task> = {};
    const curYearMonth = startOfMonthStr.substring(0, 7);

    const unscheduledList = view === 'week' 
      ? thisWeekTasks.filter(t => !t.date) 
      : thisMonthTasks.filter(t => !t.date);
    const maxOrder = unscheduledList.length > 0 ? Math.max(...unscheduledList.map(t => t.order)) : 0;
    updates.order = maxOrder + 1;

    if (view === 'week') {
      updates.date = undefined;
      updates.endDate = undefined;
      updates.time = undefined;
      updates.scheduledWeek = startOfWeekStr;
      updates.scheduledMonth = undefined;
    } else {
      updates.date = undefined;
      updates.endDate = undefined;
      updates.time = undefined;
      updates.scheduledWeek = undefined;
      updates.scheduledMonth = curYearMonth;
    }

    onUpdateTask(taskId, updates);
  };

  // --- Helper to get style of task block based on parent category ---
  const getTaskStyle = (task: Task) => {
    const cat = categories.find(c => c.id === task.categoryId);
    const colorHex = cat ? cat.colorHex : '#ddb892'; // default soft warm sand
    if (task.completed) {
      return {
        borderLeft: `3px solid ${colorHex}40`,
        border: `1px solid #f3f4f6`,
        background: `#fafafa`,
        color: '#9ca3af',
        opacity: 0.75
      };
    }
    return {
      borderLeft: `3px solid ${colorHex}`,
      border: `1px solid ${colorHex}45`,
      background: `${colorHex}22`, // more colorful and highly visible background
      color: '#1f2937' // slightly darker text for better contrast
    };
  };

  // Open Edit Task Modal
  const openEditTaskModal = (task: Task) => {
    setEditingTask(task);
    setEditTaskTitle(task.title);
    setEditTaskDesc(task.description || '');
    setEditTaskDate(task.date || '');
    setEditTaskEndDate(task.endDate || '');
    setEditTaskTime(task.time || '');
    setEditTaskUrgency(task.urgency || 'none');
    setEditTaskCatId(task.categoryId || '');
    setEditTaskRepeat(task.repeat || 'none');
    setEditTaskReminder(task.reminder || 'none');
    setEditTaskSubtasks(task.subtasks ? [...task.subtasks] : []);
    setNewSubtaskTitle('');
    setEditingSubtaskId(null);
    setEditSubtaskTitle('');
    setActiveModalTab('basic');

    if (task.scheduledMonth) {
      setEditTaskScheduleType('month');
      setEditTaskScheduledMonth(task.scheduledMonth);
      setEditTaskScheduledWeek('');
    } else if (task.scheduledWeek) {
      setEditTaskScheduleType('week');
      setEditTaskScheduledWeek(task.scheduledWeek);
      setEditTaskScheduledMonth('');
    } else if (task.date) {
      setEditTaskScheduleType('date');
      setEditTaskScheduledWeek('');
      setEditTaskScheduledMonth('');
    } else {
      setEditTaskScheduleType('none');
      setEditTaskScheduledWeek('');
      setEditTaskScheduledMonth('');
    }
  };

  // Save changes from Edit Task Modal
  const handleSaveModalTaskEdits = () => {
    if (!editingTask) return;

    const updates: Partial<Task> = {
      title: editTaskTitle.trim(),
      description: editTaskDesc.trim() || undefined,
      urgency: editTaskUrgency,
      categoryId: editTaskCatId || undefined,
      repeat: editTaskRepeat,
      reminder: editTaskReminder,
      subtasks: editTaskSubtasks,
    };

    if (editTaskScheduleType === 'date') {
      const finalDate = editTaskDate || undefined;
      let finalEndDate = editTaskEndDate || undefined;
      if (finalDate && finalEndDate && finalEndDate < finalDate) {
        finalEndDate = undefined;
      }
      updates.date = finalDate;
      updates.endDate = finalEndDate;
      updates.time = editTaskTime || undefined;
      updates.scheduledWeek = undefined;
      updates.scheduledMonth = undefined;
    } else if (editTaskScheduleType === 'week') {
      updates.date = undefined;
      updates.endDate = undefined;
      updates.time = undefined;
      updates.scheduledWeek = editTaskScheduledWeek || undefined;
      updates.scheduledMonth = undefined;
    } else if (editTaskScheduleType === 'month') {
      updates.date = undefined;
      updates.endDate = undefined;
      updates.time = undefined;
      updates.scheduledWeek = undefined;
      updates.scheduledMonth = editTaskScheduledMonth || undefined;
    } else {
      // 'none' -> 待安排
      updates.date = undefined;
      updates.endDate = undefined;
      updates.time = undefined;
      updates.scheduledWeek = undefined;
      updates.scheduledMonth = undefined;
    }

    onUpdateTask(editingTask.id, updates);
    setEditingTask(null);
  };

  // Delete task from Modal
  const handleModalDeleteTask = () => {
    if (!editingTask) return;
    onDeleteTask(editingTask.id);
    setEditingTask(null);
  };

  // --- Subtasks inside Edit Modal Helpers ---
  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    const nextOrder = editTaskSubtasks.length;
    const newSub: Subtask = {
      id: Math.random().toString(36).substring(2, 9),
      title: newSubtaskTitle.trim(),
      completed: false,
      order: nextOrder
    };
    setEditTaskSubtasks([...editTaskSubtasks, newSub]);
    setNewSubtaskTitle('');
  };

  const handleNewSubtaskKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSubtask();
    }
  };

  const toggleSubtask = (subId: string) => {
    setEditTaskSubtasks(prev => prev.map(sub => 
      sub.id === subId ? { ...sub, completed: !sub.completed } : sub
    ));
  };

  const deleteSubtask = (subId: string) => {
    setEditTaskSubtasks(prev => prev.filter(sub => sub.id !== subId));
  };

  const moveSubtask = (index: number, direction: 'up' | 'down') => {
    const nextIndex = direction === 'up' ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= editTaskSubtasks.length) return;
    const reordered = [...editTaskSubtasks];
    const [removed] = reordered.splice(index, 1);
    reordered.splice(nextIndex, 0, removed);
    reordered.forEach((sub, idx) => {
      sub.order = idx;
    });
    setEditTaskSubtasks(reordered);
  };

  const handleSubDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    e.stopPropagation();
    setDraggedSubIndex(index);
  };

  const handleSubDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleSubDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedSubIndex === null || draggedSubIndex === targetIndex) return;

    const subtasksSorted = [...editTaskSubtasks].sort((a, b) => a.order - b.order);
    const [removed] = subtasksSorted.splice(draggedSubIndex, 1);
    subtasksSorted.splice(targetIndex, 0, removed);

    const updatedSubtasks = subtasksSorted.map((sub, idx) => ({
      ...sub,
      order: idx
    }));

    setEditTaskSubtasks(updatedSubtasks);
    setDraggedSubIndex(null);
  };

  const startEditSubtask = (subId: string, title: string) => {
    setEditingSubtaskId(subId);
    setEditSubtaskTitle(title);
  };

  const handleSaveSubtaskTitle = (subId: string) => {
    if (!editSubtaskTitle.trim()) {
      setEditingSubtaskId(null);
      return;
    }
    setEditTaskSubtasks(prev => prev.map(sub => 
      sub.id === subId ? { ...sub, title: editSubtaskTitle.trim() } : sub
    ));
    setEditingSubtaskId(null);
  };

  // Clear scheduling details of task from Modal
  const handleModalClearSchedule = () => {
    if (!editingTask) return;
    onUpdateTask(editingTask.id, {
      date: undefined,
      endDate: undefined,
      time: undefined
    });
    setEditingTask(null);
  };

  // Helper to adjust the duration/end date of a task manually via button (+/- 1 day)
  const adjustTaskEndDate = (task: Task, daysOffset: number) => {
    const base = task.endDate || task.date || todayStr;
    const d = new Date(base);
    d.setDate(d.getDate() + daysOffset);
    const nextEndDate = formatDate(d);
    if (nextEndDate >= (task.date || todayStr)) {
      onUpdateTask(task.id, { endDate: nextEndDate });
    }
  };

  // Mouse drag resize handler for task block
  const handleResizeStart = (e: React.MouseEvent, task: Task, edge: 'start' | 'end') => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const ganttGrid = (e.currentTarget as HTMLElement).closest<HTMLElement>('[data-gantt-grid]');
    const columnCount = Number(ganttGrid?.dataset.ganttColumns) || (viewMode === 'three-day' ? 3 : 7);
    const measuredWidth = ganttGrid?.getBoundingClientRect().width || 0;
    const stepWidth = measuredWidth > 0 ? measuredWidth / columnCount : (viewMode === 'three-day' ? 150 : 100);
    
    let currentDelta = 0;
    justResizedRef.current = false;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      if (Math.abs(deltaX) > 2) {
        justResizedRef.current = true;
      }
      const daysDelta = Math.round(deltaX / stepWidth);
      currentDelta = daysDelta;
      setResizingTask({ id: task.id, edge, deltaDays: daysDelta });
    };
    
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      setResizingTask(null);

      if (currentDelta !== 0) {
        if (edge === 'end') {
          const base = task.endDate || task.date || todayStr;
          const d = new Date(base);
          d.setDate(d.getDate() + currentDelta);
          const newEndDate = formatDate(d);
          if (newEndDate >= (task.date || todayStr)) {
            onUpdateTask(task.id, { endDate: newEndDate });
          }
        } else {
          const base = task.date || todayStr;
          const d = new Date(base);
          d.setDate(d.getDate() + currentDelta);
          const newStartDate = formatDate(d);
          const currentEndDate = task.endDate || task.date || todayStr;
          if (newStartDate <= currentEndDate) {
            onUpdateTask(task.id, { date: newStartDate });
          }
        }
      }

      // Delay resetting to allow the click event to fire and check this flag
      setTimeout(() => {
        justResizedRef.current = false;
      }, 80);
    };
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  // Trigger quick add popover submission
  const submitQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddTaskTitle.trim() || !quickAddTaskDate) return;
    onAddTask(quickAddTaskTitle.trim(), quickAddTaskCatId || undefined, { date: quickAddTaskDate });
    setQuickAddTaskTitle('');
    setQuickAddTaskDate(null);
  };

  return (
    <div id="calendar-section-root" className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full items-start lg:items-stretch min-w-0">
      
      {/* LEFT: Core Calendar Workspace (9 cols) */}
      <div id="calendar-workspace-panel" className="lg:col-span-9 bg-white rounded-2xl p-5 border border-neutral-100 flex flex-col space-y-4 min-w-0">
        
        {/* Calendar Header with Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
          
          {/* Navigation Controls */}
          <div className="flex items-center space-x-2">
            <h2 className="text-sm font-bold text-neutral-800 tracking-tight font-sans flex items-center px-1 py-1">
              <Calendar className="w-4 h-4 mr-2 text-blue-500" />
              {viewMode === 'three-day' && '三日日程'}
              {viewMode === 'week' && `${weekDates[0].dateObj.toLocaleString('zh-CN', { year: 'numeric', month: 'long' })}`}
              {viewMode === 'month' && `${currentMonthYearStr}`}
            </h2>

            <div className="flex items-center bg-neutral-100/55 p-1 rounded-xl border border-neutral-200/40">
              <button 
                id="btn-calendar-prev"
                onClick={() => adjustBaseDate(viewMode === 'three-day' ? -1 : viewMode === 'week' ? -7 : -30)}
                className="p-1 rounded-lg hover:bg-white text-neutral-600 transition hover:shadow-sm cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button 
                id="btn-calendar-today"
                onClick={() => {
                  const actualToday = new Date();
                  setBaseDate(actualToday);
                  setSelectedDateStr(getRealTodayStr());
                }}
                className="text-xs px-2.5 py-1 rounded-lg hover:bg-white text-neutral-700 font-bold transition hover:shadow-sm cursor-pointer"
              >
                回到今日
              </button>
              <button 
                id="btn-calendar-next"
                onClick={() => adjustBaseDate(viewMode === 'three-day' ? 1 : viewMode === 'week' ? 7 : 30)}
                className="p-1 rounded-lg hover:bg-white text-neutral-600 transition hover:shadow-sm cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Toggle View Mode (3-Day / Week / Month) */}
          <div className="flex items-center space-x-2 self-end sm:self-auto">
            <button
              type="button"
              role="switch"
              aria-checked={showMoodEmojis}
              aria-label={`${viewMode === 'three-day' ? '三日' : viewMode === 'week' ? '周' : '月'}视图心情显示`}
              onClick={toggleMoodVisibility}
              className="flex items-center gap-1.5 p-1 cursor-pointer transition-opacity hover:opacity-75"
              title={showMoodEmojis ? '隐藏日期卡心情' : '显示日期卡心情'}
            >
              <Smile className={`w-3.5 h-3.5 ${showMoodEmojis ? 'text-amber-500' : 'text-neutral-400'}`} />
              <span
                aria-hidden="true"
                className={`relative inline-flex h-4 w-7 flex-shrink-0 rounded-full transition-colors duration-200 ${showMoodEmojis ? 'bg-amber-400' : 'bg-neutral-300'}`}
              >
                <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow-sm transition-transform duration-200 ${showMoodEmojis ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
              </span>
            </button>
            <div className="bg-neutral-100/55 p-1 rounded-xl border border-neutral-200/40 flex space-x-1">
              <button
                id="btn-view-3day"
                onClick={() => setViewMode('three-day')}
                className={`text-xs px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${viewMode === 'three-day' ? 'bg-white text-neutral-800 shadow-sm' : 'text-neutral-500 hover:text-neutral-800'}`}
              >
                三日
              </button>
              <button
                id="btn-view-week"
                onClick={() => setViewMode('week')}
                className={`text-xs px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${viewMode === 'week' ? 'bg-white text-neutral-800 shadow-sm' : 'text-neutral-500 hover:text-neutral-800'}`}
              >
                周
              </button>
              <button
                id="btn-view-month"
                onClick={() => setViewMode('month')}
                className={`text-xs px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${viewMode === 'month' ? 'bg-white text-neutral-800 shadow-sm' : 'text-neutral-500 hover:text-neutral-800'}`}
              >
                月
              </button>
            </div>
          </div>

        </div>

        {/* I-1. Category Visibility Filter Badges */}
        {(() => {
          const isAllSelected = categories.every(cat => cat.visible !== false) && uncategorizedVisible;
          const isAnySelected = categories.some(cat => cat.visible !== false) || uncategorizedVisible;
          return (
            <div ref={filterContainerRef} className="calendar-filter-bar flex flex-wrap items-center gap-2 py-1 text-xs text-neutral-600 bg-transparent">
              <span className="text-neutral-400 mr-1 text-[11px] font-bold">
                过滤:
              </span>

              {categories.map(cat => {
                const isVisible = cat.visible !== false;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => onUpdateCategory(cat.id, { visible: !isVisible })}
                    className={`px-2.5 py-1 rounded-xl border flex items-center space-x-1.5 font-bold transition cursor-pointer text-[11px] ${
                      isVisible 
                        ? 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50 shadow-sm' 
                        : 'bg-neutral-50/60 text-neutral-400 border-neutral-200/40 hover:bg-neutral-50'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: isVisible ? cat.colorHex : '#d4d4d4' }} />
                    <span>{cat.name}</span>
                  </button>
                );
              })}
              
              <button
                type="button"
                onClick={toggleUncategorizedVisible}
                className={`px-2.5 py-1 rounded-xl border flex items-center space-x-1.5 font-bold transition cursor-pointer text-[11px] ${
                  uncategorizedVisible 
                    ? 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50 shadow-sm' 
                    : 'bg-neutral-50/60 text-neutral-400 border-neutral-200/40 hover:bg-neutral-50'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: uncategorizedVisible ? '#737373' : '#d4d4d4' }} />
                <span>未分类</span>
              </button>

              <button
                type="button"
                onClick={handleSelectAllFilters}
                className="p-1.5 rounded-xl border border-blue-200/50 bg-blue-50 text-blue-600 hover:bg-blue-100/80 hover:border-blue-300 transition cursor-pointer shadow-sm hover:scale-[1.05] flex items-center justify-center"
                title="全选（全部勾选所有分类）"
              >
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>

              <button
                type="button"
                onClick={handleClearAllFilters}
                className="p-1.5 rounded-xl border border-red-200/50 bg-red-50 text-red-500 hover:bg-red-100 hover:border-red-300 hover:text-red-600 transition cursor-pointer shadow-sm hover:scale-[1.05] flex items-center justify-center"
                title="清空（取消勾选所有分类）"
              >
                <Eraser className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>
          );
        })()}

        {/* RENDER ACTIVE VIEW */}
        <div id="calendar-grid" ref={calendarGridRef} className="flex-1">

          {/* A. THREE DAY VIEW */}
          {viewMode === 'three-day' && (
            <div className="three-day-cards relative flex flex-col min-h-[380px] overflow-visible group/calendar select-none">
              {/* Independent day card surfaces */}
              <div className="absolute inset-0 grid grid-cols-3 gap-3 pointer-events-none z-0">
                {getThreeDays().map(day => (
                  <div
                    key={day.dateStr}
                    className="h-full rounded-2xl border bg-white border-neutral-200/80 shadow-[0_4px_18px_rgba(25,32,48,0.035)]"
                  />
                ))}
              </div>

              {/* Foreground scrollable container / content */}
              <div className="relative flex flex-col w-full flex-1 select-none">
                {/* 1. Date Header Grid */}
                <div className="grid grid-cols-3 gap-3 w-full">
                  {getThreeDays().map((day, dIdx) => {
                    const isToday = day.dateStr === todayStr;
                    const isSelected = day.dateStr === selectedDateStr;
                    const dayMood = getMoodForDate(day.dateStr);
                    return (
                      <div 
                        key={dIdx} 
                        onClick={() => setSelectedDateStr(day.dateStr)}
                        className={`three-day-date-header flex items-center justify-between gap-1.5 px-4 py-3 rounded-t-2xl border-b cursor-pointer transition-all duration-200 ${
                          isSelected
                            ? 'three-day-date-selected'
                            : 'bg-transparent border-neutral-100 hover:bg-neutral-50/60'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 overflow-hidden">
                          <h4 className={`text-xs sm:text-sm font-extrabold truncate ${
                            isSelected
                              ? 'text-neutral-900'
                              : isToday
                                ? 'text-black'
                                : 'text-neutral-800'
                          }`}>
                            {getDayName(day.dateObj)}
                          </h4>
                          {showMoodEmojis && dayMood.emoji && (
                            <span className="day-card-mood" title={`当日心情：${dayMood.emoji}`}>
                              {getMoodChar(dayMood.emoji)}
                            </span>
                          )}
                        </div>
                        {isToday ? (
                          <span className="today-star-date flex-shrink-0 text-[11px] font-medium text-neutral-600">
                            <span>{day.dateStr.split('-')[2]}</span>
                          </span>
                        ) : (
                          <span className="text-[11px] w-5 h-5 leading-5 text-center rounded-full flex-shrink-0 transition-all bg-neutral-200 text-neutral-600 font-medium">
                            {day.dateStr.split('-')[2]}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* 2. Multi-day Gantt Bars (spanning across columns) */}
                {(() => {
                  const days = getThreeDays();
                  const activeDates = days.map(d => d.dateStr);
                  const activeMulti = getActiveMultiDayTasks(activeDates);
                  const rows = layoutMultiDayTasks(activeMulti, activeDates);
                  if (activeMulti.length === 0) return null;
                  return (
                    <div
                      className="relative z-30 space-y-1.5 py-3 w-full px-2"
                      data-gantt-grid
                      data-gantt-columns="3"
                      onDragOver={handleTaskDragOver}
                      onDrop={(e) => handleTaskDropOnGanttBackground(e, activeDates)}
                    >
                      {rows.map((rowTasks, rIdx) => (
                        <div key={rIdx} className="grid grid-cols-3 gap-3 h-7.5 relative w-full">
                          {rowTasks.map(task => {
                            const isResizingThis = resizingTask && resizingTask.id === task.id;
                            let renderStartDate = task.date || '';
                            let renderEndDate = task.endDate || task.date || '';

                            if (isResizingThis && resizingTask) {
                              if (resizingTask.edge === 'start') {
                                const d = new Date(renderStartDate);
                                d.setDate(d.getDate() + resizingTask.deltaDays);
                                renderStartDate = formatDate(d);
                                if (renderStartDate > renderEndDate) renderStartDate = renderEndDate;
                              } else {
                                const d = new Date(renderEndDate);
                                d.setDate(d.getDate() + resizingTask.deltaDays);
                                renderEndDate = formatDate(d);
                                if (renderEndDate < renderStartDate) renderEndDate = renderStartDate;
                              }
                            }

                            if (renderStartDate > activeDates[2] || renderEndDate < activeDates[0]) return null;

                            const startIndex = Math.max(0, activeDates.indexOf(renderStartDate));
                            const rawEndIndex = activeDates.indexOf(renderEndDate);
                            const endIndex = rawEndIndex === -1 ? activeDates.length - 1 : rawEndIndex;

                            const cat = categories.find(c => c.id === task.categoryId);
                            const colorHex = cat ? cat.colorHex : '#3b82f6';
                            const isCompleted = task.completed;
                            const customStyle = getNotionColorStyles(colorHex, isCompleted);

                            return (
                              <div
                                key={task.id}
                                draggable
                                data-task-drop-position={getTaskDropPosition(task.id)}
                                onDragStart={(e) => handleTaskDragStart(e, task.id, task.date || todayStr, 0)}
                                onDragEnd={handleTaskDragEnd}
                                onDragOver={(e) => handleTaskItemDragOver(e, task.id)}
                                onDrop={(e) => handleTaskDropOnGanttItem(e, task, activeDates)}
                                onClick={() => {
                                  if (justResizedRef.current) return;
                                  openEditTaskModal(task);
                                }}
                                style={{
                                  ...customStyle,
                                  gridColumnStart: startIndex + 1,
                                  gridColumnEnd: endIndex + 2,
                                }}
                                className={`h-7 rounded-md text-xs px-2 flex items-center justify-between cursor-pointer group transition-all select-none hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:brightness-[0.98] active:scale-[0.99] relative z-20 mx-1 ${
                                  isCompleted ? 'opacity-70' : ''
                                } ${draggedTaskId === task.id ? 'opacity-40' : ''}`}
                              >
                                {/* Left drag-resize handle */}
                                <div 
                                  onMouseDown={(e) => handleResizeStart(e, task, 'start')}
                                  className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-neutral-400/20 hover:bg-neutral-400/40 z-30 transition-all duration-200"
                                  title="拖拽更改开始日期"
                                  onClick={(e) => e.stopPropagation()}
                                />

                                <div className="flex items-center space-x-2 overflow-hidden flex-1 mr-1 pl-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleTaskCompletionOnDay(task, todayStr);
                                    }}
                                    className="transition relative z-30 flex-shrink-0 focus:outline-none cursor-pointer"
                                  >
                                    <div className={`w-3.5 h-3.5 rounded-full border transition flex items-center justify-center ${
                                      isCompleted 
                                        ? 'bg-blue-500 border-blue-500 text-white' 
                                        : 'bg-white border-neutral-300 group-hover:border-neutral-400'
                                    }`}>
                                      {isCompleted && <Check className="w-2.5 h-2.5 stroke-[3.5] text-white" />}
                                    </div>
                                  </button>
                                  <span className={`font-medium tracking-tight text-[11px] truncate ${isCompleted ? 'line-through text-neutral-400' : ''}`} style={{ color: customStyle.color }}>
                                    {task.title}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition duration-200 flex-shrink-0 pr-1 relative z-30">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); adjustTaskEndDate(task, -1); }}
                                    className="w-4 h-4 bg-white/95 hover:bg-white border border-neutral-200/60 rounded-md flex items-center justify-center text-[11px] font-bold text-neutral-500 hover:text-blue-500 active:scale-90 transition shadow-sm cursor-pointer"
                                    title="缩短1天"
                                  >
                                    -
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); adjustTaskEndDate(task, 1); }}
                                    className="w-4 h-4 bg-white/95 hover:bg-white border border-neutral-200/60 rounded-md flex items-center justify-center text-[11px] font-bold text-neutral-500 hover:text-blue-500 active:scale-90 transition shadow-sm cursor-pointer"
                                    title="延长1天"
                                  >
                                    +
                                  </button>
                                </div>

                                {/* Right drag-resize handle */}
                                <div 
                                  onMouseDown={(e) => handleResizeStart(e, task, 'end')}
                                  className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-neutral-400/20 hover:bg-neutral-400/40 z-30 transition-all duration-200"
                                  title="拖拽更改结束日期"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* 3. Task lists columns */}
                <div className="grid grid-cols-3 gap-3 w-full flex-1">
                  {getThreeDays().map((day, dIdx) => {
                    const dayTasks = visibleTasks.filter(t => isTaskOnDay(t, day.dateStr) && !isMultiDayForRender(t)).sort((a,b) => a.order - b.order);
                    return (
                      <div
                        key={day.dateStr}
                        onDragOver={handleTaskDragOver}
                        onDrop={(e) => handleTaskDropOnDate(e, day.dateStr)}
                        onClick={() => setSelectedDateStr(day.dateStr)}
                        className="flex flex-col p-4 transition min-h-[260px] cursor-pointer flex-1 bg-transparent"
                      >
                        <div className="space-y-1.5 flex-1 overflow-visible">
                          {dayTasks.map((task, index) => {
                            return (
                              <div
                                key={task.id}
                                draggable
                                data-task-drop-position={getTaskDropPosition(task.id)}
                                onDragStart={(e) => handleTaskDragStart(e, task.id, day.dateStr, index)}
                                onDragEnd={handleTaskDragEnd}
                                onDragOver={(e) => handleTaskItemDragOver(e, task.id)}
                                onDrop={(e) => handleTaskDropOnTaskItem(e, task, day.dateStr)}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditTaskModal(task);
                                }}
                                style={getTaskStyle(task)}
                                className={`py-0 px-1 rounded-md text-[11px] cursor-pointer group relative hover:scale-[1.02] hover:shadow-md transition active:cursor-grabbing border-l-2 flex flex-col justify-between mx-2.5 ${
                                  task.completed ? 'opacity-65' : ''
                                }`}
                              >
                                <div className="flex items-center gap-1 pl-0 leading-tight">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleTaskCompletionOnDay(task, day.dateStr);
                                    }}
                                    className="text-neutral-400 hover:text-blue-500 transition flex-shrink-0"
                                  >
                                    {task.completed ? (
                                      <CheckSquare className="w-2.5 h-2.5 text-blue-500" />
                                    ) : (
                                      <Square className="w-2.5 h-2.5" />
                                    )}
                                  </button>
                                  <span className={`font-semibold truncate flex-1 leading-tight ${task.completed ? 'line-through text-neutral-400' : 'text-neutral-800'}`}>
                                    {task.title}
                                  </span>
                                  {task.time && <span className="text-[11px] bg-white/60 text-neutral-600 px-1 py-0.2 rounded font-mono flex-shrink-0 leading-none">{task.time}</span>}
                                </div>

                                <div className="flex items-center justify-between mt-0 pl-0 ml-3.5 leading-none">
                                  <span className="text-[11px] text-neutral-400 font-mono leading-none">
                                    {categories.find(c => c.id === task.categoryId)?.name || '未分类'}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Quick Add Task Button for each Column */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setQuickAddTaskDate(day.dateStr);
                          }}
                          className="mt-3 w-full py-1.5 border border-dashed border-neutral-200 rounded-xl text-[11px] font-bold text-neutral-500 hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50/20 transition flex items-center justify-center cursor-pointer"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          新建任务
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Selection outline stays above each card's internal separators. */}
              <div className="absolute inset-0 grid grid-cols-3 gap-3 pointer-events-none z-20">
                {getThreeDays().map(day => (
                  <div
                    key={day.dateStr}
                    className={day.dateStr === selectedDateStr
                      ? 'h-full rounded-2xl border-2 border-blue-500 shadow-[0_0_0_1px_rgba(65,105,225,0.10)]'
                      : 'h-full'
                    }
                  />
                ))}
              </div>

              {/* Left Hover Navigation Button */}
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  adjustBaseDate(-1);
                }}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white shadow-md hover:shadow-lg border border-neutral-200 text-neutral-600 hover:text-blue-600 hover:scale-110 active:scale-95 transition-all duration-200 opacity-0 group-hover/calendar:opacity-100 z-30 cursor-pointer flex items-center justify-center"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Right Hover Navigation Button */}
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  adjustBaseDate(1);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white shadow-md hover:shadow-lg border border-neutral-200 text-neutral-600 hover:text-blue-600 hover:scale-110 active:scale-95 transition-all duration-200 opacity-0 group-hover/calendar:opacity-100 z-30 cursor-pointer flex items-center justify-center"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

            </div>
          )}

          {/* B. WEEK VIEW */}
          {viewMode === 'week' && (() => {
            const days = getWeekDates();
            const activeDates = days.map(d => d.dateStr);
            const activeMulti = getActiveMultiDayTasks(activeDates);
            const rows = layoutMultiDayTasks(activeMulti, activeDates);
            const multiDayRowsCount = rows.length;

            return (
              <div className="relative flex flex-col bg-neutral-50/50 p-2.5 rounded-2xl border border-neutral-200/40 shadow-sm min-h-[360px] group/calendar">
                {/* Foreground container with 7 unified day card columns */}
                <div className="relative z-10 grid grid-cols-7 gap-2 w-full p-2.5 items-start select-none">
                  {days.map((day, dIdx) => {
                    const isToday = day.dateStr === todayStr;
                    const dayMood = getMoodForDate(day.dateStr);
                    const dayTasks = visibleTasks.filter(t => isTaskOnDay(t, day.dateStr) && !isMultiDayForRender(t)).sort((a,b) => a.order - b.order);
                    return (
                      <div
                        key={day.dateStr}
                        onDragOver={handleTaskDragOver}
                        onDrop={(e) => handleTaskDropOnDate(e, day.dateStr)}
                        className="flex flex-col justify-between p-3.5 rounded-xl transition min-h-[300px] h-fit border bg-white border-neutral-100/80 shadow-sm"
                      >
                        {/* 1. Date Header */}
                        <div className="text-center pb-2 border-b border-neutral-100/80 mb-2 flex flex-col items-center justify-center h-[52px]">
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <span className={`text-[11px] block font-bold ${isToday ? 'text-blue-600 font-extrabold' : 'text-neutral-400'} leading-none`}>
                              {day.dayName}
                            </span>
                            {showMoodEmojis && dayMood.emoji && (
                              <span className="day-card-mood" title={`当日心情：${dayMood.emoji}`}>
                                {getMoodChar(dayMood.emoji)}
                              </span>
                            )}
                          </div>
                          <span 
                            onClick={() => {
                              setBaseDate(day.dateObj);
                              setSelectedDateStr(day.dateStr);
                              setViewMode('three-day');
                            }}
                            className={`cursor-pointer hover:opacity-80 transition ${isToday ? 'today-star-date text-xs font-extrabold text-neutral-700' : 'text-xs font-extrabold inline-block w-6 h-6 leading-6 rounded-full text-neutral-700 hover:bg-neutral-200/40'}`}
                            title="点击查看此日三日视图"
                          >
                            <span>{day.dayNum}</span>
                          </span>
                        </div>

                        {/* 2. Spacer for Multi-day Gantt Bars */}
                        {multiDayRowsCount > 0 && (
                          <div style={{ height: `${multiDayRowsCount * 30 + (multiDayRowsCount - 1) * 6}px` }} className="mb-3" />
                        )}

                        {/* 3. Task list */}
                        <div className="space-y-2 flex-1 overflow-visible min-h-[100px]">
                          {dayTasks.map((task, index) => (
                            <div
                              key={task.id}
                              draggable
                              data-task-drop-position={getTaskDropPosition(task.id)}
                              onDragStart={(e) => handleTaskDragStart(e, task.id, day.dateStr, index)}
                              onDragEnd={handleTaskDragEnd}
                              onDragOver={(e) => handleTaskItemDragOver(e, task.id)}
                              onDrop={(e) => handleTaskDropOnTaskItem(e, task, day.dateStr)}
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditTaskModal(task);
                              }}
                              style={getTaskStyle(task)}
                              className={`p-2.5 px-3 rounded-xl text-[11px] cursor-pointer group hover:scale-[1.02] hover:shadow transition relative border-l-4 ${
                                task.completed ? 'opacity-60' : ''
                              }`}
                            >
                              <div className="flex items-center gap-1 pl-0.5">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleTaskCompletionOnDay(task, day.dateStr);
                                  }}
                                  className="text-neutral-400 hover:text-blue-500 transition flex-shrink-0"
                                >
                                  {task.completed ? (
                                    <CheckSquare className="w-3 h-3 text-blue-500" />
                                  ) : (
                                    <Square className="w-3 h-3" />
                                  )}
                                </button>
                                <span className={`font-bold truncate flex-1 text-neutral-700 ${task.completed ? 'line-through text-neutral-400' : ''}`}>
                                  {task.title}
                                </span>
                              </div>
                              {task.time && <div className="text-[11px] text-neutral-400 font-mono mt-0.5 ml-4">{task.time}</div>}
                            </div>
                          ))}
                        </div>

                        {/* 4. Add Task Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setQuickAddTaskDate(day.dateStr);
                          }}
                          className="mt-2 w-full py-1 border border-dashed border-neutral-200 rounded-lg text-[11px] font-bold text-neutral-400 hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50/10 transition flex items-center justify-center cursor-pointer whitespace-nowrap"
                          title="添加任务"
                        >
                          <Plus className="w-2.5 h-2.5 xl:mr-0.5" />
                          <span className="hidden xl:inline">加任务</span>
                        </button>
                      </div>
                    );
                  })}

                  {/* Multi-day Gantt Bars (spanning across columns) overlay */}
                  {multiDayRowsCount > 0 && (
                    <div 
                      className="absolute left-2.5 right-2.5 z-20 pointer-events-auto"
                      data-gantt-grid
                      data-gantt-columns="7"
                      onDragOver={handleTaskDragOver}
                      onDrop={(e) => handleTaskDropOnGanttBackground(e, activeDates)}
                      style={{ 
                        top: '84px', // Calculated alignment with the Spacer inside card (10px container + 14px card padding + 52px header + 8px gap)
                      }}
                    >
                      <div className="space-y-1.5 w-full">
                        {rows.map((rowTasks, rIdx) => (
                          <div key={rIdx} className="grid grid-cols-7 gap-2 h-7.5 relative w-full pointer-events-none">
                            {rowTasks.map(task => {
                              const isResizingThis = resizingTask && resizingTask.id === task.id;
                              let renderStartDate = task.date || '';
                              let renderEndDate = task.endDate || task.date || '';

                              if (isResizingThis && resizingTask) {
                                if (resizingTask.edge === 'start') {
                                  const d = new Date(renderStartDate);
                                  d.setDate(d.getDate() + resizingTask.deltaDays);
                                  renderStartDate = formatDate(d);
                                  if (renderStartDate > renderEndDate) renderStartDate = renderEndDate;
                                } else {
                                  const d = new Date(renderEndDate);
                                  d.setDate(d.getDate() + resizingTask.deltaDays);
                                  renderEndDate = formatDate(d);
                                  if (renderEndDate < renderStartDate) renderEndDate = renderStartDate;
                                }
                              }
                              if (renderStartDate > activeDates[6] || renderEndDate < activeDates[0]) return null;

                              const startIndex = Math.max(0, activeDates.indexOf(renderStartDate));
                              const rawEndIndex = activeDates.indexOf(renderEndDate);
                              const endIndex = rawEndIndex === -1 ? activeDates.length - 1 : rawEndIndex;
                              const cat = categories.find(c => c.id === task.categoryId);

                              const colorHex = cat ? cat.colorHex : '#3b82f6';
                              const isCompleted = task.completed;
                              const customStyle = getNotionColorStyles(colorHex, isCompleted);

                              return (
                                <div
                                  key={task.id}
                                  draggable
                                  data-task-drop-position={getTaskDropPosition(task.id)}
                                  onDragStart={(e) => handleTaskDragStart(e, task.id, task.date || todayStr, 0)}
                                  onDragEnd={handleTaskDragEnd}
                                  onDragOver={(e) => handleTaskItemDragOver(e, task.id)}
                                  onDrop={(e) => handleTaskDropOnGanttItem(e, task, activeDates)}
                                  onClick={() => {
                                    if (justResizedRef.current) return;
                                    openEditTaskModal(task);
                                  }}
                                  style={{
                                    ...customStyle,
                                    gridColumnStart: startIndex + 1,
                                    gridColumnEnd: endIndex + 2,
                                  }}
                                  className={`h-7 rounded-md text-[11px] px-2 flex items-center justify-between cursor-pointer group pointer-events-auto transition-all select-none hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:brightness-[0.98] active:scale-[0.99] relative z-20 mx-0.5 ${
                                    isCompleted ? 'opacity-70' : ''
                                  } ${draggedTaskId === task.id ? 'opacity-40' : ''}`}
                                >
                                  {/* Left drag-resize handle */}
                                  <div 
                                    onMouseDown={(e) => handleResizeStart(e, task, 'start')}
                                    className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-neutral-400/20 hover:bg-neutral-400/40 z-30 transition-all duration-200"
                                    title="拖拽更改开始日期"
                                    onClick={(e) => e.stopPropagation()}
                                  />

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleTaskCompletionOnDay(task, todayStr);
                                    }}
                                    className="absolute left-2 top-1/2 -translate-y-1/2 z-30 opacity-0 group-hover:opacity-100 transition focus:outline-none cursor-pointer"
                                    title={isCompleted ? '标记为未完成' : '标记为已完成'}
                                  >
                                    <div className={`w-3 h-3 rounded-full border transition flex items-center justify-center ${
                                      isCompleted 
                                        ? 'bg-blue-500 border-blue-500 text-white' 
                                        : 'bg-white border-neutral-300 group-hover:border-neutral-400'
                                    }`}>
                                      {isCompleted && <Check className="w-2 h-2 stroke-[3.5] text-white" />}
                                    </div>
                                  </button>

                                  <div className="min-w-0 flex-1 overflow-hidden px-1.5">
                                    <span
                                      className={`block w-full font-medium tracking-tight text-[11px] truncate text-center ${isCompleted ? 'line-through text-neutral-400' : ''}`}
                                      style={{ color: customStyle.color }}
                                      title={task.title}
                                    >
                                      {task.title}
                                    </span>
                                  </div>

                                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition duration-200 z-30">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); adjustTaskEndDate(task, -1); }}
                                      className="w-3.5 h-3.5 bg-white/95 hover:bg-white border border-neutral-200/60 rounded-md flex items-center justify-center text-[11px] font-bold text-neutral-500 hover:text-blue-500 active:scale-90 transition shadow-sm cursor-pointer"
                                      title="缩短1天"
                                    >
                                      -
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); adjustTaskEndDate(task, 1); }}
                                      className="w-3.5 h-3.5 bg-white/95 hover:bg-white border border-neutral-200/60 rounded-md flex items-center justify-center text-[11px] font-bold text-neutral-500 hover:text-blue-500 active:scale-90 transition shadow-sm cursor-pointer"
                                      title="延长1天"
                                    >
                                      +
                                    </button>
                                  </div>

                                  {/* Right drag-resize handle */}
                                  <div 
                                    onMouseDown={(e) => handleResizeStart(e, task, 'end')}
                                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-neutral-400/20 hover:bg-neutral-400/40 z-30 transition-all duration-200"
                                    title="拖拽更改结束日期"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Left Hover Navigation Button */}
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    adjustBaseDate(-7);
                  }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white shadow-md hover:shadow-lg border border-neutral-200 text-neutral-600 hover:text-blue-600 hover:scale-110 active:scale-95 transition-all duration-200 opacity-0 group-hover/calendar:opacity-100 z-30 cursor-pointer flex items-center justify-center"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Right Hover Navigation Button */}
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    adjustBaseDate(7);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white shadow-md hover:shadow-lg border border-neutral-200 text-neutral-600 hover:text-blue-600 hover:scale-110 active:scale-95 transition-all duration-200 opacity-0 group-hover/calendar:opacity-100 z-30 cursor-pointer flex items-center justify-center"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            );
          })()}

          {/* C. MONTH VIEW */}
          {viewMode === 'month' && (
            <div className="space-y-4 select-none">
              
              {/* Month Grid */}
              <div className="relative border border-neutral-200/50 rounded-2xl overflow-hidden bg-neutral-200/30 flex flex-col gap-[1px] shadow-sm group/calendar">
                {/* Weekday Labels */}
                <div className="grid grid-cols-7 gap-[1px]">
                  {['一', '二', '三', '四', '五', '六', '日'].map(w => (
                    <div key={w} className="bg-neutral-50/80 py-2.5 text-center text-xs font-bold text-neutral-500">
                      {w}
                    </div>
                  ))}
                </div>

                {/* Weeks Rows */}
                {(() => {
                  const allDays = getMonthDates();
                  const weeks: any[][] = [];
                  for (let i = 0; i < allDays.length; i += 7) {
                    weeks.push(allDays.slice(i, i + 7));
                  }

                  return weeks.map((weekDays, wIdx) => {
                    const activeDates = weekDays.map(d => d.dateStr);
                    const activeMulti = getActiveMultiDayTasks(activeDates);
                    const rows = layoutMultiDayTasks(activeMulti, activeDates);

                    return (
                      <div
                        key={wIdx}
                        className="relative bg-neutral-100 h-[125px] border-b border-neutral-100 w-full overflow-hidden"
                        style={{ minHeight: `${Math.max(78, 42 + rows.length * 22)}px` }}
                      >
                        {/* 1. Ground Grid (7 Day Cells) */}
                        <div className="absolute inset-0 grid grid-cols-7 gap-[1px] z-0">
                          {weekDays.map((day, dIdx) => {
                            const isToday = day.dateStr === todayStr;
                            const isPast = day.dateStr < todayStr;
                            const isCurrentMonth = day.isCurrentMonth;
                            const dayMood = getMoodForDate(day.dateStr);
                            const isPickerOpen = activeMoodPickerDate === day.dateStr;

                            let numClass = "";
                            if (isToday) {
                              numClass = "month-today-date text-xs font-extrabold text-neutral-700";
                            } else if (!isCurrentMonth) {
                              numClass = "text-neutral-300/80 font-normal";
                            } else if (isPast) {
                              numClass = "text-neutral-400 font-medium bg-neutral-100/45";
                            } else {
                              numClass = "text-neutral-700 font-extrabold hover:bg-neutral-100";
                            }

                            const dayTasks = visibleTasks.filter(t => isTaskOnDay(t, day.dateStr) && !isMultiDayForRender(t)).sort((a,b) => a.order - b.order);

                            return (
                              <div
                                key={day.dateStr}
                                onDragOver={handleTaskDragOver}
                                onDrop={(e) => handleTaskDropOnDate(e, day.dateStr)}
                                className={`group/column h-full flex flex-col justify-between p-1.5 transition relative select-none ${
                                  !day.isCurrentMonth 
                                    ? 'bg-neutral-100/45' 
                                    : day.dateStr < todayStr 
                                      ? 'bg-neutral-50/70' 
                                      : 'bg-white'
                                }`}
                              >
                                {/* Header (Date & Mood) */}
                                <div className="flex items-center justify-between w-full h-6 z-10">
                                  <span 
                                    onClick={() => {
                                      setBaseDate(day.dateObj);
                                      setSelectedDateStr(day.dateStr);
                                      setViewMode('three-day');
                                    }}
                                    className={`cursor-pointer hover:opacity-80 transition-all ${isToday ? '' : 'text-xs w-5 h-5 leading-5 text-center rounded-full'} ${numClass}`}
                                    title="点击查看此日三日视图"
                                  >
                                    <span>{day.dayNum}</span>
                                  </span>

                                  {showMoodEmojis && (
                                    <div className="relative">
                                      {dayMood.emoji ? (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleMonthMoodPicker(day.dateStr, e.currentTarget);
                                          }}
                                          className="text-xs hover:scale-115 transition cursor-pointer"
                                          title={`当日心情: ${dayMood.emoji}. 点击重新设置`}
                                        >
                                          {MOOD_OPTIONS.find(m => m.emoji === dayMood.emoji)?.char || '😐'}
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleMonthMoodPicker(day.dateStr, e.currentTarget);
                                          }}
                                          className="opacity-0 group-hover/column:opacity-100 text-xs text-neutral-300 hover:text-neutral-600 focus:outline-none transition cursor-pointer"
                                          title="点击设置当天心情"
                                        >
                                          <Smile className="w-3.5 h-3.5" />
                                        </button>
                                      )}

                                      {isPickerOpen && moodPickerPosition && createPortal(
                                        <div
                                          className="month-mood-picker fixed bg-white shadow-2xl border border-neutral-200 p-2 rounded-xl flex gap-2 items-center animate-fade-in whitespace-nowrap"
                                          style={moodPickerPosition}
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          {MOOD_OPTIONS.map(opt => (
                                            <button
                                              key={opt.emoji}
                                              type="button"
                                              aria-pressed={dayMood.emoji === opt.emoji}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                const shouldClear = dayMood.emoji === opt.emoji;
                                                onUpdateMood(day.dateStr, shouldClear ? '' : opt.emoji, shouldClear ? '' : dayMood.text);
                                                setActiveMoodPickerDate(null);
                                                setMoodPickerPosition(null);
                                                moodPickerAnchorRef.current = null;
                                              }}
                                              className={`month-mood-picker__emoji transition cursor-pointer ${
                                                dayMood.emoji === opt.emoji ? 'month-mood-picker__emoji--selected' : ''
                                              }`}
                                              title={opt.label}
                                            >
                                              {opt.char}
                                            </button>
                                          ))}
                                          {dayMood.emoji && (
                                            <button
                                              type="button"
                                              aria-label="清除心情"
                                              title="清除心情"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                onUpdateMood(day.dateStr, '', '');
                                                setActiveMoodPickerDate(null);
                                                setMoodPickerPosition(null);
                                                moodPickerAnchorRef.current = null;
                                              }}
                                              className="month-mood-picker__action month-mood-picker__action--clear"
                                            >
                                              <Eraser className="h-3.5 w-3.5" />
                                            </button>
                                          )}
                                          <button
                                            type="button"
                                            aria-label="关闭表情选择器"
                                            title="关闭"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setActiveMoodPickerDate(null);
                                              setMoodPickerPosition(null);
                                              moodPickerAnchorRef.current = null;
                                            }}
                                            className="month-mood-picker__action"
                                          >
                                            <X className="h-3.5 w-3.5" />
                                          </button>
                                        </div>,
                                        document.body,
                                      )}
                                    </div>
                                  )}
                                </div>

                                {/* Single-day tasks container */}
                                <div className="space-y-0.5 flex-1 overflow-y-auto mt-6 mb-5 pr-0.5 z-10">
                                  {dayTasks.map((task, index) => (
                                    <div
                                      key={task.id}
                                      draggable
                                      data-task-drop-position={getTaskDropPosition(task.id)}
                                      onDragStart={(e) => handleTaskDragStart(e, task.id, day.dateStr, index)}
                                      onDragEnd={handleTaskDragEnd}
                                      onDragOver={(e) => handleTaskItemDragOver(e, task.id)}
                                      onDrop={(e) => handleTaskDropOnTaskItem(e, task, day.dateStr)}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openEditTaskModal(task);
                                      }}
                                      style={getTaskStyle(task)}
                                      className={`px-1 py-0.5 text-[11px] rounded truncate cursor-pointer font-semibold relative border-l ${
                                        task.completed ? 'opacity-60 line-through text-neutral-400' : 'text-neutral-800'
                                      }`}
                                      title={`${task.title} ${task.time || ''}`}
                                    >
                                      <div className="flex items-center space-x-1 overflow-hidden">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleTaskCompletionOnDay(task, day.dateStr);
                                          }}
                                          className="transition relative z-30 flex-shrink-0 focus:outline-none cursor-pointer"
                                        >
                                          <div className={`w-2.5 h-2.5 rounded-full border transition flex items-center justify-center ${
                                            isTaskCompletedOnDay(task, day.dateStr)
                                              ? 'bg-blue-500 border-blue-500 text-white' 
                                              : 'bg-white border-neutral-300 group-hover:border-neutral-400'
                                          }`}>
                                            {isTaskCompletedOnDay(task, day.dateStr) && <Check className="w-1.5 h-1.5 stroke-[4] text-white" />}
                                          </div>
                                        </button>
                                        <span className="truncate flex-1">{task.title}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                {/* Quick Add button */}
                                <button
                                  type="button"
                                  aria-label={`在 ${day.dateStr} 新增日程`}
                                  title="新增日程"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setQuickAddTaskDate(day.dateStr);
                                  }}
                                  className="month-quick-add opacity-0 group-hover/column:opacity-100 absolute bottom-1 right-1.5 flex h-5 w-5 items-center justify-center rounded-md border border-blue-100 bg-blue-50 text-blue-500 hover:border-blue-200 hover:bg-blue-100 hover:text-blue-700 transition-all cursor-pointer z-30"
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>
                            );
                          })}
                        </div>

                        {/* 2. Absolute overlay for multi-day task Gantt bars */}
                        {activeMulti.length > 0 && (
                          <div
                            className="month-gantt-layer absolute inset-x-0 space-y-0.5 z-20 pointer-events-auto"
                            data-gantt-grid
                            data-gantt-columns="7"
                            onDragOver={handleTaskDragOver}
                            onDrop={(e) => handleTaskDropOnGanttBackground(e, activeDates)}
                          >
                            {rows.map((rowTasks, rIdx) => (
                              <div key={rIdx} className="grid grid-cols-7 gap-[1px] h-5 relative w-full">
                                {rowTasks.map(task => {
                                  const isResizingThis = resizingTask && resizingTask.id === task.id;
                                  let renderStartDate = task.date || '';
                                  let renderEndDate = task.endDate || task.date || '';

                                  if (isResizingThis && resizingTask) {
                                    if (resizingTask.edge === 'start') {
                                      const d = new Date(renderStartDate);
                                      d.setDate(d.getDate() + resizingTask.deltaDays);
                                      renderStartDate = formatDate(d);
                                      if (renderStartDate > renderEndDate) renderStartDate = renderEndDate;
                                    } else {
                                      const d = new Date(renderEndDate);
                                      d.setDate(d.getDate() + resizingTask.deltaDays);
                                      renderEndDate = formatDate(d);
                                      if (renderEndDate < renderStartDate) renderEndDate = renderStartDate;
                                    }
                                  }

                                  if (renderStartDate > activeDates[6] || renderEndDate < activeDates[0]) return null;

                                  const startIndex = Math.max(0, activeDates.indexOf(renderStartDate));
                                  const rawEndIndex = activeDates.indexOf(renderEndDate);
                                  const endIndex = rawEndIndex === -1 ? activeDates.length - 1 : rawEndIndex;

                                  const cat = categories.find(c => c.id === task.categoryId);
                                  const colorHex = cat ? cat.colorHex : '#3b82f6';
                                  const isCompleted = isTaskCompletedOnDay(task, renderStartDate);
                                  const customStyle = getNotionColorStyles(colorHex, isCompleted);

                                  return (
                                    <div
                                      key={task.id}
                                      draggable
                                      data-task-drop-position={getTaskDropPosition(task.id)}
                                      onDragStart={(e) => handleTaskDragStart(e, task.id, task.date || todayStr, 0)}
                                      onDragEnd={handleTaskDragEnd}
                                      onDragOver={(e) => handleTaskItemDragOver(e, task.id)}
                                      onDrop={(e) => handleTaskDropOnGanttItem(e, task, activeDates)}
                                      onClick={() => {
                                        if (justResizedRef.current) return;
                                        openEditTaskModal(task);
                                      }}
                                      style={{
                                        ...customStyle,
                                        gridColumnStart: startIndex + 1,
                                        gridColumnEnd: endIndex + 2,
                                      }}
                                      className={`h-5 rounded-md text-[11px] px-1.5 flex items-center justify-between cursor-pointer group pointer-events-auto transition-all select-none hover:shadow-[0_2px_6px_rgba(0,0,0,0.06)] hover:brightness-[0.98] active:scale-[0.99] relative mx-0.5 z-20 ${
                                        isCompleted ? 'opacity-70' : ''
                                      } ${draggedTaskId === task.id ? 'opacity-40' : ''}`}
                                    >
                                      {/* Left drag-resize handle */}
                                      <div 
                                        onMouseDown={(e) => handleResizeStart(e, task, 'start')}
                                        className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-neutral-400/20 hover:bg-neutral-400/40 z-30 transition-all duration-200"
                                        title="拖拽更改开始日期"
                                        onClick={(e) => e.stopPropagation()}
                                      />

                                      <div className="flex items-center space-x-1 overflow-hidden flex-1 mr-1 pl-1">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleTaskCompletionOnDay(task, renderStartDate);
                                          }}
                                          className="transition relative z-30 flex-shrink-0 focus:outline-none cursor-pointer"
                                        >
                                          <div className={`w-2.5 h-2.5 rounded-full border transition flex items-center justify-center ${
                                            isCompleted 
                                              ? 'bg-blue-500 border-blue-500 text-white' 
                                              : 'bg-white border-neutral-300 group-hover:border-neutral-400'
                                          }`}>
                                            {isCompleted && <Check className="w-1.5 h-1.5 stroke-[3.5] text-white" />}
                                          </div>
                                        </button>
                                        <span className={`font-medium tracking-tight text-[11px] truncate ${isCompleted ? 'line-through text-neutral-400' : ''}`} style={{ color: customStyle.color }}>
                                          {task.title}
                                        </span>
                                      </div>

                                      {/* Right drag-resize handle */}
                                      <div 
                                        onMouseDown={(e) => handleResizeStart(e, task, 'end')}
                                        className="absolute right-0 top-0 bottom-0 w-1 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-neutral-400/20 hover:bg-neutral-400/40 z-30 transition-all duration-200"
                                        title="拖拽更改结束日期"
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}

              {/* Left Hover Navigation Button */}
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  adjustBaseDate(-30);
                }}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white shadow-md hover:shadow-lg border border-neutral-200 text-neutral-600 hover:text-blue-600 hover:scale-110 active:scale-95 transition-all duration-200 opacity-0 group-hover/calendar:opacity-100 z-30 cursor-pointer flex items-center justify-center"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Right Hover Navigation Button */}
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  adjustBaseDate(30);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white shadow-md hover:shadow-lg border border-neutral-200 text-neutral-600 hover:text-blue-600 hover:scale-110 active:scale-95 transition-all duration-200 opacity-0 group-hover/calendar:opacity-100 z-30 cursor-pointer flex items-center justify-center"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              </div>
            </div>
          )}

        </div>

      </div>

      {/* RIGHT: Context-Sensitive Sidebar (3 cols) */}
      <div id="calendar-context-sidebar" className="lg:col-span-3 space-y-5 h-full flex flex-col min-w-0">
        
        {/* VIEW 1: THREE-DAY -> TODAY'S BAR */}
        {viewMode === 'three-day' && (
          <div className="space-y-4 min-w-0">
            
            {/* Notes Section */}
            <div className="context-card bg-white rounded-2xl p-4 border border-neutral-100 flex flex-col space-y-3 min-w-0">
              <div className="flex items-center justify-between pb-1.5 border-b border-neutral-100">
                <span className="text-xs font-extrabold text-neutral-800 flex items-center">
                  {selectedDateStr === todayStr ? '今日笔记' : `${selectedDateStr.substring(5)} 笔记`}
                </span>
                <button
                  type="button"
                  onClick={() => setShowNotesSection(!showNotesSection)}
                  className="text-neutral-400 hover:text-neutral-700 p-1 animate-pulse"
                >
                  {showNotesSection ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
              </div>

              {showNotesSection && (
                <div className="space-y-3">
                  {/* Notes List */}
                  <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                    {todayNotes.length === 0 ? null : (
                      todayNotes.map((note, idx) => (
                        <div
                          key={note.id}
                          draggable
                          onDragStart={(e) => handleNoteDragStart(e, idx)}
                          onDragOver={handleNoteDragOver}
                          onDrop={(e) => handleNoteDrop(e, idx)}
                          className="group/note bg-neutral-50/60 hover:bg-neutral-100/50 p-2.5 rounded-xl border border-neutral-100 text-[11px] text-neutral-700 relative flex flex-col space-y-1.5 transition shadow-sm hover:shadow"
                        >
                          {editingNoteId === note.id ? (
                            <div className="space-y-1.5 min-w-0">
                              <textarea
                                value={editNoteText}
                                onChange={(e) => setEditNoteText(e.target.value)}
                                className="w-full min-w-0 max-w-full text-[11px] p-2 border border-neutral-300 bg-white rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none h-14 font-medium resize-none"
                                autoFocus
                              />
                              <div className="flex justify-end space-x-1.5">
                                <button onClick={() => setEditingNoteId(null)} className="p-1 rounded text-neutral-400 hover:text-neutral-600 text-[11px]">取消</button>
                                <button onClick={() => saveNoteEdit(note.id)} className="px-2.5 py-1 rounded-lg bg-neutral-800 text-white hover:bg-black text-[11px] font-bold shadow-sm">保存</button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start justify-between">
                              {/* II-4. Click directly to edit */}
                              <span 
                                onClick={() => startEditNote(note)}
                                className="whitespace-pre-line flex-1 leading-relaxed cursor-pointer font-medium hover:text-blue-600 transition"
                                title="点击立即编辑笔记"
                              >
                                {note.content}
                              </span>
                              <div className="flex items-center space-x-0.5 opacity-0 group-hover/note:opacity-100 transition pl-1">
                                <GripVertical className="w-3.5 h-3.5 text-neutral-300 cursor-grab" />
                                <button onClick={() => onDeleteNote(note.id)} className="p-0.5 text-red-500 hover:text-red-700">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add Note Form */}
                  <form onSubmit={handleAddNoteSubmit} className="flex gap-1.5 min-w-0 w-full">
                    <input
                      type="text"
                      placeholder="随手记点什么..."
                      value={newNoteText}
                      onChange={(e) => setNewNoteText(e.target.value)}
                      className="flex-1 min-w-0 w-0 text-[11px] px-2.5 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:bg-white transition"
                    />
                    <button
                      type="submit"
                      className="p-1.5 bg-neutral-800 text-white rounded-lg hover:bg-neutral-900 transition flex items-center justify-center cursor-pointer flex-shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* Mood Section */}
            <div className="context-card bg-white rounded-2xl p-4 border border-neutral-100 flex flex-col space-y-3 min-w-0">
              <div className="flex items-center justify-between pb-1.5 border-b border-neutral-100">
                <span className="text-xs font-extrabold text-neutral-800 flex items-center">
                  {selectedDateStr === todayStr ? '今日心情' : `${selectedDateStr.substring(5)} 心情`}
                </span>
                <button
                  type="button"
                  onClick={() => setShowMoodSection(!showMoodSection)}
                  className="text-neutral-400 hover:text-neutral-700 p-1"
                >
                  {showMoodSection ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
              </div>

              {showMoodSection && (
                <div className="space-y-3">
                  <style>{`
                    @keyframes mood-hover {
                      0%, 100% { transform: scale(1.15) rotate(0deg); }
                      25% { transform: scale(1.15) rotate(-10deg); }
                      75% { transform: scale(1.15) rotate(10deg); }
                    }
                    @keyframes mood-pop {
                      0% { transform: scale(1); }
                      50% { transform: scale(1.3) rotate(10deg); }
                      100% { transform: scale(1.2) rotate(0deg); }
                    }
                    .animate-mood-pop {
                      animation: mood-pop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
                    }
                    .mood-btn:hover .mood-emoji-unselected {
                      animation: mood-hover 0.5s ease-in-out infinite !important;
                      filter: grayscale(0%) !important;
                      opacity: 1 !important;
                    }
                  `}</style>

                  {/* II-5. Highlight selected mood option */}
                  <div className="grid grid-cols-5 gap-1.5 py-1">
                     {MOOD_OPTIONS.map(opt => {
                      const isSelected = todayMood.emoji === opt.emoji;

                      return (
                        <button
                          key={opt.emoji}
                          type="button"
                          onClick={() => handleUpdateTodayMoodEmoji(opt.emoji)}
                          className="bg-transparent border-0 outline-none focus:outline-none p-1 flex items-center justify-center cursor-pointer select-none transition group mood-btn"
                          title={opt.label}
                        >
                          <span 
                            className={`mood-emoji text-2xl select-none transition-all duration-300 transform block origin-center ${
                              isSelected
                                ? 'grayscale-0 animate-mood-pop'
                                : 'grayscale opacity-40 mood-emoji-unselected'
                            }`}
                          >
                            {opt.char}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Mood text */}
                  {todayMood.emoji && (
                    <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-100 text-[11px] text-neutral-700">
                      {isEditingTodayMoodText ? (
                        <div className="space-y-1.5">
                          <input
                            type="text"
                            value={todayMoodText}
                            onChange={(e) => setTodayMoodText(e.target.value)}
                            className="w-full min-w-0 max-w-full text-[11px] p-2 border border-neutral-300 bg-white rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder={selectedDateStr === todayStr ? "写下今日心情感受..." : `写下 ${selectedDateStr.substring(5)} 心情感受...`}
                            autoFocus
                          />
                          <div className="flex justify-end space-x-1.5">
                            <button onClick={() => setIsEditingTodayMoodText(false)} className="text-[11px] text-neutral-400 hover:text-neutral-600">取消</button>
                            <button onClick={handleSaveTodayMoodText} className="text-[11px] text-blue-600 font-bold hover:underline">保存</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center gap-1">
                          {/* II-5. Click to edit directly */}
                          <span 
                            onClick={() => {
                              setIsEditingTodayMoodText(true);
                              setTodayMoodText(todayMood.text);
                            }}
                            className="italic cursor-pointer hover:text-blue-600 transition flex-1"
                            title="点击直接编辑心情感受"
                          >
                            {todayMood.text || (selectedDateStr === todayStr ? '「今天的感觉怎么样？点击写下简短心情日记」' : '「那天的感觉怎么样？点击写下简短心情日记」')}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        )}

        {/* VIEW 2: WEEK -> WEEK'S TASKS LIST */}
        {viewMode === 'week' && (() => {
          const weekUnscheduled = thisWeekTasks.filter(t => !t.date).sort((a, b) => a.order - b.order);
          const weekScheduled = thisWeekTasks.filter(t => !!t.date);
          
          return (
            <div 
              style={isLargeScreen ? { maxHeight: gridHeight } : {}}
              className="context-card bg-white rounded-2xl p-4 border border-neutral-100 flex flex-col space-y-4 h-full flex-1 min-h-[400px]"
            >
              <h3 className="text-xs font-bold text-neutral-800 pb-1.5 border-b border-neutral-100 flex items-center justify-between flex-shrink-0">
                <span>本周日程</span>
                <span className="text-[11px] bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded-lg font-semibold">共 {thisWeekTasks.length} 项</span>
              </h3>

              <div className="space-y-4 overflow-y-auto pr-1 flex-1 min-h-0">
                {/* 1. Unscheduled Tasks (待安排) */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between bg-neutral-50/80 border border-neutral-200/70 px-2.5 py-1.5 rounded-xl">
                    <span className="text-[11px] font-semibold text-neutral-700 flex items-center">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 mr-2" />
                      待安排日程
                    </span>
                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        onClick={() => setQuickAddUnscheduledWeek(startOfWeekStr)}
                        className="p-1 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-200/60 rounded-lg transition-all cursor-pointer flex items-center justify-center"
                        title="新增待安排日程"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[11px] font-semibold bg-white text-neutral-500 border border-neutral-200 px-2 py-0.5 rounded-md">
                        {weekUnscheduled.length}
                      </span>
                    </div>
                  </div>

                  {weekUnscheduled.length === 0 ? (
                    <button 
                      type="button"
                      onDragOver={handleTaskDragOver}
                      onDrop={(e) => handleUnscheduledContainerDrop(e, 'week')}
                      onClick={() => setQuickAddUnscheduledWeek(startOfWeekStr)}
                      className="w-full py-4 text-center border border-dashed border-neutral-200 hover:border-neutral-300 rounded-xl bg-neutral-50/40 hover:bg-neutral-50 transition-all text-[11px] text-neutral-400 hover:text-neutral-600 italic font-normal flex items-center justify-center gap-1 cursor-pointer"
                    >
                      像雪一样白
                    </button>
                  ) : (
                    <div 
                      onDragOver={handleTaskDragOver}
                      onDrop={(e) => handleUnscheduledContainerDrop(e, 'week')}
                      className="space-y-2 py-1"
                    >
                      {weekUnscheduled.map(task => (
                        <div 
                          key={task.id} 
                          draggable
                          data-task-drop-position={getTaskDropPosition(task.id, 'context')}
                          data-task-drop-surface="context"
                          onDragStart={(e) => handleTaskDragStart(e, task.id, task.date || '', 0, 'context')}
                          onDragEnd={handleTaskDragEnd}
                          onDragOver={(e) => handleTaskItemDragOver(e, task.id)}
                          onDrop={(e) => handleUnscheduledTaskDropOnTask(e, task, 'week')}
                          onClick={() => openEditTaskModal(task)}
                          className={`unscheduled-task-card p-2.5 rounded-xl border text-xs cursor-grab transition relative group/item ${
                            draggedTaskId === task.id && taskDragSurface === 'context' ? 'opacity-55 scale-[0.99]' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1.5">
                            <div className="flex items-center space-x-2 overflow-hidden flex-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleTaskCompletionOnDay(task, todayStr);
                                }}
                                className="transition relative z-30 flex-shrink-0 focus:outline-none cursor-pointer"
                              >
                                <div className={`w-4 h-4 rounded-full border transition flex items-center justify-center ${
                                  isTaskCompletedOnDay(task, todayStr)
                                    ? 'bg-blue-500 border-blue-500 text-white' 
                                    : 'bg-white border-neutral-300 group-hover:border-neutral-400'
                                }`}>
                                  {isTaskCompletedOnDay(task, todayStr) && <Check className="w-2.5 h-2.5 stroke-[3] text-white" />}
                                </div>
                              </button>
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-300 flex-shrink-0" />
                              <span className={`font-semibold text-neutral-800 truncate ${task.completed ? 'line-through text-neutral-400 opacity-60' : ''}`}>
                                {task.title}
                              </span>
                            </div>
                            <GripVertical className="w-3.5 h-3.5 text-neutral-300 group-hover/item:text-neutral-500 flex-shrink-0 cursor-grab" />
                          </div>

                          <div className="flex items-center justify-between mt-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className="unscheduled-status-badge text-[11px] px-1.5 py-0.5 rounded font-semibold">待安排</span>
                              <span className="text-[11px] border px-1.5 py-0.5 rounded font-medium" style={getCategoryBadgeStyles(categories.find(c => c.id === task.categoryId))}>
                                {categories.find(c => c.id === task.categoryId)?.name || '未分类'}
                              </span>
                            </div>
                            
                            <span className={`text-[11px] px-1 py-0.2 rounded font-bold ${
                              task.urgency === 'high' ? 'bg-red-100 text-red-700' :
                              task.urgency === 'medium' ? 'bg-orange-100 text-orange-700' :
                              task.urgency === 'low' ? 'bg-blue-100 text-blue-700' : 'bg-neutral-100 text-neutral-400'
                            }`}>
                              {task.urgency === 'high' ? '高' :
                               task.urgency === 'medium' ? '中' :
                               task.urgency === 'low' ? '低' : '无'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. Scheduled Tasks (已安排) */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between bg-neutral-50 border border-neutral-100 px-2.5 py-1.5 rounded-xl">
                    <span className="text-[11px] font-black text-neutral-600 flex items-center">
                      <Clock className="w-3.5 h-3.5 mr-1.5 text-neutral-400" />
                      已确定日程
                    </span>
                    <span className="text-[11px] font-black bg-neutral-200 text-neutral-700 px-2 py-0.5 rounded-md">
                      {weekScheduled.length}
                    </span>
                  </div>

                  {weekScheduled.length === 0 ? (
                    <div className="text-[11px] text-neutral-400 py-4 text-center border border-dashed border-neutral-200 rounded-xl italic">
                      空空白白，真好～
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {weekScheduled.sort((a, b) => {
                        const dateComparison = (a.date || '').localeCompare(b.date || '');
                        return dateComparison || a.order - b.order;
                      }).map(task => {
                        const taskDate = task.date || todayStr;
                        return (
                          <div 
                            key={task.id} 
                            draggable
                            data-task-drop-position={getTaskDropPosition(task.id, 'context')}
                            data-task-drop-surface="context"
                            onDragStart={(e) => handleTaskDragStart(e, task.id, taskDate, 0, 'context')}
                            onDragEnd={handleTaskDragEnd}
                            onDragOver={(e) => handleTaskItemDragOver(e, task.id)}
                            onDrop={(e) => handleTaskDropOnTaskItem(e, task, taskDate)}
                            onClick={() => openEditTaskModal(task)}
                            className={`p-2.5 bg-neutral-50/50 hover:bg-neutral-100/50 rounded-xl border border-neutral-100 text-xs cursor-pointer hover:shadow-sm transition ${
                              draggedTaskId === task.id && taskDragSurface === 'context' ? 'opacity-55 scale-[0.99]' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1.5">
                              <div className="flex items-center space-x-2 overflow-hidden flex-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleTaskCompletionOnDay(task, taskDate);
                                  }}
                                  className="transition relative z-30 flex-shrink-0 focus:outline-none cursor-pointer"
                                >
                                  <div className={`w-4 h-4 rounded-full border transition flex items-center justify-center ${
                                    isTaskCompletedOnDay(task, taskDate)
                                      ? 'bg-blue-500 border-blue-500 text-white' 
                                      : 'bg-white border-neutral-300 group-hover:border-neutral-400'
                                  }`}>
                                    {isTaskCompletedOnDay(task, taskDate) && <Check className="w-2.5 h-2.5 stroke-[3] text-white" />}
                                  </div>
                                </button>
                                <span className={`font-semibold truncate ${task.completed ? 'line-through text-neutral-400' : 'text-neutral-800'}`}>
                                  {task.title}
                                </span>
                              </div>
                              <span className="text-[11px] bg-neutral-200/80 text-neutral-600 px-1.5 py-0.2 rounded font-semibold flex-shrink-0">
                                {task.date}
                              </span>
                            </div>

                            <div className="flex items-center justify-between mt-1.5 gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-[11px] text-neutral-400 font-mono flex-shrink-0">
                                  {task.time || '全天日程'}
                                </span>
                                <span className="text-[11px] border px-1.5 py-0.5 rounded font-medium truncate" style={getCategoryBadgeStyles(categories.find(c => c.id === task.categoryId))}>
                                  {categories.find(c => c.id === task.categoryId)?.name || '未分类'}
                                </span>
                              </div>
                              
                              <span className={`text-[11px] px-1 py-0.2 rounded font-bold ${
                                task.urgency === 'high' ? 'bg-red-100 text-red-700' :
                                task.urgency === 'medium' ? 'bg-orange-100 text-orange-700' :
                                task.urgency === 'low' ? 'bg-blue-100 text-blue-700' : 'bg-neutral-100 text-neutral-400'
                              }`}>
                                {task.urgency === 'high' ? '高' :
                                 task.urgency === 'medium' ? '中' :
                                 task.urgency === 'low' ? '低' : '无'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            </div>
          );
        })()}

        {/* VIEW 3: MONTH -> MONTH'S TASKS LIST */}
        {viewMode === 'month' && (() => {
          const monthUnscheduled = thisMonthTasks.filter(t => !t.date).sort((a, b) => a.order - b.order);
          const monthScheduled = thisMonthTasks.filter(t => !!t.date);
          
          return (
            <div 
              style={isLargeScreen ? { maxHeight: gridHeight } : {}}
              className="context-card bg-white rounded-2xl p-4 border border-neutral-100 flex flex-col space-y-4 h-full flex-1 min-h-[400px]"
            >
              <h3 className="text-xs font-bold text-neutral-800 pb-1.5 border-b border-neutral-100 flex items-center justify-between flex-shrink-0">
                <span>本月日程</span>
                <span className="text-[11px] bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded-lg font-semibold">共 {thisMonthTasks.length} 项</span>
              </h3>

              <div className="space-y-4 overflow-y-auto pr-1 flex-1 min-h-0">
                {/* 1. Unscheduled Tasks (待安排) */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between bg-neutral-50/80 border border-neutral-200/70 px-2.5 py-1.5 rounded-xl">
                    <span className="text-[11px] font-semibold text-neutral-700 flex items-center">
                      待安排日程
                    </span>
                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        onClick={() => setQuickAddUnscheduledMonth(startOfMonthStr.substring(0, 7))}
                        className="p-1 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-200/60 rounded-lg transition-all cursor-pointer flex items-center justify-center"
                        title="新增待安排日程"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[11px] font-semibold bg-white text-neutral-500 border border-neutral-200 px-2 py-0.5 rounded-md">
                        {monthUnscheduled.length}
                      </span>
                    </div>
                  </div>

                  {monthUnscheduled.length === 0 ? (
                    <button 
                      type="button"
                      onDragOver={handleTaskDragOver}
                      onDrop={(e) => handleUnscheduledContainerDrop(e, 'month')}
                      onClick={() => setQuickAddUnscheduledMonth(startOfMonthStr.substring(0, 7))}
                      className="w-full py-4 text-center border border-dashed border-neutral-200 hover:border-neutral-300 rounded-xl bg-neutral-50/40 hover:bg-neutral-50 transition-all text-[11px] text-neutral-400 hover:text-neutral-600 italic font-normal flex items-center justify-center gap-1 cursor-pointer"
                    >
                      像雪一样白
                    </button>
                  ) : (
                    <div 
                      onDragOver={handleTaskDragOver}
                      onDrop={(e) => handleUnscheduledContainerDrop(e, 'month')}
                      className="space-y-2 py-1"
                    >
                      {monthUnscheduled.map(task => (
                        <div 
                          key={task.id} 
                          draggable
                          data-task-drop-position={getTaskDropPosition(task.id, 'context')}
                          data-task-drop-surface="context"
                          onDragStart={(e) => handleTaskDragStart(e, task.id, task.date || '', 0, 'context')}
                          onDragEnd={handleTaskDragEnd}
                          onDragOver={(e) => handleTaskItemDragOver(e, task.id)}
                          onDrop={(e) => handleUnscheduledTaskDropOnTask(e, task, 'month')}
                          onClick={() => openEditTaskModal(task)}
                          className={`unscheduled-task-card p-2.5 rounded-xl border text-xs cursor-grab transition relative group/item ${
                            draggedTaskId === task.id && taskDragSurface === 'context' ? 'opacity-55 scale-[0.99]' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1.5">
                            <div className="flex items-center space-x-2 overflow-hidden flex-1">
                              <button
                                type="button"
                                aria-label={`${isTaskCompletedOnDay(task, todayStr) ? '取消完成' : '完成'}：${task.title}`}
                                title={isTaskCompletedOnDay(task, todayStr) ? '点击取消完成' : '点击标记完成'}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleTaskCompletionOnDay(task, todayStr);
                                }}
                                className="group/check relative z-30 flex-shrink-0 focus:outline-none cursor-pointer after:absolute after:-inset-1.5 after:rounded-full after:content-['']"
                              >
                                <div className={`w-4 h-4 rounded-full border transition-colors flex items-center justify-center ${
                                  isTaskCompletedOnDay(task, todayStr)
                                    ? 'bg-blue-500 border-blue-500 text-white group-hover/check:bg-blue-600 group-hover/check:border-blue-600' 
                                    : 'bg-white border-neutral-300 group-hover/check:border-blue-400 group-hover/check:bg-blue-50/60'
                                }`}>
                                  {isTaskCompletedOnDay(task, todayStr) && <Check className="w-2.5 h-2.5 stroke-[3] text-white" />}
                                </div>
                              </button>
                              <span className={`font-semibold text-neutral-800 truncate ${task.completed ? 'line-through text-neutral-400 opacity-60' : ''}`}>
                                {task.title}
                              </span>
                            </div>
                            <GripVertical className="w-3.5 h-3.5 text-neutral-300 group-hover/item:text-neutral-500 flex-shrink-0 cursor-grab" />
                          </div>

                          <div className="flex items-center justify-between mt-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className="unscheduled-status-badge text-[11px] px-1.5 py-0.5 rounded font-semibold">待安排</span>
                              <span
                                className="text-[11px] border px-1.5 py-0.5 rounded font-medium"
                                style={getCategoryBadgeStyles(categories.find(c => c.id === task.categoryId))}
                              >
                                {categories.find(c => c.id === task.categoryId)?.name || '未分类'}
                              </span>
                            </div>
                            
                            <span className={`text-[11px] px-1 py-0.2 rounded font-bold ${
                              task.urgency === 'high' ? 'bg-red-100 text-red-700' :
                              task.urgency === 'medium' ? 'bg-orange-100 text-orange-700' :
                              task.urgency === 'low' ? 'bg-blue-100 text-blue-700' : 'bg-neutral-100 text-neutral-400'
                            }`}>
                              {task.urgency === 'high' ? '高' :
                               task.urgency === 'medium' ? '中' :
                               task.urgency === 'low' ? '低' : '无'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. Scheduled Tasks (已安排) */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between bg-neutral-50 border border-neutral-100 px-2.5 py-1.5 rounded-xl">
                    <span className="text-[11px] font-black text-neutral-600 flex items-center">
                      <Clock className="w-3.5 h-3.5 mr-1.5 text-neutral-400" />
                      已确定日程
                    </span>
                    <span className="text-[11px] font-black bg-neutral-200 text-neutral-700 px-2 py-0.5 rounded-md">
                      {monthScheduled.length}
                    </span>
                  </div>

                  {monthScheduled.length === 0 ? (
                    <div className="text-[11px] text-neutral-400 py-4 text-center border border-dashed border-neutral-200 rounded-xl italic">
                      空空白白，真好～
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {monthScheduled.sort((a, b) => {
                        const dateComparison = (a.date || '').localeCompare(b.date || '');
                        return dateComparison || a.order - b.order;
                      }).map(task => {
                        const taskDate = task.date || todayStr;
                        return (
                          <div 
                            key={task.id} 
                            draggable
                            data-task-drop-position={getTaskDropPosition(task.id, 'context')}
                            data-task-drop-surface="context"
                            onDragStart={(e) => handleTaskDragStart(e, task.id, taskDate, 0, 'context')}
                            onDragEnd={handleTaskDragEnd}
                            onDragOver={(e) => handleTaskItemDragOver(e, task.id)}
                            onDrop={(e) => handleTaskDropOnTaskItem(e, task, taskDate)}
                            onClick={() => openEditTaskModal(task)}
                            className={`p-2.5 bg-neutral-50/50 hover:bg-neutral-100/50 rounded-xl border border-neutral-100 text-xs cursor-pointer hover:shadow-sm transition animate-fade-in ${
                              draggedTaskId === task.id && taskDragSurface === 'context' ? 'opacity-55 scale-[0.99]' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1.5">
                              <div className="flex items-center space-x-2 overflow-hidden flex-1">
                                <button
                                  type="button"
                                  aria-label={`${isTaskCompletedOnDay(task, taskDate) ? '取消完成' : '完成'}：${task.title}`}
                                  title={isTaskCompletedOnDay(task, taskDate) ? '点击取消完成' : '点击标记完成'}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleTaskCompletionOnDay(task, taskDate);
                                  }}
                                  className="group/check relative z-30 flex-shrink-0 focus:outline-none cursor-pointer after:absolute after:-inset-1.5 after:rounded-full after:content-['']"
                                >
                                  <div className={`w-4 h-4 rounded-full border transition-colors flex items-center justify-center ${
                                    isTaskCompletedOnDay(task, taskDate)
                                      ? 'bg-blue-500 border-blue-500 text-white group-hover/check:bg-blue-600 group-hover/check:border-blue-600' 
                                      : 'bg-white border-neutral-300 group-hover/check:border-blue-400 group-hover/check:bg-blue-50/60'
                                  }`}>
                                    {isTaskCompletedOnDay(task, taskDate) && <Check className="w-2.5 h-2.5 stroke-[3] text-white" />}
                                  </div>
                                </button>
                                <span className={`font-semibold truncate ${task.completed ? 'line-through text-neutral-400' : 'text-neutral-800'}`}>
                                  {task.title}
                                </span>
                              </div>
                              <span className="text-[11px] bg-neutral-200/80 text-neutral-600 px-1.5 py-0.2 rounded font-semibold flex-shrink-0">
                                {task.date?.substring(5)}
                              </span>
                            </div>

                            <div className="flex items-center justify-between mt-1.5 gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-[11px] text-neutral-400 flex-shrink-0">
                                  {task.time || '全天日程'}
                                </span>
                                <span
                                  className="text-[11px] border px-1.5 py-0.5 rounded font-medium truncate"
                                  style={getCategoryBadgeStyles(categories.find(c => c.id === task.categoryId))}
                                >
                                  {categories.find(c => c.id === task.categoryId)?.name || '未分类'}
                                </span>
                              </div>
                              
                              <span className={`text-[11px] px-1 py-0.2 rounded font-bold ${
                                task.urgency === 'high' ? 'bg-red-100 text-red-700' :
                                task.urgency === 'medium' ? 'bg-orange-100 text-orange-700' :
                                task.urgency === 'low' ? 'bg-blue-100 text-blue-700' : 'bg-neutral-100 text-neutral-400'
                              }`}>
                                {task.urgency === 'high' ? '高' :
                                 task.urgency === 'medium' ? '中' :
                                 task.urgency === 'low' ? '低' : '无'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            </div>
          );
        })()}

      </div>

      {/* QUICK ADD TASK DIALOG OVERLAY */}
      {(quickAddTaskDate || quickAddUnscheduledWeek || quickAddUnscheduledMonth) && (
        <div className="planner-modal-overlay fixed inset-0 bg-black/60 backdrop-blur-sm flex z-50 animate-fade-in">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (!quickAddTaskTitle.trim()) return;
              if (quickAddTaskDate) {
                onAddTask(quickAddTaskTitle.trim(), quickAddTaskCatId || undefined, { date: quickAddTaskDate });
              } else if (quickAddUnscheduledWeek) {
                onAddTask(quickAddTaskTitle.trim(), quickAddTaskCatId || undefined, { scheduledWeek: quickAddUnscheduledWeek });
              } else if (quickAddUnscheduledMonth) {
                onAddTask(quickAddTaskTitle.trim(), quickAddTaskCatId || undefined, { scheduledMonth: quickAddUnscheduledMonth });
              }
              setQuickAddTaskTitle('');
              setQuickAddTaskDate(null);
              setQuickAddUnscheduledWeek(null);
              setQuickAddUnscheduledMonth(null);
            }} 
            className="planner-modal-panel bg-white rounded-3xl border border-neutral-200 p-5 w-full max-w-sm shadow-2xl space-y-4 text-xs"
          >
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
              <span className="font-bold text-neutral-800 text-sm flex items-center">
                <Plus className="w-4 h-4 mr-1 text-blue-500" />
                {quickAddTaskDate 
                  ? `新增任务于 ${quickAddTaskDate}` 
                  : quickAddUnscheduledWeek 
                    ? `新增本周待安排日程` 
                    : `新增本月待安排日程`}
              </span>
              <button 
                type="button" 
                onClick={() => {
                  setQuickAddTaskDate(null);
                  setQuickAddUnscheduledWeek(null);
                  setQuickAddUnscheduledMonth(null);
                }}
                className="text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-neutral-400 block mb-1">任务标题</label>
              <input
                type="text"
                required
                placeholder="想要规划什么事..."
                value={quickAddTaskTitle}
                onChange={(e) => setQuickAddTaskTitle(e.target.value)}
                className="w-full p-2.5 bg-neutral-50 rounded-xl border border-neutral-200 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs font-semibold"
                autoFocus
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-neutral-400 block mb-1">任务分类</label>
              <Select
                value={quickAddTaskCatId}
                onChange={(e) => setQuickAddTaskCatId(e.target.value)}
                className="w-full p-2.5 bg-white border border-neutral-200 rounded-xl text-xs font-medium focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="">未分类</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </div>

            <div className="flex justify-end space-x-2 pt-1">
              <button 
                type="button" 
                onClick={() => {
                  setQuickAddTaskDate(null);
                  setQuickAddUnscheduledWeek(null);
                  setQuickAddUnscheduledMonth(null);
                }}
                className="px-4 py-2 bg-neutral-100 text-neutral-600 rounded-xl font-bold hover:bg-neutral-200 transition cursor-pointer"
              >
                取消
              </button>
              <button 
                type="submit"
                className="px-4 py-2 bg-neutral-800 text-white rounded-xl font-bold hover:bg-neutral-900 transition cursor-pointer"
              >
                添加任务
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PREMIUM FULL TASK EDIT MODAL (Saves changes immediately) */}
      {editingTask && (
        <div className="planner-modal-overlay fixed inset-0 bg-black/60 backdrop-blur-sm flex z-50 animate-fade-in">
          <div className="planner-modal-panel bg-white rounded-3xl border border-neutral-200 p-4 w-full max-w-2xl shadow-2xl space-y-3 text-xs relative">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
              <span className="font-extrabold text-neutral-800 text-sm flex items-center">
                <Edit2 className="w-4 h-4 mr-2 text-blue-500" />
                任务编辑
              </span>
              <button 
                type="button" 
                onClick={() => setEditingTask(null)}
                className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-neutral-100 pb-1 -mt-1">
              <button
                type="button"
                onClick={() => setActiveModalTab('basic')}
                className={`flex-1 pb-2 text-xs font-bold border-b-2 transition-all cursor-pointer text-center ${
                  activeModalTab === 'basic'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-neutral-400 hover:text-neutral-600'
                }`}
              >
                基本信息
              </button>
              <button
                type="button"
                onClick={() => setActiveModalTab('content')}
                className={`flex-1 pb-2 text-xs font-bold border-b-2 transition-all cursor-pointer text-center flex items-center justify-center space-x-1 ${
                  activeModalTab === 'content'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-neutral-400 hover:text-neutral-600'
                }`}
              >
                <span>子任务</span>
                {editTaskSubtasks.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 text-[11px] bg-blue-100 text-blue-700 rounded-full font-extrabold">
                    {editTaskSubtasks.filter(s => s.completed).length}/{editTaskSubtasks.length}
                  </span>
                )}
              </button>
            </div>

            {activeModalTab === 'content' ? (
              <div className="space-y-3 animate-fade-in">
                {/* Task Title Header - Simple & Clean */}
                <div className="pb-1">
                  <h3 className="text-sm font-extrabold text-neutral-800">{editTaskTitle || '无标题任务'}</h3>
                  {editTaskDesc && (
                    <p className="text-[11px] text-neutral-400 font-medium mt-0.5 italic truncate">
                      {editTaskDesc}
                    </p>
                  )}
                </div>

                {/* Subtask Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-neutral-400 font-bold uppercase tracking-wider">
                    <span>子任务清单 ({editTaskSubtasks.length})</span>
                    {editTaskSubtasks.length > 0 && (
                      <span className="text-blue-600 font-semibold lowercase">
                        已完成 {editTaskSubtasks.filter(s => s.completed).length}/{editTaskSubtasks.length}
                      </span>
                    )}
                  </div>

                  {/* Progress Bar */}
                  {editTaskSubtasks.length > 0 && (
                    <div className="w-full h-1 bg-neutral-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full transition-all duration-300"
                        style={{ width: `${(editTaskSubtasks.filter(s => s.completed).length / editTaskSubtasks.length) * 100}%` }}
                      />
                    </div>
                  )}

                  {/* Subtasks Listing */}
                  <div className="space-y-1 max-h-[220px] overflow-y-auto pr-1">
                    {editTaskSubtasks.length > 0 && (
                      editTaskSubtasks.sort((a,b) => a.order - b.order).map((sub, sIdx) => (
                        <div 
                          key={sub.id} 
                          draggable
                          onDragStart={(e) => handleSubDragStart(e, sIdx)}
                          onDragEnd={() => setDraggedSubIndex(null)}
                          onDragOver={handleSubDragOver}
                          onDrop={(e) => handleSubDrop(e, sIdx)}
                          className={`flex items-center justify-between py-1.5 px-2 hover:bg-neutral-50/60 rounded-xl group/sub text-xs transition ${
                            draggedSubIndex === sIdx ? 'opacity-35 bg-neutral-100/50' : ''
                          }`}
                        >
                          <div className="flex items-center space-x-2 flex-1 min-w-0">
                            {/* Drag Handle */}
                            <div 
                              className="cursor-grab active:cursor-grabbing p-0.5 text-neutral-300 hover:text-neutral-500 opacity-0 group-hover/sub:opacity-100 transition-opacity"
                              title="拖曳调整顺序"
                            >
                              <GripVertical className="w-3.5 h-3.5" />
                            </div>

                            <button 
                              type="button" 
                              onClick={() => toggleSubtask(sub.id)} 
                              className="transition relative z-30 flex-shrink-0 focus:outline-none cursor-pointer"
                            >
                              <div className={`w-3.5 h-3.5 rounded-full border transition flex items-center justify-center ${
                                sub.completed 
                                  ? 'bg-blue-500 border-blue-500 text-white' 
                                  : 'bg-white border-neutral-300'
                              }`}>
                                {sub.completed && <Check className="w-2.5 h-2.5 stroke-[3] text-white" />}
                              </div>
                            </button>
                            
                            {editingSubtaskId === sub.id ? (
                              <input
                                type="text"
                                value={editSubtaskTitle}
                                onChange={(e) => setEditSubtaskTitle(e.target.value)}
                                onBlur={() => handleSaveSubtaskTitle(sub.id)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSaveSubtaskTitle(sub.id);
                                  } else if (e.key === 'Escape') {
                                    setEditingSubtaskId(null);
                                  }
                                }}
                                className="flex-1 p-0.5 bg-neutral-50 border border-neutral-200 rounded text-xs focus:outline-none focus:border-blue-500 font-semibold"
                                autoFocus
                              />
                            ) : (
                              <span 
                                onClick={() => startEditSubtask(sub.id, sub.title)}
                                className={`truncate flex-1 font-semibold cursor-pointer select-none ${sub.completed ? 'text-neutral-400 line-through' : 'text-neutral-700 hover:text-neutral-900'}`}
                                title="点击编辑子任务"
                              >
                                {sub.title}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center space-x-1 opacity-0 group-hover/sub:opacity-100 transition duration-150 pl-2">
                            <button 
                              type="button" 
                              onClick={() => deleteSubtask(sub.id)} 
                              className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add Subtask Input */}
                  <div className="flex gap-2 pt-1 min-w-0">
                    <input
                      type="text"
                      placeholder="添加新子任务标题..."
                      value={newSubtaskTitle}
                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                      onKeyDown={handleNewSubtaskKeyDown}
                      className="flex-1 min-w-0 w-0 px-3 py-1.5 bg-neutral-50 hover:bg-neutral-100/50 focus:bg-white border border-neutral-200 focus:border-blue-500 rounded-xl text-xs font-semibold focus:outline-none transition-all placeholder-neutral-400"
                    />
                    <button 
                      type="button" 
                      onClick={handleAddSubtask}
                      className="px-3.5 py-1.5 bg-neutral-800 text-white text-xs font-bold rounded-xl hover:bg-neutral-900 transition flex items-center cursor-pointer shadow-sm flex-shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      添加
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Layout Grid */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-7 items-start">
              
              {/* Left Column: Basic Details */}
              <div className="space-y-2.5">
                <div>
                  <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-0.5">任务名称</label>
                  <input
                    type="text"
                    value={editTaskTitle}
                    onChange={(e) => setEditTaskTitle(e.target.value)}
                    placeholder="输入日程任务标题..."
                    className="w-full py-2 px-3 bg-neutral-50 hover:bg-neutral-100/50 focus:bg-white border border-neutral-200 focus:border-blue-500 rounded-xl font-bold text-xs focus:outline-none transition-all placeholder-neutral-400"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-0.5">描述信息</label>
                  <textarea
                    value={editTaskDesc}
                    onChange={(e) => setEditTaskDesc(e.target.value)}
                    placeholder="添加任务备注或说明细节..."
                    className="w-full py-2 px-3 bg-neutral-50 hover:bg-neutral-100/50 focus:bg-white border border-neutral-200 focus:border-blue-500 rounded-xl text-xs h-16 focus:outline-none transition-all resize-none placeholder-neutral-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-0.5">任务分类</label>
                    <Select
                      value={editTaskCatId}
                      onChange={(e) => setEditTaskCatId(e.target.value)}
                      className="w-full py-2 px-2.5 bg-white border border-neutral-200 hover:border-neutral-300 rounded-xl text-xs font-semibold focus:border-blue-500 focus:outline-none cursor-pointer transition-all shadow-sm"
                    >
                      <option value="">未分类</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </Select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-0.5">优先级</label>
                    <Select
                      value={editTaskUrgency}
                      onChange={(e) => setEditTaskUrgency(e.target.value as Urgency)}
                      className="w-full py-2 px-2.5 bg-white border border-neutral-200 hover:border-neutral-300 rounded-xl text-xs font-semibold focus:border-blue-500 focus:outline-none cursor-pointer transition-all shadow-sm"
                    >
                      <option value="none">无</option>
                      <option value="low">🟩 低优先级</option>
                      <option value="medium">🟨 中优先级</option>
                      <option value="high">🟥 高优先级</option>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Right Column: Scheduling & Repeating (Visual Shaded Card) */}
              <div className="space-y-3">
                
                {/* Schedule Type Tabs */}
                <div>
                  <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">任务排期</label>
                  <div className="grid grid-cols-4 gap-1 p-0.5 bg-neutral-100 rounded-xl border border-neutral-200/60">
                    {(
                      [
                        { value: 'date', label: '天' },
                        { value: 'week', label: '周' },
                        { value: 'month', label: '月' },
                        { value: 'none', label: '待安排' }
                      ] as const
                    ).map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setEditTaskScheduleType(opt.value)}
                        className={`py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                          editTaskScheduleType === opt.value
                            ? 'bg-white text-neutral-800 shadow-sm'
                            : 'text-neutral-500 hover:text-neutral-700'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dynamic Content based on Schedule Type */}
                <div className="mt-2">
                  {editTaskScheduleType === 'date' && (
                    <div className="space-y-2.5 w-full animate-fade-in">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[11px] font-bold text-neutral-500 block mb-0.5">开始日期</label>
                          <PlannerDatePicker
                            value={editTaskDate}
                            ariaLabel="开始日期"
                            onChange={(newStart) => {
                              setEditTaskDate(newStart);
                              if (editTaskEndDate && newStart > editTaskEndDate) {
                                  setEditTaskEndDate('');
                              }
                            }}
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-neutral-500 block mb-0.5">结束日期</label>
                          <PlannerDatePicker
                            value={editTaskEndDate}
                            ariaLabel="结束日期"
                            onChange={(newEnd) => {
                              if (!editTaskDate || newEnd >= editTaskDate) {
                                setEditTaskEndDate(newEnd);
                              } else {
                                setEditTaskEndDate(editTaskDate);
                              }
                            }}
                            min={editTaskDate}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-neutral-500 block mb-0.5">具体时间</label>
                        <div className="flex gap-2">
                          <input
                            type="time"
                            value={editTaskTime || ''}
                            onChange={(e) => setEditTaskTime(e.target.value)}
                            className="flex-1 py-2 px-2.5 bg-white border border-neutral-200 rounded-xl text-xs font-semibold focus:border-blue-500 focus:outline-none shadow-sm"
                          />
                          {editTaskTime && (
                            <button
                              type="button"
                              onClick={() => setEditTaskTime('')}
                              className="px-2.5 bg-neutral-100 hover:bg-red-50 hover:text-red-600 text-neutral-500 rounded-xl text-xs font-bold transition-all border border-neutral-200/60 cursor-pointer flex items-center justify-center shrink-0"
                              title="清除时间"
                            >
                              清除
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {editTaskScheduleType === 'week' && (
                    <div className="w-full animate-fade-in space-y-1">
                      <label className="text-[11px] font-bold text-neutral-500 block">选择日期定位至该周周一</label>
                      <PlannerDatePicker
                        value={editTaskScheduledWeek}
                        ariaLabel="选择日期定位至该周"
                        onChange={(val) => {
                          if (!val) {
                            setEditTaskScheduledWeek('');
                            return;
                          }
                          const d = new Date(val);
                          if (!isNaN(d.getTime())) {
                            const day = d.getDay();
                            const diff = d.getDate() - day + (day === 0 ? -6 : 1);
                            const monday = new Date(d.setDate(diff));
                            setEditTaskScheduledWeek(formatDate(monday));
                          } else {
                            setEditTaskScheduledWeek(val);
                          }
                        }}
                      />
                      {editTaskScheduledWeek && (
                        <p className="text-[11px] text-blue-600 font-extrabold mt-1">
                          已选中：{getWeekOptionLabel(editTaskScheduledWeek)}
                        </p>
                      )}
                    </div>
                  )}

                  {editTaskScheduleType === 'month' && (
                    <div className="w-full animate-fade-in space-y-1">
                      <label className="text-[11px] font-bold text-neutral-500 block">选择月份</label>
                      <PlannerDatePicker
                        mode="month"
                        value={editTaskScheduledMonth}
                        ariaLabel="选择月份"
                        onChange={setEditTaskScheduledMonth}
                      />
                      {editTaskScheduledMonth && (
                        <p className="text-[11px] text-blue-600 font-extrabold mt-1">
                          已选中：{getMonthOptionLabel(editTaskScheduledMonth, 100)}
                        </p>
                      )}
                    </div>
                  )}

                  {editTaskScheduleType === 'none' && null}
                </div>

                {/* Repeating and Reminder side by side */}
                {editTaskScheduleType === 'date' && (
                  <div className="grid grid-cols-2 gap-2 border-t border-neutral-200/50 pt-2.5">
                    <div>
                      <label className="text-[11px] font-bold text-neutral-500 block mb-0.5">重复设置</label>
                      <Select
                        value={editTaskRepeat}
                        onChange={(e) => setEditTaskRepeat(e.target.value as any)}
                        className="w-full py-2 px-2.5 bg-white border border-neutral-200 hover:border-neutral-300 rounded-xl text-xs font-semibold cursor-pointer focus:border-blue-500 focus:outline-none shadow-sm transition-all"
                      >
                        <option value="none">不重复</option>
                        <option value="daily">每天</option>
                        <option value="weekly">每周</option>
                        <option value="monthly">每月</option>
                      </Select>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-neutral-500 block mb-0.5">提醒</label>
                      <Select
                        value={editTaskReminder}
                        onChange={(e) => setEditTaskReminder(e.target.value as any)}
                        className="w-full py-2 px-2.5 bg-white border border-neutral-200 hover:border-neutral-300 rounded-xl text-xs font-semibold cursor-pointer focus:border-blue-500 focus:outline-none shadow-sm transition-all"
                      >
                        <option value="none">无提醒</option>
                        <option value="5m">5 分钟前</option>
                        <option value="15m">15 分钟前</option>
                        <option value="1h">1 小时前</option>
                        <option value="1d">1 天前</option>
                      </Select>
                    </div>
                  </div>
                )}

              </div>

            </div>
            )}

            {/* Actions Bar */}
            <div className="flex items-center justify-between pt-3 border-t border-neutral-100 gap-3">
              <button
                type="button"
                onClick={handleModalDeleteTask}
                className="px-3 py-2 bg-red-50 hover:bg-red-100/80 text-red-600 rounded-xl font-extrabold transition flex items-center border border-red-200/50 shadow-sm cursor-pointer"
                title="删除此任务"
              >
                <Trash className="w-3.5 h-3.5 mr-1.5" />
                删除
              </button>

              <div className="flex space-x-2">
                <button 
                  type="button" 
                  onClick={() => setEditingTask(null)}
                  className="px-3.5 py-2 bg-neutral-100 text-neutral-600 rounded-xl font-extrabold hover:bg-neutral-200 transition cursor-pointer"
                >
                  取消
                </button>
                <button 
                  type="button" 
                  onClick={handleSaveModalTaskEdits}
                  className="px-5 py-2 bg-neutral-800 hover:bg-neutral-900 text-white font-extrabold rounded-xl shadow-md transition cursor-pointer"
                >
                  保存修改
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Draggable Floating Trash Window for removing task schedule */}
      {!editingTask && !quickAddTaskDate && !quickAddUnscheduledWeek && !quickAddUnscheduledMonth && (
        <div 
          onMouseDown={handleTrashMouseDown}
          onDragOver={handleTaskDragOver}
          onDrop={handleTaskRemoveSchedule}
          className="fixed z-50 w-[52px] h-[52px] rounded-xl bg-red-50/10 backdrop-blur-[2px] hover:bg-red-100/20 border border-dashed border-red-300/60 text-red-600 font-extrabold cursor-move transition-all flex flex-col items-center justify-center shadow-md select-none"
          style={{ 
            left: `${trashPosition.x}px`, 
            top: `${trashPosition.y}px`,
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
          }}
          title="按住左键可拖动此窗口。将日程任务拖到此处可清除其日期安排。"
        >
          <div className="flex flex-col items-center justify-center text-center space-y-0.5 p-0.5">
            <Trash2 className="w-3.5 h-3.5 text-red-500/85" />
            <span className="text-[7.5px] leading-tight tracking-tight scale-90 origin-center font-bold">清除安排<br/>(拖拽)</span>
          </div>
        </div>
      )}

    </div>
  );
}
