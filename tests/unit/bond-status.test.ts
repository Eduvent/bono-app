import { NextRequest } from 'next/server';
import { PUT } from '@/app/api/bonds/[bondId]/status/route';
import { createTestBond } from '../setup';

describe('Bond status API', () => {
    test('PUT updates bond status', async () => {
        const bond = await createTestBond();

        const body = { status: 'ACTIVE' };
        const request = new NextRequest('http://localhost/api/bonds/' + bond.id + '/status', {
            method: 'PUT',
            body: JSON.stringify(body),
            headers: { 'Content-Type': 'application/json' }
        });

        const response = await PUT(request, { params: { bondId: bond.id } });
        const data = await response.json();

        expect(data.bond.status).toBe('ACTIVE');

        const prisma = global.__PRISMA_CLIENT__!;
        const updated = await prisma.bond.findUnique({ where: { id: bond.id } });
        expect(updated!.status).toBe('ACTIVE');
    });
});