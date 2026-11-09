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
  
  /**
   * Calcula el patrimonio neto consolidado
   * Patrimonio Neto = Activos (cuentas no deudas) - Pasivos (tarjetas de crédito o saldos negativos)
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
        expense += amt;
        const cat = tx.category || "Otros";
        categoryExpenses[cat] = (categoryExpenses[cat] || 0) + amt;
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

  return {
    calcularPatrimonioNeto,
    calcularBalanceMes,
    calcularEjecucionPresupuesto
  };
});
