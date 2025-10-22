// admin.js
// Lógica de la página de administración de Metrored. Permite gestionar
// tarifarios por aseguradora, ver logs de cotizaciones y administrar usuarios.

document.addEventListener('DOMContentLoaded', async () => {
  const { username, role } = getSessionUser();
  if (!username || role !== 'admin') {
    window.location.href = 'index.html';
    return;
  }
  // Saludo y acción de salida
  document.getElementById('adminGreeting').textContent = `Hola, ${username}`;
  document.getElementById('adminLogout').addEventListener('click', logout);

  // Cargar tarifario base y preparar las aseguradoras fijas
  await ensureTarifarioDataset();

  // Renderizar vistas iniciales
  renderUsers();
  renderInsurerTariffManager();
  renderInsurerLogos();
  renderMetroredLogoManager();

  // Preparar descarga de logs: se gestiona desde downloadLogBtn
  const downloadBtn = document.getElementById('downloadLogBtn');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', downloadLogs);
  }

  const templateBtn = document.getElementById('downloadTemplateBtn');
  if (templateBtn) {
    templateBtn.addEventListener('click', downloadTarifarioTemplate);
  }

  // Evento para agregar un usuario nuevo
  document.getElementById('addUserBtn').addEventListener('click', () => {
    const usernameInput = document.getElementById('newUsername');
    const passwordInput = document.getElementById('newPassword');
    const roleSelect = document.getElementById('newRole');
    const userMessage = document.getElementById('userMessage');
    userMessage.textContent = '';
    userMessage.style.color = '';
    const uname = usernameInput.value.trim();
    const pass = passwordInput.value;
    const roleVal = roleSelect.value;
    if (!uname || !pass) {
      userMessage.textContent = 'Usuario y contraseña son obligatorios';
      userMessage.style.color = 'red';
      return;
    }
    const users = getUsers();
    if (users[uname]) {
      userMessage.textContent = 'El usuario ya existe';
      userMessage.style.color = 'red';
      return;
    }
    users[uname] = { password: pass, role: roleVal };
    saveUsers(users);
    // Limpiar campos
    usernameInput.value = '';
    passwordInput.value = '';
    roleSelect.value = 'asesor';
    userMessage.textContent = 'Usuario añadido correctamente';
    userMessage.style.color = 'green';
    renderUsers();
  });

  /**
   * Sección de excepciones de cobertura: permite buscar exámenes y añadirlos a una lista de excepciones
   * para que no se aplique cobertura en el cotizador. Usa appState.examenes como base de búsqueda.
   */
  const exceptionSearchInput = document.getElementById('exceptionSearch');
  const exceptionResults = document.getElementById('exceptionResults');
  const exceptionResultsUl = document.getElementById('exceptionResultsUl');
  const exceptionsListElem = document.getElementById('exceptionsList');
  // Cargar excepciones desde localStorage
  let exceptions = loadExceptions();
  renderExceptions();
  // Buscador de exámenes para excepciones
  if (exceptionSearchInput) {
    exceptionSearchInput.addEventListener('input', () => {
      const query = exceptionSearchInput.value.trim().toLowerCase();
      if (query.length >= 2) {
        const exams = appState.examenes || [];
        const results = exams.filter((ex) => {
          return (
            ex.descripcion.toLowerCase().includes(query) ||
            ex.codigo.toLowerCase().includes(query)
          );
        }).slice(0, 20);
        if (results.length > 0) {
          exceptionResultsUl.innerHTML = '';
          results.forEach((ex) => {
            const li = document.createElement('li');
            li.textContent = `${ex.codigo} – ${ex.descripcion}`;
            li.addEventListener('click', () => {
              addException(ex.codigo);
              exceptionResults.style.display = 'none';
              exceptionSearchInput.value = '';
            });
            exceptionResultsUl.appendChild(li);
          });
          exceptionResults.style.display = 'block';
        } else {
          exceptionResults.style.display = 'none';
        }
      } else {
        exceptionResults.style.display = 'none';
      }
    });
  }
  // Funciones para excepciones
  function loadExceptions() {
    const stored = localStorage.getItem('exceptions');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        localStorage.removeItem('exceptions');
      }
    }
    return [];
  }
  function saveExceptions(list) {
    localStorage.setItem('exceptions', JSON.stringify(list));
  }
  function renderExceptions() {
    exceptionsListElem.innerHTML = '';
    if (!exceptions || exceptions.length === 0) {
      const li = document.createElement('li');
      li.textContent = 'No hay exámenes sin cobertura.';
      exceptionsListElem.appendChild(li);
      return;
    }
    exceptions.forEach((code) => {
      const exam = (appState.examenes || []).find((e) => e.codigo === code);
      const name = exam ? exam.descripcion : code;
      const li = document.createElement('li');
      li.style.display = 'flex';
      li.style.alignItems = 'center';
      const span = document.createElement('span');
      span.style.flex = '1';
      span.textContent = `${code} – ${name}`;
      li.appendChild(span);
      const btn = document.createElement('button');
      btn.textContent = 'Quitar';
      btn.className = 'btn btn-small';
      btn.addEventListener('click', () => {
        exceptions = exceptions.filter((c) => c !== code);
        saveExceptions(exceptions);
        renderExceptions();
      });
      li.appendChild(btn);
      exceptionsListElem.appendChild(li);
    });
  }
  function addException(code) {
    if (!exceptions.includes(code)) {
      exceptions.push(code);
      saveExceptions(exceptions);
      renderExceptions();
    }
  }
});

