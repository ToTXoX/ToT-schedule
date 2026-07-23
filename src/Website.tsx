import {useEffect, useMemo, useState} from 'react';
import {
  ArrowDown,
  ArrowRight,
  CalendarDays,
  Check,
  Clock,
  ListTodo,
  ShieldAlert,
} from './icons';
import './website.css';

const APP_ICON_URL = '/app-icon.png';
const REPOSITORY_URL = 'https://github.com/ToTXoX/ToT-schedule';
const RELEASES_URL = `${REPOSITORY_URL}/releases/latest`;
const RELEASE_API_URL = 'https://api.github.com/repos/ToTXoX/ToT-schedule/releases/latest';

type ReleaseAsset = {
  name: string;
  browser_download_url: string;
};

type ReleaseInfo = {
  tag_name: string;
  html_url: string;
  published_at: string;
  assets: ReleaseAsset[];
};

type DownloadInfo = {
  url: string;
  available: boolean;
};

const findAsset = (assets: ReleaseAsset[], predicate: (name: string) => boolean) =>
  assets.find(asset => predicate(asset.name.toLowerCase()));

const formatVersion = (tag: string) => tag.replace(/^v/i, '');

function DownloadButton({
  href,
  platform,
  meta,
  primary = false,
}: {
  href: string;
  platform: string;
  meta: string;
  primary?: boolean;
}) {
  return (
    <a
      className={`website-download-button${primary ? ' website-download-button--primary' : ''}`}
      href={href}
      rel="noreferrer"
    >
      <span className="website-download-icon" aria-hidden="true">
        <ArrowDown />
      </span>
      <span>
        <strong>下载 {platform} 版</strong>
        <small>{meta}</small>
      </span>
    </a>
  );
}

function ProductPreview() {
  return (
    <div className="website-product-visual" aria-label="ToT 日程应用界面预览">
      <div className="website-visual-orbit website-visual-orbit--one" />
      <div className="website-visual-orbit website-visual-orbit--two" />

      <div className="website-window">
        <div className="website-window-bar">
          <span />
          <span />
          <span />
          <span className="website-window-title">ToT 日程</span>
        </div>
        <div className="website-window-body">
          <aside className="website-preview-sidebar">
            <div className="website-preview-date">
              <span>今天</span>
              <strong>23</strong>
            </div>
            <nav aria-label="应用功能预览">
              <div className="is-active"><span />我的一周</div>
              <div><span />今日聚焦</div>
              <div><span />任务库</div>
            </nav>
            <div className="website-preview-categories">
              <small>清单</small>
              <div><i className="dot-blue" />工作</div>
              <div><i className="dot-green" />生活</div>
              <div><i className="dot-coral" />灵感</div>
            </div>
          </aside>
          <div className="website-preview-calendar">
            <div className="website-calendar-heading">
              <div>
                <small>2026 年 7 月</small>
                <strong>本周安排</strong>
              </div>
              <span>第 30 周</span>
            </div>
            <div className="website-week-row">
              {[
                ['一', '20'],
                ['二', '21'],
                ['三', '22'],
                ['四', '23'],
                ['五', '24'],
              ].map(([day, date]) => (
                <div className={date === '23' ? 'is-today' : ''} key={date}>
                  <small>{day}</small>
                  <strong>{date}</strong>
                </div>
              ))}
            </div>
            <div className="website-time-grid">
              <span className="time-label time-label--one">09:00</span>
              <span className="time-label time-label--two">10:00</span>
              <span className="time-label time-label--three">11:00</span>
              <span className="time-label time-label--four">12:00</span>
              <div className="website-grid-line line-one" />
              <div className="website-grid-line line-two" />
              <div className="website-grid-line line-three" />
              <div className="website-grid-line line-four" />
              <article className="website-event website-event--green">
                <strong>晨间整理</strong>
                <span>09:10 — 09:50</span>
              </article>
              <article className="website-event website-event--blue">
                <strong>产品评审</strong>
                <span>10:20 — 11:00</span>
              </article>
              <div className="website-now-line"><span /></div>
              <article className="website-event website-event--coral">
                <strong>午间散步</strong>
                <span>12:00 — 12:40</span>
              </article>
            </div>
          </div>
        </div>
      </div>

      <div className="website-progress-card">
        <small>今日完成度</small>
        <strong><span>5</span> / 7 项完成</strong>
        <div><span /></div>
      </div>

      <div className="website-note-card">
        <span aria-hidden="true">✦</span>
        <div>
          <strong>留一点空白</strong>
          <small>给计划，也给自己</small>
        </div>
      </div>
    </div>
  );
}

