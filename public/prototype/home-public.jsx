import { useState, useMemo, useRef, useEffect, useCallback } from "react";

const SESSIONS = [
  { id: 1, name: "DH trail rework", group: "Wed crew", groupCode: "wed", dateLabel: "Wed 26 Mar", time: "9:30am", spots: 4, total: 12, lead: "Mike R.", desc: "The winter rain has done a number on the DH trail. The lip on the second berm is completely washed out and the drainage channel below it is blocked with debris. We need to rebuild the berm lip, clear and re-dig the drainage, and cut back the overhanging branches on the top section that are pushing riders into the ruts.", plan: "9:30 meet at top car park. Walk up together to the DH trail. Split into two teams — one on the berm, one on drainage. Break at 11:30. Aim to finish by 1pm.", dayOffset: 2, tags: ["berm", "DH trail", "drainage"] },
  { id: 2, name: "XC loop maintenance", group: "Sat crew", groupCode: "sat", dateLabel: "Sat 29 Mar", time: "9:00am", spots: 6, total: 12, lead: "Rich T.", desc: "General maintenance day on the XC loop. The surface has broken up in a few places after the wet winter, and there's brush encroaching on the singletrack near the lake section. Straightforward work, good for first-timers.", plan: "9:00 meet at bottom car park. Tools and gloves provided. We'll work our way around the loop clockwise. Lunch break at midday, optional group ride at 2pm.", dayOffset: 5, tags: ["XC loop", "surface"] },
  { id: 3, name: "Jump line build", group: "Wed crew", groupCode: "wed", dateLabel: "Wed 2 Apr", time: "9:30am", spots: 10, total: 12, lead: "Mike R.", desc: "We're building a new tabletop on the jump line. The shape is already marked out and the base layer is down — we need hands to shift dirt, pack it down, and shape the transitions. This is the fun stuff. If you've ever wanted to build a jump, this is your session.", plan: "", dayOffset: 9, tags: ["jump line", "tabletop"] },
  { id: 4, name: "Car park litter pick", group: "Sat crew", groupCode: "sat", dateLabel: "Sat 5 Apr", time: "10:00am", spots: 15, total: 20, lead: "Jo S.", desc: "Spring clean around the main car park and trail heads. It's amazing what accumulates over winter — bottles, wrappers, the odd bike tyre. Families very welcome, we'll have bags and litter pickers for all sizes. Usually done in a couple of hours.", plan: "", dayOffset: 12, tags: ["litter pick", "car park"] },
  { id: 5, name: "Friday night ride dig", group: "FNR crew", groupCode: "fnr", dateLabel: "Fri 4 Apr", time: "5:30pm", spots: 8, total: 10, lead: "Dan M.", desc: "Quick dig session before the Friday night ride. We're fixing the ruts at the top of the enduro descent and patching a couple of holes on the B-line. An hour of graft then we ride. Bring your bike and lights.", plan: "", dayOffset: 11, tags: ["enduro", "DH trail"] },
  { id: 6, name: "Grant applications", group: "Home helpers", groupCode: "home", dateLabel: "Flexible", time: "From home", spots: 3, total: 5, lead: "Sarah K.", desc: "Help draft the lottery fund application. We need people who are good with words and can pull together a compelling case for funding. Previous grant experience helpful but not essential — we'll give you the data and the story, you help us tell it well.", plan: "", dayOffset: null, tags: ["grants", "admin"] },
  { id: 7, name: "Red run drainage", group: "Sat crew", groupCode: "sat", dateLabel: "Sat 12 Apr", time: "9:00am", spots: 8, total: 12, lead: "Rich T.", desc: "The red run has been holding water badly at the bottom of the first pitch. We need to install rock armour on the fall line and dig proper drainage channels to get the water off the trail and into the woods. Heavy work but satisfying — you'll see the difference immediately.", plan: "9:00 start. Walk up with tools. Rock armour team and drainage team split. We'll need strong backs for this one.", dayOffset: 19, tags: ["red run", "drainage", "rock armour"] },
  { id: 8, name: "Skills area signage", group: "Wed crew", groupCode: "wed", dateLabel: "Wed 9 Apr", time: "9:30am", spots: 6, total: 8, lead: "Mike R.", desc: "Installing new wayfinding signs at the skills area. The old ones have rotted through and new riders are getting lost between the pump track and the drop zone. Lighter work than usual — drilling, bolting, and a bit of strimming around the posts.", plan: "", dayOffset: 16, tags: ["skills area", "signage"] },
  { id: 9, name: "School group intro", group: "School crew", groupCode: "school", dateLabel: "Thu 3 Apr", time: "10:00am", spots: 0, total: 25, lead: "Jo S.", desc: "Introductory session for local school groups. Supervised, gentle tasks.", dayOffset: 10, tags: ["schools", "intro"], plan: "" },
  { id: 10, name: "Sponsor outreach", group: "Home helpers", groupCode: "home", dateLabel: "Flexible", time: "From home", spots: 4, total: 6, lead: "Sarah K.", desc: "Reaching out to local businesses for sponsorship. Email and phone work from home.", dayOffset: null, tags: ["sponsors", "fundraise"], plan: "" },
  { id: 11, name: "Corporate team day", group: "Corp crew", groupCode: "corp", dateLabel: "Thu 10 Apr", time: "9:00am", spots: 20, total: 30, lead: "Jo S.", desc: "Full day team building session. Trail work in the morning — clearing, surface repair, maybe some berm shaping if the team's up for it. Guided ride in the afternoon on trails your team helped build that morning. Lunch provided.", plan: "9:00 arrival and briefing. 9:30–12:30 trail work. 12:30 lunch. 1:30–3:30 guided ride. 4:00 debrief and photos.", dayOffset: 17, tags: ["corporate", "team building"] },
  { id: 12, name: "Enduro trail fix", group: "FNR crew", groupCode: "fnr", dateLabel: "Fri 11 Apr", time: "5:30pm", spots: 6, total: 10, lead: "Dan M.", desc: "The enduro descent is getting chewed up. Ruts are deep enough to catch a pedal now. We need to fill, pack, and reshape the worst sections before someone gets hurt. Bring your bike — we ride after.", plan: "", dayOffset: 18, tags: ["enduro", "ruts"] },
];

