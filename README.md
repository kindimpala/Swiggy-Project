# Swiggy Super Agent — Voice-Powered Group Ordering Demo

A mobile-first React demo of a multi-agent AI ordering assistant for Swiggy.
Speak or type a group food request; three AI agents run **in parallel**
(`Promise.all`) and their outputs are merged into a single confirm card.

## How it works

1. **Input** — Tap the mic (Web Speech API) or type a request like
   *"Order dinner for the group tonight"*.
2. **Three agents run simultaneously:**
   - **Agent 1 — Intent Parser**: extracts who/what/cuisine/budget hints from the request.
   - **Agent 2 — Restaurant Matcher**: picks the best restaurant from mock Swiggy
     data where every group member's dietary need is covered.
   - **Agent 3 — Budget Guardian**: checks the ₹2000 weekly group budget and
     produces a status + tip.
3. **Merge** — Outputs are combined (money math is always computed
   deterministically in JS, never left to the model) into one card showing
   restaurant, rating, delivery time, per-person dish recommendations, full
   bill breakdown, per-person split, and budget status.
4. **Confirm** — One tap places the order and shows an animated success screen.

Prefer to skip the agents and pick a place yourself? Tap **🍽️ Browse all
restaurants** on the home screen to see the full catalogue — each restaurant
shows a live "✓ works for everyone" / "⚠ missing an option for someone" badge
against your active group, and tapping into one shows its full tagged menu
plus a direct "Order from X" button.

### Groups & dietary preferences (create your own, no code required)

The group is real, persisted React state (`localStorage`), not a hardcoded
list — tap **Manage** on the home screen to:

- Create any number of named groups (e.g. "Roomies", "Weekend Crew").
- Add or remove members per group (any number, not just 4).
- Edit each member's name and dietary preference — **no restrictions**,
  **vegetarian**, **gluten-free**, or **no onion / garlic**.
- Switch which group is active — that's the group the 3 agents order for,
  and the per-person split divides by that group's actual size.

The app ships with one default group so it works immediately:

| Member | Dietary need |
|---|---|
| You | No restrictions |
| Raj | Vegetarian |
| Sara | Gluten-free |
| Priya | No onion / garlic |

Weekly budget: **₹2000** (₹640 already spent this week in the mock data).

### Restaurants (mock catalogue)

9 restaurants, each with a tagged menu (veg / gluten-free / no-onion-garlic /
price) so the matching agent can verify every member of *any* group has an
eligible dish: Behrouz Biryani, Wow! Momo, Haldiram's, Barbeque Nation,
Truffles, Box8, Sagar Ratna, Faasos, and Domino's Pizza.

## Live AI vs. simulation mode

The agents call the real **Anthropic API** (`claude-sonnet-4-6`) directly from
the browser via `fetch` with the `anthropic-dangerous-direct-browser-access`
header, run in parallel with `Promise.all`.

- Tap the ⚙️ settings icon and paste an Anthropic API key to make all three
  agents call Claude live. The key is stored only in `localStorage`.
- With no key configured (or if a live call fails/network is unavailable),
  each agent falls back to a deterministic local simulation so the demo is
  always complete and reliable — this is the default, zero-setup experience.
- Each agent card shows whether its result came from **Live Claude** or was
  **Simulated**.

> Note: calling the Anthropic API directly from a browser exposes the API key
> to anyone inspecting network traffic. That's an acceptable trade-off for a
> local demo; a production build should proxy calls through a backend.

## Running locally

```bash
npm install
npm run dev
```

Open the printed local URL (best viewed at mobile width — the app renders as
a phone-frame). Voice input requires a Chromium-based browser (Web Speech API
support varies); typing always works as a fallback.

```bash
npm run build    # production build
npm run preview  # preview the production build
```

## Project structure

```
src/
  data/mockData.js       # group members, restaurants/menus, weekly budget
  lib/agents.js           # prompt builders, Anthropic calls, Promise.all orchestration, fallback simulation
  components/
    SwiggySuperAgent.jsx  # the full demo UI: voice/text input, agent progress, confirm card, success screen
  App.jsx
  main.jsx
```
