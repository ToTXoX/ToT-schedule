import { useCallback, useEffect, useState } from 'react';
import { isTauri } from '@tauri-apps/api/core';
import { check, type Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { Check, RefreshCw } from '../icons';

type UpdateStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'restarting' | 'current' | 'error';

export default function UpdateChecker() {
  const [supported, setSupported] = useState(false);
  const [status, setStatus] = useState<UpdateStatus>('idle');
  const [availableUpdate, setAvailableUpdate] = useState<Update | null>(null);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [open, setOpen] = useState(false);

  const checkForUpdates = useCallback(async (silent = false) => {
    if (!isTauri()) return;
    setStatus('checking');
    setMessage('');
    if (!silent) setOpen(true);

    try {
      const update = await check({ timeout: 15_000 });
      if (update) {
        setAvailableUpdate(update);
        setStatus('available');
        setOpen(true);
      } else {
        setAvailableUpdate(null);
        setStatus('current');
        if (!silent) setOpen(true);
      }
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : String(error));
      if (!silent) setOpen(true);
    }
  }, []);

  useEffect(() => {
    const tauriRuntime = isTauri();
    setSupported(tauriRuntime);
    if (!tauriRuntime) return;

    const timer = window.setTimeout(() => {
      void checkForUpdates(true);
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [checkForUpdates]);

  const installUpdate = async () => {
    if (!availableUpdate) return;
    setStatus('downloading');
    setProgress(0);
    setMessage('');

    let downloaded = 0;
    let total = 0;
    try {
      await availableUpdate.downloadAndInstall(event => {
        if (event.event === 'Started') {
          total = event.data.contentLength || 0;
        } else if (event.event === 'Progress') {
          downloaded += event.data.chunkLength;
          if (total > 0) setProgress(Math.min(100, Math.round((downloaded / total) * 100)));
        } else if (event.event === 'Finished') {
          setProgress(100);
        }
      });
      setStatus('restarting');
      await relaunch();
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : String(error));
    }
  };

  if (!supported) return null;

  return (
    <div className="relative">
      <button
        type="button"
        disabled={status === 'checking' || status === 'downloading' || status === 'restarting'}
        onClick={() => {
          if (status === 'available') setOpen(previous => !previous);
          else void checkForUpdates(false);
        }}
        className="header-icon-button p-2 rounded-lg text-neutral-500 transition relative focus:outline-none cursor-pointer disabled:cursor-wait disabled:opacity-60"
        title="检查更新"
        aria-label="检查更新"
      >
        <RefreshCw className={`w-4 h-4 ${status === 'checking' || status === 'downloading' ? 'animate-spin' : ''}`} />
        {status === 'available' && <span className="absolute top-0 right-0 w-2 h-2 bg-blue-500 rounded-full" />}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-80 bg-white/95 backdrop-blur-md border border-neutral-200 rounded-2xl p-4 shadow-xl z-60 text-neutral-800 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
            <span className="font-extrabold text-xs">应用更新</span>
            <button type="button" onClick={() => setOpen(false)} className="text-[11px] text-neutral-400 hover:text-neutral-700 cursor-pointer">
              关闭
            </button>
          </div>

          {status === 'checking' && <p className="text-[11px] text-neutral-500">正在检查 GitHub Release…</p>}

          {status === 'current' && (
            <div className="flex items-center gap-2 text-[11px] text-emerald-600">
              <Check className="w-4 h-4" />
              已是最新版本
            </div>
          )}

          {status === 'available' && availableUpdate && (
            <div className="space-y-3">
              <div>
                <p className="text-xs font-bold text-neutral-800">发现新版本 v{availableUpdate.version}</p>
                {availableUpdate.body && (
                  <p className="mt-1.5 max-h-24 overflow-y-auto whitespace-pre-wrap text-[11px] leading-relaxed text-neutral-500">
                    {availableUpdate.body}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => void installUpdate()}
                className="w-full rounded-xl bg-neutral-800 px-3 py-2 text-xs font-bold text-white hover:bg-neutral-900 cursor-pointer"
              >
                下载并安装
              </button>
            </div>
          )}

          {(status === 'downloading' || status === 'restarting') && (
            <div className="space-y-2">
              <p className="text-[11px] text-neutral-600">
                {status === 'restarting' ? '安装完成，正在重启…' : `正在下载更新${progress > 0 ? ` ${progress}%` : '…'}`}
              </p>
              <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100">
                <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-red-600">检查或安装更新失败</p>
              <p className="break-words text-[11px] text-neutral-500">{message}</p>
              <button type="button" onClick={() => void checkForUpdates(false)} className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer">
                重试
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
