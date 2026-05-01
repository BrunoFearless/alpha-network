import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Shot {
  id: string;
  imageUrl: string;
  title: string;
  author: string;
  authorAvatar: string;
  likes: number;
  views: number;
  isTeam?: boolean;
}

interface SocialLink {
  icon: string; // emoji or SVG string
  href: string;
  label: string;
}

interface Tab {
  label: string;
  key: string;
}

interface DribbbleCardProps {
  // Header
  greeting?: string;
  brandName?: string;
  thankYouText?: string;
  // Tabs
  tabs?: Tab[];
  defaultTab?: string;
  accentColor?: string;
  // Social sidebar
  socialLinks?: SocialLink[];
  // Action icons (top-right)
  actionIcons?: string[];
  avatarUrl?: string;
  // Shots grid
  shots?: Shot[];
  // Background
  backgroundGradient?: string;
  glassOpacity?: number;
  glassBorderColor?: string;
  // Typography
  headingFont?: string;
  bodyFont?: string;
  textColor?: string;
}

// ─── Default Data ─────────────────────────────────────────────────────────────

const DEFAULT_TABS: Tab[] = [
  { label: "Shots", key: "shots" },
  { label: "Boosted Shots", key: "boosted" },
  { label: "Collections", key: "collections" },
  { label: "Liked Shots", key: "liked" },
  { label: "About", key: "about" },
];

const DEFAULT_SOCIAL: SocialLink[] = [
  { icon: "𝕏", href: "#", label: "Twitter" },
  { icon: "f", href: "#", label: "Facebook" },
  { icon: "◎", href: "#", label: "Instagram" },
  { icon: "𝓟", href: "#", label: "Pinterest" },
];

