export function Nav() {
  return (
    <nav aria-label="Principal" className="nav">
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
      </ul>
    </nav>
  );
}
