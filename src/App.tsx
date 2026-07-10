import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Category, Task, Subtask, Note, Mood, MoodEmoji, ParsedTaskResult 
} from './types';
import TaskLibrary from './components/TaskLibrary';
import CalendarSection from './components/CalendarSection';
import { 
  Calendar as CalendarIcon, ListTodo, Sparkles, Clock, Bell, Settings, Check, 
  HelpCircle, Eye, RefreshCw, Layers, ShieldAlert, ArrowRight, Heart
} from 'lucide-react';

// Preset Category Defaults
const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-work', name: '工作任务', color: 'blue', colorHex: '#4cc9f0', order: 0, visible: true },
  { id: 'cat-study', name: '学习计划', color: 'purple', colorHex: '#b388ff', order: 1, visible: true },
  { id: 'cat-life', name: '生活杂务', color: 'green', colorHex: '#52b788', order: 2, visible: true },
  { id: 'cat-fitness', name: '运动健身', color: 'orange', colorHex: '#ffb5a7', order: 3, visible: true }
];

// Preset Task Defaults (Prepopulated with mock data relative to current baseline 2026-07-06)
const DEFAULT_TASKS: Task[] = [
  {
    id: 'task-1',
    title: '准备研发周会汇报PPT',
    description: '核心阐述系统设计方案、模块分工及开发排期。',
    completed: false,
    date: '2026-07-06',
    time: '14:00',
    categoryId: 'cat-work',
    urgency: 'high',
    subtasks: [
      { id: 'sub-1', title: '梳理核心技术指标', completed: true, order: 0 },
      { id: 'sub-2', title: '设计流程交互图示', completed: false, order: 1 },
      { id: 'sub-3', title: '输出PPT演示文稿', completed: false, order: 2 }
    ],
    order: 0
  },
  {
    id: 'task-2',
    title: '买牛奶、苹果和全麦面包',
    completed: true,
    date: '2026-07-05',
    categoryId: 'cat-life',
    urgency: 'low',
    subtasks: [],
    order: 1
  },
  {
    id: 'task-3',
    title: '5公里有氧慢跑 (心率140)',
    completed: false,
    date: '2026-07-06',
    time: '18:30',
    categoryId: 'cat-fitness',
    urgency: 'low',
    subtasks: [],
    order: 2
  },
  {
    id: 'task-4',
    title: '研读深度学习第三章: 卷积神经网络',
    description: '记录下反向传播推导关键点，撰写周度笔记。',
    completed: false,
    date: '2026-07-07',
    time: '21:00',
    categoryId: 'cat-study',
    urgency: 'medium',
    subtasks: [
      { id: 'sub-4', title: '推导反向传播公式', completed: false, order: 0 },
      { id: 'sub-5', title: '实现简单一维卷积算子', completed: false, order: 1 }
    ],
    order: 3
  }
];

const DEFAULT_NOTES: Note[] = [
  { id: 'note-1', content: '阳台的花花草草记得每隔两天浇水一次。', date: '2026-07-06', order: 0, visible: true },
  { id: 'note-2', content: '今天规划核心在于跑通 Gemini 自然语言日程解析接口。', date: '2026-07-06', order: 1, visible: true }
];

const DEFAULT_MOODS: Mood[] = [
  { date: '2026-07-06', emoji: '开心', text: '应用框架成功搭建，日程与任务管理很流畅！', visible: true }
];