const GROUP_INFO = {
  "Wed crew":     { code: "wed",    color: "#3B6D11", bg: "#EAF3DE", text: "#27500A", about: "The Wednesday crew are the midweek regulars. We meet every Wednesday morning at the top car park, 9:30 sharp. Tools down by 1pm. No experience needed — we'll show you the ropes. Bring boots, clothes you don't mind getting muddy, and a water bottle. Gloves and tools provided." },
  "Sat crew":     { code: "sat",    color: "#185FA5", bg: "#E6F1FB", text: "#0C447C", about: "The Saturday crew runs every other weekend. Bigger jobs, more hands, and usually followed by a group ride in the afternoon. Great for families — kids welcome with a signed consent form. We tackle the larger trail projects that need a full day's effort." },
  "FNR crew":     { code: "fnr",    color: "#854F0B", bg: "#FAEEDA", text: "#633806", about: "Friday Night Ride crew. We do a quick dig session from 5:30pm before the weekly Friday night enduro ride. Fast, focused trail fixes — usually an hour of graft then straight onto the bikes. If you ride the enduro trails, this is your chance to give back to them." },
  "School crew":  { code: "school", color: "#0F6E56", bg: "#E1F5EE", text: "#085041", about: "Supervised sessions designed for local school groups. Gentle tasks, fully risk-assessed, with trained leaders. A great way to get young people outdoors and connected to their local trails. Schools book through the office." },
  "Corp crew":    { code: "corp",   color: "#534AB7", bg: "#EEEDFE", text: "#3C3489", about: "Corporate team days on the trails. Full day sessions with trail work in the morning and a guided ride in the afternoon. We handle the logistics, risk assessments, and tools — you just bring your team. Great for CSR days." },
  "Home helpers": { code: "home",   color: "#5F5E5A", bg: "#F1EFE8", text: "#444441", about: "Help from anywhere, anytime. Grant applications, social media, accounts, planning — the behind-the-scenes work that keeps everything running. Two hours a month from your sofa makes a huge difference to the trails." },
};

