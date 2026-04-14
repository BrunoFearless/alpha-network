import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Post {
  id: number;
  author: string;
  handle: string;
  avatar: string;
  badge?: string;
  verified?: boolean;
  time: string;
  content: string;
  image?: string;
  comments: number;
  reposts: number;
  likes: number | string;
  isLiked?: boolean;
}

interface Community {
  id: number;
  name: string;
  members: string;
  icon: string;
  color: string;
}

interface WatchItem {
  id: number;
  title: string;
  episode: string;
  current: number;
  total: number;
  cover: string;
  color: string;
}

interface TrendingTrope {
  rank: number;
  tag: string;
  sparkles: string;
}

interface HotDiscussion {
  id: number;
  title: string;
  count: string;
  preview: string;
  color: string;
}

interface SuggestedUser {
  id: number;
  name: string;
  handle: string;
  avatar: string;
  badge: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const POSTS: Post[] = [
  {
    id: 1,
    author: "Aimi",
    handle: "@shoujo_dreamer",
    avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=aimi&backgroundColor=ffb6c1",
    badge: "❤️",
    verified: true,
    time: "2h",
    content:
      "Found a new cozy cafe that looks straight out of a manga ☕ Perfect for reading and waiting for my prince charming!",
    image:
      "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&q=80",
    comments: 154,
    reposts: 32,
    likes: "2.4k",
    isLiked: true,
  },
  {
    id: 2,
    author: "Ren",
    handle: "@ren_romance",
    avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=ren&backgroundColor=c8b6ff",
    badge: "🌸",
    time: "5h",
    content:
      "Why does the second lead always have to suffer? 💔 I can't stop crying after episode 8... They deserved better.",
    image:
      "https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=600&q=80",
    comments: 432,
    reposts: 128,
    likes: "5.6k",
  },
  {
    id: 3,
    author: "Sakura Fans",
    handle: "@cherryblossom_subs",
    avatar: "https://api.dicebear.com/7.x/shapes/svg?seed=sakura&backgroundColor=ffd6e7",
    time: "8h",
    content: "That hand-holding scene... history was made today. 🥹",
    image:
      "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=600&q=80",
    comments: 890,
    reposts: 3200,
    likes: "12.8k",
  },
];

const COMMUNITIES: Community[] = [
  { id: 1, name: "Shoujo Club", members: "12.4k members", icon: "🌸", color: "#ff85a1" },
  { id: 2, name: "RomCom Fans", members: "8.2k members", icon: "👥", color: "#b39ddb" },
  { id: 3, name: "Tearjerkers", members: "5.6k members", icon: "💧", color: "#81d4fa" },
];

const WATCHING: WatchItem[] = [
  { id: 1, title: "Springtime Whisper", episode: "Ep 8 / 12", current: 8, total: 12, cover: "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=80&q=70", color: "#ff85a1" },
  { id: 2, title: "Our Secret Cafe", episode: "Ep 4 / 24", current: 4, total: 24, cover: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=80&q=70", color: "#9e9e9e" },
  { id: 3, title: "Tears in the Rain", episode: "Ep 22 / 24", current: 22, total: 24, cover: "https://images.unsplash.com/photo-1514316703755-dca7d7d9d882?w=80&q=70", color: "#b39ddb" },
];

const TRENDING: TrendingTrope[] = [
  { rank: 1, tag: "#EnemiestoLovers", sparkles: "15.2k Sparkles" },
  { rank: 2, tag: "#SchoolFestival", sparkles: "8.4k Sparkles" },
  { rank: 3, tag: "#ChildhoodFriend", sparkles: "5.1k Sparkles" },
  { rank: 4, tag: "#RainyConfession", sparkles: "3.2k Sparkles" },
];

const HOT_DISCUSSIONS: HotDiscussion[] = [
  {
    id: 1,
    title: "Best Confession Scene of 2024?",
    count: "128",
    preview: "Honestly, the train station scene in episode 12 was a masterpiece in...",
    color: "#ff85a1",
  },
  {
    id: 2,
    title: "Manga vs Anime ending",
    count: "84",
    preview: "Am I the only one who thinks they rushed the final arc? The manga...",
    color: "#b39ddb",
  },
  {
    id: 3,
    title: "Upcoming Fall Releases 🍁",
    count: "256",
    preview: "The lineup looks incredible! Especially looking forward to the new...",
    color: "#4caf50",
  },
];

const SUGGESTED: SuggestedUser[] = [
  { id: 1, name: "Ren", handle: "@ren_romance", avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=ren&backgroundColor=c8b6ff", badge: "🌸" },
  { id: 2, name: "Yuki", handle: "@winter_sonata", avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=yuki&backgroundColor=b3e5fc", badge: "❄️" },
  { id: 3, name: "Hina", handle: "@hina_sunshine", avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=hina&backgroundColor=fff9c4", badge: "🌟" },
];

const TABS = ["For You", "Following", "Anime", "Manga"];

// ─── Icons (inline SVG) ───────────────────────────────────────────────────────

const IconHome = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
  </svg>
);
const IconCompass = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
  </svg>
);
const IconPlus = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const IconLayers = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </svg>
);
const IconBell = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);
const IconComment = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);
const IconRepost = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="17 1 21 5 17 9" />
    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
    <polyline points="7 23 3 19 7 15" />
    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
  </svg>
);
const IconHeart = ({ filled }: { filled?: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? "#ff85a1" : "none"} stroke={filled ? "#ff85a1" : "currentColor"} strokeWidth="2">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);
const IconShare = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
);
const IconDots = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="5" r="1.5" />
    <circle cx="12" cy="12" r="1.5" />
    <circle cx="12" cy="19" r="1.5" />
  </svg>
);
const IconImage = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);
const IconSparkle = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
  </svg>
);
const IconTag = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
    <line x1="7" y1="7" x2="7.01" y2="7" />
  </svg>
);
const IconAddUser = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="8.5" cy="7" r="4" />
    <line x1="20" y1="8" x2="20" y2="14" />
    <line x1="23" y1="11" x2="17" y2="11" />
  </svg>
);
const IconVerified = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="#7c4dff">
    <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