/**
 * Convierte un archivo a DataURL usando FileReader. Retorna una promesa.
 * @param {File} file
 */
function fileToDataURL(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

/**
 * Garantiza que exista un dataset base en appState y localStorage, además de
 * inicializar la lista fija de aseguradoras y normalizar las tarifas existentes.
 */
async function ensureTarifarioDataset() {
  await loadTarifario();
  if (!appState.data) {
    appState.data = { aseguradoras: ['Particular'], examenes: [] };
  }
  if (!Array.isArray(appState.data.examenes)) {
    appState.data.examenes = [];
  }
  const insurers = ensureFixedInsurersList();
  const fullList = Array.from(new Set(['Particular', ...insurers]));
  appState.data.aseguradoras = fullList;
  appState.aseguradoras = fullList;
  appState.examenes = appState.data.examenes;
  appState.data.examenes.forEach((exam) => {
    if (!exam.tarifas) {
      exam.tarifas = {};
    }
    insurers.forEach((ins) => {
      if (!(ins in exam.tarifas)) {
        exam.tarifas[ins] = null;
      }
    });
  });
  localStorage.setItem('tarifarioData', JSON.stringify(appState.data));
}

/**
 * Devuelve la lista de aseguradoras fijas para la gestión de tarifarios.
 */
function getFixedInsurers() {
  return ensureFixedInsurersList();
}

/**
 * Lee o inicializa la lista fija de aseguradoras a partir del dataset actual.
 */
function ensureFixedInsurersList() {
  const stored = localStorage.getItem('fixedInsurers');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed.filter((ins) => typeof ins === 'string' && ins.trim().length > 0);
      }
    } catch (e) {
      console.error('No se pudo parsear fixedInsurers', e);
      localStorage.removeItem('fixedInsurers');
    }
  }
  const base = appState.data && Array.isArray(appState.data.aseguradoras)
    ? appState.data.aseguradoras.filter((ins) => ins && ins !== 'Particular')
    : [];
  const unique = Array.from(new Set(base));
  localStorage.setItem('fixedInsurers', JSON.stringify(unique));
  return unique;
}

/**
 * Renderiza los cargadores de tarifarios por aseguradora con su estado actual.
 */
