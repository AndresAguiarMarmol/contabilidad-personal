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
    sincronizarPresupuestosConTransacciones
  };
});
