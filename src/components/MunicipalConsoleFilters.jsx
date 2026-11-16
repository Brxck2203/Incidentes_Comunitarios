import { categories } from '../services/reportRepository.js';

export default function MunicipalConsoleFilters({
  category,
  status,
  query,
  statuses,
  onCategoryChange,
  onStatusChange,
  onQueryChange,
}) {
  return <fieldset className="municipal-console-filters">
    <legend>Buscar y filtrar reportes</legend>
    <label>Categoría
      <select value={category} onChange={(event) => onCategoryChange(event.target.value)}>
        <option value="">Todas las categorías</option>
        {categories.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
    </label>
    <label>Estado
      <select value={status} onChange={(event) => onStatusChange(event.target.value)}>
        <option value="">Todos los estados</option>
        {statuses.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
    </label>
    <label>Ticket o descripción
      <input type="search" value={query} onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Buscar ticket o descripción" />
    </label>
  </fieldset>;
}
