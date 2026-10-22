import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, ArrowDownUp, ArrowRight, Bookmark, BookmarkCheck, BrainCircuit,
  BriefcaseBusiness, Check, ChevronDown, CircleHelp, Code2, Database,
  ExternalLink, Flame, Globe2, GraduationCap, Layers3, Menu, Newspaper,
  RefreshCw, Search, ShieldCheck, Sparkles, Terminal, TrendingUp, X
} from 'lucide-react';

const API_ROOT = 'https://hacker-news.firebaseio.com/v0';
const STORY_CACHE_KEY = 'skillpilot-pulse-bookmarks-v1';
const CATEGORY_KEYWORDS = {
  'AI & ML': ['ai ', 'artificial intelligence', 'machine learning', 'llm', 'language model', 'neural', 'gpt', 'openai', 'anthropic', 'model training', 'inference', 'deep learning'],
  'Web Dev': ['react', 'javascript', 'typescript', 'css', 'html', 'frontend', 'front-end', 'web dev', 'browser', 'vite', 'next.js', 'node.js', 'web platform'],
  'Data & Analytics': ['data science', 'data analyst', 'sql', 'database', 'postgres', 'analytics', 'pandas', 'python', 'warehouse', 'vector database', 'data engineering'],
  'Career': ['career', 'hiring', 'job ', 'jobs', 'interview', 'resume', 'internship', 'salary', 'engineer role', 'developer role', 'workplace', 'remote work'],
  'Tools & Security': ['security', 'vulnerability', 'open source', 'github', 'developer tool', 'terminal', 'linux', 'cli', 'editor', 'vscode', 'privacy', 'password', 'npm', 'release']
};
const CATEGORIES = [
  { name: 'For You', icon: Sparkles },
  { name: 'AI & ML', icon: BrainCircuit },
  { name: 'Web Dev', icon: Code2 },
  { name: 'Data & Analytics', icon: Database },
  { name: 'Career', icon: BriefcaseBusiness },
  { name: 'Tools & Security', icon: ShieldCheck }
];
const DEMO_STORIES = [
  { id: 'demo-1', title: 'A practical guide to building better React components', by: 'SkillPilot Editorial', score: 184, descendants: 36, time: Math.floor(Date.now()/1000)-3600, url: 'https://react.dev/learn', category: 'Web Dev', domain: 'react.dev', demo: true, summary: 'Review component composition, state boundaries, and patterns that keep frontend projects maintainable.' },
  { id: 'demo-2', title: 'Python for data analysis: a hands-on learning path', by: 'SkillPilot Editorial', score: 142, descendants: 24, time: Math.floor(Date.now()/1000)-7200, url: 'https://pandas.pydata.org/docs/getting_started/index.html', category: 'Data & Analytics', domain: 'pandas.pydata.org', demo: true, summary: 'A focused route through data loading, cleaning, grouping, and practical exploration with pandas.' },
  { id: 'demo-3', title: 'How to evaluate machine-learning models beyond accuracy', by: 'SkillPilot Editorial', score: 128, descendants: 19, time: Math.floor(Date.now()/1000)-11000, url: 'https://scikit-learn.org/stable/modules/model_evaluation.html', category: 'AI & ML', domain: 'scikit-learn.org', demo: true, summary: 'Understand precision, recall, F1, validation strategies, and the trade-offs hidden by a single metric.' },
  { id: 'demo-4', title: 'The junior developer portfolio: show evidence, not just skills', by: 'SkillPilot Editorial', score: 97, descendants: 12, time: Math.floor(Date.now()/1000)-19000, url: 'https://github.com/skills', category: 'Career', domain: 'github.com', demo: true, summary: 'Turn projects into clear evidence by documenting the problem, your decisions, and what you shipped.' },
  { id: 'demo-5', title: 'SQL joins explained with interactive examples', by: 'SkillPilot Editorial', score: 91, descendants: 16, time: Math.floor(Date.now()/1000)-24000, url: 'https://sqlbolt.com/', category: 'Data & Analytics', domain: 'sqlbolt.com', demo: true, summary: 'Strengthen a core data skill by practicing joins, filtering, aggregation, and multi-table queries.' },
  { id: 'demo-6', title: 'A beginner-friendly path through web accessibility', by: 'SkillPilot Editorial', score: 76, descendants: 8, time: Math.floor(Date.now()/1000)-30000, url: 'https://developer.mozilla.org/en-US/docs/Web/Accessibility', category: 'Web Dev', domain: 'developer.mozilla.org', demo: true, summary: 'Learn semantic HTML, keyboard navigation, contrast, and accessible forms while improving real projects.' },
  { id: 'demo-7', title: 'Git skills every developer should practice', by: 'SkillPilot Editorial', score: 69, descendants: 10, time: Math.floor(Date.now()/1000)-40000, url: 'https://skills.github.com/', category: 'Tools & Security', domain: 'skills.github.com', demo: true, summary: 'Build confidence with commits, branches, pull requests, reviews, and collaborative workflows.' }
];

