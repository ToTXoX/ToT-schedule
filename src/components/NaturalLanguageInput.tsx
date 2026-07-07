import React, { useState } from 'react';
import { Category, ParsedTaskResult } from '../types';
import { Sparkles, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

interface NaturalLanguageInputProps {
  categories: Category[];
  onParsedTaskAdded: (parsedResult: ParsedTaskResult) => void;
  currentDateStr: string; // "2026-07-06"
}

export default function NaturalLanguageInput({
  categories,
  onParsedTaskAdded,
  currentDateStr
}: NaturalLanguageInputProps) {
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({
    type: null,
    message: ''
  });

  // Calculate day of week name for reference
  const getDayName = (dateStr: string): string => {
    try {
      const d = new Date(dateStr);
      const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      return days[d.getDay()];
    } catch {
      return '周一';
    }
  };

  const handleAISubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = inputText.trim();
    if (!query) return;

    setIsLoading(true);
    setStatus({ type: null, message: '' });

    try {
      const response = await fetch('/api/parse-task', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: query,
          currentDate: currentDateStr,
          currentDayOfWeek: getDayName(currentDateStr),
          categories: categories.map(c => ({ id: c.id, name: c.name }))
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to parse task');
      }

      const result: ParsedTaskResult = await response.json();
      
      if (!result || !result.title) {
        throw new Error('Could not extract a valid task from the input.');
      }

      // Add the parsed task
      onParsedTaskAdded(result);

      // Show success toast details
      let successMsg = `成功解析并添加：『${result.title}』`;
      const datePart = result.date ? `日期: ${result.date}` : '';
      const timePart = result.time ? `时间: ${result.time}` : '';
      
      const timeDetails = [datePart, timePart].filter(Boolean).join(' ');
      if (timeDetails) {
        successMsg += `，安排在 [ ${timeDetails} ]`;
      }
      if (result.categoryId) {
        const catName = categories.find(c => c.id === result.categoryId)?.name;
        if (catName) {
          successMsg += `，分类至 [ ${catName} ]`;
        }
      }
      if (result.urgency === 'high') {
        successMsg += ` (设置为紧急)`;
      }

      setStatus({
        type: 'success',
        message: successMsg
      });
      setInputText('');

      // Auto clear success message after 5 seconds
      setTimeout(() => {
        setStatus(prev => prev.type === 'success' ? { type: null, message: '' } : prev);
      }, 6000);

    } catch (err: any) {
      console.error(err);
      setStatus({
        type: 'error',
        message: err.message || '自然语言解析服务遇到问题，请检查后台日志或稍后重试。'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="ai-input-container" className="bg-gradient-to-r from-blue-50/80 via-purple-50/80 to-blue-50/80 backdrop-blur-md rounded-2xl p-4 border border-blue-100 shadow-sm space-y-3">
      
      <div className="flex items-center space-x-2">
        <Sparkles className="w-5 h-5 text-blue-600 animate-pulse" />
        <span className="text-xs font-bold text-neutral-800 tracking-wide uppercase">
          AI 智能日程助手 (自然语言录入)
        </span>
        <span className="text-[10px] bg-blue-100 text-blue-700 font-medium px-2 py-0.5 rounded-full">
          支持模糊描述
        </span>
      </div>

      <form id="form-ai-input" onSubmit={handleAISubmit} className="flex gap-2">
        <div className="relative flex-1">
          <input
            id="input-ai-text"
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isLoading}
            placeholder="例如: 明天下午3点开会 / 帮我安排下周三下午五点去看医生 / 紧急！明天上午九点做实验"
            className="w-full text-sm pl-4 pr-10 py-2.5 bg-white/90 rounded-xl border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition disabled:opacity-70"
          />
          <button
            type="button"
            onClick={() => setInputText('明天下午3点和研发团队开会')}
            className="absolute right-3 top-2.5 text-[11px] text-blue-500 hover:underline font-semibold"
            title="快捷测试"
          >
            例
          </button>
        </div>
        <button
          type="submit"
          disabled={isLoading || !inputText.trim()}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition flex items-center shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              解析中...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-1.5" />
              AI 规划
            </>
          )}
        </button>
      </form>

      {/* Parsing Response Status / Feedbacks */}
      {status.type && (
        <div 
          id="ai-parsing-status"
          className={`flex items-start space-x-2 text-xs p-3 rounded-xl border transition ${status.type === 'success' ? 'bg-green-50 border-green-100 text-green-800' : 'bg-red-50 border-red-100 text-red-800'}`}
        >
          {status.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
          )}
          <span className="leading-relaxed">{status.message}</span>
        </div>
      )}

    </div>
  );
}
