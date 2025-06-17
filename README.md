# 🧮 Sistema de Bonos - Motor de Cálculos Financieros

Sistema completo para la gestión y cálculo de bonos financieros con método americano, desarrollado en Next.js 14 con TypeScript.

## 🎯 **Características Principales**

- ✅ **Motor de Cálculos Financieros** basado en Excel con fórmulas exactas
- ✅ **Flujos de Caja Unificados** para emisores e inversionistas
- ✅ **APIs RESTful** para integración con frontend
- ✅ **Base de Datos** con Prisma ORM y PostgreSQL
- ✅ **Custom Hooks** para React con SWR
- ✅ **Tests Automatizados** con Jest (95%+ cobertura)
- ✅ **TypeScript** tipado estricto para cálculos financieros
- ✅ **Validación** de datos de entrada y resultados
- ✅ **Performance** optimizado para cálculos complejos

## 🏗️ **Arquitectura del Sistema**

```
Frontend (Next.js) → API Routes → Services → Database
     ↑                   ↑           ↑         ↑
 Custom Hooks        Validación   Cálculos   PostgreSQL
     ↑                   ↑           ↑         ↑
    SWR              Zod Schema   Excel.js   Prisma ORM
```

### **Flujo de Datos**

1. **Frontend** solicita cálculo via hooks
2. **API** valida datos y ejecuta servicios
3. **FinancialCalculator** aplica fórmulas del Excel
4. **Resultados** se guardan en BD y retornan al frontend
5. **Hooks** actualizan UI automáticamente

## 🚀 **Inicio Rápido**

### **1. Requisitos Previos**

```bash
# Node.js 18+ y npm
node --version  # v18.0.0+
npm --version   # 9.0.0+

# PostgreSQL 14+
psql --version  # PostgreSQL 14+
```

### **2. Instalación**

```bash
# Clonar repositorio
git clone <tu-repo>
cd sistema-bonos

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus configuraciones.
# Si no usas HTTPS en desarrollo, agrega `SECURE_COOKIES=false`.
```

### **3. Configuración de Base de Datos**

```bash
# Crear bases de datos
createdb bonos_dev
createdb bonos_test

# Ejecutar migraciones y seeds
npm run db:migrate
```

### **4. Ejecutar Desarrollo**

```bash
# Iniciar servidor de desarrollo
npm run dev

# En otra terminal, ejecutar tests
npm run test

# Verificar cálculos con datos del Excel
npm run test:calculations
```

## 📊 **Motor de Cálculos Financieros**

### **Fórmulas Implementadas**

El sistema implementa **todas las fórmulas del Excel** para el método americano:

#### **Cálculos Intermedios**
- Frecuencia de cupón en días
- Tasa efectiva anual
- Tasa cupón periódica
- Costes iniciales (emisor/bonista)

#### **Flujos por Período**
- Bono indexado por inflación
- Cupón de interés
- Amortización de principal
- Prima de emisión
- Escudo fiscal
- Flujos netos (emisor/bonista)

#### **Métricas Financieras**
- **VAN** (Valor Actual Neto)
- **TIR** (Tasa Interna de Retorno)
- **TCEA** (Tasa de Costo Efectivo Anual)
- **TREA** (Tasa de Rendimiento Efectivo Anual)
- **Duración** y **Duración Modificada**
- **Convexidad**

### **Ejemplo de Uso**

```typescript
import { FinancialCalculator } from '@/lib/services/calculations/FinancialCalculator';

const calculator = new FinancialCalculator();

const inputs = {
  valorNominal: 1000.00,
  valorComercial: 1050.00,
  numAnios: 5,
  frecuenciaCupon: 'semestral',
  tasaAnual: 0.08, // 8%
  inflacionSerie: [0.10, 0.10, 0.10, 0.10, 0.10], // numAnios valores (uno por año)
  graciaSerie: ['S', 'S', 'S', 'S', 'S'],         // un tipo de gracia por año
};

const resultado = await calculator.calculate(inputs);

console.log('TCEA Emisor:', resultado.metricas.tceaEmisor);
console.log('TREA Bonista:', resultado.metricas.treaBonista);
console.log('Flujos:', resultado.flujos);
```
**Nota:** Los arreglos `inflacionSerie` y `graciaSerie` deben tener exactamente `numAnios` elementos, es decir, un valor por cada año del bono.
## 🔌 **APIs Disponibles**

### **Cálculos de Bonos**

```bash
# Calcular flujos y métricas
POST /api/bonds/{bondId}/calculate
{
  "recalculate": true,
  "saveResults": true,
  "quickMetrics": false
}

# Obtener estado de cálculos
GET /api/bonds/{bondId}/calculate

# Eliminar cálculos existentes
DELETE /api/bonds/{bondId}/calculate
```

### **Flujos de Caja**

