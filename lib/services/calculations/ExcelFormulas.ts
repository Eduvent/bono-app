// lib/services/calculations/ExcelFormulas.ts

import { Decimal } from 'decimal.js';
import {
    CalculationInputs,
    CalculosIntermedios,
    CashFlowPeriod,
    FinancialMetrics,
    FrequenciaCupon,
    PeriocidadCapitalizacion,
    GracePeriodType
} from '@/lib/types/calculations';

/**
 * Implementación exacta de las fórmulas del Excel para el método americano
 * Cada función corresponde a una celda específica del Excel
 */
export class ExcelFormulas {

    // Configuración de precisión para cálculos financieros
    private static readonly PRECISION = 10;

    static {
        Decimal.set({
            precision: ExcelFormulas.PRECISION,
            rounding: Decimal.ROUND_HALF_UP
        });
    }

    /**
     * SECCIÓN 2: CÁLCULOS INTERMEDIOS (Columna L del Excel)
     */

    /**
     * L4: Frecuencia del cupón en días
     * =SI(E7="Mensual";30;SI(E7="Bimestral";60;SI(E7="Trimestral";90;SI(E7="Cuatrimestral";120;SI(E7="Semestral";180;360)))))
     */
    static frecuenciaCuponDias(frecuencia: FrequenciaCupon): number {
        const mapping: Record<FrequenciaCupon, number> = {
            'mensual': 30,
            'bimestral': 60,
            'trimestral': 90,
            'cuatrimestral': 120,
            'semestral': 180,
            'anual': 360
        };
        return mapping[frecuencia];
    }

    /**
     * L5: Días de capitalización
     * =SI(E10="Diaria";1;SI(E10="Quincenal";15;SI(E10="Mensual";30;...)))
     */
    static diasCapitalizacion(periodicidad: PeriocidadCapitalizacion): number {
        const mapping: Record<PeriocidadCapitalizacion, number> = {
            'diaria': 1,
            'quincenal': 15,
            'mensual': 30,
            'bimestral': 60,
            'trimestral': 90,
            'cuatrimestral': 120,
            'semestral': 180,
            'anual': 360
        };
        return mapping[periodicidad];
    }

    /**
     * L6: Períodos por año
     * =E8/L4
     */
    static periodosPorAno(diasPorAno: number, frecuenciaCuponDias: number): number {
        return new Decimal(diasPorAno).div(frecuenciaCuponDias).toNumber();
    }

    /**
     * L7: Total de períodos
     * =L6*E6
     */
    static totalPeriodos(periodosPorAno: number, numAnios: number): number {
        return new Decimal(periodosPorAno).mul(numAnios).toNumber();
    }

    /**
     * L8: Tasa efectiva anual
     * =SI(E9="Efectiva";E11;(1+E11/(E8/L5))^(E8/L5)-1)
     */
    static tasaEfectivaAnual(
        tipoTasa: 'efectiva' | 'nominal',
        tasaAnual: number,
        diasPorAno: number,
        diasCapitalizacion: number
    ): number {
        if (tipoTasa === 'efectiva') {
            return tasaAnual;
        } else {
            // Conversión de nominal a efectiva
            const periodosCapitalizacion = diasPorAno / diasCapitalizacion;
            const tasaNominalPeriodica = tasaAnual / periodosCapitalizacion;
            return new Decimal(1)
                .plus(tasaNominalPeriodica)
                .pow(periodosCapitalizacion)
                .minus(1)
                .toNumber();
        }
    }

    /**
     * L9: Tasa cupón periódica
     * =(1+L8)^(L4/E8)-1
     */
    static tasaCuponPeriodica(
        tasaEfectivaAnual: number,
        frecuenciaCuponDias: number,
        diasPorAno: number
    ): number {
        const exponente = frecuenciaCuponDias / diasPorAno;
        return new Decimal(1)
            .plus(tasaEfectivaAnual)
            .pow(exponente)
            .minus(1)
            .toNumber();
    }

    /**
     * L10: Tasa descuento periódica
     * =(1+E12)^(L4/E8)-1
     */
    static tasaDescuentoPeriodica(
        tasaDescuento: number,
        frecuenciaCuponDias: number,
        diasPorAno: number
    ): number {
        const exponente = frecuenciaCuponDias / diasPorAno;
        return new Decimal(1)
            .plus(tasaDescuento)
            .pow(exponente)
            .minus(1)
            .toNumber();
    }