function renderInsurerTariffManager() {
  const listElem = document.getElementById('insurerTarifarioList');
  if (!listElem) return;
  listElem.innerHTML = '';
  const insurers = getFixedInsurers();
  const meta = loadTarifarioUpdateMeta();
  const globalMessage = document.getElementById('tarifarioUploadMessage');
  if (globalMessage) {
    globalMessage.textContent = '';
    globalMessage.style.color = '';
  }
  if (!insurers || insurers.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'No hay aseguradoras configuradas en el tarifario actual.';
    listElem.appendChild(li);
    if (globalMessage) {
      globalMessage.textContent = 'Actualice el tarifario base para definir las aseguradoras disponibles.';
      globalMessage.style.color = 'red';
    }
    return;
  }
  insurers.forEach((insurer) => {
    const li = document.createElement('li');
    li.style.display = 'flex';
    li.style.flexDirection = 'column';
    li.style.alignItems = 'flex-start';
    li.style.gap = '6px';

    const headerRow = document.createElement('div');
    headerRow.style.display = 'flex';
    headerRow.style.alignItems = 'center';
    headerRow.style.gap = '10px';

    const nameSpan = document.createElement('span');
    nameSpan.textContent = insurer;
    nameSpan.style.fontWeight = '600';
    headerRow.appendChild(nameSpan);

    const uploadBtn = document.createElement('button');
    uploadBtn.textContent = 'Cargar tarifario';
    uploadBtn.className = 'btn';
    uploadBtn.style.fontSize = '12px';
    headerRow.appendChild(uploadBtn);

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.xlsx';
    fileInput.style.display = 'none';

    uploadBtn.addEventListener('click', () => fileInput.click());

    headerRow.appendChild(fileInput);
    li.appendChild(headerRow);

    const status = document.createElement('span');
    status.className = 'message';
    status.style.fontSize = '12px';
    status.style.color = '#555';
    const metaInfo = meta && meta[insurer];
    if (metaInfo) {
      status.textContent = formatInsurerUpdateStatus(metaInfo);
      status.style.color = '#0a7a0a';
    } else {
      status.textContent = 'Sin cargas registradas.';
    }
    li.appendChild(status);

    fileInput.addEventListener('change', async () => {
      const file = fileInput.files[0];
      if (!file) return;
      status.style.color = '#333';
      status.textContent = 'Procesando archivo...';
      try {
        const parsed = await parseInsurerTarifarioFile(file, insurer);
        const result = applyInsurerTarifarioUpdate(insurer, parsed.rows);
        const metaMap = loadTarifarioUpdateMeta();
        metaMap[insurer] = {
          updatedAt: new Date().toISOString(),
          processed: parsed.rows.length,
          updated: result.updatedCount,
          created: result.createdCount,
        };
        saveTarifarioUpdateMeta(metaMap);
        status.style.color = '#0a7a0a';
        status.textContent = formatInsurerUpdateStatus(metaMap[insurer]);
        renderInsurerLogos();
      } catch (err) {
        console.error('Error al actualizar tarifario de aseguradora', err);
        status.style.color = 'red';
        status.textContent = err && err.message ? `Error: ${err.message}` : 'Error al procesar el archivo.';
      } finally {
        fileInput.value = '';
      }
    });

    listElem.appendChild(li);
  });
}

/**
 * Analiza un archivo Excel de tarifario para una aseguradora específica.
 * @param {File} file
 * @param {string} insurerName
 * @returns {Promise<{rows: Array}>}
 */