const GROUP_NAMES = Object.keys(GROUP_INFO);

const ALL_PHOTOS = [
  { id: 1, bg: "linear-gradient(135deg, #C0DD97, #639922)", label: "Berm reshape, Feb", group: "Wed crew", ratio: "4/3" },
  { id: 2, bg: "linear-gradient(135deg, #9FE1CB, #1D9E75)", label: "Trail clearing", group: "Sat crew", ratio: "1/1" },
  { id: 3, bg: "linear-gradient(135deg, #85B7EB, #378ADD)", label: "Drainage work", group: "Wed crew", ratio: "3/4" },
  { id: 4, bg: "linear-gradient(135deg, #F0997B, #D85A30)", label: "Jump line build", group: "FNR crew", ratio: "4/3" },
  { id: 5, bg: "linear-gradient(135deg, #FAC775, #BA7517)", label: "Charity ride", group: "Sat crew", ratio: "4/3" },
  { id: 6, bg: "linear-gradient(135deg, #97C459, #3B6D11)", label: "Rock armour", group: "Wed crew", ratio: "1/1" },
  { id: 7, bg: "linear-gradient(135deg, #5DCAA5, #0F6E56)", label: "Litter pick", group: "Sat crew", ratio: "3/4" },
  { id: 8, bg: "linear-gradient(135deg, #AFA9EC, #534AB7)", label: "Team day", group: "Corp crew", ratio: "4/3" },
  { id: 9, bg: "linear-gradient(135deg, #C0DD97, #97C459)", label: "New tabletop", group: "Wed crew", ratio: "1/1" },
  { id: 10, bg: "linear-gradient(135deg, #F5C4B3, #D85A30)", label: "Enduro fix", group: "FNR crew", ratio: "3/4" },
  { id: 11, bg: "linear-gradient(135deg, #9FE1CB, #5DCAA5)", label: "Spring clean", group: "Sat crew", ratio: "4/3" },
  { id: 12, bg: "linear-gradient(135deg, #85B7EB, #185FA5)", label: "Skills area", group: "Wed crew", ratio: "4/3" },
];

function PhotoStrip({ photos, onSelectGroup }) {
  return (
    <div style={{
      display: "flex", gap: 3, overflowX: "auto", paddingBottom: 4,
      scrollbarWidth: "none", WebkitOverflowScrolling: "touch",
      scrollSnapType: "x mandatory",
    }}>
      {photos.map(photo => {
        const gInfo = GROUP_INFO[photo.group] || { color: "#888", bg: "#f0f0f0", text: "#444" };
        const height = 220;
        const ratioMap = { "4/3": 4/3, "1/1": 1, "3/4": 3/4 };
        const r = ratioMap[photo.ratio] || 1;
        const width = Math.round(height * r);
        return (
          <div
            key={photo.id}
            onClick={() => onSelectGroup(photo.group)}
            style={{
              width,
              height,
              flexShrink: 0, scrollSnapAlign: "start",
              background: photo.bg, position: "relative", overflow: "hidden",
              cursor: "pointer",
            }}
          >
            {/* Label bottom left */}
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              background: "linear-gradient(transparent, rgba(0,0,0,0.5))",
              padding: "20px 10px 8px",
            }}>
              <span style={{ fontSize: 12, color: "#fff" }}>{photo.label}</span>
            </div>
            {/* Group lozenge bottom right */}
            <div style={{
              position: "absolute", bottom: 8, right: 8,
              fontSize: 10, fontWeight: 500, padding: "4px 10px", borderRadius: 6,
              background: "rgba(255,255,255,0.9)", color: gInfo.text,
            }}>{photo.group}</div>
          </div>
        );
      })}
    </div>
  );
}

