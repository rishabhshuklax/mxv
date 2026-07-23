# VidCore Watch Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Add a polished, deep-linkable VidCore movie and TV playback experience to the current MXV Vite client.

**Architecture:** Pure helpers validate media identifiers and own VidCore URL/progress rules. A focused iframe component handles player events, while a route-level page owns metadata, episode navigation, and presentation. Existing title and app surfaces only link and route to that feature.

**Tech Stack:** React 18, React Router 6, Vite 5, browser `localStorage`, Node built-in test runner, VidCore iframe API

## Global Constraints

- Do not add runtime dependencies.
- Keep the existing editorial film-journal design language.
- Accept only `movie` and `tv` media types and positive numeric TMDB IDs.
- Trust player messages only from `https://vidcore.org` and `https://www.vidcore.org`.
- Use `https://vidcore.org/embed/movie/{id}` and `https://vidcore.org/embed/tv/{id}/{season}/{episode}`.
- Preserve the legacy `theater` package; the new experience belongs to `client`.
- Keep playback progress on-device only.

---

## File Map

- Create `client/src/lib/vidcore.js`: pure URL, playback state, origin, and episode helpers.
- Create `client/src/lib/vidcore.test.js`: behavior tests for all helper contracts.
- Create `client/src/components/VidCorePlayer.jsx`: secure responsive iframe and player event bridge.
- Create `client/src/pages/Watch.jsx`: metadata loading, TV navigation, resume, and theater composition.
- Modify `client/src/pages/Title.jsx`: add a primary watch action.
- Modify `client/src/App.jsx`: register the watch route and correct footer copy.
- Modify `client/src/styles.css`: style the theater, player, controls, loading, and responsive states.
- Modify `client/package.json`: add the built-in test command.

### Task 1: Playback helper contract

**Files:**

- Create: `client/src/lib/vidcore.test.js`
- Create: `client/src/lib/vidcore.js`
- Modify: `client/package.json`

**Interfaces:**

- Produces: `normalizePlayback(type, id, season, episode) -> { type, id, season, episode }`
- Produces: `buildVidCoreUrl(playback, startAt?) -> string`
- Produces: `getProgressKey(playback) -> string`
- Produces: `readProgress(playback, storage?) -> number`
- Produces: `writeProgress(playback, seconds, storage?) -> void`
- Produces: `isTrustedVidCoreOrigin(origin) -> boolean`
- Produces: `adjacentEpisode(seasons, season, episode, direction) -> { season, episode } | null`

- [x] **Step 1: Add a test script and failing behavior tests**

Add `"test": "node --test src/lib/*.test.js"` to `client/package.json`. Create tests with Node `test` and strict assertions covering:

```js
assert.deepEqual(normalizePlayback('movie', '27205'), {
  type: 'movie',
  id: '27205',
  season: null,
  episode: null
});
assert.deepEqual(normalizePlayback('tv', '1396', '2', '3'), {
  type: 'tv',
  id: '1396',
  season: 2,
  episode: 3
});
assert.equal(
  buildVidCoreUrl({ type: 'movie', id: '27205', season: null, episode: null }, 95.8),
  'https://vidcore.org/embed/movie/27205?autoPlay=true&theme=e0a458&startAt=95'
);
assert.equal(
  buildVidCoreUrl({ type: 'tv', id: '1396', season: 2, episode: 3 }),
  'https://vidcore.org/embed/tv/1396/2/3?autoPlay=true&theme=e0a458'
);
assert.throws(() => normalizePlayback('person', '12'), /Unsupported media type/);
assert.throws(() => normalizePlayback('movie', 'abc'), /Invalid TMDB id/);
assert.equal(isTrustedVidCoreOrigin('https://vidcore.org'), true);
assert.equal(isTrustedVidCoreOrigin('https://www.vidcore.org'), true);
assert.equal(isTrustedVidCoreOrigin('https://vidcore.org.evil.test'), false);
```

Use an in-memory storage stub to prove progress round-trips and invalid values return `0`. Use season fixtures to prove previous/next navigation crosses season boundaries and skips season zero.

- [x] **Step 2: Run the helper tests and verify RED**

Run: `npm test`

Expected: FAIL because `./vidcore.js` does not exist.

- [x] **Step 3: Implement the pure helpers**

Implement validation, URL construction with `URLSearchParams`, origin equality checks, injected-storage progress helpers, and season traversal. Treat episode counts lower than one as unavailable. Save integer seconds only; remove a progress key when the value is invalid or below one.

- [x] **Step 4: Run the helper tests and verify GREEN**

Run: `npm test`

Expected: all tests pass with zero failures.

### Task 2: Focused VidCore player

**Files:**

- Create: `client/src/components/VidCorePlayer.jsx`

**Interfaces:**

- Consumes: `buildVidCoreUrl`, `isTrustedVidCoreOrigin`
- Props: `{ playback, title, startAt, onProgress }`
- Produces: a responsive iframe; calls `onProgress(seconds)` for trusted time updates

- [x] **Step 1: Implement the isolated iframe wrapper**

