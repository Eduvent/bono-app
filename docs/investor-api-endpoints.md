# API de Inversores - Documentación de Endpoints

## Resumen

Esta documentación describe los endpoints de la API para el flujo de inversores, que permite a los inversores gestionar sus inversiones en bonos, ver bonos disponibles y analizar su portfolio.

## Base URL

```
http://localhost:3000/api/inversionista
```

## Endpoints

### 1. Obtener Inversiones de un Inversor

**GET** `/api/inversionista/[inversionistaId]/investments`

Obtiene todas las inversiones de un inversor específico con paginación y filtros.

#### Parámetros de URL

- `inversionistaId` (string, requerido): ID del inversor

#### Query Parameters

- `status` (string, opcional): Filtro por estado de inversión (`active`, `completed`, `cancelled`)
- `limit` (number, opcional): Número máximo de resultados (default: 50, max: 100)
- `offset` (number, opcional): Número de resultados a saltar (default: 0)
- `search` (string, opcional): Búsqueda por nombre o código ISIN del bono

#### Ejemplo de Request

```bash
GET /api/inversionista/clx123abc456/investments?status=active&limit=10&search=BONO
```

#### Ejemplo de Response

```json
{
  "success": true,
  "investments": [
    {
      "id": "inv_123",
      "bondId": "bond_456",
      "bondName": "BONO CORPORATIVO ABC 2024",
      "bondCode": "PE1234567890",
      "emisor": {
        "id": "emisor_789",
        "companyName": "Empresa ABC S.A.",
        "ruc": "20123456789"
      },
      "montoInvertido": 50000,
      "fechaInversion": "2024-01-15",
      "precioCompra": 98.5,
      "status": "ACTIVE",
      "gananciaNoRealizada": 2500,
      "rendimientoActual": 0.05,
      "valorNominal": 100000,
      "tasaAnual": 0.08,
      "frecuenciaCupon": "SEMESTRAL",
      "fechaVencimiento": "2027-01-15",
      "precioActual": 101.25,
      "trea": 0.075,
      "van": 2500,
      "duracion": 2.5,
      "convexidad": 0.15
    }
  ],
  "pagination": {
    "total": 25,
    "limit": 10,
    "offset": 0,
    "hasMore": true
  },
  "metrics": {
    "totalInvestments": 25,
    "activeInvestments": 20,
    "totalInvested": 1250000,
    "totalUnrealizedGain": 45000,
    "averageReturn": 0.042
  },
  "inversionista": {
    "id": "clx123abc456",
    "name": "Juan Pérez"
  }
}
```

### 2. Obtener Bonos Disponibles

**GET** `/api/inversionista/available-bonds`

Obtiene todos los bonos activos disponibles para inversión con filtros avanzados.

#### Query Parameters

- `limit` (number, opcional): Número máximo de resultados (default: 50, max: 100)
- `offset` (number, opcional): Número de resultados a saltar (default: 0)
- `search` (string, opcional): Búsqueda por nombre o código ISIN del bono
- `emisor` (string, opcional): Filtro por nombre o RUC del emisor
- `minTasa` (number, opcional): Tasa mínima de interés (0-1)
- `maxTasa` (number, opcional): Tasa máxima de interés (0-1)
- `minPlazo` (number, opcional): Plazo mínimo en años
- `maxPlazo` (number, opcional): Plazo máximo en años
- `sortBy` (string, opcional): Campo de ordenamiento (`tasaAnual`, `numAnios`, `valorNominal`, `fechaEmision`)
- `sortOrder` (string, opcional): Orden (`asc`, `desc`)

#### Ejemplo de Request

```bash
GET /api/inversionista/available-bonds?minTasa=0.05&maxPlazo=5&sortBy=tasaAnual&sortOrder=desc
```

#### Ejemplo de Response

