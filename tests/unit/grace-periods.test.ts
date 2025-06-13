// tests/unit/grace-periods.test.ts
// Tests específicos para validar la lógica de períodos de gracia

import { FinancialCalculator } from '@/lib/services/calculations/FinancialCalculator';
import { ExcelFormulas } from '@/lib/services/calculations/ExcelFormulas';
import { CalculationInputs, GracePeriodType } from '@/lib/types/calculations';

describe('Grace Periods Logic Tests', () => {
    let calculator: FinancialCalculator;

    const BASE_INPUTS: CalculationInputs = {
        valorNominal: 1000.00,
        valorComercial: 1050.00,
        numAnios: 5,
        frecuenciaCupon: 'semestral',
        diasPorAno: 360,
        tipoTasa: 'efectiva',
        periodicidadCapitalizacion: 'bimestral',
        tasaAnual: 0.08,
        tasaDescuento: 0.045,
        impuestoRenta: 0.30,
        fechaEmision: new Date('2025-06-01'),
        primaPorcentaje: 0.01,
        estructuracionPorcentaje: 0.01,
        colocacionPorcentaje: 0.0025,
        flotacionPorcentaje: 0.0045,
        cavaliPorcentaje: 0.005,
        inflacionSerie: [0.10, 0.10, 0.10, 0.10, 0.10],
        graciaSerie: ['S', 'S', 'S', 'S', 'S'] as GracePeriodType[]
    };

    beforeAll(() => {
        calculator = new FinancialCalculator({
            validateInputs: true,
            includeIntermediateSteps: true
        });
    });

    describe('Gracia Total (T)', () => {
        test('Debe tener cuotas = 0 en todos los períodos intermedios', async () => {
            const inputs = {
                ...BASE_INPUTS,
                graciaSerie: ['T', 'T', 'T', 'T', 'T'] as GracePeriodType[]
            };

            const result = await calculator.calculate(inputs);

            // Con gracia total, no debe haber cuotas en períodos intermedios
            // Períodos 1-9 deben tener cuota = 0, solo el período 10 podría tener pago
            result.flujos.slice(1, -1).forEach((flujo, index) => {
                const periodoNumero = index + 1; // slice(1,-1) empieza en período 1
                expect(flujo.cuota).toBe(0);
                expect(flujo.gracia).toBe('T');
                console.log(`Período ${periodoNumero}: cuota = ${flujo.cuota}, gracia = ${flujo.gracia}`);
            });
        });

        test('Capital debe mantenerse constante durante gracia total', async () => {
            const inputs = {
                ...BASE_INPUTS,
                graciaSerie: ['T', 'T', 'T', 'T', 'T'] as GracePeriodType[]
            };

            const result = await calculator.calculate(inputs);

            // Con gracia total, el capital indexado debe crecer solo por inflación
            // pero no reducirse por pagos
            let capitalAnterior = 1000; // valor nominal inicial

            result.flujos.slice(1, -1).forEach((flujo) => {
                if (flujo.bonoCapital !== null) {
                    // El capital debe mantenerse o crecer, nunca reducirse por pagos
                    expect(flujo.bonoCapital).toBeGreaterThanOrEqual(capitalAnterior * 0.99); // pequeña tolerancia
                    capitalAnterior = flujo.bonoCapital;
                }
            });
        });
    });

    describe('Gracia Parcial (P)', () => {
        test('Debe pagar solo cupón, no amortización', async () => {
            const inputs = {
                ...BASE_INPUTS,
                graciaSerie: ['P', 'P', 'P', 'P', 'P'] as GracePeriodType[]
            };

            const result = await calculator.calculate(inputs);

            // Con gracia parcial, debe pagar cupón pero no amortización
            result.flujos.slice(1, -1).forEach((flujo) => {
                expect(flujo.gracia).toBe('P');
                expect(flujo.amortizacion).toBe(0); // No amortiza
                expect(flujo.cuota).toBe(flujo.cupon); // Cuota = cupón
                expect(flujo.cupon).toBeLessThan(0); // Cupón es negativo (pago)
            });
        });

        test('Solo último período debe amortizar en gracia parcial', async () => {
            const inputs = {
                ...BASE_INPUTS,
                graciaSerie: ['P', 'P', 'P', 'P', 'S'] as GracePeriodType[]  // Último año sin gracia
            };

            const result = await calculator.calculate(inputs);
            const ultimoPeriodo = result.flujos[result.flujos.length - 1];

            expect(ultimoPeriodo.gracia).toBe('S');
            expect(ultimoPeriodo.amortizacion).toBeLessThan(0); // Debe amortizar
        });
    });

    describe('Sin Gracia (S)', () => {
        test('Debe pagar cupón en períodos intermedios y amortizar en último', async () => {
            const inputs = {
                ...BASE_INPUTS,
                graciaSerie: ['S', 'S', 'S', 'S', 'S'] as GracePeriodType[]
            };

            const result = await calculator.calculate(inputs);

            // Períodos intermedios: solo cupón
            result.flujos.slice(1, -1).forEach((flujo) => {
                expect(flujo.gracia).toBe('S');
                expect(flujo.amortizacion).toBe(0); // No amortiza en intermedios
                expect(flujo.cuota).toBe(flujo.cupon); // Solo cupón
            });

            // Último período: cupón + amortización
            // Último período: cupón + amortización
            const ultimoPeriodo = result.flujos[result.flujos.length - 1];
            expect(ultimoPeriodo.gracia).toBe('S');
            expect(ultimoPeriodo.amortizacion).toBeLessThan(0); // Amortiza

            // CORRECCIÓN: Usar toBeCloseTo para decimales
            const expectedCuota = (ultimoPeriodo.cupon || 0) + (ultimoPeriodo.amortizacion || 0);
            expect(ultimoPeriodo.cuota).toBeCloseTo(expectedCuota, 6); // 6 decimales de precisión
        });
    });

    describe('Mapeo de Períodos Anuales a Semestrales', () => {
        test('Debe mapear correctamente años a períodos semestrales', async () => {
            const inputs = {
                ...BASE_INPUTS,
                graciaSerie: ['T', 'P', 'S', 'T', 'P'] as GracePeriodType[]
            };

            const result = await calculator.calculate(inputs);

            // Año 1 (períodos 1-2): Gracia Total
            expect(result.flujos[1].gracia).toBe('T');
            expect(result.flujos[2].gracia).toBe('T');

            // Año 2 (períodos 3-4): Gracia Parcial
            expect(result.flujos[3].gracia).toBe('P');
            expect(result.flujos[4].gracia).toBe('P');

            // Año 3 (períodos 5-6): Sin Gracia
            expect(result.flujos[5].gracia).toBe('S');
            expect(result.flujos[6].gracia).toBe('S');

            // Año 4 (períodos 7-8): Gracia Total
            expect(result.flujos[7].gracia).toBe('T');
            expect(result.flujos[8].gracia).toBe('T');

            // Año 5 (períodos 9-10): Gracia Parcial
            expect(result.flujos[9].gracia).toBe('P');
            expect(result.flujos[10].gracia).toBe('P');
        });
    });

    describe('Validación de Fórmulas Individuales', () => {
        test('ExcelFormulas.amortizacion debe implementar lógica correcta', () => {
            // Gracia total: no amortiza nunca
            expect(ExcelFormulas.amortizacion(10, 10, 'T', 1000)).toBe(0);

            // Gracia parcial: no amortiza nunca
            expect(ExcelFormulas.amortizacion(10, 10, 'P', 1000)).toBe(0);

            // Sin gracia en período intermedio: no amortiza
            expect(ExcelFormulas.amortizacion(5, 10, 'S', 1000)).toBe(0);

            // Sin gracia en último período: amortiza todo
            expect(ExcelFormulas.amortizacion(10, 10, 'S', 1000)).toBe(-1000);
        });

        test('ExcelFormulas.cuota debe implementar lógica correcta', () => {
            const cupon = -50; // Cupón típico (negativo)
            const amortizacion = -1000; // Amortización típica (negativo)

            // Gracia total: cuota = 0
            expect(ExcelFormulas.cuota(5, 10, 'T', cupon, 0)).toBe(0);

            // Gracia parcial: cuota = cupón
            expect(ExcelFormulas.cuota(5, 10, 'P', cupon, 0)).toBe(cupon);

            // Sin gracia: cuota = cupón + amortización
            expect(ExcelFormulas.cuota(10, 10, 'S', cupon, amortizacion)).toBe(cupon + amortizacion);
        });
    });

    describe('Ejemplo del Usuario - Bono Americano con Gracia Mixta', () => {
        test('Debe replicar el ejemplo proporcionado', async () => {
            // Configuración basada en tu ejemplo
            const inputs = {
                ...BASE_INPUTS,
                // Del ejemplo: P, T, S, S, S, S, S, S, S, S
                graciaSerie: ['P', 'T', 'S', 'S', 'S'] as GracePeriodType[]
            };

            const result = await calculator.calculate(inputs);

            // Verificar período 1 (P - gracia parcial)
            const periodo1 = result.flujos[1];
            expect(periodo1.gracia).toBe('P');
            expect(periodo1.amortizacion).toBe(0);
            expect(periodo1.cuota).toBe(periodo1.cupon);

            // Verificar período 3 (T - gracia total)
            const periodo3 = result.flujos[3];
            expect(periodo3.gracia).toBe('T');
            expect(periodo3.cuota).toBe(0);

            // Verificar períodos 5+ (S - sin gracia)
            const periodo5 = result.flujos[5];
            expect(periodo5.gracia).toBe('S');
            expect(periodo5.amortizacion).toBe(0); // No es último período

            // Último período debe amortizar
            const ultimoPeriodo = result.flujos[10];
            expect(ultimoPeriodo.amortizacion).toBeLessThan(0);
        });
    });
});