function GroupStrip({ selectedGroup, onSelect }) {
  return (
    <div style={{
      display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4,
      scrollbarWidth: "none", WebkitOverflowScrolling: "touch",
    }}>
      <button onClick={() => onSelect(null)} style={{
        flexShrink: 0, padding: "8px 18px", borderRadius: 20,
        fontSize: 13, fontFamily: "inherit", cursor: "pointer",
        border: !selectedGroup ? "1.5px solid #444" : "0.5px solid #d5d4cf",
        background: !selectedGroup ? "#2C2C2A" : "transparent",
        color: !selectedGroup ? "#fff" : "#73726c",
        fontWeight: !selectedGroup ? 500 : 400, transition: "all 0.15s",
      }}>All</button>

      {GROUP_NAMES.map(name => {
        const info = GROUP_INFO[name];
        const isSel = selectedGroup === name;
        return (
          <button key={name} onClick={() => onSelect(isSel ? null : name)} style={{
            flexShrink: 0, padding: "8px 16px", borderRadius: 20,
            fontSize: 13, fontFamily: "inherit", cursor: "pointer",
            border: isSel ? `1.5px solid ${info.color}` : "0.5px solid #d5d4cf",
            background: isSel ? info.bg : "transparent",
            color: isSel ? info.text : "#73726c",
            fontWeight: isSel ? 500 : 400, transition: "all 0.15s", whiteSpace: "nowrap",
          }}>{name}</button>
        );
      })}
    </div>
  );
}

