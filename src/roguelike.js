// Run equipment and permanent talent content. All effects are recomputed from sources.
const freezeRows = (rows) => Object.freeze(rows.map((row) => Object.freeze({ ...row, ...(row.requires ? { requires: Object.freeze([...row.requires]) } : {}) })));

export const TALENTS = freezeRows([
  { id: 'vigor', name: 'Kiln heart', branch: 'Survival', tier: 1, cost: 2, maxRank: 3, requires: [], description: '+10 maximum health per rank.' },
  { id: 'recovery', name: 'Warm draught', branch: 'Survival', tier: 2, cost: 3, maxRank: 2, requires: ['vigor'], description: 'Flasks restore 8 more health per rank.' },
  { id: 'reserve', name: 'Last reserve', branch: 'Survival', tier: 3, cost: 5, maxRank: 1, requires: ['recovery'], description: '+1 flask capacity and starting flask.' },
  { id: 'edge', name: 'Tempered edge', branch: 'Combat', tier: 1, cost: 2, maxRank: 3, requires: [], description: '+5% sword damage per rank.' },
  { id: 'tempo', name: 'Sword rhythm', branch: 'Combat', tier: 2, cost: 3, maxRank: 2, requires: ['edge'], description: '+5% attack speed per rank.' },
  { id: 'execution', name: 'Final spark', branch: 'Combat', tier: 3, cost: 5, maxRank: 1, requires: ['tempo'], description: 'Combo finishers deal 15% more damage.' },
  { id: 'purse', name: 'Travel purse', branch: 'Fortune', tier: 1, cost: 2, maxRank: 3, requires: [], description: 'Start each run with 12 gold per rank.' },
  { id: 'fortune', name: 'Bright finds', branch: 'Fortune', tier: 2, cost: 3, maxRank: 2, requires: ['purse'], description: '+8% chance of better gear per rank.' },
  { id: 'barter', name: 'Old acquaintance', branch: 'Fortune', tier: 3, cost: 5, maxRank: 1, requires: ['fortune'], description: 'Merchant prices are 20% lower.' },
]);

export function talentBonuses(ranks = {}) {
  const rank = (id) => {
    const talent = TALENTS.find((entry) => entry.id === id);
    const value = ranks?.[id];
    return Number.isInteger(value) && value >= 0 ? Math.min(value, talent.maxRank) : 0;
  };
  return {
    maxHp: 10 * rank('vigor'), healPower: 8 * rank('recovery'), maxFlasks: rank('reserve'),
    damage: .05 * rank('edge'), attackSpeed: .05 * rank('tempo'), finisher: .15 * rank('execution'),
    startingGold: 12 * rank('purse'), fortune: .08 * rank('fortune'), discount: .2 * rank('barter'),
  };
}

export const ITEMS = freezeRows([
  { id: 'iron-edge', name: 'Iron edge', rarity: 'common', slot: 'blade', damage: .14, description: '+14% sword damage.' },
  { id: 'quick-edge', name: 'Quick edge', rarity: 'common', slot: 'blade', attackSpeed: .12, description: '+12% attack speed.' },
  { id: 'ash-coat', name: 'Ash coat', rarity: 'common', slot: 'armor', maxHp: 15, description: '+15 maximum health.' },
  { id: 'iron-coat', name: 'Iron coat', rarity: 'common', slot: 'armor', armor: .1, description: 'Take 10% less damage.' },
  { id: 'step-stone', name: 'Step stone', rarity: 'common', slot: 'charm', rollRecovery: .12, description: 'Dodge recovers 12% faster.' },
  { id: 'red-seed', name: 'Red seed', rarity: 'common', slot: 'charm', leech: 2, description: 'Kills restore 2 health.' },
  { id: 'ember-edge', name: 'Ember edge', rarity: 'rare', slot: 'blade', damage: .25, attackSpeed: .08, description: '+25% damage and +8% attack speed.' },
  { id: 'swift-edge', name: 'Swift edge', rarity: 'rare', slot: 'blade', attackSpeed: .24, description: '+24% attack speed.' },
  { id: 'kiln-mail', name: 'Kiln mail', rarity: 'rare', slot: 'armor', armor: .18, maxHp: 15, description: 'Take 18% less damage; +15 health.' },
  { id: 'bloom-ring', name: 'Bloom ring', rarity: 'rare', slot: 'charm', leech: 4, rollRecovery: .08, description: 'Kills heal 4; dodge recovers 8% faster.' },
  { id: 'sun-edge', name: 'Sun edge', rarity: 'epic', slot: 'blade', damage: .38, attackSpeed: .14, description: '+38% damage and +14% attack speed.' },
  { id: 'warden-mail', name: 'Warden mail', rarity: 'epic', slot: 'armor', armor: .26, maxHp: 25, description: 'Take 26% less damage; +25 health.' },
  { id: 'phoenix-ring', name: 'Phoenix ring', rarity: 'epic', slot: 'charm', leech: 6, rollRecovery: .22, description: 'Kills heal 6; dodge recovers 22% faster.' },
]);

export function rollGear(random, floor = 1, fortune = 0, slot = null) {
  const roll = random() - Math.max(0, Math.min(.16, fortune));
  const rarity = roll < .05 + floor * .025 ? 'epic' : roll < .28 + floor * .035 ? 'rare' : 'common';
  const options = ITEMS.filter((item) => item.rarity === rarity && (!slot || item.slot === slot));
  return { ...options[Math.floor(random() * options.length)] };
}

export function merchantStock(random, floor) {
  return [
    ...['blade', 'armor', 'charm'].map((slot) => {
      const item = rollGear(random, floor, 0, slot);
      return { id: `gear-${slot}`, kind: 'gear', name: item.name, description: item.description, item, price: { common: 35, rare: 65, epic: 100 }[item.rarity], sold: false };
    }),
    { id: 'heal', kind: 'heal', name: 'Warm meal', description: 'Restore 40 health.', price: 18, sold: false },
    { id: 'flask', kind: 'flask', name: 'Flask refill', description: 'Restore one healing flask.', price: 28, sold: false },
  ];
}