export default function Website() {
  const [release, setRelease] = useState<ReleaseInfo | null>(null);
  const [releaseError, setReleaseError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    fetch(RELEASE_API_URL, {
      headers: {Accept: 'application/vnd.github+json'},
      signal: controller.signal,
    })
      .then(response => {
        if (!response.ok) throw new Error(`GitHub API ${response.status}`);
        return response.json() as Promise<ReleaseInfo>;
      })
      .then(setRelease)
      .catch(error => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setReleaseError(true);
      });

    return () => controller.abort();
  }, []);

  const downloads = useMemo(() => {
    const assets = release?.assets ?? [];
    const windowsAsset = findAsset(
      assets,
      name => name.endsWith('-setup.exe') && !name.includes('legacy'),
    );
    const windowsLegacyAsset = findAsset(
      assets,
      name => name.includes('windows-7-legacy') && name.endsWith('-setup.exe'),
    );
    const macAsset = findAsset(assets, name => name.endsWith('.dmg'));

    return {
      windows: {
        url: windowsAsset?.browser_download_url ?? release?.html_url ?? RELEASES_URL,
        available: Boolean(windowsAsset),
      } satisfies DownloadInfo,
      windowsLegacy: {
        url: windowsLegacyAsset?.browser_download_url ?? release?.html_url ?? RELEASES_URL,
        available: Boolean(windowsLegacyAsset),
      } satisfies DownloadInfo,
      mac: {
        url: macAsset?.browser_download_url ?? release?.html_url ?? RELEASES_URL,
        available: Boolean(macAsset),
      } satisfies DownloadInfo,
    };
  }, [release]);

  const versionLabel = release ? `v${formatVersion(release.tag_name)}` : '最新版';

  return (
    <div className="website-shell">
      <header className="website-header">
        <a className="website-brand" href="#top" aria-label="ToT 日程首页">
          <img src={APP_ICON_URL} alt="" />
          <span>ToT 日程</span>
        </a>
        <nav className="website-nav" aria-label="主导航">
          <a href="#features">功能</a>
          <a href="#privacy">数据隐私</a>
          <a href="#download">下载</a>
          <a href={REPOSITORY_URL} rel="noreferrer">GitHub</a>
        </nav>
        <a className="website-header-download" href="#download">
          免费下载
          <ArrowRight aria-hidden="true" />
        </a>
      </header>

      <main id="top">
        <section className="website-hero">
          <div className="website-hero-copy">
            <div className="website-eyebrow">
              <span />
              简单一点，专注当下
            </div>
            <h1>
              把今天，
              <br />
              安排得<span>刚刚好</span>。
            </h1>
            <p>
              轻量、本地优先的日程与任务管理工具。
              <br />
              把计划放进时间里，让每一天清楚、从容，又留有余地。
            </p>
            <div className="website-hero-downloads">
              <DownloadButton
                href={downloads.windows.url}
                platform="Windows"
                meta={downloads.windows.available ? `${versionLabel} · Windows 10/11 x64` : '前往 GitHub 获取最新版'}
                primary
              />
              <DownloadButton
                href={downloads.mac.url}
                platform="macOS"
                meta={downloads.mac.available ? `${versionLabel} · Apple Silicon` : '前往 GitHub 获取最新版'}
              />
            </div>
            <a
              className="website-legacy-download"
              href={downloads.windowsLegacy.url}
              rel="noreferrer"
            >
              仍在使用 Windows 7？下载 {versionLabel} Legacy x64 版
              <span>安装时按需下载 WebView2 109</span>
            </a>
            <div className="website-proof-row" aria-label="产品特点">
              <span><Check />免费使用</span>
              <span><Check />数据保存在本地</span>
              <span><Check />支持自动更新</span>
            </div>
            <p className="website-release-status" aria-live="polite">
              {releaseError
                ? '暂时无法获取版本信息，下载按钮已转到 GitHub Release。'
                : release
                  ? `当前最新版本 ${versionLabel}`
                  : '正在获取最新版本…'}
            </p>
          </div>
          <ProductPreview />
        </section>

        <section className="website-features" id="features">
          <div className="website-section-heading">
            <span>为日常而设计</span>
            <h2>计划足够清楚，生活才有空间。</h2>
            <p>不堆叠复杂系统，把真正重要的时间、任务与记录放在同一个地方。</p>
          </div>
          <div className="website-feature-grid">
            <article>
              <div className="website-feature-icon website-feature-icon--blue"><CalendarDays /></div>
              <span>01</span>
              <h3>时间块规划</h3>
              <p>把任务拖进日历，直观看见一周的节奏。计划不是清单，而是可以执行的时间。</p>
            </article>
            <article>
              <div className="website-feature-icon website-feature-icon--coral"><ListTodo /></div>
              <span>02</span>
              <h3>灵活任务库</h3>
              <p>收集、分类和拆分待办，今天做什么、以后做什么，都能随手安排得井井有条。</p>
            </article>
            <article>
              <div className="website-feature-icon website-feature-icon--green"><Clock /></div>
              <span>03</span>
              <h3>围绕今天</h3>
              <p>从月度计划到此刻正在做的事，视图层层聚焦，让注意力始终回到当下。</p>
            </article>
          </div>
        </section>

        <section className="website-privacy" id="privacy">
          <div className="website-privacy-visual" aria-hidden="true">
            <div className="website-data-ring website-data-ring--outer" />
            <div className="website-data-ring website-data-ring--inner" />
            <div className="website-data-core">
              <ShieldAlert />
            </div>
            <span className="data-chip data-chip--one">任务</span>
            <span className="data-chip data-chip--two">笔记</span>
            <span className="data-chip data-chip--three">日程</span>
          </div>
          <div className="website-privacy-copy">
            <span>本地优先</span>
            <h2>你的日程，只属于你。</h2>
            <p>
              任务、分类、笔记和心情记录默认保存在电脑的应用数据目录。
              无需注册账号，也不依赖云端服务才能开始使用。
            </p>
            <ul>
              <li><Check />无需登录或创建账户</li>
              <li><Check />离线也能完整使用</li>
              <li><Check />更新包经过签名验证</li>
            </ul>
          </div>
        </section>

        <section className="website-download-section" id="download">
          <div>
            <span className="website-download-kicker">现在开始</span>
            <h2>今天，从清楚一点开始。</h2>
            <p>免费下载 ToT 日程，把零散待办变成一段段真正属于你的时间。</p>
          </div>
          <div className="website-download-panel">
            <DownloadButton
              href={downloads.windows.url}
              platform="Windows"
              meta={downloads.windows.available ? `${versionLabel} · x64 安装包` : 'GitHub Release'}
              primary
            />
            <DownloadButton
              href={downloads.mac.url}
              platform="macOS"
              meta={downloads.mac.available ? `${versionLabel} · Apple Silicon` : 'GitHub Release'}
            />
            <a
              className="website-legacy-download"
              href={downloads.windowsLegacy.url}
              rel="noreferrer"
            >
              Windows 7 Legacy x64
              <span>
                {downloads.windowsLegacy.available
                  ? `${versionLabel} · 独立更新通道`
                  : '前往 GitHub Release'}
              </span>
            </a>
          </div>
        </section>
      </main>

      <footer className="website-footer">
        <a className="website-brand" href="#top">
          <img src={APP_ICON_URL} alt="" />
          <span>ToT 日程</span>
        </a>
        <p>轻量、本地优先的日程与任务管理工具。</p>
        <div>
          <a href={REPOSITORY_URL} rel="noreferrer">GitHub</a>
          <a href={`${REPOSITORY_URL}/issues`} rel="noreferrer">问题反馈</a>
          <span>© {new Date().getFullYear()} ToT</span>
        </div>
      </footer>
    </div>
  );
}