function parseInsurerTarifarioFile(file, insurerName) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          throw new Error('El archivo no contiene hojas.');
        }
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet, { defval: null });
        if (!rows || rows.length === 0) {
          throw new Error('El archivo no contiene registros.');
        }
        const headerLookup = buildHeaderLookup(rows);
        const codeHeader = findHeaderKey(headerLookup, ['codigo', 'código', 'cod']);
        if (!codeHeader) {
          throw new Error('No se encontró la columna "CODIGO".');
        }
        const descriptionHeader = findHeaderKey(headerLookup, ['descripcion', 'descripción', 'detalle', 'nombre']);
        const groupHeader = findHeaderKey(headerLookup, ['grupo', 'categoria']);
        const priceHeader = findHeaderKey(headerLookup, ['precio', 'pvp', 'preciopublico', 'valorpublico']);
        const normalizedInsurer = normalizeHeaderKey(insurerName);
        const tariffHeader = findHeaderKey(headerLookup, [
          insurerName,
          normalizedInsurer,
          `${normalizedInsurer}tarifa`,
          `${normalizedInsurer}pva`,
          'tarifa',
          'valor',
          'pva',
          'precioaseguradora',
          'valoraseguradora',
        ]);
        if (!tariffHeader) {
          throw new Error(`No se encontró una columna de tarifa para ${insurerName}.`);
        }
        const parsedRows = [];
        rows.forEach((row) => {
          const codigo = normalizeCode(row[codeHeader]);
          if (!codigo) return;
          const descripcion = descriptionHeader ? sanitizeText(row[descriptionHeader]) : '';
          const grupo = groupHeader ? sanitizeText(row[groupHeader]) : '';
          const precio = priceHeader ? parseNumeric(row[priceHeader]) : null;
          const tarifa = parseNumeric(row[tariffHeader]);
          parsedRows.push({ codigo, descripcion, grupo, precio, tarifa });
        });
        if (parsedRows.length === 0) {
          throw new Error('No se encontraron filas válidas en el archivo.');
        }
        resolve({ rows: parsedRows });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('No se pudo leer el archivo seleccionado.'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Aplica los cambios del tarifario cargado a la data general.
 * @param {string} insurerName
 * @param {Array} rows
 * @returns {{updatedCount: number, createdCount: number}}
 */
function applyInsurerTarifarioUpdate(insurerName, rows) {
  if (!appState.data) {
    appState.data = { aseguradoras: ['Particular'], examenes: [] };
  }
  if (!Array.isArray(appState.data.examenes)) {
    appState.data.examenes = [];
  }
  const insurers = getFixedInsurers();
  const allInsurers = new Set(['Particular', ...insurers, insurerName]);
  appState.data.aseguradoras = Array.from(allInsurers);
  appState.aseguradoras = appState.data.aseguradoras;

  const examMap = new Map();
  appState.data.examenes.forEach((exam) => {
    if (exam && exam.codigo) {
      examMap.set(exam.codigo, exam);
    }
  });

  let updatedCount = 0;
  let createdCount = 0;

  rows.forEach((row) => {
    if (!row || !row.codigo) {
      return;
    }
    let exam = examMap.get(row.codigo);
    if (!exam) {
      exam = {
        codigo: row.codigo,
        descripcion: row.descripcion || '',
        grupo: row.grupo || '',
        precio: row.precio != null && !isNaN(row.precio) ? row.precio : 0,
        tarifas: {},
      };
      appState.data.examenes.push(exam);
      examMap.set(row.codigo, exam);
      createdCount += 1;
    } else {
      if (row.descripcion) {
        exam.descripcion = row.descripcion;
      }
      if (row.grupo) {
        exam.grupo = row.grupo;
      }
      if (row.precio != null && !isNaN(row.precio)) {
        exam.precio = row.precio;
      }
    }
    if (!exam.tarifas) {
      exam.tarifas = {};
    }
    exam.tarifas[insurerName] = row.tarifa != null && !isNaN(row.tarifa) ? row.tarifa : null;
    updatedCount += 1;
  });

  appState.data.examenes.forEach((exam) => {
    if (!exam.tarifas) {
      exam.tarifas = {};
    }
    appState.data.aseguradoras.forEach((ins) => {
      if (ins === 'Particular') return;
      if (!(ins in exam.tarifas)) {
        exam.tarifas[ins] = null;
      }
    });
  });

  appState.data.examenes.sort((a, b) => a.codigo.localeCompare(b.codigo));
  appState.examenes = appState.data.examenes;
  localStorage.setItem('tarifarioData', JSON.stringify(appState.data));

  return { updatedCount, createdCount };
}

/**
 * Genera un mapa de encabezados normalizados a partir de las filas leídas del Excel.
 */
function buildHeaderLookup(rows) {
  const lookup = {};
  rows.forEach((row) => {
    Object.keys(row).forEach((key) => {
      const normalized = normalizeHeaderKey(key);
      if (normalized && !(normalized in lookup)) {
        lookup[normalized] = key;
      }
    });
  });
  return lookup;
}

/**
 * Busca el encabezado original correspondiente a alguna de las variantes proporcionadas.
 */
function findHeaderKey(lookup, candidates) {
  if (!lookup) return null;
  for (const candidate of candidates) {
    if (!candidate) continue;
    const normalizedCandidate = normalizeHeaderKey(candidate);
    if (normalizedCandidate && lookup[normalizedCandidate]) {
      return lookup[normalizedCandidate];
    }
  }
  return null;
}

/**
 * Normaliza una clave de encabezado eliminando espacios, signos y tildes.
 */
function normalizeHeaderKey(key) {
  if (!key && key !== 0) return '';
  return key
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

/**
 * Convierte valores numéricos expresados como string o número a un número flotante.
 */
function parseNumeric(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'number' && !isNaN(value)) return value;
  const str = value.toString().trim();
  if (!str) return null;
  let normalized = str.replace(/\s+/g, '');
  const hasComma = normalized.includes(',');
  const hasDot = normalized.includes('.');
  if (hasComma && hasDot) {
    if (normalized.lastIndexOf(',') > normalized.lastIndexOf('.')) {
      normalized = normalized.replace(/\./g, '').replace(',', '.');
    } else {
      normalized = normalized.replace(/,/g, '');
    }
  } else if (hasComma) {
    normalized = normalized.replace(',', '.');
  } else if ((normalized.match(/\./g) || []).length > 1) {
    const parts = normalized.split('.');
    normalized = parts.slice(0, -1).join('') + '.' + parts[parts.length - 1];
  }
  const num = parseFloat(normalized);
  return Number.isNaN(num) ? null : num;
}

/**
 * Normaliza códigos numéricos provenientes de Excel (elimina decimales residuales).
 */
function normalizeCode(value) {
  if (value == null || value === '') return '';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return '';
    return Math.trunc(value).toString();
  }
  let str = value.toString().trim();
  if (!str) return '';
  str = str.replace(/\s+/g, '');
  if (/^\d+\.0+$/.test(str)) {
    return str.split('.')[0];
  }
  return str;
}