// ─── Sub-components ───────────────────────────────────────────────────────────

function Avatar({ src, size = 40, className = "" }: { src: string; size?: number; className?: string }) {
  return (
    <img
      src={src}
      alt="avatar"
      width={size}
      height={size}
      className={className}
      style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
    />
  );
}

function PostCard({ post }: { post: Post }) {
  const [liked, setLiked] = useState(post.isLiked ?? false);

  return (
    <div style={{
      background: "white",
      borderRadius: "16px",
      padding: "20px",
      boxShadow: "0 1px 8px rgba(180,120,160,0.08)",
      border: "1px solid rgba(255,180,200,0.15)",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
        <Avatar src={post.avatar} size={42} />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ fontWeight: 700, fontSize: "14px", color: "#1a1a2e" }}>{post.author}</span>
            <span style={{ fontSize: "13px" }}>{post.badge}</span>
            {post.verified && <IconVerified />}
          </div>
          <div style={{ fontSize: "12px", color: "#9e9e9e" }}>
            {post.handle} · {post.time}
          </div>
        </div>
        <button style={{ background: "none", border: "none", color: "#bbb", cursor: "pointer", padding: "4px" }}>
          <IconDots />
        </button>
      </div>

      {/* Content */}
      <p style={{ fontSize: "14px", color: "#2d2d2d", lineHeight: "1.6", marginBottom: post.image ? "14px" : "0" }}>
        {post.content}
      </p>

      {/* Image */}
      {post.image && (
        <img
          src={post.image}
          alt="post"
          style={{
            width: "100%",
            borderRadius: "12px",
            objectFit: "cover",
            maxHeight: "260px",
            display: "block",
            marginBottom: "14px",
          }}
        />
      )}

      {/* Actions */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "24px",
        paddingTop: "12px",
        borderTop: "1px solid #f5e6ef",
      }}>
        <ActionBtn icon={<IconComment />} count={post.comments} color="#9e9e9e" />
        <ActionBtn icon={<IconRepost />} count={post.reposts} color={typeof post.reposts === "number" && post.reposts > 100 ? "#7c4dff" : "#9e9e9e"} active={typeof post.reposts === "number" && post.reposts > 100} />
        <button
          onClick={() => setLiked(!liked)}
          style={{
            display: "flex", alignItems: "center", gap: "6px",
            background: "none", border: "none", cursor: "pointer",
            color: liked ? "#ff85a1" : "#9e9e9e",
            fontSize: "13px", fontWeight: liked ? 600 : 400,
            transition: "all 0.2s",
          }}
        >
          <IconHeart filled={liked} />
          {post.likes}
        </button>
        <button style={{ marginLeft: "auto", background: "none", border: "none", color: "#bbb", cursor: "pointer" }}>
          <IconShare />
        </button>
      </div>
    </div>
  );
}

