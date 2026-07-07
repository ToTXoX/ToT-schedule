import React, { useState } from 'react';
import { 
  Category, Task, Subtask, Urgency, MoodEmoji 
} from '../types';
import { 
  Folder, Plus, Trash2, Edit2, ChevronDown, ChevronRight, CheckSquare, Square,
  GripVertical, Calendar, Clock, AlertTriangle, ArrowUp, ArrowDown, Settings, Check, X, Trash
} from 'lucide-react';

const formatDate = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
  { name: '浅蓝色', value: 'sky', hex: '#0ea5e9', bg: 'bg-sky-400', text: 'text-sky-500', hover: 'hover:bg-sky-500' },
  { name: '深蓝色', value: 'blue', hex: '#1d4ed8', bg: 'bg-blue-700', text: 'text-blue-700', hover: 'hover:bg-blue-800' },
  { name: '浅紫色', value: 'lavender', hex: '#c084fc', bg: 'bg-purple-400', text: 'text-purple-400', hover: 'hover:bg-purple-500' },
  { name: '深紫色', value: 'purple', hex: '#7e22ce', bg: 'bg-purple-700', text: 'text-purple-700', hover: 'hover:bg-purple-800' },
  { name: '浅绿色', value: 'lime', hex: '#4ade80', bg: 'bg-green-400', text: 'text-green-500', hover: 'hover:bg-green-500' },
  { name: '深绿色', value: 'green', hex: '#15803d', bg: 'bg-green-700', text: 'text-green-700', hover: 'hover:bg-green-800' },
  { name: '浅橙色', value: 'amber', hex: '#fbbf24', bg: 'bg-amber-400', text: 'text-amber-500', hover: 'hover:bg-amber-500' },
  { name: '深橙色', value: 'orange', hex: '#c2410c', bg: 'bg-orange-700', text: 'text-orange-700', hover: 'hover:bg-orange-800' },
  { name: '浅红色', value: 'rose', hex: '#f43f5e', bg: 'bg-rose-500', text: 'text-rose-500', hover: 'hover:bg-rose-600' },
  { name: '深红色', value: 'red', hex: '#b91c1c', bg: 'bg-red-700', text: 'text-red-700', hover: 'hover:bg-red-800' },
  { name: '浅灰色', value: 'slate-light', hex: '#94a3b8', bg: 'bg-slate-400', text: 'text-slate-400', hover: 'hover:bg-slate-500' },
  { name: '深灰色', value: 'slate', hex: '#334155', bg: 'bg-slate-700', text: 'text-slate-700', hover: 'hover:bg-slate-800' },
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
  // Category management states
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('blue');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatColor, setEditCatColor] = useState('blue');

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

  // Subtask creation state
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editSubtaskTitle, setEditSubtaskTitle] = useState('');

  // Drag and Drop Categories State
  const [draggedCatIndex, setDraggedCatIndex] = useState<number | null>(null);
  const [draggedTaskIndex, setDraggedTaskIndex] = useState<number | null>(null);
  const [draggedSubIndex, setDraggedSubIndex] = useState<number | null>(null);

  // Filter tasks based on category selection
  const filteredTasks = tasks.filter(task => {
    if (selectedCategoryId === 'all') return true;
    if (selectedCategoryId === 'unscheduled') return !task.categoryId;
    return task.categoryId === selectedCategoryId;
  }).sort((a, b) => a.order - b.order);

  // Helper to get category background classes
  const getCatColorClasses = (colorName: string) => {
    const preset = PRESET_COLORS.find(p => p.value === colorName) || PRESET_COLORS[0];
    return {
      dot: preset.bg,
      text: preset.text,
      badge: `${preset.bg} text-white`
    };
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
    setDraggedCatIndex(index);
    e.dataTransfer.effectAllowed = 'move';
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
    setDraggedTaskIndex(index);
    e.dataTransfer.effectAllowed = 'move';
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
      return { name: cat.name, colorClass: `${cls.text} bg-${cat.color}-50`, colorHex: cat.colorHex };
    }
    return { name: '全部任务', colorClass: 'text-neutral-700 bg-neutral-100', colorHex: '#64748b' };
  };

  const currentCatDetails = getSelectedCategoryDetails();

  return (
    <div id="task-library-root" className="grid grid-cols-1 md:grid-cols-12 gap-6 h-full items-start">
      
      {/* 1. Category Sidebar (3 cols) */}
      <div id="category-sidebar" className="md:col-span-4 bg-white/70 backdrop-blur-md rounded-2xl p-4 border border-neutral-100 shadow-sm flex flex-col space-y-4">
        
        <div className="flex items-center justify-between">
          <h3 className="font-sans text-base font-semibold text-neutral-800 flex items-center">
            <Folder className="w-5 h-5 mr-2 text-neutral-500" />
            分类清单
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
              <label className="text-xs text-neutral-500 block mb-1">清单名称</label>
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
              <label className="text-xs text-neutral-500 block mb-1">主题色</label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map(color => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setNewCatColor(color.value)}
                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform ${color.bg} ${newCatColor === color.value ? 'scale-125 ring-2 ring-neutral-300' : ''}`}
                    title={color.name}
                  >
                    {newCatColor === color.value && <Check className="w-3.h-3 text-white" />}
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
        <div id="category-list" className="space-y-1 overflow-y-auto max-h-[350px] pr-1">
          {/* Default Categories */}
          <button
            id="cat-btn-all"
            onClick={() => onSelectCategory('all')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition ${selectedCategoryId === 'all' ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-600 hover:bg-neutral-50'}`}
          >
            <span className="flex items-center">
              <span className="w-2.5 h-2.5 rounded-full bg-neutral-400 mr-2" />
              全部任务
            </span>
            <span className="bg-neutral-200 text-neutral-700 px-2 py-0.5 rounded-full text-[10px]">
              {tasks.length}
            </span>
          </button>

          <button
            id="cat-btn-unscheduled"
            onClick={() => onSelectCategory('unscheduled')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition ${selectedCategoryId === 'unscheduled' ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-600 hover:bg-neutral-50'}`}
          >
            <span className="flex items-center">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 mr-2" />
              未分类
            </span>
            <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-[10px]">
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
                className={`group flex flex-col p-1.5 rounded-xl border transition ${selectedCategoryId === cat.id ? 'bg-neutral-50 border-neutral-200' : 'border-transparent hover:bg-neutral-50'}`}
              >
                {isEditing ? (
                  <div className="space-y-2 p-1.5">
                    <input
                      type="text"
                      value={editCatName}
                      onChange={(e) => setEditCatName(e.target.value)}
                      className="w-full text-xs px-2 py-1 bg-white border border-neutral-300 rounded focus:outline-none"
                    />
                    <div className="flex gap-1.5 flex-wrap">
                      {PRESET_COLORS.map(color => (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() => setEditCatColor(color.value)}
                          className={`w-4 h-4 rounded-full flex items-center justify-center ${color.bg}`}
                        >
                          {editCatColor === color.value && <Check className="w-2.5 h-2.5 text-white" />}
                        </button>
                      ))}
                    </div>
                    <div className="flex justify-end space-x-1.5">
                      <button onClick={() => setEditingCategoryId(null)} className="p-1 rounded hover:bg-neutral-200 text-neutral-500">
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleSaveCategoryEdit(cat.id)} className="p-1 rounded bg-neutral-800 text-white hover:bg-neutral-950">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center space-x-2 flex-1 min-w-0" onClick={() => onSelectCategory(cat.id)}>
                      <GripVertical className="w-3.5 h-3.5 text-neutral-300 cursor-grab group-hover:text-neutral-400" />
                      
                      {/* Checkbox to control visibility in Calendar */}
                      <input 
                        type="checkbox"
                        checked={cat.visible !== false}
                        onChange={(e) => {
                          e.stopPropagation();
                          onUpdateCategory(cat.id, { visible: e.target.checked });
                        }}
                        className="w-3.5 h-3.5 rounded text-blue-500 focus:ring-0 cursor-pointer"
                        title="在日历中显示/隐藏"
                      />

                      <span className={`w-2.5 h-2.5 rounded-full ${cls.dot} flex-shrink-0`} />
                      
                      <span className={`text-xs font-medium whitespace-normal break-all cursor-pointer ${selectedCategoryId === cat.id ? 'text-neutral-900 font-semibold' : 'text-neutral-600'}`}>
                        {cat.name}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition duration-150">
                      <button onClick={() => moveCategory(idx, 'up')} disabled={idx === 0} className="p-0.5 rounded text-neutral-400 hover:text-neutral-700 disabled:opacity-30">
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button onClick={() => moveCategory(idx, 'down')} disabled={idx === categories.length - 1} className="p-0.5 rounded text-neutral-400 hover:text-neutral-700 disabled:opacity-30">
                        <ArrowDown className="w-3 h-3" />
                      </button>
                      <button onClick={() => startEditCategory(cat)} className="p-0.5 rounded hover:bg-neutral-200 text-neutral-500">
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button onClick={() => onDeleteCategory(cat.id)} className="p-0.5 rounded hover:bg-red-50 text-red-500">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full ${selectedCategoryId === cat.id ? cls.badge : 'bg-neutral-100 text-neutral-600'}`}>
                      {taskCount}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>

      {/* 2. Task List Panel (8 cols) */}
      <div id="task-workspace" className="md:col-span-8 bg-white rounded-2xl p-5 border border-neutral-100 shadow-sm flex flex-col space-y-4">
        
        {/* Workspace Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
          <div>
            <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${currentCatDetails.colorClass}`}>
              {currentCatDetails.name}
            </span>
            <span className="text-xs text-neutral-400 ml-2">({filteredTasks.length} 个任务)</span>
          </div>
        </div>

        {/* Task Form Input */}
        <form id="form-add-task" onSubmit={handleAddTaskSubmit} className="flex gap-2">
          <input
            id="input-task-title"
            type="text"
            placeholder={`添加新任务到「${currentCatDetails.name}」...`}
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            className="flex-1 text-sm px-4 py-2.5 bg-neutral-50 rounded-xl border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition"
          />
          <button
            type="submit"
            className="px-4 py-2.5 bg-neutral-800 text-white rounded-xl text-xs font-medium hover:bg-neutral-900 transition flex items-center"
          >
            <Plus className="w-4 h-4 mr-1" />
            添加
          </button>
        </form>

        {/* Filtered Task List */}
        <div id="tasks-list-container" className="space-y-2 overflow-y-auto max-h-[500px] pr-1">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-12 text-neutral-400 text-xs">
              暂无任务，快去添加一个吧！
            </div>
          ) : (
            filteredTasks.map((task, idx) => {
              const isExpanded = expandedTaskId === task.id;
              const isTaskEditing = editingTaskId === task.id;
              const taskCat = categories.find(c => c.id === task.categoryId);

              return (
                <div
                  key={task.id}
                  draggable
                  onDragStart={(e) => handleTaskDragStart(e, idx)}
                  onDragOver={(e) => handleTaskDragOver(e, idx)}
                  onDrop={(e) => handleTaskDrop(e, idx)}
                  className={`border rounded-xl transition ${task.completed ? 'bg-neutral-50/50 border-neutral-100 opacity-75' : 'bg-white border-neutral-200 shadow-sm hover:border-neutral-300'}`}
                >
                  {/* Task Header */}
                  <div 
                    className="p-3.5 flex items-center justify-between gap-3 group select-none cursor-pointer"
                    onDoubleClick={(e) => {
                      const target = e.target as HTMLElement;
                      if (!target.closest('button') && !target.closest('input') && !target.closest('select') && !target.closest('textarea')) {
                        startEditTask(task);
                      }
                    }}
                    title="双击进入该任务的编辑界面"
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
                          <span className={`text-sm font-medium truncate ${task.completed ? 'line-through text-neutral-400' : 'text-neutral-800'}`}>
                            {task.title}
                          </span>
                          
                          {/* Urgency Indicator */}
                          {task.urgency === 'high' && (
                            <span className="text-[10px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded-full font-bold flex items-center">
                              <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />
                              高
                            </span>
                          )}
                          {task.urgency === 'medium' && (
                            <span className="text-[10px] bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded-full font-semibold">
                              中
                            </span>
                          )}
                        </div>

                        {/* Optional Details preview */}
                        <div className="flex items-center space-x-3 text-[10px] text-neutral-400 mt-1 flex-wrap gap-y-1">
                          {task.date && (
                            <span className="flex items-center">
                              <Calendar className="w-3 h-3 mr-1 text-neutral-400" />
                              {task.date}
                            </span>
                          )}
                          {task.time && (
                            <span className="flex items-center">
                              <Clock className="w-3 h-3 mr-1 text-neutral-400" />
                              {task.time}
                            </span>
                          )}
                          {taskCat && (
                            <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${getCatColorClasses(taskCat.color).text} bg-${taskCat.color}-50`}>
                              {taskCat.name}
                            </span>
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
                      {/* Move Order buttons */}
                      <button onClick={() => moveTask(idx, 'up')} disabled={idx === 0} className="p-1 rounded text-neutral-400 hover:text-neutral-700 disabled:opacity-30">
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => moveTask(idx, 'down')} disabled={idx === filteredTasks.length - 1} className="p-1 rounded text-neutral-400 hover:text-neutral-700 disabled:opacity-30">
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      
                      <button 
                        onClick={() => startEditTask(task)}
                        className="p-1 rounded hover:bg-neutral-100 text-neutral-500"
                        title="二次编辑"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      
                      <button 
                        onClick={() => onDeleteTask(task.id)}
                        className="p-1 rounded hover:bg-red-50 text-red-500"
                        title="删除任务"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Expand Subtasks button */}
                    <button 
                      onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                      className="p-1 rounded-lg hover:bg-neutral-100 text-neutral-500 ml-1"
                    >
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                  </div>



                  {/* Task Expanded Sub-Tasks Panel */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 bg-neutral-50/50 border-t border-neutral-100 rounded-b-xl space-y-3">
                      
                      {/* Description display if exists */}
                      {task.description && (
                        <div className="text-xs text-neutral-500 bg-white p-2.5 rounded-lg border border-neutral-100 mt-2">
                          <strong className="text-neutral-700 block text-[10px] uppercase tracking-wider mb-0.5">描述:</strong>
                          {task.description}
                        </div>
                      )}

                      {/* Sub-tasks Section */}
                      <div className="space-y-1.5 mt-2">
                        <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block">细分子任务</span>
                        
                        {/* Subtasks listing */}
                        <div className="space-y-1 max-h-[180px] overflow-y-auto">
                          {task.subtasks.length === 0 ? (
                            <span className="text-[11px] text-neutral-400 block py-1 pl-1">暂无子任务</span>
                          ) : (
                            task.subtasks.sort((a,b) => a.order - b.order).map((sub, sIdx) => (
                              <div key={sub.id} className="flex items-center justify-between p-1.5 bg-white border border-neutral-100 rounded-lg group/sub text-xs">
                                <div className="flex items-center space-x-2 flex-1 min-w-0">
                                  <button onClick={() => toggleSubtask(task, sub.id)} className="text-neutral-400 hover:text-blue-500 transition">
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
                                      className="flex-1 text-xs px-1.5 py-0.5 bg-neutral-50 border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                  ) : (
                                    <span 
                                      onClick={() => startEditSubtask(sub.id, sub.title)}
                                      className={`truncate text-xs cursor-pointer hover:bg-neutral-50 hover:text-blue-600 px-1 py-0.5 rounded transition ${sub.completed ? 'line-through text-neutral-400' : 'text-neutral-700 font-medium'}`}
                                      title="点击编辑子任务"
                                    >
                                      {sub.title}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center space-x-1 opacity-0 group-hover/sub:opacity-100 transition duration-150">
                                  <button onClick={() => moveSubtask(task, sIdx, 'up')} disabled={sIdx === 0} className="p-0.5 text-neutral-400 hover:text-neutral-700 disabled:opacity-20">
                                    <ArrowUp className="w-3 h-3" />
                                  </button>
                                  <button onClick={() => moveSubtask(task, sIdx, 'down')} disabled={sIdx === task.subtasks.length - 1} className="p-0.5 text-neutral-400 hover:text-neutral-700 disabled:opacity-20">
                                    <ArrowDown className="w-3 h-3" />
                                  </button>
                                  <button onClick={() => deleteSubtask(task, sub.id)} className="p-0.5 text-red-400 hover:text-red-600">
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Add subtask input */}
                        <div className="flex gap-2 pt-1.5">
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
                            className="flex-1 text-xs px-2.5 py-1.5 bg-white border border-neutral-200 rounded-lg focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddSubtask(task)}
                            className="px-3 py-1.5 bg-neutral-800 text-white rounded-lg text-xs hover:bg-neutral-900"
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
          <div className="bg-white rounded-3xl border border-neutral-200 p-6 w-full max-w-2xl shadow-2xl space-y-5 text-xs relative max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-neutral-100">
              <span className="font-extrabold text-neutral-800 text-sm flex items-center">
                <Edit2 className="w-4 h-4 mr-2 text-blue-500" />
                编辑日程任务
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

            {/* Actions Bar */}
            <div className="flex items-center justify-between pt-4 border-t border-neutral-100 gap-3">
              <button
                type="button"
                onClick={() => {
                  if (editingTaskId) {
                    onDeleteTask(editingTaskId);
                    setEditingTaskId(null);
                  }
                }}
                className="px-3.5 py-2.5 bg-red-50 hover:bg-red-100/80 text-red-600 rounded-xl font-extrabold transition flex items-center border border-red-200/50 shadow-sm cursor-pointer"
                title="彻底删除此任务"
              >
                <Trash className="w-3.5 h-3.5 mr-1.5" />
                彻底删除
              </button>

              <div className="flex space-x-2">
                <button 
                  type="button" 
                  onClick={() => setEditingTaskId(null)}
                  className="px-4 py-2.5 bg-neutral-100 text-neutral-600 rounded-xl font-extrabold hover:bg-neutral-200 transition cursor-pointer"
                >
                  取消
                </button>
                <button 
                  type="button" 
                  onClick={() => handleSaveTaskEdits(editingTaskId)}
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
