"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { ChartLine, Plus, ClockCounterClockwise, ChatCircle } from "@phosphor-icons/react/dist/ssr";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", Icon: ChartLine },
  { href: "/agregar", label: "Agregar gasto", Icon: Plus },
  { href: "/expenses", label: "Historial", Icon: ClockCounterClockwise },
  { href: "/chat", label: "Chat", Icon: ChatCircle },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Principal" className="nav">
      <div className="nav__inner">
        <div className="nav__brand" aria-hidden="true">
          <Image src="/logo.png" alt="" width={24} height={24} className="nav__mark" priority />
          SUMA
        </div>
        <ul className="nav__list">
          {NAV_ITEMS.map(({ href, label, Icon }) => {
            const isActive = pathname === href;
            return (
              <li key={href}>
                <a
                  href={href}
                  aria-label={label}
                  aria-current={isActive ? "page" : undefined}
                  className={isActive ? "nav__icon-link nav__icon-link--active" : "nav__icon-link"}
                  title={label}
                >
                  <Icon size={22} weight={isActive ? "fill" : "regular"} />
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