    /**
     * L11: Costes iniciales Emisor
     * =SUMA(E17:E20)*E5
     */
    static costesInicialesEmisor(
        estructuracion: number,
        colocacion: number,
        flotacion: number,
        cavali: number,
        valorComercial: number
    ): number {
        const totalPorcentajes = new Decimal(estructuracion)
            .plus(colocacion)
            .plus(flotacion)
            .plus(cavali);

        return totalPorcentajes.mul(valorComercial).toNumber();
    }

    /**
     * L12: Costes iniciales Bonista
     * =SUMA(E19:E20)*E5
     */
    static costesInicialesBonista(
        flotacion: number,
        cavali: number,
        valorComercial: number
    ): number {
        const totalPorcentajes = new Decimal(flotacion).plus(cavali);
        return totalPorcentajes.mul(valorComercial).toNumber();
    }

    /**
     * SECCIÓN 3: CÁLCULOS DE FLUJOS POR PERÍODO
     */

    /**
     * B[n]: Fecha del período
     * B27=E14; para n>0: B[n]=B[n−1]+L4
     */
    static fechaPeriodo(
        fechaEmision: Date,
        periodo: number,
        frecuenciaCuponDias: number
    ): Date {
        if (periodo === 0) return fechaEmision;

        const fecha = new Date(fechaEmision);
        fecha.setDate(fecha.getDate() + (periodo * frecuenciaCuponDias));
        return fecha;
    }

    /**
     * D[n]: Inflación semestral
     * =SI(A[n]≤L7;(1+C[n])^(L4/E8)-1;0)
     */
    static inflacionSemestral(
        periodo: number,
        totalPeriodos: number,
        inflacionAnual: number,
        frecuenciaCuponDias: number,
        diasPorAno: number
    ): number {
        if (periodo > totalPeriodos) return 0;

        const exponente = frecuenciaCuponDias / diasPorAno;
        return new Decimal(1)
            .plus(inflacionAnual)
            .pow(exponente)
            .minus(1)
            .toNumber();
    }

    /**
     * F[n]: Bono (Capital vivo)
     * =SI(A[n]=1;E4;SI(A[n]≤L7;SI(E[n−1]="T";G[n−1]−H[n−1];G[n−1]+J[n−1]);0))
     */
    static bonoCapital(
        periodo: number,
        valorNominal: number,
        totalPeriodos: number,
        bonoIndexadoAnterior: number | null,
        cuponAnterior: number | null,
        amortizacionAnterior: number | null,
        graciaAnterior: GracePeriodType | null
    ): number {
        if (periodo === 1) {
            return valorNominal;
        }

        if (periodo <= totalPeriodos && bonoIndexadoAnterior !== null) {
            if (graciaAnterior === 'T') {
                // Gracia total: capital se mantiene menos el cupón
                return new Decimal(bonoIndexadoAnterior)
                    .minus(cuponAnterior || 0)
                    .toNumber();
            } else {
                // Sin gracia o gracia parcial: se reduce por amortización
                return new Decimal(bonoIndexadoAnterior)
                    .plus(amortizacionAnterior || 0)
                    .toNumber();
            }
        }

        return 0;
    }

    /**
     * G[n]: Bono indexado
     * =F[n]*(1+D[n])
     */
    static bonoIndexado(
        bonoCapital: number,
        inflacionSemestral: number
    ): number {
        return new Decimal(bonoCapital)
            .mul(new Decimal(1).plus(inflacionSemestral))
            .toNumber();
    }

    /**
     * H[n]: Cupón
     * =-G[n]*L9
     */
    static cupon(
        bonoIndexado: number,
        tasaCuponPeriodica: number
    ): number {
        return new Decimal(bonoIndexado)
            .mul(tasaCuponPeriodica)
            .negated()
            .toNumber();
    }

    /**
     * J[n]: Amortización
     * =SI(A[n]≤L7;SI(E[n]="T";0;SI(E[n]="P";0;SI(A[n]<>L7;0;-G[n])));0)
     */
    static amortizacion(
        periodo: number,
        totalPeriodos: number,
        gracia: GracePeriodType | null,
        bonoIndexado: number
    ): number {
        if (periodo > totalPeriodos) return 0;

        if (gracia === 'T' || gracia === 'P') return 0;

        // Solo amortiza en el último período para método americano
        if (periodo === totalPeriodos) {
            return new Decimal(bonoIndexado).negated().toNumber();
        }

        return 0;
    }

