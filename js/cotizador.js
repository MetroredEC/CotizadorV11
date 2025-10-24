// cotizador.js
// Lógica para la página de cotización de Metrored

document.addEventListener('DOMContentLoaded', async () => {
  // Verificar sesión
  const { username, role } = getSessionUser();
  if (!username || role !== 'asesor') {
    // Redirigir a inicio si no hay sesión o rol incorrecto
    window.location.href = 'index.html';
    return;
  }
  // Saludo y botón de salida
  const greeting = document.getElementById('userGreeting');
  greeting.textContent = `Hola, ${username}`;
  document.getElementById('logoutBtn').addEventListener('click', logout);

  // Cargar tarifario
  await loadTarifario();
  initCotizador();
});

/**
 * Inicializa la lógica de la página de cotización una vez cargados los datos.
 */
function initCotizador() {
  // DOM references
  const aseguradoraSelect = document.getElementById('aseguradoraSelect');
  const coverageGroup = document.getElementById('coverageGroup');
  const coverageInput = document.getElementById('coverageInput');
  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearch');
  const resultsList = document.getElementById('resultsList');
  const resultsUl = document.getElementById('resultsUl');
  const itemsBody = document.getElementById('itemsBody');
  const noItemsMsg = document.getElementById('noItemsMsg');
  const subtotalPvpElem = document.getElementById('subtotalPvp');
  const subtotalPvaElem = document.getElementById('subtotalPva');
  // Elementos para mostrar el copago referencial y los montos sin cobertura.
  const copagoSummary = document.getElementById('copagoSummary');
  const copagoPercElem = document.getElementById('copagoPerc');
  const copagoAmountElem = document.getElementById('copagoAmount');
  const noCoverageSummary = document.getElementById('noCoverageSummary');
  const noCoverageAmountElem = document.getElementById('noCoverageAmount');
  const totalAmountElem = document.getElementById('totalAmount');
  const generatePdfBtn = document.getElementById('generatePdf');
  const generateError = document.getElementById('generateError');
  const clientNameInput = document.getElementById('clientName');
  const clientCedulaInput = document.getElementById('clientCedula');
  const cedulaErrorElem = document.getElementById('cedulaError');

  // Variables de estado
  let cart = [];

  const roundCurrency = (value) => {
    if (!isFinite(value)) {
      return 0;
    }
    return Math.round((value + Number.EPSILON) * 100) / 100;
  };

  function getStoredExceptions() {
    try {
      const raw = localStorage.getItem('exceptions');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('No se pudieron obtener las excepciones almacenadas', e);
    }
    return [];
  }

  function getCoverageContext() {
    const aseguradora = aseguradoraSelect.value;
    let coverageVal = parseFloat(coverageInput.value);
    if (isNaN(coverageVal)) {
      coverageVal = 0;
    }
    coverageVal = Math.min(Math.max(coverageVal, 0), 100);
    const hasInsurer = aseguradora && aseguradora !== 'Particular';
    const copagoPercent = hasInsurer ? 100 - coverageVal : 0;
    const exceptions = hasInsurer ? getStoredExceptions() : [];
    return {
      aseguradora,
      coverage: coverageVal,
      hasInsurer,
      copagoPercent,
      exceptions,
    };
  }

  // Rellena lista de aseguradoras
  aseguradoraSelect.innerHTML = '';
  appState.aseguradoras.forEach((aseg) => {
    const opt = document.createElement('option');
    opt.value = aseg;
    opt.textContent = aseg;
    aseguradoraSelect.appendChild(opt);
  });
  // Función para actualizar visibilidad de cobertura
  function updateCoverageVisibility() {
    const current = aseguradoraSelect.value;
    if (current && current !== 'Particular') {
      coverageGroup.style.display = 'block';
    } else {
      coverageGroup.style.display = 'none';
    }
    updateSummary();
  }
  aseguradoraSelect.addEventListener('change', () => {
    // Si cambia la aseguradora, recalcular precios y mostrar/ocultar cobertura
    updateCoverageVisibility();
    recalcCartPrices();
    renderCart();
  });
  // Inicializar visibilidad
  updateCoverageVisibility();

  // Búsqueda de exámenes
  searchInput.addEventListener('input', () => {
    const query = searchInput.value.trim().toLowerCase();
    if (query.length >= 2) {
      const results = appState.examenes
        .filter((exam) => {
          return (
            exam.descripcion.toLowerCase().includes(query) ||
            exam.codigo.toLowerCase().includes(query)
          );
        })
        .slice(0, 20);
      if (results.length > 0) {
        resultsUl.innerHTML = '';
        results.forEach((exam) => {
          // Calcular precios PVP y PVA para mostrar en la lista de resultados
          const pvp = parseFloat(exam.precio) || 0;
          let pva = null;
          const currentAseg = aseguradoraSelect.value;
          if (currentAseg && currentAseg !== 'Particular' && exam.tarifas) {
            const tarifa = exam.tarifas[currentAseg];
            if (tarifa != null && !isNaN(tarifa)) {
              pva = parseFloat(tarifa);
            }
          }
          const li = document.createElement('li');
          li.innerHTML = `<strong>${exam.codigo}</strong> – ${exam.descripcion}<br/><small>PVP: ${formatCurrency(pvp)} ${pva != null ? '– PVA: ' + formatCurrency(pva) : ''}</small>`;
          li.style.lineHeight = '1.2';
          li.addEventListener('click', () => {
            addExamToCart(exam);
            resultsUl.innerHTML = '';
            resultsList.style.display = 'none';
            searchInput.value = '';
          });
          resultsUl.appendChild(li);
        });
        resultsList.style.display = 'block';
      } else {
        resultsList.style.display = 'none';
      }
    } else {
      resultsList.style.display = 'none';
    }
  });
  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    resultsList.style.display = 'none';
  });

  // Añade examen al carrito
  function addExamToCart(exam) {
    const existing = cart.find((item) => item.codigo === exam.codigo);
    if (existing) {
      existing.cantidad += 1;
    } else {
      const price = getExamPrice(exam, aseguradoraSelect.value);
      cart.push({
        codigo: exam.codigo,
        descripcion: exam.descripcion,
        priceUnit: price,
        cantidad: 1,
        copagoTotal: null,
        copagoCustom: false,
      });
    }
    renderCart();
  }

  // Obtiene el precio para un examen según la aseguradora seleccionada
  function getExamPrice(exam, aseguradora) {
    if (!aseguradora || aseguradora === 'Particular') {
      return parseFloat(exam.precio) || 0;
    }
    const tarifa = exam.tarifas[aseguradora];
    if (tarifa != null && !isNaN(tarifa)) {
      return parseFloat(tarifa);
    }
    return parseFloat(exam.precio) || 0;
  }

  // Recalcula precios unitarios del carrito cuando cambia la aseguradora
  function recalcCartPrices() {
    cart.forEach((item) => {
      const exam = appState.examenes.find((e) => e.codigo === item.codigo);
      if (exam) {
        item.priceUnit = getExamPrice(exam, aseguradoraSelect.value);
        if (!item.copagoCustom) {
          item.copagoTotal = null;
        }
      }
    });
  }

  // Renderiza el carrito en la tabla
  function renderCart() {
    itemsBody.innerHTML = '';
    if (cart.length === 0) {
      noItemsMsg.style.display = 'block';
    } else {
      noItemsMsg.style.display = 'none';
    }
    const { hasInsurer, copagoPercent, exceptions } = getCoverageContext();
    cart.forEach((item, index) => {
      const tr = document.createElement('tr');
      const exam = appState.examenes.find((e) => e.codigo === item.codigo);
      const pvp = exam ? parseFloat(exam.precio) : item.priceUnit;
      let pva = null;
      const currentAseg = aseguradoraSelect.value;
      if (currentAseg && currentAseg !== 'Particular' && exam && exam.tarifas) {
        const tarifa = exam.tarifas[currentAseg];
        if (tarifa != null && !isNaN(tarifa)) {
          pva = parseFloat(tarifa);
        }
      }
      const isException = hasInsurer && exceptions.includes(item.codigo);
      const basePvaUnit = !isNaN(pva) && pva != null ? pva : item.priceUnit;
      if (typeof item.copagoCustom !== 'boolean') {
        item.copagoCustom = false;
      }
      const computeDefaultCopago = (qty) => {
        if (!hasInsurer || isException) {
          return 0;
        }
        return roundCurrency(basePvaUnit * qty * (copagoPercent / 100));
      };
      if (!item.copagoCustom || item.copagoTotal == null) {
        item.copagoTotal = computeDefaultCopago(item.cantidad);
      }
      if (!hasInsurer || isException) {
        item.copagoCustom = false;
        item.copagoTotal = 0;
      }

      const tdCode = document.createElement('td');
      tdCode.textContent = item.codigo;
      tr.appendChild(tdCode);

      const tdDesc = document.createElement('td');
      tdDesc.textContent = item.descripcion;
      tr.appendChild(tdDesc);

      const tdPvp = document.createElement('td');
      tdPvp.textContent = formatCurrency(pvp);
      tr.appendChild(tdPvp);

      const tdPva = document.createElement('td');
      tdPva.textContent = (pva != null) ? formatCurrency(pva) : '-';
      tr.appendChild(tdPva);

      const tdCopago = document.createElement('td');
      let copagoInput = null;
      if (hasInsurer && !isException) {
        copagoInput = document.createElement('input');
        copagoInput.type = 'number';
        copagoInput.min = '0';
        copagoInput.step = '0.01';
        copagoInput.value = item.copagoTotal.toFixed(2);
        copagoInput.className = 'copago-input';
        copagoInput.addEventListener('change', (e) => {
          const rawVal = e.target.value;
          if (rawVal === '') {
            item.copagoCustom = false;
            const defaultVal = computeDefaultCopago(item.cantidad);
            item.copagoTotal = defaultVal;
            copagoInput.value = defaultVal.toFixed(2);
            updateSummary();
            return;
          }
          const parsed = parseFloat(rawVal);
          if (isNaN(parsed) || parsed < 0) {
            copagoInput.value = item.copagoTotal.toFixed(2);
            return;
          }
          const rounded = roundCurrency(parsed);
          const defaultVal = computeDefaultCopago(item.cantidad);
          if (Math.abs(rounded - defaultVal) < 0.005) {
            item.copagoCustom = false;
            item.copagoTotal = defaultVal;
            copagoInput.value = defaultVal.toFixed(2);
          } else {
            item.copagoCustom = true;
            item.copagoTotal = rounded;
            copagoInput.value = rounded.toFixed(2);
          }
          updateSummary();
        });
        tdCopago.appendChild(copagoInput);
      } else {
        tdCopago.textContent = hasInsurer ? 'N/A' : '-';
      }
      tr.appendChild(tdCopago);

      const tdQty = document.createElement('td');
      const qtyInput = document.createElement('input');
      qtyInput.type = 'number';
      qtyInput.min = '1';
      qtyInput.value = item.cantidad;
      const tdTotal = document.createElement('td');
      const refreshTotals = () => {
        tdTotal.textContent = formatCurrency(item.priceUnit * item.cantidad);
        if (copagoInput) {
          const defaultVal = computeDefaultCopago(item.cantidad);
          if (!item.copagoCustom) {
            item.copagoTotal = defaultVal;
            copagoInput.value = defaultVal.toFixed(2);
          }
        }
      };
      qtyInput.addEventListener('change', (e) => {
        const val = parseInt(e.target.value, 10);
        if (isNaN(val) || val < 1) {
          qtyInput.value = item.cantidad;
          return;
        }
        item.cantidad = val;
        if (copagoInput) {
          const defaultVal = computeDefaultCopago(item.cantidad);
          if (!item.copagoCustom) {
            item.copagoTotal = defaultVal;
          }
          copagoInput.value = item.copagoTotal.toFixed(2);
        }
        refreshTotals();
        updateSummary();
      });
      tdQty.appendChild(qtyInput);
      tr.appendChild(tdQty);

      refreshTotals();
      tr.appendChild(tdTotal);

      const tdRemove = document.createElement('td');
      const removeBtn = document.createElement('button');
      removeBtn.textContent = 'Eliminar';
      removeBtn.className = 'btn';
      removeBtn.style.fontSize = '12px';
      removeBtn.addEventListener('click', () => {
        cart.splice(index, 1);
        renderCart();
      });
      tdRemove.appendChild(removeBtn);
      tr.appendChild(tdRemove);
      itemsBody.appendChild(tr);
    });
    updateSummary();
  }

  function calculateSummaryTotals() {
    const { aseguradora, coverage, hasInsurer, copagoPercent, exceptions } =
      getCoverageContext();

    let subtotalPvp = 0;
    let subtotalPva = 0;
    let totalSinCobertura = 0;
    let copagoReferencial = 0;

    cart.forEach((item) => {
      const exam = appState.examenes.find((e) => e.codigo === item.codigo);
      const pvpUnit = exam && !isNaN(parseFloat(exam.precio))
        ? parseFloat(exam.precio)
        : item.priceUnit;
      subtotalPvp += pvpUnit * item.cantidad;

      let pvaUnit = item.priceUnit;
      if (hasInsurer && exam && exam.tarifas) {
        const tarifa = exam.tarifas[aseguradora];
        if (tarifa != null && !isNaN(tarifa)) {
          pvaUnit = parseFloat(tarifa);
        }
      }
      if (isNaN(pvaUnit)) {
        pvaUnit = item.priceUnit;
      }
      subtotalPva += pvaUnit * item.cantidad;

      if (hasInsurer) {
        const isException = exceptions.includes(item.codigo);
        if (isException) {
          totalSinCobertura += pvaUnit * item.cantidad;
          item.copagoCustom = false;
          item.copagoTotal = 0;
        } else {
          const defaultCopago = roundCurrency(
            pvaUnit * item.cantidad * (copagoPercent / 100)
          );
          if (typeof item.copagoCustom !== 'boolean') {
            item.copagoCustom = false;
          }
          if (!item.copagoCustom || item.copagoTotal == null) {
            item.copagoTotal = defaultCopago;
          } else if (!isFinite(item.copagoTotal) || item.copagoTotal < 0) {
            item.copagoTotal = defaultCopago;
            item.copagoCustom = false;
          }
          copagoReferencial += item.copagoTotal;
        }
      }
    });

    if (!hasInsurer) {
      totalSinCobertura = subtotalPva;
      copagoReferencial = 0;
      cart.forEach((item) => {
        item.copagoCustom = false;
        item.copagoTotal = 0;
      });
    }

    copagoReferencial = roundCurrency(copagoReferencial);
    totalSinCobertura = roundCurrency(totalSinCobertura);

    const totalPagar = hasInsurer
      ? roundCurrency(copagoReferencial + totalSinCobertura)
      : roundCurrency(subtotalPva);

    return {
      subtotalPvp,
      subtotalPva,
      copagoReferencial,
      totalSinCobertura,
      totalPagar,
      coverage: hasInsurer ? coverage : null,
      copagoPercent,
      hasInsurer,
      exceptions,
    };
  }

  // Actualiza los totales y copago en el resumen
  function updateSummary() {
    const totals = calculateSummaryTotals();
    subtotalPvpElem.textContent = formatCurrency(totals.subtotalPvp);
    subtotalPvaElem.textContent = formatCurrency(totals.subtotalPva);
    if (totals.hasInsurer) {
      copagoPercElem.textContent = totals.copagoPercent.toString();
      copagoAmountElem.textContent = formatCurrency(totals.copagoReferencial);
      noCoverageAmountElem.textContent = formatCurrency(totals.totalSinCobertura);
      copagoSummary.style.display = 'block';
      noCoverageSummary.style.display = 'block';
    } else {
      copagoSummary.style.display = 'none';
      noCoverageSummary.style.display = 'none';
      copagoAmountElem.textContent = formatCurrency(0);
      noCoverageAmountElem.textContent = formatCurrency(totals.totalSinCobertura);
    }
    totalAmountElem.textContent = formatCurrency(totals.totalPagar);
  }

  // Validación de cédula en tiempo real
  clientCedulaInput.addEventListener('input', () => {
    const ced = clientCedulaInput.value.trim();
    if (ced === '') {
      cedulaErrorElem.textContent = '';
      return;
    }
    if (validarCedula(ced)) {
      cedulaErrorElem.textContent = '';
    } else {
      cedulaErrorElem.textContent = 'Cédula inválida';
    }
  });

  // Evento para actualizar el resumen cuando cambia la cobertura referencial
  coverageInput.addEventListener('input', () => {
    // Limitar valor entre 0 y 100 y redondear a entero
    let val = parseFloat(coverageInput.value);
    if (isNaN(val) || val < 0) val = 0;
    if (val > 100) val = 100;
    coverageInput.value = val;
    renderCart();
  });

  // Acción para generar PDF
  generatePdfBtn.addEventListener('click', async () => {
    generateError.textContent = '';
    try {
      // Validar campos
      const clientName = clientNameInput.value.trim();
      const clientCedula = clientCedulaInput.value.trim();
      if (!clientName) {
        generateError.textContent = 'Ingrese el nombre del cliente';
        return;
      }
      if (!validarCedula(clientCedula)) {
        generateError.textContent = 'Número de cédula inválido';
        return;
      }
      if (cart.length === 0) {
        generateError.textContent = 'Añada al menos un examen para cotizar';
        return;
      }
      // Recoger datos
      const aseguradora = aseguradoraSelect.value;
      const totals = calculateSummaryTotals();
      const coverage = totals.coverage != null ? totals.coverage : 0;
      const copagoPercent = totals.hasInsurer ? totals.copagoPercent : 0;
      const subtotalPvp = totals.subtotalPvp;
      const subtotalPva = totals.subtotalPva;
      const total = totals.totalPagar;
      const copagoReferencial = totals.hasInsurer ? totals.copagoReferencial : 0;
      const totalSinCobertura = totals.totalSinCobertura;

      // Preparar PDF
      const { jsPDF } = window.jspdf;
      // Utilizar formato A4 para mostrar toda la información y permitir texto más grande
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      // Dimensiones de página en milímetros para A4 (210×297)
      const pageWidth = 210;
      const pageHeight = 297;
      // Cargar logos en DataURL: logo de Metrored y logo de la aseguradora
      const metroLogoDataUrl =
        (window.METRORED_ASSETS && window.METRORED_ASSETS.logo) || null;
      if (!metroLogoDataUrl) {
        throw new Error('No se encontró el logo de Metrored para generar el PDF.');
      }
      // Determinar el logo de aseguradora: prioridad al logo cargado por aseguradora, luego el logo asociado al tarifario
      let insurerLogoDataUrl = null;
      try {
        const logosStr = localStorage.getItem('logosByInsurer');
        if (logosStr) {
          const logosObj = JSON.parse(logosStr);
          if (logosObj && logosObj[aseguradora]) {
            insurerLogoDataUrl = logosObj[aseguradora];
          }
        }
      } catch (e) {
        console.warn('No se pudo parsear logosByInsurer', e);
      }
      // Si no hay logo específico pero existe uno en el tarifario, usarlo
      if (!insurerLogoDataUrl) {
        const logoFromTarifario = localStorage.getItem('tarifarioLogo');
        if (logoFromTarifario) {
          insurerLogoDataUrl = logoFromTarifario;
        }
      }
      // Obtener dimensiones reales de los logos para respetar la relación de aspecto al escalarlos
      const metroLogoNaturalSize = await getImageDimensions(metroLogoDataUrl).catch(() => null);
      const insurerLogoNaturalSize = insurerLogoDataUrl
        ? await getImageDimensions(insurerLogoDataUrl).catch(() => null)
        : null;
      const metroLogoPdfAsset = await resolveImageForPdf(metroLogoDataUrl, metroLogoNaturalSize);
      const insurerLogoPdfAsset = insurerLogoDataUrl
        ? await resolveImageForPdf(insurerLogoDataUrl, insurerLogoNaturalSize)
        : null;
      const metroLogoScale = 1.5;
      const metroLogoTargetWidth = 23 * metroLogoScale; // 50% más ancho que el tamaño original
      const metroLogoWidth = metroLogoTargetWidth;
      const metroLogoHeight = metroLogoNaturalSize
        ? parseFloat(
            ((metroLogoNaturalSize.height / metroLogoNaturalSize.width) * metroLogoTargetWidth).toFixed(2)
          )
        : 7 * metroLogoScale;
      let insurerLogoWidth = null;
      let insurerLogoHeight = null;
      if (insurerLogoDataUrl) {
        if (insurerLogoNaturalSize) {
          const maxWidth = metroLogoWidth;
          const maxHeight = metroLogoHeight;
          const widthScale = maxWidth / insurerLogoNaturalSize.width;
          const heightScale = maxHeight / insurerLogoNaturalSize.height;
          const insurerScale = Math.min(widthScale, heightScale);
          insurerLogoWidth = parseFloat((insurerLogoNaturalSize.width * insurerScale).toFixed(2));
          insurerLogoHeight = parseFloat((insurerLogoNaturalSize.height * insurerScale).toFixed(2));
        } else {
          insurerLogoWidth = metroLogoWidth;
          insurerLogoHeight = metroLogoHeight;
        }
      }
      const metroLogoImageForPdf = metroLogoPdfAsset ? metroLogoPdfAsset.dataUrl : metroLogoDataUrl;
      const metroLogoImageFormat = metroLogoPdfAsset ? metroLogoPdfAsset.format : 'PNG';
      const insurerLogoImageForPdf = insurerLogoPdfAsset
        ? insurerLogoPdfAsset.dataUrl
        : insurerLogoDataUrl;
      const insurerLogoImageFormat = insurerLogoPdfAsset ? insurerLogoPdfAsset.format : 'PNG';

      // Definiciones de layout
      // Altura de cada fila en la tabla. Para A4 usamos filas más altas para evitar superposiciones
      // Aumentamos ligeramente la altura para garantizar que el encabezado de la tabla
      // y las filas de los exámenes no se superpongan visualmente incluso con textos largos.
      const rowHeight = 9;
      // Márgenes del documento en A4. Dejar 10 mm a cada lado para texto más grande
      const margin = 10;
      const logoY = margin + 2;
      const logosMaxHeight = Math.max(metroLogoHeight, insurerLogoHeight || 0);
      const titleOffsetFromLogos = 10;
      const titleY = logoY + logosMaxHeight + titleOffsetFromLogos;
      const detailsBlankRowHeight = rowHeight; // Altura de la fila en blanco entre el título y la información del cliente
      const detailsStartSpacing = 12 + detailsBlankRowHeight;
      // Espacio adicional entre el título y la tabla de información del cliente
      const detailsStartY = titleY + detailsStartSpacing;
    const detailLineSpacing = 4;
    const detailLinesCount = 4;
    const headerBottomPadding = 12;
    // Calcular número de cotización y fechas
    const quoteNumber = String(Date.now() % 1000000).padStart(6, '0');
    const todayDate = new Date();
    const dayStr = String(todayDate.getDate()).padStart(2, '0');
    const monthStr = String(todayDate.getMonth() + 1).padStart(2, '0');
    const yearStr = todayDate.getFullYear();
    const quoteDateStr = `${dayStr}-${monthStr}-${yearStr}`;
    const dueDate = new Date(todayDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    const dueDayStr = String(dueDate.getDate()).padStart(2, '0');
    const dueMonthStr = String(dueDate.getMonth() + 1).padStart(2, '0');
    const dueYearStr = dueDate.getFullYear();
    const dueDateStr = `${dueDayStr}-${dueMonthStr}-${dueYearStr}`;
    // Copago porcentual para mostrar en el encabezado
    const copagoPercentHeader = totals.hasInsurer ? copagoPercent : 0;
    // Determinar la altura del resumen (cinco filas para aseguradora, cuatro para particular)
    const resumenLineas = totals.hasInsurer ? 5 : 4;
    const resumenHeight = resumenLineas * rowHeight + 4; // Altura del resumen con margen interno
    // Calcular cuántas filas caben por página
    // Primer margen para header y espacio después del header (deja lugar para detalles y encabezado de tabla)
    // Altura aproximada de la cabecera (incluyendo logos y detalles). Para A4 damos más espacio
    const headerYEnd =
      detailsStartY + (detailLinesCount - 1) * detailLineSpacing + headerBottomPadding;
    // Desplazamiento adicional entre la información del header y el encabezado de la tabla.
    const tableHeaderYOffset = 6;
    // Posición base del encabezado de la tabla en el eje Y.
    const tableHeaderYPos = headerYEnd + tableHeaderYOffset;
    // Espacio adicional entre el encabezado de la tabla y las filas de datos.
    const tableBodyExtraSpacing = 3;
    // Hacer que la primera fila de contenido se posicione como si fuese la segunda fila
    // real para evitar cualquier superposición con el encabezado.
    const tableBodySkippedRows = 1;
    // Punto inicial del área utilizable para filas de datos.
    const tableContentTop =
      tableHeaderYPos + tableBodyExtraSpacing + tableBodySkippedRows * rowHeight;
    // Altura del pie de página para número de página y textos legales en A4
    const footerHeight = 20;
    const availableHeightNoSummary = pageHeight - tableContentTop - footerHeight;
    const maxRowsNoSummary = Math.floor(availableHeightNoSummary / rowHeight);
    const availableHeightWithSummary =
      pageHeight - tableContentTop - footerHeight - resumenHeight;
    const maxRowsWithSummary = Math.floor(availableHeightWithSummary / rowHeight);
    // Distribuir filas entre páginas
    const filas = cart.map((it) => it);
    const pageRows = [];
    let remaining = filas.length;
    while (remaining > maxRowsWithSummary) {
      pageRows.push(maxRowsNoSummary);
      remaining -= maxRowsNoSummary;
    }
    pageRows.push(remaining);
    const totalPages = pageRows.length;
    let currentRowIndex = 0;
    let pageNum = 1;
    /**
     * Dibuja el encabezado de cada página. Incluye logos, título, detalles del cliente, aseguradora y cotización.
     */
    function drawHeader() {
      // No dibujar marco exterior para formato A4
      // Logos
      // Logo de Metrored a la izquierda
      doc.addImage(
        metroLogoImageForPdf,
        metroLogoImageFormat,
        margin,
        logoY,
        metroLogoWidth,
        metroLogoHeight
      );
      // Logo del seguro a la derecha si existe
      if (insurerLogoDataUrl && insurerLogoWidth && insurerLogoHeight) {
        doc.addImage(
          insurerLogoImageForPdf,
          insurerLogoImageFormat,
          pageWidth - margin - insurerLogoWidth,
          logoY,
          insurerLogoWidth,
          insurerLogoHeight
        );
      }
      // Título centrado con tamaño de letra mayor para A4
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(20);
      doc.text('COTIZACIÓN', pageWidth / 2, titleY, { align: 'center' });
      // Detalles de cliente y cotización en dos columnas. Fuente ligeramente más grande en A4
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      let infoY = detailsStartY;
      const col1X = margin;
      const col2X = pageWidth / 2 + 4;
      // Primera fila
      doc.text(`Cliente: ${clientName}`, col1X, infoY);
      doc.text(`Cédula: ${clientCedula}`, col2X, infoY);
      infoY += detailLineSpacing;
      // Segunda fila: aseguradora y copago/cobertura
      doc.text(`Aseguradora: ${aseguradora}`, col1X, infoY);
      if (aseguradora !== 'Particular') {
        doc.text(`Copago ref.: ${copagoPercentHeader}%`, col2X, infoY);
      }
      infoY += detailLineSpacing;
      // Tercera fila: número de cotización y fecha
      doc.text(`N° Cotización: ${quoteNumber}`, col1X, infoY);
      doc.text(`Fecha: ${quoteDateStr}`, col2X, infoY);
      infoY += detailLineSpacing;
      // Cuarta fila: validez
      doc.text(`Validez hasta: ${dueDateStr}`, col1X, infoY);
      // Línea separadora bajo los detalles
      const yLine = headerYEnd - 3;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, yLine, pageWidth - margin, yLine);
      // Encabezado de la tabla
      const tableHeaderY = tableHeaderYPos;
      const headerLabels = [
        'Código',
        'Descripción',
        'PVP',
        'PVA',
        'Copago',
        'Cant.',
        'Subtotal',
      ];
      // Anchuras de columna adaptadas a formato A4 (suma 190 mm):
      // Código, Descripción, PVP, PVA, Copago, Cant., Subtotal
      const colWidths = [24, 78, 18, 18, 24, 12, 16];
      const xPositions = [margin];
      for (let i = 0; i < colWidths.length - 1; i++) {
        xPositions.push(xPositions[i] + colWidths[i]);
      }
      // Draw background
      doc.setFillColor(0, 91, 171);
      doc.rect(margin, tableHeaderY, pageWidth - 2 * margin, rowHeight, 'F');
      // Draw header text
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      for (let i = 0; i < headerLabels.length; i++) {
        const x = xPositions[i] + 1;
        const align = i >= 2 ? 'right' : 'left';
        const colWidth = colWidths[i];
        let textX = x;
        if (align === 'right') {
          textX = xPositions[i] + colWidths[i] - 1;
        }
        doc.text(headerLabels[i], textX, tableHeaderY + rowHeight - 2, { align: align });
      }
      // Reset text color for body
      doc.setTextColor(0, 0, 0);
    }
    /**
     * Dibuja el pie de página con número de página y texto legal.
     */
    function drawFooter() {
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(7.5);
      doc.setFont('Helvetica', 'normal');
      const footerTop = pageHeight - footerHeight + 4;
      // Número de página
      const pageNumberY = footerTop + 3;
      doc.text(`Página ${pageNum} de ${totalPages}`, margin, pageNumberY);
      // Texto legal (varias líneas si es necesario)
      const legal =
        'Esta cotización tiene carácter informativo y no constituye una oferta o compromiso de venta. Los valores presentados son referenciales y podrán variar según la validación de las condiciones de seguros y coberturas al momento del pago en caja.';
      const maxWidth = pageWidth - 2 * margin - 60;
      // Ajustar texto legal en varias líneas y mantenerlas dentro del alto del footer
      const legalLines = doc.splitTextToSize(legal, maxWidth);
      const legalYStart = footerTop + 3;
      doc.text(legalLines, pageWidth - margin - maxWidth, legalYStart, {
        align: 'left',
      });
    }
    // Función para truncar texto y añadir puntos suspensivos. Se usa para la descripción
    const ellipsis = (s, max) => (s && s.length > max ? s.slice(0, max - 1) + '…' : (s || ''));

    // Variables para dibujo de filas: coinciden con la cabecera
    // Anchos de columnas para A4 (suma 190 mm)
    const colWidths = [24, 78, 18, 18, 24, 12, 16];
    const xPositions = [margin];
    for (let i = 0; i < colWidths.length - 1; i++) {
      xPositions.push(xPositions[i] + colWidths[i]);
    }
    // Dibujar páginas y filas
    let filaIndex = 0;
    for (let p = 0; p < pageRows.length; p++) {
      if (p > 0) {
        doc.addPage();
        pageNum++;
      }
      drawHeader();
      // Y inicial para la primera fila de datos en esta página
      // La primera fila de datos comienza después de omitir explícitamente varias filas adicionales.
      // Sumamos el espacio adicional configurable y el número de filas omitidas para
      // garantizar que el contenido real arranque desde la "cuarta" fila visual.
      let yPos =
        tableHeaderYPos + tableBodyExtraSpacing + (tableBodySkippedRows + 1) * rowHeight;
      const rowsInPage = pageRows[p];
      // Dibujar filas
      doc.setFontSize(9);
      doc.setFont('Helvetica', 'normal');
      for (let i = 0; i < rowsInPage; i++) {
        const item = cart[filaIndex];
        // Encontrar examen original para precios
        const exam = appState.examenes.find((e) => e.codigo === item.codigo);
        const pvp = exam ? parseFloat(exam.precio) : item.priceUnit;
        let pva = '';
        if (aseguradora !== 'Particular') {
          const val = exam && exam.tarifas ? exam.tarifas[aseguradora] : null;
          if (val != null && !isNaN(val)) {
            pva = parseFloat(val);
          }
        }
        // Truncar descripción a una línea con puntos suspensivos para evitar salto al header
        const desc = ellipsis(item.descripcion, 55);
        const isExceptionRow = totals.hasInsurer
          ? totals.exceptions.includes(item.codigo)
          : false;
        let copagoDisplay = '-';
        if (totals.hasInsurer) {
          copagoDisplay = isExceptionRow
            ? 'N/A'
            : formatCurrency((item.copagoTotal || 0));
        }
        // Column values
        const values = [
          item.codigo,
          desc,
          formatCurrency(pvp),
          pva === '' ? '-' : formatCurrency(pva),
          copagoDisplay,
          item.cantidad.toString(),
          formatCurrency(item.priceUnit * item.cantidad),
        ];
        // Y base para la línea
        const baseY = yPos - 2;
        for (let c = 0; c < values.length; c++) {
          const align = c >= 2 ? 'right' : 'left';
          let textX = xPositions[c] + 1;
          if (align === 'right') {
            textX = xPositions[c] + colWidths[c] - 1;
          }
          doc.text(String(values[c]), textX, baseY, { align: align });
        }
        // Línea separadora clara debajo de la fila
        doc.setDrawColor(230);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += rowHeight;
        filaIndex++;
      }
      // Si es la última página, dibujar resumen debajo de la tabla
      if (p === pageRows.length - 1) {
        let summaryY = yPos + 4;
        // Si no hay suficiente espacio, empezar una nueva página
        if (summaryY + resumenHeight + footerHeight > pageHeight - 5) {
          drawFooter();
          doc.addPage();
          pageNum++;
          drawHeader();
          summaryY =
            tableHeaderYPos + tableBodyExtraSpacing + (tableBodySkippedRows + 1) * rowHeight + 4;
        }
        // Construir líneas de resumen con los nuevos totales solicitados
        const summaryLines = [];
        summaryLines.push(['Subtotal PVP', formatCurrency(subtotalPvp)]);
        summaryLines.push(['Subtotal PVA', formatCurrency(subtotalPva)]);
        if (totals.hasInsurer) {
          summaryLines.push([
            `Copago referencial (${copagoPercent}%)`,
            formatCurrency(copagoReferencial),
          ]);
          summaryLines.push(['Total sin cobertura', formatCurrency(totalSinCobertura)]);
        } else {
          summaryLines.push(['Total sin cobertura', formatCurrency(totalSinCobertura)]);
        }
        summaryLines.push(['Total a pagar', formatCurrency(total)]);
        // Dibujar cada línea del resumen
        doc.setFontSize(9);
        // Posición horizontal del resumen ajustada al nuevo formato A4. Ancho total 110 mm (70 para etiquetas y 40 para valores)
        const totalSummaryWidth = 110;
        // Centrar el recuadro dentro del ancho disponible (ancho útil = pageWidth - 2*margin)
        const summaryX = margin + ((pageWidth - 2 * margin) - totalSummaryWidth);
        let rowY = summaryY;
        for (let i = 0; i < summaryLines.length; i++) {
          const [label, value] = summaryLines[i];
          // Establecer colores de fondo y texto
          if (i === summaryLines.length - 1) {
            // total en azul oscuro con texto blanco
            doc.setFillColor(0, 91, 171);
            doc.setTextColor(255, 255, 255);
          } else {
            // otras filas en azul claro con texto negro
            doc.setFillColor(230, 241, 255);
            doc.setTextColor(0, 0, 0);
          }
          // Dibujar celdas de fondo para la etiqueta y el valor. La columna de etiqueta tiene 70 mm y la de valor 40 mm
          doc.rect(summaryX, rowY, 70, rowHeight, 'F');
          doc.rect(summaryX + 70, rowY, 40, rowHeight, 'F');
          // Texto
          doc.setFont('Helvetica', i === summaryLines.length - 1 ? 'bold' : 'normal');
          // Etiqueta alineada a la izquierda en la celda de 70 mm
          doc.text(label, summaryX + 2, rowY + (rowHeight - 2));
          // Valor alineado a la derecha dentro de la celda de 40 mm
          doc.text('$' + value, summaryX + 70 + 40 - 2, rowY + (rowHeight - 2), { align: 'right' });
          rowY += rowHeight;
        }
        doc.setTextColor(0, 0, 0);
        doc.setFont('Helvetica', 'normal');
      }
      // Dibujar pie de página
      drawFooter();
    }
    // Formatear nombre de archivo: Cotización + Nombre + Fecha
    const today = new Date();
    const d = String(today.getDate()).padStart(2, '0');
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const y = String(today.getFullYear()).slice(-2);
    const dateStr = `${d}-${m}-${y}`;
    const safeName = clientName.replace(/\s+/g, '_');
    const fileName = `Cotización_${safeName}_${dateStr}.pdf`;
    doc.save(fileName);

    // Registrar cotización en el log
    try {
      const user = getSessionUser();
      const asesorName = user && user.username ? user.username : '';
      const logData = {
        asesor: asesorName,
        paciente: clientName,
        aseguradora: aseguradora,
        subtotal: subtotalPva,
        coverage: totals.hasInsurer ? coverage : null,
        total: total,
      };
      if (typeof logQuote === 'function') {
        logQuote(logData);
      }
    } catch (e) {
      console.error('Error al registrar log de la cotización', e);
    }
  } catch (err) {
    console.error('Error al generar el PDF', err);
    generateError.textContent = 'No se pudo generar el PDF. Intente nuevamente.';
  }
  });
}

