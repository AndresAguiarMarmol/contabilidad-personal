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
   * Calcula el patrimonio neto consolidado
   * @param {Array} accounts 
   * @returns {{ assets: number, liabilities: number, netWorth: number }}
   */
  function calcularPatrimonioNeto(accounts) {
    let assets = 0;
    let liabilities = 0;

    if (!Array.isArray(accounts)) {
      return { assets: 0, liabilities: 0, netWorth: 0 };
    }

    accounts.forEach((acc) => {
      if (acc.isExcludedFromTotal) return;
      const bal = Number(acc.currentBalance) || 0;
      if (acc.type === "credit_card" || bal < 0) {
        liabilities += Math.abs(bal);
      } else {
        assets += bal;
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
          updated.currentBalance = (Number(updated.currentBalance) || 0) + amount;
        }
      }

      return updated;
    });
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
          totalAbonos += Number(tx.amount) || 0;
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
    puedeEliminarCuenta
  };
});