function inferCategory(title = '') {
  const normalized = ` ${title.toLowerCase()} `;
  let best = { category: 'Tech', score: 0 };
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const score = keywords.reduce((sum, word) => sum + (normalized.includes(word) ? (word.length > 7 ? 2 : 1) : 0), 0);
    if (score > best.score) best = { category, score };
  }
  return best.category;
}
function hostFromUrl(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return 'news.ycombinator.com'; }
}
function timeAgo(timestamp) {
  const seconds = Math.max(0, Math.floor(Date.now() / 1000) - (timestamp || Date.now()/1000));
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
function readTime(title = '') { return `${Math.max(2, Math.ceil(title.split(/\s+/).length / 12))} min read`; }
function safeParse(value, fallback) { try { return value ? JSON.parse(value) : fallback; } catch { return fallback; } }

async function fetchStories() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const idsResponse = await fetch(`${API_ROOT}/topstories.json`, { signal: controller.signal });
    if (!idsResponse.ok) throw new Error('Could not reach the news feed.');
    const ids = await idsResponse.json();
    const selectedIds = ids.slice(0, 45);
    const results = await Promise.allSettled(selectedIds.map(async (id) => {
      const response = await fetch(`${API_ROOT}/item/${id}.json`, { signal: controller.signal });
      if (!response.ok) return null;
      const story = await response.json();
      if (!story || story.type !== 'story' || story.dead || story.deleted || !story.title) return null;
      const link = story.url || `https://news.ycombinator.com/item?id=${story.id}`;
      return {
        id: String(story.id), title: story.title, by: story.by || 'unknown', score: story.score || 0,
        descendants: story.descendants || 0, time: story.time || Math.floor(Date.now()/1000),
        url: link, hnUrl: `https://news.ycombinator.com/item?id=${story.id}`,
        category: inferCategory(story.title), domain: hostFromUrl(link), demo: false
      };
    }));
    const stories = results.filter(x => x.status === 'fulfilled' && x.value).map(x => x.value);
    if (!stories.length) throw new Error('No stories were returned.');
    return stories;
  } finally { clearTimeout(timeout); }
}

