# @coophome/ubl-invoice-builder

A lightweight, zero-dependency TypeScript library for generating UBL 2.1 XML invoices compliant with **PEPPOL BIS Billing 3.0**.

Developed and used by [COOPhome](https://coophome.app) for cooperative housing management in the Baltics.

## Features

- ✅ **Zero Dependencies**: Pure TypeScript, minimal footprint.
- ✅ **PEPPOL Compliant**: Generates standard-compliant XML (`urn:cen.eu:en16931:2017`).
- ✅ **Type Safe**: Full TypeScript support for invoice data structures.
- ✅ **Baltic Ready**: Optimized for Latvia, Estonia, and Lithuania identification schemes.
- ✅ **Lightweight**: Fast generation using optimized string templates.

## Installation

```bash
npm install @coophome/ubl-invoice-builder
```

## Usage

```typescript
import { generateUBLInvoice, UBLInvoiceData } from '@coophome/ubl-invoice-builder';

const invoice: UBLInvoiceData = {
    invoiceNumber: "INV-2026-001",
    issueDate: "2026-04-24",
    currency: "EUR",
    seller: {
        name: "My Company SIA",
        regNumber: "40003000123",
        vatNumber: "LV40003000123",
        address: "Brivibas iela 1",
        city: "Riga",
        country: "LV",
        iban: "LV12HABA0000123456789"
    },
    buyer: {
        name: "John Doe",
        regNumber: "",
        address: "Tallinas iela 5-12",
        city: "Riga",
        country: "LV"
    },
    items: [
        {
            name: "Management Fee - April",
            quantity: 1,
            unit: "MON",
            price: 50.00,
            vatRate: 21,
            netAmount: 50.00,
            vatAmount: 10.50,
            grossAmount: 60.50
        }
    ],
    totals: {
        netAmount: 50.00,
        vatAmount: 10.50,
        grossAmount: 60.50
    }
};

const xml = generateUBLInvoice(invoice);
console.log(xml);
```

## Why UBL 2.1?

UBL (Universal Business Language) 2.1 is the mandatory standard for e-invoicing in the European Union (Directive 2014/55/EU). From 2025, many EU countries, including Latvia, will require B2B transactions to use this digital format.

## Development

```bash
npm install
npm run build
npm test
```

## License

MIT © [COOPhome](https://coophome.app)
