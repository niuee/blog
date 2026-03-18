  ---
  Blog Series Roadmap: Building a Railway Simulator

  Post 1: "Why I'm Building a Railway Simulator"

  - Motivation — what inspired banana (NIMBY Rails, A-Train, Transport Fever)
  - The Bannan Line name origin (板南線 joke)
  - High-level vision: Bézier-based track layouts, scheduling, cargo/passenger mechanics
  - Tech stack overview: PixiJS + React + ue-too toolkit
  - Screenshot/GIF of current state

  Post 2: "Tracks as Bézier Curves"

  - Why Bézier curves for tracks (flexibility vs grid-based or spline approaches)
  - The TrackGraph data structure — joints, segments, topology
  - Curve creation UX: the state machine behind drawing tracks
  - Joint snapping, tension control, tangent modes
  - Visuals: before/after of curve creation flow

  Post 3: "Elevation and the Rendering Problem"

  - Multi-elevation system (7 levels, SUB_3 to ABOVE_3)
  - The z-ordering challenge: tracks, shadows, trains, catenary all at different heights
  - Z-index banding approach (1000 slots per elevation band)
  - Half-car rendering trick for correct z-ordering at elevation transitions
  - Diagrams of the container hierarchy

  Post 4: "Designing Trains with the Composite Pattern"

  - Car vs Formation — why a composite tree structure
  - Bogies, inter-bogie distances, directional flipping
  - The train editor page: a dedicated tool for designing compositions
  - Positioning trains on Bézier curves (segment ID + t-value)
  - Procedural car textures

  Post 5: "State Machines Everywhere"

  - How @ue-too/being FSMs drive all user interaction
  - LayoutStateMachine states: idle → hover → create → delete
  - TrainPlacementStateMachine for previewing and placing trains
  - Why FSMs make complex canvas interactions manageable
  - Code walkthrough of a state transition

  Post 6: "Stations, Buildings, and the World"

  - Station infrastructure: platforms, stop positions, track ownership
  - Building placement system with presets
  - Scene serialization — saving and loading everything as JSON
  - Validation and graceful loading

  Post 7: "Adding a Real Map Layer"

  - MapLibre GL integration as an experimental overlay
  - GeoJSON data (Tainan districts, Tokyo railroad tracks)
  - Challenges of syncing a map projection with a canvas coordinate system
  - PMTiles and Protomaps for self-hosted tiles

  Post 8: "Performance at 60 FPS"

  - Frame budget (16.67ms) and where time goes
  - stats.js integration for monitoring
  - Entity pooling with GenericEntityManager
  - Procedural track generation for stress testing
  - Lessons learned from canvas performance tuning

  ---
  Content Suggestions

  Format ideas:
  - Each post should include at least one interactive GIF or short video showing the feature in
  action
  - Code snippets for the interesting algorithmic parts (Bézier positioning, z-index banding
  formula, FSM transitions)
  - Architecture diagrams for the composite pattern and render system hierarchy
  - "What I'd do differently" retrospective notes where relevant

  Audience angle:
  - These posts sit at the intersection of game dev, creative coding, and web tech — lean into that
   niche
  - Emphasize the "building a game with web technologies" angle — it's unusual and interesting
  - The ue-too packages provide good hooks for readers who want to try individual pieces themselves

  Distribution:
  - Dev.to, Hashnode, or a personal blog work well for this kind of technical series
  - Cross-post key visuals to Twitter/X for engagement
  - Consider a "devlog" framing if you want a more casual tone
  