function App() {
  const [stories, setStories] = useState([]);
  const [savedStories, setSavedStories] = useState(() => safeParse(localStorage.getItem(STORY_CACHE_KEY), []));
  const [activeCategory, setActiveCategory] = useState('For You');
  const [activePage, setActivePage] = useState('feed');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('trending');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedMode, setFeedMode] = useState('live');
  const [errorMessage, setErrorMessage] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => { localStorage.setItem(STORY_CACHE_KEY, JSON.stringify(savedStories)); }, [savedStories]);

  const loadStories = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setErrorMessage('');
    try {
      const result = await fetchStories();
      setStories(result);
      setFeedMode('live');
      setLastUpdated(new Date());
    } catch (error) {
      setStories(DEMO_STORIES);
      setFeedMode('demo');
      setErrorMessage(error?.name === 'AbortError' ? 'The live feed took too long to respond. Showing curated demo resources instead.' : 'The live feed is unavailable right now. Showing curated demo resources instead.');
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { loadStories(); }, [loadStories]);

  const savedIds = useMemo(() => new Set(savedStories.map(s => String(s.id))), [savedStories]);
  const baseList = activePage === 'saved' ? savedStories : stories;
  const filteredStories = useMemo(() => {
    let list = [...baseList];
    if (activeCategory !== 'For You') list = list.filter(story => story.category === activeCategory);
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter(story => `${story.title} ${story.domain} ${story.by} ${story.category}`.toLowerCase().includes(q));
    }
    if (sortBy === 'trending') list.sort((a, b) => (b.score || 0) - (a.score || 0));
    else if (sortBy === 'newest') list.sort((a, b) => (b.time || 0) - (a.time || 0));
    else list.sort((a, b) => (b.descendants || 0) - (a.descendants || 0));
    return list;
  }, [baseList, activeCategory, searchTerm, sortBy]);

  const categoryCounts = useMemo(() => {
    const counts = {};
    for (const story of stories) counts[story.category] = (counts[story.category] || 0) + 1;
    return counts;
  }, [stories]);
  const focusCategory = useMemo(() => Object.entries(categoryCounts).sort((a,b) => b[1]-a[1])[0]?.[0] || 'Web Dev', [categoryCounts]);
  const notify = (message) => { setToast(message); window.setTimeout(() => setToast(''), 2400); };

  function toggleSaved(story) {
    setSavedStories(current => {
      if (current.some(item => String(item.id) === String(story.id))) {
        notify('Removed from your reading list');
        return current.filter(item => String(item.id) !== String(story.id));
      }
      notify('Saved to your reading list');
      return [{ ...story }, ...current];
    });
  }
  function selectCategory(name) { setActiveCategory(name); setActivePage('feed'); setMobileMenuOpen(false); }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenuOpen ? 'sidebar-open' : ''}`}>
        <div className="brand-row">
          <div className="brand-icon"><Activity size={23} strokeWidth={2.5}/></div>
          <div><div className="brand-name">SkillPilot <span>Pulse</span></div><div className="brand-subtitle">TECH • LEARN • GROW</div></div>
          <button className="icon-btn mobile-close" onClick={() => setMobileMenuOpen(false)} aria-label="Close menu"><X size={18}/></button>
        </div>
        <div className="sidebar-label">WORKSPACE</div>
        <button className={`nav-item ${activePage === 'feed' ? 'active' : ''}`} onClick={() => { setActivePage('feed'); setActiveCategory('For You'); setMobileMenuOpen(false); }}><Newspaper size={18}/><span>Latest feed</span><span className="nav-count">{stories.length}</span></button>
        <button className={`nav-item ${activePage === 'saved' ? 'active' : ''}`} onClick={() => { setActivePage('saved'); setActiveCategory('For You'); setMobileMenuOpen(false); }}><Bookmark size={18}/><span>Reading list</span><span className="nav-count">{savedStories.length}</span></button>
        <div className="sidebar-label category-label">TOPICS</div>
        <div className="topic-list">
          {CATEGORIES.map(({ name, icon: Icon }) => (
            <button key={name} className={`nav-item topic-item ${activePage === 'feed' && activeCategory === name ? 'active' : ''}`} onClick={() => selectCategory(name)}><Icon size={17}/><span>{name}</span>{name !== 'For You' && <span className="topic-dot"/>}</button>
          ))}
        </div>
        <div className="sidebar-bottom">
          <div className="sidebar-card"><div className="sidebar-card-icon"><GraduationCap size={18}/></div><div className="sidebar-card-title">Keep learning</div><p>Turn today's tech news into tomorrow's skills.</p><button onClick={() => { setActivePage('feed'); setActiveCategory('Career'); }}>Explore career stories <ArrowRight size={14}/></button></div>
          <div className="sidebar-foot"><span className={`status-dot ${feedMode === 'live' ? '' : 'demo-dot'}`}/>{feedMode === 'live' ? 'Connected to Hacker News' : 'Demo resource mode'}<br/><span className="sidebar-foot-sub">SkillPilot learning ecosystem</span></div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left"><button className="icon-btn mobile-menu" onClick={() => setMobileMenuOpen(true)} aria-label="Open menu"><Menu size={20}/></button><div className="breadcrumb">Workspace <span>/</span> <strong>{activePage === 'saved' ? 'Reading list' : activeCategory === 'For You' ? 'Latest feed' : activeCategory}</strong></div></div>
          <div className="topbar-right"><div className="live-pill"><span className={`status-dot ${feedMode === 'live' ? '' : 'demo-dot'}`}/>{feedMode === 'live' ? 'LIVE FEED' : 'DEMO MODE'}</div><button className={`refresh-btn ${refreshing ? 'spinning' : ''}`} onClick={() => loadStories(true)} disabled={refreshing}><RefreshCw size={15}/><span>{refreshing ? 'Refreshing' : 'Refresh'}</span></button><div className="avatar">SP</div></div>
        </header>

        <div className="page-content">
          <section className="hero-section">
            <div className="hero-copy"><div className="eyebrow"><span className="eyebrow-line"/> YOUR DAILY KNOWLEDGE BRIEFING</div><h1>Stay sharp.<br/><span>Stay current.</span></h1><p>Technology news that moves your skills forward. Discover ideas, tools, and trends worth learning about.</p><div className="hero-meta"><span><Globe2 size={15}/> {feedMode === 'live' ? 'Hacker News · Live stories' : 'Curated learning resources'}</span><span className="meta-divider"/><span><Activity size={15}/> Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div></div>
            <div className="hero-art" aria-hidden="true"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="orbit orbit-three"/><div className="hero-core"><BrainCircuit size={42}/></div><div className="orbit-node node-one"><Code2 size={18}/></div><div className="orbit-node node-two"><Database size={17}/></div><div className="orbit-node node-three"><Sparkles size={17}/></div><div className="hero-art-caption"><span className="caption-dot"/> KNOWLEDGE IN MOTION</div></div>
          </section>

          <section className="insight-strip">
            <div className="insight-icon"><Flame size={19}/></div><div className="insight-text"><strong>Today's learning radar</strong><span>{`Explore ${focusCategory} stories — ${categoryCounts[focusCategory] || 0} relevant ${categoryCounts[focusCategory] === 1 ? 'story' : 'stories'} in the current feed.`}</span></div><button className="insight-action" onClick={() => selectCategory(focusCategory)}>Explore topic <ArrowRight size={15}/></button>
          </section>

          {errorMessage && <div className="notice-banner"><CircleHelp size={17}/><span>{errorMessage}</span><button onClick={() => setErrorMessage('')} aria-label="Dismiss message"><X size={16}/></button></div>}

          <section className="feed-section">
            <div className="section-heading"><div><div className="eyebrow small-eyebrow">CURATED FOR YOUR GROWTH</div><h2>{activePage === 'saved' ? 'Your reading list' : activeCategory === 'For You' ? 'The latest pulse' : activeCategory}</h2><p>{activePage === 'saved' ? 'Stories you saved for a deeper read.' : 'Fresh ideas from across the technology ecosystem.'}</p></div><div className="section-tools"><div className="search-box"><Search size={17}/><input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search stories..." aria-label="Search stories"/><kbd>⌘ K</kbd></div><label className="sort-select"><ArrowDownUp size={15}/><select value={sortBy} onChange={e => setSortBy(e.target.value)} aria-label="Sort stories"><option value="trending">Trending</option><option value="newest">Newest</option><option value="discussed">Most discussed</option></select><ChevronDown size={14}/></label></div></div>
            <div className="mobile-topic-row">{CATEGORIES.map(cat => <button key={cat.name} className={activeCategory === cat.name ? 'selected' : ''} onClick={() => selectCategory(cat.name)}>{cat.name}</button>)}</div>

            {loading ? <div className="loading-grid">{[1,2,3,4,5,6].map(n => <div className="skeleton-card" key={n}><div className="skeleton-line w30"/><div className="skeleton-line w85"/><div className="skeleton-line w70"/><div className="skeleton-bottom"/></div>)}</div> : filteredStories.length === 0 ? <div className="empty-state"><div className="empty-icon"><Search size={25}/></div><h3>{activePage === 'saved' ? 'Your reading list is empty' : 'No stories found'}</h3><p>{activePage === 'saved' ? 'Save a story with the bookmark icon and it will appear here.' : 'Try another topic or search for a different keyword.'}</p>{activePage === 'saved' && <button className="primary-btn" onClick={() => {setActivePage('feed'); setActiveCategory('For You');}}>Browse latest stories <ArrowRight size={16}/></button>}</div> : <div className="story-grid">{filteredStories.map((story, index) => <StoryCard key={story.id} story={story} saved={savedIds.has(String(story.id))} featured={index === 0 && activePage === 'feed' && activeCategory === 'For You' && !searchTerm} onToggleSaved={() => toggleSaved(story)}/>)}</div>}
            <div className="feed-footer"><span><span className="footer-pulse"/>{feedMode === 'live' ? 'Stories sourced from Hacker News public API' : 'Showing sample learning resources'}</span><span>{filteredStories.length} {filteredStories.length === 1 ? 'story' : 'stories'} shown</span></div>
          </section>
          <footer className="app-footer"><span>© {new Date().getFullYear()} SkillPilot Pulse</span><span>Curiosity is a career advantage.</span><a href="https://github.com/HackerNews/API" target="_blank" rel="noreferrer">API details <ExternalLink size={12}/></a></footer>
        </div>
      </main>
      {toast && <div className="toast"><span className="toast-check"><Check size={14}/></span>{toast}</div>}
    </div>
  );
}

function StoryCard({ story, saved, featured, onToggleSaved }) {
  const categoryIcon = story.category === 'AI & ML' ? BrainCircuit : story.category === 'Data & Analytics' ? Database : story.category === 'Career' ? BriefcaseBusiness : story.category === 'Tools & Security' ? Terminal : Code2;
  const CategoryIcon = categoryIcon;
  const link = story.url || story.hnUrl || `https://news.ycombinator.com/item?id=${story.id}`;
  return (
    <article className={`story-card ${featured ? 'featured-story' : ''}`}>
      <div className="story-card-top"><span className={`category-tag tag-${story.category.toLowerCase().replace(/[^a-z]+/g, '-')}`}><CategoryIcon size={13}/>{story.category || 'Tech'}</span><button className={`bookmark-btn ${saved ? 'saved' : ''}`} onClick={onToggleSaved} aria-label={saved ? 'Remove bookmark' : 'Save story'} title={saved ? 'Remove from reading list' : 'Save to reading list'}>{saved ? <BookmarkCheck size={18}/> : <Bookmark size={18}/>}</button></div>
      {featured && <div className="featured-label"><TrendingUp size={13}/> EDITOR'S PICK FOR YOU</div>}
      <h3><a href={link} target="_blank" rel="noreferrer">{story.title}</a></h3>
      {story.summary && <p className="story-summary">{story.summary}</p>}
      <div className="story-domain"><span className="domain-favicon"><Globe2 size={13}/></span><span>{story.domain || 'news.ycombinator.com'}</span>{story.demo && <span className="demo-label">SAMPLE</span>}</div>
      <div className="story-card-bottom"><div className="story-metrics"><span><Flame size={14}/>{story.score || 0}</span><span><Newspaper size={13}/>{story.descendants || 0}</span><span>{timeAgo(story.time)}</span></div><a className="read-link" href={link} target="_blank" rel="noreferrer">Read story <ExternalLink size={13}/></a></div>
    </article>
  );
}

export default App;
