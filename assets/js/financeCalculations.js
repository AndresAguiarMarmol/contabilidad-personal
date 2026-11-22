/**
 * financeCalculations.js — Lógica de cálculo financiero puro para Contabilidad Personal
 * Desacoplado del DOM para permitir testing unitario y ejecución universal en navegador y Node.js.
 */

(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    // Entorno Node.js / CommonJS
    module.exports = factory();
  } else {
    // Entorno Navegador
    root.ContaPersonal = root.ContaPersonal || {};
    root.ContaPersonal.Calculations = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  
  const TIPOS_CUENTA_VALIDOS = ["bank", "cash", "wallet", "savings", "credit_card"];

  const CONFIG_CUENTA_DEFECTO = {
    bank: { icon: "building-2", color: "#2563eb", label: "Cuenta Bancaria" },
    cash: { icon: "wallet", color: "#16a34a", label: "Efectivo" },
    wallet: { icon: "smartphone", color: "#0284c7", label: "Billetera Digital" },
    savings: { icon: "piggy-bank", color: "#7c3aed", label: "Ahorro / Inversión" },
    credit_card: { icon: "credit-card", color: "#e11d48", label: "Tarjeta de Crédito" }
  };

  /**
   * Catálogo base de monedas con tasas cambiarias referenciales respecto a CLP (Spec 018 / RF-1)
   */
  const CURRENCIES_BASE = [
    { code: "CLP", name: "Peso Chileno", symbol: "$", rateToCLP: 1.0, isBase: true },
    { code: "USD", name: "Dólar Estadounidense", symbol: "US$", rateToCLP: 950.0, isBase: false },
    { code: "EUR", name: "Euro", symbol: "€", rateToCLP: 1020.0, isBase: false },
    { code: "ARS", name: "Peso Argentino", symbol: "AR$", rateToCLP: 0.95, isBase: false }
  ];

  /**
   * Calcula el patrimonio neto consolidado valorizado en moneda base CLP (Spec 018 / RF-6)
   * @param {Array} accounts 
   * @param {Array} currenciesList 
   * @returns {{ assets: number, liabilities: number, netWorth: number }}
   */
  function calcularPatrimonioNeto(accounts, currenciesList = []) {
    let assets = 0;
    let liabilities = 0;

    if (!Array.isArray(accounts)) {
      return { assets: 0, liabilities: 0, netWorth: 0 };
    }

    const currList = Array.isArray(currenciesList) && currenciesList.length > 0
      ? currenciesList
      : CURRENCIES_BASE;

    const getRate = (currCode) => {
      if (!currCode || currCode.toUpperCase() === "CLP") return 1.0;
      const found = currList.find(c => (c.code || "").toUpperCase() === currCode.toUpperCase());
      return found ? Number(found.rateToCLP || 1.0) : 1.0;
    };

    accounts.forEach((acc) => {
      if (acc.isExcludedFromTotal) return;
      const bal = Number(acc.currentBalance) || 0;
      const rate = getRate(acc.currency);
      const balInCLP = bal * rate;

      if (acc.type === "credit_card" || balInCLP < 0) {
        liabilities += Math.abs(balInCLP);
      } else {
        assets += balInCLP;
      }
    });

    return {
      assets,
      liabilities,
      netWorth: assets - liabilities
    };
  }

  /**
   * Calcula los totales de ingresos, gastos, saldo neto y tasa de ahorro
   * @param {Array} transactions 
   * @returns {{ income: number, expense: number, netSavings: number, savingsRate: number, categoryExpenses: Object }}
   */
  function calcularBalanceMes(transactions) {
    let income = 0;
    let expense = 0;
    const categoryExpenses = {};

    if (!Array.isArray(transactions)) {
      return { income: 0, expense: 0, netSavings: 0, savingsRate: 0, categoryExpenses: {} };
    }

    transactions.forEach((tx) => {
      const amt = Number(tx.amount) || 0;
      if (tx.type === "income") {
        income += amt;
      } else if (tx.type === "expense") {
        if (tx.isSplit && Array.isArray(tx.splitLines)) {
          let totalExpenseInLines = 0;
          tx.splitLines.forEach((line) => {
            const lineAmt = Number(line.amount) || 0;
            if (!line.targetAccountId) {
              totalExpenseInLines += lineAmt;
              const cat = line.category || "Otros";
              categoryExpenses[cat] = (categoryExpenses[cat] || 0) + lineAmt;
            }
          });
          expense += totalExpenseInLines;
        } else {
          expense += amt;
          const cat = tx.category || "Otros";
          categoryExpenses[cat] = (categoryExpenses[cat] || 0) + amt;
        }
      }
    });

    const netSavings = income - expense;
    const savingsRate = income > 0 ? Math.max(0, Math.round((netSavings / income) * 100)) : 0;

    return {
      income,
      expense,
      netSavings,
      savingsRate,
      categoryExpenses
    };
  }

  /**
   * Determina el porcentaje de ejecución y el semáforo de un presupuesto
   * @param {number} spentAmount 
   * @param {number} limitAmount 
   * @returns {{ percentage: number, status: 'optimal' | 'warning' | 'exceeded' }}
   */
  function calcularEjecucionPresupuesto(spentAmount, limitAmount) {
    const spent = Number(spentAmount) || 0;
    const limit = Number(limitAmount) || 1;
    const percentage = Math.round((spent / limit) * 100);

    let status = "optimal";
    if (percentage > 100) {
      status = "exceeded";
    } else if (percentage > 75) {
      status = "warning";
    }

    return {
      percentage,
      status
    };
  }

  /**
   * Valida los campos obligatorios de un movimiento financiero (RF-4)
   * @param {Object} tx 
   * @returns {{ valida: boolean, error?: string }}
   */
  function validarTransaccion(tx) {
    if (!tx || typeof tx !== "object") {
      return { valida: false, error: "Datos de transacción inválidos." };
    }

    const amount = Number(tx.amount);
    if (isNaN(amount) || amount <= 0) {
      return { valida: false, error: "El monto debe ser un número mayor a cero." };
    }

    if (!tx.description || typeof tx.description !== "string" || tx.description.trim() === "") {
      return { valida: false, error: "La descripción del movimiento no puede estar vacía." };
    }

    if (!tx.accountId) {
      return { valida: false, error: "Debes seleccionar una cuenta de origen." };
    }

    if (tx.type === "transfer") {
      if (!tx.toAccountId) {
        return { valida: false, error: "Debes seleccionar una cuenta de destino para la transferencia." };
      }
      if (tx.accountId === tx.toAccountId) {
        return { valida: false, error: "La cuenta de destino debe ser distinta a la cuenta de origen." };
      }
    }

    return { valida: true };
  }

  /**
   * Aplica el impacto de un movimiento en las cuentas de forma atómica e inmutable (RF-5, RF-6, RF-7)
   * @param {Array} accounts 
   * @param {Object} tx 
   * @returns {Array} Nueva lista de cuentas con saldos actualizados
   */
  function aplicarTransaccionEnCuentas(accounts, tx) {
    if (!Array.isArray(accounts)) return [];
    const amount = Number(tx.amount) || 0;

    return accounts.map((acc) => {
      const updated = { ...acc };

      if (tx.type === "expense") {
        if (updated.id === tx.accountId) {
          updated.currentBalance = (Number(updated.currentBalance) || 0) - amount;
        }
      } else if (tx.type === "income") {
        if (updated.id === tx.accountId) {
          updated.currentBalance = (Number(updated.currentBalance) || 0) + amount;
        }
      } else if (tx.type === "transfer") {
        if (updated.id === tx.accountId) {
          updated.currentBalance = (Number(updated.currentBalance) || 0) - amount;
        }
        if (updated.id === tx.toAccountId) {
          const credited = tx.toAmount !== undefined && tx.toAmount !== null && !isNaN(Number(tx.toAmount))
            ? Number(tx.toAmount)
            : amount;
          updated.currentBalance = (Number(updated.currentBalance) || 0) + credited;
        }
      }

      return updated;
    });
  }

  /**
   * Valida los datos para crear o editar una moneda soportada (Spec 018 / RF-2)
   * @param {Object} datos 
   * @param {Array} monedasExistentes 
   * @param {string} codigoActual 
   * @returns {{ valida: boolean, error?: string }}
   */
  function validarMoneda(datos, monedasExistentes = [], codigoActual = "") {
    if (!datos || typeof datos !== "object") {
      return { valida: false, error: "Datos de moneda inválidos." };
    }

    const { code, name, symbol, rateToCLP } = datos;

    if (!code || typeof code !== "string" || !/^[A-Za-z]{2,5}$/.test(code.trim())) {
      return { valida: false, error: "El código de moneda debe tener entre 2 y 5 letras (ej. USD, EUR, UF)." };
    }

    const codeUpper = code.trim().toUpperCase();
    const currActualUpper = (codigoActual || "").trim().toUpperCase();

    const existeDuplicado = Array.isArray(monedasExistentes) && monedasExistentes.some((m) => {
      const mCode = (m.code || "").trim().toUpperCase();
      if (currActualUpper && mCode === currActualUpper) return false;
      return mCode === codeUpper;
    });

    if (existeDuplicado) {
      return { valida: false, error: `Ya existe una moneda registrada con el código "${codeUpper}".` };
    }

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return { valida: false, error: "El nombre de la moneda es obligatorio." };
    }

    if (!symbol || typeof symbol !== "string" || symbol.trim().length === 0) {
      return { valida: false, error: "El símbolo de la moneda es obligatorio." };
    }

    const rateNum = Number(rateToCLP);
    if (isNaN(rateNum) || rateNum <= 0) {
      return { valida: false, error: "La tasa de cambio respecto a CLP debe ser un número mayor a cero." };
    }

    return { valida: true };
  }

  /**
   * Calcula la conversión cambiaria entre dos monedas arbitrarias respecto a la moneda base CLP (Spec 018 / RF-3)
   * @param {number} amount Monto en moneda origen
   * @param {string} fromCode Código ISO moneda origen
   * @param {string} toCode Código ISO moneda destino
   * @param {Array} currenciesList Lista de monedas con tasas a CLP
   * @param {number|null} customRate Tasa personalizada opcional
   * @returns {{ sourceAmount: number, targetAmount: number, effectiveRate: number, fromCurrency: string, toCurrency: string }}
   */
  function calcularConversionMoneda(amount, fromCode, toCode, currenciesList = [], customRate = null) {
    const amt = Number(amount) || 0;
    const fromUpper = (fromCode || "CLP").toUpperCase();
    const toUpper = (toCode || "CLP").toUpperCase();

    if (fromUpper === toUpper) {
      return {
        sourceAmount: amt,
        targetAmount: amt,
        effectiveRate: 1.0,
        fromCurrency: fromUpper,
        toCurrency: toUpper
      };
    }

    const currList = Array.isArray(currenciesList) && currenciesList.length > 0
      ? currenciesList
      : CURRENCIES_BASE;

    const findRate = (code) => {
      if (code === "CLP") return 1.0;
      const found = currList.find((c) => (c.code || "").toUpperCase() === code);
      return found ? Number(found.rateToCLP || 1.0) : 1.0;
    };

    let rateFrom = findRate(fromUpper);
    let rateTo = findRate(toUpper);

    // Si se pasa customRate explícito:
    if (customRate !== null && customRate !== undefined && !isNaN(Number(customRate)) && Number(customRate) > 0) {
      const cr = Number(customRate);
      if (fromUpper === "CLP") {
        rateTo = cr;
      } else if (toUpper === "CLP") {
        rateFrom = cr;
      }
    }

    // Conversión estándar vía CLP:
    const targetAmount = (amt * rateFrom) / rateTo;

    // Tasa efectiva representativa
    let effectiveRate = 1.0;
    if (fromUpper === "CLP") {
      effectiveRate = rateTo;
    } else if (toUpper === "CLP") {
      effectiveRate = rateFrom;
    } else {
      effectiveRate = rateFrom / rateTo;
    }

    return {
      sourceAmount: amt,
      targetAmount: Number(targetAmount.toFixed(4)),
      effectiveRate: Number(effectiveRate.toFixed(4)),
      fromCurrency: fromUpper,
      toCurrency: toUpper
    };
  }

  /**
   * Valida los datos requeridos para crear una nueva cuenta financiera (Spec 003 / RF-2)
   * @param {Object} datos 
   * @param {Array} cuentasExistentes 
   * @returns {{ valida: boolean, error?: string }}
   */
  function validarNuevaCuenta(datos, cuentasExistentes = []) {
    if (!datos || typeof datos !== "object") {
      return { valida: false, error: "Datos de cuenta inválidos." };
    }

    if (!datos.name || typeof datos.name !== "string" || datos.name.trim() === "") {
      return { valida: false, error: "El nombre de la cuenta no puede estar vacío." };
    }

    const nombreLimpio = datos.name.trim().toLowerCase();
    const existeDuplicado = cuentasExistentes.some((c) => (c.name || "").trim().toLowerCase() === nombreLimpio);
    if (existeDuplicado) {
      return { valida: false, error: "Ya existe una cuenta financiera con este nombre." };
    }

    if (!datos.type || !TIPOS_CUENTA_VALIDOS.includes(datos.type)) {
      return { valida: false, error: "Tipo de cuenta no soportado. Selecciona un tipo válido." };
    }

    return { valida: true };
  }

  /**
   * Construye un objeto Account normalizado con valores por defecto (Spec 003 / RF-3, RF-4)
   * @param {Object} datos 
   * @returns {Object} Objeto Account
   */
  function crearCuentaObjeto(datos) {
    const type = datos.type || "bank";
    const defaultConfig = CONFIG_CUENTA_DEFECTO[type] || CONFIG_CUENTA_DEFECTO.bank;

    let balance = Number(datos.initialBalance) || 0;
    // En tarjetas de crédito, si el saldo se ingresa positivo representa deuda, por ende se registra negativo
    if (type === "credit_card" && balance > 0) {
      balance = -Math.abs(balance);
    }

    return {
      id: datos.id || `ACC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: (datos.name || "Nueva Cuenta").trim(),
      type: type,
      initialBalance: balance,
      currentBalance: balance,
      currency: datos.currency || "CLP",
      color: datos.color || defaultConfig.color,
      icon: datos.icon || defaultConfig.icon,
      isExcludedFromTotal: Boolean(datos.isExcludedFromTotal)
    };
  }

  /**
   * Valida un movimiento tipo Split verificando cabecera, arreglo de líneas y cuadratura contable (Spec 004 / RF-1, RF-2, RF-3)
   * @param {Object} tx 
   * @param {Array} accounts 
   * @returns {{ valida: boolean, error?: string, sumLines?: number, difference?: number }}
   */
  function validarMovimientoSplit(tx, accounts = []) {
    if (!tx || typeof tx !== "object") {
      return { valida: false, error: "Datos de transacción inválidos." };
    }

    const totalAmount = Number(tx.amount);
    if (isNaN(totalAmount) || totalAmount <= 0) {
      return { valida: false, error: "El monto total debe ser un número mayor a cero." };
    }

    if (!tx.accountId) {
      return { valida: false, error: "Debes seleccionar una cuenta pagadora u origen." };
    }

    if (!Array.isArray(tx.splitLines) || tx.splitLines.length < 2) {
      return { valida: false, error: "Un movimiento dividido debe contener al menos 2 partidas." };
    }

    let sumLines = 0;
    for (let i = 0; i < tx.splitLines.length; i++) {
      const line = tx.splitLines[i];
      if (!line || typeof line !== "object") {
        return { valida: false, error: `La partida #${i + 1} no es válida.` };
      }

      const lineAmount = Number(line.amount);
      if (isNaN(lineAmount) || lineAmount <= 0) {
        return { valida: false, error: `La partida #${i + 1} debe tener un monto mayor a cero.` };
      }

      if (line.targetAccountId && line.targetAccountId === tx.accountId) {
        return { valida: false, error: `La cuenta de destino no puede ser igual a la cuenta de origen en la partida #${i + 1}.` };
      }

      sumLines += lineAmount;
    }

    const difference = Math.round((totalAmount - sumLines) * 100) / 100;
    if (Math.abs(difference) > 0.001) {
      return {
        valida: false,
        error: `La suma de las partidas (${sumLines}) no cuadra con el monto total (${totalAmount}). Diferencia: ${difference}.`,
        sumLines,
        difference
      };
    }

    return {
      valida: true,
      sumLines,
      difference: 0
    };
  }

  /**
   * Aplica el impacto de un movimiento split de forma atómica e inmutable (Spec 004 / RF-4)
   * @param {Array} accounts 
   * @param {Object} tx 
   * @returns {Array} Nueva lista de cuentas con saldos recalculados
   */
  function aplicarMovimientoSplitEnCuentas(accounts, tx) {
    if (!Array.isArray(accounts)) return [];
    const totalAmount = Number(tx.amount) || 0;

    const balanceDeltas = new Map();

    // Origen resta el monto total
    if (tx.accountId) {
      balanceDeltas.set(tx.accountId, (balanceDeltas.get(tx.accountId) || 0) - totalAmount);
    }

    // Líneas con cuenta destino suman a sus respectivas cuentas
    if (Array.isArray(tx.splitLines)) {
      tx.splitLines.forEach(line => {
        if (line && line.targetAccountId) {
          const lAmount = Number(line.amount) || 0;
          balanceDeltas.set(
            line.targetAccountId,
            (balanceDeltas.get(line.targetAccountId) || 0) + lAmount
          );
        }
      });
    }

    return accounts.map(acc => {
      if (balanceDeltas.has(acc.id)) {
        const delta = balanceDeltas.get(acc.id);
        return {
          ...acc,
          currentBalance: (Number(acc.currentBalance) || 0) + delta
        };
      }
      return { ...acc };
    });
  }

  /**
   * Valida los datos requeridos para un presupuesto mensual (Spec 005 / RF-2)
   * @param {Object} datos 
   * @returns {{ valida: boolean, error?: string }}
   */
  function validarPresupuesto(datos) {
    if (!datos || typeof datos !== "object") {
      return { valida: false, error: "Datos de presupuesto inválidos." };
    }

    if (!datos.category || typeof datos.category !== "string" || datos.category.trim() === "") {
      return { valida: false, error: "Debes seleccionar una categoría válida." };
    }

    const limit = Number(datos.limitAmount);
    if (isNaN(limit) || limit <= 0) {
      return { valida: false, error: "El monto límite debe ser un número mayor a cero." };
    }

    return { valida: true };
  }

  /**
   * Calcula el gasto acumulado de una categoría en un mes determinado (Spec 005 / RF-3)
   * @param {Array} transactions 
   * @param {string} category 
   * @param {string} month YYYY-MM
   * @returns {number}
   */
  function calcularGastoCategoriaMes(transactions, category, month) {
    if (!Array.isArray(transactions) || !category) return 0;
    const mesPrefijo = month ? String(month).slice(0, 7) : "";

    let total = 0;
    transactions.forEach(tx => {
      if (tx.type !== "expense") return;
      if (mesPrefijo && tx.date && !tx.date.startsWith(mesPrefijo)) return;

      if (tx.isSplit && Array.isArray(tx.splitLines)) {
        tx.splitLines.forEach(line => {
          if (!line.targetAccountId && line.category === category) {
            total += Number(line.amount) || 0;
          }
        });
      } else {
        if (tx.category === category) {
          total += Number(tx.amount) || 0;
        }
      }
    });

    return total;
  }

  /**
   * Sincroniza los montos gastados de una lista de presupuestos a partir de las transacciones (Spec 005 / RF-3)
   * @param {Array} budgets 
   * @param {Array} transactions 
   * @returns {Array} Nueva lista de presupuestos con spentAmount actualizado
   */
  function sincronizarPresupuestosConTransacciones(budgets, transactions) {
    if (!Array.isArray(budgets)) return [];
    return budgets.map(b => {
      const gasto = calcularGastoCategoriaMes(transactions, b.category, b.month);
      return {
        ...b,
        spentAmount: gasto
      };
    });
  }

  /**
   * Valida los datos requeridos para una meta de ahorro (Spec 006 / RF-2)
   * @param {Object} datos 
   * @returns {{ valida: boolean, error?: string }}
   */
  function validarMetaAhorro(datos) {
    if (!datos || typeof datos !== "object") {
      return { valida: false, error: "Datos de meta de ahorro inválidos." };
    }

    if (!datos.title || typeof datos.title !== "string" || datos.title.trim() === "") {
      return { valida: false, error: "El título de la meta no puede estar vacío." };
    }

    const target = Number(datos.targetAmount);
    if (isNaN(target) || target <= 0) {
      return { valida: false, error: "El monto objetivo debe ser un número mayor a cero." };
    }

    return { valida: true };
  }

  /**
   * Calcula el porcentaje de avance, monto restante y estado de cumplimiento (Spec 006 / RF-3)
   * @param {number} currentAmount 
   * @param {number} targetAmount 
   * @returns {{ percentage: number, remainingAmount: number, isCompleted: boolean }}
   */
  function calcularProgresoMeta(currentAmount, targetAmount) {
    const target = Number(targetAmount) || 1;
    const current = Number(currentAmount) || 0;
    const percentage = Math.round((current / target) * 100);
    const remainingAmount = Math.max(0, target - current);
    const isCompleted = current >= target;

    return {
      percentage,
      remainingAmount,
      isCompleted
    };
  }

  /**
   * Aplica un aporte a una meta de ahorro de forma inmutable (Spec 006 / RF-4)
   * @param {Object} goal 
   * @param {number} contributionAmount 
   * @returns {Object} Nueva meta con saldo incrementado
   */
  function aplicarAporteMeta(goal, contributionAmount) {
    if (!goal || typeof goal !== "object") {
      throw new Error("Meta inválida.");
    }

    const aporte = Number(contributionAmount);
    if (isNaN(aporte) || aporte <= 0) {
      throw new Error("El monto del aporte debe ser un número mayor a cero.");
    }

    return {
      ...goal,
      currentAmount: (Number(goal.currentAmount) || 0) + aporte
    };
  }

  /**
   * Valida la estructura y coherencia de un backup JSON (Spec 007 / RF-2)
   * @param {Object} backupData 
   * @returns {{ valida: boolean, error?: string, counts?: Object }}
   */
  function validarBackupJSON(backupData) {
    if (!backupData || typeof backupData !== "object") {
      return { valida: false, isValid: false, error: "El archivo no contiene un objeto JSON válido." };
    }

    if (!Array.isArray(backupData.accounts) || !Array.isArray(backupData.transactions)) {
      return { valida: false, isValid: false, error: "El backup debe contener las colecciones de cuentas y transacciones." };
    }

    const counts = {
      accounts: backupData.accounts.length,
      transactions: backupData.transactions.length,
      budgets: Array.isArray(backupData.budgets) ? backupData.budgets.length : 0,
      goals: Array.isArray(backupData.goals) ? backupData.goals.length : 0
    };

    return {
      valida: true,
      isValid: true,
      counts
    };
  }

  /**
   * Filtra una lista de transacciones por múltiples dimensiones (Spec 007 / RF-4)
   * @param {Array} transactions 
   * @param {Object} filtros 
   * @returns {Array} Transacciones filtradas
   */
  function filtrarTransacciones(transactions, filtros = {}) {
    if (!Array.isArray(transactions)) return [];

    const type = filtros.type || filtros.txType || "all";
    const accountId = filtros.accountId || filtros.txAccount || "all";
    const category = filtros.category || filtros.txCategory || "all";
    const search = filtros.search || filtros.txSearch || "";
    const dateRange = filtros.dateRange || filtros.txDateRange || "all";
    const startDate = filtros.startDate || filtros.txStartDate || "";
    const endDate = filtros.endDate || filtros.txEndDate || "";
    const referenceDate = filtros.referenceDate || null;

    const query = search ? search.trim().toLowerCase() : "";
    const ref = referenceDate ? new Date(referenceDate) : new Date();
    const currentMonthPrefix = ref.toISOString().slice(0, 7);

    // Calcular mes anterior
    const prevMonthDate = new Date(ref.getFullYear(), ref.getMonth() - 1, 1);
    const prevMonthPrefix = prevMonthDate.toISOString().slice(0, 7);

    // Fecha límite para 3 meses
    const ninetyDaysAgo = new Date(ref.getTime() - (90 * 24 * 60 * 60 * 1000));

    return transactions.filter(tx => {
      // Filtro por tipo
      if (type && type !== "all" && tx.type !== type) {
        return false;
      }

      // Filtro por cuenta
      if (accountId && accountId !== "all") {
        if (tx.accountId !== accountId && tx.toAccountId !== accountId) {
          return false;
        }
      }

      // Filtro por categoría
      if (category && category !== "all") {
        const matchMainCat = tx.category === category;
        const matchSplitCat = tx.isSplit && Array.isArray(tx.splitLines) && tx.splitLines.some(l => l.category === category);
        if (!matchMainCat && !matchSplitCat) {
          return false;
        }
      }

      // Filtro por texto de búsqueda
      if (query) {
        const desc = (tx.description || "").toLowerCase();
        const cat = (tx.category || "").toLowerCase();
        const splitText = tx.isSplit && Array.isArray(tx.splitLines)
          ? tx.splitLines.map(l => (l.description || '') + ' ' + (l.category || '')).join(' ').toLowerCase()
          : "";
        if (!desc.includes(query) && !cat.includes(query) && !splitText.includes(query)) {
          return false;
        }
      }

      // Filtro por rango de fechas
      if (dateRange && dateRange !== "all") {
        const txDateStr = (tx.date || "").slice(0, 10);
        if (dateRange === "current_month") {
          if (!tx.date || !tx.date.startsWith(currentMonthPrefix)) return false;
        } else if (dateRange === "last_month") {
          if (!tx.date || !tx.date.startsWith(prevMonthPrefix)) return false;
        } else if (dateRange === "last_3_months") {
          if (!tx.date || new Date(tx.date) < ninetyDaysAgo) return false;
        } else if (dateRange === "custom") {
          if (startDate && txDateStr < startDate) return false;
          if (endDate && txDateStr > endDate) return false;
        }
      }

      return true;
    });
  }

  /**
   * Genera el contenido de una planilla CSV (RFC 4180) con BOM UTF-8 (Spec 007 / RF-5)
   * @param {Array} transactions 
   * @param {Array} accounts 
   * @returns {string} Contenido CSV
   */
  function generarTransaccionesCSV(transactions, accounts = []) {
    const accMap = new Map();
    if (Array.isArray(accounts)) {
      accounts.forEach(a => accMap.set(a.id, a.name));
    }

    const typeLabels = {
      expense: "Gasto",
      income: "Ingreso",
      transfer: "Transferencia"
    };

    const methodLabels = {
      credit: "Tarjeta de Crédito",
      debit: "Tarjeta de Débito",
      transfer: "Transferencia Bancaria",
      cash: "Efectivo"
    };

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val);
      if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return `"${str}"`;
    };

    const headers = [
      "Fecha",
      "Tipo",
      "Concepto",
      "Categoría",
      "Cuenta",
      "Medio de Pago",
      "Monto",
      "Es Split",
      "Detalle Partidas"
    ];

    const rows = [headers.join(",")];

    if (Array.isArray(transactions)) {
      transactions.forEach(tx => {
        const dateStr = (tx.date || "").slice(0, 10);
        const tipo = typeLabels[tx.type] || tx.type || "Gasto";
        const concepto = tx.description || "";
        const categoria = tx.category || "Otros";
        const cuenta = accMap.get(tx.accountId) || "Cuenta";
        const medio = methodLabels[tx.paymentMethod] || tx.paymentMethod || "Otro";
        const signedAmount = tx.type === "expense" ? -Math.abs(tx.amount) : tx.amount;
        const isSplitStr = tx.isSplit ? "SI" : "NO";

        let detallePartidas = "";
        if (tx.isSplit && Array.isArray(tx.splitLines)) {
          detallePartidas = tx.splitLines.map(l => {
            const destAcc = l.targetAccountId ? (accMap.get(l.targetAccountId) || l.targetAccountId) : "";
            const destInfo = destAcc ? ` → ${destAcc}` : ` (${l.category || ''})`;
            return `${l.description || 'Partida'}${destInfo}: $${l.amount}`;
          }).join("; ");
        }

        const row = [
          escapeCsv(dateStr),
          escapeCsv(tipo),
          escapeCsv(concepto),
          escapeCsv(categoria),
          escapeCsv(cuenta),
          escapeCsv(medio),
          signedAmount,
          escapeCsv(isSplitStr),
          escapeCsv(detallePartidas)
        ];

        rows.push(row.join(","));
      });
    }

    // BOM UTF-8 para visualización automática en Excel en Windows
    return "\uFEFF" + rows.join("\r\n");
  }

  /**
   * Obtiene y ordena cronológicamente todos los movimientos asociados a una cuenta (Spec 008 / RF-6)
   * @param {Array} transactions 
   * @param {string} accountId 
   * @returns {Array} Movimientos asociados ordenados de más reciente a más antiguo
   */
  function obtenerMovimientosDeCuenta(transactions, accountId) {
    if (!Array.isArray(transactions) || !accountId) return [];
    return transactions
      .filter((tx) => {
        if (tx.accountId === accountId) return true;
        if (tx.toAccountId === accountId) return true;
        if (Boolean(tx.isSplit && Array.isArray(tx.splitLines))) {
          return tx.splitLines.some((l) => l.targetAccountId === accountId);
        }
        return false;
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  /**
   * Calcula el resumen financiero (abonos, cargos, neto y total) de una cuenta específica (Spec 008 / RF-2, RF-6)
   * @param {Array} transactions 
   * @param {string} accountId 
   * @returns {Object} Resumen { totalAbonos, totalCargos, neto, cantidadMovimientos }
   */
  function calcularResumenCuenta(transactions, accountId) {
    if (!Array.isArray(transactions) || !accountId) {
      return { totalAbonos: 0, totalCargos: 0, neto: 0, cantidadMovimientos: 0 };
    }

    const movimientos = obtenerMovimientosDeCuenta(transactions, accountId);
    let totalAbonos = 0;
    let totalCargos = 0;

    movimientos.forEach((tx) => {
      const isSplit = Boolean(tx.isSplit && Array.isArray(tx.splitLines));

      if (isSplit) {
        if (tx.accountId === accountId) {
          totalCargos += Number(tx.amount) || 0;
        }
        tx.splitLines.forEach((line) => {
          if (line.targetAccountId === accountId) {
            totalAbonos += Number(line.amount) || 0;
          }
        });
      } else if (tx.type === "income") {
        if (tx.accountId === accountId) {
          totalAbonos += Number(tx.amount) || 0;
        }
      } else if (tx.type === "expense") {
        if (tx.accountId === accountId) {
          totalCargos += Number(tx.amount) || 0;
        }
      } else if (tx.type === "transfer") {
        if (tx.accountId === accountId) {
          totalCargos += Number(tx.amount) || 0;
        }
        if (tx.toAccountId === accountId) {
          const credited = tx.toAmount !== undefined && tx.toAmount !== null && !isNaN(Number(tx.toAmount))
            ? Number(tx.toAmount)
            : Number(tx.amount) || 0;
          totalAbonos += credited;
        }
      }
    });

    return {
      totalAbonos,
      totalCargos,
      neto: totalAbonos - totalCargos,
      cantidadMovimientos: movimientos.length
    };
  }

  /**
   * Clasifica las cuentas en grupos contables (Activos y Pasivos), asigna códigos y calcula subtotales (Spec 010 / RF-2, RF-3)
   * @param {Array} accounts 
   * @returns {Object} { activos, pasivos, totalActivos, totalPasivos, patrimonioNeto }
   */
  function clasificarPlanDeCuentas(accounts) {
    if (!Array.isArray(accounts)) {
      return {
        activos: { grupo: "1. ACTIVOS", cuentas: [], subtotal: 0 },
        pasivos: { grupo: "2. PASIVOS", cuentas: [], subtotal: 0 },
        totalActivos: 0,
        totalPasivos: 0,
        patrimonioNeto: 0
      };
    }

    const activosList = [];
    const pasivosList = [];
    let totalActivos = 0;
    let totalPasivos = 0;

    let idxCash = 1;
    let idxBank = 1;
    let idxWallet = 1;
    let idxSavings = 1;
    let idxCredit = 1;
    let idxOther = 1;

    accounts.forEach((acc) => {
      const isCredit = acc.type === "credit_card";
      let codigo = acc.codigoContable;

      if (!codigo) {
        if (acc.type === "cash") {
          codigo = `1.1.01.${String(idxCash++).padStart(2, "0")}`;
        } else if (acc.type === "bank") {
          codigo = `1.1.02.${String(idxBank++).padStart(2, "0")}`;
        } else if (acc.type === "wallet") {
          codigo = `1.1.03.${String(idxWallet++).padStart(2, "0")}`;
        } else if (acc.type === "savings") {
          codigo = `1.2.01.${String(idxSavings++).padStart(2, "0")}`;
        } else if (acc.type === "credit_card") {
          codigo = `2.1.01.${String(idxCredit++).padStart(2, "0")}`;
        } else {
          codigo = `1.3.01.${String(idxOther++).padStart(2, "0")}`;
        }
      }

      const balance = Number(acc.currentBalance) || 0;
      const cuentaEnriquecida = {
        ...acc,
        codigoContable: codigo,
        grupoContable: isCredit ? "2. Pasivos" : "1. Activos"
      };

      if (isCredit) {
        pasivosList.push(cuentaEnriquecida);
        if (!acc.isExcludedFromTotal) {
          totalPasivos += Math.abs(balance);
        }
      } else {
        activosList.push(cuentaEnriquecida);
        if (!acc.isExcludedFromTotal) {
          totalActivos += balance;
        }
      }
    });

    activosList.sort((a, b) => (a.codigoContable || "").localeCompare(b.codigoContable || ""));
    pasivosList.sort((a, b) => (a.codigoContable || "").localeCompare(b.codigoContable || ""));

    return {
      activos: {
        grupo: "1. ACTIVOS (Disponibles e Inversiones)",
        cuentas: activosList,
        subtotal: totalActivos
      },
      pasivos: {
        grupo: "2. PASIVOS (Obligaciones y Tarjetas de Crédito)",
        cuentas: pasivosList,
        subtotal: totalPasivos
      },
      totalActivos,
      totalPasivos,
      patrimonioNeto: totalActivos - totalPasivos
    };
  }

  /**
   * Valida los datos modificados de una cuenta bancaria/billetera (Spec 010 / RF-5)
   * @param {Object} datosCuenta 
   * @param {Array} cuentasExistentes 
   * @param {string} cuentaIdActual 
   * @returns {Object} { valida, error }
   */
  function validarEdicionCuenta(datosCuenta, cuentasExistentes = [], cuentaIdActual = "") {
    if (!datosCuenta || typeof datosCuenta !== "object") {
      return { valida: false, error: "Datos de cuenta inválidos." };
    }

    const { name, type } = datosCuenta;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return { valida: false, error: "El nombre de la cuenta es obligatorio." };
    }

    const tiposValidos = ["bank", "cash", "wallet", "savings", "credit_card"];
    if (!tiposValidos.includes(type)) {
      return { valida: false, error: "Tipo de cuenta no soportado." };
    }

    const nombreNormalizado = name.trim().toLowerCase();
    const nombreDuplicado = cuentasExistentes.some((acc) => {
      if (cuentaIdActual && acc.id === cuentaIdActual) return false;
      return (acc.name || "").trim().toLowerCase() === nombreNormalizado;
    });

    if (nombreDuplicado) {
      return { valida: false, error: `Ya existe otra cuenta registrada con el nombre "${name.trim()}".` };
    }

    return { valida: true };
  }

  /**
   * Determina si una cuenta tiene transacciones asociadas y cuántas (Spec 010 / RF-6)
   * @param {string} cuentaId 
   * @param {Array} transactions 
   * @returns {Object} { tieneMovimientos, cantidadMovimientos }
   */
  function puedeEliminarCuenta(cuentaId, transactions = []) {
    if (!cuentaId || !Array.isArray(transactions)) {
      return { tieneMovimientos: false, cantidadMovimientos: 0 };
    }

    const conteo = transactions.filter((tx) => {
      if (tx.accountId === cuentaId || tx.toAccountId === cuentaId) return true;
      if (Boolean(tx.isSplit && Array.isArray(tx.splitLines))) {
        return tx.splitLines.some((l) => l.targetAccountId === cuentaId);
      }
      return false;
    }).length;

    return {
      tieneMovimientos: conteo > 0,
      cantidadMovimientos: conteo
    };
  }

  /**
   * Elimina inmutablemente todas las transacciones asociadas a una cuenta financiera (directas, transferencias y splits) (Spec 017 / RF-4)
   * @param {string} accountId ID de la cuenta a purgar
   * @param {Array} transactions Lista de transacciones
   * @returns {Array} Nueva lista de transacciones sin los movimientos vinculados a la cuenta
   */
  function purgarMovimientosDeCuenta(accountId, transactions = []) {
    if (!accountId || !Array.isArray(transactions)) {
      return Array.isArray(transactions) ? transactions.slice() : [];
    }

    return transactions.filter((tx) => {
      if (!tx) return false;
      if (tx.accountId === accountId) return false;
      if (tx.toAccountId === accountId) return false;
      if (Boolean(tx.isSplit && Array.isArray(tx.splitLines))) {
        const afectaCuenta = tx.splitLines.some((l) => l && l.targetAccountId === accountId);
        if (afectaCuenta) return false;
      }
      return true;
    });
  }

  // ========================================================
  // PLAN DE CUENTAS ORIENTADO A CONTABILIDAD PERSONAL (SPEC 011)
  // ========================================================
  const CATALOGO_PLAN_CUENTAS_PERSONAL_BASE = [
    // CLASE 1: ACTIVOS
    { id: "P-1-1-01", code: "1.1.01", name: "Efectivo y Caja", classNumber: 1, classType: "asset", groupName: "1.1 Activo Circulante / Disponible", nature: "debit", isSystem: true, icon: "banknote" },
    { id: "P-1-1-02", code: "1.1.02", name: "Cuentas Bancarias Corrientes y Vista", classNumber: 1, classType: "asset", groupName: "1.1 Activo Circulante / Disponible", nature: "debit", isSystem: true, icon: "landmark" },
    { id: "P-1-1-03", code: "1.1.03", name: "Billeteras Digitales (Apps)", classNumber: 1, classType: "asset", groupName: "1.1 Activo Circulante / Disponible", nature: "debit", isSystem: true, icon: "wallet" },
    { id: "P-1-2-01", code: "1.2.01", name: "Fondos de Ahorro y Depósitos a Plazo", classNumber: 1, classType: "asset", groupName: "1.2 Inversiones y Ahorro Líquido", nature: "debit", isSystem: true, icon: "trending-up" },
    { id: "P-1-2-02", code: "1.2.02", name: "Inversiones Financieras y Fondos Mutuos", classNumber: 1, classType: "asset", groupName: "1.2 Inversiones y Ahorro Líquido", nature: "debit", isSystem: true, icon: "line-chart" },
    { id: "P-1-3-01", code: "1.3.01", name: "Inmuebles y Vivienda Propia", classNumber: 1, classType: "asset", groupName: "1.3 Bienes y Activos Fijos Personales", nature: "debit", isSystem: true, icon: "home" },
    { id: "P-1-3-02", code: "1.3.02", name: "Vehículos y Movilidad Personal", classNumber: 1, classType: "asset", groupName: "1.3 Bienes y Activos Fijos Personales", nature: "debit", isSystem: true, icon: "car" },
    { id: "P-1-3-03", code: "1.3.03", name: "Tecnología, Computación y Equipamiento", classNumber: 1, classType: "asset", groupName: "1.3 Bienes y Activos Fijos Personales", nature: "debit", isSystem: true, icon: "laptop" },
    { id: "P-1-3-04", code: "1.3.04", name: "Mobiliario y Enseres del Hogar", classNumber: 1, classType: "asset", groupName: "1.3 Bienes y Activos Fijos Personales", nature: "debit", isSystem: true, icon: "armchair" },

    // CLASE 2: PASIVOS
    { id: "P-2-1-01", code: "2.1.01", name: "Tarjetas de Crédito", classNumber: 2, classType: "liability", groupName: "2.1 Pasivo Circulante / Corto Plazo", nature: "credit", isSystem: true, icon: "credit-card" },
    { id: "P-2-1-02", code: "2.1.02", name: "Líneas de Sobregiro y Créditos Rotativos", classNumber: 2, classType: "liability", groupName: "2.1 Pasivo Circulante / Corto Plazo", nature: "credit", isSystem: true, icon: "alert-circle" },
    { id: "P-2-1-03", code: "2.1.03", name: "Préstamos Familiares y de Terceros", classNumber: 2, classType: "liability", groupName: "2.1 Pasivo Circulante / Corto Plazo", nature: "credit", isSystem: true, icon: "users" },
    { id: "P-2-2-01", code: "2.2.01", name: "Créditos Hipotecarios", classNumber: 2, classType: "liability", groupName: "2.2 Pasivo a Largo Plazo", nature: "credit", isSystem: true, icon: "building" },
    { id: "P-2-2-02", code: "2.2.02", name: "Créditos Automotrices y de Consumo", classNumber: 2, classType: "liability", groupName: "2.2 Pasivo a Largo Plazo", nature: "credit", isSystem: true, icon: "file-text" },

    // CLASE 3: PATRIMONIO NETO
    { id: "P-3-1-01", code: "3.1.01", name: "Patrimonio Neto Inicial", classNumber: 3, classType: "equity", groupName: "3.1 Capital y Fondos Propios", nature: "credit", isSystem: true, icon: "shield" },
    { id: "P-3-2-01", code: "3.2.01", name: "Ahorros y Excedentes Acumulados", classNumber: 3, classType: "equity", groupName: "3.2 Resultados y Ahorro Histórico", nature: "credit", isSystem: true, icon: "piggy-bank" },
    { id: "P-3-2-02", code: "3.2.02", name: "Resultado Operativo del Ejercicio", classNumber: 3, classType: "equity", groupName: "3.2 Resultados y Ahorro Histórico", nature: "credit", isSystem: true, icon: "award" },

    // CLASE 4: INGRESOS
    { id: "P-4-1-01", code: "4.1.01", name: "Sueldo y Salario", classNumber: 4, classType: "income", groupName: "4.1 Ingresos Laborales y Profesionales", nature: "credit", isSystem: true, icon: "briefcase" },
    { id: "P-4-1-02", code: "4.1.02", name: "Honorarios y Trabajos Freelance", classNumber: 4, classType: "income", groupName: "4.1 Ingresos Laborales y Profesionales", nature: "credit", isSystem: true, icon: "cpu" },
    { id: "P-4-1-03", code: "4.1.03", name: "Bonos, Gratificaciones y Comisiones", classNumber: 4, classType: "income", groupName: "4.1 Ingresos Laborales y Profesionales", nature: "credit", isSystem: true, icon: "sparkles" },
    { id: "P-4-2-01", code: "4.2.01", name: "Rendimientos e Inversiones Financieras", classNumber: 4, classType: "income", groupName: "4.2 Rendimientos de Capital", nature: "credit", isSystem: true, icon: "trending-up" },
    { id: "P-4-2-02", code: "4.2.02", name: "Rentas y Alquileres Cobrados", classNumber: 4, classType: "income", groupName: "4.2 Rendimientos de Capital", nature: "credit", isSystem: true, icon: "key" },
    { id: "P-4-3-01", code: "4.3.01", name: "Otros Ingresos / Reembolsos y Devoluciones", classNumber: 4, classType: "income", groupName: "4.3 Otros Ingresos", nature: "credit", isSystem: true, icon: "plus-circle" },

    // CLASE 5: GASTOS
    { id: "P-5-1-01", code: "5.1.01", name: "Vivienda & Servicios (Alquiler, Luz, Agua, Gas)", classNumber: 5, classType: "expense", groupName: "5.1 Vivienda y Hogar", nature: "debit", isSystem: true, icon: "home" },
    { id: "P-5-2-01", code: "5.2.01", name: "Alimentación & Supermercado", classNumber: 5, classType: "expense", groupName: "5.2 Alimentación y Consumo", nature: "debit", isSystem: true, icon: "shopping-cart" },
    { id: "P-5-3-01", code: "5.3.01", name: "Transporte & Combustible", classNumber: 5, classType: "expense", groupName: "5.3 Transporte y Movilidad", nature: "debit", isSystem: true, icon: "car" },
    { id: "P-5-4-01", code: "5.4.01", name: "Salud & Bienestar (Seguro, Farmacia, Deporte)", classNumber: 5, classType: "expense", groupName: "5.4 Salud y Bienestar", nature: "debit", isSystem: true, icon: "heart-pulse" },
    { id: "P-5-5-01", code: "5.5.01", name: "Educación & Cursos", classNumber: 5, classType: "expense", groupName: "5.5 Educación y Desarrollo", nature: "debit", isSystem: true, icon: "book-open" },
    { id: "P-5-6-01", code: "5.6.01", name: "Ocio, Salidas & Restaurantes", classNumber: 5, classType: "expense", groupName: "5.6 Ocio y Estilo de Vida", nature: "debit", isSystem: true, icon: "utensils" },
    { id: "P-5-6-02", code: "5.6.02", name: "Ropa & Cuidado Personal", classNumber: 5, classType: "expense", groupName: "5.6 Ocio y Estilo de Vida", nature: "debit", isSystem: true, icon: "shirt" },
    { id: "P-5-7-01", code: "5.7.01", name: "Gastos Financieros, Comisiones e Intereses", classNumber: 5, classType: "expense", groupName: "5.7 Financieros e Imprevistos", nature: "debit", isSystem: true, icon: "credit-card" }
  ];

  function obtenerCatalogoPlanCuentas(cuentasPersonalizadas = [], cuentasFinancieras = [], transacciones = []) {
    // Clonar catálogo base
    const catalogo = CATALOGO_PLAN_CUENTAS_PERSONAL_BASE.map(item => ({ ...item, balance: 0, periodMovement: 0 }));

    // Integrar y sobrescribir cuentas personalizadas del usuario (Spec 019)
    if (Array.isArray(cuentasPersonalizadas)) {
      cuentasPersonalizadas.forEach(p => {
        if (!p) return;
        // Buscar coincidencia en catálogo base por ID, por código base previo o por código actual
        const targetIdx = catalogo.findIndex(c => 
          (p.id && c.id === p.id) || 
          (p.baseCode && c.code === p.baseCode) || 
          (p.code && c.code === p.code)
        );

        if (targetIdx >= 0) {
          // Sobrescribir cuenta base originaria con la personalización del usuario
          catalogo[targetIdx] = {
            ...catalogo[targetIdx],
            ...p,
            id: p.id || catalogo[targetIdx].id,
            code: p.code || catalogo[targetIdx].code,
            name: p.name || catalogo[targetIdx].name,
            groupName: p.groupName || catalogo[targetIdx].groupName,
            nature: p.nature || catalogo[targetIdx].nature,
            classNumber: Number(p.classNumber) || catalogo[targetIdx].classNumber,
            classType: p.classType || catalogo[targetIdx].classType,
            balance: Number(p.balance) || catalogo[targetIdx].balance || 0,
            periodMovement: Number(p.periodMovement) || catalogo[targetIdx].periodMovement || 0,
            isSystem: false
          };
        } else {
          catalogo.push({
            ...p,
            balance: Number(p.balance) || 0,
            periodMovement: Number(p.periodMovement) || 0
          });
        }
      });
    }

    // Integrar cuentas financieras reales vinculadas
    if (Array.isArray(cuentasFinancieras)) {
      cuentasFinancieras.forEach((acc, idx) => {
        const isCredit = acc.type === "credit_card";
        const isSavings = acc.type === "savings";
        const isWallet = acc.type === "wallet";
        const isCash = acc.type === "cash";

        const parentCode = isCredit ? "2.1.01" : isSavings ? "1.2.01" : isWallet ? "1.1.03" : isCash ? "1.1.01" : "1.1.02";
        const classNum = isCredit ? 2 : 1;
        const classType = isCredit ? "liability" : "asset";
        const groupName = isCredit ? "2.1 Pasivo Circulante / Corto Plazo" : (isSavings ? "1.2 Inversiones y Ahorro Líquido" : "1.1 Activo Circulante / Disponible");
        const balance = isCredit ? Math.abs(Number(acc.currentBalance) || 0) : (Number(acc.currentBalance) || 0);
        const customCode = acc.codigoContable ? String(acc.codigoContable).trim() : null;

        // Verificar si ya existe en catálogo
        const existingIdx = catalogo.findIndex(c => 
          c.financialAccountId === acc.id || 
          (customCode && c.code === customCode) || 
          c.name.toLowerCase() === acc.name.toLowerCase()
        );

        if (existingIdx >= 0) {
          catalogo[existingIdx].name = acc.name;
          if (customCode) catalogo[existingIdx].code = customCode;
          catalogo[existingIdx].balance = balance;
          catalogo[existingIdx].financialAccountId = acc.id;
          catalogo[existingIdx].color = acc.color || catalogo[existingIdx].color;
          catalogo[existingIdx].icon = acc.icon || catalogo[existingIdx].icon;
        } else {
          const subCode = customCode || `${parentCode}.${String(idx + 1).padStart(2, "0")}`;
          catalogo.push({
            id: `PLAN-ACC-${acc.id}`,
            code: subCode,
            name: acc.name,
            classNumber: classNum,
            classType: classType,
            groupName: groupName,
            nature: isCredit ? "credit" : "debit",
            balance: balance,
            periodMovement: 0,
            financialAccountId: acc.id,
            isSystem: false,
            color: acc.color,
            icon: acc.icon
          });
        }
      });
    }

    // Acumular movimientos de transacciones
    if (Array.isArray(transacciones)) {
      const matchCategory = (accName, catStr) => {
        const cleanA = (accName || "").toLowerCase().replace(/&/g, "y").replace(/[^a-záéíóúüñ0-9]/g, " ").replace(/\s+/g, " ").trim();
        const cleanC = (catStr || "").toLowerCase().replace(/&/g, "y").replace(/[^a-záéíóúüñ0-9]/g, " ").replace(/\s+/g, " ").trim();
        if (!cleanA || !cleanC) return false;
        if (cleanA.includes(cleanC) || cleanC.includes(cleanA)) return true;
        const wordsA = cleanA.split(" ").filter(w => w.length > 3);
        const wordsC = cleanC.split(" ").filter(w => w.length > 3);
        return wordsA.some(w => wordsC.includes(w));
      };

      transacciones.forEach(tx => {
        const amount = Number(tx.amount) || 0;
        if (amount <= 0) return;

        if (tx.type === "income") {
          const catName = tx.category || "";
          const target = catalogo.find(c => c.classNumber === 4 && matchCategory(c.name, catName));
          if (target) {
            target.periodMovement = (Number(target.periodMovement) || 0) + amount;
          } else {
            const genericIncome = catalogo.find(c => c.code === "4.3.01");
            if (genericIncome) genericIncome.periodMovement = (Number(genericIncome.periodMovement) || 0) + amount;
          }
        } else if (tx.type === "expense") {
          if (Boolean(tx.isSplit && Array.isArray(tx.splitLines))) {
            tx.splitLines.forEach(l => {
              const lineAmt = Number(l.amount) || 0;
              if (lineAmt <= 0) return;
              const catName = l.category || "";
              const target = catalogo.find(c => (c.classNumber === 5 || c.classNumber === 1) && matchCategory(c.name, catName));
              if (target) {
                target.periodMovement = (Number(target.periodMovement) || 0) + lineAmt;
              } else {
                const genericExpense = catalogo.find(c => c.code === "5.7.01");
                if (genericExpense) genericExpense.periodMovement = (Number(genericExpense.periodMovement) || 0) + lineAmt;
              }
            });
          } else {
            const catName = tx.category || "";
            const target = catalogo.find(c => c.classNumber === 5 && matchCategory(c.name, catName));
            if (target) {
              target.periodMovement = (Number(target.periodMovement) || 0) + amount;
            } else {
              const genericExpense = catalogo.find(c => c.code === "5.7.01");
              if (genericExpense) genericExpense.periodMovement = (Number(genericExpense.periodMovement) || 0) + amount;
            }
          }
        }
      });
    }

    // Ordenar jerárquicamente por código contable
    catalogo.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));

    // Ordenar jerárquicamente por código contable
    catalogo.sort((a, b) => String(a.code || "").localeCompare(String(b.code || ""), undefined, { numeric: true, sensitivity: 'base' }));

    return catalogo;
  }

  function calcularResumenPlanCuentas(catalogo = []) {
    if (!Array.isArray(catalogo)) {
      return { totalAssets: 0, totalLiabilities: 0, netWorth: 0, totalIncome: 0, totalExpenses: 0, netResult: 0 };
    }

    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalIncome = 0;
    let totalExpenses = 0;

    catalogo.forEach((c) => {
      const bal = Number(c.balance) || 0;
      const mov = Number(c.periodMovement) || 0;
      if (c.classNumber === 1) totalAssets += bal;
      else if (c.classNumber === 2) totalLiabilities += bal;
      else if (c.classNumber === 4) totalIncome += mov;
      else if (c.classNumber === 5) totalExpenses += mov;
    });

    return {
      totalAssets,
      totalLiabilities,
      netWorth: totalAssets - totalLiabilities,
      totalIncome,
      totalExpenses,
      netResult: totalIncome - totalExpenses
    };
  }

  function validarCuentaPlan(datos, catalogoExistente = [], idActual = null) {
    if (!datos || typeof datos !== "object") {
      return { valida: false, error: "Datos de cuenta contable inválidos." };
    }

    const code = (datos.code || "").trim();
    if (!code) {
      return { valida: false, error: "El código contable es obligatorio (ej. 1.1.04 o 5.2.05)." };
    }

    const name = (datos.name || "").trim();
    if (!name) {
      return { valida: false, error: "El nombre de la cuenta contable es obligatorio." };
    }

    const classNum = Number(datos.classNumber);
    if (![1, 2, 3, 4, 5].includes(classNum)) {
      return { valida: false, error: "La clase contable debe ser un número del 1 al 5." };
    }

    // Validación jerárquica de Subcuenta (Spec 013 / RF-4)
    if (datos.parentCode && typeof datos.parentCode === "string" && datos.parentCode.trim()) {
      const parentCode = datos.parentCode.trim();
      const prefix = `${parentCode}.`;
      if (!code.startsWith(prefix) || code === prefix) {
        return {
          valida: false,
          error: `El código de la subcuenta debe comenzar con el prefijo de la cuenta padre "${parentCode}." (ej. ${parentCode}.01).`
        };
      }
    }

    if (Array.isArray(catalogoExistente)) {
      const codeLower = code.toLowerCase();
      const nameLower = name.toLowerCase();

      const dupCode = catalogoExistente.some(c => (idActual ? c.id !== idActual : true) && (c.code || "").toLowerCase() === codeLower);
      if (dupCode) {
        return { valida: false, error: `Ya existe una cuenta con el código "${code}".` };
      }

      const dupName = catalogoExistente.some(c => (idActual ? c.id !== idActual : true) && (c.name || "").toLowerCase() === nameLower && c.classNumber === classNum);
      if (dupName) {
        return { valida: false, error: `Ya existe una cuenta con el nombre "${name}" en esta clase contable.` };
      }
    }

    return { valida: true };
  }

  /**
   * Genera y sugiere el siguiente código numérico correlativo disponible para una subcuenta
   * @param {string} parentCode Código de la cuenta base padre (ej. "5.1.01")
   * @param {Array} catalogoExistente 
   * @returns {string} Código sugerido (ej. "5.1.01.01")
   */
  function generarSiguienteCodigoSubcuenta(parentCode = "", catalogoExistente = []) {
    if (!parentCode || typeof parentCode !== "string") return "";
    const pCode = parentCode.trim();
    const prefix = `${pCode}.`;
    const catalogo = Array.isArray(catalogoExistente) && catalogoExistente.length > 0
      ? catalogoExistente
      : CATALOGO_PLAN_CUENTAS_PERSONAL_BASE;

    let maxCorrelativo = 0;
    catalogo.forEach(item => {
      const c = String(item.code || "").trim();
      if (c.startsWith(prefix) || (item.parentCode && String(item.parentCode).trim() === pCode)) {
        const suffix = c.slice(prefix.length);
        const num = parseInt(suffix, 10);
        if (!isNaN(num) && num > maxCorrelativo) {
          maxCorrelativo = num;
        }
      }
    });

    const nextNum = maxCorrelativo + 1;
    return `${prefix}${String(nextNum).padStart(2, "0")}`;
  }

  function puedeEliminarCuentaPlan(cuenta) {
    if (!cuenta || typeof cuenta !== "object") {
      return { puede: false, motivo: "Cuenta no especificada." };
    }
    if (cuenta.isSystem) {
      return { puede: false, motivo: "Es una cuenta base del sistema y no puede eliminarse." };
    }
    if (cuenta.financialAccountId) {
      return { puede: false, motivo: "Esta cuenta está enlazada a una cuenta financiera activa." };
    }
    if ((Number(cuenta.balance) || 0) !== 0) {
      return { puede: false, motivo: "La cuenta posee saldo contable pendiente." };
    }
    if ((Number(cuenta.periodMovement) || 0) > 0) {
      return { puede: false, motivo: "La cuenta posee movimientos acumulados en el período." };
    }
    return { puede: true };
  }

  // ========================================================
  // ENLACE DE CATEGORÍAS CON EL PLAN DE CUENTAS (SPEC 012)
  // ========================================================

  /**
   * Obtiene las categorías disponibles a partir del catálogo del Plan de Cuentas Contable
   * @param {Array} catalogoPlan 
   * @param {string} tipo "expense" | "income" | "split" | "all"
   * @returns {Array<{ id, code, name, label, classNumber, classType, groupName, icon }>}
   */
  function obtenerCategoriasDesdePlan(catalogoPlan = [], tipo = "all") {
    const catalogo = (Array.isArray(catalogoPlan) && catalogoPlan.length > 0)
      ? catalogoPlan
      : CATALOGO_PLAN_CUENTAS_PERSONAL_BASE;

    const tipoNorm = String(tipo || "all").toLowerCase().trim();

    const filtradas = catalogo.filter((cuenta) => {
      const clsNum = Number(cuenta.classNumber) || 0;
      const code = String(cuenta.code || "");

      if (tipoNorm === "expense") {
        return clsNum === 5 || cuenta.classType === "expense";
      }

      if (tipoNorm === "income") {
        return clsNum === 4 || cuenta.classType === "income";
      }

      if (tipoNorm === "split") {
        // En un split se pueden asignar líneas a Gastos (Clase 5)
        // o a Bienes / Activos fijos personales adquiridos (Clase 1.3: Mobiliario, Tecnología, Inmuebles, Vehículos)
        if (clsNum === 5 || cuenta.classType === "expense") return true;
        if (clsNum === 1 && code.startsWith("1.3")) return true;
        return false;
      }

      // "all" o cualquier otro: incluir todas las cuentas de resultados (4 y 5) y activos amortizables/bienes (1.3)
      return clsNum === 5 || clsNum === 4 || (clsNum === 1 && code.startsWith("1.3"));
    });

    // Ordenar por código contable
    const ordenadas = [...filtradas].sort((a, b) => String(a.code || "").localeCompare(String(b.code || "")));

    return ordenadas.map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      label: `${c.code} · ${c.name}`,
      classNumber: c.classNumber,
      classType: c.classType,
      groupName: c.groupName,
      icon: c.icon || "tag"
    }));
  }

  /**
   * Resuelve y valida una categoría contra el catálogo del Plan de Cuentas Contable
   * @param {string} valor Código (ej: "5.1.01"), nombre (ej: "Alimentación") o label combinado
   * @param {Array} catalogoPlan 
   * @returns {Object|null} { code, name, label, classNumber, classType }
   */
  function resolverCategoriaPlan(valor = "", catalogoPlan = []) {
    if (!valor || typeof valor !== "string" || !valor.trim()) {
      return null;
    }

    const catalogo = (Array.isArray(catalogoPlan) && catalogoPlan.length > 0)
      ? catalogoPlan
      : CATALOGO_PLAN_CUENTAS_PERSONAL_BASE;

    const texto = valor.trim().toLowerCase();

    // 1. Coincidencia exacta por código
    const porCodigo = catalogo.find(c => String(c.code || "").trim().toLowerCase() === texto);
    if (porCodigo) {
      return {
        code: porCodigo.code,
        name: porCodigo.name,
        label: `${porCodigo.code} · ${porCodigo.name}`,
        classNumber: porCodigo.classNumber,
        classType: porCodigo.classType
      };
    }

    // Normalizador de texto para comparar nombres flexibles
    const normalizar = (str) =>
      String(str || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/&/g, "y")
        .replace(/[^a-z0-9]/g, "");

    const normBuscado = normalizar(texto);

    // 2. Coincidencia por nombre normalizado
    const porNombre = catalogo.find(c => {
      const normItem = normalizar(c.name);
      return normItem === normBuscado;
    });
    if (porNombre) {
      return {
        code: porNombre.code,
        name: porNombre.name,
        label: `${porNombre.code} · ${porNombre.name}`,
        classNumber: porNombre.classNumber,
        classType: porNombre.classType
      };
    }

    // 3. Coincidencia si el texto contiene el código contable (ej: "5.1.01 · Vivienda")
    const porContenidoCodigo = catalogo.find(c => {
      const code = String(c.code || "").trim().toLowerCase();
      return code && texto.includes(code);
    });
    if (porContenidoCodigo) {
      return {
        code: porContenidoCodigo.code,
        name: porContenidoCodigo.name,
        label: `${porContenidoCodigo.code} · ${porContenidoCodigo.name}`,
        classNumber: porContenidoCodigo.classNumber,
        classType: porContenidoCodigo.classType
      };
    }

    // 4. Coincidencia parcial si el nombre de la cuenta contiene el texto buscado
    const porParcial = catalogo.find(c => {
      const normItem = normalizar(c.name);
      return normItem.includes(normBuscado) || normBuscado.includes(normItem);
    });
    if (porParcial) {
      return {
        code: porParcial.code,
        name: porParcial.name,
        label: `${porParcial.code} · ${porParcial.name}`,
        classNumber: porParcial.classNumber,
        classType: porParcial.classType
      };
    }

    return null;
  }

  /**
   * Fusiona bidireccionalmente el estado contable local con el estado remoto de Firestore (Spec 015 / RF-1)
   * @param {Object} localState Estado local { accounts, transactions, budgets, goals, planAccounts }
   * @param {Object} remoteState Estado remoto de la nube { accounts, transactions, budgets, goals, planAccounts }
   * @returns {Object} { mergedState, hasChangesFromRemote, newTransactionsFromRemote }
   */
  function fusionarEstadoContable(localState, remoteState) {
    const local = localState && typeof localState === "object" ? localState : {};
    const remote = remoteState && typeof remoteState === "object" ? remoteState : {};

    const localTxs = Array.isArray(local.transactions) ? local.transactions : [];
    const remoteTxs = Array.isArray(remote.transactions) ? remote.transactions : [];

    const localAccs = Array.isArray(local.accounts) ? local.accounts : [];
    const remoteAccs = Array.isArray(remote.accounts) ? remote.accounts : [];

    const localBudgets = Array.isArray(local.budgets) ? local.budgets : [];
    const remoteBudgets = Array.isArray(remote.budgets) ? remote.budgets : [];

    const localGoals = Array.isArray(local.goals) ? local.goals : [];
    const remoteGoals = Array.isArray(remote.goals) ? remote.goals : [];

    const localPlan = Array.isArray(local.planAccounts) ? local.planAccounts : [];
    const remotePlan = Array.isArray(remote.planAccounts) ? remote.planAccounts : [];

    // Listas de eliminados (Tombstones - Spec 016)
    const localDeletedPlan = Array.isArray(local.deletedPlanAccounts) ? local.deletedPlanAccounts : [];
    const remoteDeletedPlan = Array.isArray(remote.deletedPlanAccounts) ? remote.deletedPlanAccounts : [];
    const deletedPlanSet = new Set([...localDeletedPlan, ...remoteDeletedPlan]);

    const localDeletedBudgets = Array.isArray(local.deletedBudgets) ? local.deletedBudgets : [];
    const remoteDeletedBudgets = Array.isArray(remote.deletedBudgets) ? remote.deletedBudgets : [];
    const deletedBudgetsSet = new Set([...localDeletedBudgets, ...remoteDeletedBudgets]);

    const localDeletedGoals = Array.isArray(local.deletedGoals) ? local.deletedGoals : [];
    const remoteDeletedGoals = Array.isArray(remote.deletedGoals) ? remote.deletedGoals : [];
    const deletedGoalsSet = new Set([...localDeletedGoals, ...remoteDeletedGoals]);

    const localDeletedAccounts = Array.isArray(local.deletedAccounts) ? local.deletedAccounts : [];
    const remoteDeletedAccounts = Array.isArray(remote.deletedAccounts) ? remote.deletedAccounts : [];
    const deletedAccountsSet = new Set([...localDeletedAccounts, ...remoteDeletedAccounts]);

    // 1. Fusionar transacciones sin duplicados por ID
    const txMap = new Map();
    let newTxsFromRemote = 0;
    const localTxIdSet = new Set(localTxs.map(t => t.id));

    localTxs.forEach(t => {
      if (t && t.id) txMap.set(t.id, { ...t });
    });

    remoteTxs.forEach(t => {
      if (!t || !t.id) return;
      if (!txMap.has(t.id)) {
        txMap.set(t.id, { ...t });
        if (!localTxIdSet.has(t.id)) {
          newTxsFromRemote++;
        }
      } else {
        const existing = txMap.get(t.id);
        txMap.set(t.id, { ...t, ...existing });
      }
    });

    const mergedTransactions = Array.from(txMap.values());
    mergedTransactions.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    // 2. Fusionar cuentas sin duplicados por ID (Local-First: atributos locales tienen prioridad, excluyendo eliminados)
    const accMap = new Map();
    localAccs.forEach(a => {
      if (a && a.id && !deletedAccountsSet.has(a.id)) accMap.set(a.id, { ...a });
    });
    remoteAccs.forEach(a => {
      if (!a || !a.id || deletedAccountsSet.has(a.id)) return;
      if (!accMap.has(a.id)) {
        accMap.set(a.id, { ...a });
      } else {
        const existing = accMap.get(a.id);
        accMap.set(a.id, {
          ...a,
          ...existing,
          initialBalance: existing.initialBalance ?? a.initialBalance
        });
      }
    });

    // Recalcular contablemente el balance actual (currentBalance) de cada cuenta
    const mergedAccounts = Array.from(accMap.values()).map(acc => {
      let balance = Number(acc.initialBalance || 0);

      mergedTransactions.forEach(tx => {
        const amt = Number(tx.amount || 0);
        if (tx.isSplit && Array.isArray(tx.splitLines)) {
          if (tx.accountId === acc.id) {
            balance -= amt;
          }
          tx.splitLines.forEach(line => {
            if (line.targetAccountId === acc.id) {
              balance += Number(line.amount || 0);
            }
          });
        } else if (tx.type === "expense" && tx.accountId === acc.id) {
          balance -= amt;
        } else if (tx.type === "income" && tx.accountId === acc.id) {
          balance += amt;
        } else if (tx.type === "transfer") {
          if (tx.accountId === acc.id) balance -= amt;
          if (tx.toAccountId === acc.id) {
            const credited = tx.toAmount !== undefined && tx.toAmount !== null && !isNaN(Number(tx.toAmount))
              ? Number(tx.toAmount)
              : amt;
            balance += credited;
          }
        }
      });

      return {
        ...acc,
        currentBalance: balance
      };
    });

    // 3. Fusionar presupuestos (Local-First: límites modificados localmente tienen prioridad, excluyendo eliminados)
    const budgetMap = new Map();
    localBudgets.forEach(b => {
      if (b && b.id && !deletedBudgetsSet.has(b.id)) budgetMap.set(b.id, { ...b });
    });
    remoteBudgets.forEach(b => {
      if (!b || !b.id || deletedBudgetsSet.has(b.id)) return;
      if (!budgetMap.has(b.id)) {
        budgetMap.set(b.id, { ...b });
      } else {
        const existing = budgetMap.get(b.id);
        budgetMap.set(b.id, { ...b, ...existing });
      }
    });
    const mergedBudgets = Array.from(budgetMap.values());

    // 4. Fusionar metas de ahorro (excluyendo eliminados)
    const goalMap = new Map();
    localGoals.forEach(g => {
      if (g && g.id && !deletedGoalsSet.has(g.id)) goalMap.set(g.id, { ...g });
    });
    remoteGoals.forEach(g => {
      if (!g || !g.id || deletedGoalsSet.has(g.id)) return;
      if (!goalMap.has(g.id)) {
        goalMap.set(g.id, { ...g });
      } else {
        const existing = goalMap.get(g.id);
        const currentAmount = Math.max(Number(existing.currentAmount || 0), Number(g.currentAmount || 0));
        goalMap.set(g.id, { ...existing, ...g, currentAmount });
      }
    });
    const mergedGoals = Array.from(goalMap.values());

    // 5. Fusionar plan de cuentas personalizado (Local-First: subcuentas locales tienen prioridad, excluyendo eliminados)
    const planMap = new Map();
    localPlan.forEach(p => {
      if (p && (p.id || p.code)) {
        const key = p.code || p.id;
        if (!deletedPlanSet.has(p.code) && !deletedPlanSet.has(p.id)) {
          planMap.set(key, { ...p });
        }
      }
    });
    remotePlan.forEach(p => {
      if (!p || (!p.id && !p.code)) return;
      const key = p.code || p.id;
      if (deletedPlanSet.has(p.code) || deletedPlanSet.has(p.id)) return;
      if (!planMap.has(key)) {
        planMap.set(key, { ...p });
      } else {
        const existing = planMap.get(key);
        planMap.set(key, { ...p, ...existing });
      }
    });
    const mergedPlanAccounts = Array.from(planMap.values());

    // 6. Fusionar tabla de monedas (Spec 018 / RF-7)
    const localCurrencies = Array.isArray(local.currencies) ? local.currencies : [];
    const remoteCurrencies = Array.isArray(remote.currencies) ? remote.currencies : [];

    const currencyMap = new Map();
    if (localCurrencies.length === 0 && remoteCurrencies.length === 0) {
      CURRENCIES_BASE.forEach(c => currencyMap.set(c.code.toUpperCase(), { ...c }));
    } else {
      remoteCurrencies.forEach(c => {
        if (c && c.code) {
          const key = c.code.toUpperCase();
          currencyMap.set(key, { ...c });
        }
      });
      localCurrencies.forEach(c => {
        if (c && c.code) {
          const key = c.code.toUpperCase();
          currencyMap.set(key, { ...(currencyMap.get(key) || {}), ...c });
        }
      });
      if (!currencyMap.has("CLP")) {
        currencyMap.set("CLP", { code: "CLP", name: "Peso Chileno", symbol: "$", rateToCLP: 1.0, isBase: true });
      }
    }
    const mergedCurrencies = Array.from(currencyMap.values());

    const hasNewAccounts = mergedAccounts.length > localAccs.length;
    const hasNewBudgets = mergedBudgets.length > localBudgets.length;
    const hasNewGoals = mergedGoals.length > localGoals.length;
    const hasNewPlan = mergedPlanAccounts.length > localPlan.length;
    const hasChangesFromRemote = Boolean(newTxsFromRemote > 0 || hasNewAccounts || hasNewBudgets || hasNewGoals || hasNewPlan);

    return {
      mergedState: {
        accounts: mergedAccounts,
        transactions: mergedTransactions,
        budgets: mergedBudgets,
        goals: mergedGoals,
        planAccounts: mergedPlanAccounts,
        currencies: mergedCurrencies,
        deletedAccounts: Array.from(deletedAccountsSet),
        deletedPlanAccounts: Array.from(deletedPlanSet),
        deletedBudgets: Array.from(deletedBudgetsSet),
        deletedGoals: Array.from(deletedGoalsSet)
      },
      hasChangesFromRemote,
      newTransactionsFromRemote: newTxsFromRemote
    };
  }

  // ========================================================
  // MÓDULO DE REPORTES CONTABLES Y FINANCIEROS (SPEC 020)
  // ========================================================

  /**
   * Genera el Balance General Clasificado según normativa contable chilena (IFRS Pymes)
   * Clasifica en Activo Circulante, Activo Fijo, Pasivo Circulante, Pasivo Largo Plazo y Patrimonio Neto,
   * garantizando cuadratura estricta: Total Activos === Total Pasivos + Total Patrimonio
   * 
   * @param {Array} accounts Lista de cuentas financieras (bancos, billeteras, tarjetas)
   * @param {Array} planCatalog Catálogo de cuentas del plan contable
   * @param {Array} transactions Lista de transacciones para calcular el resultado del período
   * @param {Object} options Opciones { currencies, startDate, endDate, cutoffDate }
   * @returns {Object} Balance General estructurado y cuadrado
   */
  function generarBalanceGeneral(accounts = [], planCatalog = [], transactions = [], options = {}) {
    const accList = Array.isArray(accounts) ? accounts : [];
    const catalog = Array.isArray(planCatalog) ? planCatalog : [];
    const txList = Array.isArray(transactions) ? transactions : [];

    const currList = Array.isArray(options.currencies) && options.currencies.length > 0
      ? options.currencies
      : CURRENCIES_BASE;

    const getRate = (currCode) => {
      if (!currCode || currCode.toUpperCase() === "CLP") return 1.0;
      const found = currList.find(c => (c.code || "").toUpperCase() === currCode.toUpperCase());
      return found ? Number(found.rateToCLP || 1.0) : 1.0;
    };

    const notasCambiarias = [];
    const usedCurrencies = new Set();

    // 1. Clasificación de Activos y Pasivos Circulantes desde las Cuentas Financieras
    const cuentasActivoCirculante = [];
    const cuentasPasivoCirculante = [];
    let totalActivoCirculante = 0;
    let totalPasivoCirculante = 0;

    accList.forEach(acc => {
      if (acc.isExcludedFromTotal) return;
      const balOriginal = Number(acc.currentBalance) || 0;
      const curr = (acc.currency || "CLP").toUpperCase();
      const rate = getRate(curr);
      const balCLP = balOriginal * rate;

      if (curr !== "CLP" && !usedCurrencies.has(curr)) {
        usedCurrencies.add(curr);
        notasCambiarias.push({
          currency: curr,
          rateToCLP: rate,
          message: `1 ${curr} = ${rate.toLocaleString("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} CLP`
        });
      }

      if (acc.type === "credit_card" || balCLP < 0) {
        // Deuda de tarjeta o sobregiro bancario -> Pasivo Circulante
        const deudaCLP = Math.abs(balCLP);
        cuentasPasivoCirculante.push({
          id: acc.id,
          name: acc.name,
          type: acc.type,
          currency: curr,
          originalBalance: balOriginal,
          balanceCLP: deudaCLP,
          code: "2.1.01"
        });
        totalPasivoCirculante += deudaCLP;
      } else {
        // Saldo positivo en banco, efectivo, billetera o ahorro -> Activo Circulante
        cuentasActivoCirculante.push({
          id: acc.id,
          name: acc.name,
          type: acc.type,
          currency: curr,
          originalBalance: balOriginal,
          balanceCLP: balCLP,
          code: acc.type === "cash" ? "1.1.01" : (acc.type === "savings" ? "1.2.01" : "1.1.02")
        });
        totalActivoCirculante += balCLP;
      }
    });

    // 2. Incorporar cuentas del Plan Contable (Bienes, Inmuebles, Deudas a Largo Plazo, Capital)
    const cuentasActivoFijo = [];
    let totalActivoFijo = 0;

    const cuentasPasivoLargoPlazo = [];
    let totalPasivoLargoPlazo = 0;

    const cuentasPatrimonio = [];
    let totalCapitalDeclarado = 0;

    catalog.forEach(item => {
      // Ignorar si está enlazada a una cuenta financiera ya computada en cuentasActivoCirculante o cuentasPasivoCirculante
      if (item.financialAccountId && accList.some(a => a.id === item.financialAccountId)) {
        return;
      }

      const bal = Number(item.balance) || 0;
      const clsNum = Number(item.classNumber) || 0;
      const code = String(item.code || "").trim();

      // Activos Fijos / No Circulantes (Clase 1.3: Inmuebles, Vehículos, Mobiliario, Tecnología)
      if (clsNum === 1 && code.startsWith("1.3")) {
        cuentasActivoFijo.push({
          id: item.id,
          name: item.name,
          code: item.code,
          balanceCLP: bal
        });
        totalActivoFijo += bal;
      } else if (clsNum === 1 && (code.startsWith("1.1") || code.startsWith("1.2")) && !item.financialAccountId) {
        // Cuentas contables de activo circulante sin cuenta financiera directa
        if (bal !== 0) {
          cuentasActivoCirculante.push({
            id: item.id,
            name: item.name,
            code: item.code,
            balanceCLP: bal
          });
          totalActivoCirculante += bal;
        }
      }

      // Pasivos a Largo Plazo (Clase 2.2: Créditos Hipotecarios, Automotrices)
      if (clsNum === 2 && code.startsWith("2.2")) {
        const deuda = Math.abs(bal);
        cuentasPasivoLargoPlazo.push({
          id: item.id,
          name: item.name,
          code: item.code,
          balanceCLP: deuda
        });
        totalPasivoLargoPlazo += deuda;
      } else if (clsNum === 2 && code.startsWith("2.1") && !item.financialAccountId) {
        // Pasivos circulantes contables adicionales
        if (bal !== 0) {
          const deuda = Math.abs(bal);
          cuentasPasivoCirculante.push({
            id: item.id,
            name: item.name,
            code: item.code,
            balanceCLP: deuda
          });
          totalPasivoCirculante += deuda;
        }
      }

      // Patrimonio (Clase 3: Capital inicial, Reservas, Aportes)
      if (clsNum === 3) {
        cuentasPatrimonio.push({
          id: item.id,
          name: item.name,
          code: item.code,
          balanceCLP: bal
        });
        totalCapitalDeclarado += bal;
      }
    });

    const totalActivos = totalActivoCirculante + totalActivoFijo;
    const totalPasivos = totalPasivoCirculante + totalPasivoLargoPlazo;

    // 3. Resultado del Ejercicio (si se especifican fechas o transacciones)
    let resultadoEjercicio = 0;
    if (txList.length > 0 && (options.startDate || options.endDate)) {
      const er = generarEstadoResultados(txList, catalog, options);
      resultadoEjercicio = er.resultadoNeto;
    }

    // 4. Determinación del Total Patrimonio y Cuadratura Contable
    // Patrimonio Neto = Total Activos - Total Pasivos
    const patrimonioNetoContable = totalActivos - totalPasivos;

    let totalPatrimonio = 0;
    if (totalCapitalDeclarado !== 0) {
      if (totalCapitalDeclarado === patrimonioNetoContable) {
        totalPatrimonio = totalCapitalDeclarado;
      } else {
        totalPatrimonio = patrimonioNetoContable;
      }
    } else {
      totalPatrimonio = patrimonioNetoContable;
    }

    const diferenciaCuadratura = totalActivos - (totalPasivos + totalPatrimonio);
    const estaCuadrado = Math.abs(diferenciaCuadratura) < 0.001;

    return {
      fechaCorte: options.endDate || options.cutoffDate || new Date().toISOString().slice(0, 10),
      monedaReporte: "CLP",
      activos: {
        circulante: {
          cuentas: cuentasActivoCirculante,
          total: totalActivoCirculante
        },
        fijo: {
          cuentas: cuentasActivoFijo,
          total: totalActivoFijo
        },
        total: totalActivos
      },
      pasivos: {
        circulante: {
          cuentas: cuentasPasivoCirculante,
          total: totalPasivoCirculante
        },
        largoPlazo: {
          cuentas: cuentasPasivoLargoPlazo,
          total: totalPasivoLargoPlazo
        },
        total: totalPasivos
      },
      patrimonio: {
        cuentas: cuentasPatrimonio,
        capitalDeclarado: totalCapitalDeclarado,
        resultadoEjercicio,
        total: totalPatrimonio
      },
      cuadratura: {
        totalActivos,
        totalPasivoMasPatrimonio: totalPasivos + totalPatrimonio,
        diferencia: Math.round(diferenciaCuadratura * 100) / 100,
        estaCuadrado
      },
      notasCambiarias
    };
  }

  /**
   * Genera el Estado de Resultados (Ganancias y Pérdidas) para un período dado
   * Discrimina ingresos operacionales y no operacionales, gastos de vida y gastos financieros.
   * 
   * @param {Array} transactions Lista de transacciones
   * @param {Array} planCatalog Catálogo de cuentas del plan contable
   * @param {Object} options { startDate, endDate, currencies }
   * @returns {Object} Estado de Resultados
   */
  function generarEstadoResultados(transactions = [], planCatalog = [], options = {}) {
    const txList = Array.isArray(transactions) ? transactions : [];
    const startDate = options.startDate ? String(options.startDate).slice(0, 10) : "";
    const endDate = options.endDate ? String(options.endDate).slice(0, 10) : "";

    const txFiltradas = txList.filter(tx => {
      if (tx.type === "transfer") return false;
      const txDate = String(tx.date || "").slice(0, 10);
      if (startDate && txDate < startDate) return false;
      if (endDate && txDate > endDate) return false;
      return true;
    });

    let totalIngresosOperacionales = 0;
    let totalIngresosNoOperacionales = 0;

    let totalGastosOperacionales = 0;
    let totalGastosFinancieros = 0;

    const ingresosAgrupados = new Map();
    const ingresosNoOpAgrupados = new Map();
    const gastosOpAgrupados = new Map();
    const gastosFinAgrupados = new Map();

    const sumarCategoria = (mapa, key, code, name, amount) => {
      const amt = Number(amount) || 0;
      if (!mapa.has(key)) {
        mapa.set(key, { code: code || "", name: name || key, amount: 0 });
      }
      mapa.get(key).amount += amt;
    };

    txFiltradas.forEach(tx => {
      const amt = Number(tx.amount) || 0;
      if (tx.type === "income") {
        const catCode = String(tx.categoryCode || "").trim();
        const catName = tx.category || "Ingreso Sin Categoría";
        const isNoOp = catCode.startsWith("4.2") || /inversión|rendimiento|dividendo|arriendo|capital/i.test(catName);
        
        if (isNoOp) {
          totalIngresosNoOperacionales += amt;
          sumarCategoria(ingresosNoOpAgrupados, catName, catCode, catName, amt);
        } else {
          totalIngresosOperacionales += amt;
          sumarCategoria(ingresosAgrupados, catName, catCode, catName, amt);
        }
      } else if (tx.type === "expense") {
        if (tx.isSplit && Array.isArray(tx.splitLines) && tx.splitLines.length > 0) {
          tx.splitLines.forEach(line => {
            const lineAmt = Number(line.amount) || 0;
            const lineCode = String(line.categoryCode || "").trim();
            const lineCat = line.category || tx.category || "Gasto Varios";
            const isFin = lineCode.startsWith("5.7") || /financiero|inter[eé]s|comisi[oó]n|cr[eé]dito/i.test(lineCat);

            if (isFin) {
              totalGastosFinancieros += lineAmt;
              sumarCategoria(gastosFinAgrupados, lineCat, lineCode, lineCat, lineAmt);
            } else {
              totalGastosOperacionales += lineAmt;
              sumarCategoria(gastosOpAgrupados, lineCat, lineCode, lineCat, lineAmt);
            }
          });
        } else {
          const catCode = String(tx.categoryCode || "").trim();
          const catName = tx.category || "Gasto Sin Categoría";
          const isFin = catCode.startsWith("5.7") || /financiero|inter[eé]s|comisi[oó]n|cr[eé]dito/i.test(catName);

          if (isFin) {
            totalGastosFinancieros += amt;
            sumarCategoria(gastosFinAgrupados, catName, catCode, catName, amt);
          } else {
            totalGastosOperacionales += amt;
            sumarCategoria(gastosOpAgrupados, catName, catCode, catName, amt);
          }
        }
      }
    });

    const totalIngresos = totalIngresosOperacionales + totalIngresosNoOperacionales;
    const totalGastos = totalGastosOperacionales + totalGastosFinancieros;
    const resultadoNeto = totalIngresos - totalGastos;
    const esSuperavit = resultadoNeto >= 0;
    const tasaAhorro = totalIngresos > 0 ? Math.round(((resultadoNeto) / totalIngresos) * 1000) / 10 : 0;

    return {
      periodo: {
        startDate,
        endDate
      },
      ingresos: {
        operacionales: Array.from(ingresosAgrupados.values()),
        operacionalesTotal: totalIngresosOperacionales,
        noOperacionales: Array.from(ingresosNoOpAgrupados.values()),
        noOperacionalesTotal: totalIngresosNoOperacionales,
        total: totalIngresos
      },
      gastos: {
        operacionales: Array.from(gastosOpAgrupados.values()),
        operacionalesTotal: totalGastosOperacionales,
        financieros: Array.from(gastosFinAgrupados.values()),
        financierosTotal: totalGastosFinancieros,
        total: totalGastos
      },
      resultadoNeto,
      esSuperavit,
      tasaAhorro
    };
  }

  /**
   * Genera el archivo CSV con BOM UTF-8 (\uFEFF) para exportación a Excel
   * Cumple con RFC 4180
   * 
   * @param {string} tipoReporte "balance" | "income_statement" | "resultados"
   * @param {Object} dataReporte Objeto de datos con { titulo, periodo, fechaEmision, filas }
   * @returns {string} Contenido CSV en formato UTF-8
   */
  function generarReporteCSV(tipoReporte, dataReporte = {}) {
    const BOM = "\uFEFF";
    const escapeCSV = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val);
      if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r") || str.includes(";")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return `"${str}"`;
    };

    const lineas = [];
    const titulo = dataReporte.titulo || (tipoReporte === "balance" ? "Balance General Clasificado" : "Estado de Resultados");
    const periodo = dataReporte.periodo || "";
    const fechaEmision = dataReporte.fechaEmision || new Date().toISOString().slice(0, 10);

    lineas.push([escapeCSV("SISTEMA DE CONTABILIDAD PERSONAL Y GESTIÓN PATRIMONIAL")].join(","));
    lineas.push([escapeCSV(`REPORTE: ${titulo}`)].join(","));
    if (periodo) {
      lineas.push([escapeCSV(`PERÍODO: ${periodo}`)].join(","));
    }
    lineas.push([escapeCSV(`FECHA DE EMISIÓN: ${fechaEmision}`), escapeCSV("MONEDA BASE: CLP")].join(","));
    lineas.push(""); // Línea en blanco

    // Encabezados de columnas
    lineas.push([escapeCSV("SECCIÓN"), escapeCSV("RUBRO / CUENTA"), escapeCSV("MONTO (CLP)")].join(","));

    if (Array.isArray(dataReporte.filas)) {
      dataReporte.filas.forEach(f => {
        lineas.push([
          escapeCSV(f.seccion || ""),
          escapeCSV(f.rubro || f.cuenta || ""),
          Number(f.monto || 0).toString()
        ].join(","));
      });
    }

    return BOM + lineas.join("\r\n");
  }

  // ========================================================
  // MÓDULO DE AUTENTICACIÓN FIREBASE AUTH (SPEC 021)
  // ========================================================

  /**
   * Valida sintácticamente las credenciales de correo y contraseña
   * @param {string} email
   * @param {string} password
   * @param {boolean} isSignUp
   * @returns {{ valida: boolean, error?: string, email?: string, password?: string }}
   */
  function validarCredencialesAuth(email, password, isSignUp = false) {
    if (!email || typeof email !== "string" || !email.trim()) {
      return { valida: false, valido: false, error: "Ingresa un correo electrónico válido." };
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return { valida: false, valido: false, error: "Ingresa un correo electrónico válido." };
    }

    if (!password || typeof password !== "string") {
      return { valida: false, valido: false, error: "Ingresa tu contraseña." };
    }

    if (isSignUp && password.length < 6) {
      return { valida: false, valido: false, error: "La contraseña debe tener al menos 6 caracteres." };
    }

    return {
      valida: true,
      valido: true,
      email: cleanEmail,
      password
    };
  }

  /**
   * Traduce códigos de error técnicos de Firebase Authentication a mensajes comprensibles en español
   * @param {string} errorCode
   * @returns {string} Mensaje traducido
   */
  function traducirErrorFirebaseAuth(errorCode = "") {
    const code = String(errorCode || "").trim().toUpperCase();

    if (code.includes("EMAIL_EXISTS")) {
      return "El correo electrónico ya se encuentra registrado. Intenta iniciar sesión con tu contraseña.";
    }
    if (code.includes("INVALID_LOGIN_CREDENTIALS") || code.includes("EMAIL_NOT_FOUND") || code.includes("INVALID_PASSWORD")) {
      return "Credenciales inválidas. Verifica tu correo electrónico y tu contraseña.";
    }
    if (code.includes("WEAK_PASSWORD")) {
      return "La contraseña es muy débil. Debe tener al menos 6 caracteres.";
    }
    if (code.includes("INVALID_EMAIL")) {
      return "El formato del correo electrónico ingresado no es válido.";
    }
    if (code.includes("USER_DISABLED")) {
      return "Esta cuenta de usuario ha sido deshabilitada por el administrador.";
    }
    if (code.includes("TOO_MANY_ATTEMPTS_TRY_LATER")) {
      return "Demasiados intentos fallidos. Por seguridad, espera unos minutos antes de intentar nuevamente.";
    }
    if (code.includes("OPERATION_NOT_ALLOWED")) {
      return "El método de autenticación por correo y contraseña no está habilitado en Firebase Console.";
    }
    if (code.includes("CONFIGURATION_NOT_FOUND") || code.includes("PROJECT_NOT_FOUND")) {
      return "Firebase Authentication no está inicializado en tu proyecto 'mi-propia-contabilidad'. Debes activarlo en Firebase Console -> Authentication haciendo clic en 'Comenzar' (Get Started) y habilitando el proveedor 'Correo electrónico/contraseña'.";
    }

    return `Error de autenticación: ${errorCode || "No fue posible completar la operación."}`;
  }

  /**
   * Construye el cuerpo JSON adecuado para los endpoints REST de Firebase Auth
   * @param {"signUp" | "signIn" | "refresh"} type
   * @param {string} email
   * @param {string} password
   * @param {string} refreshToken
   * @returns {Object} Payload
   */
  function construirPayloadAuth(type, email, password, refreshToken) {
    if (type === "refresh") {
      return {
        grant_type: "refresh_token",
        refresh_token: refreshToken || ""
      };
    }

    return {
      email: email ? String(email).trim().toLowerCase() : "",
      password: password ? String(password) : "",
      returnSecureToken: true
    };
  }

  /**
   * Extrae y normaliza el objeto de sesión desde la respuesta REST de Firebase Auth
   * @param {Object} apiResponse
   * @param {number} currentTimestampMs
   * @returns {{ uid: string, email: string, idToken: string, refreshToken: string, expiresAt: number }}
   */
  function extraerSesionAuth(apiResponse = {}, currentTimestampMs = Date.now()) {
    const uid = apiResponse.localId || apiResponse.user_id || "";
    const email = apiResponse.email || "";
    const idToken = apiResponse.idToken || apiResponse.id_token || "";
    const refreshToken = apiResponse.refreshToken || apiResponse.refresh_token || "";
    const expiresInSec = Number(apiResponse.expiresIn || apiResponse.expires_in || 3600);
    const expiresAt = currentTimestampMs + (expiresInSec * 1000);

    return {
      uid,
      email,
      idToken,
      refreshToken,
      expiresAt
    };
  }

  /**
   * Determina si el token JWT actual está expirado o próximo a vencer
   * @param {Object} session
   * @param {number} currentTimestampMs
   * @param {number} thresholdSeconds Umbral de seguridad en segundos (defecto: 300s = 5 min)
   * @returns {boolean}
   */
  function esTokenExpirado(session, currentTimestampMs = Date.now(), thresholdSeconds = 300) {
    if (!session || !session.idToken || !session.expiresAt) return true;
    const safetyMarginMs = Number(thresholdSeconds || 300) * 1000;
    return currentTimestampMs >= (session.expiresAt - safetyMarginMs);
  }

  /**
   * Determina si un usuario cumple con los requisitos para acceder a la aplicación
   * @param {Object|null} authSession
   * @param {number} currentTimestampMs
   * @returns {boolean}
   */
  function puedeAccederApp(authSession, currentTimestampMs = Date.now()) {
    if (!authSession || typeof authSession !== "object") return false;
    if (typeof authSession.uid !== "string" || !authSession.uid.trim()) return false;
    if (typeof authSession.idToken !== "string" || !authSession.idToken.trim()) return false;
    return true;
  }

  /**
   * Genera el estado contable inicial limpio para un usuario recién autenticado
   * @param {string} uid
   * @param {string} email
   * @returns {Object}
   */
  function crearEstadoInicialLimpio(uid = "", email = "") {
    return {
      uid: typeof uid === "string" ? uid : "",
      email: typeof email === "string" ? email : "",
      accounts: [],
      transactions: [],
      budgets: [],
      goals: [],
      planAccounts: [],
      currencies: CURRENCIES_BASE.map(c => ({ ...c })),
      deletedAccounts: [],
      deletedPlanAccounts: [],
      deletedBudgets: [],
      deletedGoals: []
    };
  }

  /**
   * Purga registros semilla de prueba o demostración de listas locales
   * @param {Array} list
   * @param {string} type
   * @returns {Array}
   */
  function purgarDatosDemoLocales(list = [], type = "accounts") {
    if (!Array.isArray(list)) return [];
    
    const demoIdsRegex = /^(ACC-00\d|TX-2026-0\d+|BUD-00\d|GOAL-00\d)$/i;
    const demoExactIds = new Set([
      "ACC-001", "ACC-002", "ACC-003", "ACC-004", "ACC-005",
      "BUD-001", "BUD-002", "BUD-003", "BUD-004",
      "GOAL-001", "GOAL-002"
    ]);

    return list.filter(item => {
      if (!item || typeof item !== "object") return false;
      const id = String(item.id || "").trim();
      if (demoExactIds.has(id) || demoIdsRegex.test(id)) return false;
      
      const name = String(item.name || item.title || item.description || "");
      if (name.includes("(Demo)")) return false;

      return true;
    });
  }

  /**
   * Normaliza una cadena para búsquedas insensibles a mayúsculas y diacríticos (Spec 023)
   * @param {string} texto
   * @returns {string}
   */
  function normalizarTextoBusqueda(texto = "") {
    return String(texto || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  /**
   * Filtra un conjunto de cuentas financieras en base a un término de búsqueda (Spec 023)
   * @param {Array} cuentas
   * @param {string} termino
   * @returns {Array} Cuentas filtradas
   */
  function filtrarCuentasFinancieras(cuentas = [], termino = "") {
    if (!Array.isArray(cuentas)) return [];
    const termNorm = normalizarTextoBusqueda(termino);
    if (!termNorm) return [...cuentas];

    const typeLabels = {
      bank: "cuenta bancaria banco corriente vista",
      cash: "efectivo caja billetera efectivo",
      wallet: "billetera digital mercadopago mach prepago",
      savings: "ahorro inversion deposito fondo mutuo",
      credit_card: "tarjeta de credito pasivo deuda visa mastercard"
    };

    return cuentas.filter(acc => {
      if (!acc || typeof acc !== "object") return false;
      const nameNorm = normalizarTextoBusqueda(acc.name);
      const currNorm = normalizarTextoBusqueda(acc.currency);
      const typeKeyNorm = normalizarTextoBusqueda(acc.type);
      const typeLabelNorm = normalizarTextoBusqueda(typeLabels[acc.type] || "");

      return (
        nameNorm.includes(termNorm) ||
        currNorm.includes(termNorm) ||
        typeKeyNorm.includes(termNorm) ||
        typeLabelNorm.includes(termNorm)
      );
    });
  }

  // ========================================================
  // SPEC 024: AISLAMIENTO MULTI-USUARIO POR UID (NAMESPACING)
  // ========================================================
  const GLOBAL_STORAGE_KEYS = new Set([
    "finance_theme",
    "finance_remote_db_config",
    "finance_auth_session"
  ]);

  function obtenerClaveStorage(claveBase, uid) {
    if (!claveBase || typeof claveBase !== "string") return "";
    // Claves globales de configuración del navegador/dispositivo
    if (GLOBAL_STORAGE_KEYS.has(claveBase)) {
      return claveBase;
    }
    const cleanUid = (typeof uid === "string" && uid.trim().length > 0) ? uid.trim() : null;
    if (!cleanUid) {
      return claveBase.startsWith("finance_") ? claveBase : `finance_${claveBase}`;
    }
    const suffix = claveBase.startsWith("finance_") ? claveBase.slice("finance_".length) : claveBase;
    return `finance_${cleanUid}_${suffix}`;
  }

  return {
    calcularPatrimonioNeto,
    calcularBalanceMes,
    calcularEjecucionPresupuesto,
    validarTransaccion,
    aplicarTransaccionEnCuentas,
    validarNuevaCuenta,
    crearCuentaObjeto,
    validarMovimientoSplit,
    aplicarMovimientoSplitEnCuentas,
    validarPresupuesto,
    calcularGastoCategoriaMes,
    sincronizarPresupuestosConTransacciones,
    validarMetaAhorro,
    calcularProgresoMeta,
    aplicarAporteMeta,
    validarBackupJSON,
    filtrarTransacciones,
    generarTransaccionesCSV,
    obtenerMovimientosDeCuenta,
    calcularResumenCuenta,
    clasificarPlanDeCuentas,
    validarEdicionCuenta,
    puedeEliminarCuenta,
    purgarMovimientosDeCuenta,
    CURRENCIES_BASE,
    validarMoneda,
    calcularConversionMoneda,
    CATALOGO_PLAN_CUENTAS_PERSONAL_BASE,
    obtenerCatalogoPlanCuentas,
    calcularResumenPlanCuentas,
    validarCuentaPlan,
    puedeEliminarCuentaPlan,
    obtenerCategoriasDesdePlan,
    resolverCategoriaPlan,
    generarSiguienteCodigoSubcuenta,
    fusionarEstadoContable,
    generarBalanceGeneral,
    generarEstadoResultados,
    generarReporteCSV,
    validarCredencialesAuth,
    traducirErrorFirebaseAuth,
    construirPayloadAuth,
    extraerSesionAuth,
    esTokenExpirado,
    puedeAccederApp,
    crearEstadoInicialLimpio,
    purgarDatosDemoLocales,
    filtrarCuentasFinancieras,
    obtenerClaveStorage
  };
});