    /**
     * I[n]: Cuota (Cupón + Amortización)
     * =SI(A[n]≤L7;SI(E[n]="T";0;SI(E[n]="P";H[n];H[n]+J[n]));0)
     */
    static cuota(
        periodo: number,
        totalPeriodos: number,
        gracia: GracePeriodType | null,
        cupon: number,
        amortizacion: number
    ): number {
        if (periodo > totalPeriodos) return 0;

        if (gracia === 'T') return 0;

        if (gracia === 'P') return cupon;

        return new Decimal(cupon).plus(amortizacion).toNumber();
    }

    /**
     * K[n]: Prima
     * =-SI(A[n]=L7;E16*E4;0)
     */
    static prima(
        periodo: number,
        totalPeriodos: number,
        primaPorcentaje: number,
        valorNominal: number
    ): number {
        if (periodo === totalPeriodos) {
            return new Decimal(primaPorcentaje)
                .mul(valorNominal)
                .negated()
                .toNumber();
        }
        return 0;
    }

    /**
     * L[n]: Escudo fiscal
     * =-H[n]*E13
     */
    static escudoFiscal(
        cupon: number,
        impuestoRenta: number
    ): number {
        return new Decimal(cupon)
            .mul(impuestoRenta)
            .negated()
            .toNumber();
    }

    /**
     * M[n]: Flujo Emisor
     * =SI(A[n]=0;E5−L11;SI(A[n]≤L7;I[n]+K[n];0))
     */
    static flujoEmisor(
        periodo: number,
        valorComercial: number,
        costesInicialesEmisor: number,
        totalPeriodos: number,
        cuota: number,
        prima: number
    ): number {
        if (periodo === 0) {
            return new Decimal(valorComercial)
                .minus(costesInicialesEmisor)
                .toNumber();
        }

        if (periodo <= totalPeriodos) {
            return new Decimal(cuota).plus(prima).toNumber();
        }

        return 0;
    }

    /**
     * N[n]: Flujo Emisor con Escudo
     * =M[n]+L[n]
     */
    static flujoEmisorConEscudo(
        flujoEmisor: number,
        escudoFiscal: number
    ): number {
        return new Decimal(flujoEmisor).plus(escudoFiscal).toNumber();
    }

    /**
     * O[n]: Flujo Bonista
     * =-M[n]
     */
    static flujoBonista(flujoEmisor: number): number {
        return new Decimal(flujoEmisor).negated().toNumber();
    }

    /**
     * P[n]: Flujo Actualizado
     * =O[n]/(1+L10)^A[n]
     */
    static flujoActualizado(
        flujoBonista: number,
        tasaDescuentoPeriodica: number,
        periodo: number
    ): number {
        if (periodo === 0) return flujoBonista;

        const denominador = new Decimal(1)
            .plus(tasaDescuentoPeriodica)
            .pow(periodo);

        return new Decimal(flujoBonista).div(denominador).toNumber();
    }

    /**
     * Q[n]: FA × Plazo (Para duración)
     * =P[n]*A[n]*(L4/E8)
     */
    static faPlazoPonderado(
        flujoActualizado: number,
        periodo: number,
        frecuenciaCuponDias: number,
        diasPorAno: number
    ): number {
        const factorTiempo = frecuenciaCuponDias / diasPorAno;
        return new Decimal(flujoActualizado)
            .mul(periodo)
            .mul(factorTiempo)
            .toNumber();
    }

    /**
     * R[n]: Factor de Convexidad
     * =P[n]*A[n]*(1+A[n])
     */
    static factorConvexidad(
        flujoActualizado: number,
        periodo: number
    ): number {
        return new Decimal(flujoActualizado)
            .mul(periodo)
            .mul(periodo + 1)
            .toNumber();
    }

    /**
     * SECCIÓN 4: MÉTRICAS FINANCIERAS FINALES
     */

    /**
     * Precio Actual (VNA)
     * =VNA(L10;O28:O37)
     */
    static precioActual(
        flujosBonista: number[],
        tasaDescuentoPeriodica: number
    ): number {
        let vna = new Decimal(0);

        for (let i = 1; i < flujosBonista.length; i++) {
            const denominador = new Decimal(1)
                .plus(tasaDescuentoPeriodica)
                .pow(i);

            vna = vna.plus(new Decimal(flujosBonista[i]).div(denominador));
        }

        return vna.toNumber();
    }