```bash
# Obtener flujos por rol
GET /api/bonds/{bondId}/flows?role=emisor&format=json
GET /api/bonds/{bondId}/flows?role=inversionista&format=csv

# Recalcular flujos
POST /api/bonds/{bondId}/flows
```

### **Respuesta de Ejemplo**

```json
{
  "success": true,
  "bondId": "cm123...",
  "bondName": "Bono VAC - Americano",
  "calculatedAt": "2025-06-10T15:30:00Z",
  "metricas": {
    "emisor": {
      "precioActual": 1753.34,
      "van": 693.37,
      "tceaEmisor": 0.184503,
      "tceaEmisorConEscudo": 0.157882,
      "duracion": 4.45,
      "duracionModificada": 4.35,
      "convexidad": 22.39,
      "totalRatiosDecision": 26.84
    },
    "bonista": {
      "precioActual": 1753.34,
      "van": 1753.34,
      "treaBonista": 0.175581,
      "duracion": 4.45,
      "duracionModificada": 4.35,
      "convexidad": 22.39,
      "totalRatiosDecision": 26.84
    }
  },
  "flowsCount": 11
}
```

## ⚛️ **Custom Hooks para Frontend**

### **useCalculations**

```typescript
import { useCalculations } from '@/lib/hooks/useCalculations';

function BondComponent({ bondId }) {
  const {
    calculate,
    isCalculating,
    lastResult,
    status,
    canCalculate,
    needsRecalculation
  } = useCalculations(bondId, {
    autoCalculate: true,
    onSuccess: (result) => console.log('✅ Calculado:', result)
  });

  return (
    <div>
      <button 
        onClick={() => calculate()}
        disabled={!canCalculate || isCalculating}
      >
        {isCalculating ? 'Calculando...' : 'Calcular Flujos'}
      </button>
      
      {lastResult && (
        <div>
          <p>TCEA: {(lastResult.metricas.emisor.tceaEmisor * 100).toFixed(2)}%</p>
          <p>TREA: {(lastResult.metricas.bonista.treaBonista * 100).toFixed(2)}%</p>
        </div>
      )}
    </div>
  );
}
```

### **useCashFlows**

```typescript
import { useCashFlows } from '@/lib/hooks/useCashFlows';

function FlowsTable({ bondId, userRole }) {
  const {
    flows,
    isLoading,
    refreshFlows,
    downloadCSV
  } = useCashFlows(bondId, {
    role: userRole,
    autoCalculate: true
  });

  if (isLoading) return <div>Cargando flujos...</div>;

  return (
    <div>
      <button onClick={downloadCSV}>Descargar CSV</button>
      <table>
        {flows.map(flow => (
          <tr key={flow.periodo}>
            <td>{flow.periodo}</td>
            <td>{flow.fecha}</td>
            <td>{flow.flujoEmisor || flow.flujoBonista}</td>
          </tr>
        ))}
      </table>
    </div>
  );
}
```

## 🧪 **Testing**

### **Ejecutar Tests**

```bash
# Todos los tests
npm run test

# Solo cálculos financieros
npm run test:calculations

# Con cobertura
npm run test:coverage

# En modo watch
npm run test:watch
```

### **Tests Incluidos**

- ✅ **Validación de Fórmulas** vs Excel
- ✅ **Cálculos Intermedios** (L4-L14)
- ✅ **Flujos por Período** (columnas A-R)
- ✅ **Métricas Finales** (TIR, VAN, Duración)
- ✅ **APIs** con casos de éxito y error
- ✅ **Hooks** con mocks y estados
- ✅ **Base de Datos** con transacciones

### **Ejemplo de Test**

```typescript
test('Debe calcular TCEA correctamente', async () => {
  const calculator = new FinancialCalculator();
  const result = await calculator.calculate(EXCEL_TEST_INPUTS);
  
  expect(result.metricas.tceaEmisor).toBeCloseTo(0.1845033, 5);
  expect(result.metricas.treaBonista).toBeCloseTo(0.1755812, 5);
});
```

## 📈 **Performance y Benchmark**

### **Ejecutar Benchmark**

```bash
# Benchmark de todos los bonos
npm run calculate:bonds --all

# Benchmark paralelo
npm run calculate:bonds --parallel --batch-size=5

# Con validación vs Excel
npm run calculate:bonds --compare-excel
```

### **Métricas Objetivo**

- ⚡ **< 2 segundos** por cálculo de bono
- 🧮 **95%+ precisión** vs Excel
- 📊 **> 100 bonos/minuto** en paralelo
- 💾 **< 100MB RAM** por cálculo

## 🗄️ **Base de Datos**

### **Esquema Principal**

