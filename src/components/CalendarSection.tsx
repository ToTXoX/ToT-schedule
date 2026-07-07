import React, { useState } from 'react';
import { 
  Category, Task, Subtask, Urgency, Note, Mood, MoodEmoji 
} from '../types';
import { 
  Calendar, ChevronLeft, ChevronRight, CheckSquare, Square, Eye, EyeOff,
  Plus, Trash2, Edit2, GripVertical, Smile, Frown, Flame, Heart, Meh,
  AlertTriangle, ArrowUp, ArrowDown, MoveRight, X, Trash, Clock, Bell, Repeat
} from 'lucide-react';

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
  // Notes
  onAddNote: (content: string, date: string) => void;
  onUpdateNote: (id: string, updates: Partial<Note>) => void;
  onDeleteNote: (id: string) => void;
  onReorderNotes: (notes: Note[]) => void;
  // Moods
  onUpdateMood: (date: string, emoji: MoodEmoji, text: string) => void;
}

type ViewMode = 'three-day' | 'week' | 'month';

const getRealTodayStr = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const MOOD_OPTIONS: { emoji: MoodEmoji; char: string; label: string; color: string; hoverColor: string }[] = [
  { emoji: '超级开心', char: '🤩', label: '超级开心', color: 'text-pink-600 bg-pink-100 border-pink-300', hoverColor: 'hover:bg-pink-200' },
  { emoji: '开心', char: '😊', label: '开心', color: 'text-green-700 bg-green-100 border-green-300', hoverColor: 'hover:bg-green-200' },
  { emoji: '一般', char: '😐', label: '一般', color: 'text-blue-700 bg-blue-100 border-blue-300', hoverColor: 'hover:bg-blue-200' },
  { emoji: '不开心', char: '🙁', label: '不开心', color: 'text-indigo-700 bg-indigo-100 border-indigo-300', hoverColor: 'hover:bg-indigo-200' },
  { emoji: '愤怒', char: '😠', label: '愤怒', color: 'text-red-700 bg-red-100 border-red-300', hoverColor: 'hover:bg-red-200' },
];

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
  const [showMoodEmojisInMonth, setShowMoodEmojisInMonth] = useState(true);
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
  const [editTaskSubtasks, setEditTaskSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editSubtaskTitle, setEditSubtaskTitle] = useState('');
  const [activeModalTab, setActiveModalTab] = useState<'basic' | 'content'>('basic');

  // Quick Add Task inline form state (Fixing support adding tasks in calendar view)
  const [quickAddTaskDate, setQuickAddTaskDate] = useState<string | null>(null);
  const [quickAddTaskTitle, setQuickAddTaskTitle] = useState('');
  const [quickAddTaskCatId, setQuickAddTaskCatId] = useState('');

  // Drag-resize state for multi-day tasks
  const [resizingTask, setResizingTask] = useState<{ id: string; edge: 'start' | 'end'; deltaDays: number } | null>(null);

  const todayStr = getRealTodayStr();

  // Helper: Format Date object to YYYY-MM-DD
  const formatDate = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
    return !!task.date;
  };

  const getActiveMultiDayTasks = (activeDates: string[]) => {
    return visibleTasks.filter(task => {
      if (!isMultiDayForRender(task)) return false;
      
      // Calculate active dates with active resizing delta
      let renderStartDate = task.date || '';
      let renderEndDate = task.endDate || task.date || '';
      if (resizingTask && resizingTask.id === task.id) {
        if (resizingTask.edge === 'start') {
          const d = new Date(renderStartDate);
          d.setDate(d.getDate() + resizingTask.deltaDays);
          renderStartDate = formatDate(d);
        } else {
          const d = new Date(renderEndDate);
          d.setDate(d.getDate() + resizingTask.deltaDays);
          renderEndDate = formatDate(d);
        }
      }
      return activeDates.some(date => date >= renderStartDate && date <= renderEndDate);
    });
  };

  const layoutMultiDayTasks = (activeTasks: Task[], activeDates: string[]) => {
    const rows: Task[][] = [];
    const sorted = [...activeTasks].sort((a, b) => {
      let startA = a.date || '';
      let endA = a.endDate || a.date || '';
      let startB = b.date || '';
      let endB = b.endDate || b.date || '';

      if (resizingTask && resizingTask.id === a.id) {
        if (resizingTask.edge === 'start') {
          const d = new Date(startA);
          d.setDate(d.getDate() + resizingTask.deltaDays);
          startA = formatDate(d);
        } else {
          const d = new Date(endA);
          d.setDate(d.getDate() + resizingTask.deltaDays);
          endA = formatDate(d);
        }
      }
      if (resizingTask && resizingTask.id === b.id) {
        if (resizingTask.edge === 'start') {
          const d = new Date(startB);
          d.setDate(d.getDate() + resizingTask.deltaDays);
          startB = formatDate(d);
        } else {
          const d = new Date(endB);
          d.setDate(d.getDate() + resizingTask.deltaDays);
          endB = formatDate(d);
        }
      }

      if (startA !== startB) return startA.localeCompare(startB);
      const durA = new Date(endA).getTime() - new Date(startA).getTime();
      const durB = new Date(endB).getTime() - new Date(startB).getTime();
      return durB - durA;
    });

    sorted.forEach(task => {
      let rowPlaced = false;
      for (let r = 0; r < rows.length; r++) {
        const overlaps = rows[r].some(existing => {
          let startA = task.date || '';
          let endA = task.endDate || task.date || '';
          let startB = existing.date || '';
          let endB = existing.endDate || existing.date || '';

          if (resizingTask && resizingTask.id === task.id) {
            if (resizingTask.edge === 'start') {
              const d = new Date(startA);
              d.setDate(d.getDate() + resizingTask.deltaDays);
              startA = formatDate(d);
            } else {
              const d = new Date(endA);
              d.setDate(d.getDate() + resizingTask.deltaDays);
              endA = formatDate(d);
            }
          }
          if (resizingTask && resizingTask.id === existing.id) {
            if (resizingTask.edge === 'start') {
              const d = new Date(startB);
              d.setDate(d.getDate() + resizingTask.deltaDays);
              startB = formatDate(d);
            } else {
              const d = new Date(endB);
              d.setDate(d.getDate() + resizingTask.deltaDays);
              endB = formatDate(d);
            }
          }

          return (startA <= endB) && (endA >= startB);
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
  const handleTaskDragStart = (e: React.DragEvent, taskId: string, srcDate: string, index: number) => {
    e.dataTransfer.setData('taskId', taskId);
    e.dataTransfer.setData('sourceDate', srcDate);
    e.dataTransfer.setData('sourceIndex', String(index));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleTaskDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Required to allow drop
  };

  const handleTaskDropOnDate = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) {
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
    const taskId = e.dataTransfer.getData('taskId');
    const sourceDate = e.dataTransfer.getData('sourceDate');
    const sourceIndexStr = e.dataTransfer.getData('sourceIndex');
    
    if (!taskId) return;
    
    if (sourceDate === targetDateStr) {
      // Reorder on the same day (swap orders)
      const tempOrder = targetTask.order;
      onUpdateTask(taskId, { order: tempOrder });
      onUpdateTask(targetTask.id, { order: tempOrder + 0.5 });
    } else {
      // Move to a new day before target
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        const updates: Partial<Task> = { 
          date: targetDateStr, 
          order: targetTask.order - 0.5,
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
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) {
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
    const taskId = e.dataTransfer.getData('taskId');
    if (!taskId || taskId === targetTask.id) return;

    const draggedTask = tasks.find(t => t.id === taskId);
    if (!draggedTask) return;

    const curYearMonth = startOfMonthStr.substring(0, 7);
    const isInSameUnscheduledList = 
      (view === 'week' && !draggedTask.date && draggedTask.scheduledWeek === startOfWeekStr) ||
      (view === 'month' && !draggedTask.date && draggedTask.scheduledMonth === curYearMonth);

    if (isInSameUnscheduledList) {
      onUpdateTask(taskId, { order: targetTask.order - 0.5 });
    } else {
      const updates: Partial<Task> = {
        date: undefined,
        endDate: undefined,
        time: undefined,
        order: targetTask.order - 0.5
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
    const taskId = e.dataTransfer.getData('taskId');
    if (!taskId) return;

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
    const colorHex = cat ? cat.colorHex : '#d97706'; // default amber/unset
    if (task.completed) {
      return {
        borderLeft: `4px solid ${colorHex}50`,
        background: `#f4f4f5`,
        color: '#a1a1aa'
      };
    }
    return {
      borderLeft: `4px solid ${colorHex}`,
      background: `${colorHex}15`,
      color: '#1f2937'
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
    const stepWidth = viewMode === 'three-day' ? 150 : viewMode === 'week' ? 100 : 80;
    
    let currentDelta = 0;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
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
    <div id="calendar-section-root" className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full items-start">
      
      {/* LEFT: Core Calendar Workspace (9 cols) */}
      <div id="calendar-workspace-panel" className="lg:col-span-9 bg-white rounded-3xl p-5 border border-neutral-100 shadow-sm flex flex-col space-y-4">
        
        {/* Calendar Header with Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
          
          {/* Navigation Controls */}
          <div className="flex items-center space-x-2">
            <h2 className="text-sm font-semibold text-neutral-800 tracking-tight font-sans flex items-center bg-neutral-100 px-3 py-1.5 rounded-xl">
              <Calendar className="w-4 h-4 mr-1.5 text-blue-500" />
              {viewMode === 'three-day' && '三日日程'}
              {viewMode === 'week' && '本周日程'}
              {viewMode === 'month' && `${currentMonthYearStr}`}
            </h2>

            <div className="flex items-center bg-neutral-50 p-1 rounded-xl border border-neutral-200">
              <button 
                id="btn-calendar-prev"
                onClick={() => adjustBaseDate(viewMode === 'three-day' ? -1 : viewMode === 'week' ? -7 : -30)}
                className="p-1 rounded-lg hover:bg-white text-neutral-600 transition hover:shadow-sm"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button 
                id="btn-calendar-today"
                onClick={() => {
                  setBaseDate(new Date(currentDateStr));
                  setSelectedDateStr(currentDateStr);
                }}
                className="text-xs px-2.5 py-1 rounded-lg hover:bg-white text-neutral-700 font-medium transition hover:shadow-sm"
              >
                回到今日
              </button>
              <button 
                id="btn-calendar-next"
                onClick={() => adjustBaseDate(viewMode === 'three-day' ? 1 : viewMode === 'week' ? 7 : 30)}
                className="p-1 rounded-lg hover:bg-white text-neutral-600 transition hover:shadow-sm"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Toggle View Mode (3-Day / Week / Month) */}
          <div className="flex items-center space-x-1.5 self-end sm:self-auto">
            <div className="bg-neutral-50 p-1 rounded-xl border border-neutral-200 flex space-x-1">
              <button
                id="btn-view-3day"
                onClick={() => setViewMode('three-day')}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${viewMode === 'three-day' ? 'bg-white text-neutral-800 shadow-sm' : 'text-neutral-500 hover:text-neutral-800'}`}
              >
                三日
              </button>
              <button
                id="btn-view-week"
                onClick={() => setViewMode('week')}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${viewMode === 'week' ? 'bg-white text-neutral-800 shadow-sm' : 'text-neutral-500 hover:text-neutral-800'}`}
              >
                周
              </button>
              <button
                id="btn-view-month"
                onClick={() => setViewMode('month')}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${viewMode === 'month' ? 'bg-white text-neutral-800 shadow-sm' : 'text-neutral-500 hover:text-neutral-800'}`}
              >
                月
              </button>
            </div>
          </div>

        </div>

        {/* I-1. Category Visibility Filter Badges */}
        <div className="flex flex-wrap items-center gap-2 py-1 text-xs text-neutral-600 bg-neutral-50/50 p-2 rounded-2xl border border-neutral-100">
          <span className="font-semibold text-neutral-500 mr-1 text-[10px] uppercase tracking-wider">
            快捷过滤:
          </span>
          {categories.map(cat => {
            const isVisible = cat.visible !== false;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onUpdateCategory(cat.id, { visible: !isVisible })}
                className={`px-2.5 py-1 rounded-lg border flex items-center space-x-1.5 font-semibold transition cursor-pointer ${
                  isVisible 
                    ? 'bg-white shadow-sm border-neutral-200 text-neutral-800' 
                    : 'bg-neutral-100 text-neutral-400 border-dashed line-through border-neutral-200'
                }`}
                style={{ borderLeft: isVisible ? `3.5px solid ${cat.colorHex}` : undefined }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: isVisible ? cat.colorHex : '#b4b4b4' }} />
                <span>{cat.name}</span>
              </button>
            );
          })}
          
          <button
            type="button"
            onClick={toggleUncategorizedVisible}
            className={`px-2.5 py-1 rounded-lg border flex items-center space-x-1.5 font-semibold transition cursor-pointer ${
              uncategorizedVisible 
                ? 'bg-white shadow-sm border-neutral-200 text-neutral-800' 
                : 'bg-neutral-100 text-neutral-400 border-dashed line-through border-neutral-200'
            }`}
            style={{ borderLeft: uncategorizedVisible ? `3.5px solid #a3a3a3` : undefined }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: uncategorizedVisible ? '#737373' : '#b4b4b4' }} />
            <span>未分类</span>
          </button>
        </div>

        {/* DRAG-AND-DROP TIP */}
        <div className="flex justify-end text-[11px] text-neutral-400 my-1">
          <div 
            onDragOver={handleTaskDragOver}
            onDrop={handleTaskRemoveSchedule}
            className="px-3.5 py-1.5 rounded-xl bg-red-50 hover:bg-red-100/80 border border-dashed border-red-200 text-red-600 font-extrabold cursor-pointer transition flex items-center shadow-sm"
            title="将任务拖到此处，清除日期安排，变为待安排"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            清除安排 (拖拽至此)
          </div>
        </div>

        {/* RENDER ACTIVE VIEW */}
        <div id="calendar-grid" className="flex-1">
          
          {/* A. THREE DAY VIEW */}
          {viewMode === 'three-day' && (
            <div className="relative flex flex-col bg-neutral-100 p-1.5 rounded-2xl border border-neutral-200/60 shadow-sm min-h-[460px]">
              {/* Background columns overlay */}
              <div className="absolute inset-0 grid grid-cols-3 gap-2.5 sm:gap-4 pointer-events-none z-0 p-3">
                {getThreeDays().map((day, dIdx) => {
                  const isToday = day.dateStr === todayStr;
                  const isSelected = day.dateStr === selectedDateStr;
                  return (
                    <div
                      key={dIdx}
                      className={`h-full rounded-2xl transition-all duration-300 border ${
                        isSelected && isToday
                          ? 'bg-blue-50/20 border-blue-500 shadow-lg ring-2 ring-blue-500/20'
                          : isSelected
                            ? 'bg-blue-50/15 border-blue-400 shadow-md ring-2 ring-blue-400/10'
                            : isToday 
                              ? 'bg-emerald-50/10 border-emerald-300 shadow ring-1 ring-emerald-300/10' 
                              : 'bg-white border-neutral-100'
                      }`}
                    />
                  );
                })}
              </div>

              {/* Foreground scrollable container / content */}
              <div className="relative z-10 flex flex-col w-full h-full p-3 select-none">
                {/* 1. Date Header Grid */}
                <div className="grid grid-cols-3 gap-2.5 sm:gap-4 w-full mb-3.5">
                  {getThreeDays().map((day, dIdx) => {
                    const isToday = day.dateStr === todayStr;
                    const isSelected = day.dateStr === selectedDateStr;
                    return (
                      <div 
                        key={dIdx} 
                        onClick={() => setSelectedDateStr(day.dateStr)}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between pb-1.5 border-b gap-1 px-2.5 py-1.5 cursor-pointer transition-all duration-200 rounded-t-xl ${
                          isSelected && isToday
                            ? 'border-blue-600 bg-blue-50/25 shadow-sm'
                            : isSelected
                              ? 'border-blue-500 bg-blue-50/15 shadow-sm'
                              : isToday
                                ? 'border-emerald-500 bg-emerald-50/20 shadow-sm'
                                : 'border-neutral-100/60 hover:bg-neutral-50/50'
                        }`}
                      >
                        <div>
                          {day.label === '今日' && (
                            <span className="text-[9px] font-extrabold text-white bg-emerald-500 px-1.5 py-0.5 rounded-md shadow-sm animate-pulse block w-max mb-1">
                              今日
                            </span>
                          )}
                          <h4 className={`text-xs sm:text-sm font-bold ${
                            isSelected && isToday
                              ? 'text-blue-700'
                              : isSelected
                                ? 'text-blue-600'
                                : isToday
                                  ? 'text-emerald-700'
                                  : 'text-neutral-800'
                          }`}>
                            {getDayName(day.dateObj)}
                          </h4>
                        </div>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-lg ${
                          isSelected
                            ? 'bg-blue-600 text-white font-mono font-bold'
                            : isToday
                              ? 'bg-emerald-500 text-white font-mono font-bold'
                              : 'bg-neutral-200 text-neutral-600 font-medium'
                        }`}>
                          {day.dateStr.substring(5)}
                        </span>
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
                    <div className="space-y-1.5 mb-3 px-1 w-full z-20">
                      {rows.map((rowTasks, rIdx) => (
                        <div key={rIdx} className="grid grid-cols-3 gap-2.5 sm:gap-4 h-7.5 relative w-full">
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

                            return (
                              <div
                                key={task.id}
                                draggable
                                onDragStart={(e) => handleTaskDragStart(e, task.id, task.date || todayStr, 0)}
                                onClick={() => openEditTaskModal(task)}
                                style={{
                                  ...getTaskStyle(task),
                                  gridColumnStart: startIndex + 1,
                                  gridColumnEnd: endIndex + 2,
                                }}
                                className={`h-full rounded-xl text-xs px-2.5 flex items-center justify-between cursor-pointer group transition-all border-l-4 select-none hover:shadow-md hover:scale-[1.01] relative z-20 ${
                                  task.completed ? 'opacity-65' : ''
                                }`}
                              >
                                {/* Left drag-resize handle */}
                                <div 
                                  onMouseDown={(e) => handleResizeStart(e, task, 'start')}
                                  className="absolute left-0 top-0 bottom-0 w-2.5 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-neutral-400/40 rounded-l z-20"
                                  title="拖拽更改开始日期"
                                  onClick={(e) => e.stopPropagation()}
                                />

                                <div className="flex items-center space-x-1.5 overflow-hidden flex-1 mr-2 pl-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleTaskCompletionOnDay(task, todayStr);
                                    }}
                                    className="text-neutral-400 hover:text-blue-500 transition relative z-30 flex-shrink-0"
                                  >
                                    {task.completed ? (
                                      <CheckSquare className="w-3.5 h-3.5 text-blue-500" />
                                    ) : (
                                      <Square className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                  <span className={`font-bold truncate ${task.completed ? 'line-through text-neutral-400' : 'text-neutral-800'}`}>
                                    {task.title}
                                  </span>
                                  {renderStartDate !== renderEndDate && (
                                    <span className="text-[9px] opacity-75 font-mono truncate flex-shrink-0">
                                      ({renderStartDate.substring(5)} 至 {renderEndDate.substring(5)})
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition flex-shrink-0 pr-2 relative z-30">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); adjustTaskEndDate(task, -1); }}
                                    className="px-1.5 py-0.2 bg-white/80 hover:bg-white rounded text-[9px] font-extrabold border border-neutral-200"
                                    title="缩短1天"
                                  >
                                    -
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); adjustTaskEndDate(task, 1); }}
                                    className="px-1.5 py-0.2 bg-white/80 hover:bg-white rounded text-[9px] font-extrabold border border-neutral-200"
                                    title="延长1天"
                                  >
                                    +
                                  </button>
                                </div>

                                {/* Right drag-resize handle */}
                                <div 
                                  onMouseDown={(e) => handleResizeStart(e, task, 'end')}
                                  className="absolute right-0 top-0 bottom-0 w-2.5 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-neutral-400/40 rounded-r z-20"
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
                <div className="grid grid-cols-3 gap-2.5 sm:gap-4 w-full flex-1">
                  {getThreeDays().map((day, dIdx) => {
                    const dayTasks = visibleTasks.filter(t => isTaskOnDay(t, day.dateStr) && !isMultiDayForRender(t)).sort((a,b) => a.order - b.order);
                    const isSelected = day.dateStr === selectedDateStr;
                    return (
                      <div
                        key={day.dateStr}
                        onDragOver={handleTaskDragOver}
                        onDrop={(e) => handleTaskDropOnDate(e, day.dateStr)}
                        onClick={() => setSelectedDateStr(day.dateStr)}
                        className={`flex flex-col h-full justify-between p-1 rounded-xl transition min-h-[300px] cursor-pointer ${
                          isSelected ? 'bg-blue-50/5' : ''
                        }`}
                      >
                        <div className="space-y-1.5 flex-1 overflow-y-auto">
                          {dayTasks.map((task, index) => {
                            return (
                              <div
                                key={task.id}
                                draggable
                                onDragStart={(e) => handleTaskDragStart(e, task.id, day.dateStr, index)}
                                onDragOver={handleTaskDragOver}
                                onDrop={(e) => handleTaskDropOnTaskItem(e, task, day.dateStr)}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditTaskModal(task);
                                }}
                                style={getTaskStyle(task)}
                                className={`p-2 rounded-xl text-xs cursor-pointer group relative hover:scale-[1.02] hover:shadow-md transition active:cursor-grabbing border-l-4 ${
                                  task.completed ? 'opacity-65' : ''
                                }`}
                              >
                                <div className="flex items-center gap-1.5 pl-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleTaskCompletionOnDay(task, day.dateStr);
                                    }}
                                    className="text-neutral-400 hover:text-blue-500 transition flex-shrink-0"
                                  >
                                    {task.completed ? (
                                      <CheckSquare className="w-3.5 h-3.5 text-blue-500" />
                                    ) : (
                                      <Square className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                  <span className={`font-semibold truncate flex-1 ${task.completed ? 'line-through text-neutral-400' : 'text-neutral-800'}`}>
                                    {task.title}
                                  </span>
                                  {task.time && <span className="text-[8px] bg-white/60 text-neutral-600 px-1 py-0.2 rounded font-mono flex-shrink-0">{task.time}</span>}
                                </div>

                                <div className="flex items-center justify-between mt-1 pl-1 ml-5">
                                  <span className="text-[8px] text-neutral-400 font-mono">
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
                          className="mt-2.5 w-full py-1.5 border border-dashed border-neutral-200 rounded-xl text-[10px] font-bold text-neutral-500 hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50/20 transition flex items-center justify-center cursor-pointer"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          新建任务
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* B. WEEK VIEW */}
          {viewMode === 'week' && (
            <div className="relative flex flex-col bg-neutral-100 p-1.5 rounded-2xl border border-neutral-200/60 shadow-sm min-h-[460px]">
              {/* Background columns overlay */}
              <div className="absolute inset-0 grid grid-cols-7 gap-2 pointer-events-none z-0 p-3">
                {getWeekDates().map((day, dIdx) => {
                  const isToday = day.dateStr === todayStr;
                  return (
                    <div
                      key={dIdx}
                      className={`h-full rounded-xl transition border ${
                        isToday 
                          ? 'bg-blue-50/20 border-blue-400 shadow-md ring-1 ring-blue-400/10' 
                          : 'bg-white border-neutral-100'
                      }`}
                    />
                  );
                })}
              </div>

              {/* Foreground scrollable container / content */}
              <div className="relative z-10 flex flex-col w-full h-full p-3 select-none">
                {/* 1. Date Header Grid */}
                <div className="grid grid-cols-7 gap-2 w-full mb-3 p-3 pb-0">
                  {getWeekDates().map((day, dIdx) => {
                    const isToday = day.dateStr === todayStr;
                    return (
                      <div 
                        key={dIdx} 
                        className="text-center pb-1 p-1 transition-all"
                      >
                        <span className={`text-[9px] block font-bold ${isToday ? 'text-blue-600 font-extrabold' : 'text-neutral-400'}`}>
                          {day.dayName}
                        </span>
                        <span 
                          onClick={() => {
                            setBaseDate(day.dateObj);
                            setSelectedDateStr(day.dateStr);
                            setViewMode('three-day');
                          }}
                          className={`text-xs font-extrabold inline-block w-6 h-6 leading-6 rounded-full cursor-pointer hover:opacity-80 transition ${isToday ? 'bg-blue-500 text-white shadow-sm' : 'text-neutral-700 hover:bg-neutral-200/40'}`}
                          title="点击查看此日三日视图"
                        >
                          {day.dayNum}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* 2. Multi-day Gantt Bars (spanning across columns) */}
                {(() => {
                  const days = getWeekDates();
                  const activeDates = days.map(d => d.dateStr);
                  const activeMulti = getActiveMultiDayTasks(activeDates);
                  const rows = layoutMultiDayTasks(activeMulti, activeDates);
                  if (activeMulti.length === 0) return null;
                  return (
                    <div className="space-y-1.5 mb-3 px-3 w-full z-20">
                      {rows.map((rowTasks, rIdx) => (
                        <div key={rIdx} className="grid grid-cols-7 gap-2 h-7.5 relative w-full">
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

                            return (
                              <div
                                key={task.id}
                                draggable
                                onDragStart={(e) => handleTaskDragStart(e, task.id, task.date || todayStr, 0)}
                                onClick={() => openEditTaskModal(task)}
                                style={{
                                  ...getTaskStyle(task),
                                  gridColumnStart: startIndex + 1,
                                  gridColumnEnd: endIndex + 2,
                                }}
                                className={`h-full rounded-xl text-[10px] px-2 flex items-center justify-between cursor-pointer group transition-all border-l-4 select-none hover:shadow-md hover:scale-[1.01] relative z-20 ${
                                  task.completed ? 'opacity-65' : ''
                                }`}
                              >
                                {/* Left drag-resize handle */}
                                <div 
                                  onMouseDown={(e) => handleResizeStart(e, task, 'start')}
                                  className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-neutral-400/40 rounded-l z-20"
                                  title="拖拽更改开始日期"
                                  onClick={(e) => e.stopPropagation()}
                                />

                                <div className="flex items-center space-x-1.5 overflow-hidden flex-1 mr-2 pl-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleTaskCompletionOnDay(task, todayStr);
                                    }}
                                    className="text-neutral-400 hover:text-blue-500 transition relative z-30 flex-shrink-0"
                                  >
                                    {task.completed ? (
                                      <CheckSquare className="w-3 h-3 text-blue-500" />
                                    ) : (
                                      <Square className="w-3 h-3" />
                                    )}
                                  </button>
                                  <span className={`font-bold truncate ${task.completed ? 'line-through text-neutral-400' : 'text-neutral-800'}`}>
                                    {task.title}
                                  </span>
                                </div>

                                {/* Right drag-resize handle */}
                                <div 
                                  onMouseDown={(e) => handleResizeStart(e, task, 'end')}
                                  className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-neutral-400/40 rounded-r z-20"
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
                <div className="grid grid-cols-7 gap-2 w-full flex-1 p-3 pt-1.5">
                  {getWeekDates().map((day, dIdx) => {
                    const dayTasks = visibleTasks.filter(t => isTaskOnDay(t, day.dateStr) && !isMultiDayForRender(t)).sort((a,b) => a.order - b.order);
                    return (
                      <div
                        key={day.dateStr}
                        onDragOver={handleTaskDragOver}
                        onDrop={(e) => handleTaskDropOnDate(e, day.dateStr)}
                        className="flex flex-col h-full justify-between p-1 rounded-xl transition min-h-[300px]"
                      >
                        <div className="space-y-1.5 flex-1 overflow-y-auto">
                          {dayTasks.map((task, index) => (
                            <div
                              key={task.id}
                              draggable
                              onDragStart={(e) => handleTaskDragStart(e, task.id, day.dateStr, index)}
                              onDragOver={handleTaskDragOver}
                              onDrop={(e) => handleTaskDropOnTaskItem(e, task, day.dateStr)}
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditTaskModal(task);
                              }}
                              style={getTaskStyle(task)}
                              className={`p-2 rounded-xl text-[10px] cursor-pointer group hover:scale-[1.02] hover:shadow transition relative border-l-4 ${
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
                              {task.time && <div className="text-[8px] text-neutral-400 font-mono mt-0.5 ml-4">{task.time}</div>}
                            </div>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setQuickAddTaskDate(day.dateStr);
                          }}
                          className="mt-1.5 w-full py-1 border border-dashed border-neutral-200 rounded-lg text-[9px] font-bold text-neutral-400 hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50/10 transition flex items-center justify-center cursor-pointer"
                        >
                          <Plus className="w-2.5 h-2.5 mr-0.5" />
                          加任务
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* C. MONTH VIEW */}
          {viewMode === 'month' && (
            <div className="space-y-4 select-none">
              
              {/* Show/Hide mood tracker option */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowMoodEmojisInMonth(!showMoodEmojisInMonth)}
                  className="flex items-center text-xs text-neutral-500 hover:text-neutral-800"
                >
                  {showMoodEmojisInMonth ? <Eye className="w-3.5 h-3.5 mr-1 text-green-500" /> : <EyeOff className="w-3.5 h-3.5 mr-1" />}
                  {showMoodEmojisInMonth ? '显示每月心情' : '隐藏每月心情'}
                </button>
              </div>

              {/* Month Grid */}
              <div className="border border-neutral-100 rounded-2xl overflow-hidden bg-neutral-100 flex flex-col gap-1">
                {/* Weekday Labels */}
                <div className="grid grid-cols-7 gap-1">
                  {['一', '二', '三', '四', '五', '六', '日'].map(w => (
                    <div key={w} className="bg-neutral-50 py-1.5 text-center text-xs font-semibold text-neutral-500">
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
                      <div key={wIdx} className="relative flex flex-col bg-white min-h-[120px] border-b border-neutral-100">
                        {/* Background columns overlay */}
                        <div className="absolute inset-0 grid grid-cols-7 gap-1 pointer-events-none z-0">
                          {weekDays.map((day, dIdx) => {
                            const isToday = day.dateStr === todayStr;
                            return (
                              <div
                                key={dIdx}
                                className={`h-full border-r border-neutral-100 transition ${
                                  !day.isCurrentMonth 
                                    ? 'bg-neutral-100/55' 
                                    : day.dateStr < todayStr 
                                      ? 'bg-neutral-50/70' 
                                      : 'bg-white'
                                } ${isToday ? 'bg-blue-50/10 ring-1 ring-blue-500/20' : ''}`}
                              />
                            );
                          })}
                        </div>

                        {/* Foreground Content */}
                        <div className="relative z-10 flex flex-col w-full h-full p-1 select-none">
                          {/* 1. Day Header Grid (Date Numbers & Mood emojis) */}
                          <div className="grid grid-cols-7 gap-1 w-full mb-1">
                            {weekDays.map((day, dIdx) => {
                              const isToday = day.dateStr === todayStr;
                              const isPast = day.dateStr < todayStr;
                              const isCurrentMonth = day.isCurrentMonth;
                              const dayMood = getMoodForDate(day.dateStr);
                              const isPickerOpen = activeMoodPickerDate === day.dateStr;

                              let numClass = "";
                              if (isToday) {
                                numClass = "bg-blue-500 text-white shadow-sm font-extrabold";
                              } else if (!isCurrentMonth) {
                                numClass = "text-neutral-300/80 font-normal";
                              } else if (isPast) {
                                numClass = "text-neutral-400 font-medium bg-neutral-100/45";
                              } else {
                                numClass = "text-neutral-700 font-extrabold hover:bg-neutral-100";
                              }

                              return (
                                <div 
                                  key={dIdx} 
                                  className="flex items-center justify-between px-1.5 py-1 rounded-lg transition-all"
                                >
                                  <span 
                                    onClick={() => {
                                      setBaseDate(day.dateObj);
                                      setSelectedDateStr(day.dateStr);
                                      setViewMode('three-day');
                                    }}
                                    className={`text-xs w-5 h-5 leading-5 text-center rounded-full cursor-pointer hover:opacity-80 transition-all ${numClass}`}
                                    title="点击查看此日三日视图"
                                  >
                                    {day.dayNum}
                                  </span>

                                  {showMoodEmojisInMonth && (
                                    <div className="relative">
                                      {dayMood.emoji ? (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveMoodPickerDate(isPickerOpen ? null : day.dateStr);
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
                                            setActiveMoodPickerDate(isPickerOpen ? null : day.dateStr);
                                          }}
                                          className="opacity-0 group-hover:opacity-100 text-xs text-neutral-300 hover:text-neutral-600 focus:outline-none transition cursor-pointer"
                                          title="点击设置当天心情"
                                        >
                                          <Smile className="w-3.5 h-3.5" />
                                        </button>
                                      )}

                                      {isPickerOpen && (
                                        <div className="absolute right-0 top-6 bg-white shadow-2xl border border-neutral-200 p-2 rounded-2xl flex space-x-2 z-50 items-center animate-fade-in whitespace-nowrap">
                                          {MOOD_OPTIONS.map(opt => (
                                            <button
                                              key={opt.emoji}
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                onUpdateMood(day.dateStr, opt.emoji, dayMood.text);
                                                setActiveMoodPickerDate(null);
                                              }}
                                              className="text-base hover:scale-130 transition cursor-pointer"
                                              title={opt.label}
                                            >
                                              {opt.char}
                                            </button>
                                          ))}
                                          {dayMood.emoji && (
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                onUpdateMood(day.dateStr, '', '');
                                                setActiveMoodPickerDate(null);
                                              }}
                                              className="text-[10px] text-red-500 hover:underline px-1 bg-red-50 rounded"
                                            >
                                              清除
                                            </button>
                                          )}
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setActiveMoodPickerDate(null);
                                            }}
                                            className="text-[10px] text-neutral-400 hover:text-neutral-700 pl-1"
                                          >
                                            关闭
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* 2. Multi-day Gantt Bars Row */}
                          {activeMulti.length > 0 && (
                            <div className="space-y-1 mb-1 px-1 w-full z-20">
                              {rows.map((rowTasks, rIdx) => (
                                <div key={rIdx} className="grid grid-cols-7 gap-1 h-5 relative w-full">
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

                                    return (
                                      <div
                                        key={task.id}
                                        draggable
                                        onDragStart={(e) => handleTaskDragStart(e, task.id, task.date || todayStr, 0)}
                                        onClick={() => openEditTaskModal(task)}
                                        style={{
                                          ...getTaskStyle(task),
                                          gridColumnStart: startIndex + 1,
                                          gridColumnEnd: endIndex + 2,
                                        }}
                                        className={`h-full rounded text-[8px] px-1 flex items-center justify-between cursor-pointer group pointer-events-auto transition-all border-l-2 select-none hover:shadow hover:scale-[1.01] relative z-20 ${
                                          task.completed ? 'opacity-60' : ''
                                        }`}
                                      >
                                        {/* Left drag-resize handle */}
                                        <div 
                                          onMouseDown={(e) => handleResizeStart(e, task, 'start')}
                                          className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-neutral-400/40 rounded-l z-20"
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
                                            className="text-neutral-500 hover:text-neutral-800 p-0.5 rounded transition flex-shrink-0 cursor-pointer"
                                          >
                                            {isTaskCompletedOnDay(task, renderStartDate) ? (
                                              <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                                            ) : (
                                              <Square className="w-3.5 h-3.5 text-neutral-400" />
                                            )}
                                          </button>
                                          <span className={`font-bold truncate ${task.completed ? 'line-through text-neutral-400' : 'text-neutral-800'}`}>
                                            {task.title}
                                          </span>
                                        </div>

                                        {/* Right drag-resize handle */}
                                        <div 
                                          onMouseDown={(e) => handleResizeStart(e, task, 'end')}
                                          className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-neutral-400/40 rounded-r z-20"
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

                          {/* 3. Single-day task lists columns */}
                          <div className="grid grid-cols-7 gap-1 w-full flex-1 px-1">
                            {weekDays.map((day, dIdx) => {
                              const dayTasks = visibleTasks.filter(t => isTaskOnDay(t, day.dateStr) && !isMultiDayForRender(t)).sort((a,b) => a.order - b.order);
                              return (
                                <div
                                  key={day.dateStr}
                                  onDragOver={handleTaskDragOver}
                                  onDrop={(e) => handleTaskDropOnDate(e, day.dateStr)}
                                  className="flex flex-col justify-between group/column h-full min-h-[50px] p-0.5 rounded-lg transition-all"
                                >
                                  {/* Single-day tasks container */}
                                  <div className="space-y-0.5 flex-1 overflow-y-auto max-h-[60px]">
                                    {dayTasks.map((task, index) => (
                                      <div
                                        key={task.id}
                                        draggable
                                        onDragStart={(e) => handleTaskDragStart(e, task.id, day.dateStr, index)}
                                        onDragOver={handleTaskDragOver}
                                        onDrop={(e) => handleTaskDropOnTaskItem(e, task, day.dateStr)}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openEditTaskModal(task);
                                        }}
                                        style={getTaskStyle(task)}
                                        className={`px-1 py-0.5 text-[9px] rounded truncate cursor-pointer font-semibold relative border-l ${
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
                                            className="text-neutral-500 hover:text-neutral-800 p-0 flex-shrink-0 cursor-pointer"
                                          >
                                            {isTaskCompletedOnDay(task, day.dateStr) ? (
                                              <CheckSquare className="w-2.5 h-2.5 text-blue-600" />
                                            ) : (
                                              <Square className="w-2.5 h-2.5 text-neutral-400" />
                                            )}
                                          </button>
                                          <span className="truncate flex-1">{task.title}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>

                                  {/* Quick Add button */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setQuickAddTaskDate(day.dateStr);
                                    }}
                                    className="opacity-0 group-hover/column:opacity-100 self-end text-[8px] font-bold text-blue-500 hover:underline transition mt-1 cursor-pointer"
                                  >
                                    + 新增
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}

        </div>

      </div>

      {/* RIGHT: Context-Sensitive Sidebar (3 cols) */}
      <div id="calendar-context-sidebar" className="lg:col-span-3 space-y-5">
        
        {/* VIEW 1: THREE-DAY -> TODAY'S BAR */}
        {viewMode === 'three-day' && (
          <div className="space-y-4">
            
            {/* Notes Section */}
            <div className="bg-white/70 backdrop-blur-md rounded-2xl p-4 border border-neutral-100 shadow-sm flex flex-col space-y-3">
              <div className="flex items-center justify-between pb-1.5 border-b border-neutral-100">
                <span className="text-xs font-extrabold text-neutral-800 flex items-center">
                  {selectedDateStr === todayStr ? '今日笔记' : `${selectedDateStr.substring(5)} 随手笔记`}
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
                    {todayNotes.length === 0 ? (
                      <span className="text-[10px] text-neutral-400 block py-4 text-center italic">
                        单击空白添加随手记
                      </span>
                    ) : (
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
                            <div className="space-y-1.5">
                              <textarea
                                value={editNoteText}
                                onChange={(e) => setEditNoteText(e.target.value)}
                                className="w-full text-[11px] p-2 border border-neutral-300 bg-white rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none h-14 font-medium"
                                autoFocus
                              />
                              <div className="flex justify-end space-x-1.5">
                                <button onClick={() => setEditingNoteId(null)} className="p-1 rounded text-neutral-400 hover:text-neutral-600 text-[10px]">取消</button>
                                <button onClick={() => saveNoteEdit(note.id)} className="px-2.5 py-1 rounded-lg bg-neutral-800 text-white hover:bg-black text-[10px] font-bold shadow-sm">保存</button>
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
                  <form onSubmit={handleAddNoteSubmit} className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="随手记点什么..."
                      value={newNoteText}
                      onChange={(e) => setNewNoteText(e.target.value)}
                      className="flex-1 text-[11px] px-2.5 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:bg-white transition"
                    />
                    <button
                      type="submit"
                      className="p-1.5 bg-neutral-800 text-white rounded-lg hover:bg-neutral-900 transition flex items-center justify-center cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* Mood Section */}
            <div className="bg-white/70 backdrop-blur-md rounded-2xl p-4 border border-neutral-100 shadow-sm flex flex-col space-y-3">
              <div className="flex items-center justify-between pb-1.5 border-b border-neutral-100">
                <span className="text-xs font-extrabold text-neutral-800 flex items-center">
                  {selectedDateStr === todayStr ? '今日心情' : `${selectedDateStr.substring(5)} 心情记录`}
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
                  {/* II-5. Highlight selected mood option */}
                  <div className="grid grid-cols-5 gap-1.5">
                    {MOOD_OPTIONS.map(opt => {
                      const isSelected = todayMood.emoji === opt.emoji;
                      
                      let activeStyle = '';
                      const inactiveStyle = 'bg-neutral-50/40 hover:bg-neutral-100 border-neutral-150/60 text-neutral-400 grayscale-[40%] hover:grayscale-0 hover:scale-[1.03] hover:shadow-sm';
                      
                      if (opt.emoji === '超级开心') {
                        activeStyle = 'bg-pink-500 text-white border-pink-400 ring-4 ring-pink-100 shadow-lg shadow-pink-200/50 scale-110 font-bold';
                      } else if (opt.emoji === '开心') {
                        activeStyle = 'bg-emerald-500 text-white border-emerald-400 ring-4 ring-emerald-100 shadow-lg shadow-emerald-200/50 scale-110 font-bold';
                      } else if (opt.emoji === '一般') {
                        activeStyle = 'bg-blue-500 text-white border-blue-400 ring-4 ring-blue-100 shadow-lg shadow-blue-200/50 scale-110 font-bold';
                      } else if (opt.emoji === '不开心') {
                        activeStyle = 'bg-indigo-500 text-white border-indigo-400 ring-4 ring-indigo-100 shadow-lg shadow-indigo-200/50 scale-110 font-bold';
                      } else if (opt.emoji === '愤怒') {
                        activeStyle = 'bg-red-500 text-white border-red-400 ring-4 ring-red-100 shadow-lg shadow-red-200/50 scale-110 font-bold';
                      }

                      return (
                        <button
                          key={opt.emoji}
                          type="button"
                          onClick={() => handleUpdateTodayMoodEmoji(opt.emoji)}
                          className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all duration-300 border cursor-pointer ${
                            isSelected ? activeStyle : inactiveStyle
                          }`}
                          title={opt.label}
                        >
                          <span className="text-xl transform transition-transform duration-300 hover:rotate-12 select-none">
                            {opt.char}
                          </span>
                          <span className={`text-[8px] font-extrabold tracking-tight select-none truncate w-full text-center ${
                            isSelected ? 'text-white font-black' : 'text-neutral-500'
                          }`}>
                            {opt.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Mood text */}
                  {todayMood.emoji && (
                    <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-100 text-[11px] text-neutral-700">
                      <span className="font-extrabold text-neutral-800 block mb-1">
                        心情笔记 ({MOOD_OPTIONS.find(m => m.emoji === todayMood.emoji)?.label || todayMood.emoji})
                      </span>
                      
                      {isEditingTodayMoodText ? (
                        <div className="space-y-1.5">
                          <input
                            type="text"
                            value={todayMoodText}
                            onChange={(e) => setTodayMoodText(e.target.value)}
                            className="w-full text-[11px] p-2 border border-neutral-300 bg-white rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder={selectedDateStr === todayStr ? "写下今日心情感受..." : `写下 ${selectedDateStr.substring(5)} 心情感受...`}
                            autoFocus
                          />
                          <div className="flex justify-end space-x-1.5">
                            <button onClick={() => setIsEditingTodayMoodText(false)} className="text-[10px] text-neutral-400 hover:text-neutral-600">取消</button>
                            <button onClick={handleSaveTodayMoodText} className="text-[10px] text-blue-600 font-bold hover:underline">保存</button>
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
            <div className="bg-white/70 backdrop-blur-md rounded-2xl p-4 border border-neutral-100 shadow-sm flex flex-col space-y-4">
              <h3 className="text-xs font-bold text-neutral-800 pb-1.5 border-b border-neutral-100 flex items-center justify-between">
                <span>本周日程清单</span>
                <span className="text-[10px] bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded-lg font-semibold">共 {thisWeekTasks.length} 项</span>
              </h3>

              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                {/* 1. Unscheduled Tasks (待安排) */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between bg-amber-50/80 border border-amber-100/80 px-2.5 py-1.5 rounded-xl">
                    <span className="text-[11px] font-black text-amber-800 flex items-center">
                      <span className="inline-block w-2 h-2 rounded-full bg-amber-500 mr-1.5 animate-pulse" />
                      待安排任务
                    </span>
                    <span className="text-[10px] font-black bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md">
                      {weekUnscheduled.length}
                    </span>
                  </div>

                   {weekUnscheduled.length === 0 ? (
                    <div 
                      onDragOver={handleTaskDragOver}
                      onDrop={(e) => handleUnscheduledContainerDrop(e, 'week')}
                      className="text-[10px] text-neutral-400 py-4 text-center border border-dashed border-neutral-200 rounded-xl bg-neutral-50/40 hover:bg-neutral-50/60 transition-all italic cursor-pointer"
                    >
                      本周无待安排日程，可在上方新建或拖入
                    </div>
                  ) : (
                    <div 
                      onDragOver={handleTaskDragOver}
                      onDrop={(e) => handleUnscheduledContainerDrop(e, 'week')}
                      className="space-y-2 bg-amber-50/20 p-2.5 border border-dashed border-amber-200/60 rounded-2xl"
                    >
                      {weekUnscheduled.map(task => (
                        <div 
                          key={task.id} 
                          draggable
                          onDragStart={(e) => handleTaskDragStart(e, task.id, task.date || todayStr, 0)}
                          onDragOver={handleTaskDragOver}
                          onDrop={(e) => handleUnscheduledTaskDropOnTask(e, task, 'week')}
                          onClick={() => openEditTaskModal(task)}
                          style={{
                            borderLeft: getTaskStyle(task).borderLeft,
                          }}
                          className="p-2.5 bg-white hover:bg-amber-50/30 rounded-xl border border-amber-200/80 shadow-sm text-xs cursor-grab hover:shadow transition relative group/item"
                        >
                          <div className="flex items-center justify-between gap-1.5">
                            <div className="flex items-center space-x-2 overflow-hidden flex-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleTaskCompletionOnDay(task, todayStr);
                                }}
                                className="text-neutral-500 hover:text-neutral-800 p-0.5 rounded transition flex-shrink-0 cursor-pointer"
                              >
                                {isTaskCompletedOnDay(task, todayStr) ? (
                                  <CheckSquare className="w-4 h-4 text-blue-600" />
                                ) : (
                                  <Square className="w-4 h-4 text-neutral-400" />
                                )}
                              </button>
                              <span className={`font-semibold text-neutral-800 truncate ${task.completed ? 'line-through text-neutral-400 opacity-60' : ''}`}>
                                {task.title}
                              </span>
                            </div>
                            <GripVertical className="w-3.5 h-3.5 text-neutral-300 group-hover/item:text-amber-500 flex-shrink-0 cursor-grab" />
                          </div>

                          <div className="flex items-center justify-between mt-1.5">
                            <span className="text-[8px] bg-neutral-100 text-neutral-500 px-1.5 py-0.2 rounded font-medium">
                              {categories.find(c => c.id === task.categoryId)?.name || '未分类'}
                            </span>
                            
                            <span className={`text-[8px] px-1 py-0.2 rounded font-bold ${
                              task.urgency === 'high' ? 'bg-red-100 text-red-700' :
                              task.urgency === 'medium' ? 'bg-orange-100 text-orange-700' :
                              task.urgency === 'low' ? 'bg-blue-100 text-blue-700' : 'bg-neutral-100 text-neutral-400'
                            }`}>
                              {task.urgency === 'high' ? '高' :
                               task.urgency === 'medium' ? '中' :
                               task.urgency === 'low' ? '低' : '未设置'}
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
                      已安排日程
                    </span>
                    <span className="text-[10px] font-black bg-neutral-200 text-neutral-700 px-2 py-0.5 rounded-md">
                      {weekScheduled.length}
                    </span>
                  </div>

                  {weekScheduled.length === 0 ? (
                    <div className="text-[10px] text-neutral-400 py-4 text-center border border-dashed border-neutral-200 rounded-xl italic">
                      暂无具体时间日程
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {weekScheduled.sort((a,b) => (a.date||'').localeCompare(b.date||'')).map(task => {
                        const taskDate = task.date || todayStr;
                        return (
                          <div 
                            key={task.id} 
                            draggable
                            onDragStart={(e) => handleTaskDragStart(e, task.id, taskDate, 0)}
                            onClick={() => openEditTaskModal(task)}
                            className="p-2.5 bg-neutral-50/50 hover:bg-neutral-100/50 rounded-xl border border-neutral-100 text-xs cursor-pointer hover:shadow-sm transition"
                          >
                            <div className="flex items-center justify-between gap-1.5">
                              <div className="flex items-center space-x-2 overflow-hidden flex-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleTaskCompletionOnDay(task, taskDate);
                                  }}
                                  className="text-neutral-500 hover:text-neutral-800 p-0.5 rounded transition flex-shrink-0 cursor-pointer"
                                >
                                  {isTaskCompletedOnDay(task, taskDate) ? (
                                    <CheckSquare className="w-4 h-4 text-blue-600" />
                                  ) : (
                                    <Square className="w-4 h-4 text-neutral-400" />
                                  )}
                                </button>
                                <span className={`font-semibold truncate ${task.completed ? 'line-through text-neutral-400' : 'text-neutral-800'}`}>
                                  {task.title}
                                </span>
                              </div>
                              <span className="text-[9px] bg-neutral-200/80 text-neutral-600 px-1.5 py-0.2 rounded font-semibold flex-shrink-0">
                                {task.date}
                              </span>
                            </div>

                            <div className="flex items-center justify-between mt-1.5">
                              <span className="text-[9px] text-neutral-400 font-mono">
                                {task.time || '全天日程'}
                              </span>
                              
                              <span className={`text-[8px] px-1 py-0.2 rounded font-bold ${
                                task.urgency === 'high' ? 'bg-red-100 text-red-700' :
                                task.urgency === 'medium' ? 'bg-orange-100 text-orange-700' :
                                task.urgency === 'low' ? 'bg-blue-100 text-blue-700' : 'bg-neutral-100 text-neutral-400'
                              }`}>
                                {task.urgency === 'high' ? '高' :
                                 task.urgency === 'medium' ? '中' :
                                 task.urgency === 'low' ? '低' : '未设置'}
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
            <div className="bg-white/70 backdrop-blur-md rounded-2xl p-4 border border-neutral-100 shadow-sm flex flex-col space-y-4">
              <h3 className="text-xs font-bold text-neutral-800 pb-1.5 border-b border-neutral-100 flex items-center justify-between">
                <span>本月日程清单</span>
                <span className="text-[10px] bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded-lg font-semibold">共 {thisMonthTasks.length} 项</span>
              </h3>

              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                {/* 1. Unscheduled Tasks (待安排) */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between bg-amber-50/80 border border-amber-100/80 px-2.5 py-1.5 rounded-xl">
                    <span className="text-[11px] font-black text-amber-800 flex items-center">
                      <span className="inline-block w-2 h-2 rounded-full bg-amber-500 mr-1.5 animate-pulse" />
                      待安排任务
                    </span>
                    <span className="text-[10px] font-black bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md">
                      {monthUnscheduled.length}
                    </span>
                  </div>

                  {monthUnscheduled.length === 0 ? (
                    <div 
                      onDragOver={handleTaskDragOver}
                      onDrop={(e) => handleUnscheduledContainerDrop(e, 'month')}
                      className="text-[10px] text-neutral-400 py-4 text-center border border-dashed border-neutral-200 rounded-xl bg-neutral-50/40 hover:bg-neutral-50/60 transition-all italic cursor-pointer"
                    >
                      本月无待安排日程，可在上方新建或拖入
                    </div>
                  ) : (
                    <div 
                      onDragOver={handleTaskDragOver}
                      onDrop={(e) => handleUnscheduledContainerDrop(e, 'month')}
                      className="space-y-2 bg-amber-50/20 p-2.5 border border-dashed border-amber-200/60 rounded-2xl"
                    >
                      {monthUnscheduled.map(task => (
                        <div 
                          key={task.id} 
                          draggable
                          onDragStart={(e) => handleTaskDragStart(e, task.id, task.date || todayStr, 0)}
                          onDragOver={handleTaskDragOver}
                          onDrop={(e) => handleUnscheduledTaskDropOnTask(e, task, 'month')}
                          onClick={() => openEditTaskModal(task)}
                          style={{
                            borderLeft: getTaskStyle(task).borderLeft,
                          }}
                          className="p-2.5 bg-white hover:bg-amber-50/30 rounded-xl border border-amber-200/80 shadow-sm text-xs cursor-grab hover:shadow transition relative group/item"
                        >
                          <div className="flex items-center justify-between gap-1.5">
                            <div className="flex items-center space-x-2 overflow-hidden flex-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleTaskCompletionOnDay(task, todayStr);
                                }}
                                className="text-neutral-500 hover:text-neutral-800 p-0.5 rounded transition flex-shrink-0 cursor-pointer"
                              >
                                {isTaskCompletedOnDay(task, todayStr) ? (
                                  <CheckSquare className="w-4 h-4 text-blue-600" />
                                ) : (
                                  <Square className="w-4 h-4 text-neutral-400" />
                                )}
                              </button>
                              <span className={`font-semibold text-neutral-800 truncate ${task.completed ? 'line-through text-neutral-400 opacity-60' : ''}`}>
                                {task.title}
                              </span>
                            </div>
                            <GripVertical className="w-3.5 h-3.5 text-neutral-300 group-hover/item:text-amber-500 flex-shrink-0 cursor-grab" />
                          </div>

                          <div className="flex items-center justify-between mt-1.5">
                            <span className="text-[8px] bg-neutral-100 text-neutral-500 px-1.5 py-0.2 rounded font-medium">
                              {categories.find(c => c.id === task.categoryId)?.name || '未分类'}
                            </span>
                            
                            <span className={`text-[8px] px-1 py-0.2 rounded font-bold ${
                              task.urgency === 'high' ? 'bg-red-100 text-red-700' :
                              task.urgency === 'medium' ? 'bg-orange-100 text-orange-700' :
                              task.urgency === 'low' ? 'bg-blue-100 text-blue-700' : 'bg-neutral-100 text-neutral-400'
                            }`}>
                              {task.urgency === 'high' ? '高' :
                               task.urgency === 'medium' ? '中' :
                               task.urgency === 'low' ? '低' : '未设置'}
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
                      已安排日程
                    </span>
                    <span className="text-[10px] font-black bg-neutral-200 text-neutral-700 px-2 py-0.5 rounded-md">
                      {monthScheduled.length}
                    </span>
                  </div>

                  {monthScheduled.length === 0 ? (
                    <div className="text-[10px] text-neutral-400 py-4 text-center border border-dashed border-neutral-200 rounded-xl italic">
                      暂无具体时间日程
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {monthScheduled.sort((a,b) => (a.date||'').localeCompare(b.date||'')).map(task => {
                        const taskDate = task.date || todayStr;
                        return (
                          <div 
                            key={task.id} 
                            draggable
                            onDragStart={(e) => handleTaskDragStart(e, task.id, taskDate, 0)}
                            onClick={() => openEditTaskModal(task)}
                            className="p-2.5 bg-neutral-50/50 hover:bg-neutral-100/50 rounded-xl border border-neutral-100 text-xs cursor-pointer hover:shadow-sm transition animate-fade-in"
                          >
                            <div className="flex items-center justify-between gap-1.5">
                              <div className="flex items-center space-x-2 overflow-hidden flex-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleTaskCompletionOnDay(task, taskDate);
                                  }}
                                  className="text-neutral-500 hover:text-neutral-800 p-0.5 rounded transition flex-shrink-0 cursor-pointer"
                                >
                                  {isTaskCompletedOnDay(task, taskDate) ? (
                                    <CheckSquare className="w-4 h-4 text-blue-600" />
                                  ) : (
                                    <Square className="w-4 h-4 text-neutral-400" />
                                  )}
                                </button>
                                <span className={`font-semibold truncate ${task.completed ? 'line-through text-neutral-400' : 'text-neutral-800'}`}>
                                  {task.title}
                                </span>
                              </div>
                              <span className="text-[9px] bg-neutral-200/80 text-neutral-600 px-1.5 py-0.2 rounded font-semibold flex-shrink-0">
                                {task.date?.substring(5)}
                              </span>
                            </div>

                            <div className="flex items-center justify-between mt-1.5">
                              <span className="text-[9px] text-neutral-400">
                                {task.time || '全天日程'}
                              </span>
                              
                              <span className={`text-[8px] px-1 py-0.2 rounded font-bold ${
                                task.urgency === 'high' ? 'bg-red-100 text-red-700' :
                                task.urgency === 'medium' ? 'bg-orange-100 text-orange-700' :
                                task.urgency === 'low' ? 'bg-blue-100 text-blue-700' : 'bg-neutral-100 text-neutral-400'
                              }`}>
                                {task.urgency === 'high' ? '高' :
                                 task.urgency === 'medium' ? '中' :
                                 task.urgency === 'low' ? '低' : '未设置'}
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
      {quickAddTaskDate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <form onSubmit={submitQuickAdd} className="bg-white rounded-3xl border border-neutral-200 p-5 w-full max-w-sm shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
              <span className="font-bold text-neutral-800 text-sm flex items-center">
                <Plus className="w-4 h-4 mr-1 text-blue-500" />
                新增任务于 {quickAddTaskDate}
              </span>
              <button 
                type="button" 
                onClick={() => setQuickAddTaskDate(null)}
                className="text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-neutral-400 block mb-1">任务标题</label>
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
              <label className="text-[10px] font-semibold text-neutral-400 block mb-1">所属分类</label>
              <select
                value={quickAddTaskCatId}
                onChange={(e) => setQuickAddTaskCatId(e.target.value)}
                className="w-full p-2.5 bg-white border border-neutral-200 rounded-xl text-xs font-medium focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="">未分类</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end space-x-2 pt-1">
              <button 
                type="button" 
                onClick={() => setQuickAddTaskDate(null)}
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl border border-neutral-200 p-6 w-full max-w-2xl shadow-2xl space-y-5 text-xs relative max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-neutral-100">
              <span className="font-extrabold text-neutral-800 text-sm flex items-center">
                <Edit2 className="w-4 h-4 mr-2 text-blue-500" />
                编辑日程任务
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
            <div className="flex border-b border-neutral-100 pb-1 -mt-2">
              <button
                type="button"
                onClick={() => setActiveModalTab('basic')}
                className={`flex-1 pb-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer text-center ${
                  activeModalTab === 'basic'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-neutral-400 hover:text-neutral-600'
                }`}
              >
                ⚙️ 基本信息设置
              </button>
              <button
                type="button"
                onClick={() => setActiveModalTab('content')}
                className={`flex-1 pb-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer text-center flex items-center justify-center space-x-1 ${
                  activeModalTab === 'content'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-neutral-400 hover:text-neutral-600'
                }`}
              >
                <span>📋 子任务与详细内容</span>
                {editTaskSubtasks.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 text-[9px] bg-blue-100 text-blue-700 rounded-full font-extrabold">
                    {editTaskSubtasks.filter(s => s.completed).length}/{editTaskSubtasks.length}
                  </span>
                )}
              </button>
            </div>

            {activeModalTab === 'content' ? (
              <div className="space-y-4 animate-fade-in">
                {/* Task Title header context to keep context */}
                <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-100 space-y-1.5">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded-full text-[9px] bg-neutral-200 text-neutral-700 font-extrabold">当前任务</span>
                    <span className="font-extrabold text-neutral-800 text-sm">{editTaskTitle || '无标题任务'}</span>
                  </div>
                  {editTaskDesc ? (
                    <p className="text-[11px] text-neutral-500 font-medium pl-1 leading-relaxed line-clamp-3">
                      {editTaskDesc}
                    </p>
                  ) : (
                    <p className="text-[11px] text-neutral-400/80 italic pl-1">暂无详细备注说明</p>
                  )}
                </div>

                {/* Subtask Section */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                      细分子任务清单 ({editTaskSubtasks.length})
                    </span>
                    {editTaskSubtasks.length > 0 && (
                      <span className="text-[10px] font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full shadow-sm">
                        已完成 {editTaskSubtasks.filter(s => s.completed).length} / {editTaskSubtasks.length} ({Math.round((editTaskSubtasks.filter(s => s.completed).length / editTaskSubtasks.length) * 100)}%)
                      </span>
                    )}
                  </div>

                  {/* Progress Bar */}
                  {editTaskSubtasks.length > 0 && (
                    <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full transition-all duration-300"
                        style={{ width: `${(editTaskSubtasks.filter(s => s.completed).length / editTaskSubtasks.length) * 100}%` }}
                      />
                    </div>
                  )}

                  {/* Subtasks Listing */}
                  <div className="space-y-1.5 max-h-[250px] overflow-y-auto pr-1">
                    {editTaskSubtasks.length === 0 ? (
                      <div className="text-center py-8 bg-neutral-50/50 rounded-2xl border border-dashed border-neutral-200 space-y-1.5">
                        <span className="text-lg block">📋</span>
                        <span className="text-[11px] text-neutral-400 font-medium block">暂无子任务，在下方添加任务细分，让大目标更易达成！</span>
                      </div>
                    ) : (
                      editTaskSubtasks.sort((a,b) => a.order - b.order).map((sub, sIdx) => (
                        <div key={sub.id} className="flex items-center justify-between p-2.5 bg-white border border-neutral-100 hover:border-neutral-200 rounded-xl group/sub text-xs transition shadow-sm">
                          <div className="flex items-center space-x-2.5 flex-1 min-w-0">
                            <button 
                              type="button"
                              onClick={() => toggleSubtask(sub.id)} 
                              className="text-neutral-400 hover:text-blue-500 transition cursor-pointer flex-shrink-0"
                            >
                              {sub.completed ? (
                                <CheckSquare className="w-4 h-4 text-blue-500" />
                              ) : (
                                <Square className="w-4 h-4 text-neutral-300" />
                              )}
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
                                className="flex-1 p-1 bg-neutral-50 border border-neutral-200 rounded-md text-xs focus:outline-none focus:border-blue-500 font-semibold"
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
                              onClick={() => moveSubtask(sIdx, 'up')} 
                              disabled={sIdx === 0} 
                              className="p-1 rounded hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 disabled:opacity-20 cursor-pointer"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              type="button"
                              onClick={() => moveSubtask(sIdx, 'down')} 
                              disabled={sIdx === editTaskSubtasks.length - 1} 
                              className="p-1 rounded hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 disabled:opacity-20 cursor-pointer"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
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
                  <div className="flex gap-2 pt-1.5">
                    <input
                      type="text"
                      placeholder="添加新子任务标题..."
                      value={newSubtaskTitle}
                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                      onKeyDown={handleNewSubtaskKeyDown}
                      className="flex-1 p-2.5 bg-neutral-50 hover:bg-neutral-100/50 focus:bg-white border border-neutral-200 focus:border-blue-500 rounded-xl text-xs font-semibold focus:outline-none transition-all placeholder-neutral-400"
                    />
                    <button 
                      type="button"
                      onClick={handleAddSubtask}
                      className="px-4 py-2 bg-neutral-800 text-white text-xs font-bold rounded-xl hover:bg-neutral-900 transition flex items-center cursor-pointer shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      添加
                    </button>
                  </div>
                </div>

                {/* Back button to Basic settings */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveModalTab('basic')}
                    className="w-full py-2.5 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-xl text-[10px] font-bold text-neutral-500 hover:text-neutral-700 transition"
                  >
                    ⬅️ 返回编辑基本设置与排程维度
                  </button>
                </div>
              </div>
            ) : (
              /* Layout Grid */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
              
              {/* Left Column: Basic Details */}
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1.5">任务名称</label>
                  <input
                    type="text"
                    value={editTaskTitle}
                    onChange={(e) => setEditTaskTitle(e.target.value)}
                    placeholder="输入日程任务标题..."
                    className="w-full p-3 bg-neutral-50 hover:bg-neutral-100/50 focus:bg-white border border-neutral-200 focus:border-blue-500 rounded-xl font-bold text-xs focus:outline-none transition-all placeholder-neutral-400"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1.5">描述信息</label>
                  <textarea
                    value={editTaskDesc}
                    onChange={(e) => setEditTaskDesc(e.target.value)}
                    placeholder="添加任务备注或说明细节..."
                    className="w-full p-3 bg-neutral-50 hover:bg-neutral-100/50 focus:bg-white border border-neutral-200 focus:border-blue-500 rounded-xl text-xs h-28 focus:outline-none transition-all resize-none placeholder-neutral-400"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setActiveModalTab('content')}
                  className="w-full flex items-center justify-between p-3 bg-blue-50/60 hover:bg-blue-50 text-blue-700 border border-blue-100 rounded-xl font-bold transition-all group cursor-pointer"
                >
                  <span className="flex items-center">
                    <CheckSquare className="w-4 h-4 mr-2" />
                    查看并编辑子任务及详细内容 {editTaskSubtasks.length > 0 ? `(${editTaskSubtasks.filter(s => s.completed).length}/${editTaskSubtasks.length})` : ''}
                  </span>
                  <span className="text-[10px] flex items-center text-blue-500 font-extrabold group-hover:translate-x-0.5 transition-transform">
                    点击跳转 ➔
                  </span>
                </button>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1.5">所属分类</label>
                    <select
                      value={editTaskCatId}
                      onChange={(e) => setEditTaskCatId(e.target.value)}
                      className="w-full p-2.5 bg-white border border-neutral-200 hover:border-neutral-300 rounded-xl text-xs font-semibold focus:border-blue-500 focus:outline-none cursor-pointer transition-all shadow-sm"
                    >
                      <option value="">未分类</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1.5">优先级标记</label>
                    <select
                      value={editTaskUrgency}
                      onChange={(e) => setEditTaskUrgency(e.target.value as Urgency)}
                      className="w-full p-2.5 bg-white border border-neutral-200 hover:border-neutral-300 rounded-xl text-xs font-semibold focus:border-blue-500 focus:outline-none cursor-pointer transition-all shadow-sm"
                    >
                      <option value="none">未设置 (默认)</option>
                      <option value="low">🟢 低优先级</option>
                      <option value="medium">🟡 中优先级</option>
                      <option value="high">🔴 高优先级</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Right Column: Scheduling & Repeating (Visual Shaded Card) */}
              <div className="bg-neutral-50/70 p-4 rounded-2xl border border-neutral-100 space-y-4">
                
                {/* Schedule Type Tabs */}
                <div>
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1.5">排程维度</label>
                  <div className="grid grid-cols-4 gap-1 p-1 bg-neutral-100 rounded-xl border border-neutral-200/60">
                    {(
                      [
                        { value: 'date', label: '具体天' },
                        { value: 'week', label: '特定周' },
                        { value: 'month', label: '特定月' },
                        { value: 'none', label: '待安排' }
                      ] as const
                    ).map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setEditTaskScheduleType(opt.value)}
                        className={`py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
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
                <div className="min-h-[120px] flex flex-col justify-center">
                  {editTaskScheduleType === 'date' && (
                    <div className="space-y-3 w-full animate-fade-in">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-neutral-500 block mb-1">开始日期</label>
                          <input
                            type="date"
                            value={editTaskDate}
                            onChange={(e) => {
                              const newStart = e.target.value;
                              setEditTaskDate(newStart);
                              if (editTaskEndDate && newStart > editTaskEndDate) {
                                setEditTaskEndDate('');
                              }
                            }}
                            className="w-full p-2.5 bg-white border border-neutral-200 rounded-xl text-xs font-semibold focus:border-blue-500 focus:outline-none transition-all shadow-sm"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-neutral-500 block mb-1">结束日期 (可选)</label>
                          <input
                            type="date"
                            value={editTaskEndDate}
                            onChange={(e) => {
                              const newEnd = e.target.value;
                              if (!editTaskDate || newEnd >= editTaskDate) {
                                setEditTaskEndDate(newEnd);
                              } else {
                                setEditTaskEndDate(editTaskDate);
                              }
                            }}
                            min={editTaskDate}
                            className="w-full p-2.5 bg-white border border-neutral-200 rounded-xl text-xs font-semibold focus:border-blue-500 focus:outline-none transition-all shadow-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-neutral-500 block mb-1">具体时间 (可选)</label>
                        <div className="relative flex items-center">
                          <input
                            type="time"
                            value={editTaskTime}
                            onChange={(e) => setEditTaskTime(e.target.value)}
                            className="w-full p-2.5 bg-white border border-neutral-200 rounded-xl text-xs font-semibold focus:border-blue-500 focus:outline-none pr-8 shadow-sm"
                          />
                          {editTaskTime && (
                            <button
                              type="button"
                              onClick={() => setEditTaskTime('')}
                              className="absolute right-2.5 text-neutral-400 hover:text-red-500 transition cursor-pointer"
                              title="清除时间"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {editTaskScheduleType === 'week' && (
                    <div className="space-y-2.5 w-full animate-fade-in">
                      <label className="text-[10px] font-bold text-neutral-500 block">选择特定周 (输入该周的周一日期)</label>
                      <input
                        type="date"
                        value={editTaskScheduledWeek}
                        onChange={(e) => {
                          const d = new Date(e.target.value);
                          if (!isNaN(d.getTime())) {
                            const day = d.getDay();
                            const diff = d.getDate() - day + (day === 0 ? -6 : 1);
                            const monday = new Date(d.setDate(diff));
                            setEditTaskScheduledWeek(formatDate(monday));
                          } else {
                            setEditTaskScheduledWeek(e.target.value);
                          }
                        }}
                        className="w-full p-2.5 bg-white border border-neutral-200 rounded-xl text-xs font-semibold focus:border-blue-500 focus:outline-none shadow-sm"
                      />
                      <div className="text-[10px] text-amber-700 bg-amber-50/80 p-3 rounded-xl border border-amber-100/60 leading-normal flex items-start space-x-1.5 shadow-sm">
                        <span className="text-amber-500 text-sm leading-none">💡</span>
                        <span>任务将被安排至周一为 <b>{editTaskScheduledWeek || '(请选择)'}</b> 的那个星期，并在「本周日程清单」中突出显示。</span>
                      </div>
                    </div>
                  )}

                  {editTaskScheduleType === 'month' && (
                    <div className="space-y-2.5 w-full animate-fade-in">
                      <label className="text-[10px] font-bold text-neutral-500 block">选择特定月份</label>
                      <input
                        type="month"
                        value={editTaskScheduledMonth}
                        onChange={(e) => setEditTaskScheduledMonth(e.target.value)}
                        className="w-full p-2.5 bg-white border border-neutral-200 rounded-xl text-xs font-semibold focus:border-blue-500 focus:outline-none shadow-sm"
                      />
                      <div className="text-[10px] text-amber-700 bg-amber-50/80 p-3 rounded-xl border border-amber-100/60 leading-normal flex items-start space-x-1.5 shadow-sm">
                        <span className="text-amber-500 text-sm leading-none">💡</span>
                        <span>任务将被安排至 <b>{editTaskScheduledMonth || '(请选择)'}</b> 这个月，并在「本月日程清单」中突出显示。</span>
                      </div>
                    </div>
                  )}

                  {editTaskScheduleType === 'none' && (
                    <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100/80 leading-normal flex items-start space-x-1.5 animate-fade-in shadow-sm w-full">
                      <span className="text-blue-500 text-sm leading-none">📌</span>
                      <div className="space-y-0.5">
                        <span className="text-[11px] font-extrabold text-blue-800 block">待安排/未定日程</span>
                        <span className="text-[10px] text-blue-600 block leading-relaxed font-medium">
                          任务将不关联任何具体日期、星期或月份，并安全保存至底部的「待安排」任务池中，支持通过拖拽随心安排。
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Repeating and Reminder side by side */}
                <div className="grid grid-cols-2 gap-3 border-t border-neutral-200/50 pt-3">
                  <div>
                    <label className="text-[10px] font-bold text-neutral-500 block mb-1">重复设置</label>
                    <select
                      value={editTaskRepeat}
                      onChange={(e) => setEditTaskRepeat(e.target.value as any)}
                      className="w-full p-2.5 bg-white border border-neutral-200 hover:border-neutral-300 rounded-xl text-xs font-semibold cursor-pointer focus:border-blue-500 focus:outline-none shadow-sm transition-all"
                    >
                      <option value="none">🔄 不重复</option>
                      <option value="daily">📅 每天</option>
                      <option value="weekly">📅 每周</option>
                      <option value="weekly-friday">📅 每周五</option>
                      <option value="monthly">📅 每月</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-neutral-500 block mb-1">提前提醒</label>
                    <select
                      value={editTaskReminder}
                      onChange={(e) => setEditTaskReminder(e.target.value as any)}
                      className="w-full p-2.5 bg-white border border-neutral-200 hover:border-neutral-300 rounded-xl text-xs font-semibold cursor-pointer focus:border-blue-500 focus:outline-none shadow-sm transition-all"
                    >
                      <option value="none">🔔 无提醒</option>
                      <option value="5m">5 分钟前</option>
                      <option value="15m">15 分钟前</option>
                      <option value="1h">1 小时前</option>
                      <option value="1d">1 天前</option>
                    </select>
                  </div>
                </div>

              </div>

            </div>
            )}

            {/* Actions Bar */}
            <div className="flex items-center justify-between pt-4 border-t border-neutral-100 gap-3">
              <button
                type="button"
                onClick={handleModalDeleteTask}
                className="px-3.5 py-2.5 bg-red-50 hover:bg-red-100/80 text-red-600 rounded-xl font-extrabold transition flex items-center border border-red-200/50 shadow-sm cursor-pointer"
                title="彻底删除此任务"
              >
                <Trash className="w-3.5 h-3.5 mr-1.5" />
                彻底删除
              </button>

              <div className="flex space-x-2">
                <button 
                  type="button" 
                  onClick={() => setEditingTask(null)}
                  className="px-4 py-2.5 bg-neutral-100 text-neutral-600 rounded-xl font-extrabold hover:bg-neutral-200 transition cursor-pointer"
                >
                  取消
                </button>
                <button 
                  type="button" 
                  onClick={handleSaveModalTaskEdits}
                  className="px-6 py-2.5 bg-neutral-800 hover:bg-neutral-900 text-white font-extrabold rounded-xl shadow-md transition cursor-pointer"
                >
                  保存修改
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
