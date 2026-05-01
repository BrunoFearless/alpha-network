import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Movie {
  id: string;
  title: string;
  year?: number;
  genre?: string;
  description?: string;
  thumbnailUrl: string;
  bannerUrl?: string;
  rating?: number;
}

interface ContinueItem {
  id: string;
  title: string;
  thumbnailUrl: string;
  episode?: string;
  progress?: number; // 0–100
}

interface NavCategory {
  label: string;
  key: string;
}

interface SideNavItem {
  icon: string;
  label: string;
  key: string;
}

interface StreamingUIProps {
  // Header
  appName?: string;
  userAvatar?: string;
  username?: string;
  userRole?: string;
  categories?: NavCategory[];
  defaultCategory?: string;
  // Accent & theme
  accentColor?: string;
  glassOpacity?: number;
  glassBorder?: string;
  background?: string;
  textColor?: string;
  textMuted?: string;
  // Side nav
  sideNav?: SideNavItem[];
  // Content
  featuredMovie?: Movie;
  continueWatching?: ContinueItem[];
  recommendations?: Movie[];
  // Fonts
  titleFont?: string;
  bodyFont?: string;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_CATEGORIES: NavCategory[] = [
  { label: "Movies", key: "movies" },
  { label: "TV Series", key: "tv" },
  { label: "Animation", key: "animation" },
  { label: "Mystery", key: "mystery" },
  { label: "More", key: "more" },
];

const DEFAULT_SIDENAV: SideNavItem[] = [
  { icon: "⌂", label: "Home", key: "home" },
  { icon: "♡", label: "Favorites", key: "fav" },
  { icon: "⬇", label: "Downloads", key: "dl" },
  { icon: "👤", label: "Profile", key: "profile" },
  { icon: "⚙", label: "Settings", key: "settings" },
];

const DEFAULT_FEATURED: Movie = {
  id: "spiderman",
  title: "Spider-Man: Across the Spider-Verse",
  year: 2023,
  genre: "Animation · Adventure",
  description:
    "Miles Morales catapults across the Multiverse, where he encounters a team of Spider-People charged with protecting its very existence.",
  thumbnailUrl:
    "https://images.unsplash.com/photo-1635805737707-575885ab0820?w=800&q=80",
  bannerUrl:
    "https://images.unsplash.com/photo-1635805737707-575885ab0820?w=800&q=80",
};

const DEFAULT_CONTINUE: ContinueItem[] = [
  {
    id: "ds3",
    title: "Dark Season 3",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=200&q=80",
    episode: "Episode 3",
    progress: 45,
  },
  {
    id: "tf",
    title: "Transformers",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1561731216-c3a4d99437d5?w=200&q=80",
    episode: "Chapter 2",
    progress: 72,
  },
  {
    id: "lupin",
    title: "Lupin Season 2",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=200&q=80",
    episode: "Episode 1",
    progress: 20,
  },
  {
    id: "avatar",
    title: "Avatar: The Way of Water",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=200&q=80",
    episode: "Part 2",
    progress: 60,
  },
];

const DEFAULT_RECS: Movie[] = [
  {
    id: "flash",
    title: "The Flash",
    year: 2023,
    genre: "Fantasy",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1568667256549-094345857637?w=300&q=80",
  },
  {
    id: "manifest",
    title: "Manifest",
    year: 2023,
    genre: "Mystery",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=300&q=80",
  },
  {
    id: "elemental",
    title: "Elemental",
    year: 2023,
    genre: "Animation",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1604537466608-109fa2f16c3b?w=300&q=80",
  },
  {
    id: "interstellar",
    title: "Interstellar",
    year: 2014,
    genre: "Sci-fi",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=300&q=80",
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function StreamingUI({
  appName = "Steary",
  userAvatar = "https://i.pravatar.cc/40?img=20",
  username = "Arfi Maulana",
  userRole = "@mymaulana",
  categories = DEFAULT_CATEGORIES,
  defaultCategory = "movies",
  accentColor = "#f97316",
  glassOpacity = 0.12,
  glassBorder = "rgba(255,255,255,0.15)",
  background = "linear-gradient(160deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)",
  textColor = "#f1f5f9",
  textMuted = "#94a3b8",
  sideNav = DEFAULT_SIDENAV,
  featuredMovie = DEFAULT_FEATURED,
  continueWatching = DEFAULT_CONTINUE,
  recommendations = DEFAULT_RECS,
  titleFont = "'Georgia', serif",
  bodyFont = "'system-ui', sans-serif",
}: StreamingUIProps) {
  const [activeCategory, setActiveCategory] = useState(defaultCategory);
  const [activeSide, setActiveSide] = useState("home");
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const glass = {
    background: `rgba(255,255,255,${glassOpacity})`,
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    border: `1px solid ${glassBorder}`,
  };

  return (
    <div
      style={{
        background,
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
          maxWidth: "960px",
          borderRadius: "16px",
          overflow: "hidden",
          boxShadow: "0 40px 100px rgba(0,0,0,0.6)",
          border: `1px solid ${glassBorder}`,
        }}
      >
        {/* Address bar */}
        <div
          style={{
            background: "rgba(15,23,42,0.9)",
            backdropFilter: "blur(12px)",
            padding: "8px 14px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            borderBottom: `1px solid ${glassBorder}`,
          }}
        >
          <div style={{ display: "flex", gap: "6px" }}>
            {["#ff5f56", "#ffbd2e", "#27c93f"].map((c) => (
              <div
                key={c}
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: c,
                }}
              />
            ))}
          </div>
          <div
            style={{ display: "flex", gap: "8px", color: textMuted, fontSize: 13 }}
          >
            ⊲ ⊳
          </div>
          <div
            style={{
              flex: 1,
              background: "rgba(255,255,255,0.06)",
              borderRadius: "8px",
              padding: "3px 12px",
              fontSize: "12px",
              color: textMuted,
              textAlign: "center",
            }}
          >
            steary.com
          </div>
          <div style={{ display: "flex", gap: "6px", color: textMuted, fontSize: 13 }}>
            ⚙ ⬇ + ⊡
          </div>
        </div>

        {/* App body */}
        <div
          style={{ display: "flex", minHeight: "560px", background: "rgba(10,15,30,0.92)" }}
        >
          {/* Side navigation */}
          <div
            style={{
              width: "58px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "20px 0",
              gap: "6px",
              borderRight: `1px solid ${glassBorder}`,
              background: "rgba(255,255,255,0.04)",
            }}
          >
            {sideNav.map((item) => (
              <button
                key={item.key}
                title={item.label}
                onClick={() => setActiveSide(item.key)}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "12px",
                  background:
                    activeSide === item.key
                      ? accentColor
                      : "transparent",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  fontSize: 16,
                  color: activeSide === item.key ? "#fff" : textMuted,
                  transition: "all 0.2s",
                }}
              >
                {item.icon}
              </button>
            ))}
          </div>

