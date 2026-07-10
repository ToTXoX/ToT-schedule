import React, { useState, useRef } from 'react';
import { 
  Category, Task, Subtask, Urgency, MoodEmoji 
} from '../types';
import { 
  Folder, Plus, Trash2, Edit2, ChevronDown, ChevronRight, CheckSquare, Square,
  GripVertical, Calendar, Clock, AlertTriangle, ArrowUp, ArrowDown, Settings, Check, X, Trash, ArrowUpDown
} from 'lucide-react';

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

interface TaskLibraryProps {
  categories: Category[];
  tasks: Task[];
  selectedCategoryId: string | 'all' | 'unscheduled';
  onSelectCategory: (id: string | 'all' | 'unscheduled') => void;
  onAddCategory: (name: string, color: string) => void;
  onUpdateCategory: (id: string, updates: Partial<Category>) => void;
  onDeleteCategory: (id: string) => void;
  onReorderCategories: (categories: Category[]) => void;
  onAddTask: (title: string, categoryId?: string) => void;
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onDeleteTask: (id: string) => void;
  onReorderTasks: (tasks: Task[]) => void;
}

const PRESET_COLORS = [
  // 红 (Red)
  { name: '落樱红 (浅)', value: 'red-light', hex: '#ffe4e6', bg: 'bg-rose-100', text: 'text-rose-500' },
  { name: '珊瑚红 (中)', value: 'red-medium', hex: '#fda4af', bg: 'bg-rose-300', text: 'text-rose-600' },
  { name: '胭脂红 (深)', value: 'red-dark', hex: '#f43f5e', bg: 'bg-rose-500', text: 'text-rose-800' },
  // 橙 (Orange)
  { name: '杏花橙 (浅)', value: 'orange-light', hex: '#ffedd5', bg: 'bg-orange-100', text: 'text-orange-500' },
  { name: '蜜桃橙 (中)', value: 'orange-medium', hex: '#fdba74', bg: 'bg-orange-300', text: 'text-orange-600' },
  { name: '晚霞橙 (深)', value: 'orange-dark', hex: '#f97316', bg: 'bg-orange-500', text: 'text-orange-800' },
  // 黄 (Yellow)
  { name: '晨光黄 (浅)', value: 'yellow-light', hex: '#fef3c7', bg: 'bg-amber-100', text: 'text-amber-600' },
  { name: '向日葵 (中)', value: 'yellow-medium', hex: '#fcd34d', bg: 'bg-amber-300', text: 'text-amber-700' },
  { name: '琥珀黄 (深)', value: 'yellow-dark', hex: '#f59e0b', bg: 'bg-amber-500', text: 'text-amber-900' },
  // 绿 (Green)
  { name: '薄荷绿 (浅)', value: 'green-light', hex: '#dcfce7', bg: 'bg-emerald-100', text: 'text-emerald-600' },
  { name: '青草绿 (中)', value: 'green-medium', hex: '#6ee7b7', bg: 'bg-emerald-300', text: 'text-emerald-700' },
  { name: '翡翠绿 (深)', value: 'green-dark', hex: '#10b981', bg: 'bg-emerald-500', text: 'text-emerald-900' },
  // 蓝 (Blue)
  { name: '晴空蓝 (浅)', value: 'blue-light', hex: '#e0f2fe', bg: 'bg-sky-100', text: 'text-sky-600' },
  { name: '湖水蓝 (中)', value: 'blue-medium', hex: '#7dd3fc', bg: 'bg-sky-300', text: 'text-sky-700' },
  { name: '深海蓝 (深)', value: 'blue-dark', hex: '#0284c7', bg: 'bg-sky-500', text: 'text-sky-900' },
  // 靛 (Indigo)
  { name: '静谧靛 (浅)', value: 'indigo-light', hex: '#e0e7ff', bg: 'bg-indigo-100', text: 'text-indigo-500' },
  { name: '风信子 (中)', value: 'indigo-medium', hex: '#a5b4fc', bg: 'bg-indigo-300', text: 'text-indigo-600' },
  { name: '青金石 (深)', value: 'indigo-dark', hex: '#6366f1', bg: 'bg-indigo-500', text: 'text-indigo-800' },
  // 紫 (Purple)
  { name: '丁香紫 (浅)', value: 'purple-light', hex: '#f3e8ff', bg: 'bg-purple-100', text: 'text-purple-500' },
  { name: '薰衣紫 (中)', value: 'purple-medium', hex: '#d8b4fe', bg: 'bg-purple-300', text: 'text-purple-600' },
  { name: '风铃紫 (深)', value: 'purple-dark', hex: '#a855f7', bg: 'bg-purple-500', text: 'text-purple-800' },
  // 灰 (Gray)
  { name: '晨雾灰 (浅)', value: 'gray-light', hex: '#f1f5f9', bg: 'bg-slate-100', text: 'text-slate-500' },
  { name: '水泥灰 (中)', value: 'gray-medium', hex: '#cbd5e1', bg: 'bg-slate-300', text: 'text-slate-600' },
  { name: '黛墨灰 (深)', value: 'gray-dark', hex: '#64748b', bg: 'bg-slate-500', text: 'text-slate-800' },
];