```json
{
  "success": true,
  "bonds": [
    {
      "id": "bond_456",
      "name": "BONO CORPORATIVO ABC 2024",
      "codigoIsin": "PE1234567890",
      "status": "ACTIVE",
      "valorNominal": 100000,
      "valorComercial": 98500,
      "numAnios": 3,
      "fechaEmision": "2024-01-15",
      "fechaVencimiento": "2027-01-15",
      "frecuenciaCupon": "SEMESTRAL",
      "tipoTasa": "EFECTIVA",
      "tasaAnual": 0.08,
      "primaVencimiento": 0.02,
      "impuestoRenta": 0.05,
      "baseDias": 360,
      "emisor": {
        "id": "emisor_789",
        "companyName": "Empresa ABC S.A.",
        "ruc": "20123456789",
        "industry": "Tecnología"
      },
      "financialMetrics": {
        "precioActual": 101.25,
        "trea": 0.075,
        "van": 2500,
        "duracion": 2.5,
        "convexidad": 0.15,
        "utilidadPerdida": 2500
      },
      "costs": {
        "bonistaTotalAbs": 1500,
        "totalCostsAbs": 3000
      },
      "yieldToMaturity": 0.075,
      "duration": 2.5,
      "convexity": 0.15,
      "isAttractive": true,
      "riskLevel": "MEDIUM"
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  },
  "metrics": {
    "totalBonds": 150,
    "totalNominalValue": 15000000,
    "averageRate": 0.065,
    "averageTerm": 4.2,
    "averageDuration": 3.1,
    "averageYield": 0.062
  },
  "filters": {
    "applied": {
      "search": null,
      "emisor": null,
      "minTasa": 0.05,
      "maxTasa": null,
      "minPlazo": null,
      "maxPlazo": 5
    },
    "sortBy": "tasaAnual",
    "sortOrder": "desc"
  }
}
```

### 3. Realizar Inversión

**POST** `/api/inversionista/invest`

Crea una nueva inversión en un bono específico.

#### Request Body

```json
{
  "inversionistaId": "clx123abc456",
  "bondId": "bond_456",
  "montoInvertido": 50000,
  "precioCompra": 98.5,
  "fechaInversion": "2024-01-15T00:00:00Z"
}
```

#### Campos

- `inversionistaId` (string, requerido): ID del inversor
- `bondId` (string, requerido): ID del bono
- `montoInvertido` (number, requerido): Monto a invertir (debe ser positivo)
- `precioCompra` (number, opcional): Precio de compra (si no se proporciona, se usa el precio actual)
- `fechaInversion` (string, opcional): Fecha de inversión en formato ISO (si no se proporciona, se usa la fecha actual)

#### Ejemplo de Response

```json
{
  "success": true,
  "investment": {
    "id": "inv_123",
    "bondId": "bond_456",
    "bondName": "BONO CORPORATIVO ABC 2024",
    "bondCode": "PE1234567890",
    "emisor": {
      "id": "emisor_789",
      "companyName": "Empresa ABC S.A.",
      "ruc": "20123456789"
    },
    "montoInvertido": 50000,
    "fechaInversion": "2024-01-15",
    "precioCompra": 98.5,
    "status": "ACTIVE",
    "gananciaNoRealizada": 0,
    "rendimientoActual": 0,
    "valorNominal": 100000,
    "tasaAnual": 0.08,
    "frecuenciaCupon": "SEMESTRAL",
    "fechaVencimiento": "2027-01-15"
  },
  "inversionista": {
    "id": "clx123abc456",
    "name": "Juan Pérez"
  },
  "portfolioMetrics": {
    "totalInvestments": 26,
    "totalInvested": 1300000
  },
  "message": "Inversión exitosa en BONO CORPORATIVO ABC 2024",
  "investedAt": "2024-01-15T10:30:00Z"
}
```

### 4. Obtener Estadísticas de Inversión

**GET** `/api/inversionista/invest?inversionistaId=[inversionistaId]`

Obtiene estadísticas generales de inversión de un inversor.

#### Query Parameters

- `inversionistaId` (string, requerido): ID del inversor

#### Ejemplo de Response

```json
{
  "success": true,
  "stats": {
    "totalInvestments": 25,
    "activeInvestments": 20,
    "completedInvestments": 5,
    "totalInvested": 1250000,
    "totalUnrealizedGain": 45000,
    "averageReturn": 0.042
  }
}
```

### 5. Obtener Métricas del Dashboard

**GET** `/api/inversionista/[inversionistaId]/dashboard-metrics`

Obtiene métricas completas del dashboard del inversor, incluyendo KPIs, distribución del portfolio y análisis de rendimiento.

#### Parámetros de URL

- `inversionistaId` (string, requerido): ID del inversor

#### Ejemplo de Response

