# OddysMedic

Clinical decision-practice prototype for a demo on November 8, 2026. React + Vite + Tailwind CSS project running inside Figma Make (package name: `figma-make-app`).

Read `PRODUCT.md` first for users, constraints, and principles. Its "Pendiente" section lists work deliberately left for after the demo. All numbers in the app are illustrative, and clinical content must never be presented as medically validated. The UI is in Spanish.

## Development Server

Inside Figma Make, a Vite development server is **already running** on `$PORT` (default 8443), so you don't need to start it there. Outside Figma Make, start it with `pnpm dev` (the pnpm version is pinned in `.mise.toml`).

- Preview URL: Inside Figma Make, the user can access the running app through the preview panel
- Hot reload: Changes to source files are reflected immediately. `vite.config.ts` ignores `.figma/`, so restart the server after editing `.figma/make/site.json`

## Project Structure

This is the canonical project structure. Start with task-relevant files below. Only follow imports or inspect other files when required, when a documented path is missing, or when the repository contradicts this guide.

- `src/main.tsx` - React entrypoint; imports `src/index.css` and mounts `src/App.tsx` into the `#root` element
- `src/App.tsx` - All screens, routing, and case data (stops, variants, candidate next cases, demo learners); the usual starting point for UI work
- `src/engine.ts` - Adaptive Elo engine with no UI: seed competencies, probability, answer update, status, variant choice, and next-case recommendation
- `src/MapaMundos.tsx` - The island maps: `MapaMundos` (worlds) and `MapaTerritorios` (territories of Medicina Interna), both built on one `MapaIslas`. An SVG island per item (isometric top and two darker sides, flat icon on top; `Isla` is also reused by the "Mundo actual" card), dashed routes from the available island with an ECG beat on the second one, HTML labels, and a light panel (white to #F4F3FB, dots at 6 %). Below 640 px it becomes a two-column grid of mini-islands with no routes. The entrance (staggered islands, routes drawn with `stroke-dashoffset`, a ±3 px float on the available island) plays once on mount; with `prefers-reduced-motion` or a hidden tab at mount it renders the final state. Hover/focus lifts the island 4 px; keyboard focus draws an indigo outline along its silhouette
- `src/data/mundos.ts` - `MUNDOS` and `TERRITORIOS` (id, nombre, estado, icono, pos, ruta) with one shared layout, plus the three route constants (`RUTA_MUNDOS`, `RUTA_MEDICINA_INTERNA`, `RUTA_ENDOCRINOLOGIA`)
- `src/history.ts` - Decision history: the example answers for Lucía and Marta, whose counts and final θ match the engine's seed, plus the metrics calculated from them. Each decision keeps its case, stop number and date, because the level chart and the recent cases read them. `formatDuration` is the only time format and `caseSeconds` the only case total (sum of stop times), so /inicio, /resultado and /progreso always agree
- `src/charts.tsx` - Every chart: stat rings, level line chart, confidence bars, outcome donut, and time bars (the time bars are a CSS grid, not Recharts). Recharts draws the axes and tooltips; each chart ships a hidden table for screen readers
- `src/icons.tsx` - Line icons, all decorative, plus one icon per competency
- `src/portraits.ts` - Portraits generated locally with DiceBear (Open Peeps, CC0), with a fixed seed and look per person
- `src/worstCase.ts` - Extreme data used only in development: `?data=worst` (long names and options) and `?data=empty`, `one`, or `many` (progress history)
- `src/index.css` - Global CSS entrypoint, Tailwind CSS v4 import, and the hand-written classes for every screen
- `index.html` - Vite HTML shell containing the font links and the `#root` element, and loading `src/main.tsx`
- `PRODUCT.md` - Product context and the "Pendiente" list
- `.figma/make/site.json` - Site title, language (`es`), description, and robots settings applied to the HTML shell
- `package.json` - Project dependencies and the Vite build, development, preview, and formatting scripts
- `vite.config.ts` - Vite configuration with React, Tailwind CSS v4, and Figma Make plugins plus the `@` alias for `src`
- `.mise.toml` - Toolchain versions for Node.js and pnpm
- `.claude/` - Impeccable skill, agents, and design-review hook. Impeccable's live mode is intentionally not enabled

## Routes

`App()` in `src/App.tsx` routes by checking `window.location.pathname`; there is no router library.

- `/` - Landing page
- `/inicio` - Student home. Top row: "Hola, Bruno" with "Sigue donde lo dejaste." on the left and the compact `MundoActual` card (Medicina Interna › Endocrinología, "N de M misiones" counted from the history, "Ver mapa" to `/explorar`) on the right. Below, a 7/5 grid: "Tu siguiente caso" and the recent cases, and "Tus competencias" in a white card. Offers Elena until her case is finished, then the recommended case, which is not playable yet ("Disponible muy pronto"). Competencies show σ(θ) large (a dash without 2 answers); recent cases show date, route, score, time, and competencies
- `/explorar` - The worlds map (World level), with no breadcrumbs because it is the first level. Medicina Interna is the only world you can open. Pediatría, Ginecología y Obstetricia and Emergencias are "Próximamente" (`aria-disabled`, "Disponible pronto" tooltip, no navigation). The "Explorar" tab is active on all three levels
- `/explorar/medicina-interna` - The territory map (Territory level), with `Migas`. Endocrinología is the only territory you can open; Cardiología, Infectología and Nefrología are "Próximamente"
- `/explorar/medicina-interna/endocrinologia` - The missions of a territory, with `Migas`: six missions with their public title (never the topic or diagnosis), state "Completado", "Recomendado para ti" (the engine's pick, highlighted in indigo) or "Disponible". Only Elena is playable; the rest carry a disabled "Disponible muy pronto" button, so there are no dead links

`Migas` (in `App.tsx`) is the only navigation between levels: a 36 px circular back button (aria-label "Volver a <nivel anterior>") and the path "Mundos › Medicina Interna › Endocrinología", with earlier levels as links and the current one in bold
- `/progreso` - Territory map built from the history, four stat rings, the "No sé" callout, level chart per competency, confidence bars, error cards with "Repasar", the system's decisions as a timeline, the competencies table, "Ver cómo calcula el sistema" toggle, and "Reiniciar demo" button
- `/caso/elena` - Patient card, "Empezar caso", and the floating demo-only "Probar como" pill
- `/caso/elena/jugar` - The three case stops, with shortcuts 1–4 and Enter while focus is inside the question. The side panel opens on "Historia" and resets on every stop; "Laboratorio" carries a dot until it is visited. A timer counts up (never down) and can be hidden (`elena-timer-hidden`). Redirects to `/caso/elena` if there is no plan
- `/caso/elena/resultado` - Case result (outcome donut, time against the estimate, before → after per competency, then stop details) and recommended next case. Redirects to `/caso/elena` unless all three stops are answered

## Demo State

State lives only in `sessionStorage`, so it does not carry over to a new browser session:

- `elena-plan` - `{ learnerId, variantId }`. "Empezar caso" sets it and removes `elena-answers` and `elena-closed`, and it stays fixed for the rest of the case
- `elena-answers` - One saved answer per stop, with the time it took (`time`) and when it was given (`at`)

Competencies and the decision history, including θ after each attempt, are recalculated on each screen by replaying `elena-answers` over the seed, never stored, so reopening a screen can't count an answer twice. If you change `seedCompetencies`, update `seededDecisions` so both still agree. Each attempt starts again from the seed. "Reiniciar demo" calls `sessionStorage.clear()` and reloads the page.

"No sé" counts as `r = 0` in the engine, but the interface shows it with its own neutral "?" mark, not as an error.

## Dependencies

- Runtime: React 19, React DOM 19, `recharts` for every chart, and `@dicebear/core` with `@dicebear/collection` (both on major version 9, which `collection` requires)
- Styling: Tailwind CSS v4 with the `@tailwindcss/vite` plugin
- Build tooling: Vite 8, TypeScript 5, and `@vitejs/plugin-react`
- Formatting: oxfmt

There is no test runner or linter. Check changes with `pnpm exec tsc --noEmit` and `pnpm build`, format only the files you changed with `pnpm exec oxfmt <files>`, then walk the flow in a browser.

## Despliegue

The app is a static site deployed on Vercel. There is no GitHub Action: Vercel is connected to the GitHub repository and deploys by itself on every push to `main` (other branches get a preview URL).

- `vercel.json` holds the whole configuration: framework `vite`, `pnpm install --frozen-lockfile`, `pnpm build`, and output folder `dist`. It also sets `ENABLE_EXPERIMENTAL_COREPACK=1` for the build so Vercel uses the exact pnpm from `packageManager` (`pnpm@10.34.3`, the same as `.mise.toml`). `engines.node` is `>=20`; the project was built on Node 22.
- Every route is rewritten to `/index.html` (the app routes by `window.location.pathname`, so reloading `/inicio`, `/progreso` or `/caso/elena/jugar` must not return a 404). `/assets/` is excluded from the rewrite so a missing hashed file is a real 404 and never a cached copy of the HTML.
- Headers: `/assets/*` is cached for a year as immutable (Vite hashes the file names); everything else, including `index.html`, is never cached.
- `.vercelignore` leaves out `.claude/`, `plans/`, screenshots and Figma Make's helper scripts. It keeps `.figma/make/site.json`, because `vite.config.ts` imports it at build time.
- The production bundle contains no development tools: `?data=worst|empty|one|many` and its selector are gated by `import.meta.env.DEV` and are removed from the build. "Probar como" and "Reiniciar demo" are part of the demo and stay. `robots.txt` and a `noindex` meta come from `.figma/make/site.json`, so the site is not indexed.
- Fonts come from Google Fonts at runtime, so the demo needs an internet connection to show the intended typography.

To check a build locally: `pnpm install --frozen-lockfile && pnpm exec tsc --noEmit && pnpm build && pnpm preview`.

## Styling

This project uses **Tailwind CSS v4** through the `@tailwindcss/vite` plugin configured in `vite.config.ts`. `src/index.css` imports Tailwind with `@import 'tailwindcss';`. The existing screens use hand-written classes with fixed hex colors from `src/index.css`, not Tailwind utility classes (`sr-only` is the exception), so follow that pattern when extending them. This scaffold does not need a Tailwind config file or PostCSS config.

Primary buttons are #2E2A78 with white text. Use aquamarine #43D6BE for buttons only on indigo backgrounds (the landing hero and the "Tu siguiente caso" cards), because elsewhere aquamarine means a correct answer. The lab shows raw values with their reference range, never "alta"/"baja", red or a range bar, so the student interprets.

Fonts load with `<link>` tags in `index.html` (`preconnect` plus `stylesheet`, with `display=swap`), **never with `@import` in CSS**. Request Bricolage Grotesque as `family=Bricolage+Grotesque:wght@700;800`; the earlier request with optical-size and width axes was rejected by Google Fonts. Font-family defaults stay in `src/index.css`, whose only `@import` is Tailwind.

The page background is warm paper (`--paper`, #FAF8F5). Every block of content is a white card (`.card`: 1 px #E3E1F0 border, radius 16, padding 24, shadow `0 1px 2px rgba(26,24,64,.06)`): the patient card, the question on `/caso/elena/jugar` (question, options, confidence and "Responder" together), the case panel, "Tus competencias" on `/inicio`, and the four blocks on `/caso/elena/resultado`. Radii: hero 20, card 16, inner elements 12. Newsreader (`--story`) is only for clinical narrative: the reason for consultation, the "Tu siguiente caso" vignette, and "Para recordar".

Motion lives in `src/index.css`, using the `--ease-out` and `--ease-in-out` curves. Each animation plays once and its resting state is the finished one, so nothing stays hidden if it doesn't run. The landing page draws the hero route on load, and the current stop of a route draws one ECG wave (`Heartbeat`). On `/caso/elena/jugar`, answering plays one sequence: options recolor in a cascade, the explanation enters, then the route segment draws. On `/caso/elena/resultado`, the route reaches the "Caso cerrado" stamp once per attempt (`elena-closed` in `sessionStorage`). Picking an option is instant. `prefers-reduced-motion` keeps only opacity in the answer sequence and removes the rest.

Tailwind emits utility classes in `@layer utilities`, and CSS outside any cascade layer overrides every layer regardless of specificity. Put global element styles, such as resets and defaults for `body`, headings, `button`, or `input`, inside `@layer base { ... }` so utility classes on those elements still apply. Tailwind's Preflight already applies `box-sizing: border-box`, removes default margins, and sets `font: inherit` on form controls, so do not repeat those rules.

Charts use colors with a fixed meaning: aquamarine is a correct answer, #C2392F an error, gray "No sé", and indigo the system's voice. Rings fill once when they enter (600 ms, ease-out); the level chart draws once and shows already drawn when the learner switches competency. With `prefers-reduced-motion`, or when the tab is not visible at mount, no chart or ring animates and all show their final state (`useChartAnimation`). Numbers use `font-variant-numeric: tabular-nums` everywhere, and large figures are set in Bricolage Grotesque (Atkinson's slashed zero is only fine at body size). On the result, the competencies are a fixed CSS grid (`[icon 20][name 1fr][before 56][→ 16][now 72][delta 96][status 160]`; without evidence the text runs from "before" to "delta") and the time is a CSS grid (`[stage 120][bar 1fr][value, at least 48]`) with the "~2 min estimados" label above the dashed line, not a Recharts chart. The estimated time per decision (120 s) comes from "unos 6 minutos" for three stops.