/**
 * Limpia valores de texto eliminando espacios extra y convirtiendo a string.
 */
function sanitizeText(value) {
  if (value == null) return '';
  return value.toString().trim();
}

/**
 * Lee el estado de actualizaciones por aseguradora desde localStorage.
 */
function loadTarifarioUpdateMeta() {
  const stored = localStorage.getItem('tarifarioUpdateMeta');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    } catch (e) {
      console.error('No se pudo parsear tarifarioUpdateMeta', e);
      localStorage.removeItem('tarifarioUpdateMeta');
    }
  }
  return {};
}

/**
 * Guarda el estado de actualizaciones por aseguradora en localStorage.
 */
function saveTarifarioUpdateMeta(meta) {
  localStorage.setItem('tarifarioUpdateMeta', JSON.stringify(meta));
}

/**
 * Formatea el mensaje de estado mostrado bajo cada aseguradora.
 */
function formatInsurerUpdateStatus(meta) {
  if (!meta) return 'Sin cargas registradas.';
  const updated = typeof meta.updated === 'number' ? meta.updated : meta.processed || 0;
  const created = typeof meta.created === 'number' ? meta.created : 0;
  let dateLabel = meta.updatedAt;
  if (meta.updatedAt) {
    const parsedDate = new Date(meta.updatedAt);
    if (!Number.isNaN(parsedDate.getTime())) {
      dateLabel = parsedDate.toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' });
    }
  }
  if (created > 0) {
    return `Actualizado ${updated} registros (${created} nuevos) el ${dateLabel}.`;
  }
  return `Actualizado ${updated} registros el ${dateLabel}.`;
}

/**
 * Genera un archivo CSV con el historial de cotizaciones y lo descarga.
 */
