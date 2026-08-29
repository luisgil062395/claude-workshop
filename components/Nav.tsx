import Image from "next/image";

export function Nav() {
  return (
    <nav aria-label="Principal" className="nav">
      <ul className="nav__list">
        <li>
          <a href="/" className="nav__brand">
            <Image src="/logo.png" alt="" width={24} height={24} className="nav__mark" priority />
            SUMA
          </a>
        </li>
        <li>
          <a href="/">Dashboard</a>
        </li>
        <li>
          <a href="/agregar">Agregar gasto</a>
        </li>
        <li>
          <a href="/expenses">Historial</a>
        </li>
      </ul>
    </nav>
  );
}
