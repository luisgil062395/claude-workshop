// Category → icon. The design system makes the icon (never colour) the primary
// identifier of a category, so colour-blind users read categories exactly as
// well as everyone else.
//
// The label text still comes from the backend (GET /api/categories/), which
// stays the single source of truth for the vocabulary. This file only decides
// how a slug is drawn.

import {
  AirplaneTilt,
  ArrowsClockwise,
  Bus,
  ForkKnife,
  GraduationCap,
  Heartbeat,
  House,
  Receipt,
  ShoppingBag,
  ShoppingCart,
  Tag,
  Television,
  User,
} from "@phosphor-icons/react";

const ICONS = {
  food: ForkKnife,
  groceries: ShoppingCart,
  transportation: Bus,
  shopping: ShoppingBag,
  housing: House,
  bills: Receipt,
  health: Heartbeat,
  entertainment: Television,
  travel: AirplaneTilt,
  education: GraduationCap,
  personal: User,
  subscriptions: ArrowsClockwise,
  other: Tag,
};

export function categoryIcon(slug) {
  return ICONS[slug] || Tag;
}