function DateStrip({ sessions, selectedDay, onSelectDay }) {
  const scrollRef = useRef(null);

  const items = useMemo(() => {
    const sessionDays = new Map();
    sessions.forEach(s => {
      if (s.dayOffset === null) return;
      if (!sessionDays.has(s.dayOffset)) sessionDays.set(s.dayOffset, []);
      sessionDays.get(s.dayOffset).push(s);
    });
    const sorted = [...sessionDays.entries()].sort((a, b) => a[0] - b[0]);
    const result = [];
    let lastMonth = null;
    sorted.forEach(([dayOffset, daySessions]) => {
      const dayNum = 24 + dayOffset;
      let month, display;
      if (dayNum <= 31) { month = "Mar"; display = dayNum; }
      else if (dayNum <= 61) { month = "Apr"; display = dayNum - 31; }
      else { month = "May"; display = dayNum - 61; }
      const dow = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][dayOffset % 7];
      if (month !== lastMonth) { result.push({ type: "month", month }); lastMonth = month; }
      result.push({ type: "day", dayOffset, display, dow, sessions: daySessions });
    });
    return result;
  }, [sessions]);

  useEffect(() => {
    if (!scrollRef.current) return;
    const target = scrollRef.current.querySelector("[data-selected]") || scrollRef.current.querySelector("[data-day]");
    if (target) target.scrollIntoView({ inline: "center", block: "nearest" });
  }, [selectedDay, items]);

  return (
    <div ref={scrollRef} style={{
      display: "flex", gap: 4, overflowX: "auto", paddingBottom: 6,
      scrollbarWidth: "none", WebkitOverflowScrolling: "touch", alignItems: "flex-end",
    }}>
      {items.map((item, idx) => {
        if (item.type === "month") {
          return (
            <div key={`m-${item.month}-${idx}`} style={{
              minWidth: 36, flexShrink: 0, padding: "8px 4px",
              fontSize: 12, fontWeight: 500, color: "#73726c",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>{item.month}</div>
          );
        }
        const isSelected = selectedDay === item.dayOffset;
        const count = item.sessions.length;
        return (
          <div
            key={`d-${item.dayOffset}`}
            data-day=""
            {...(isSelected ? { "data-selected": "" } : {})}
            onClick={() => onSelectDay(item.dayOffset)}
            style={{
              minWidth: 54, textAlign: "center", padding: "8px 6px 10px",
              borderRadius: 10, flexShrink: 0, cursor: "pointer",
              border: isSelected ? "1.5px solid #534AB7" : "0.5px solid #d5d4cf",
              background: isSelected ? "#EEEDFE" : "transparent",
              transition: "all 0.15s",
            }}
          >
            <div style={{ fontSize: 10, color: isSelected ? "#3C3489" : "#a0a09a", marginBottom: 2 }}>{item.dow}</div>
            <div style={{ fontSize: 17, fontWeight: 500, color: isSelected ? "#3C3489" : "inherit" }}>{item.display}</div>
            {count > 1 && <div style={{ fontSize: 9, color: isSelected ? "#534AB7" : "#a0a09a", marginTop: 3 }}>{count}</div>}
          </div>
        );
      })}
    </div>
  );
}

function SessionCard({ session, isActive }) {
  const [open, setOpen] = useState(isActive);
  const [textExpanded, setTextExpanded] = useState(false);
  const gInfo = GROUP_INFO[session.group] || { color: "#888", bg: "#f0f0f0", text: "#444", about: "" };

  useEffect(() => { setOpen(isActive); setTextExpanded(false); }, [isActive]);

  // Build combined text with section headers
  const textParts = [];
  if (gInfo.about) textParts.push({ heading: "About the group", body: gInfo.about });
  if (session.plan) textParts.push({ heading: "Plan for the day", body: session.plan });
  textParts.push({ heading: null, body: session.desc });

  return (
    <div style={{
      minWidth: "100%", maxWidth: "100%", flexShrink: 0, scrollSnapAlign: "center",
      border: open ? `2px solid ${gInfo.color}` : "0.5px solid #d5d4cf",
      borderRadius: 12, overflow: "hidden", transition: "border-color 0.2s",
      wordWrap: "break-word", overflowWrap: "break-word",
    }}>
      {/* Header — always visible */}
      <div onClick={() => setOpen(!open)} style={{ padding: "14px 16px", cursor: "pointer" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 4 }}>
          <div style={{ fontSize: 16, fontWeight: 500 }}>{session.name}</div>
          <span style={{
            fontSize: 10, padding: "3px 10px", borderRadius: 10, fontWeight: 500,
            color: gInfo.text, background: gInfo.bg, whiteSpace: "nowrap",
          }}>{session.group}</span>
        </div>
        <div style={{ fontSize: 13, color: "#73726c", lineHeight: 1.5 }}>
          {session.dateLabel}, {session.time}
        </div>
      </div>

      {/* Expanded content */}
      {open && (
        <div style={{ padding: "0 16px 16px" }}>

          {/* Combined text block */}
          <div style={{
            overflow: "hidden", position: "relative",
            maxHeight: textExpanded ? "none" : 130,
          }}>
            {textParts.map((part, i) => (
              <div key={i} style={{ marginBottom: i < textParts.length - 1 ? 12 : 0 }}>
                {part.heading && (
                  <div style={{ fontSize: 11, fontWeight: 500, color: "#a0a09a", marginBottom: 3 }}>{part.heading}</div>
                )}
                <div style={{ fontSize: 13, color: "#73726c", lineHeight: 1.6 }}>{part.body}</div>
              </div>
            ))}
            {!textExpanded && (
              <div style={{
                position: "absolute", bottom: 0, left: 0, right: 0, height: 32,
                background: "linear-gradient(transparent, white)",
                pointerEvents: "none",
              }} />
            )}
          </div>
          {!textExpanded && (
            <button onClick={(e) => { e.stopPropagation(); setTextExpanded(true); }} style={{
              fontSize: 12, color: "#185FA5", background: "none", border: "none",
              cursor: "pointer", fontFamily: "inherit", padding: "4px 0 0",
            }}>more</button>
          )}

          {/* Tags */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, margin: "12px 0 14px" }}>
            {session.tags.map(t => (
              <span key={t} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 10, border: "0.5px solid #d5d4cf", color: "#a0a09a" }}>{t}</span>
            ))}
          </div>

          {/* CTA */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, color: "#9a7b1a", fontWeight: 500 }}>{session.spots} of {session.total} spots left</span>
            <button style={{
              background: gInfo.color, color: "#fff", fontSize: 14, fontWeight: 500,
              padding: "10px 28px", borderRadius: 8, border: "none", cursor: "pointer", fontFamily: "inherit",
            }}>Count me in</button>
          </div>
        </div>
      )}
    </div>
  );
}