function downloadLogs() {
  const logMessage = document.getElementById('logDownloadMessage');
  if (logMessage) {
    logMessage.textContent = '';
    logMessage.style.color = '';
  }
  const stored = localStorage.getItem('quotesLog');
  if (!stored) {
    if (logMessage) {
      logMessage.textContent = 'No hay cotizaciones registradas.';
      logMessage.style.color = 'red';
    }
    return;
  }
  let logs;
  try {
    logs = JSON.parse(stored);
  } catch (e) {
    console.error('Error al parsear logs', e);
    if (logMessage) {
      logMessage.textContent = 'Error al leer los registros.';
      logMessage.style.color = 'red';
    }
    return;
  }
  if (!logs || logs.length === 0) {
    if (logMessage) {
      logMessage.textContent = 'No hay cotizaciones registradas.';
      logMessage.style.color = 'red';
    }
    return;
  }
  const csvRows = [];
  csvRows.push('Fecha,Asesor,Paciente,Aseguradora,Subtotal,Cobertura(%),Total');
  logs.forEach((log) => {
    const fields = [
      log.timestamp || '',
      log.asesor || '',
      log.paciente || '',
      log.aseguradora || '',
      log.subtotal != null ? formatCurrency(log.subtotal) : '',
      log.coverage != null ? log.coverage.toString() : '',
      log.total != null ? formatCurrency(log.total) : '',
    ];
    // Escapar comillas dobles duplicándolas
    const escaped = fields.map((f) => {
      const s = String(f);
      if (s.includes('"') || s.includes(',') || s.includes('\n')) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    });
    csvRows.push(escaped.join(','));
  });
  const csvString = csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'historial_cotizaciones.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  if (logMessage) {
    logMessage.textContent = 'Historial descargado correctamente.';
    logMessage.style.color = 'green';
  }
}

/**
 * Genera y descarga una plantilla de tarifario en formato XLSX.
 */
