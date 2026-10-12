# Protheka: Interactive World Map

Protheka is an explorable, hand-drawn fantasy map of ten kingdoms that feels alive: drifting clouds, a moving sea, birds and lit castles. It's the entry point to each kingdom's books.

**Live site:** https://map-red-three.vercel.app

This guide has two parts:

- **What visitors can do:** how the map works, in plain language.
- **For developers:** how the project is built and how to change it.

---

## Part 1: What visitors can do

### Opening the map
The site opens high above the world, under moving clouds, with the title and an **Explore the map** button. Pressing it dives down through the clouds to the map. That click also starts the background music, because browsers only allow sound after a visitor interacts.

### Moving around
| Action | Mouse / keyboard | Touch |
|---|---|---|
| Move the map | Click and drag | Swipe |
| Zoom between level I and II | Scroll wheel | Pinch |
| Jump to a level | Keys **1**, **2**, **3**, or the **I / II / III** marker on the right | Tap the marker |
| Search | **/** key, or the magnifier in the bottom bar | Magnifier |

The three zoom levels:

| Level | View |
|---|---|
| I | The whole map, flat |
| II | Closer, gently tilted |
| III | Closest, tilted and slightly turned |

The map has soft painted relief and a subtle 3D lift on mountains and forests, which shows when it tilts.

### Kingdoms
- **Hover** (desktop) over a kingdom:
  - it glows;
  - its name lifts and its title appears (for example *The Kingdom of Eternal Frost*);
  - the view leans in slightly.
- **Click / tap** a kingdom:
  - the map turns and leans so the kingdom sits beside a parchment page sliding in (from the side on desktop, from the bottom on phones);
  - the page shows **You discovered [kingdom]**, a picture, a short quote and **Enter Kingdom**.
- **Enter Kingdom:** the camera flies into the kingdom as the clouds part, then that kingdom's books page opens. **Back to map** returns to where you were.
- **Journey trail:** each newly discovered kingdom is joined to the previous one by a dotted ink route that draws itself on the map. The journey is remembered between visits.

The ten kingdoms are Pref, Kaynvu, Oshta, Galmoleth, Rach, Fouuer, Clouz, Milthar, Osiris and Prazh.

### Search
Type part of a kingdom's name or title. Use the arrow keys and **Enter**, or click a result. The camera flies there and the kingdom lights up for a few seconds.

### The bottom bar
| Item | What it does |
|---|---|
| **Continue reading** | Reopens the books of the last kingdom entered |
| **Heading ruler** | Slides as the map moves |
| **Compass** | Turns as the map is dragged and turned. Clicking it fans out **Library**, **Home** and **More**; Library and More open as parchment pages over the map (full screen on phones) |
| **Theme / sun-moon** | Switches between day and night. A bank of clouds rolls across the screen while the light changes through dusk or dawn. At night, candle-lit windows flicker in the castles and towns, and every page switches to a dark style |
| **Magnifier** | Opens search |
| **Speaker** | Turns the music on or off |

A small tips card in the bottom-right corner shows how to move, zoom and discover. It disappears once the visitor has done both, or when closed.

### A living world
- **Clouds:** drift at three heights and cast shadows. They shift with depth as you pan and zoom.
- **Sea:**
  - the water shimmers, with a soft glow along the coasts;
  - the two sea serpents swim and the small boats rock on the waves.
- **Birds:** every 18–35 seconds a small flock of ink-drawn birds crosses the map, with a shadow gliding over the land.

### Remembered between visits
Saved in the visitor's own browser:
- the last book opened (for Continue reading);
- day or night (the map opens in **night** mode by default);
- music on or off;
- the journey trail.

### Phones and accessibility
- **Phones:** work with touch (swipe, pinch, tap). Drawers become bottom sheets or full-screen pages. To keep zooming smooth on phones, they show the map with its painted relief but without the 3D lift.
- **Reduced motion:** visitors who prefer reduced motion get a calm version, with no moving clouds, birds, sea life or flicker. The flight into a kingdom and the day/night cloud sweep become simple fades.

### Placeholders, ready for content
- **Kingdom books page:** shows "Your books here" until the book content exists.
- **Library and More pages** (opened from the compass): only titles so far.
- **Kingdom artwork:** each discovery page currently shows a close-up of the map. A dedicated picture can be added per kingdom; see *Changing content* below.
- **Backend:** none yet. All text (names, titles, quotes) is built into the website itself, so anything added later that must stay private should come from a server.

---

## Part 2: For developers

### Stack
- [Next.js 16](https://nextjs.org) (App Router), React 19, TypeScript, Tailwind CSS v4.
- **three.js** for the 3D terrain (desktop only, loaded on demand).
- **Hand-written WebGL fragment shaders** for the clouds and the sea.

The app lives in the **`my-app/`** folder of the repository.

### Run, build, deploy
```bash
cd my-app
npm install
npm run dev     # http://localhost:3000
npm run lint
npm run build   # production build
npm run start   # serve the production build
```
Deployment is on **Vercel**: every push to `main` deploys automatically, with `my-app` as the project root.

### Project map (`my-app/app/`)
| File | Role |
|---|---|
| `page.tsx`, `layout.tsx` | The single page, fonts, default (night) theme |
| `map-viewer.tsx` | The heart of the app: camera (zoom levels, tilt, drag, pinch, hover lean, click focus, flights), app state (intro → map → drawer → books), theme, journey, search, music start |
| `terrain.tsx` | three.js terrain under the map, synced to the CSS camera; renders only while the camera moves |
| `clouds.tsx` | WebGL cloud layers (map, intro and day/night sweep) |
| `sea.tsx`, `sea-life.tsx`, `sealife-data.ts` | Animated sea shader; moving serpents and boats |
| `birds.tsx` | Occasional bird flocks |
| `kingdoms.tsx`, `kingdom-data.ts` | Kingdom hit areas, hover glows, and all kingdom data (names, titles, quotes, outlines) |
| `region-labels.tsx` | Floating kingdom names and glowing markers |
| `castle-lights.tsx`, `castle-lights-data.ts` | Night window lights |
| `journey.tsx` | The dotted journey trail |
| `intro.tsx` | Opening screen and dive |
| `kingdom-drawer.tsx`, `kingdom-books.tsx`, `page-drawer.tsx`, `parchment-drawer.tsx`, `parchment.tsx` | Discovery drawer, books page, Library/More pages and their shared parchment style |
| `map-navbar.tsx`, `map-search.tsx`, `magnifier.tsx`, `map-hints.tsx` | Bottom bar (ruler, compass, theme, music), search panel, tips card |
| `theme-sweep.tsx`, `sweep-timing.ts` | Day/night cloud transition |
| `use-music.ts` | Background music (preloading, fade in, mute) |
| `gpu-ticker.ts` | Shared frame scheduler for the WebGL layers |
| `globals.css` | Theme colours for day and night, animations |

Art and audio live in `my-app/public/` (`new-map.png`, `relief/`, `sea/`, `terrain/`, `kingdoms/`, `sealife/`, `clouds/`, `sound/`).

### Changing content
| To change | Edit |
|---|---|
| Kingdom names, titles, quotes | `app/kingdom-data.ts` (`name`, `subtitle`, `quote`) |
| Where the names and markers sit on the map | `LABELS` in `app/region-labels.tsx` (map pixels; the map is 1679 × 937) |
| Night window positions | `app/castle-lights-data.ts` |
| Intro text | `INTRO` in `app/intro.tsx` |
| Tips text | `app/map-hints.tsx` |
| Music | Replace `public/sound/bgmusic.mp3`. Volume: `VOLUME` in `app/use-music.ts`. If the new track has no silence at the start, set `LEAD_IN` to `0` |
| Colours (day and night) | The theme block at the top of `app/globals.css` |
| Zoom levels and camera feel | `LEVELS` and the timing constants at the top of `app/map-viewer.tsx` |
| Kingdom artwork | Add `public/kingdoms/art/<id>.jpg` (for example `kaynvu.jpg`); the discovery page uses it instead of the map close-up |

**Replacing the map image** (`public/new-map.png`): the relief shading, sea mask, kingdom glows and outlines, sea-life sprites and terrain height map were all generated from this exact image. A new or edited map needs those regenerated, or they won't line up.

### Why it's built this way (performance)
The map is a CSS 3D scene with WebGL layers. These choices keep it smooth, including on phones:

- **Camera moves run on the compositor.**
  - The map layer only transitions `transform`.
  - Labels ease their own transform instead of animating CSS variables.
  - Camera values are written only when they change.
- **The 3D terrain sleeps** between moves and gets the exact pose during drags, so idle frames cost nothing.
- **WebGL layers take turns drawing** through `gpu-ticker.ts`, at 30 fps for clouds and 20 fps for the sea.
- **On phones during camera moves:**
  - cloud and sea redraws and the small looping decorations pause;
  - the 3D lift is skipped;
  - the terrain renders at 1×.
- **First load is light:**
  - the drawers, search and day/night sweep load on demand (and are prefetched once the page is idle);
  - the WebGL sea and clouds start once the page is idle;
  - the music downloads after the visitor's first interaction.
- **Reduced motion** is respected throughout.

### Good to know
- All visible content ships in the page and can be read by anyone. Keep future private material (books, drafts) on a server.
- The GitHub repository is currently public, so the code and art can be downloaded from there.
- Chrome's battery saver caps animation at 30 fps on any site, so test smoothness on mains power.