    /**
     * Duración
     * =SUMA(Q27:Q37)/SUMA(P27:P37)
     */
    static duracion(
        faPlazosPonderados: number[],
        flujosActualizados: number[]
    ): number {
        const sumaFAPonderados = faPlazosPonderados.reduce(
            (sum, val) => sum.plus(val),
            new Decimal(0)
        );

        const sumaFlujosActualizados = flujosActualizados.reduce(
            (sum, val) => sum.plus(val),
            new Decimal(0)
        );

        return sumaFAPonderados.div(sumaFlujosActualizados).toNumber();
    }

    /**
     * Convexidad
     * =SUMA(R28:R37)/( (1+L10)^2 * SUMA(P28:P37) * (E8/L4)^2 )
     */
    static convexidad(
        factoresConvexidad: number[],
        flujosActualizados: number[],
        tasaDescuentoPeriodica: number,
        diasPorAno: number,
        frecuenciaCuponDias: number
    ): number {
        const sumaFactoresConvexidad = factoresConvexidad
            .slice(1) // R28:R37 excluye período 0
            .reduce((sum, val) => sum.plus(val), new Decimal(0));

        const sumaFlujosActualizados = flujosActualizados
            .slice(1) // P28:P37 excluye período 0
            .reduce((sum, val) => sum.plus(val), new Decimal(0));

        const denominador = new Decimal(1)
            .plus(tasaDescuentoPeriodica)
            .pow(2)
            .mul(sumaFlujosActualizados)
            .mul(new Decimal(diasPorAno).div(frecuenciaCuponDias).pow(2));

        return sumaFactoresConvexidad.div(denominador).toNumber();
    }

    /**
     * Duración Modificada
     * =Duración/(1+L10)
     */
    static duracionModificada(
        duracion: number,
        tasaDescuentoPeriodica: number
    ): number {
        return new Decimal(duracion)
            .div(new Decimal(1).plus(tasaDescuentoPeriodica))
            .toNumber();
    }

    /**
     * TCEA/TREA usando TIR
     * =(1+TIR(flujos))^(E8/L4)-1
     */
    static tceaTrea(
        flujos: number[],
        fechas: Date[],
        diasPorAno: number,
        frecuenciaCuponDias: number
    ): number {
        const tir = this.calcularTIR(flujos, fechas);
        const factorAnualizacion = diasPorAno / frecuenciaCuponDias;

        return new Decimal(1)
            .plus(tir)
            .pow(factorAnualizacion)
            .minus(1)
            .toNumber();
    }

    /**
     * Cálculo de TIR usando método de Newton-Raphson
     */
    private static calcularTIR(flujos: number[], fechas: Date[]): number {
        let tir = 0.1; // Estimación inicial del 10%
        const maxIteraciones = 100;
        const tolerancia = 1e-8;

        for (let i = 0; i < maxIteraciones; i++) {
            const { vpn, derivada } = this.vpnYDerivada(flujos, fechas, tir);

            if (Math.abs(vpn) < tolerancia) break;

            const nuevaTir = tir - vpn / derivada;

            if (Math.abs(nuevaTir - tir) < tolerancia) break;

            tir = nuevaTir;
        }

        return tir;
    }

    /**
     * Calcula VPN y su derivada para el método de Newton-Raphson
     */
    private static vpnYDerivada(
        flujos: number[],
        fechas: Date[],
        tasa: number
    ): { vpn: number; derivada: number } {
        let vpn = new Decimal(0);
        let derivada = new Decimal(0);

        const fechaBase = fechas[0];

        for (let i = 0; i < flujos.length; i++) {
            const diasDiferencia = (fechas[i].getTime() - fechaBase.getTime()) / (1000 * 60 * 60 * 24);
            const anios = diasDiferencia / 365;

            const factor = new Decimal(1).plus(tasa).pow(-anios);
            const flujoDecimal = new Decimal(flujos[i]);

            vpn = vpn.plus(flujoDecimal.mul(factor));
            derivada = derivada.minus(flujoDecimal.mul(factor).mul(anios).div(new Decimal(1).plus(tasa)));
        }

        return { vpn: vpn.toNumber(), derivada: derivada.toNumber() };
    }
}