const getRealTodayStr = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function App() {
  // System Baseline Date String (real today)
  const [currentDateStr, setCurrentDateStr] = useState(getRealTodayStr());
  const [systemTime, setSystemTime] = useState<Date>(new Date());

  // Main State (Loaded from LocalStorage)
  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem('planner_categories');
    return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
  });

  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('planner_tasks');
    return saved ? JSON.parse(saved) : DEFAULT_TASKS;
  });

  const [notes, setNotes] = useState<Note[]>(() => {
    const saved = localStorage.getItem('planner_notes');
    return saved ? JSON.parse(saved) : DEFAULT_NOTES;
  });

  const [moods, setMoods] = useState<Mood[]>(() => {
    const saved = localStorage.getItem('planner_moods');
    return saved ? JSON.parse(saved) : DEFAULT_MOODS;
  });

  // User Profile State
  const [userName, setUserName] = useState<string>(() => {
    return localStorage.getItem('planner_user_name') || 'ToT';
  });
  const [userAvatar, setUserAvatar] = useState<string>(() => {
    return localStorage.getItem('planner_user_avatar') || '🐱';
  });
  const [isEditingName, setIsEditingName] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  // UI State
  const [activeTab, setActiveTab] = useState<'calendar' | 'tasks'>('calendar');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | 'all' | 'unscheduled'>('all');
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);

  // System time updater
  useEffect(() => {
    const timer = setInterval(() => {
      setSystemTime(prev => {
        const next = new Date(prev);
        next.setSeconds(next.getSeconds() + 1);
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync state with LocalStorage
  useEffect(() => {
    localStorage.setItem('planner_user_name', userName);
  }, [userName]);

  useEffect(() => {
    localStorage.setItem('planner_user_avatar', userAvatar);
  }, [userAvatar]);

  useEffect(() => {
    localStorage.setItem('planner_categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('planner_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('planner_notes', JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    localStorage.setItem('planner_moods', JSON.stringify(moods));
  }, [moods]);

  // --- CRUD OPERATORS ---

  // Category
  const handleAddCategory = (name: string, color: string) => {
    const hexMap: { [key: string]: string } = {
      'red-light': '#ffe4e6',
      'red-medium': '#fda4af',
      'red-dark': '#f43f5e',
      'orange-light': '#ffedd5',
      'orange-medium': '#fdba74',
      'orange-dark': '#f97316',
      'yellow-light': '#fef3c7',
      'yellow-medium': '#fcd34d',
      'yellow-dark': '#f59e0b',
      'green-light': '#dcfce7',
      'green-medium': '#6ee7b7',
      'green-dark': '#10b981',
      'blue-light': '#e0f2fe',
      'blue-medium': '#7dd3fc',
      'blue-dark': '#0284c7',
      'indigo-light': '#e0e7ff',
      'indigo-medium': '#a5b4fc',
      'indigo-dark': '#6366f1',
      'purple-light': '#f3e8ff',
      'purple-medium': '#d8b4fe',
      'purple-dark': '#a855f7',
      'gray-light': '#f1f5f9',
      'gray-medium': '#cbd5e1',
      'gray-dark': '#64748b',
      // Backward compatibility for existing categories
      sky: '#5fa8d3',
      blue: '#4cc9f0',
      lavender: '#c084fc',
      purple: '#b388ff',
      lime: '#80ed99',
      green: '#52b788',
      amber: '#ffd166',
      orange: '#ffb5a7',
      rose: '#ffccd5',
      red: '#f28482',
      'slate-light': '#cbd5e1',
      slate: '#ddb892'
    };
    const newCat: Category = {
      id: `cat-${Math.random().toString(36).substring(2, 9)}`,
      name,
      color,
      colorHex: hexMap[color] || '#3b82f6',
      order: categories.length,
      visible: true
    };
    setCategories([...categories, newCat]);
  };

  const handleUpdateCategory = (id: string, updates: Partial<Category>) => {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const handleUpdateCategories = (batch: { id: string; updates: Partial<Category> }[]) => {
    setCategories(prev => {
      const idToUpdates = new Map(batch.map(item => [item.id, item.updates]));
      return prev.map(c => {
        const u = idToUpdates.get(c.id);
        return u ? { ...c, ...u } : c;
      });
    });
  };

  const handleDeleteCategory = (id: string) => {
    setCategories(categories.filter(c => c.id !== id));
    // Relocate tasks belonging to deleted category to "unscheduled"
    setTasks(tasks.map(t => t.categoryId === id ? { ...t, categoryId: undefined } : t));
    if (selectedCategoryId === id) {
      setSelectedCategoryId('all');
    }
  };

  const handleReorderCategories = (newCategories: Category[]) => {
    setCategories(newCategories);
  };

  // Tasks
  const handleAddTask = (title: string, categoryId?: string, initialData?: Partial<Task>) => {
    const newTask: Task = {
      id: `task-${Math.random().toString(36).substring(2, 9)}`,
      title,
      completed: false,
      categoryId,
      subtasks: [],
      urgency: 'none',
      order: tasks.length,
      ...initialData
    };
    setTasks([...tasks, newTask]);
  };

  const handleUpdateTask = (id: string, updates: Partial<Task>) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const handleDeleteTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const handleReorderTasks = (newTasks: Task[]) => {
    setTasks(newTasks);
  };

  // AI-parsed task callback
  const handleParsedTaskAdded = (parsed: ParsedTaskResult) => {
    const newTask: Task = {
      id: `task-${Math.random().toString(36).substring(2, 9)}`,
      title: parsed.title,
      completed: false,
      date: parsed.date,
      time: parsed.time,
      categoryId: parsed.categoryId,
      urgency: parsed.urgency || 'low',
      subtasks: [],
      order: tasks.length
    };
    setTasks(prev => [...prev, newTask]);
  };

  // Notes
  const handleAddNote = (content: string, date: string) => {
    const newNote: Note = {
      id: `note-${Math.random().toString(36).substring(2, 9)}`,
      content,
      date,
      order: notes.filter(n => n.date === date).length,
      visible: true
    };
    setNotes([...notes, newNote]);
  };

  const handleUpdateNote = (id: string, updates: Partial<Note>) => {
    setNotes(notes.map(n => n.id === id ? { ...n, ...updates } : n));
  };

  const handleDeleteNote = (id: string) => {
    setNotes(notes.filter(n => n.id !== id));
  };

  const handleReorderNotes = (newNotes: Note[]) => {
    setNotes(newNotes);
  };

  // Moods
  const handleUpdateMood = (date: string, emoji: MoodEmoji, text: string) => {
    const existing = moods.find(m => m.date === date);
    if (existing) {
      setMoods(moods.map(m => m.date === date ? { ...m, emoji, text } : m));
    } else {
      const newMood: Mood = { date, emoji, text, visible: true };
      setMoods([...moods, newMood]);
    }
  };

  // System time visual formatting
  const formatTimeStr = (d: Date): string => {
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  };

  const formatDateStr = (d: Date): string => {
    const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const dateNum = d.getDate();
    const dayName = days[d.getDay()];
    return `${y}年${m}月${dateNum}日 ${dayName}`;
  };

  // Upcoming Alert / Notification center lists
  const todayTasks = tasks.filter(t => t.date === currentDateStr && !t.completed);
  const urgentTasks = tasks.filter(t => t.urgency === 'high' && !t.completed);

  return (
    <div className="min-h-screen bg-[#fafaf9] font-sans antialiased text-neutral-800 p-3 sm:p-5 flex flex-col justify-between">
      
      {/* 1. Main Windows App layout */}
      <main className="max-w-7xl w-full mx-auto flex-1 flex flex-col space-y-4">
        
        {/* Core desktop window with Frosted Sidebar and Workspace */}
        <div className="flex-1 bg-white/90 backdrop-blur-md border border-neutral-200/60 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
          
          {/* Windows Header Tab Selector */}
          <div className="bg-white px-6 py-4 border-b border-neutral-100 flex items-center justify-between relative z-50">
            <div className="flex items-center space-x-3 sm:space-x-4">
              {/* User Avatar Section */}
              <div className="flex items-center space-x-2 bg-neutral-100/60 pl-1.5 pr-2.5 py-1 rounded-2xl border border-neutral-200/40 relative">
                {/* Emoji Avatar Button */}
                <button
                  type="button"
                  onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                  className="w-6 h-6 rounded-xl bg-white shadow-sm flex items-center justify-center hover:scale-110 active:scale-95 transition cursor-pointer text-xs select-none"
                  title="点击更换头像"
                >
                  {userAvatar}
                </button>

                {/* Name inline editable */}
                {isEditingName ? (
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    onBlur={() => setIsEditingName(false)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setIsEditingName(false);
                      }
                    }}
                    autoFocus
                    className="w-14 bg-transparent outline-none border-b border-blue-400 font-bold text-neutral-700 text-[11px] px-0.5"
                    maxLength={10}
                  />
                ) : (
                  <span
                    onClick={() => setIsEditingName(true)}
                    className="font-bold text-neutral-600 hover:text-blue-600 transition cursor-pointer text-[11px] select-none"
                    title="点击修改名字"
                  >
                    {userName || 'ToT'}
                  </span>
                )}

                {/* Avatar Picker Dropdown */}
                <AnimatePresence>
                  {showAvatarPicker && (
                    <>
                      {/* Invisible backdrop to close on outside click */}
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setShowAvatarPicker(false)} 
                      />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 5 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 5 }}
                        className="absolute left-0 top-9 mt-1 p-2 bg-white/95 backdrop-blur-md border border-neutral-200 rounded-2xl shadow-xl z-50 grid grid-cols-5 gap-1 w-40"
                      >
                        {['🐱', '🐶', '🦊', '🦁', '🐯', '🐼', '🐨', '🐰', '🐻', '🐸', '🐷', '🐵', '🐔', '🐧', '🦉', '🦆', '🦖', '🦄', '🐝', '🐙'].map(emoji => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => {
                              setUserAvatar(emoji);
                              setShowAvatarPicker(false);
                            }}
                            className="w-6 h-6 flex items-center justify-center hover:bg-neutral-100 rounded-lg text-sm transition cursor-pointer"
                          >
                            {emoji}
                          </button>
                        ))}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              {/* Tab Selector */}
              <div className="flex items-center space-x-1.5 bg-neutral-100/60 p-1 rounded-2xl border border-neutral-200/40">
                <button
                  id="tab-btn-calendar"
                  onClick={() => setActiveTab('calendar')}
                  className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${activeTab === 'calendar' ? 'bg-white text-neutral-800 shadow-sm' : 'text-neutral-500 hover:text-neutral-800'}`}
                >
                  <CalendarIcon className="w-4 h-4 text-blue-500" />
                  <span>日历</span>
                </button>
                <button
                  id="tab-btn-tasks"
                  onClick={() => setActiveTab('tasks')}
                  className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${activeTab === 'tasks' ? 'bg-white text-neutral-800 shadow-sm' : 'text-neutral-500 hover:text-neutral-800'}`}
                >
                  <ListTodo className="w-4 h-4 text-purple-500" />
                  <span>任务库</span>
                </button>
              </div>
            </div>

            {/* Right Info: Clock, Notification Trigger */}
            <div className="flex items-center space-x-3.5 sm:space-x-4 relative text-xs text-neutral-600">
              
              {/* Notifications Indicator */}
              <button
                id="btn-bell-toggle"
                onClick={() => setShowNotificationCenter(!showNotificationCenter)}
                className="p-1.5 rounded-lg hover:bg-neutral-100/80 text-neutral-500 transition relative focus:outline-none cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                {todayTasks.length > 0 && (
                  <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </button>

              {/* Clock Display */}
              <div className="text-right flex items-center space-x-2 select-none">
                <Clock className="w-3.5 h-3.5 text-neutral-400" />
                <span className="font-mono font-medium text-neutral-700 text-[11px]">
                  {formatTimeStr(systemTime)}
                </span>
                <span className="hidden md:inline text-neutral-400 text-[11px]">
                  {formatDateStr(systemTime)}
                </span>
              </div>

              {/* Push Notification Center overlay */}
              <AnimatePresence>
                {showNotificationCenter && (
                  <motion.div
                    id="notification-center-dropdown"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 top-11 w-72 bg-white/95 backdrop-blur-md border border-neutral-200 rounded-2xl p-4 shadow-xl z-50 text-neutral-800 space-y-4"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                      <span className="font-extrabold text-xs text-neutral-800 flex items-center">
                        <Bell className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
                        今日提醒推送 ({todayTasks.length})
                      </span>
                      <button 
                        onClick={() => setShowNotificationCenter(false)}
                        className="text-[10px] text-neutral-400 hover:text-neutral-700 transition cursor-pointer"
                      >
                        关闭
                      </button>
                    </div>

                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {todayTasks.length === 0 ? (
                        <div className="text-center py-6 text-[11px] text-neutral-400 italic">
                          今日无剩余未完成任务，安心休息吧！
                        </div>
                      ) : (
                        todayTasks.map(t => (
                          <div key={t.id} className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-100 text-[11px] space-y-1">
                            <div className="flex items-center justify-between font-extrabold text-neutral-800">
                              <span className="truncate">{t.title}</span>
                              {t.time && <span className="text-blue-600 font-mono text-[10px]">{t.time}</span>}
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-neutral-400">
                              <span>
                                {categories.find(c => c.id === t.categoryId)?.name || '未分类'}
                              </span>
                              {t.urgency === 'high' && (
                                <span className="text-red-500 font-extrabold flex items-center">
                                  <ShieldAlert className="w-2.5 h-2.5 mr-0.5" />
                                  高优先级
                                </span>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {urgentTasks.length > 0 && (
                      <div className="pt-2.5 border-t border-neutral-100">
                        <span className="text-[10px] font-extrabold text-red-500 block mb-1">
                          ⚠️ 待办急件提醒 ({urgentTasks.length})
                        </span>
                        <div className="text-[10px] text-neutral-500 space-y-1">
                          {urgentTasks.slice(0, 2).map(ut => (
                            <div key={ut.id} className="truncate">• {ut.title} ({ut.date || '无日期'})</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          </div>

          {/* Dynamic Screen Container */}
          <div className="flex-1 p-5 md:p-6 overflow-y-auto min-h-[500px]">
            <AnimatePresence mode="wait">
              {activeTab === 'calendar' ? (
                <motion.div
                  key="calendar-view"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.15 }}
                  className="h-full"
                >
                  <CalendarSection
                    categories={categories}
                    tasks={tasks}
                    notes={notes}
                    moods={moods}
                    currentDateStr={currentDateStr}
                    onAddTask={handleAddTask}
                    onUpdateTask={handleUpdateTask}
                    onDeleteTask={handleDeleteTask}
                    onUpdateCategory={handleUpdateCategory}
                    onUpdateCategories={handleUpdateCategories}
                    onAddNote={handleAddNote}
                    onUpdateNote={handleUpdateNote}
                    onDeleteNote={handleDeleteNote}
                    onReorderNotes={handleReorderNotes}
                    onUpdateMood={handleUpdateMood}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="tasks-view"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.15 }}
                  className="h-full"
                >
                  <TaskLibrary
                    categories={categories}
                    tasks={tasks}
                    selectedCategoryId={selectedCategoryId}
                    onSelectCategory={setSelectedCategoryId}
                    onAddCategory={handleAddCategory}
                    onUpdateCategory={handleUpdateCategory}
                    onDeleteCategory={handleDeleteCategory}
                    onReorderCategories={handleReorderCategories}
                    onAddTask={handleAddTask}
                    onUpdateTask={handleUpdateTask}
                    onDeleteTask={handleDeleteTask}
                    onReorderTasks={handleReorderTasks}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>

      </main>

      {/* 3. Footer */}
      <footer className="max-w-7xl w-full mx-auto text-center text-[10px] text-neutral-400 pt-5 pb-2 flex flex-col sm:flex-row items-center justify-between select-none">
        <div>
          © 2026 iSchedule Applet. Inspired by Apple Reminders & Calendar.
        </div>
        <div className="flex items-center space-x-1.5 mt-2 sm:mt-0 text-neutral-400">
          <span>用</span>
          <Heart className="w-3.5 h-3.5 text-rose-500 inline fill-rose-500" />
          <span>精心规划每一天</span>
        </div>
      </footer>

    </div>
  );
}