/**
 * Obtiene las dimensiones reales de una imagen a partir de un DataURL.
 * @param {string} dataUrl
 * @returns {Promise<{width: number, height: number}>}
 */
function getImageDimensions(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = (error) => reject(error);
    img.src = dataUrl;
  });
}

/**
 * Asegura que la imagen entregada sea compatible con jsPDF devolviendo un DataURL rasterizado y su formato.
 * Si recibe un SVG lo convierte a PNG conservando las proporciones originales.
 * @param {string} dataUrl
 * @param {{width: number, height: number}|null} sizeHint
 * @returns {Promise<{dataUrl: string, format: 'PNG' | 'JPEG' | 'WEBP'}>}
 */
async function resolveImageForPdf(dataUrl, sizeHint) {
  if (!dataUrl) {
    return null;
  }
  if (dataUrl.startsWith('data:image/svg+xml')) {
    try {
      const rasterized = await rasterizeSvgDataUrl(dataUrl, sizeHint);
      return { dataUrl: rasterized, format: 'PNG' };
    } catch (error) {
      console.warn('No se pudo rasterizar el SVG, se usará el recurso original.', error);
      return { dataUrl, format: 'PNG' };
    }
  }
  if (dataUrl.startsWith('data:image/png')) {
    return { dataUrl, format: 'PNG' };
  }
  if (dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg')) {
    return { dataUrl, format: 'JPEG' };
  }
  if (dataUrl.startsWith('data:image/webp')) {
    return { dataUrl, format: 'WEBP' };
  }
  return { dataUrl, format: 'PNG' };
}

/**
 * Convierte un DataURL de SVG en un DataURL PNG utilizando un canvas temporal.
 * @param {string} svgDataUrl
 * @param {{width: number, height: number}|null} sizeHint
 * @returns {Promise<string>}
 */
function rasterizeSvgDataUrl(svgDataUrl, sizeHint) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const width = Math.max(1, Math.floor(img.naturalWidth || (sizeHint && sizeHint.width) || 128));
      const height = Math.max(1, Math.floor(img.naturalHeight || (sizeHint && sizeHint.height) || 128));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      try {
        resolve(canvas.toDataURL('image/png'));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = (error) => reject(error);
    img.src = svgDataUrl;
  });
}