function SwipeableCards({ sessions, activeIndex, onSwipe }) {
  const containerRef = useRef(null);
  const touchStartRef = useRef(null);
  const touchDeltaRef = useRef(0);

  const handleTouchStart = useCallback((e) => {
    touchStartRef.current = e.touches[0].clientX;
    touchDeltaRef.current = 0;
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (touchStartRef.current === null) return;
    touchDeltaRef.current = e.touches[0].clientX - touchStartRef.current;
  }, []);

  const handleTouchEnd = useCallback(() => {
    const delta = touchDeltaRef.current;
    const threshold = 50;
    if (delta < -threshold && activeIndex < sessions.length - 1) {
      onSwipe(activeIndex + 1);
    } else if (delta > threshold && activeIndex > 0) {
      onSwipe(activeIndex - 1);
    }
    touchStartRef.current = null;
    touchDeltaRef.current = 0;
  }, [activeIndex, sessions.length, onSwipe]);

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ position: "relative", overflow: "hidden" }}
    >
      <div style={{
        display: "flex", transition: "transform 0.3s ease",
        transform: `translateX(-${activeIndex * 100}%)`,
      }}>
        {sessions.map((s, i) => (
          <div key={s.id} style={{ minWidth: "100%", maxWidth: "100%", flexShrink: 0, padding: "0 2px", overflow: "hidden" }}>
            <SessionCard session={s} isActive={i === activeIndex} />
          </div>
        ))}
      </div>

      {/* Dot indicators */}
      {sessions.length > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 10 }}>
          {sessions.map((s, i) => (
            <div
              key={s.id}
              onClick={() => onSwipe(i)}
              style={{
                width: i === activeIndex ? 20 : 6, height: 6, borderRadius: 3,
                background: i === activeIndex ? "#534AB7" : "#d5d4cf",
                cursor: "pointer", transition: "all 0.2s",
              }}
            />
          ))}
        </div>
      )}

      {/* Arrow buttons for non-touch */}
      {sessions.length > 1 && activeIndex > 0 && (
        <button onClick={() => onSwipe(activeIndex - 1)} style={{
          position: "absolute", left: 4, top: "40%",
          width: 28, height: 28, borderRadius: "50%",
          background: "rgba(255,255,255,0.9)", border: "0.5px solid #d5d4cf",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, color: "#73726c", boxShadow: "none",
        }}><span style={{fontSize: 12}}>&#8249;</span></button>
      )}
      {sessions.length > 1 && activeIndex < sessions.length - 1 && (
        <button onClick={() => onSwipe(activeIndex + 1)} style={{
          position: "absolute", right: 4, top: "40%",
          width: 28, height: 28, borderRadius: "50%",
          background: "rgba(255,255,255,0.9)", border: "0.5px solid #d5d4cf",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, color: "#73726c", boxShadow: "none",
        }}><span style={{fontSize: 12}}>&#8250;</span></button>
      )}
    </div>
  );
}

