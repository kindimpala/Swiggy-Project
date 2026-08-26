// Mock "Swiggy" data used by the demo — group profiles, weekly budget,
// and a small restaurant/menu catalogue with enough tagging detail for
// the matching agent to reason about dietary constraints.

export const DEFAULT_GROUP_MEMBERS = [
  { id: 'you', name: 'You', avatar: '🧑', restriction: 'none' },
  { id: 'raj', name: 'Raj', avatar: '👨‍💼', restriction: 'vegetarian' },
  { id: 'sara', name: 'Sara', avatar: '👩‍🦰', restriction: 'gluten-free' },
  { id: 'priya', name: 'Priya', avatar: '👩', restriction: 'no-onion-garlic' },
];

// The fixed set of dietary restrictions the matching agent understands.
// A member's display label is always derived from this list (via
// getRestrictionLabel) rather than stored per-member, so editing a
// member's restriction can never leave a stale label behind.
export const DIETARY_RESTRICTIONS = [
  { id: 'none', label: 'No restrictions' },
  { id: 'vegetarian', label: 'Vegetarian' },
  { id: 'gluten-free', label: 'Gluten-free' },
  { id: 'no-onion-garlic', label: 'No onion / garlic' },
];

export function getRestrictionLabel(restriction) {
  return DIETARY_RESTRICTIONS.find((r) => r.id === restriction)?.label || 'No restrictions';
}

// Emoji palette newly-added group members are auto-assigned from, cycling
// by member index so a freshly created group doesn't repeat itself.
export const AVATAR_PALETTE = ['🧑', '👨‍💼', '👩‍🦰', '👩', '🧔', '👱‍♀️', '🧑‍🦱', '👨‍🦳', '👩‍🦳', '🧑‍🎤'];

export const WEEKLY_BUDGET_LIMIT = 2000;

// Amount already spent earlier this week, before tonight's order.
export const WEEKLY_BUDGET_SPENT_SO_FAR = 640;