function downloadTarifarioTemplate() {
  if (typeof XLSX === 'undefined' || !XLSX.utils || !XLSX.writeFile) {
    console.error('La librería XLSX no está disponible para generar la plantilla.');
    return;
  }
  const header = ['DESCRIPCIÓN', 'CODIGO', 'GRUPO', 'PRECIO', 'TARIFA'];
  const sampleRows = [
    ['Hemograma completo', 'LAB001', 'Laboratorio', 25, 20],
    ['Resonancia magnética', 'IMG001', 'Imagen', 120, 90],
  ];
  const worksheet = XLSX.utils.aoa_to_sheet([header, ...sampleRows]);
  worksheet['!cols'] = header.map((_, idx) => ({ wch: idx === 0 ? 35 : 18 }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Tarifario');
  XLSX.writeFile(workbook, 'plantilla_tarifario.xlsx');
}

/**
 * Muestra los registros de cotizaciones emitidas en la tabla.
 */
function renderLogs() {
  const tbody = document.getElementById('logTableBody');
  tbody.innerHTML = '';
  const stored = localStorage.getItem('quotesLog');
  if (!stored) {
    return;
  }
  let logs;
  try {
    logs = JSON.parse(stored);
  } catch (e) {
    console.error('Error al parsear logs', e);
    return;
  }
  logs.forEach((log) => {
    const tr = document.createElement('tr');
    const cells = [
      log.timestamp || '',
      log.asesor || '',
      log.paciente || '',
      log.aseguradora || '',
      formatCurrency(log.subtotal || 0),
      log.coverage != null ? log.coverage.toString() : '',
      formatCurrency(log.total || 0),
    ];
    cells.forEach((val) => {
      const td = document.createElement('td');
      td.textContent = val;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

/**
 * Renderiza la lista de usuarios actuales y añade botones para eliminarlos.
 */
function renderUsers() {
  const list = document.getElementById('usersList');
  list.innerHTML = '';
  const users = getUsers();
  const { username } = getSessionUser();
  Object.keys(users).forEach((uname) => {
    const li = document.createElement('li');
    li.style.display = 'flex';
    li.style.alignItems = 'center';
    li.style.gap = '10px';
    const span = document.createElement('span');
    span.textContent = `${uname} (${users[uname].role})`;
    li.appendChild(span);
    // Eliminar botón no se muestra para sí mismo
    if (uname !== username) {
      const delBtn = document.createElement('button');
      delBtn.textContent = 'Eliminar';
      delBtn.className = 'btn';
      delBtn.style.backgroundColor = '#c00';
      delBtn.style.fontSize = '12px';
      delBtn.addEventListener('click', () => {
        if (!confirm('¿Desea eliminar al usuario ' + uname + '?')) return;
        const allUsers = getUsers();
        delete allUsers[uname];
        saveUsers(allUsers);
        renderUsers();
      });
      li.appendChild(delBtn);
    }
    list.appendChild(li);
  });
}

/**
 * Devuelve un mapa de logos por aseguradora almacenados en localStorage.
 * Las claves son los nombres de las aseguradoras y los valores son DataURLs.
 */
function loadLogosByInsurer() {
  const stored = localStorage.getItem('logosByInsurer');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('No se pudo parsear logos por aseguradora', e);
      localStorage.removeItem('logosByInsurer');
    }
  }
  return {};
}

/**
 * Guarda el mapa de logos por aseguradora en localStorage.
 * @param {Object} logos
 */
function saveLogosByInsurer(logos) {
  localStorage.setItem('logosByInsurer', JSON.stringify(logos));
}

/**
 * Renderiza la lista de aseguradoras con la opción de subir o cambiar su logo.
 * Utiliza las aseguradoras definidas en appState (exceptuando "Particular").
 */
function renderInsurerLogos() {
  const listElem = document.getElementById('insurerLogoList');
  if (!listElem) return;
  listElem.innerHTML = '';
  const insurers = getFixedInsurers();
  const logosMap = loadLogosByInsurer();
  if (!insurers || insurers.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'No hay aseguradoras configuradas.';
    listElem.appendChild(li);
    return;
  }
  insurers.forEach((ins) => {
    const li = document.createElement('li');
    li.style.display = 'flex';
    li.style.alignItems = 'center';
    li.style.gap = '10px';
    // nombre
    const nameSpan = document.createElement('span');
    nameSpan.textContent = ins;
    nameSpan.style.minWidth = '120px';
    li.appendChild(nameSpan);
    // preview
    if (logosMap[ins]) {
      const img = document.createElement('img');
      img.src = logosMap[ins];
      img.alt = 'Logo ' + ins;
      img.style.width = '40px';
      img.style.height = 'auto';
      li.appendChild(img);
    }
    // botón para subir/cambiar logo
    const btn = document.createElement('button');
    btn.textContent = logosMap[ins] ? 'Cambiar logo' : 'Subir logo';
    btn.className = 'btn';
    btn.style.fontSize = '12px';
    btn.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.png,.jpg,.jpeg';
      input.onchange = async () => {
        const file = input.files[0];
        if (file) {
          const dataUrl = await fileToDataURL(file);
          const logos = loadLogosByInsurer();
          logos[ins] = dataUrl;
          saveLogosByInsurer(logos);
          renderInsurerLogos();
        }
      };
      input.click();
    });
    li.appendChild(btn);
    listElem.appendChild(li);
  });
}

function renderMetroredLogoManager(feedback) {
  const preview = document.getElementById('metroredLogoPreview');
  const fileInput = document.getElementById('metroredLogoInput');
  const applyBtn = document.getElementById('applyMetroredLogoBtn');
  const resetBtn = document.getElementById('resetMetroredLogoBtn');
  const messageElem = document.getElementById('metroredLogoMessage');
  if (!preview || !fileInput || !applyBtn || !resetBtn || !messageElem) {
    return;
  }

  applyMetroredLogoToPage();

  const pendingLogo = fileInput.dataset.previewData || '';
  const currentLogo = pendingLogo || getCurrentMetroredLogo();
  if (currentLogo) {
    preview.src = currentLogo;
    preview.style.display = 'block';
  } else {
    preview.style.display = 'none';
  }

  const hasOverride = Boolean(getMetroredLogoOverride());
  setButtonEnabled(applyBtn, Boolean(pendingLogo));
  setButtonEnabled(resetBtn, hasOverride);

  fileInput.onchange = async () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) {
      delete fileInput.dataset.previewData;
      const storedLogo = getCurrentMetroredLogo();
      if (storedLogo) {
        preview.src = storedLogo;
        preview.style.display = 'block';
      } else {
        preview.style.display = 'none';
      }
      setButtonEnabled(applyBtn, false);
      messageElem.textContent = 'Seleccione un archivo y luego presione “Guardar logo”.';
      messageElem.style.color = '';
      return;
    }
    messageElem.textContent = 'Procesando logo…';
    messageElem.style.color = '';
    try {
      const dataUrl = await fileToDataURL(file);
      fileInput.dataset.previewData = dataUrl;
      preview.src = dataUrl;
      preview.style.display = 'block';
      setButtonEnabled(applyBtn, true);
      messageElem.textContent = 'Logo listo para guardar. Presione “Guardar logo”.';
      messageElem.style.color = '#333';
    } catch (e) {
      console.error('No se pudo leer el logo de Metrored', e);
      delete fileInput.dataset.previewData;
      setButtonEnabled(applyBtn, false);
      messageElem.textContent = 'No se pudo leer el archivo. Intente nuevamente.';
      messageElem.style.color = 'red';
    }
  };

  applyBtn.onclick = async () => {
    const pending = fileInput.dataset.previewData;
    if (!pending) {
      messageElem.textContent = 'Seleccione un archivo antes de guardar.';
      messageElem.style.color = 'red';
      return;
    }
    messageElem.textContent = 'Guardando logo…';
    messageElem.style.color = '';
    try {
      saveMetroredLogoOverride(pending);
      delete fileInput.dataset.previewData;
      fileInput.value = '';
      renderMetroredLogoManager({
        text: 'Logo de Metrored actualizado correctamente.',
        color: 'green',
      });
    } catch (e) {
      console.error('No se pudo actualizar el logo de Metrored', e);
      renderMetroredLogoManager({
        text: 'No se pudo guardar el logo. Intente nuevamente.',
        color: 'red',
      });
    }
  };

  resetBtn.onclick = () => {
    if (!hasOverride) {
      return;
    }
    clearMetroredLogoOverride();
    delete fileInput.dataset.previewData;
    fileInput.value = '';
    renderMetroredLogoManager({
      text: 'Logo restaurado al diseño original de Metrored.',
      color: 'green',
    });
  };

  if (feedback && feedback.text) {
    messageElem.textContent = feedback.text;
    messageElem.style.color = feedback.color || 'green';
  } else if (!pendingLogo) {
    messageElem.textContent = 'Seleccione un archivo y luego presione “Guardar logo”.';
    messageElem.style.color = '';
  }
}

function getMetroredDefaultLogo() {
  if (
    window.METRORED_ASSETS &&
    window.METRORED_ASSETS.defaults &&
    window.METRORED_ASSETS.defaults.logo
  ) {
    return window.METRORED_ASSETS.defaults.logo;
  }
  return (window.METRORED_ASSETS && window.METRORED_ASSETS.logo) || '';
}

function getMetroredLogoOverride() {
  try {
    return localStorage.getItem('metroredLogoOverride');
  } catch (e) {
    return null;
  }
}

function saveMetroredLogoOverride(dataUrl) {
  try {
    localStorage.setItem('metroredLogoOverride', dataUrl);
  } catch (e) {
    throw e;
  }
}

function clearMetroredLogoOverride() {
  try {
    localStorage.removeItem('metroredLogoOverride');
  } catch (e) {
    console.error('No se pudo limpiar el logo personalizado de Metrored', e);
  }
}

function getCurrentMetroredLogo() {
  return getMetroredLogoOverride() || getMetroredDefaultLogo();
}

function applyMetroredLogoToPage() {
  const logo = getCurrentMetroredLogo();
  if (window.METRORED_ASSETS) {
    window.METRORED_ASSETS.logo = logo;
    if (!window.METRORED_ASSETS.overrides) {
      window.METRORED_ASSETS.overrides = {};
    }
    window.METRORED_ASSETS.overrides.logo = getMetroredLogoOverride();
  }
  const headerLogo = document.getElementById('adminLogo');
  if (headerLogo && logo) {
    headerLogo.src = logo;
  }
}

function setButtonEnabled(button, enabled) {
  if (!button) return;
  button.disabled = !enabled;
  button.style.opacity = enabled ? '' : '0.6';
  button.style.cursor = enabled ? 'pointer' : 'not-allowed';
}

