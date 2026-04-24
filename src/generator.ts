import { UBLInvoiceData } from './types';

/**
 * Escapes special characters for XML.
 */
function escapeXml(unsafe: string): string {
    return unsafe.replace(/[<>&"']/g, (c) => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '"': return '&quot;';
            case "'": return '&apos;';
            default: return c;
        }
    });
}

/**
 * Generates UBL 2.1 XML string compliant with PEPPOL BIS Billing 3.0.
 */
export function generateUBLInvoice(invoice: UBLInvoiceData): string {
    const issueDateStr = invoice.issueDate.split('T')[0];
    
    // Auto-calculate DueDate if not provided (20th of next month as per common practice)
    let dueDate = invoice.dueDate?.split('T')[0];
    if (!dueDate) {
        const issueDate = new Date(issueDateStr);
        const nextMonth = new Date(issueDate.getFullYear(), issueDate.getMonth() + 1, 1);
        const dueDateObj = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 20);
        dueDate = `${dueDateObj.getFullYear()}-${String(dueDateObj.getMonth() + 1).padStart(2, '0')}-${String(dueDateObj.getDate()).padStart(2, '0')}`;
    }

    const allLines = [...invoice.items];

    // Handling Previous Debt and Penalties as additional lines
    if (invoice.pastDebt && invoice.pastDebt > 0) {
        allLines.push({
            name: 'Previous Unpaid Debt',
            quantity: 1,
            unit: 'MON',
            price: invoice.pastDebt,
            vatRate: 0,
            vatAmount: 0,
            netAmount: invoice.pastDebt,
            grossAmount: invoice.pastDebt,
        });
    }

    if (invoice.penaltyAmount && invoice.penaltyAmount > 0) {
        allLines.push({
            name: 'Late payment penalty',
            quantity: 1,
            unit: 'MON',
            price: invoice.penaltyAmount,
            vatRate: 0,
            vatAmount: 0,
            netAmount: invoice.penaltyAmount,
            grossAmount: invoice.penaltyAmount,
            sku: 'PENALTY'
        });
    }

    const linesXml = allLines.map((item, i) => {
        const vatCategoryCode = item.vatRate === 0 ? 'Z' : 'S';
        const unitCode = item.unit === 'mo' || item.unit === 'MON' ? 'MON' : 'H87';
        const lineExtensionAmount = item.tariffType === 'accumulated_fund' ? 0 : item.netAmount;

        return `
    <cac:InvoiceLine>
        <cbc:ID>${i + 1}</cbc:ID>
        ${item.tariffType === 'accumulated_fund' ? '<cbc:Note>Informational line item</cbc:Note>' : ''}
        <cbc:InvoicedQuantity unitCode="${unitCode}">${item.quantity}</cbc:InvoicedQuantity>
        <cbc:LineExtensionAmount currencyID="${invoice.currency}">${lineExtensionAmount.toFixed(2)}</cbc:LineExtensionAmount>
        <cac:Item>
            <cbc:Name>${escapeXml(item.name)}</cbc:Name>
            <cac:ClassifiedTaxCategory>
                <cbc:ID>${vatCategoryCode}</cbc:ID>
                <cbc:Percent>${item.vatRate.toFixed(2)}</cbc:Percent>
                <cac:TaxScheme>
                    <cbc:ID>VAT</cbc:ID>
                </cac:TaxScheme>
            </cac:ClassifiedTaxCategory>
        </cac:Item>
        <cac:Price>
            <cbc:PriceAmount currencyID="${invoice.currency}">${item.price.toFixed(2)}</cbc:PriceAmount>
        </cac:Price>
    </cac:InvoiceLine>`;
    }).join('\n');

    const taxGroups = allLines
        .filter(item => item.tariffType !== 'accumulated_fund')
        .reduce((acc, item) => {
            const cat = item.vatRate === 0 ? 'Z' : 'S';
            if (!acc[cat]) {
                acc[cat] = { taxableAmount: 0, taxAmount: 0, vatRate: item.vatRate };
            }
            acc[cat].taxableAmount += item.netAmount;
            acc[cat].taxAmount += item.vatAmount;
            return acc;
        }, {} as Record<string, { taxableAmount: number; taxAmount: number; vatRate: number }>);

    const taxSubtotalsXml = Object.entries(taxGroups).map(([code, data]) => `
        <cac:TaxSubtotal>
            <cbc:TaxableAmount currencyID="${invoice.currency}">${data.taxableAmount.toFixed(2)}</cbc:TaxableAmount>
            <cbc:TaxAmount currencyID="${invoice.currency}">${data.taxAmount.toFixed(2)}</cbc:TaxAmount>
            <cac:TaxCategory>
                <cbc:ID>${code}</cbc:ID>
                <cbc:Percent>${data.vatRate.toFixed(2)}</cbc:Percent>
                <cac:TaxScheme>
                    <cbc:ID>VAT</cbc:ID>
                </cac:TaxScheme>
            </cac:TaxCategory>
        </cac:TaxSubtotal>`).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
    <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0</cbc:CustomizationID>
    <cbc:ProfileID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</cbc:ProfileID>
    <cbc:ID>${escapeXml(invoice.invoiceNumber)}</cbc:ID>
    <cbc:IssueDate>${issueDateStr}</cbc:IssueDate>
    <cbc:DueDate>${dueDate}</cbc:DueDate>
    <cbc:Note>Invoice Number: ${escapeXml(invoice.invoiceNumber)}</cbc:Note>
    <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
    <cbc:DocumentCurrencyCode>${invoice.currency}</cbc:DocumentCurrencyCode>

    <cac:AccountingSupplierParty>
        <cac:Party>
            <cbc:EndpointID schemeID="0191">${escapeXml(invoice.seller.vatNumber || `LV${invoice.seller.regNumber}`)}</cbc:EndpointID>
            <cac:PartyIdentification>
                <cbc:ID>${escapeXml(invoice.seller.regNumber)}</cbc:ID>
            </cac:PartyIdentification>
            <cac:PartyName>
                <cbc:Name>${escapeXml(invoice.seller.name)}</cbc:Name>
            </cac:PartyName>
            <cac:PostalAddress>
                <cbc:StreetName>${escapeXml(invoice.seller.address)}</cbc:StreetName>
                <cbc:CityName>${escapeXml(invoice.seller.city)}</cbc:CityName>
                <cac:Country>
                    <cbc:IdentificationCode>${invoice.seller.country}</cbc:IdentificationCode>
                </cac:Country>
            </cac:PostalAddress>
            <cac:PartyTaxScheme>
                <cbc:CompanyID>${escapeXml(invoice.seller.vatNumber || `LV${invoice.seller.regNumber}`)}</cbc:CompanyID>
                <cac:TaxScheme>
                    <cbc:ID>VAT</cbc:ID>
                </cac:TaxScheme>
            </cac:PartyTaxScheme>
            <cac:PartyLegalEntity>
                <cbc:RegistrationName>${escapeXml(invoice.seller.name)}</cbc:RegistrationName>
                <cbc:CompanyID>${escapeXml(invoice.seller.regNumber)}</cbc:CompanyID>
            </cac:PartyLegalEntity>
        </cac:Party>
    </cac:AccountingSupplierParty>

    <cac:AccountingCustomerParty>
        <cac:Party>
            ${invoice.buyer.regNumber ? `<cbc:EndpointID schemeID="0191">${escapeXml(invoice.buyer.regNumber)}</cbc:EndpointID>` : ''}
            <cac:PartyName>
                <cbc:Name>${escapeXml(invoice.buyer.name)}</cbc:Name>
            </cac:PartyName>
            <cac:PostalAddress>
                <cbc:StreetName>${escapeXml(invoice.buyer.address)}</cbc:StreetName>
                <cbc:CityName>${escapeXml(invoice.buyer.city)}</cbc:CityName>
                <cac:Country>
                    <cbc:IdentificationCode>${invoice.buyer.country}</cbc:IdentificationCode>
                </cac:Country>
            </cac:PostalAddress>
            <cac:PartyLegalEntity>
                <cbc:RegistrationName>${escapeXml(invoice.buyer.name)}</cbc:RegistrationName>
                ${invoice.buyer.regNumber ? `<cbc:CompanyID>${escapeXml(invoice.buyer.regNumber)}</cbc:CompanyID>` : ''}
            </cac:PartyLegalEntity>
        </cac:Party>
    </cac:AccountingCustomerParty>

    <cac:PaymentMeans>
        <cbc:PaymentMeansCode>30</cbc:PaymentMeansCode>
        <cbc:PaymentID>${escapeXml(invoice.rfReference || invoice.invoiceNumber)}</cbc:PaymentID>
        <cac:PayeeFinancialAccount>
            <cbc:ID>${escapeXml(invoice.seller.iban)}</cbc:ID>
            <cac:FinancialInstitutionBranch>
                <cbc:ID>${escapeXml(invoice.seller.swift || '')}</cbc:ID>
            </cac:FinancialInstitutionBranch>
        </cac:PayeeFinancialAccount>
    </cac:PaymentMeans>

    <cac:TaxTotal>
        <cbc:TaxAmount currencyID="${invoice.currency}">${invoice.totals.vatAmount.toFixed(2)}</cbc:TaxAmount>${taxSubtotalsXml}
    </cac:TaxTotal>

    <cac:LegalMonetaryTotal>
        <cbc:LineExtensionAmount currencyID="${invoice.currency}">${invoice.totals.netAmount.toFixed(2)}</cbc:LineExtensionAmount>
        <cbc:TaxExclusiveAmount currencyID="${invoice.currency}">${invoice.totals.netAmount.toFixed(2)}</cbc:TaxExclusiveAmount>
        <cbc:TaxInclusiveAmount currencyID="${invoice.currency}">${invoice.totals.grossAmount.toFixed(2)}</cbc:TaxInclusiveAmount>
        <cbc:PayableAmount currencyID="${invoice.currency}">${invoice.totals.grossAmount.toFixed(2)}</cbc:PayableAmount>
    </cac:LegalMonetaryTotal>
    ${linesXml}
</Invoice>`;
}
