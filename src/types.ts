export interface InvoiceParty {
    name: string;
    regNumber: string;
    vatNumber?: string;
    address: string;
    city: string;
    country: string; // ISO Code (e.g. "LV")
    iban?: string;
    swift?: string;
}

export interface InvoiceItem {
    name: string;
    quantity: number;
    unit: string; // e.g. "H87" (pieces), "MON" (months)
    price: number;
    vatRate: number; // e.g. 21
    netAmount: number;
    vatAmount: number;
    grossAmount: number;
    sku?: string;
    tariffType?: string;
}

export interface InvoiceTotals {
    netAmount: number;
    vatAmount: number;
    grossAmount: number;
}

export interface UBLInvoiceData {
    invoiceNumber: string;
    issueDate: string; // ISO Date String
    dueDate?: string;  // ISO Date String (optional, can be auto-calculated)
    currency: string;  // ISO Currency Code (e.g. "EUR")
    seller: InvoiceParty;
    buyer: InvoiceParty;
    items: InvoiceItem[];
    totals: InvoiceTotals;
    rfReference?: string;
    pastDebt?: number;
    penaltyAmount?: number;
}
