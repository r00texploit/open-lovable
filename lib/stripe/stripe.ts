import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

export const STRIPE_PRICE_IDS = {
  pro: process.env.STRIPE_PRICE_PRO!,
  team: process.env.STRIPE_PRICE_TEAM!,
};

export const TIERS = {
  free: {
    name: 'Free',
    price: 0,
    generations: 3,
    features: ['3 generations per day', 'Basic styles', 'Community support'],
  },
  pro: {
    name: 'Pro',
    price: 29,
    generations: 100,
    features: ['100 generations per day', 'All styles', 'Priority support', 'Export code'],
  },
  team: {
    name: 'Team',
    price: 99,
    generations: 500,
    features: ['500 generations per day', 'All styles', 'Team collaboration', 'Priority support'],
  },
};