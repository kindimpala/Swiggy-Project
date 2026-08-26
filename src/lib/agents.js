import {
  RESTAURANTS,
  WEEKLY_BUDGET_LIMIT,
  WEEKLY_BUDGET_SPENT_SO_FAR,
  bestRestaurantMatch,
  tryAssignRestaurant,
  getRestrictionLabel,
} from '../data/mockData.js';

const MODEL = 'claude-sonnet-4-6';
const API_URL = 'https://api.anthropic.com/v1/messages';

// ---------------------------------------------------------------------------
// Low-level Anthropic call. Runs directly from the browser for this demo,
// so it requires the direct-browser-access beta header. If no key is
// configured, or the network/CORS call fails, callers fall back to the
// deterministic local simulation below so the demo never breaks on stage.
// ---------------------------------------------------------------------------
async function callClaude(apiKey, systemPrompt, userPrompt, signal) {
  const res = await fetch(API_URL, {
    method: 'POST',
    signal,
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Anthropic API error ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = (data.content || []).map((b) => b.text || '').join('\n');
  return extractJson(text);
}

function extractJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON object found in model response');
  return JSON.parse(candidate.slice(start, end + 1));
}

// ---------------------------------------------------------------------------
// Prompt builders — each agent gets the same raw request text plus whatever
// mock context it needs, and is designed to run independently in parallel.
// ---------------------------------------------------------------------------
function buildIntentPrompt(userText, members) {
  const system = `You are Agent 1 (Intent Parser) inside Swiggy's Super Agent, a multi-agent group food-ordering assistant. Extract structured intent from a casual group order request. Respond with ONLY a JSON object, no prose, no markdown fences. Schema:
{
  "who": string[],            // who this order is for, e.g. ["group","everyone"] or named people mentioned
  "meal": string,              // e.g. "dinner", "lunch", "snacks"
  "cuisinePreference": string, // best-guess cuisine/dish keyword mentioned, "" if none
  "occasion": string,          // e.g. "casual weeknight", "celebration", "" if unclear
  "budgetHint": string,        // any budget-related phrase detected, "" if none
  "urgency": "low"|"normal"|"high"
}`;
  const user = `Group order request: "${userText}"\n\nThe group has ${members.length} members with fixed dietary needs (handled by another agent). Focus only on parsing the intent of this sentence.`;
  return { system, user };
}

function buildRestaurantPrompt(userText, members) {
  const system = `You are Agent 2 (Restaurant Matcher) inside Swiggy's Super Agent. You are given a group's dietary profile and a catalogue of restaurants with tagged menu items. Find the SINGLE BEST restaurant where every group member has at least one eligible dish, matching any cuisine hint in the request. Respond with ONLY a JSON object, no prose, no markdown fences. Schema:
{
  "restaurantId": string,          // must be one of the provided restaurant ids
  "reasoning": string,             // 1-2 sentences on why this restaurant satisfies everyone
  "dishesByMember": {              // one entry per member id below -> { dishId, dishName }
    ${members.map((m) => `"${m.id}": { "dishId": string, "dishName": string }`).join(',\n    ')}
  }
}`;
  const user = `Group order request: "${userText}"

Group dietary profile:
${members.map((m) => `- ${m.id} (${m.name}): ${getRestrictionLabel(m.restriction)}`).join('\n')}

Restaurant catalogue (JSON):
${JSON.stringify(
  RESTAURANTS.map((r) => ({
    id: r.id,
    name: r.name,
    cuisine: r.cuisine,
    rating: r.rating,
    deliveryTime: r.deliveryTime,
    menu: r.menu.map((d) => ({ id: d.id, name: d.name, price: d.price, veg: d.veg, glutenFree: d.glutenFree, noOnionGarlic: d.noOnionGarlic })),
  }))
)}

Every member MUST get a dish that respects their restriction: "Vegetarian" needs veg:true, "Gluten-free" needs glutenFree:true, "No onion / garlic" needs noOnionGarlic:true, "No restrictions" can have anything.`;
  return { system, user };
}

function buildBudgetPrompt(userText, members) {
  const system = `You are Agent 3 (Budget Guardian) inside Swiggy's Super Agent. You track a rolling weekly food budget for the group and reason about whether tonight's order fits. Respond with ONLY a JSON object, no prose, no markdown fences. Schema:
{
  "status": "within_budget" | "tight" | "over_budget",
  "message": string,          // short, friendly one-sentence budget verdict for the user
  "suggestion": string        // "" if within budget comfortably, otherwise a short money-saving tip
}`;
  const user = `Group order request: "${userText}"

Weekly budget limit: ₹${WEEKLY_BUDGET_LIMIT}
Already spent this week (before tonight): ₹${WEEKLY_BUDGET_SPENT_SO_FAR}
Remaining before tonight's order: ₹${WEEKLY_BUDGET_LIMIT - WEEKLY_BUDGET_SPENT_SO_FAR}

You do not know tonight's exact order total yet (another agent is computing it in parallel) — reason generally about how much headroom is left and give a status/tip appropriate for a group of ${members.length} ordering dinner. Assume a typical per-person dinner order costs between ₹200-₹350.`;
  return { system, user };
}

// ---------------------------------------------------------------------------
// Deterministic local fallbacks — used whenever no API key is configured or
// a live call fails, so the demo experience is always complete and reliable.
// ---------------------------------------------------------------------------
function simulateIntent(userText) {
  const lower = userText.toLowerCase();
  const cuisineKeywords = ['biryani', 'chinese', 'momo', 'bbq', 'barbeque', 'burger', 'continental', 'north indian', 'thali', 'combo'];
  const found = cuisineKeywords.find((k) => lower.includes(k));
  const budgetMatch = userText.match(/₹\s?(\d+)|(\d+)\s?(rs|rupees)/i);
  return {
    who: /everyone|group|team|all of us/.test(lower) ? ['group', 'everyone'] : ['group'],
    meal: /lunch/.test(lower) ? 'lunch' : /breakfast/.test(lower) ? 'breakfast' : /snack/.test(lower) ? 'snacks' : 'dinner',
    cuisinePreference: found || '',
    occasion: /celebrat|birthday|party/.test(lower) ? 'celebration' : 'casual weeknight',
    budgetHint: budgetMatch ? budgetMatch[0] : '',
    urgency: /asap|now|hungry|urgent/.test(lower) ? 'high' : 'normal',
  };
}

function simulateRestaurant(userText, members) {
  // If the request explicitly names one of our restaurants (e.g. "Order
  // from Domino's Pizza"), honor that directly instead of letting the
  // generic cuisine-keyword scoring possibly pick a different one.
  const lower = userText.toLowerCase();
  const namedRestaurant = RESTAURANTS.find((r) => lower.includes(r.name.toLowerCase()));
  const directMatch = namedRestaurant ? tryAssignRestaurant(namedRestaurant, members) : null;

  const intent = simulateIntent(userText);
  const match = directMatch || bestRestaurantMatch(members, intent.cuisinePreference);
  if (!match) return null;
  const dishesByMember = {};
  for (const member of members) {
    const dish = match.assignment[member.id];
    dishesByMember[member.id] = { dishId: dish.id, dishName: dish.name };
  }
  return {
    restaurantId: match.restaurant.id,
    reasoning: `${match.restaurant.name} is rated ${match.restaurant.rating}★ and has a dish covering every dietary need in the group.`,
    dishesByMember,
  };
}

function simulateBudget() {
  const remaining = WEEKLY_BUDGET_LIMIT - WEEKLY_BUDGET_SPENT_SO_FAR;
  if (remaining > 1400) {
    return { status: 'within_budget', message: `Plenty of room left in this week's ₹${WEEKLY_BUDGET_LIMIT} budget.`, suggestion: '' };
  }
  if (remaining > 800) {
    return { status: 'tight', message: `You're on track, but the week's budget is getting tight.`, suggestion: 'Consider skipping an extra dessert this time.' };
  }
  return { status: 'over_budget', message: `This order may push the group over the ₹${WEEKLY_BUDGET_LIMIT} weekly budget.`, suggestion: 'Split fewer add-ons or shift some spend to next week.' };
}

// ---------------------------------------------------------------------------
// Public API — runs all three agents in parallel via Promise.all, then
// merges their outputs (plus deterministic money math) into one result.
// ---------------------------------------------------------------------------
export async function runSuperAgent(userText, apiKey, members, { signal, onAgentUpdate } = {}) {
  const notify = (id, status) => onAgentUpdate && onAgentUpdate(id, status);

  const runAgent = async (id, promptBuilder, simulateFn) => {
    notify(id, 'running');
    if (apiKey) {
      try {
        const { system, user } = promptBuilder(userText, members);
        const result = await callClaude(apiKey, system, user, signal);
        notify(id, 'live');
        return { data: result, source: 'live' };
      } catch (err) {
        console.warn(`[SuperAgent] ${id} live call failed, using simulation:`, err.message);
      }
    }
    // Small artificial delay so the multi-agent UI still feels alive in
    // simulation mode (no live API key configured, or the call failed).
    await new Promise((r) => setTimeout(r, 900 + Math.random() * 700));
    notify(id, 'simulated');
    return { data: simulateFn(userText, members), source: 'simulated' };
  };

  const [intentRes, restaurantRes, budgetRes] = await Promise.all([
    runAgent('intent', buildIntentPrompt, simulateIntent),
    runAgent('restaurant', buildRestaurantPrompt, simulateRestaurant),
    runAgent('budget', buildBudgetPrompt, simulateBudget),
  ]);

  const intent = intentRes.data;
  let restaurantPlan = restaurantRes.data;

  // Safety net: if the live model returned an unknown restaurant id or
  // malformed assignment, fall back to the deterministic matcher.
  const restaurantValid =
    restaurantPlan &&
    RESTAURANTS.some((r) => r.id === restaurantPlan.restaurantId) &&
    members.every((m) => restaurantPlan.dishesByMember && restaurantPlan.dishesByMember[m.id]);

  if (!restaurantValid) {
    restaurantPlan = simulateRestaurant(userText, members);
  }

  const restaurant = RESTAURANTS.find((r) => r.id === restaurantPlan.restaurantId);

  // Money math is always computed deterministically in JS — never trust
  // an LLM's arithmetic for a live "confirm & pay" style demo.
  const perPerson = members.map((member) => {
    const pick = restaurantPlan.dishesByMember[member.id];
    const dish = restaurant.menu.find((d) => d.id === pick.dishId) || restaurant.menu.find((d) => d.name === pick.dishName);
    return { member, dish };
  });
  const subtotal = perPerson.reduce((sum, p) => sum + (p.dish ? p.dish.price : 0), 0);
  const deliveryFee = 40;
  const platformFee = 6;
  const gst = Math.round(subtotal * 0.05);
  const total = subtotal + deliveryFee + platformFee + gst;
  const perPersonSplit = Math.ceil(total / members.length);

  const remainingBeforeOrder = WEEKLY_BUDGET_LIMIT - WEEKLY_BUDGET_SPENT_SO_FAR;
  const remainingAfterOrder = remainingBeforeOrder - total;
  const computedStatus = remainingAfterOrder >= 400 ? 'within_budget' : remainingAfterOrder >= 0 ? 'tight' : 'over_budget';

  const budget = {
    ...budgetRes.data,
    status: computedStatus, // deterministic status always wins over the LLM guess
    limit: WEEKLY_BUDGET_LIMIT,
    spentSoFar: WEEKLY_BUDGET_SPENT_SO_FAR,
    remainingBeforeOrder,
    remainingAfterOrder,
  };

  return {
    intent,
    restaurant,
    reasoning: restaurantPlan.reasoning,
    perPerson,
    subtotal,
    deliveryFee,
    platformFee,
    gst,
    total,
    perPersonSplit,
    budget,
    sources: { intent: intentRes.source, restaurant: restaurantRes.source, budget: budgetRes.source },
  };
}