const DEFAULT_SHOTS: Shot[] = [
  {
    id: "1",
    imageUrl:
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80",
    title: "Abstract 3D",
    author: "Filip Topolovec",
    authorAvatar: "https://i.pravatar.cc/32?img=1",
    likes: 42,
    views: 310,
  },
  {
    id: "2",
    imageUrl:
      "https://images.unsplash.com/photo-1633177317976-3f9bc45e1d1d?w=400&q=80",
    title: "Fifteen Issues",
    author: "Stephanie Weik",
    authorAvatar: "https://i.pravatar.cc/32?img=2",
    likes: 88,
    views: 520,
  },
  {
    id: "3",
    imageUrl:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80",
    title: "Supreme X Nike MAG",
    author: "Shamin Yassar",
    authorAvatar: "https://i.pravatar.cc/32?img=3",
    likes: 134,
    views: 890,
    isTeam: true,
  },
  {
    id: "4",
    imageUrl:
      "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&q=80",
    title: "Neon Cubes",
    author: "Alex Chen",
    authorAvatar: "https://i.pravatar.cc/32?img=4",
    likes: 67,
    views: 430,
  },
  {
    id: "5",
    imageUrl:
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80",
    title: "Dashboard UI",
    author: "Maria Santos",
    authorAvatar: "https://i.pravatar.cc/32?img=5",
    likes: 29,
    views: 210,
  },
  {
    id: "6",
    imageUrl:
      "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400&q=80",
    title: "Analytics View",
    author: "James Wright",
    authorAvatar: "https://i.pravatar.cc/32?img=6",
    likes: 55,
    views: 380,
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function DribbbleCard({
  greeting = "Hello",
  brandName = "dribbble",
  thankYouText = "Thank you @Appventurez!",
  tabs = DEFAULT_TABS,
  defaultTab = "liked",
  accentColor = "#ea4c89",
  socialLinks = DEFAULT_SOCIAL,
  actionIcons = ["⊞", "◉", "◈", "👤", "⬇"],
  avatarUrl = "https://i.pravatar.cc/40?img=10",
  shots = DEFAULT_SHOTS,
  backgroundGradient = "linear-gradient(135deg, #c084fc 0%, #a855f7 30%, #818cf8 60%, #60a5fa 100%)",
  glassOpacity = 0.18,
  glassBorderColor = "rgba(255,255,255,0.25)",
  headingFont = "'Georgia', serif",
  bodyFont = "'system-ui', sans-serif",
  textColor = "#1a0a2e",
}: DribbbleCardProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [hoveredShot, setHoveredShot] = useState<string | null>(null);

  const glassStyle = {
    background: `rgba(255,255,255,${glassOpacity})`,
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    border: `1px solid ${glassBorderColor}`,
  };

  return (
    <div
      style={{
        background: backgroundGradient,
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px",
        fontFamily: bodyFont,
      }}
    >
      {/* Browser chrome */}
      <div
        style={{
          width: "100%",
          maxWidth: "900px",
          borderRadius: "16px",
          overflow: "hidden",
          boxShadow: "0 32px 80px rgba(80,0,120,0.35)",
          border: glassBorderColor,
        }}
      >
        {/* Address bar */}
        <div
          style={{
            ...glassStyle,
            padding: "10px 16px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            borderRadius: "16px 16px 0 0",
          }}
        >
          <div style={{ display: "flex", gap: "6px" }}>
            {["#ff5f56", "#ffbd2e", "#27c93f"].map((c) => (
              <div
                key={c}
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  background: c,
                }}
              />
            ))}
          </div>
          <div
            style={{
              display: "flex",
              gap: "8px",
              color: textColor,
              opacity: 0.6,
              fontSize: 14,
            }}
          >
            ← → ↻
          </div>
          <div
            style={{
              flex: 1,
              background: "rgba(255,255,255,0.3)",
              borderRadius: "8px",
              padding: "4px 12px",
              fontSize: "12px",
              color: textColor,
              opacity: 0.7,
            }}
          >
            dribbble.com/agnyaray/likes
          </div>
          <div style={{ color: textColor, opacity: 0.6 }}>★ ⋮</div>
        </div>

        {/* Main body */}
        <div
          style={{
            ...glassStyle,
            borderRadius: "0 0 16px 16px",
            display: "flex",
            minHeight: "520px",
          }}
        >
          {/* Left sidebar */}
          <div
            style={{
              width: "52px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "16px 0",
              gap: "4px",
              borderRight: `1px solid ${glassBorderColor}`,
            }}
          >
            <button
              style={{
                width: 36,
                height: 36,
                borderRadius: "10px",
                background: "rgba(255,255,255,0.3)",
                border: `1px solid ${glassBorderColor}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                fontSize: 14,
                marginBottom: "12px",
              }}
            >
              🔍
            </button>
            {socialLinks.map((s) => (
              <a
                key={s.label}
                href={s.href}
                title={s.label}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "10px",
                  background: "rgba(0,0,0,0.15)",
                  border: `1px solid ${glassBorderColor}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: "bold",
                  textDecoration: "none",
                  cursor: "pointer",
                  transition: "transform 0.15s",
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLElement).style.transform =
                    "scale(1.12)")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLElement).style.transform = "scale(1)")
                }
              >
                {s.icon}
              </a>
            ))}
            <div style={{ flex: 1 }} />
            <button
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.25)",
                border: `1px solid ${glassBorderColor}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                fontSize: 14,
                color: "#fff",
              }}
            >
              ‹
            </button>
          </div>

          {/* Content area */}
          <div style={{ flex: 1, padding: "24px 28px", overflow: "hidden" }}>
            {/* Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "16px",
              }}
            >
              <div>
                <h1
                  style={{
                    margin: 0,
                    fontSize: "28px",
                    color: textColor,
                    fontFamily: bodyFont,
                    fontWeight: 400,
                    lineHeight: 1.2,
                  }}
                >
                  {greeting}{" "}
                  <span
                    style={{
                      fontFamily: headingFont,
                      fontStyle: "italic",
                      fontWeight: 700,
                      color: accentColor,
                    }}
                  >
                    {brandName}
                  </span>
                </h1>
                <p
                  style={{
                    margin: "4px 0 0",
                    fontSize: "13px",
                    color: textColor,
                    opacity: 0.65,
                  }}
                >
                  {thankYouText}
                </p>
              </div>
              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                {actionIcons.slice(0, -1).map((icon, i) => (
                  <button
                    key={i}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "8px",
                      background: "rgba(255,255,255,0.2)",
                      border: `1px solid ${glassBorderColor}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      fontSize: 13,
                    }}
                  >
                    {icon}
                  </button>
                ))}
                <img
                  src={avatarUrl}
                  alt="avatar"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    border: `2px solid ${accentColor}`,
                    objectFit: "cover",
                  }}
                />
                <button
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "8px",
                    background: accentColor,
                    border: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    fontSize: 13,
                    color: "#fff",
                  }}
                >
                  {actionIcons[actionIcons.length - 1]}
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div
              style={{
                display: "flex",
                gap: "2px",
                marginBottom: "20px",
                borderBottom: `1px solid ${glassBorderColor}`,
                paddingBottom: "2px",
              }}
            >
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "8px",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontFamily: bodyFont,
                    fontWeight: activeTab === tab.key ? 600 : 400,
                    background:
                      activeTab === tab.key
                        ? accentColor
                        : "transparent",
                    color:
                      activeTab === tab.key ? "#fff" : textColor,
                    opacity: activeTab === tab.key ? 1 : 0.65,
                    transition: "all 0.2s",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Shots Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "12px",
              }}
            >
              {shots.map((shot) => (
                <div
                  key={shot.id}
                  style={{
                    borderRadius: "12px",
                    overflow: "hidden",
                    background: "rgba(255,255,255,0.15)",
                    border: `1px solid ${glassBorderColor}`,
                    position: "relative",
                    cursor: "pointer",
                    transition: "transform 0.2s, box-shadow 0.2s",
                    transform:
                      hoveredShot === shot.id ? "translateY(-4px)" : "none",
                    boxShadow:
                      hoveredShot === shot.id
                        ? "0 12px 32px rgba(0,0,0,0.2)"
                        : "none",
                  }}
                  onMouseEnter={() => setHoveredShot(shot.id)}
                  onMouseLeave={() => setHoveredShot(null)}
                >
                  <div style={{ aspectRatio: "4/3", overflow: "hidden" }}>
                    <img
                      src={shot.imageUrl}
                      alt={shot.title}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        transition: "transform 0.3s",
                        transform:
                          hoveredShot === shot.id ? "scale(1.06)" : "scale(1)",
                      }}
                    />
                  </div>
                  <div
                    style={{
                      padding: "8px 10px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <img
                      src={shot.authorAvatar}
                      alt={shot.author}
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        objectFit: "cover",
                      }}
                    />
                    <span
                      style={{
                        fontSize: "11px",
                        color: textColor,
                        opacity: 0.75,
                        flex: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {shot.author}
                    </span>
                    {shot.isTeam && (
                      <span
                        style={{
                          fontSize: "9px",
                          background: accentColor,
                          color: "#fff",
                          padding: "1px 5px",
                          borderRadius: "4px",
                          fontWeight: 700,
                        }}
                      >
                        TEAM
                      </span>
                    )}
                    <span
                      style={{
                        fontSize: "11px",
                        color: textColor,
                        opacity: 0.5,
                      }}
                    >
                      ♡ {shot.likes}
                    </span>
                    <span
                      style={{
                        fontSize: "11px",
                        color: textColor,
                        opacity: 0.5,
                      }}
                    >
                      👁 {shot.views}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        * { box-sizing: border-box; }
        button:hover { opacity: 0.85; }
      `}</style>
    </div>
  );
}