export default function TaskLibrary({
  categories,
  tasks,
  selectedCategoryId,
  onSelectCategory,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onReorderCategories,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onReorderTasks
}: TaskLibraryProps) {
  const lastBlurTimeRef = useRef<number>(0);

  // Category management states
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('blue-medium');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatColor, setEditCatColor] = useState('blue-medium');
  const [activeColorPickerCatId, setActiveColorPickerCatId] = useState<string | null>(null);

  // Task creation/editing states
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState('');
  const [editTaskDesc, setEditTaskDesc] = useState('');
  const [editTaskDate, setEditTaskDate] = useState('');
  const [editTaskEndDate, setEditTaskEndDate] = useState('');
  const [editTaskTime, setEditTaskTime] = useState('');
  const [editTaskUrgency, setEditTaskUrgency] = useState<Urgency>('none');
  const [editTaskCatId, setEditTaskCatId] = useState('');
  const [editTaskRepeat, setEditTaskRepeat] = useState<'none' | 'daily' | 'weekly' | 'weekly-friday' | 'monthly'>('none');
  const [editTaskReminder, setEditTaskReminder] = useState<'none' | '5m' | '15m' | '1h' | '1d'>('none');
  const [editTaskScheduleType, setEditTaskScheduleType] = useState<'date' | 'week' | 'month' | 'none'>('none');
  const [editTaskScheduledWeek, setEditTaskScheduledWeek] = useState('');
  const [editTaskScheduledMonth, setEditTaskScheduledMonth] = useState('');
  const [isWeekFocused, setIsWeekFocused] = useState(false);
  const [isMonthFocused, setIsMonthFocused] = useState(false);

  const taskLibWeekInputRef = useRef<HTMLInputElement>(null);
  const taskLibMonthInputRef = useRef<HTMLInputElement>(null);

  // Subtask creation state
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editSubtaskTitle, setEditSubtaskTitle] = useState('');

  // Drag and Drop Categories State
  const [draggedCatIndex, setDraggedCatIndex] = useState<number | null>(null);
  const [draggedTaskIndex, setDraggedTaskIndex] = useState<number | null>(null);
  const [draggedSubIndex, setDraggedSubIndex] = useState<number | null>(null);

  // Inline task title editing states
  const [inlineEditingTaskId, setInlineEditingTaskId] = useState<string | null>(null);
  const [inlineEditTitle, setInlineEditTitle] = useState('');

  // Inline task date editing states
  const [inlineEditingDateTaskId, setInlineEditingDateTaskId] = useState<string | null>(null);
  const [inlineEditDate, setInlineEditDate] = useState('');

  // Inline task time editing states
  const [inlineEditingTimeTaskId, setInlineEditingTimeTaskId] = useState<string | null>(null);
  const [inlineEditTime, setInlineEditTime] = useState('');

  // Inline task urgency editing states
  const [inlineEditingUrgencyTaskId, setInlineEditingUrgencyTaskId] = useState<string | null>(null);

  // Sorting state
  const [isSortedByTime, setIsSortedByTime] = useState(false);

  // Ref to hold the single-click timeout for distinguishing single and double clicks
  const clickTimeoutRef = useRef<any>(null);

  const handleSaveInlineTitle = (taskId: string) => {
    if (inlineEditTitle.trim()) {
      onUpdateTask(taskId, { title: inlineEditTitle.trim() });
    }
    setInlineEditingTaskId(null);
    lastBlurTimeRef.current = Date.now();
  };

  // Filter tasks based on category selection
  const filteredTasks = tasks.filter(task => {
    if (selectedCategoryId === 'all') return true;
    if (selectedCategoryId === 'unscheduled') return !task.categoryId;
    return task.categoryId === selectedCategoryId;
  }).sort((a, b) => a.order - b.order);

  // Time-based sorting logic
  const getSortedTasksByTime = (taskList: Task[]) => {
    return [...taskList].sort((a, b) => {
      const getTier = (t: Task) => {
        if (t.completed) return 4;
        if (t.urgency === 'high') return 1;
        if (t.date) return 2;
        return 3;
      };
      
      const tierA = getTier(a);
      const tierB = getTier(b);
      
      if (tierA !== tierB) {
        return tierA - tierB;
      }
      
      const compareDates = (x: Task, y: Task) => {
        const dateX = x.date || '';
        const dateY = y.date || '';
        if (dateX !== dateY) {
          if (!dateX) return 1;
          if (!dateY) return -1;
          return dateX.localeCompare(dateY);
        }
        const timeX = x.time || '';
        const timeY = y.time || '';
        if (timeX !== timeY) {
          if (!timeX) return 1;
          if (!timeY) return -1;
          return timeX.localeCompare(timeY);
        }
        return x.order - y.order;
      };
      
      if (tierA === 1) {
        const hasDateA = !!a.date;
        const hasDateB = !!b.date;
        if (hasDateA && hasDateB) {
          return compareDates(a, b);
        } else if (hasDateA) {
          return -1;
        } else if (hasDateB) {
          return 1;
        }
        return a.order - b.order;
      }
      
      if (tierA === 2) {
        return compareDates(a, b);
      }
      
      return a.order - b.order;
    });
  };

  const displayTasks = isSortedByTime ? getSortedTasksByTime(filteredTasks) : filteredTasks;

  // Helper to get category background classes
  const getCatColorClasses = (colorName: string) => {
    const preset = PRESET_COLORS.find(p => p.value === colorName) || PRESET_COLORS[0];
    return {
      dot: preset.bg,
      text: preset.text,
      badge: `${preset.bg} text-white`
    };
  };

  const getCatColorHex = (colorName: string, customHex?: string) => {
    if (customHex) return customHex;
    const preset = PRESET_COLORS.find(p => p.value === colorName);
    return preset ? preset.hex : '#64748b';
  };

  // Category Add
  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    onAddCategory(newCatName.trim(), newCatColor);
    setNewCatName('');
    setIsAddingCategory(false);
  };

  // Category Save
  const handleSaveCategoryEdit = (id: string) => {
    if (!editCatName.trim()) return;
    const preset = PRESET_COLORS.find(p => p.value === editCatColor);
    onUpdateCategory(id, { 
      name: editCatName.trim(), 
      color: editCatColor,
      colorHex: preset ? preset.hex : '#3b82f6'
    });
    setEditingCategoryId(null);
  };

  // Start edit category
  const startEditCategory = (cat: Category) => {
    setEditingCategoryId(cat.id);
    setEditCatName(cat.name);
    setEditCatColor(cat.color);
  };

  // Category sorting by buttons (Up / Down)
  const moveCategory = (index: number, direction: 'up' | 'down') => {
    const nextIndex = direction === 'up' ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= categories.length) return;
    const reordered = [...categories];
    const [removed] = reordered.splice(index, 1);
    reordered.splice(nextIndex, 0, removed);
    // Update orders
    reordered.forEach((cat, idx) => {
      cat.order = idx;
    });
    onReorderCategories(reordered);
  };

  // Add Task
  const handleAddTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    const targetCatId = selectedCategoryId === 'all' || selectedCategoryId === 'unscheduled' ? undefined : selectedCategoryId;
    onAddTask(newTaskTitle.trim(), targetCatId);
    setNewTaskTitle('');
  };

  // Toggle Task Completion
  const toggleTaskCompletion = (task: Task) => {
    onUpdateTask(task.id, { completed: !task.completed });
  };

  // Subtask Addition
  const handleAddSubtask = (task: Task) => {
    if (!newSubtaskTitle.trim()) return;
    const nextOrder = task.subtasks.length;
    const newSub: Subtask = {
      id: Math.random().toString(36).substring(2, 9),
      title: newSubtaskTitle.trim(),
      completed: false,
      order: nextOrder
    };
    onUpdateTask(task.id, { subtasks: [...task.subtasks, newSub] });
    setNewSubtaskTitle('');
  };

  // Subtask Toggle
  const toggleSubtask = (task: Task, subId: string) => {
    const updatedSubtasks = task.subtasks.map(sub => 
      sub.id === subId ? { ...sub, completed: !sub.completed } : sub
    );
    onUpdateTask(task.id, { subtasks: updatedSubtasks });
  };

  // Subtask Delete
  const deleteSubtask = (task: Task, subId: string) => {
    const updatedSubtasks = task.subtasks.filter(sub => sub.id !== subId)
      .map((sub, idx) => ({ ...sub, order: idx }));
    onUpdateTask(task.id, { subtasks: updatedSubtasks });
  };

  // Subtask Reorder
  const moveSubtask = (task: Task, index: number, direction: 'up' | 'down') => {
    const nextIndex = direction === 'up' ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= task.subtasks.length) return;
    const reordered = [...task.subtasks];
    const [removed] = reordered.splice(index, 1);
    reordered.splice(nextIndex, 0, removed);
    reordered.forEach((sub, idx) => {
      sub.order = idx;
    });
    onUpdateTask(task.id, { subtasks: reordered });
  };

  // Subtask Edit title
  const startEditSubtask = (subId: string, title: string) => {
    setEditingSubtaskId(subId);
    setEditSubtaskTitle(title);
  };

  const handleSaveSubtaskTitle = (task: Task, subId: string) => {
    if (!editSubtaskTitle.trim()) {
      setEditingSubtaskId(null);
      return;
    }
    const updatedSubtasks = task.subtasks.map(sub =>
      sub.id === subId ? { ...sub, title: editSubtaskTitle.trim() } : sub
    );
    onUpdateTask(task.id, { subtasks: updatedSubtasks });
    setEditingSubtaskId(null);
  };

  // Task Reorder buttons
  const moveTask = (index: number, direction: 'up' | 'down') => {
    const nextIndex = direction === 'up' ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= filteredTasks.length) return;
    
    const currentTask = filteredTasks[index];
    const targetTask = filteredTasks[nextIndex];
    
    const updatedTasks = tasks.map(t => {
      if (t.id === currentTask.id) {
        return { ...t, order: targetTask.order };
      }
      if (t.id === targetTask.id) {
        return { ...t, order: currentTask.order };
      }
      return t;
    });
    
    onReorderTasks(updatedTasks);
  };

  // Start Editing Task details
  const startEditTask = (task: Task) => {
    setEditingTaskId(task.id);
    setEditTaskTitle(task.title);
    setEditTaskDesc(task.description || '');
    setEditTaskDate(task.date || '');
    setEditTaskEndDate(task.endDate || '');
    setEditTaskTime(task.time || '');
    setEditTaskUrgency(task.urgency || 'none');
    setEditTaskCatId(task.categoryId || '');
    setEditTaskRepeat(task.repeat || 'none');
    setEditTaskReminder(task.reminder || 'none');

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

  // Save Task edits
  const handleSaveTaskEdits = (id: string) => {
    const updates: Partial<Task> = {
      title: editTaskTitle.trim(),
      description: editTaskDesc.trim() || undefined,
      urgency: editTaskUrgency,
      categoryId: editTaskCatId || undefined,
      repeat: editTaskRepeat,
      reminder: editTaskReminder,
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

    onUpdateTask(id, updates);
    setEditingTaskId(null);
  };

  // Drag & Drop handlers for Categories (HTML5)
  const handleCatDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => {
      setDraggedCatIndex(index);
    }, 0);
  };

  const handleCatDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const handleCatDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedCatIndex === null || draggedCatIndex === index) return;
    const reordered = [...categories];
    const [removed] = reordered.splice(draggedCatIndex, 1);
    reordered.splice(index, 0, removed);
    reordered.forEach((cat, idx) => {
      cat.order = idx;
    });
    onReorderCategories(reordered);
    setDraggedCatIndex(null);
  };

  // Drag & Drop handlers for Tasks
  const handleTaskDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => {
      setDraggedTaskIndex(index);
    }, 0);
  };

  const handleTaskDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const handleTaskDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedTaskIndex === null || draggedTaskIndex === index) return;
    
    // Create copy of all tasks in the current category/view, update orders
    const categorySpecificTasks = [...filteredTasks];
    const [removed] = categorySpecificTasks.splice(draggedTaskIndex, 1);
    categorySpecificTasks.splice(index, 0, removed);
    
    // Distribute original orders to newly ordered tasks
    const originalOrders = filteredTasks.map(t => t.order).sort((a, b) => a - b);
    
    // Create a map of task ID to its new order
    const orderMap = new Map<string, number>();
    categorySpecificTasks.forEach((t, idx) => {
      orderMap.set(t.id, originalOrders[idx]);
    });
    
    // Update all tasks in the master list
    const updatedTasks = tasks.map(t => {
      if (orderMap.has(t.id)) {
        return { ...t, order: orderMap.get(t.id)! };
      }
      return t;
    });
    
    onReorderTasks(updatedTasks);
    setDraggedTaskIndex(null);
  };

  // Drag & Drop handlers for Subtasks
  const handleSubDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    e.stopPropagation();
    setDraggedSubIndex(index);
  };

  const handleSubDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleSubDrop = (e: React.DragEvent, task: Task, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedSubIndex === null || draggedSubIndex === targetIndex) return;

    const subtasksSorted = [...task.subtasks].sort((a, b) => a.order - b.order);
    const [removed] = subtasksSorted.splice(draggedSubIndex, 1);
    subtasksSorted.splice(targetIndex, 0, removed);

    // Reassign orders
    const updatedSubtasks = subtasksSorted.map((sub, idx) => ({
      ...sub,
      order: idx
    }));

    onUpdateTask(task.id, { subtasks: updatedSubtasks });
    setDraggedSubIndex(null);
  };

  // Get display details of category for selected category
  const getSelectedCategoryDetails = () => {
    if (selectedCategoryId === 'all') {
      return { name: '全部任务', colorClass: 'text-neutral-700 bg-neutral-100', colorHex: '#64748b' };
    }
    if (selectedCategoryId === 'unscheduled') {
      return { name: '未分类', colorClass: 'text-amber-700 bg-amber-50', colorHex: '#d97706' };
    }
    const cat = categories.find(c => c.id === selectedCategoryId);
    if (cat) {
      const cls = getCatColorClasses(cat.color);
      const hex = getCatColorHex(cat.color, cat.colorHex);
      return { name: cat.name, colorClass: `${cls.text} bg-${cat.color}-50`, colorHex: hex };
    }
    return { name: '全部任务', colorClass: 'text-neutral-700 bg-neutral-100', colorHex: '#64748b' };
  };

  const currentCatDetails = getSelectedCategoryDetails();

  return (
    <div id="task-library-root" className="grid grid-cols-1 md:grid-cols-12 gap-4 h-full items-start min-w-0">
      
      {/* 1. Category Sidebar (widen on smaller screen sizes to show full names) */}
      <div id="category-sidebar" className="surface-panel col-span-12 md:col-span-5 lg:col-span-4 bg-white rounded-2xl p-4 border border-neutral-100 flex flex-col space-y-4 min-w-0">
        
        <div className="flex items-center justify-between">
          <h3 className="font-sans text-base font-semibold text-neutral-800 flex items-center">
            <Folder className="w-5 h-5 mr-2 text-neutral-500" />
            任务分类
          </h3>
          <button 
            id="btn-add-category-toggle"
            onClick={() => setIsAddingCategory(!isAddingCategory)} 
            className="p-1 rounded-lg hover:bg-neutral-100 text-neutral-600 transition"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Create Category Dialog */}
        {isAddingCategory && (
          <form id="form-add-category" onSubmit={handleCreateCategory} className="bg-neutral-50 p-3 rounded-xl border border-neutral-100 space-y-3">
            <div>
              <label className="text-xs text-neutral-500 block mb-1">分类名称</label>
              <input 
                id="input-category-name"
                type="text" 
                placeholder="例如: 工作、健身、购物..."
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="text-[11px] text-neutral-400 font-bold block mb-1.5 uppercase tracking-wider">选择主题色 ( 浅 · 中 · 深 )</label>
              <div className="grid grid-cols-3 gap-x-3.5 gap-y-2 w-max bg-white/60 p-2.5 rounded-2xl border border-neutral-100/80 shadow-sm">
                {PRESET_COLORS.map(color => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setNewCatColor(color.value)}
                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer ${color.bg} ${newCatColor === color.value ? 'scale-110 ring-2 ring-neutral-400 ring-offset-1' : 'hover:scale-[1.08]'}`}
                    title={color.name}
                  >
                    {newCatColor === color.value && <Check className={`w-3.5 h-3.5 ${color.text}`} />}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end space-x-2 pt-1">
              <button 
                type="button" 
                onClick={() => setIsAddingCategory(false)}
                className="px-3 py-1 bg-neutral-200 text-neutral-600 rounded-lg text-xs hover:bg-neutral-300"
              >
                取消
              </button>
              <button 
                type="submit" 
                className="px-3 py-1 bg-neutral-800 text-white rounded-lg text-xs hover:bg-neutral-900"
              >
                新建
              </button>
            </div>
          </form>
        )}

        {/* Category List */}
        <div id="category-list" className="space-y-1 overflow-y-auto max-h-[650px] pr-1">
          {/* Default Categories */}
          <button
            id="cat-btn-all"
            onClick={() => onSelectCategory('all')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition ${selectedCategoryId === 'all' ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-600 hover:bg-neutral-50'}`}
          >
            <span className="flex items-center">
              <span className="w-2.5 h-2.5 rounded-full bg-neutral-400 mr-2" />
              全部任务
            </span>
            <span className="bg-neutral-200 text-neutral-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
              {tasks.length}
            </span>
          </button>

          <button
            id="cat-btn-unscheduled"
            onClick={() => onSelectCategory('unscheduled')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition ${selectedCategoryId === 'unscheduled' ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-600 hover:bg-neutral-50'}`}
          >
            <span className="flex items-center">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 mr-2" />
              未分类
            </span>
            <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-[10px] font-bold">
              {tasks.filter(t => !t.categoryId).length}
            </span>
          </button>

          <div className="h-px bg-neutral-100 my-2" />

          {/* User Custom Categories */}
          {categories.map((cat, idx) => {
            const cls = getCatColorClasses(cat.color);
            const isEditing = editingCategoryId === cat.id;
            const taskCount = tasks.filter(t => t.categoryId === cat.id).length;

            return (
              <div
                key={cat.id}
                draggable
                onDragStart={(e) => handleCatDragStart(e, idx)}
                onDragOver={(e) => handleCatDragOver(e, idx)}
                onDrop={(e) => handleCatDrop(e, idx)}
                className={`group flex flex-col p-1.5 rounded-xl border transition ${selectedCategoryId === cat.id ? 'bg-neutral-50 border-neutral-200/60 shadow-sm' : 'border-transparent hover:bg-neutral-50/75'}`}
              >
                {isEditing ? (
                  <div className="space-y-2 p-1.5" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      value={editCatName}
                      onChange={(e) => setEditCatName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSaveCategoryEdit(cat.id);
                        } else if (e.key === 'Escape') {
                          setEditingCategoryId(null);
                        }
                      }}
                      onBlur={() => handleSaveCategoryEdit(cat.id)}
                      className="w-full text-xs px-2.5 py-1.5 bg-white border border-neutral-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-neutral-400 font-bold shadow-sm"
                      autoFocus
                    />
                    <div className="grid grid-cols-3 gap-1 pt-1.5 w-max bg-neutral-50/50 p-1.5 rounded-xl border border-neutral-200/40 shadow-inner">
                      {PRESET_COLORS.map(color => (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() => setEditCatColor(color.value)}
                          className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${color.bg} transition-all hover:scale-110 cursor-pointer`}
                          title={color.name}
                        >
                          {editCatColor === color.value && <Check className={`w-2 h-2 ${color.text}`} />}
                        </button>
                      ))}
                    </div>
                    <div className="flex justify-end space-x-1">
                      <button onClick={() => setEditingCategoryId(null)} className="p-1 rounded-lg hover:bg-neutral-100 text-neutral-400">
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleSaveCategoryEdit(cat.id)} className="p-1 rounded-lg bg-neutral-800 text-white hover:bg-neutral-900">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between w-full min-h-[32px] px-1.5">
                    <div 
                      className="flex items-center space-x-2 flex-1 min-w-0 py-0.5" 
                      onClick={() => onSelectCategory(cat.id)}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        startEditCategory(cat);
                      }}
                      title="单击选择，双击修改名称"
                    >
                      <GripVertical className="w-3.5 h-3.5 text-neutral-300 cursor-grab group-hover:text-neutral-400 flex-shrink-0" />
                      
                      {/* Checkbox to control visibility in Calendar - Light gray theme */}
                      <input 
                        type="checkbox"
                        checked={cat.visible !== false}
                        onChange={(e) => {
                          e.stopPropagation();
                          onUpdateCategory(cat.id, { visible: e.target.checked });
                        }}
                        className="w-3.5 h-3.5 rounded border-neutral-300 text-neutral-400 focus:ring-0 cursor-pointer accent-neutral-300 bg-white"
                        title="在日历中显示/隐藏"
                        onClick={(e) => e.stopPropagation()}
                      />

                      {/* Clickable dot to change theme color */}
                      <div className="relative flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveColorPickerCatId(activeColorPickerCatId === cat.id ? null : cat.id);
                          }}
                          className={`w-2.5 h-2.5 rounded-full ${cls.dot} cursor-pointer hover:scale-125 transition-transform relative outline-none flex items-center justify-center`}
                          title="点击快速修改主题色"
                        />
                        
                        {/* Mini Popover Color Picker */}
                        {activeColorPickerCatId === cat.id && (() => {
                          const isNearBottom = categories.length > 1 && idx >= categories.length - 2;
                          return (
                            <>
                              {/* Backdrop to close color picker */}
                              <div 
                                className="fixed inset-0 z-40 cursor-default" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveColorPickerCatId(null);
                                }}
                              />
                              <div className={`absolute left-0 bg-white border border-neutral-200/80 rounded-2xl p-2.5 shadow-xl z-50 grid grid-cols-3 gap-1.5 w-max animate-fade-in ${
                                isNearBottom ? 'bottom-full mb-2' : 'top-4 mt-2'
                              }`}>
                                {PRESET_COLORS.map(color => (
                                  <button
                                    key={color.value}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onUpdateCategory(cat.id, { color: color.value, colorHex: color.hex });
                                      setActiveColorPickerCatId(null);
                                    }}
                                    className={`w-4 h-4 rounded-full flex items-center justify-center ${color.bg} hover:scale-110 transition-all cursor-pointer shadow-sm`}
                                    title={color.name}
                                  >
                                    {cat.color === color.value && <Check className={`w-2.5 h-2.5 ${color.text}`} />}
                                  </button>
                                ))}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                      
                      <span className={`text-xs whitespace-normal break-all cursor-pointer ${selectedCategoryId === cat.id ? 'text-neutral-900 font-bold' : 'text-neutral-600 font-medium hover:text-neutral-900'}`}>
                        {cat.name}
                      </span>
                    </div>

                    {/* Actions and Count Badge aligned properly on the right */}
                    <div className="flex items-center space-x-1.5 flex-shrink-0">
                      <div className="flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition duration-150">
                        <button 
                          onClick={(e) => { e.stopPropagation(); onDeleteCategory(cat.id); }} 
                          className="p-1 rounded-lg hover:bg-red-50 text-neutral-400 hover:text-red-500 cursor-pointer"
                          title="删除分类"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>

                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold min-w-[22px] text-center ${selectedCategoryId === cat.id ? cls.badge : 'bg-neutral-100 text-neutral-500'}`}>
                        {taskCount}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>

      {/* 2. Task List Panel (narrow on smaller screen sizes to accommodate wider sidebar) */}
      <div id="task-workspace" className="surface-panel col-span-12 md:col-span-7 lg:col-span-8 bg-white rounded-2xl p-5 border border-neutral-100 flex flex-col space-y-4 min-w-0">
        
        {/* Workspace Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
          <div>
            <span 
              className="inline-block px-3 py-1 rounded-full text-xs font-bold border"
              style={{ 
                backgroundColor: `${currentCatDetails.colorHex}15`, 
                borderColor: `${currentCatDetails.colorHex}25`, 
                color: currentCatDetails.colorHex 
              }}
            >
              {currentCatDetails.name}
            </span>
            <span className="text-xs text-neutral-400 ml-2">({filteredTasks.length} 个任务)</span>
          </div>

          <button
            type="button"
            onClick={() => setIsSortedByTime(!isSortedByTime)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition shadow-sm hover:opacity-90 active:scale-95"
            style={
              isSortedByTime 
                ? {
                    backgroundColor: `${currentCatDetails.colorHex}20`,
                    borderColor: `${currentCatDetails.colorHex}40`,
                    color: currentCatDetails.colorHex,
                  }
                : {
                    backgroundColor: '#ffffff',
                    borderColor: '#e5e5e5',
                    color: '#525252',
                  }
            }
            title={isSortedByTime ? '当前：按时间排序（再次点击恢复自定义顺序）' : '按时间排序（最紧急、有日期、无日期、已完成）'}
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>{isSortedByTime ? '时间排序' : '自定义排序'}</span>
          </button>
        </div>

        {/* Task Form Input */}
        <form id="form-add-task" onSubmit={handleAddTaskSubmit} className="flex gap-2 min-w-0">
          <input
            id="input-task-title"
            type="text"
            placeholder={`添加新任务到「${currentCatDetails.name}」...`}
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            className="flex-1 min-w-0 w-0 text-sm px-4 py-2.5 bg-neutral-50 rounded-xl border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition"
          />
          <button
            type="submit"
            className="px-4 py-2.5 bg-neutral-800 text-white rounded-xl text-xs font-medium hover:bg-neutral-900 transition flex items-center flex-shrink-0"
          >
            <Plus className="w-4 h-4 mr-1" />
            添加
          </button>
        </form>

        {/* Filtered Task List */}
        <div id="tasks-list-container" className="space-y-2 overflow-y-auto max-h-[500px] pr-1">
          {displayTasks.length === 0 ? (
            <div className="text-center py-12 text-neutral-400 text-xs">
              暂无任务，快去添加一个吧！
            </div>
          ) : (
            displayTasks.map((task, idx) => {
              const isExpanded = expandedTaskId === task.id;
              const isTaskEditing = editingTaskId === task.id;
              const taskCat = categories.find(c => c.id === task.categoryId);

              return (
                <div
                  key={task.id}
                  draggable={!isExpanded && !isSortedByTime}
                  onDragStart={(e) => {
                    if (isExpanded || isSortedByTime) {
                      e.preventDefault();
                      return;
                    }
                    handleTaskDragStart(e, idx);
                  }}
                  onDragEnd={() => setDraggedTaskIndex(null)}
                  onDragOver={(e) => {
                    if (isExpanded || isSortedByTime) return;
                    handleTaskDragOver(e, idx);
                  }}
                  onDrop={(e) => {
                    if (isExpanded || isSortedByTime) return;
                    handleTaskDrop(e, idx);
                  }}
                  className={`task-card border rounded-xl overflow-hidden transition ${task.completed ? 'bg-neutral-50/50 border-neutral-100 opacity-75' : 'bg-white border-neutral-200 hover:border-neutral-300'} ${draggedTaskIndex === idx ? 'opacity-30 border-neutral-200 bg-neutral-50/50' : ''}`}
                >
                  {/* Task Header */}
                  <div 
                    className="p-3.5 flex items-center justify-between gap-3 group select-none cursor-pointer"
                    onClick={(e) => {
                      if (Date.now() - lastBlurTimeRef.current < 200) {
                        return;
                      }
                      const target = e.target as HTMLElement;
                      // Don't expand if clicking interactive elements, inputs, date picker, or title
                      if (
                        target.closest('button') || 
                        target.closest('input') || 
                        target.closest('select') || 
                        target.closest('textarea') ||
                        target.closest('.task-title-input') ||
                        target.closest('.task-title-text') ||
                        target.closest('.task-date-input') ||
                        target.closest('.task-date-text') ||
                        target.closest('.task-time-input') ||
                        target.closest('.task-time-text') ||
                        target.closest('.task-urgency-select') ||
                        target.closest('.task-urgency-badge') ||
                        target.closest('.task-urgency-placeholder')
                      ) {
                        return;
                      }

                      // Delay toggle with a timeout to allow double-clicks to cancel it
                      if (clickTimeoutRef.current) {
                        clearTimeout(clickTimeoutRef.current);
                        clickTimeoutRef.current = null;
                      }

                      clickTimeoutRef.current = setTimeout(() => {
                        setExpandedTaskId(isExpanded ? null : task.id);
                        clickTimeoutRef.current = null;
                      }, 200);
                    }}
                    onDoubleClick={(e) => {
                      const target = e.target as HTMLElement;
                      if (
                        !target.closest('button') && 
                        !target.closest('input') && 
                        !target.closest('select') && 
                        !target.closest('textarea') &&
                        !target.closest('.task-title-input') &&
                        !target.closest('.task-date-input') &&
                        !target.closest('.task-time-input') &&
                        !target.closest('.task-time-text') &&
                        !target.closest('.task-urgency-select') &&
                        !target.closest('.task-urgency-badge') &&
                        !target.closest('.task-urgency-placeholder')
                      ) {
                        // Cancel any pending single-click expand action
                        if (clickTimeoutRef.current) {
                          clearTimeout(clickTimeoutRef.current);
                          clickTimeoutRef.current = null;
                        }
                        startEditTask(task);
                      }
                    }}
                    title="单击空白处展开/收起子任务，点击文字快速重命名，点击日期快速编辑日期，双击进入高级编辑"
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      
                      <GripVertical className="w-4 h-4 text-neutral-300 cursor-grab group-hover:text-neutral-400 flex-shrink-0" />

                      {/* Checkbox */}
                      <button 
                        type="button" 
                        onClick={() => toggleTaskCompletion(task)}
                        className="text-neutral-400 hover:text-blue-500 transition flex-shrink-0"
                      >
                        {task.completed ? (
                          <CheckSquare className="w-5 h-5 text-blue-500" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </button>

                      {/* Task Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-1.5 flex-wrap">
                          {inlineEditingTaskId === task.id ? (
                            <input
                              type="text"
                              value={inlineEditTitle}
                              onChange={(e) => setInlineEditTitle(e.target.value)}
                              onBlur={() => handleSaveInlineTitle(task.id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleSaveInlineTitle(task.id);
                                } else if (e.key === 'Escape') {
                                  setInlineEditingTaskId(null);
                                }
                              }}
                              className="task-title-input text-sm font-medium px-2 py-0.5 bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-neutral-800 min-w-[200px]"
                              autoFocus
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <span 
                              onClick={(e) => {
                                e.stopPropagation();
                                setInlineEditingTaskId(task.id);
                                setInlineEditTitle(task.title);
                              }}
                              className="task-title-text text-sm font-medium truncate cursor-text hover:text-blue-600 transition text-neutral-800"
                              title="点击快速编辑名称"
                            >
                              <span className={task.completed ? 'line-through text-neutral-400' : 'text-neutral-800'}>
                                {task.title}
                              </span>
                            </span>
                          )}
                          
                          {/* Urgency Indicator */}
                          {task.urgency === 'high' && (
                            <span 
                              onClick={(e) => {
                                e.stopPropagation();
                                onUpdateTask(task.id, { urgency: 'medium' });
                              }}
                              className="task-urgency-badge text-[10px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded-full font-bold flex items-center cursor-pointer hover:bg-red-200 transition select-none"
                              title="当前：高优先级。点击快速降级为中"
                            >
                              <AlertTriangle className="w-2.5 h-2.5 mr-0.5 text-red-600" />
                              高
                            </span>
                          )}
                          {task.urgency === 'medium' && (
                            <span 
                              onClick={(e) => {
                                e.stopPropagation();
                                onUpdateTask(task.id, { urgency: 'low' });
                              }}
                              className="task-urgency-badge text-[10px] bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded-full font-semibold cursor-pointer hover:bg-orange-200 transition select-none"
                              title="当前：中优先级。点击快速降级为低"
                            >
                              中
                            </span>
                          )}
                          {(task.urgency === 'low' || task.urgency === 'none') && (
                            <span 
                              onClick={(e) => {
                                e.stopPropagation();
                                onUpdateTask(task.id, { urgency: 'high' });
                              }}
                              className="task-urgency-placeholder opacity-0 group-hover:opacity-100 transition duration-150 cursor-pointer text-neutral-300 hover:text-red-500 p-0.5 flex items-center"
                              title="点击快速升级为高优先级"
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>

                        {/* Optional Details preview */}
                        <div className="flex items-center space-x-3 text-[10px] text-neutral-400 mt-1 flex-wrap gap-y-1">
                          {(task.date || inlineEditingDateTaskId === task.id) && (
                            <div className="flex items-center">
                              {inlineEditingDateTaskId === task.id ? (
                                <input 
                                  type="date"
                                  value={inlineEditDate}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setInlineEditDate(val);
                                    onUpdateTask(task.id, { date: val });
                                    setInlineEditingDateTaskId(null);
                                    lastBlurTimeRef.current = Date.now();
                                  }}
                                  onBlur={() => {
                                    setInlineEditingDateTaskId(null);
                                    lastBlurTimeRef.current = Date.now();
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      onUpdateTask(task.id, { date: inlineEditDate });
                                      setInlineEditingDateTaskId(null);
                                      lastBlurTimeRef.current = Date.now();
                                    } else if (e.key === 'Escape') {
                                      setInlineEditingDateTaskId(null);
                                    }
                                  }}
                                  className="task-date-input text-[10px] px-1.5 py-0.5 bg-white border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-neutral-800"
                                  autoFocus
                                  onClick={(e) => e.stopPropagation()}
                                />
                              ) : (
                                <span 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setInlineEditingDateTaskId(task.id);
                                    setInlineEditDate(task.date || '');
                                  }}
                                  className="task-date-text flex items-center hover:text-blue-600 transition cursor-pointer select-none"
                                  title="点击快速修改日期"
                                >
                                  <Calendar className="w-3 h-3 mr-1 text-neutral-400" />
                                  {task.date}
                                </span>
                              )}
                            </div>
                          )}
                          {(task.time || inlineEditingTimeTaskId === task.id) && (
                            <div className="flex items-center">
                              {inlineEditingTimeTaskId === task.id ? (
                                <input 
                                  type="time"
                                  value={inlineEditTime}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setInlineEditTime(val);
                                    onUpdateTask(task.id, { time: val });
                                    setInlineEditingTimeTaskId(null);
                                    lastBlurTimeRef.current = Date.now();
                                  }}
                                  onBlur={() => {
                                    setInlineEditingTimeTaskId(null);
                                    lastBlurTimeRef.current = Date.now();
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      onUpdateTask(task.id, { time: inlineEditTime });
                                      setInlineEditingTimeTaskId(null);
                                      lastBlurTimeRef.current = Date.now();
                                    } else if (e.key === 'Escape') {
                                      setInlineEditingTimeTaskId(null);
                                    }
                                  }}
                                  className="task-time-input text-[10px] px-1.5 py-0.5 bg-white border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-neutral-800"
                                  autoFocus
                                  onClick={(e) => e.stopPropagation()}
                                />
                              ) : (
                                <span 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setInlineEditingTimeTaskId(task.id);
                                    setInlineEditTime(task.time || '');
                                  }}
                                  className="task-time-text flex items-center hover:text-blue-600 transition cursor-pointer select-none"
                                  title="点击快速修改时间"
                                >
                                  <Clock className="w-3 h-3 mr-1 text-neutral-400" />
                                  {task.time}
                                </span>
                              )}
                            </div>
                          )}
                          {task.subtasks.length > 0 && (
                            <span>
                              子任务: {task.subtasks.filter(s => s.completed).length}/{task.subtasks.length}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition duration-150">
                      <button 
                        onClick={(e) => { e.stopPropagation(); onDeleteTask(task.id); }}
                        className="p-1 rounded hover:bg-red-50 text-red-500"
                        title="删除任务"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Expand Subtasks button */}
                    <button 
                      onClick={(e) => { e.stopPropagation(); setExpandedTaskId(isExpanded ? null : task.id); }}
                      className="p-1 rounded-lg hover:bg-neutral-100 text-neutral-500 ml-1"
                    >
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                  </div>



                  {/* Task Expanded Sub-Tasks Panel */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 bg-neutral-50/50 border-t border-neutral-100 rounded-b-xl space-y-3">
                      
                      {/* Sub-tasks Section */}
                      <div className="space-y-1.5 mt-2">
                        <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block">子任务</span>
                        
                        {/* Subtasks listing */}
                        <div className="space-y-0.5 max-h-[180px] overflow-y-auto pr-0.5">
                          {task.subtasks.length > 0 && (
                            task.subtasks.sort((a,b) => a.order - b.order).map((sub, sIdx) => (
                              <div 
                                key={sub.id} 
                                draggable
                                onDragStart={(e) => handleSubDragStart(e, sIdx)}
                                onDragEnd={() => setDraggedSubIndex(null)}
                                onDragOver={handleSubDragOver}
                                onDrop={(e) => handleSubDrop(e, task, sIdx)}
                                className={`flex items-center justify-between py-1 px-1.5 rounded-lg group/sub text-xs transition duration-150 ${draggedSubIndex === sIdx ? 'opacity-35 bg-neutral-100/50' : 'hover:bg-neutral-100/40'}`}
                              >
                                <div className="flex items-center space-x-1.5 flex-1 min-w-0">
                                  {/* Drag Handle */}
                                  <div 
                                    className="cursor-grab active:cursor-grabbing p-0.5 text-neutral-300 hover:text-neutral-500 opacity-0 group-hover/sub:opacity-100 transition-opacity"
                                    title="拖曳调整顺序"
                                  >
                                    <GripVertical className="w-3.5 h-3.5" />
                                  </div>

                                  <button onClick={() => toggleSubtask(task, sub.id)} className="text-neutral-400 hover:text-blue-500 transition shrink-0">
                                    {sub.completed ? (
                                      <CheckSquare className="w-4 h-4 text-blue-500" />
                                    ) : (
                                      <Square className="w-4 h-4" />
                                    )}
                                  </button>

                                  {editingSubtaskId === sub.id ? (
                                    <input
                                      type="text"
                                      value={editSubtaskTitle}
                                      onChange={(e) => setEditSubtaskTitle(e.target.value)}
                                      onBlur={() => handleSaveSubtaskTitle(task, sub.id)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          handleSaveSubtaskTitle(task, sub.id);
                                        } else if (e.key === 'Escape') {
                                          setEditingSubtaskId(null);
                                        }
                                      }}
                                      autoFocus
                                      className="flex-1 text-xs px-1.5 py-0.5 bg-white border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  ) : (
                                    <span 
                                      onClick={() => startEditSubtask(sub.id, sub.title)}
                                      className={`truncate text-xs cursor-pointer hover:text-blue-600 px-1 py-0.5 rounded transition ${sub.completed ? 'line-through text-neutral-400' : 'text-neutral-700 font-medium'}`}
                                      title="点击编辑"
                                    >
                                      {sub.title}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center space-x-1 opacity-0 group-hover/sub:opacity-100 transition duration-150 shrink-0">
                                  <button onClick={() => deleteSubtask(task, sub.id)} className="p-1 text-neutral-400 hover:text-red-500 hover:bg-neutral-100 rounded transition" title="删除">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Add subtask input */}
                        <div className="flex gap-2 pt-1.5 min-w-0">
                          <input
                            type="text"
                            placeholder="新子任务..."
                            value={newSubtaskTitle}
                            onChange={(e) => setNewSubtaskTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddSubtask(task);
                              }
                            }}
                            className="flex-1 min-w-0 w-0 text-xs px-2.5 py-1.5 bg-white border border-neutral-200 rounded-lg focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddSubtask(task)}
                            className="px-3 py-1.5 bg-neutral-800 text-white rounded-lg text-xs hover:bg-neutral-900 flex-shrink-0"
                          >
                            添加子任务
                          </button>
                        </div>

                      </div>

                    </div>
                  )}

                </div>
              );
            })
          )}
        </div>

      </div>

      {/* PREMIUM FULL TASK EDIT MODAL (Saves changes immediately) */}
      {editingTaskId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl border border-neutral-200 p-4 w-full max-w-2xl shadow-2xl space-y-3 text-xs relative max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
              <span className="font-extrabold text-neutral-800 text-sm flex items-center">
                <Edit2 className="w-4 h-4 mr-2 text-blue-500" />
                任务编辑
              </span>
              <button 
                type="button" 
                onClick={() => setEditingTaskId(null)}
                className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Layout Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-7 items-start">
              
              {/* Left Column: Basic Details */}
              <div className="space-y-2.5">
                <div>
                  <label className="text-[10px] font-bold text-neutral-500 block mb-0.5">任务名称</label>
                  <input
                    type="text"
                    value={editTaskTitle}
                    onChange={(e) => setEditTaskTitle(e.target.value)}
                    placeholder="输入日程任务标题..."
                    className="w-full py-2 px-2.5 bg-neutral-50 hover:bg-neutral-100/50 focus:bg-white border border-neutral-200 focus:border-blue-500 rounded-xl font-bold text-xs focus:outline-none transition-all placeholder-neutral-400"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-neutral-500 block mb-0.5">描述信息</label>
                  <textarea
                    value={editTaskDesc}
                    onChange={(e) => setEditTaskDesc(e.target.value)}
                    placeholder="添加任务备注或说明细节..."
                    className="w-full py-2 px-2.5 bg-neutral-50 hover:bg-neutral-100/50 focus:bg-white border border-neutral-200 focus:border-blue-500 rounded-xl text-xs h-16 focus:outline-none transition-all resize-none placeholder-neutral-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-neutral-500 block mb-0.5">任务分类</label>
                    <select
                      value={editTaskCatId}
                      onChange={(e) => setEditTaskCatId(e.target.value)}
                      className="w-full py-2 px-2.5 bg-white border border-neutral-200 hover:border-neutral-300 rounded-xl text-xs font-semibold focus:border-blue-500 focus:outline-none cursor-pointer transition-all shadow-sm"
                    >
                      <option value="">未分类</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-neutral-500 block mb-0.5">优先级</label>
                    <select
                      value={editTaskUrgency}
                      onChange={(e) => setEditTaskUrgency(e.target.value as Urgency)}
                      className="w-full py-2 px-2.5 bg-white border border-neutral-200 hover:border-neutral-300 rounded-xl text-xs font-semibold focus:border-blue-500 focus:outline-none cursor-pointer transition-all shadow-sm"
                    >
                      <option value="none">无</option>
                      <option value="low">🟩 低</option>
                      <option value="medium">🟨 中</option>
                      <option value="high">🟥 高</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Right Column: Scheduling & Repeating (Visual Shaded Card) */}
              <div className="space-y-2.5">
                
                {/* Schedule Type Tabs */}
                <div>
                  <label className="text-[10px] font-bold text-neutral-500 block mb-0.5">任务排期</label>
                  <div className="grid grid-cols-4 gap-1 p-1 bg-neutral-100 rounded-xl border border-neutral-200/60">
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
                        className={`py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
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
                          <label className="text-[10px] font-bold text-neutral-500 block mb-0.5">开始日期</label>
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
                            className="w-full py-2 px-2.5 bg-white border border-neutral-200 rounded-xl text-xs font-semibold focus:border-blue-500 focus:outline-none transition-all shadow-sm"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-neutral-500 block mb-0.5">结束日期</label>
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
                            className="w-full py-2 px-2.5 bg-white border border-neutral-200 rounded-xl text-xs font-semibold focus:border-blue-500 focus:outline-none transition-all shadow-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-neutral-500 block mb-0.5">具体时间</label>
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
                              className="px-3 bg-neutral-100 hover:bg-red-50 hover:text-red-600 text-neutral-500 rounded-xl text-xs font-bold transition-all border border-neutral-200/60 cursor-pointer flex items-center justify-center shrink-0"
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
                      <label className="text-[10px] font-bold text-neutral-500 block">选择日期定位至该周周一</label>
                      <input
                        type="date"
                        value={editTaskScheduledWeek}
                        onChange={(e) => {
                          const val = e.target.value;
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
                        className="w-full py-2 px-2.5 bg-white border border-neutral-200 hover:border-neutral-300 rounded-xl text-xs font-semibold focus:border-blue-500 focus:outline-none shadow-sm transition-all cursor-pointer"
                      />
                      {editTaskScheduledWeek && (
                        <p className="text-[10px] text-blue-600 font-extrabold mt-1">
                          已选中：{getWeekOptionLabel(editTaskScheduledWeek)}
                        </p>
                      )}
                    </div>
                  )}

                  {editTaskScheduleType === 'month' && (
                    <div className="w-full animate-fade-in space-y-1">
                      <label className="text-[10px] font-bold text-neutral-500 block">选择月份</label>
                      <input
                        type="month"
                        value={editTaskScheduledMonth}
                        onChange={(e) => setEditTaskScheduledMonth(e.target.value)}
                        className="w-full py-2 px-2.5 bg-white border border-neutral-200 hover:border-neutral-300 rounded-xl text-xs font-semibold focus:border-blue-500 focus:outline-none shadow-sm transition-all cursor-pointer"
                      />
                      {editTaskScheduledMonth && (
                        <p className="text-[10px] text-blue-600 font-extrabold mt-1">
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
                      <label className="text-[10px] font-bold text-neutral-500 block mb-0.5">重复设置</label>
                      <select
                        value={editTaskRepeat}
                        onChange={(e) => setEditTaskRepeat(e.target.value as any)}
                        className="w-full py-2 px-2.5 bg-white border border-neutral-200 hover:border-neutral-300 rounded-xl text-xs font-semibold cursor-pointer focus:border-blue-500 focus:outline-none shadow-sm transition-all"
                      >
                        <option value="none">不重复</option>
                        <option value="daily">每天</option>
                        <option value="weekly">每周</option>
                        <option value="monthly">每月</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-neutral-500 block mb-0.5">提醒</label>
                      <select
                        value={editTaskReminder}
                        onChange={(e) => setEditTaskReminder(e.target.value as any)}
                        className="w-full py-2 px-2.5 bg-white border border-neutral-200 hover:border-neutral-300 rounded-xl text-xs font-semibold cursor-pointer focus:border-blue-500 focus:outline-none shadow-sm transition-all"
                      >
                        <option value="none">无提醒</option>
                        <option value="5m">5 分钟前</option>
                        <option value="15m">15 分钟前</option>
                        <option value="1h">1 小时前</option>
                        <option value="1d">1 天前</option>
                      </select>
                    </div>
                  </div>
                )}

              </div>

            </div>

            {/* Actions Bar */}
            <div className="flex items-center justify-between pt-3 border-t border-neutral-100 gap-3">
              <button
                type="button"
                onClick={() => {
                  if (editingTaskId) {
                    onDeleteTask(editingTaskId);
                    setEditingTaskId(null);
                  }
                }}
                className="px-3 py-2 bg-red-50 hover:bg-red-100/80 text-red-600 rounded-xl font-extrabold transition flex items-center border border-red-200/50 shadow-sm cursor-pointer"
                title="删除此任务"
              >
                <Trash className="w-3.5 h-3.5 mr-1.5" />
                删除
              </button>

              <div className="flex space-x-2">
                <button 
                  type="button" 
                  onClick={() => setEditingTaskId(null)}
                  className="px-3.5 py-2 bg-neutral-100 text-neutral-600 rounded-xl font-extrabold hover:bg-neutral-200 transition cursor-pointer"
                >
                  取消
                </button>
                <button 
                  type="button" 
                  onClick={() => handleSaveTaskEdits(editingTaskId)}
                  className="px-5 py-2 bg-neutral-800 hover:bg-neutral-900 text-white font-extrabold rounded-xl shadow-md transition cursor-pointer"
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
