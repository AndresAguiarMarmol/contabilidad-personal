const { test } = require('node:test');
const assert = require('node:assert/strict');
const Calculations = require('../assets/js/financeCalculations.js');

test('RF-1: generarSiguienteCodigoSubcuenta genera primer correlativo .01 si no hay subcuentas', () => {
  assert.equal(typeof Calculations.generarSiguienteCodigoSubcuenta, 'function');

  const catalogoBase = Calculations.CATALOGO_PLAN_CUENTAS_PERSONAL_BASE;
  const siguiente = Calculations.generarSiguienteCodigoSubcuenta('5.1.01', catalogoBase);

  assert.equal(siguiente, '5.1.01.01');
});

test('RF-1: generarSiguienteCodigoSubcuenta incrementa correlativo según subcuentas existentes', () => {
  const catalogoConSubcuentas = [
    ...Calculations.CATALOGO_PLAN_CUENTAS_PERSONAL_BASE,
    { code: '5.1.01.01', name: 'Alquiler', parentCode: '5.1.01' },
    { code: '5.1.01.02', name: 'Gastos Comunes', parentCode: '5.1.01' }
  ];

  const siguiente = Calculations.generarSiguienteCodigoSubcuenta('5.1.01', catalogoConSubcuentas);
  assert.equal(siguiente, '5.1.01.03');

  // Si hay saltos o números mayores (ej. 05), sugiere 06
  catalogoConSubcuentas.push({ code: '5.1.01.05', name: 'Internet Fibra', parentCode: '5.1.01' });
  const siguienteTrasSalto = Calculations.generarSiguienteCodigoSubcuenta('5.1.01', catalogoConSubcuentas);
  assert.equal(siguienteTrasSalto, '5.1.01.06');
});

test('RF-2 y RF-4: validarCuentaPlan aprueba subcuenta válida con padre existente y código consistente', () => {
  const catalogo = Calculations.CATALOGO_PLAN_CUENTAS_PERSONAL_BASE;

  const subcuentaValida = {
    code: '5.1.01.01',
    name: 'Alquiler Depto',
    parentCode: '5.1.01',
    classNumber: 5,
    classType: 'expense',
    groupName: '5.1 Vivienda y Hogar',
    nature: 'debit'
  };

  const resultado = Calculations.validarCuentaPlan(subcuentaValida, catalogo);
  assert.equal(resultado.valida, true);
});

test('RF-4: validarCuentaPlan rechaza subcuenta si el código no concuerda con la cuenta padre', () => {
  const catalogo = Calculations.CATALOGO_PLAN_CUENTAS_PERSONAL_BASE;

  const subcuentaIncoherente = {
    code: '5.2.01.01', // Código de alimentación
    name: 'Alquiler Depto',
    parentCode: '5.1.01', // Padre es vivienda
    classNumber: 5,
    classType: 'expense',
    groupName: '5.1 Vivienda y Hogar',
    nature: 'debit'
  };

  const resultado = Calculations.validarCuentaPlan(subcuentaIncoherente, catalogo);
  assert.equal(resultado.valida, false);
  assert.match(resultado.error, /código de la subcuenta debe comenzar con/i);
});

test('RF-5 y RF-6: obtenerCatalogoPlanCuentas y obtenerCategoriasDesdePlan integran subcuentas secundarias', () => {
  const subcuentasUsuario = [
    {
      id: 'SUB-1',
      code: '5.1.01.01',
      name: 'Alquiler Depto',
      parentCode: '5.1.01',
      isSubaccount: true,
      classNumber: 5,
      classType: 'expense',
      groupName: '5.1 Vivienda y Hogar',
      nature: 'debit'
    },
    {
      id: 'SUB-2',
      code: '4.1.01.01',
      name: 'Empleador Tech Corp',
      parentCode: '4.1.01',
      isSubaccount: true,
      classNumber: 4,
      classType: 'income',
      groupName: '4.1 Ingresos Laborales',
      nature: 'credit'
    }
  ];

  const catalogo = Calculations.obtenerCatalogoPlanCuentas(subcuentasUsuario, [], []);

  // Debe contener las subcuentas
  const subVivienda = catalogo.find(c => c.code === '5.1.01.01');
  assert.ok(subVivienda);
  assert.equal(subVivienda.name, 'Alquiler Depto');
  assert.equal(subVivienda.parentCode, '5.1.01');

  // En categorías de gasto debe estar disponible la subcuenta
  const categoriasGasto = Calculations.obtenerCategoriasDesdePlan(catalogo, 'expense');
  assert.ok(categoriasGasto.some(c => c.code === '5.1.01.01' && c.name === 'Alquiler Depto'));

  // En categorías de ingreso debe estar la subcuenta de sueldo
  const categoriasIngreso = Calculations.obtenerCategoriasDesdePlan(catalogo, 'income');
  assert.ok(categoriasIngreso.some(c => c.code === '4.1.01.01' && c.name === 'Empleador Tech Corp'));
});