Build the source with `buildVidCoreUrl`. Reset loading state whenever `src` changes. Register one `window.message` listener and ignore messages unless origin is trusted, `data.type === 'PLAYER_EVENT'`, and the nested event describes a finite non-negative current time. Accept the documented event forms defensively: event name from `data.data.event` or `data.data.type`, and seconds from `data.data.currentTime`, `data.data.time`, or `data.data.seconds`.

Render:

```jsx
<iframe
  src={src}
  title={`${title} — VidCore player`}
  allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
  allowFullScreen
  referrerPolicy="strict-origin-when-cross-origin"
  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
/>
```

Include a non-blocking loading layer and an external-service label. Do not reproduce the legacy delayed sandbox removal.

- [x] **Step 2: Re-run helper tests**

Run: `npm test`

Expected: all helper tests still pass.

### Task 3: Watch route and television controls

**Files:**

- Create: `client/src/pages/Watch.jsx`
- Modify: `client/src/App.jsx`

**Interfaces:**

- Consumes: `api.extras`, `splitId`, `titleOf`, `yearOf`, all playback helpers, `VidCorePlayer`
- Route: `/watch/:compoundId`
- Query for TV: `season` and `episode`

- [x] **Step 1: Register the route and load normalized playback**

Add `Watch` to `App.jsx` and register `<Route path="/watch/:compoundId" element={<Watch />} />`.

In `Watch.jsx`, parse the route and search parameters. Call `normalizePlayback`; render an invalid-link state on validation failure. Load `api.extras(type, id)` with the same cancellation pattern used by `Title.jsx`.

- [x] **Step 2: Implement TV episode navigation**

Exclude TMDB season number `0`. Pick the requested season when available, otherwise the first regular season. Clamp episodes to `1..episode_count`. Update selection through `navigate()` to `/watch/tv~{id}?season={n}&episode={n}`. Use `adjacentEpisode` for previous/next buttons.

- [x] **Step 3: Add resume behavior and route states**

Read progress for the normalized movie or exact episode. Pass it as `startAt`. Throttle writes by persisting only when the integer timestamp advances by at least five seconds. Render:

- metadata loading skeleton;
- retryable API error;
- invalid route state;
- player with title context;
- TV selectors and adjacent episode buttons;
- back-to-details link;
- on-device resume label when progress is at least ten seconds.

- [x] **Step 4: Correct the footer product claim**

Replace “No streaming here, just taste.” with copy that accurately describes discovery plus playback through an external player. Add a short VidCore attribution near the watch experience.

- [x] **Step 5: Run tests**

Run: `npm test`

Expected: all tests pass with zero failures.

### Task 4: Entry point and state-of-the-art presentation

**Files:**

- Modify: `client/src/pages/Title.jsx`
- Modify: `client/src/styles.css`

**Interfaces:**

- Produces: title-page link to `/watch/${d.type}~${d.id}`
- Styles: `.watch-page`, `.watch-shell`, `.watch-player-wrap`, `.watch-toolbar`, `.episode-controls`, and related states

- [x] **Step 1: Add the title-page action**

Make `Watch now` the leading primary action:

```jsx
<Link className="btn btn-primary" to={`/watch/${d.type}~${d.id}`}>
  ▶ Watch now
</Link>
```

Keep trailers available as a ghost action so both intents remain clear.

- [x] **Step 2: Build the responsive theater layout**

Use the existing variables, typography, grain, amber accent, borders, and low-radius editorial surfaces. Give the player a stable `16 / 9` ratio, visible keyboard focus, a subtle ambient backdrop/glow, and a maximum content width. Keep controls readable at 320px and avoid horizontal overflow.

- [x] **Step 3: Add reduced-motion and small-screen behavior**

At narrow widths, stack metadata and controls, allow selectors to fill available width, and keep previous/next buttons reachable. Under `prefers-reduced-motion: reduce`, disable new watch-page transitions and loading pulse.

- [x] **Step 4: Run unit tests**

Run: `npm test`

Expected: all tests pass with zero failures.

### Task 5: Production verification and review

**Files:**

- Review all changed files.

**Interfaces:**

- Produces: test and build evidence plus a clean, scoped diff

- [x] **Step 1: Build the client**

Run: `npm run build`

Expected: Vite exits with code `0` and emits `dist`.

- [x] **Step 2: Run the complete client tests again**

Run: `npm test`

Expected: all tests pass with zero failures.

- [x] **Step 3: Audit the integration**

Run:

```bash
rg -n "vidcore|vidsrc|/watch/" client/src client/package.json
git diff --check
git status --short
```

Expected: the new client references only documented VidCore routes, `/watch/` is registered and linked, `git diff --check` reports no whitespace errors, and only intentional files are modified or added.

- [x] **Step 4: Review accessibility and security**

Confirm iframe title, labeled selectors, visible focus, semantic buttons/links, trusted-origin comparison, numeric validation, sandbox, referrer policy, and no use of the legacy sandbox-removal workaround.

- [x] **Step 5: Review against this plan**

Confirm every goal and global constraint is represented in the implementation. Report any deviation rather than hiding it.