// Each dish carries diet tags so the matching agent can verify every
// group member has at least one eligible dish at a given restaurant.
//   veg              -> safe for Raj (vegetarian)
//   glutenFree        -> safe for Sara
//   noOnionGarlic     -> safe for Priya
// "You" has no restriction so any dish works.
export const RESTAURANTS = [
  {
    id: 'behrouz-biryani',
    name: 'Behrouz Biryani',
    cuisine: 'Biryani, Mughlai, North Indian',
    rating: 4.3,
    ratingCount: '12.8K',
    deliveryTime: 38,
    priceForTwo: 550,
    image: '🍛',
    tags: ['Biryani specialist', 'Popular for groups'],
    menu: [
      { id: 'bb1', name: 'Hyderabadi Chicken Dum Biryani', price: 349, veg: false, glutenFree: false, noOnionGarlic: false, spicy: true },
      { id: 'bb2', name: 'Paneer Tikka Biryani', price: 299, veg: true, glutenFree: false, noOnionGarlic: false, spicy: true },
      { id: 'bb3', name: 'Jain Veg Biryani (No Onion No Garlic)', price: 289, veg: true, glutenFree: false, noOnionGarlic: true, spicy: false },
      { id: 'bb4', name: 'Tandoori Chicken Tikka (GF)', price: 319, veg: false, glutenFree: true, noOnionGarlic: false, spicy: true },
      { id: 'bb5', name: 'Steamed Basmati Rice + Mirch Salan (GF)', price: 199, veg: true, glutenFree: true, noOnionGarlic: false, spicy: false },
      { id: 'bb6', name: 'Zafrani Shahi Tukda', price: 149, veg: true, glutenFree: false, noOnionGarlic: true, spicy: false },
    ],
  },
  {
    id: 'wow-momo',
    name: 'Wow! Momo',
    cuisine: 'Tibetan, Chinese, Momos',
    rating: 4.1,
    ratingCount: '9.4K',
    deliveryTime: 27,
    priceForTwo: 350,
    image: '🥟',
    tags: ['Quick bites', 'Trending'],
    menu: [
      { id: 'wm1', name: 'Chicken Steam Momos', price: 179, veg: false, glutenFree: false, noOnionGarlic: false, spicy: false },
      { id: 'wm2', name: 'Veg Steam Momos', price: 149, veg: true, glutenFree: false, noOnionGarlic: false, spicy: false },
      { id: 'wm3', name: 'Chicken Hakka Noodles', price: 199, veg: false, glutenFree: false, noOnionGarlic: false, spicy: true },
      { id: 'wm4', name: 'Veg Fried Rice', price: 179, veg: true, glutenFree: false, noOnionGarlic: false, spicy: false },
      { id: 'wm5', name: 'Chilli Chicken (Dry)', price: 229, veg: false, glutenFree: false, noOnionGarlic: false, spicy: true },
    ],
  },
  {
    id: 'haldirams',
    name: "Haldiram's",
    cuisine: 'North Indian, Sweets, Satvik, Snacks',
    rating: 4.4,
    ratingCount: '21.2K',
    deliveryTime: 32,
    priceForTwo: 400,
    image: '🍽️',
    tags: ['Pure veg', 'Great for mixed groups', "Editor's pick"],
    menu: [
      { id: 'hd1', name: 'Rajma Chawal (GF)', price: 189, veg: true, glutenFree: true, noOnionGarlic: false, spicy: false },
      { id: 'hd2', name: 'Satvik Jain Thali (No Onion No Garlic)', price: 249, veg: true, glutenFree: false, noOnionGarlic: true, spicy: false },
      { id: 'hd3', name: 'Paneer Butter Masala + Rice (GF)', price: 259, veg: true, glutenFree: true, noOnionGarlic: false, spicy: false },
      { id: 'hd4', name: 'Chole Bhature', price: 179, veg: true, glutenFree: false, noOnionGarlic: false, spicy: true },
      { id: 'hd5', name: 'Dal Khichdi (GF, No Onion No Garlic)', price: 169, veg: true, glutenFree: true, noOnionGarlic: true, spicy: false },
      { id: 'hd6', name: 'Gulab Jamun (2 pc)', price: 89, veg: true, glutenFree: false, noOnionGarlic: true, spicy: false },
    ],
  },
  {
    id: 'barbeque-nation',
    name: 'Barbeque Nation',
    cuisine: 'BBQ, Kebabs, Multi-cuisine',
    rating: 4.5,
    ratingCount: '15.6K',
    deliveryTime: 48,
    priceForTwo: 900,
    image: '🍢',
    tags: ['Premium', 'Buffet-style favourites'],
    menu: [
      { id: 'bn1', name: 'Non-Veg Sizzler Platter', price: 549, veg: false, glutenFree: false, noOnionGarlic: false, spicy: true },
      { id: 'bn2', name: 'Grilled Fish Tikka (GF)', price: 499, veg: false, glutenFree: true, noOnionGarlic: false, spicy: true },
      { id: 'bn3', name: 'Paneer Steak', price: 399, veg: true, glutenFree: false, noOnionGarlic: false, spicy: false },
      { id: 'bn4', name: 'Kebab Platter (Mixed)', price: 479, veg: false, glutenFree: false, noOnionGarlic: false, spicy: true },
      { id: 'bn5', name: 'Veg Galouti Kebab', price: 349, veg: true, glutenFree: false, noOnionGarlic: false, spicy: false },
    ],
  },
  {
    id: 'truffles',
    name: 'Truffles',
    cuisine: 'Continental, American, Burgers',
    rating: 4.2,
    ratingCount: '7.1K',
    deliveryTime: 40,
    priceForTwo: 650,
    image: '🍔',
    tags: ['Comfort food', 'Milkshakes'],
    menu: [
      { id: 'tr1', name: 'Grilled Chicken Burger', price: 289, veg: false, glutenFree: false, noOnionGarlic: false, spicy: false },
      { id: 'tr2', name: 'Veggie Delight Burger', price: 249, veg: true, glutenFree: false, noOnionGarlic: false, spicy: false },
      { id: 'tr3', name: 'Grilled Chicken Salad Bowl (GF)', price: 329, veg: false, glutenFree: true, noOnionGarlic: false, spicy: false },
      { id: 'tr4', name: 'Peri Peri Fries', price: 159, veg: true, glutenFree: false, noOnionGarlic: false, spicy: true },
    ],
  },
  {
    id: 'box8',
    name: 'Box8',
    cuisine: 'North Indian, Chinese, Meal Combos',
    rating: 4.0,
    ratingCount: '10.9K',
    deliveryTime: 22,
    priceForTwo: 320,
    image: '🍱',
    tags: ['Budget friendly', 'Fast delivery'],
    menu: [
      { id: 'b81', name: 'Punjabi Meal Combo (Non-Veg)', price: 259, veg: false, glutenFree: false, noOnionGarlic: false, spicy: true },
      { id: 'b82', name: 'Paneer Meal Combo', price: 229, veg: true, glutenFree: false, noOnionGarlic: false, spicy: false },
      { id: 'b83', name: 'Jain Rajma Rice Combo (No Onion No Garlic)', price: 219, veg: true, glutenFree: true, noOnionGarlic: true, spicy: false },
      { id: 'b84', name: 'Schezwan Fried Rice + Manchurian', price: 239, veg: true, glutenFree: false, noOnionGarlic: false, spicy: true },
    ],
  },
  {
    id: 'sagar-ratna',
    name: 'Sagar Ratna',
    cuisine: 'South Indian, Dosa, Idli',
    rating: 4.3,
    ratingCount: '13.5K',
    deliveryTime: 30,
    priceForTwo: 380,
    image: '🥞',
    tags: ['Pure veg', 'South Indian favourite'],
    menu: [
      { id: 'sr1', name: 'Mysore Masala Dosa', price: 169, veg: true, glutenFree: true, noOnionGarlic: false, spicy: true },
      { id: 'sr2', name: 'Plain Uttapam (No Onion No Garlic)', price: 139, veg: true, glutenFree: true, noOnionGarlic: true, spicy: false },
      { id: 'sr3', name: 'Idli Vada Sambar (No Onion No Garlic)', price: 119, veg: true, glutenFree: true, noOnionGarlic: true, spicy: false },
      { id: 'sr4', name: 'Filter Coffee', price: 69, veg: true, glutenFree: true, noOnionGarlic: true, spicy: false },
      { id: 'sr5', name: 'Paneer Ghee Roast Dosa', price: 199, veg: true, glutenFree: true, noOnionGarlic: false, spicy: true },
    ],
  },
  {
    id: 'faasos',
    name: 'Faasos',
    cuisine: 'Wraps, Rolls, Indian-Chinese Fusion',
    rating: 3.9,
    ratingCount: '8.7K',
    deliveryTime: 24,
    priceForTwo: 360,
    image: '🌯',
    tags: ['Quick bites', 'On-the-go'],
    menu: [
      { id: 'fs1', name: 'Chicken Tikka Wrap', price: 189, veg: false, glutenFree: false, noOnionGarlic: false, spicy: true },
      { id: 'fs2', name: 'Paneer Tikka Wrap', price: 169, veg: true, glutenFree: false, noOnionGarlic: false, spicy: true },
      { id: 'fs3', name: 'Jain Paneer Wrap (No Onion No Garlic)', price: 179, veg: true, glutenFree: false, noOnionGarlic: true, spicy: false },
      { id: 'fs4', name: 'Grilled Chicken Salad Bowl (GF)', price: 219, veg: false, glutenFree: true, noOnionGarlic: false, spicy: false },
      { id: 'fs5', name: 'Veg Schezwan Rice Bowl', price: 179, veg: true, glutenFree: false, noOnionGarlic: false, spicy: true },
    ],
  },
  {
    id: 'dominos',
    name: "Domino's Pizza",
    cuisine: 'Pizza, Italian, Fast Food',
    rating: 4.1,
    ratingCount: '18.3K',
    deliveryTime: 35,
    priceForTwo: 700,
    image: '🍕',
    tags: ['Late night favourite', 'Popular for groups'],
    menu: [
      { id: 'dm1', name: 'Chicken Pepperoni Pizza', price: 399, veg: false, glutenFree: false, noOnionGarlic: false, spicy: true },
      { id: 'dm2', name: 'Farmhouse Veg Pizza', price: 349, veg: true, glutenFree: false, noOnionGarlic: false, spicy: false },
      { id: 'dm3', name: 'Jain Special Pizza (No Onion No Garlic)', price: 359, veg: true, glutenFree: false, noOnionGarlic: true, spicy: false },
      { id: 'dm4', name: 'Gluten-Free Thin Crust Margherita (GF)', price: 329, veg: true, glutenFree: true, noOnionGarlic: false, spicy: false },
      { id: 'dm5', name: 'Choco Lava Cake', price: 99, veg: true, glutenFree: false, noOnionGarlic: true, spicy: false },
    ],
  },
];

