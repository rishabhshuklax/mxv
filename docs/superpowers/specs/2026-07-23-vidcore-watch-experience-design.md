# VidCore Watch Experience Design

## Goal

Rebuild the legacy Theater playback capability as a first-class experience in the current `client` application, using VidCore for movie and television playback without carrying forward the legacy app's structure or iframe workarounds.

## Product Shape

Playback lives on a dedicated deep-linkable route:

- Movies: `/watch/movie~{tmdbId}`
- Television: `/watch/tv~{tmdbId}?season={season}&episode={episode}`

The existing title page gains a prominent `Watch now` action. The watch route keeps the player as the visual focus while retaining enough title context, navigation, and episode controls to feel part of MXV rather than a third-party embed.

This route is preferred over embedding directly in the title hero because it keeps discovery pages lightweight, gives television controls sufficient room, supports refreshable/deep-linkable episodes, and provides a stable surface for playback state.

## Components and Boundaries

### `lib/vidcore.js`

Pure functions own VidCore URL construction, route-state normalization, episode navigation, and progress storage keys. Inputs are validated before being interpolated into an iframe URL. This boundary is testable without a browser or React.

### `components/VidCorePlayer.jsx`

A focused player wrapper owns the iframe, its permissions, loading treatment, and `postMessage` event handling. It only accepts normalized playback props and only trusts events from `https://vidcore.org` or `https://www.vidcore.org`.

### `pages/Watch.jsx`

The route loads title metadata through the existing `/extras` API, coordinates movie versus television controls, derives adjacent episodes, reads resume state, and renders the theater layout. It does not duplicate API or iframe URL logic.

### Existing Surfaces

`Title.jsx` links to the watch route. `App.jsx` registers it and updates footer copy so the product no longer falsely claims that streaming is absent. `styles.css` extends the existing editorial film-journal visual language rather than introducing a separate theme.

## Playback Data Flow

1. Parse `:compoundId` with the existing `splitId`.
2. Normalize television `season` and `episode` query parameters to positive integers.
3. Load title details with `api.extras(type, id)`.
4. For TV, use TMDB season metadata from the details response to build season choices and episode bounds.
5. Read the saved timestamp for the exact movie or TV episode.
6. Build a VidCore iframe URL:
   - `https://vidcore.org/embed/movie/{id}`
   - `https://vidcore.org/embed/tv/{id}/{season}/{episode}`
7. Add `startAt` only when saved progress is meaningful.
8. Listen for trusted VidCore `PLAYER_EVENT` messages and persist throttled progress updates.
9. Episode changes update the URL, reset player-local loading state, and preserve browser back/forward behavior.

## Experience Details

- A wide 16:9 theater frame with a restrained glow derived from the existing amber accent.
- A compact “Now watching” rail with title, year, media type, and back-to-details navigation.
- TV season and episode selectors with previous/next episode controls.
- Resume copy when saved playback progress is available.
- Responsive controls that stack cleanly on narrow screens.
- Keyboard-visible controls and semantic labels.
- Reduced-motion handling through the project's existing CSS media query conventions.

## Security and Failure Handling

- VidCore identifiers are numeric-only and media type is restricted to `movie` or `tv`.
- The iframe uses a strict `referrerPolicy`, a minimal `allow` list, and a sandbox that permits playback while limiting top-level navigation.
- Parent-window messages are ignored unless they come from a documented VidCore origin and use the documented `PLAYER_EVENT` envelope.
- Invalid routes render a local error state without issuing an embed request.
- Metadata or player failures retain navigation back to the title page and a retry path.
- Third-party availability is described honestly; MXV does not imply ownership or hosting of the media.

## Testing and Verification

- Node's built-in test runner covers URL construction, input normalization, episode navigation, trusted-origin checks, and resume persistence helpers.
- The test must fail before implementation is added.
- The client production build must complete successfully.
- A final source audit checks that `vidsrc.me` is not used by the new experience and that the new route, title action, and footer copy are internally consistent.

## Non-Goals

- Migrating or deleting the legacy `theater` package.
- Building accounts or cross-device synchronization.
- Storing viewing history on the server.
- Replacing TMDB metadata or JustWatch provider data.
- Adding analytics, recommendations logic, or custom stream handling.
