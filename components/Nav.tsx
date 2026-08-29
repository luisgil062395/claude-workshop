import Image from "next/image";

export function Nav() {
  return (
    <nav aria-label="Principal" className="nav">
      <div className="nav__inner">
        <div className="nav__brand" aria-hidden="true">
          <Image src="/logo.png" alt="" width={24} height={24} className="nav__mark" priority />
          SUMA
        </div>
        <ul className="nav__list">
          <li>
            <a href="/">Dashboard</a>
          </li>
          <li>
            <a href="/agregar">Agregar gasto</a>
          </li>
          <li>
            <a href="/expenses">Historial</a>
          </li>
          <li>
            <a href="/chat">Chat</a>
          </li>
        </ul>
      </div>
    </nav>
  );
}