export function findDishesFor(restaurant, restriction) {
  return restaurant.menu.filter((dish) => {
    if (restriction === 'vegetarian') return dish.veg;
    if (restriction === 'gluten-free') return dish.glutenFree;
    if (restriction === 'no-onion-garlic') return dish.noOnionGarlic;
    return true; // no restriction
  });
}

// Returns null if this restaurant can't satisfy every member, otherwise
// { restaurant, assignment: { memberId: dish }, total }
export function tryAssignRestaurant(restaurant, members) {
  const assignment = {};
  for (const member of members) {
    const options = findDishesFor(restaurant, member.restriction);
    if (options.length === 0) return null;
    // Prefer variety: pick the option not already chosen by someone else if possible.
    const used = new Set(Object.values(assignment).map((d) => d.id));
    const pick = options.find((d) => !used.has(d.id)) || options[0];
    assignment[member.id] = pick;
  }
  const total = Object.values(assignment).reduce((sum, d) => sum + d.price, 0);
  return { restaurant, assignment, total };
}

export function bestRestaurantMatch(members, cuisinePreference) {
  const candidates = RESTAURANTS.map((r) => tryAssignRestaurant(r, members)).filter(Boolean);
  if (candidates.length === 0) return null;

  const prefLower = (cuisinePreference || '').toLowerCase();
  const scored = candidates.map((c) => {
    let score = c.restaurant.rating * 10;
    if (prefLower && c.restaurant.cuisine.toLowerCase().includes(prefLower)) score += 25;
    if (prefLower && c.restaurant.name.toLowerCase().includes(prefLower)) score += 25;
    score -= c.restaurant.deliveryTime * 0.15;
    return { ...c, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0];
}