export default function VolunteerView() {
  const [selGroup, setSelGroup] = useState(null);
  const [selDay, setSelDay] = useState(null);
  const [cardIndex, setCardIndex] = useState(0);

  const available = useMemo(() => SESSIONS.filter(s => s.spots > 0), []);

  const groupFiltered = useMemo(() => {
    if (!selGroup) return available;
    return available.filter(s => s.group === selGroup);
  }, [selGroup, available]);

  // All sessions sorted by date for swiping
  const allDated = useMemo(() => {
    return groupFiltered.filter(s => s.dayOffset !== null).sort((a, b) => a.dayOffset - b.dayOffset);
  }, [groupFiltered]);

  const firstDay = allDated.length > 0 ? allDated[0].dayOffset : null;
  const activeDay = selDay !== null ? selDay : firstDay;

  // Current card index maps to session in allDated
  const currentSession = allDated[cardIndex] || null;

  // Sync date strip to card swipe
  useEffect(() => {
    if (currentSession && currentSession.dayOffset !== activeDay) {
      setSelDay(currentSession.dayOffset);
    }
  }, [cardIndex, currentSession]);

  // When group or day changes externally, find the right card index
  useEffect(() => {
    if (activeDay !== null) {
      const idx = allDated.findIndex(s => s.dayOffset === activeDay);
      if (idx >= 0 && idx !== cardIndex) setCardIndex(idx);
    }
  }, [activeDay, allDated]);

  const photos = useMemo(() => {
    if (!selGroup) return ALL_PHOTOS;
    return ALL_PHOTOS.filter(p => p.group === selGroup);
  }, [selGroup]);

  const selectGroup = (g) => {
    setSelGroup(g);
    setSelDay(null);
    setCardIndex(0);
  };

  const selectDay = (d) => {
    setSelDay(d);
    const idx = allDated.findIndex(s => s.dayOffset === d);
    if (idx >= 0) setCardIndex(idx);
  };

  const handleSwipe = (newIndex) => {
    setCardIndex(newIndex);
  };

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", maxWidth: 680, margin: "0 auto" }}>

      {/* HEADER */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "12px 16px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, background: "#3B6D11",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 500, color: "#fff",
          }}>DT</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>Dean Trail Volunteers</div>
            <div style={{ fontSize: 11, color: "#a0a09a" }}>tracker.dtv.org.uk</div>
          </div>
        </div>
        <button style={{
          fontSize: 12, padding: "6px 14px", borderRadius: 8,
          border: "0.5px solid #d5d4cf", background: "transparent",
          color: "#73726c", cursor: "pointer", fontFamily: "inherit",
        }}>Share</button>
      </div>

      {/* PHOTOS */}
      <div style={{ marginBottom: 14 }}>
        <PhotoStrip
          photos={photos.length > 0 ? photos : ALL_PHOTOS}
          onSelectGroup={selectGroup}
        />
      </div>

      {/* GROUPS */}
      <div style={{ marginBottom: 14 }}>
        <GroupStrip selectedGroup={selGroup} onSelect={selectGroup} />
      </div>

      {/* DATES */}
      <div style={{ marginBottom: 12 }}>
        <DateStrip
          sessions={groupFiltered}
          selectedDay={activeDay}
          onSelectDay={selectDay}
        />
      </div>

      {/* SWIPEABLE SESSION CARDS */}
      {allDated.length > 0 ? (
        <SwipeableCards
          sessions={allDated}
          activeIndex={cardIndex}
          onSwipe={handleSwipe}
        />
      ) : (
        <div style={{ textAlign: "center", padding: 24, color: "#73726c", fontSize: 13 }}>
          No upcoming sessions
        </div>
      )}

      {/* CONTACT CTA */}
      <div style={{
        marginTop: 20, padding: "16px 20px", borderRadius: 12,
        border: "0.5px solid #d5d4cf", textAlign: "center",
      }}>
        <div style={{ fontSize: 13, color: "#73726c", lineHeight: 1.5 }}>
          Looking for something more flexible, adhoc with a bigger group or perhaps a bigger role?
        </div>
        <a href="mailto:admin@deantrailvolunteers.org" style={{
          fontSize: 14, fontWeight: 500, color: "#185FA5",
          marginTop: 6, display: "inline-block", textDecoration: "none",
        }}>admin@deantrailvolunteers.org</a>
      </div>

      {/* FOOTER */}
      <div style={{
        marginTop: 24, padding: "16px", textAlign: "center",
        borderTop: "0.5px solid #d5d4cf",
      }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Dean Trail Volunteers</div>
        <div style={{ fontSize: 11, color: "#a0a09a", lineHeight: 1.6 }}>
          Forest of Dean, Gloucestershire
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 10 }}>
          <a href="https://instagram.com/deantrailvolunteers" style={{ fontSize: 11, color: "#73726c", textDecoration: "none" }}>Instagram</a>
          <a href="https://facebook.com/deantrailvolunteers" style={{ fontSize: 11, color: "#73726c", textDecoration: "none" }}>Facebook</a>
          <a href="mailto:admin@deantrailvolunteers.org" style={{ fontSize: 11, color: "#73726c", textDecoration: "none" }}>Email</a>
        </div>
        <div style={{ fontSize: 10, color: "#c8c7c3", marginTop: 10 }}>tracker.dtv.org.uk</div>
      </div>
    </div>
  );
}