```json
{
  "success": true,
  "inversionista": {
    "id": "clx123abc456",
    "name": "Juan Pérez"
  },
  "kpis": {
    "totalInvested": 1250000,
    "currentPortfolioValue": 1295000,
    "totalUnrealizedGain": 45000,
    "portfolioReturn": 3.6,
    "totalInvestments": 25,
    "activeInvestments": 20,
    "completedInvestments": 5,
    "averageReturn": 0.042,
    "averageDuration": 2.8,
    "averageConvexity": 0.12
  },
  "distribution": {
    "byEmisor": [
      {
        "emisorId": "emisor_789",
        "emisorName": "Empresa ABC S.A.",
        "industry": "Tecnología",
        "totalInvested": 500000,
        "investments": 5
      }
    ],
    "byIndustry": [
      {
        "industry": "Tecnología",
        "totalInvested": 500000,
        "emisores": 2
      }
    ]
  },
  "upcomingPayments": [
    {
      "bondId": "bond_456",
      "bondName": "BONO CORPORATIVO ABC 2024",
      "emisor": "Empresa ABC S.A.",
      "nextPayment": "2024-07-15",
      "daysUntilPayment": 45,
      "investedAmount": 50000
    }
  ],
  "performance": {
    "monthly": [
      {
        "month": "2024-01",
        "investments": 3,
        "amount": 150000,
        "return": 0.025
      }
    ],
    "topPerformers": [
      {
        "bondId": "bond_456",
        "bondName": "BONO CORPORATIVO ABC 2024",
        "emisor": "Empresa ABC S.A.",
        "return": 0.075,
        "investedAmount": 50000
      }
    ]
  },
  "riskMetrics": {
    "averageDuration": 2.8,
    "averageConvexity": 0.12,
    "riskLevel": "MEDIUM",
    "diversificationScore": 0.8
  }
}
```

## Códigos de Error

Todos los endpoints pueden devolver los siguientes códigos de error:

### 400 - Bad Request
- `VALIDATION_ERROR`: Parámetros de entrada inválidos
- `INVALID_BODY`: Cuerpo del request inválido

### 404 - Not Found
- `INVERSIONISTA_NOT_FOUND`: Inversor no encontrado
- `BOND_NOT_FOUND`: Bono no encontrado

### 409 - Conflict
- `INVESTMENT_ALREADY_EXISTS`: Ya existe una inversión en este bono
- `DUPLICATE_INVESTMENT`: Inversión duplicada

### 500 - Internal Server Error
- `INTERNAL_ERROR`: Error interno del servidor

## Ejemplos de Uso

### JavaScript/TypeScript

```typescript
// Obtener bonos disponibles
const response = await fetch('/api/inversionista/available-bonds?minTasa=0.05&limit=10');
const bonds = await response.json();

// Realizar inversión
const investment = await fetch('/api/inversionista/invest', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    inversionistaId: 'clx123abc456',
    bondId: 'bond_456',
    montoInvertido: 50000
  })
});

// Obtener métricas del dashboard
const dashboard = await fetch('/api/inversionista/clx123abc456/dashboard-metrics');
const metrics = await dashboard.json();
```

### cURL

```bash
# Obtener inversiones
curl -X GET "http://localhost:3000/api/inversionista/clx123abc456/investments?status=active"

# Realizar inversión
curl -X POST "http://localhost:3000/api/inversionista/invest" \
  -H "Content-Type: application/json" \
  -d '{
    "inversionistaId": "clx123abc456",
    "bondId": "bond_456",
    "montoInvertido": 50000
  }'

# Obtener métricas del dashboard
curl -X GET "http://localhost:3000/api/inversionista/clx123abc456/dashboard-metrics"
```

## Notas de Implementación

1. **Autenticación**: Los endpoints asumen que la autenticación se maneja a nivel de middleware.
2. **Validación**: Todos los inputs se validan usando Zod schemas.
3. **Transacciones**: Las operaciones de inversión se ejecutan en transacciones de base de datos.
4. **Auditoría**: Todas las inversiones se registran en el log de auditoría.
5. **Paginación**: Los endpoints que devuelven listas incluyen paginación.
6. **Filtros**: Los endpoints de listado incluyen filtros avanzados y ordenamiento.
7. **Métricas**: Se calculan métricas en tiempo real para el dashboard.

## Próximos Pasos

1. Implementar autenticación y autorización
2. Agregar validaciones de negocio adicionales
3. Implementar cache para mejorar rendimiento
4. Agregar webhooks para notificaciones
5. Implementar rate limiting
6. Agregar documentación OpenAPI/Swagger 