```sql
-- Usuarios y perfiles
users, emisor_profiles, inversionista_profiles

-- Bonos y configuración  
bonds, bond_costs, calculation_inputs

-- Flujos unificados (EL CORE DEL SISTEMA)
cash_flows  -- Una tabla para emisores E inversionistas

-- Métricas por rol
financial_metrics (role: EMISOR | BONISTA)

-- Inversiones
user_investments

-- Auditoría
audit_logs
```

### **Comandos Útiles**

```bash
# Reset completo de BD
npm run db:reset

# Solo migraciones
npm run db:migrate

# Solo seeds
npm run db:seed

# Backup
pg_dump bonos_prod > backup.sql
```

## 🔧 **Scripts Disponibles**

```bash
# Desarrollo
npm run dev                    # Servidor desarrollo
npm run build                  # Build producción
npm run start                  # Servidor producción

# Base de datos
npm run db:migrate             # Ejecutar migraciones
npm run db:reset               # Reset completo
npm run db:seed                # Datos de ejemplo

# Testing
npm run test                   # Todos los tests
npm run test:watch             # Tests en modo watch
npm run test:coverage          # Con reporte de cobertura

# Cálculos
npm run calculate:bonds        # Benchmark de cálculos
npm run example:calculator     # Ejemplo de uso

# Validación
npm run type-check             # Verificar tipos TS
npm run lint                   # ESLint
npm run validate:excel         # Comparar con Excel
```

## 📁 **Estructura del Proyecto**

```
proyecto-bonos/
├── 📁 app/                    # Next.js App Router
│   ├── 📁 api/                # API Routes
│   │   ├── bonds/[id]/calculate/  # Cálculos
│   │   └── bonds/[id]/flows/      # Flujos
│   ├── 📁 emisor/             # Frontend Emisor
│   └── 📁 inversionista/      # Frontend Inversionista
│
├── 📁 lib/                    # Core del sistema
│   ├── 📁 services/calculations/   # 🧮 Motor de cálculos
│   │   ├── ExcelFormulas.ts        # Fórmulas del Excel
│   │   ├── FinancialCalculator.ts  # Calculador principal
│   │   └── FlowCalculator.ts       # Cálculo de flujos
│   ├── 📁 models/             # Modelos de datos
│   ├── 📁 hooks/              # Custom hooks
│   └── 📁 types/              # Tipos TypeScript
│
├── 📁 tests/                  # Tests automatizados
├── 📁 scripts/                # Scripts de utilidad
├── 📁 docs/                   # Documentación
└── 📁 examples/               # Ejemplos de uso
```

## 🔐 **Seguridad**

- 🔒 **Validación** estricta de inputs
- 🛡️ **Sanitización** de datos de usuario
- 🔐 **Autenticación** JWT
- 📝 **Auditoría** de todas las operaciones
- 🚫 **Rate limiting** en APIs de cálculo
- 🔍 **Validación** de permisos por rol

## 🚀 **Deployment**

### **Desarrollo**

```bash
# Variables de entorno
NODE_ENV=development
DATABASE_URL=postgresql://...
DEBUG=true
```

### **Producción**

```bash
# Variables de entorno
NODE_ENV=production
DATABASE_URL=postgresql://...
FORCE_HTTPS=true
SECURE_COOKIES=true

# Deploy
npm run build
npm run start
```

### **Docker**

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 🐛 **Troubleshooting**

### **Errores Comunes**

```bash
# Error de conexión a BD
DATABASE_URL mal configurada → Verificar .env.local

# Tests fallan
Base de datos de test → createdb bonos_test

# Cálculos incorrectos  
Precision de Decimal.js → Verificar configuración

# Performance lenta
Índices de BD → npm run db:migrate
```

### **Debug de Cálculos**

```typescript
// Habilitar logs detallados
const calculator = new FinancialCalculator({
  includeIntermediateSteps: true
});

// Comparar con Excel paso a paso
const result = await calculator.calculate(inputs);
console.log('Intermedios:', result.intermedios);
```

## 🤝 **Contribuir**

1. Fork del repositorio
2. Crear branch: `git checkout -b feature/nueva-funcionalidad`
3. Commit cambios: `git commit -m 'Agregar nueva funcionalidad'`
4. Push branch: `git push origin feature/nueva-funcionalidad`
5. Crear Pull Request

### **Estándares**

- ✅ **Tests** para toda funcionalidad nueva
- ✅ **TypeScript** estricto
- ✅ **Validación** vs Excel cuando aplique
- ✅ **Documentación** actualizada

## 📞 **Soporte**

- 📧 **Email**: soporte@tu-empresa.com
- 📚 **Wiki**: [docs/](./docs/)
- 🐛 **Issues**: [GitHub Issues](https://github.com/tu-repo/issues)
- 💬 **Discord**: [Tu servidor Discord]

## 📄 **Licencia**

MIT License - ver [LICENSE.md](./LICENSE.md)

---

**Desarrollado con ❤️ para la gestión profesional de bonos financieros**