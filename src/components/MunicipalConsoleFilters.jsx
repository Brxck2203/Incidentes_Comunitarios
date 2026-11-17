import { categories } from '../services/reportRepository.js';
import { uiCopy } from '../constants/uiCopy.js';

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
    <legend>{uiCopy.municipal.filtersLegend}</legend>
    <label>{uiCopy.municipal.categoryFilterLabel}
      <select value={category} onChange={(event) => onCategoryChange(event.target.value)}>
        <option value="">{uiCopy.municipal.allCategoriesOption}</option>
        {categories.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
    </label>
    <label>{uiCopy.municipal.statusFilterLabel}
      <select value={status} onChange={(event) => onStatusChange(event.target.value)}>
        <option value="">{uiCopy.municipal.allStatusesOption}</option>
        {statuses.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
    </label>
    <label>{uiCopy.municipal.queryFilterLabel}
      <input type="search" value={query} onChange={(event) => onQueryChange(event.target.value)}
        placeholder={uiCopy.municipal.queryFilterPlaceholder} />
    </label>
  </fieldset>;
}
