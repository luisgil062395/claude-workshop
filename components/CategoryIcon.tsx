import {
  ForkKnife,
  ShoppingCart,
  Car,
  Bag,
  House,
  Receipt,
  FirstAid,
  FilmSlate,
  Airplane,
  GraduationCap,
  Person,
  ArrowsClockwise,
  Package,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";

const CATEGORY_ICON_COMPONENTS: Record<string, Icon> = {
  food: ForkKnife,
  groceries: ShoppingCart,
  transportation: Car,
  shopping: Bag,
  housing: House,
  bills: Receipt,
  health: FirstAid,
  entertainment: FilmSlate,
  travel: Airplane,
  education: GraduationCap,
  personal: Person,
  subscriptions: ArrowsClockwise,
  other: Package,
};

export function CategoryIcon({ category, size = 20 }: { category: string; size?: number }) {
  const IconComponent = CATEGORY_ICON_COMPONENTS[category] ?? Package;
  return <IconComponent size={size} weight="regular" />;
}
