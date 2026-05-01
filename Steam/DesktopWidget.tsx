import { useState, useEffect } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SocialIcon {
  icon: string;
  label: string;
  href?: string;
  bgColor?: string;
}

interface MusicTrack {
  title: string;
  artist?: string;
  coverUrl?: string;
}

interface CharacterCard {
  imageUrl: string;
  bgColor?: string;
}

interface DesktopWidgetProps {
  // Identity
  username?: string;
  greeting?: string;
  characterName?: string;          // displayed in Japanese or any script
  characterSubtitle?: string;
  // Images
  characterImageUrl?: string;
  characterCards?: CharacterCard[];
  backgroundImageUrl?: string;
  // Taskbar apps
  taskbarApps?: { icon: string; label: string; color: string }[];
  // Social sidebar
  socialIcons?: SocialIcon[];
  // Music
  currentTrack?: MusicTrack;
  // Theme
  accentColor?: string;
  accentColorSecondary?: string;
  glassLight?: string;
  glassDark?: string;
  glassBorder?: string;
  textLight?: string;
  textDark?: string;
  // Fonts
  clockFont?: string;
  bodyFont?: string;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_SOCIAL: SocialIcon[] = [
  { icon: "♪", label: "TikTok", bgColor: "#000" },
  { icon: "▶", label: "YouTube", bgColor: "#ff0000" },
  { icon: "f", label: "Facebook", bgColor: "#1877f2" },
  { icon: "◎", label: "Instagram", bgColor: "#e1306c" },
  { icon: "𝕏", label: "X/Twitter", bgColor: "#000" },
];

const DEFAULT_TASKBAR = [
  { icon: "⊞", label: "Windows", color: "#0078d4" },
  { icon: "♫", label: "Spotify", color: "#1db954" },
  { icon: "Ps", label: "Photoshop", color: "#001e36" },
  { icon: "◉", label: "Chrome", color: "#4285f4" },
  { icon: "Ae", label: "After Effects", color: "#00005b" },
  { icon: "◈", label: "Discord", color: "#5865f2" },
];

const DEFAULT_CARDS: CharacterCard[] = [
  {
    imageUrl:
      "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=120&q=80",
    bgColor: "#e8f4fc",
  },
  {
    imageUrl:
      "https://images.unsplash.com/photo-1607853202273-797f1c22a38e?w=120&q=80",
    bgColor: "#fff0f3",
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function DesktopWidget({
  username = "Expyy",
  greeting = "Hi Expyy!!",
  characterName = "山田　リョウ",
  characterSubtitle = "",
  characterImageUrl = "https://images.unsplash.com/photo-1612178537253-bccd437b730e?w=500&q=80",
  characterCards = DEFAULT_CARDS,
  backgroundImageUrl = "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=1400&q=80",
  taskbarApps = DEFAULT_TASKBAR,
  socialIcons = DEFAULT_SOCIAL,
  currentTrack = { title: "Untitled", artist: "Unknown" },
  accentColor = "#7c6af7",
  accentColorSecondary = "#f472b6",
  glassLight = "rgba(255,255,255,0.18)",
  glassDark = "rgba(0,0,0,0.25)",
  glassBorder = "rgba(255,255,255,0.28)",
  textLight = "#ffffff",
  textDark = "#1a1a2e",
  clockFont = "'Courier New', monospace",
  bodyFont = "'system-ui', sans-serif",
}: DesktopWidgetProps) {
  const [time, setTime] = useState(new Date());
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const hours = String(time.getHours()).padStart(2, "0");
  const minutes = String(time.getMinutes()).padStart(2, "0");
  const dayName = time.toLocaleDateString("en-US", { weekday: "long" });
  const monthName = time.toLocaleDateString("en-US", { month: "long" });
  const dayNum = time.getDate();

  // Calendar grid
  const year = time.getFullYear();
  const month = time.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calDays: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const glass = {
    background: glassLight,
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: `1px solid ${glassBorder}`,
  };

  const glassDarkStyle = {
    background: glassDark,
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: `1px solid ${glassBorder}`,
  };

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#1a1a2e",
        fontFamily: bodyFont,
        padding: "24px",
      }}
    >
      {/* Desktop frame */}
      <div
        style={{
          width: "100%",
          maxWidth: "960px",
          aspectRatio: "16/9",
          borderRadius: "16px",
          overflow: "hidden",
          position: "relative",
          boxShadow: "0 40px 100px rgba(0,0,0,0.6)",
        }}
      >
        {/* Background */}
        <img
          src={backgroundImageUrl}
          alt="background"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: "brightness(0.75) saturate(1.2)",
          }}
        />

        {/* Character image (center) */}
        <img
          src={characterImageUrl}
          alt="character"
          style={{
            position: "absolute",
            bottom: "52px",
            left: "50%",
            transform: "translateX(-50%)",
            height: "80%",
            objectFit: "contain",
            filter: "drop-shadow(0 8px 32px rgba(0,0,0,0.5))",
            zIndex: 2,
          }}
        />

        {/* Left sidebar - social */}
        <div
          style={{
            position: "absolute",
            left: "12px",
            top: "50%",
            transform: "translateY(-50%)",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            zIndex: 10,
          }}
        >
          {/* Search */}
          <button
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              ...glassDarkStyle,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: textLight,
              fontSize: 14,
              border: "none",
              cursor: "pointer",
              marginBottom: "4px",
            }}
          >
            🔍
          </button>
          {socialIcons.map((s) => (
            <button
              key={s.label}
              title={s.label}
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: s.bgColor ?? "#333",
                border: `1px solid ${glassBorder}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                transition: "transform 0.15s",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLElement).style.transform = "scale(1.15)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.transform = "scale(1)")
              }
            >
              {s.icon}
            </button>
          ))}
        </div>

        {/* Top-left: Clock + Calendar */}
        <div
          style={{
            position: "absolute",
            top: "14px",
            left: "60px",
            zIndex: 10,
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          {/* Clock */}
          <div
            style={{
              ...glassDarkStyle,
              borderRadius: "14px",
              padding: "10px 18px",
            }}
          >
            <div
              style={{
                fontFamily: clockFont,
                fontSize: "38px",
                fontWeight: 700,
                color: textLight,
                lineHeight: 1,
                letterSpacing: "2px",
              }}
            >
              {hours}:{minutes}
            </div>
            <div
              style={{
                fontSize: "11px",
                color: textLight,
                opacity: 0.7,
                marginTop: "2px",
              }}
            >
              {dayName} {String(month + 1).padStart(2, "0")}/{dayNum}
            </div>
          </div>

          {/* Calendar */}
          <div
            style={{
              ...glassDarkStyle,
              borderRadius: "14px",
              padding: "10px 14px",
              minWidth: "160px",
            }}
          >
            <div
              style={{
                fontSize: "13px",
                fontWeight: 700,
                color: textLight,
                marginBottom: "6px",
                textAlign: "center",
              }}
            >
              {monthName}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                gap: "2px",
                textAlign: "center",
              }}
            >
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                <div
                  key={i}
                  style={{ fontSize: "9px", color: textLight, opacity: 0.5 }}
                >
                  {d}
                </div>
              ))}
              {calDays.map((d, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: "10px",
                    color: textLight,
                    opacity: d === null ? 0 : d === dayNum ? 1 : 0.7,
                    fontWeight: d === dayNum ? 700 : 400,
                    background:
                      d === dayNum ? accentColor : "transparent",
                    borderRadius: "4px",
                    padding: "1px 0",
                  }}
                >
                  {d ?? ""}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top-right: User card */}
        <div
          style={{
            position: "absolute",
            top: "14px",
            right: "14px",
            zIndex: 10,
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            width: "200px",
          }}
        >
          {/* User info bar */}
          <div
            style={{
              ...glass,
              borderRadius: "14px",
              padding: "8px 12px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: accentColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                color: "#fff",
                fontWeight: 700,
              }}
            >
              ⊛
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: textLight,
                  lineHeight: 1,
                }}
              >
                {username}
              </div>
            </div>
            <div
              style={{
                background: "#fbbf24",
                color: "#000",
                fontSize: "9px",
                fontWeight: 700,
                padding: "2px 5px",
                borderRadius: "4px",
              }}
            >
              7
            </div>
          </div>

          {/* Character name */}
          <div
            style={{
              ...glass,
              borderRadius: "14px",
              padding: "10px 14px",
            }}
          >
            <div style={{ fontSize: "11px", color: textLight, opacity: 0.6 }}>
              {greeting}
            </div>
            <div
              style={{
                fontSize: "16px",
                fontWeight: 700,
                color: textLight,
                marginTop: "2px",
              }}
            >
              {characterName}
            </div>
            {characterSubtitle && (
              <div
                style={{ fontSize: "10px", color: textLight, opacity: 0.5 }}
              >
                {characterSubtitle}
              </div>
            )}

            {/* Character cards */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "6px",
                marginTop: "10px",
              }}
            >
              {characterCards.map((card, i) => (
                <div
                  key={i}
                  style={{
                    borderRadius: "10px",
                    overflow: "hidden",
                    background: card.bgColor ?? "#f0f0f0",
                    aspectRatio: "1",
                  }}
                >
                  <img
                    src={card.imageUrl}
                    alt={`card-${i}`}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Music player */}
          <div
            style={{
              ...glass,
              borderRadius: "14px",
              padding: "8px 12px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            {currentTrack.coverUrl ? (
              <img
                src={currentTrack.coverUrl}
                alt="cover"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "6px",
                  objectFit: "cover",
                }}
              />
            ) : (
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "6px",
                  background: accentColor,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  color: "#fff",
                }}
              >
                ♫
              </div>
            )}
            <div style={{ flex: 1, overflow: "hidden" }}>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: textLight,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {currentTrack.title}
              </div>
              {currentTrack.artist && (
                <div
                  style={{
                    fontSize: "9px",
                    color: textLight,
                    opacity: 0.5,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {currentTrack.artist}
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: "4px", color: textLight, opacity: 0.7 }}>
              <button
                style={{
                  background: "none",
                  border: "none",
                  color: "inherit",
                  cursor: "pointer",
                  fontSize: 10,
                  padding: "0 2px",
                }}
              >
                ⊏
              </button>
              <button
                style={{
                  background: "none",
                  border: "none",
                  color: "inherit",
                  cursor: "pointer",
                  fontSize: 10,
                  padding: "0 2px",
                }}
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? "⏸" : "▶"}
              </button>
              <button
                style={{
                  background: "none",
                  border: "none",
                  color: "inherit",
                  cursor: "pointer",
                  fontSize: 10,
                  padding: "0 2px",
                }}
              >
                ⊐
              </button>
              <button
                style={{
                  background: "none",
                  border: "none",
                  color: "inherit",
                  cursor: "pointer",
                  fontSize: 10,
                  padding: "0 2px",
                }}
              >
                ♥
              </button>
            </div>
          </div>
        </div>

        {/* Taskbar */}
        <div
          style={{
            position: "absolute",
            bottom: "10px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 10,
            ...glassDarkStyle,
            borderRadius: "16px",
            padding: "6px 14px",
            display: "flex",
            gap: "6px",
            alignItems: "center",
          }}
        >
          {taskbarApps.map((app) => (
            <button
              key={app.label}
              title={app.label}
              style={{
                width: 36,
                height: 36,
                borderRadius: "10px",
                background: app.color,
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 700,
                color: "#fff",
                transition: "transform 0.15s",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLElement).style.transform =
                  "translateY(-4px) scale(1.1)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.transform = "none")
              }
            >
              {app.icon}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