          {/* Main content */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* Top bar */}
            <div
              style={{
                padding: "14px 20px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                borderBottom: `1px solid ${glassBorder}`,
              }}
            >
              {/* Search */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "rgba(255,255,255,0.07)",
                  borderRadius: "10px",
                  padding: "6px 12px",
                  flex: "0 0 200px",
                  border: `1px solid ${glassBorder}`,
                }}
              >
                <span style={{ color: textMuted, fontSize: 13 }}>🔍</span>
                <span style={{ color: textMuted, fontSize: 12 }}>
                  Search movies
                </span>
              </div>

              {/* Category tabs */}
              <div
                style={{
                  display: "flex",
                  gap: "4px",
                  flex: 1,
                  overflow: "hidden",
                }}
              >
                {categories.map((cat) => (
                  <button
                    key={cat.key}
                    onClick={() => setActiveCategory(cat.key)}
                    style={{
                      padding: "5px 12px",
                      borderRadius: "20px",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontFamily: bodyFont,
                      fontWeight: activeCategory === cat.key ? 600 : 400,
                      background:
                        activeCategory === cat.key
                          ? accentColor
                          : "rgba(255,255,255,0.07)",
                      color:
                        activeCategory === cat.key ? "#fff" : textMuted,
                      transition: "all 0.2s",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* User */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ color: textMuted, fontSize: 16 }}>🔔</span>
                <img
                  src={userAvatar}
                  alt={username}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    objectFit: "cover",
                    border: `2px solid ${accentColor}`,
                  }}
                />
                <div>
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      color: textColor,
                    }}
                  >
                    {username}
                  </div>
                  <div style={{ fontSize: "9px", color: textMuted }}>
                    {userRole}
                  </div>
                </div>
                <span style={{ color: textMuted, fontSize: 12 }}>▾</span>
              </div>
            </div>

            {/* Body scroll area */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                display: "flex",
                gap: "0",
              }}
            >
              {/* Left sidebar: trailers + continue watching */}
              <div
                style={{
                  width: "190px",
                  flexShrink: 0,
                  padding: "14px 12px",
                  borderRight: `1px solid ${glassBorder}`,
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                }}
              >
                {/* New Trailer label */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        color: accentColor,
                      }}
                    >
                      🎬
                    </span>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        color: textColor,
                      }}
                    >
                      New Trailer
                    </span>
                  </div>
                  <span style={{ fontSize: "10px", color: textMuted }}>
                    Sort: Today ↓
                  </span>
                </div>

                {/* Trailer cards */}
                {recommendations.slice(0, 2).map((m) => (
                  <div
                    key={m.id}
                    style={{
                      borderRadius: "10px",
                      overflow: "hidden",
                      position: "relative",
                      cursor: "pointer",
                      border: `1px solid ${glassBorder}`,
                    }}
                  >
                    <img
                      src={m.thumbnailUrl}
                      alt={m.title}
                      style={{
                        width: "100%",
                        aspectRatio: "16/9",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background: "rgba(0,0,0,0.4)",
                        display: "flex",
                        alignItems: "flex-end",
                        padding: "6px",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: "9px",
                            color: "#fff",
                            fontWeight: 600,
                          }}
                        >
                          {m.title}
                        </div>
                        <div style={{ fontSize: "8px", color: textMuted }}>
                          {m.genre}
                        </div>
                      </div>
                      <div
                        style={{
                          marginLeft: "auto",
                          width: 22,
                          height: 22,
                          borderRadius: "50%",
                          background: "rgba(255,255,255,0.2)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 8,
                          color: "#fff",
                        }}
                      >
                        ▶
                      </div>
                    </div>
                  </div>
                ))}

                {/* Continue Watching */}
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    color: textColor,
                    marginTop: "4px",
                  }}
                >
                  Continue Watching
                </div>
                {continueWatching.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      gap: "8px",
                      alignItems: "center",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        position: "relative",
                        width: 56,
                        height: 36,
                        borderRadius: "6px",
                        overflow: "hidden",
                        flexShrink: 0,
                      }}
                    >
                      <img
                        src={item.thumbnailUrl}
                        alt={item.title}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                      <div
                        style={{
                          position: "absolute",
                          bottom: 0,
                          left: 0,
                          height: "3px",
                          width: `${item.progress ?? 50}%`,
                          background: accentColor,
                        }}
                      />
                    </div>
                    <div style={{ flex: 1, overflow: "hidden" }}>
                      <div
                        style={{
                          fontSize: "10px",
                          fontWeight: 600,
                          color: textColor,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.title}
                      </div>
                      <div style={{ fontSize: "9px", color: textMuted }}>
                        {item.episode}
                      </div>
                    </div>
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        background: "rgba(255,255,255,0.1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 8,
                        color: "#fff",
                        flexShrink: 0,
                      }}
                    >
                      ▶
                    </div>
                  </div>
                ))}
              </div>

              {/* Right: Featured + Recommendations */}
              <div style={{ flex: 1, padding: "14px 16px", overflowY: "auto" }}>
                {/* Featured banner */}
                <div
                  style={{
                    borderRadius: "14px",
                    overflow: "hidden",
                    position: "relative",
                    marginBottom: "20px",
                    border: `1px solid ${glassBorder}`,
                  }}
                >
                  <img
                    src={featuredMovie.bannerUrl ?? featuredMovie.thumbnailUrl}
                    alt={featuredMovie.title}
                    style={{
                      width: "100%",
                      aspectRatio: "21/9",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background:
                        "linear-gradient(90deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 60%, transparent 100%)",
                      padding: "20px 24px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "flex-end",
                    }}
                  >
                    <div
                      style={{ display: "flex", gap: "6px", marginBottom: "6px" }}
                    >
                      {featuredMovie.genre?.split(" · ").map((g) => (
                        <span
                          key={g}
                          style={{
                            fontSize: "10px",
                            background: "rgba(255,255,255,0.2)",
                            color: "#fff",
                            padding: "2px 7px",
                            borderRadius: "4px",
                          }}
                        >
                          {g}
                        </span>
                      ))}
                    </div>
                    <div
                      style={{
                        fontSize: "22px",
                        fontWeight: 700,
                        color: "#fff",
                        fontFamily: titleFont,
                        lineHeight: 1.2,
                        maxWidth: "300px",
                        marginBottom: "8px",
                      }}
                    >
                      {featuredMovie.title}
                    </div>
                    <p
                      style={{
                        fontSize: "11px",
                        color: "rgba(255,255,255,0.75)",
                        maxWidth: "280px",
                        lineHeight: 1.5,
                        margin: "0 0 12px",
                      }}
                    >
                      {featuredMovie.description}
                    </p>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        style={{
                          padding: "7px 18px",
                          borderRadius: "20px",
                          background: "#fff",
                          color: "#0f172a",
                          border: "none",
                          fontWeight: 700,
                          fontSize: "12px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        ▶ Watch
                      </button>
                      <button
                        style={{
                          padding: "7px 16px",
                          borderRadius: "20px",
                          background: "rgba(255,255,255,0.15)",
                          color: "#fff",
                          border: `1px solid rgba(255,255,255,0.3)`,
                          fontWeight: 600,
                          fontSize: "12px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        ⬇ Download
                      </button>
                      <button
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          background: "rgba(255,255,255,0.15)",
                          color: "#fff",
                          border: `1px solid rgba(255,255,255,0.3)`,
                          cursor: "pointer",
                          fontSize: 14,
                        }}
                      >
                        ···
                      </button>
                    </div>
                  </div>

                  {/* Prev/next arrows */}
                  <div
                    style={{
                      position: "absolute",
                      right: "12px",
                      bottom: "20px",
                      display: "flex",
                      gap: "6px",
                    }}
                  >
                    {["‹", "›"].map((a) => (
                      <button
                        key={a}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          background: "rgba(255,255,255,0.2)",
                          border: `1px solid rgba(255,255,255,0.3)`,
                          color: "#fff",
                          cursor: "pointer",
                          fontSize: 14,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Recommendations */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "12px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: 700,
                      color: textColor,
                    }}
                  >
                    You might like
                  </span>
                  <button
                    style={{
                      background: "none",
                      border: "none",
                      color: accentColor,
                      cursor: "pointer",
                      fontSize: "12px",
                    }}
                  >
                    See all
                  </button>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: "10px",
                  }}
                >
                  {recommendations.map((m) => (
                    <div
                      key={m.id}
                      style={{
                        borderRadius: "12px",
                        overflow: "hidden",
                        border: `1px solid ${glassBorder}`,
                        cursor: "pointer",
                        position: "relative",
                        transition: "transform 0.2s, box-shadow 0.2s",
                        transform:
                          hoveredCard === m.id ? "translateY(-4px)" : "none",
                        boxShadow:
                          hoveredCard === m.id
                            ? `0 12px 32px rgba(0,0,0,0.5)`
                            : "none",
                      }}
                      onMouseEnter={() => setHoveredCard(m.id)}
                      onMouseLeave={() => setHoveredCard(null)}
                    >
                      <img
                        src={m.thumbnailUrl}
                        alt={m.title}
                        style={{
                          width: "100%",
                          aspectRatio: "2/3",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background:
                            "linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 60%)",
                          padding: "8px",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "flex-end",
                        }}
                      >
                        {m.genre && (
                          <span
                            style={{
                              fontSize: "8px",
                              background: accentColor,
                              color: "#fff",
                              padding: "1px 5px",
                              borderRadius: "4px",
                              alignSelf: "flex-start",
                              marginBottom: "3px",
                            }}
                          >
                            {m.genre}
                          </span>
                        )}
                        <div
                          style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            color: "#fff",
                            lineHeight: 1.2,
                            marginBottom: "2px",
                          }}
                        >
                          {m.title}
                        </div>
                        {m.year && (
                          <div style={{ fontSize: "9px", color: textMuted }}>
                            {m.year}
                          </div>
                        )}
                      </div>

                      {/* Play on hover */}
                      {hoveredCard === m.id && (
                        <div
                          style={{
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            transform: "translate(-50%, -50%)",
                            width: 36,
                            height: 36,
                            borderRadius: "50%",
                            background: accentColor,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 13,
                            color: "#fff",
                          }}
                        >
                          ▶
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }
      `}</style>
    </div>
  );
}