function ActionBtn({ icon, count, color, active }: { icon: React.ReactNode; count: number | string; color: string; active?: boolean }) {
  return (
    <button style={{
      display: "flex", alignItems: "center", gap: "6px",
      background: "none", border: "none", cursor: "pointer",
      color, fontSize: "13px", fontWeight: active ? 600 : 400,
      transition: "color 0.2s",
    }}>
      {icon}
      {count}
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function HomeFeed() {
  const [activeTab, setActiveTab] = useState("For You");
  const [activeNav, setActiveNav] = useState("home");
  const [postText, setPostText] = useState("");

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #fff0f5 0%, #f8f0ff 50%, #f0f5ff 100%)",
      fontFamily: "'Nunito', 'Quicksand', sans-serif",
    }}>
      {/* Google Font import */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Nunito', sans-serif; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #e8b4cb; border-radius: 4px; }
        .nav-btn:hover { background: rgba(255,133,161,0.15) !important; }
        .tab-btn:hover { color: #ff85a1 !important; }
        .post-action:hover { color: #ff85a1 !important; }
        .sidebar-item:hover { background: rgba(255,133,161,0.08) !important; }
        .follow-btn:hover { background: #ff6fa8 !important; }
        .tag-row:hover { background: rgba(255,133,161,0.06) !important; }
        .post-compose:focus { outline: none; }
      `}</style>

      {/* ── Top Navigation ── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(255,255,255,0.85)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(255,180,200,0.2)",
        padding: "0 24px",
        height: "60px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "4px", background: "white", borderRadius: "50px", padding: "6px 10px", boxShadow: "0 2px 16px rgba(180,100,140,0.12)" }}>
          {[
            { id: "home", icon: <IconHome /> },
            { id: "explore", icon: <IconCompass /> },
            { id: "create", icon: <IconPlus />, special: true },
            { id: "library", icon: <IconLayers /> },
            { id: "notifications", icon: <IconBell /> },
          ].map((item) => (
            <button
              key={item.id}
              className="nav-btn"
              onClick={() => setActiveNav(item.id)}
              style={{
                width: item.special ? "48px" : "40px",
                height: item.special ? "48px" : "40px",
                borderRadius: "50%",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s",
                background: item.special
                  ? "linear-gradient(135deg, #ff85a1, #c062e8)"
                  : activeNav === item.id
                  ? "rgba(255,133,161,0.12)"
                  : "transparent",
                color: item.special
                  ? "white"
                  : activeNav === item.id
                  ? "#ff85a1"
                  : "#9e9e9e",
                boxShadow: item.special ? "0 4px 14px rgba(192,98,232,0.4)" : "none",
              }}
            >
              {item.icon}
            </button>
          ))}
        </div>
      </nav>

      {/* ── Layout ── */}
      <div style={{
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "24px 16px",
        display: "grid",
        gridTemplateColumns: "260px 1fr 300px",
        gap: "20px",
        alignItems: "start",
      }}>

        {/* ════ LEFT SIDEBAR ════ */}
        <aside style={{ display: "flex", flexDirection: "column", gap: "16px", position: "sticky", top: "80px" }}>

          {/* Profile Card */}
          <div style={{
            background: "white",
            borderRadius: "20px",
            overflow: "hidden",
            boxShadow: "0 2px 16px rgba(180,100,140,0.1)",
            border: "1px solid rgba(255,180,200,0.15)",
          }}>
            {/* Banner */}
            <div style={{
              height: "80px",
              background: "linear-gradient(135deg, #ff85a1 0%, #c062e8 100%)",
              position: "relative",
            }} />
            {/* Avatar */}
            <div style={{ padding: "0 16px 16px", position: "relative" }}>
              <div style={{
                marginTop: "-28px",
                marginBottom: "8px",
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                border: "3px solid white",
                overflow: "hidden",
                background: "white",
              }}>
                <Avatar src="https://api.dicebear.com/7.x/adventurer/svg?seed=aimi&backgroundColor=ffb6c1" size={56} />
              </div>
              <div style={{ fontWeight: 800, fontSize: "16px", color: "#1a1a2e" }}>
                Aimi <span style={{ fontSize: "14px" }}>❤️</span>
              </div>
              <div style={{ fontSize: "12px", color: "#bbb", marginBottom: "14px" }}>@shoujo_dreamer</div>
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                textAlign: "center",
                paddingTop: "12px",
                borderTop: "1px solid #f5e6ef",
              }}>
                {[
                  { label: "SERIES", value: "152" },
                  { label: "FOLLOWERS", value: "8.4k" },
                  { label: "FOLLOWING", value: "340" },
                ].map((stat) => (
                  <div key={stat.label} style={{ cursor: "pointer" }}>
                    <div style={{ fontWeight: 800, fontSize: "15px", color: "#1a1a2e" }}>{stat.value}</div>
                    <div style={{ fontSize: "10px", color: "#bbb", letterSpacing: "0.5px" }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Communities */}
          <SideSection title="MY COMMUNITIES">
            {COMMUNITIES.map((c) => (
              <button
                key={c.id}
                className="sidebar-item"
                style={{
                  display: "flex", alignItems: "center", gap: "10px",
                  padding: "8px", borderRadius: "10px",
                  background: "none", border: "none", cursor: "pointer", width: "100%",
                  transition: "background 0.2s", textAlign: "left",
                }}
              >
                <div style={{
                  width: "32px", height: "32px",
                  borderRadius: "10px",
                  background: `${c.color}22`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "16px", flexShrink: 0,
                }}>
                  {c.icon}
                </div>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#1a1a2e" }}>{c.name}</div>
                  <div style={{ fontSize: "11px", color: "#bbb" }}>{c.members}</div>
                </div>
              </button>
            ))}
          </SideSection>

          {/* Currently Watching */}
          <SideSection title="CURRENTLY WATCHING">
            {WATCHING.map((w) => (
              <button
                key={w.id}
                className="sidebar-item"
                style={{
                  display: "flex", alignItems: "center", gap: "10px",
                  padding: "8px", borderRadius: "10px",
                  background: "none", border: "none", cursor: "pointer", width: "100%",
                  transition: "background 0.2s", textAlign: "left",
                }}
              >
                <img
                  src={w.cover}
                  alt={w.title}
                  style={{ width: "40px", height: "40px", borderRadius: "8px", objectFit: "cover", flexShrink: 0 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#1a1a2e", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{w.title}</div>
                  <div style={{ fontSize: "11px", color: "#bbb", marginBottom: "4px" }}>{w.episode}</div>
                  <div style={{ height: "3px", background: "#f0e0e8", borderRadius: "4px" }}>
                    <div style={{
                      height: "100%",
                      width: `${(w.current / w.total) * 100}%`,
                      background: w.color,
                      borderRadius: "4px",
                    }} />
                  </div>
                </div>
              </button>
            ))}
          </SideSection>
        </aside>

        {/* ════ CENTER FEED ════ */}
        <main style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* Tabs */}
          <div style={{
            display: "flex",
            gap: "24px",
            borderBottom: "2px solid #f5e6ef",
            paddingBottom: "0",
            background: "white",
            borderRadius: "16px 16px 0 0",
            padding: "0 20px",
            boxShadow: "0 1px 8px rgba(180,120,160,0.08)",
          }}>
            {TABS.map((tab) => (
              <button
                key={tab}
                className="tab-btn"
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: "16px 4px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: activeTab === tab ? 800 : 500,
                  color: activeTab === tab ? "#ff85a1" : "#9e9e9e",
                  borderBottom: activeTab === tab ? "2px solid #ff85a1" : "2px solid transparent",
                  marginBottom: "-2px",
                  transition: "all 0.2s",
                  fontFamily: "inherit",
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Post Composer */}
          <div style={{
            background: "white",
            borderRadius: "16px",
            padding: "16px 20px",
            boxShadow: "0 1px 8px rgba(180,120,160,0.08)",
            border: "1px solid rgba(255,180,200,0.15)",
          }}>
            <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
              <Avatar src="https://api.dicebear.com/7.x/adventurer/svg?seed=aimi&backgroundColor=ffb6c1" size={38} />
              <div style={{ flex: 1 }}>
                <textarea
                  className="post-compose"
                  placeholder="Share your romantic thoughts or theories..."
                  value={postText}
                  onChange={(e) => setPostText(e.target.value)}
                  style={{
                    width: "100%",
                    border: "none",
                    resize: "none",
                    fontSize: "14px",
                    color: "#1a1a2e",
                    background: "transparent",
                    fontFamily: "inherit",
                    minHeight: "48px",
                    lineHeight: "1.6",
                    caretColor: "#ff85a1",
                  }}
                  rows={2}
                />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "10px", borderTop: "1px solid #f5e6ef" }}>
                  <div style={{ display: "flex", gap: "8px" }}>
                    {[<IconImage />, <IconSparkle />, <IconTag />].map((icon, i) => (
                      <button
                        key={i}
                        style={{
                          width: "32px", height: "32px",
                          borderRadius: "8px",
                          border: "1.5px solid #f0dce8",
                          background: "white",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#c090b0",
                          transition: "all 0.2s",
                        }}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                  <button
                    style={{
                      background: "linear-gradient(135deg, #ff85a1, #c062e8)",
                      color: "white",
                      border: "none",
                      borderRadius: "20px",
                      padding: "8px 22px",
                      fontSize: "13px",
                      fontWeight: 700,
                      cursor: "pointer",
                      boxShadow: "0 4px 14px rgba(192,98,232,0.3)",
                      fontFamily: "inherit",
                      transition: "opacity 0.2s",
                    }}
                    onClick={() => setPostText("")}
                  >
                    Post
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Posts */}
          {POSTS.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </main>

        {/* ════ RIGHT SIDEBAR ════ */}
        <aside style={{ display: "flex", flexDirection: "column", gap: "16px", position: "sticky", top: "80px" }}>

          {/* Trending Tropes */}
          <SideSection title="TRENDING TROPES">
            {TRENDING.map((t) => (
              <button
                key={t.rank}
                className="tag-row"
                style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  padding: "8px", borderRadius: "10px",
                  background: "none", border: "none", cursor: "pointer", width: "100%",
                  textAlign: "left", transition: "background 0.2s",
                }}
              >
                <span style={{
                  width: "22px", height: "22px",
                  borderRadius: "6px",
                  background: t.rank === 1 ? "linear-gradient(135deg, #ff85a1, #c062e8)" : "#f5e6ef",
                  color: t.rank === 1 ? "white" : "#c090b0",
                  fontSize: "11px",
                  fontWeight: 800,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  {t.rank}
                </span>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#1a1a2e" }}>{t.tag}</div>
                  <div style={{ fontSize: "11px", color: "#bbb" }}>{t.sparkles}</div>
                </div>
              </button>
            ))}
          </SideSection>

          {/* Hot Discussions */}
          <SideSection title="HOT DISCUSSIONS">
            {HOT_DISCUSSIONS.map((d) => (
              <button
                key={d.id}
                className="sidebar-item"
                style={{
                  display: "flex", flexDirection: "column", gap: "4px",
                  padding: "10px", borderRadius: "10px",
                  background: "none", border: "none", cursor: "pointer", width: "100%",
                  textAlign: "left", transition: "background 0.2s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "#1a1a2e" }}>{d.title}</span>
                  <span style={{
                    fontSize: "11px", fontWeight: 700, color: d.color,
                    background: `${d.color}18`,
                    padding: "2px 8px", borderRadius: "20px",
                    flexShrink: 0, marginLeft: "6px",
                  }}>
                    {d.count} 💬
                  </span>
                </div>
                <p style={{ fontSize: "11px", color: "#9e9e9e", lineHeight: "1.5" }}>{d.preview}</p>
              </button>
            ))}
          </SideSection>

          {/* Suggested Matches */}
          <SideSection title="SUGGESTED MATCHES">
            {SUGGESTED.map((u) => (
              <div
                key={u.id}
                style={{
                  display: "flex", alignItems: "center", gap: "10px",
                  padding: "8px", borderRadius: "10px",
                }}
              >
                <Avatar src={u.avatar} size={36} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#1a1a2e" }}>
                    {u.name} {u.badge}
                  </div>
                  <div style={{ fontSize: "11px", color: "#bbb" }}>{u.handle}</div>
                </div>
                <button
                  className="follow-btn"
                  style={{
                    width: "28px", height: "28px",
                    borderRadius: "50%",
                    border: "1.5px solid #ff85a1",
                    background: "white",
                    cursor: "pointer",
                    color: "#ff85a1",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.2s",
                    flexShrink: 0,
                  }}
                >
                  <IconAddUser />
                </button>
              </div>
            ))}
          </SideSection>

          {/* Footer */}
          <div style={{ fontSize: "10px", color: "#ccc", lineHeight: "2", padding: "0 4px" }}>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "4px" }}>
              {["Terms of Service", "Privacy Policy", "Cookie Policy", "Accessibility", "Ads Info"].map((t) => (
                <a key={t} href="#" style={{ color: "#ccc", textDecoration: "none" }}>{t}</a>
              ))}
            </div>
            <span>© 2024 Anime Connect</span>
          </div>
        </aside>
      </div>
    </div>
  );
}

// ─── SideSection wrapper ──────────────────────────────────────────────────────

function SideSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: "white",
      borderRadius: "20px",
      padding: "16px",
      boxShadow: "0 2px 16px rgba(180,100,140,0.08)",
      border: "1px solid rgba(255,180,200,0.12)",
    }}>
      <h3 style={{
        fontSize: "10px",
        fontWeight: 800,
        color: "#c090b0",
        letterSpacing: "1.2px",
        marginBottom: "12px",
      }}>
        {title}
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        {children}
      </div>
    </div>
  );
}