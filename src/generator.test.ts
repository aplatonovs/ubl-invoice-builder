import { describe, it, expect } from 'vitest';
import { generateUBLInvoice } from '../src/generator';
import { UBLInvoiceData } from '../src/types';

describe('UBL Invoice Builder', () => {
    const mockInvoice: UBLInvoiceData = {
        invoiceNumber: 'INV-123',
        issueDate: '2026-04-24',
        currency: 'EUR',
        seller: {
            name: 'Seller Co',
            regNumber: '12345',
            vatNumber: 'LV12345',
            address: 'Seller St 1',
            city: 'Riga',
            country: 'LV',
            iban: 'LV12345'
        },
        buyer: {
            name: 'Buyer Co',
            regNumber: '67890',
            address: 'Buyer St 2',
            city: 'Riga',
            country: 'LV'
        },
        items: [
            {
                name: 'Service',
                quantity: 1,
                unit: 'H87',
                price: 100,
                vatRate: 21,
                netAmount: 100,
                vatAmount: 21,
                grossAmount: 121
            }
        ],
        totals: {
            netAmount: 100,
            vatAmount: 21,
            grossAmount: 121
        }
    };

    it('should generate a valid XML string', () => {
        const xml = generateUBLInvoice(mockInvoice);
        expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
        expect(xml).toContain('<cbc:ID>INV-123</cbc:ID>');
        expect(xml).toContain('<cbc:DocumentCurrencyCode>EUR</cbc:DocumentCurrencyCode>');
        expect(xml).toContain('Seller Co');
        expect(xml).toContain('Buyer Co');
    });

    it('should calculate due date if missing', () => {
        const xml = generateUBLInvoice(mockInvoice);
        // April 24 -> May 20
        expect(xml).toContain('<cbc:DueDate>2026-05-20</cbc:DueDate>');
    });
});
