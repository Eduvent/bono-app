import { NextRequest } from 'next/server';
import { createTestBond, cleanupTestBond } from '../../scripts/setup';
import { GET } from '../../app/api/bonds/[bondId]/route';

describe('GET /api/bonds/[bondId]', () => {
    test('returns bond data with costs and calculation inputs', async () => {
        const bond = await createTestBond();
        const request = new NextRequest(`http://localhost/api/bonds/${bond.id}`);
        const response = await GET(request, { params: { bondId: bond.id } });
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data).toMatchObject({
            id: bond.id,
            name: bond.name,
            codigoIsin: bond.codigoIsin,
            status: bond.status,
        });
        expect(data.costs.estructuracionPct).toBeCloseTo(bond.costs!.estructuracionPct.toNumber());
        await cleanupTestBond(bond.id);
    });
});