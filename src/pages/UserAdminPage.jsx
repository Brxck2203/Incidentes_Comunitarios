import { useEffect, useMemo, useRef, useState } from 'react';
import {
  INTERNAL_STAFF_ROLES,
  ROLE_CATALOG,
   SYSTEM_MODULES,
  getAuthorizedModulesForRole,
  getCrewsForDepartment,
  municipalDepartments,
} from '../services/rolePermissions.js';
import {
  getInternalUsers,
  hasActiveAdministrator,
  registerInternalUser,
  setInternalUserActiveStatus,
} from '../services/userAdministration.js';
import '../components/UserAdminPanel.css';

function formatDateTime(value) {
  if (!value) return 'No disponible';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'No disponible' : date.toLocaleString('es-CR');
}

// TODO: restringir el acceso a esta pantalla únicamente al perfil Administrador cuando se integre HU-34
export default function UserAdminPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [updatingId, setUpdatingId] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('gestor');
  const [department, setDepartment] = useState(municipalDepartments[0] || '');
  const [crew, setCrew] = useState('');

  const busyRef = useRef(false);

  useEffect(() => {
    let active = true;
    getInternalUsers()
      .then((list) => {
        if (!active) return;
        setUsers(list);
        if (!hasActiveAdministrator(list)) {
          setRole('administrador');
          setDepartment('');
          setCrew('');
        }
        setError('');
      })
      .catch((failure) => {
        if (!active) return;
        setError(
          failure instanceof Error
            ? failure.message
            : 'No se pudo cargar el padrón de funcionarios.',
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const bootstrapRequired = !loading && !hasActiveAdministrator(users);
  const effectiveRole = bootstrapRequired ? 'administrador' : role;
  const currentRoleConfig = ROLE_CATALOG[effectiveRole];

  const availableCrews = useMemo(
    () => (currentRoleConfig?.requiresCrew ? getCrewsForDepartment(department) : []),
    [currentRoleConfig, department],
  );

  const previewModules = useMemo(
    () => getAuthorizedModulesForRole(effectiveRole),
    [effectiveRole],
  );

  const activeAdminCount = useMemo(
    () =>
      users.filter((item) => item.role === 'administrador' && item.active !== false)
        .length,
    [users],
  );

  function handleRoleChange(nextRole) {
    setRole(nextRole);
    setError('');
    setMessage('');
    const nextConfig = ROLE_CATALOG[nextRole];
    if (nextConfig?.requiresDepartment) {
      const nextDept = department || municipalDepartments[0] || '';
      setDepartment(nextDept);
      if (nextConfig.requiresCrew) {
        const crews = getCrewsForDepartment(nextDept);
        setCrew(crews[0] || '');
      } else {
        setCrew('');
      }
    } else {
      setCrew('');
    }
  }

  function handleDepartmentChange(nextDept) {
    setDepartment(nextDept);
    setError('');
    setMessage('');
    if (currentRoleConfig?.requiresCrew) {
      const crews = getCrewsForDepartment(nextDept);
      setCrew(crews[0] || '');
    } else {
      setCrew('');
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError('');
    setMessage('');

    try {
      const created = await registerInternalUser({
        fullName,
        email,
        role: effectiveRole,
        department,
        crew: currentRoleConfig?.requiresCrew ? crew : '',
      });
      const updatedUsers = await getInternalUsers();
      setUsers(updatedUsers);
      setFullName('');
      setEmail('');
      if (bootstrapRequired) {
        setRole('gestor');
        setDepartment(municipalDepartments[0] || '');
        setCrew('');
      }
      setMessage(
        `Cuenta creada para ${created.fullName} (${created.roleLabel}) con acceso exclusivo a ${created.authorizedModules.length} módulos autorizados.`,
      );
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'No se pudo registrar el funcionario.',
      );
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function handleToggleActive(account) {
    if (updatingId || busyRef.current) return;
    setUpdatingId(account.id);
    setError('');
    setMessage('');
    try {
      const nextActive = account.active === false;
      const updated = await setInternalUserActiveStatus(account.id, nextActive);
      setUsers((previous) =>
        previous.map((item) => (item.id === updated.id ? updated : item)),
      );
      setMessage(
        updated.active
          ? `Se reactivó el acceso de ${updated.fullName}.`
          : `Se desactivó el acceso de ${updated.fullName}.`,
      );
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'No se pudo cambiar el estado de la cuenta.',
      );
    } finally {
      setUpdatingId('');
    }
  }

  return (
    <section>
      <h1>Administración de usuarios y roles</h1>
      <p className="lead">
        Registra las cuentas internas de gestores municipales, encargados de cuadrilla y administradores, vinculándolas a su dependencia para habilitar únicamente las herramientas propias de cada perfil.
      </p>

      {bootstrapRequired && (
        <div className="user-admin-bootstrap" role="status">
          <h2>Configuración inicial del primer administrador</h2>
          <p>
            Aún no hay cuentas administrativas registradas en este navegador. Crea primero una cuenta con el rol <strong>Administrador</strong> para habilitar el registro de gestores y cuadrillas.
          </p>
        </div>
      )}

      {error && <p className="error-message" role="alert">{error}</p>}
      {message && <p className="success-message" role="status">{message}</p>}

      <form className="user-admin-form" onSubmit={handleSubmit}>
        <h2>Registrar funcionario municipal</h2>
        <div className="user-admin-grid">
          <label htmlFor="staff-fullname">
            Nombre completo
            <input
              id="staff-fullname"
              type="text"
              required
              maxLength={120}
              placeholder="Ejemplo: Gestoría Vial Norte"
              value={fullName}
              disabled={busy}
              onChange={(event) => setFullName(event.target.value)}
            />
          </label>

          <label htmlFor="staff-email">
            Correo institucional
            <input
              id="staff-email"
              type="email"
              required
              maxLength={160}
              placeholder="ejemplo@municipalidad.local"
              value={email}
              disabled={busy}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          <label htmlFor="staff-role">
            Rol asignado
            <select
              id="staff-role"
              value={effectiveRole}
              disabled={busy || bootstrapRequired}
              onChange={(event) => handleRoleChange(event.target.value)}
            >
              {INTERNAL_STAFF_ROLES.map((roleKey) => (
                <option key={roleKey} value={roleKey}>
                  {ROLE_CATALOG[roleKey].label}
                </option>
              ))}
            </select>
          </label>

          <label htmlFor="staff-department">
            {currentRoleConfig?.requiresDepartment
              ? 'Dependencia municipal'
              : 'Dependencia municipal (opcional)'}
            <select
              id="staff-department"
              required={Boolean(currentRoleConfig?.requiresDepartment)}
              value={department}
              disabled={busy}
              onChange={(event) => handleDepartmentChange(event.target.value)}
            >
              {!currentRoleConfig?.requiresDepartment && (
                <option value="">Administración general (todas las áreas)</option>
              )}
              {municipalDepartments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </label>

          {currentRoleConfig?.requiresCrew && (
            <label htmlFor="staff-crew">
              Cuadrilla vinculada
              <select
                id="staff-crew"
                required
                value={crew}
                disabled={busy || availableCrews.length === 0}
                onChange={(event) => setCrew(event.target.value)}
              >
                {availableCrews.map((crewName) => (
                  <option key={crewName} value={crewName}>
                    {crewName}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        <div className="role-modules-preview" aria-live="polite">
          <h3>
            Módulos autorizados exclusivamente para {currentRoleConfig?.label}:
          </h3>
          <ul className="module-chip-list">
            {previewModules.map((mod) => (
              <li key={mod.key} className="module-chip">
                {mod.label}
              </li>
            ))}
          </ul>
        </div>

        <div className="actions">
          <button type="submit" disabled={busy}>
            {busy ? 'Guardando cuenta…' : 'Guardar funcionario'}
          </button>
        </div>
      </form>

      <h2>Funcionarios registrados</h2>
      {loading ? (
        <p role="status">Cargando cuentas internas…</p>
      ) : users.length === 0 ? (
        <p role="status">Aún no se han registrado cuentas de funcionarios.</p>
      ) : (
        <ul className="staff-list">
          {users.map((account) => {
            const isSoleActiveAdmin =
              account.role === 'administrador' &&
              account.active !== false &&
              activeAdminCount <= 1;
            const modules = (account.authorizedModules || [])
              .map((key) => SYSTEM_MODULES[key]?.label || key)
              .filter(Boolean);

            return (
              <li
                key={account.id}
                className={`staff-card ${
                  account.active === false ? 'staff-card-inactive' : ''
                }`}
              >
                <div className="staff-card-header">
                  <strong>{account.fullName}</strong>
                  <div className="staff-card-badges">
                    <span className="staff-role-badge">
                      {account.roleLabel || ROLE_CATALOG[account.role]?.label || account.role}
                    </span>
                    <span
                      className={`staff-status-badge ${
                        account.active === false
                          ? 'staff-status-inactive'
                          : 'staff-status-active'
                      }`}
                    >
                      {account.active === false ? 'Acceso desactivado' : 'Acceso activo'}
                    </span>
                  </div>
                </div>

                <p className="staff-card-meta">
                  Correo: <strong>{account.email}</strong> · Dependencia:{' '}
                  <strong>
                    {account.department || 'Administración general'}
                  </strong>
                  {account.crew ? ` · Cuadrilla: ${account.crew}` : ''}
                </p>
                <p className="staff-card-meta">
                  Registrado el {formatDateTime(account.createdAt)}
                </p>

                <div>
                  <strong>Módulos habilitados para su perfil:</strong>
                  <ul className="module-chip-list">
                    {modules.map((label) => (
                      <li key={label} className="module-chip">
                        {label}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="staff-card-actions">
                  <button
                    type="button"
                    className="secondary"
                    disabled={Boolean(updatingId) || isSoleActiveAdmin}
                    onClick={() => {
                      void handleToggleActive(account);
                    }}
                  >
                    {account.active === false ? 'Reactivar acceso' : 'Desactivar acceso'}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
