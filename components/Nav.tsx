export function Nav() {
  return (
    <nav aria-label="Principal" className="nav">
      <ul className="nav__list">
        <li>
          <a href="/" className="nav__brand">
            <span className="nav__mark" aria-hidden="true" />
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
