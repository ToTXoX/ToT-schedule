import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Category, Task, Subtask, Note, Mood, MoodEmoji, ParsedTaskResult 
} from './types';
import TaskLibrary from './components/TaskLibrary';
import CalendarSection from './components/CalendarSection';
import NaturalLanguageInput from './components/NaturalLanguageInput';
import { 
  Calendar as CalendarIcon, ListTodo, Sparkles, Clock, Bell, Settings, Check, 
  HelpCircle, Eye, RefreshCw, Layers, ShieldAlert, ArrowRight, Heart
} from 'lucide-react';

// Preset Category Defaults
const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-work', name: '工作任务', color: 'blue', colorHex: '#3b82f6', order: 0, visible: true },
  { id: 'cat-study', name: '学习计划', color: 'purple', colorHex: '#a855f7', order: 1, visible: true },
  { id: 'cat-life', name: '生活杂务', color: 'green', colorHex: '#10b981', order: 2, visible: true },
  { id: 'cat-fitness', name: '运动健身', color: 'orange', colorHex: '#f97316', order: 3, visible: true }
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

  // UI State
  const [activeTab, setActiveTab] = useState<'calendar' | 'tasks'>('calendar');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | 'all' | 'unscheduled'>('all');
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [isAiOnline, setIsAiOnline] = useState(false);

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

  // Check AI (Gemini) endpoint status
  useEffect(() => {
    fetch('/api/ai-status')
      .then(res => res.json())
      .then(data => {
        setIsAiOnline(!!data.ready);
      })
      .catch(() => {
        setIsAiOnline(false);
      });
  }, []);

  // --- CRUD OPERATORS ---

  // Category
  const handleAddCategory = (name: string, color: string) => {
    const hexMap: { [key: string]: string } = {
      sky: '#0ea5e9',
      blue: '#1d4ed8',
      lavender: '#c084fc',
      purple: '#7e22ce',
      lime: '#4ade80',
      green: '#15803d',
      amber: '#fbbf24',
      orange: '#c2410c',
      rose: '#f43f5e',
      red: '#b91c1c',
      'slate-light': '#94a3b8',
      slate: '#334155'
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
    setCategories(categories.map(c => c.id === id ? { ...c, ...updates } : c));
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
    <div className="min-h-screen bg-slate-900 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.25),rgba(255,255,255,0))] font-sans antialiased text-neutral-800 p-3 sm:p-5 flex flex-col justify-between">
      
      {/* 1. macOS Menu/Status Bar */}
      <header className="max-w-7xl w-full mx-auto bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 px-4 py-2 flex items-center justify-between text-xs text-white/80 shadow-md mb-4 select-none relative z-50">
        <div className="flex items-center space-x-4">
          <span className="font-bold text-white tracking-wider flex items-center">
            <Layers className="w-4 h-4 mr-1.5 text-blue-400" />
            iSchedule Planner
          </span>
          <span className="h-3 w-px bg-white/20" />
          <div className="hidden sm:flex items-center space-x-2 text-[11px] text-white/60">
            <span className={`w-2 h-2 rounded-full ${isAiOnline ? 'bg-green-500 animate-pulse' : 'bg-amber-400'}`} />
            <span>AI 解析服务: {isAiOnline ? '在线' : '离线 (本地保存正常)'}</span>
          </div>
        </div>

        {/* Right Info: Clock, Notification Trigger */}
        <div className="flex items-center space-x-4 relative">
          
          {/* Notifications Indicator */}
          <button
            id="btn-bell-toggle"
            onClick={() => setShowNotificationCenter(!showNotificationCenter)}
            className="p-1.5 rounded-lg hover:bg-white/10 transition relative focus:outline-none"
          >
            <Bell className="w-4 h-4" />
            {todayTasks.length > 0 && (
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </button>

          {/* Clock Display */}
          <div className="text-right flex items-center space-x-2">
            <Clock className="w-3.5 h-3.5 text-white/60" />
            <span className="font-mono font-medium text-white text-[11px]">
              {formatTimeStr(systemTime)}
            </span>
            <span className="hidden md:inline text-white/60 text-[11px]">
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
                className="absolute right-0 top-10 w-72 bg-neutral-900/95 backdrop-blur-xl border border-white/15 rounded-2xl p-4 shadow-2xl z-50 text-white space-y-4"
              >
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <span className="font-bold text-xs text-white flex items-center">
                    <Bell className="w-3.5 h-3.5 mr-1 text-yellow-400" />
                    今日提醒推送 ({todayTasks.length})
                  </span>
                  <button 
                    onClick={() => setShowNotificationCenter(false)}
                    className="text-[10px] text-white/50 hover:text-white"
                  >
                    关闭
                  </button>
                </div>

                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {todayTasks.length === 0 ? (
                    <div className="text-center py-6 text-[11px] text-white/40 italic">
                      今日无剩余未完成任务，安心休息吧！
                    </div>
                  ) : (
                    todayTasks.map(t => (
                      <div key={t.id} className="p-2 bg-white/5 rounded-xl border border-white/5 text-[11px] space-y-1">
                        <div className="flex items-center justify-between font-bold">
                          <span className="truncate">{t.title}</span>
                          {t.time && <span className="text-blue-300 text-[10px]">{t.time}</span>}
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-white/50">
                          <span>
                            {categories.find(c => c.id === t.categoryId)?.name || '未分类'}
                          </span>
                          {t.urgency === 'high' && (
                            <span className="text-red-400 font-bold flex items-center">
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
                  <div className="pt-2 border-t border-white/10">
                    <span className="text-[10px] font-semibold text-red-400 block mb-1">
                      ⚠️ 待办急件提醒 ({urgentTasks.length})
                    </span>
                    <div className="text-[10px] text-white/60 space-y-1">
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
      </header>

      {/* 2. Main Windows App layout */}
      <main className="max-w-7xl w-full mx-auto flex-1 flex flex-col space-y-4">
        
        {/* Natural Language AI Input Bar */}
        <NaturalLanguageInput
          categories={categories}
          onParsedTaskAdded={handleParsedTaskAdded}
          currentDateStr={currentDateStr}
        />

        {/* Core desktop window with Frosted Sidebar and Workspace */}
        <div className="flex-1 bg-white/90 backdrop-blur-md border border-neutral-200/60 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
          
          {/* Windows Header Tab Selector */}
          <div className="bg-neutral-50 px-6 py-3 border-b border-neutral-100 flex items-center justify-between">
            <div className="flex items-center space-x-1.5 bg-neutral-200/60 p-1 rounded-2xl border border-neutral-200">
              <button
                id="tab-btn-calendar"
                onClick={() => setActiveTab('calendar')}
                className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition ${activeTab === 'calendar' ? 'bg-white text-neutral-800 shadow-sm' : 'text-neutral-500 hover:text-neutral-800'}`}
              >
                <CalendarIcon className="w-4 h-4 text-blue-500" />
                <span>日历视图规划</span>
              </button>
              <button
                id="tab-btn-tasks"
                onClick={() => setActiveTab('tasks')}
                className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition ${activeTab === 'tasks' ? 'bg-white text-neutral-800 shadow-sm' : 'text-neutral-500 hover:text-neutral-800'}`}
              >
                <ListTodo className="w-4 h-4 text-purple-500" />
                <span>清单任务库</span>
              </button>
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
      <footer className="max-w-7xl w-full mx-auto text-center text-[10px] text-white/40 pt-4 pb-2 flex flex-col sm:flex-row items-center justify-between select-none">
        <div>
          © 2026 iSchedule Applet. Inspired by Apple Reminders & Calendar.
        </div>
        <div className="flex items-center space-x-1.5 mt-2 sm:mt-0 text-white/50">
          <span>用</span>
          <Heart className="w-3.5 h-3.5 text-red-500 inline fill-red-500" />
          <span>与 Gemini AI 协同规划每一天</span>
        </div>
      </footer>

    </div>
  );
}
