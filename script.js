const { jsPDF } = window.jspdf;

let currentStep = 1;
const totalSteps = 4;

let selectedCurrency = 'GBP'; // Default currency
let selectedTaxRate = 0.20; // Default tax rate for GBP (20%)
let invoices = [];

function updateStepIndicator() {
    const stepIndicator = document.getElementById('stepIndicator');
    stepIndicator.textContent = `Step ${currentStep} of ${totalSteps}`;
}

function showStep(step) {
    document.querySelectorAll('.step').forEach(s => s.style.display = 'none');
    document.getElementById(`step${step}`).style.display = 'block';
    currentStep = step;
    updateStepIndicator();
}

// Handle Step 1 "Next" button for Netlify form submission
document.getElementById('step1Next').addEventListener('click', function(e) {
    e.preventDefault();
    const form = document.forms['contact'];
    const formData = new FormData(form);

    // Validate required fields in Step 1
    const currentInputs = document.getElementById('step1').querySelectorAll('input[required]');
    let valid = true;
    currentInputs.forEach(input => {
        if (!input.value) {
            valid = false;
            input.reportValidity();
        }
    });

    if (!valid) return;

    // Submit the form to Netlify
    fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(formData).toString()
    })
    .then(() => {
        console.log('Netlify form submitted successfully');
        showStep(currentStep + 1);
    })
    .catch(error => {
        console.error('Error submitting Netlify form:', error);
        showStep(currentStep + 1);
    });
});

// Handle other "Next" buttons
document.querySelectorAll('.next-btn:not(#step1Next)').forEach(btn => {
    btn.addEventListener('click', function() {
        if (currentStep < totalSteps) {
            const currentInputs = document.getElementById(`step${currentStep}`).querySelectorAll('input[required]');
            let valid = true;
            currentInputs.forEach(input => {
                if (!input.value) {
                    valid = false;
                    input.reportValidity();
                }
            });
            if (valid) showStep(currentStep + 1);
        }
    });
});

document.querySelectorAll('.prev-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        if (currentStep > 1) showStep(currentStep - 1);
    });
});

document.getElementById('addItem').addEventListener('click', function() {
    addBillableItem();
});

document.querySelectorAll('.currency-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.currency-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        selectedCurrency = this.getAttribute('data-value');
        // Update default tax rate based on selected currency
        selectedTaxRate = { 'GBP': 0.20, 'USD': 0.08, 'EUR': 0.19 }[selectedCurrency];
        document.querySelector('.tax-btn[data-tax="20"]').classList.add('active');
        document.querySelector('.tax-btn[data-tax="0"]').classList.remove('active');
    });
});

document.querySelectorAll('.tax-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.tax-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        selectedTaxRate = parseFloat(this.getAttribute('data-tax')) / 100; // Convert percentage to decimal
    });
});

// Handle GDPR checkbox
const gdprCheckbox = document.getElementById('gdprConsent');
const generateBtn = document.getElementById('generateBtn');
gdprCheckbox.addEventListener('change', function() {
    console.log('GDPR checkbox changed:', this.checked);
    generateBtn.disabled = !this.checked;
});

// Handle form submission for Step 4
document.getElementById('invoiceFormStep4').addEventListener('submit', function(e) {
    e.preventDefault();
    console.log('Form submission triggered');

    // Validate required inputs across all steps
    const allRequiredInputs = document.querySelectorAll('#step1 input[required], #step2 input[required]');
    let formValid = true;
    allRequiredInputs.forEach(input => {
        if (!input.value) {
            formValid = false;
            input.reportValidity();
        }
    });

    // Validate rate fields (no currency symbols)
    const rateInputs = document.querySelectorAll('.item-rate');
    for (let rateInput of rateInputs) {
        const rateValue = rateInput.value;
        if (/[£$€]/.test(rateValue)) {
            formValid = false;
            rateInput.setCustomValidity('Currency symbols (£, $, €) are not allowed in the rate field.');
            rateInput.reportValidity();
        } else {
            rateInput.setCustomValidity('');
        }
    }

    // Validate sort code format
    const sortCodeInput = document.getElementById('bankSortCode');
    const sortCodeValue = sortCodeInput.value;
    if (sortCodeValue && !/^\d{2}-\d{2}-\d{2}$/.test(sortCodeValue)) {
        formValid = false;
        sortCodeInput.setCustomValidity('Sort Code must be in the format xx-xx-xx (e.g., 12-34-56).');
        sortCodeInput.reportValidity();
    } else {
        sortCodeInput.setCustomValidity('');
    }

    if (!formValid) {
        console.log('Form validation failed');
        return;
    }

    console.log('Form validation passed, generating invoice');

    const invoicerName = document.getElementById('invoicerName').value;
    const invoicerPhone = document.getElementById('invoicerPhone').value;
    const invoicerEmail = document.getElementById('invoicerEmail').value;
    const clientName = document.getElementById('clientName').value;
    const dueDate = document.getElementById('dueDate').value;
    const currency = selectedCurrency;
    const bankAccountNumber = document.getElementById('bankAccountNumber').value;
    const bankSortCode = sortCodeValue;
    const bankIBAN = document.getElementById('bankIBAN').value;
    const bankSWIFT = document.getElementById('bankSWIFT').value;
    const billableItems = document.querySelectorAll('.billable-item');
    
    let subtotal = 0;
    const items = [];
    billableItems.forEach(item => {
        const desc = item.querySelector('.item-desc').value;
        const qty = parseInt(item.querySelector('.item-qty').value) || 1;
        let rate = parseFloat(item.querySelector('.item-rate').value);
        if (isNaN(rate)) rate = 0;
        const hours = parseFloat(item.querySelector('.item-hours').value) || 0;
        let itemTotal = rate * qty;
        if (hours > 0) itemTotal *= hours;
        items.push({ desc, qty, rate, hours, itemTotal });
        subtotal += itemTotal;
    });

    const tax = subtotal * selectedTaxRate;
    const total = subtotal + tax;

    const invoiceData = {
        invoicerName,
        invoicerPhone,
        invoicerEmail,
        clientName,
        dueDate,
        items,
        subtotal,
        tax,
        total,
        currency,
        taxRate: selectedTaxRate,
        bankAccountNumber,
        bankSortCode,
        bankIBAN,
        bankSWIFT
    };
    invoices.push(invoiceData);

    const invoiceList = document.getElementById('invoiceList');
    const li = document.createElement('li');
    li.innerHTML = `${clientName} - ${currencySymbol(currency)}${total.toFixed(2)} (Due: ${dueDate})
        <button class="download-btn">Download PDF</button>`;
    li.dataset.invoiceIndex = invoices.length - 1;
    invoiceList.appendChild(li);

    const downloadBtn = li.querySelector('.download-btn');
    downloadBtn.addEventListener('click', function() {
        const index = parseInt(li.dataset.invoiceIndex);
        const data = invoices[index];
        downloadInvoice(
            data.invoicerName,
            data.invoicerPhone,
            data.invoicerEmail,
            data.clientName,
            data.dueDate,
            data.items,
            data.subtotal,
            data.tax,
            data.total,
            data.currency,
            data.taxRate,
            data.bankAccountNumber,
            data.bankSortCode,
            data.bankIBAN,
            data.bankSWIFT
        );
    });

    downloadInvoice(
        invoicerName,
        invoicerPhone,
        invoicerEmail,
        clientName,
        dueDate,
        items,
        subtotal,
        tax,
        total,
        currency,
        selectedTaxRate,
        bankAccountNumber,
        bankSortCode,
        bankIBAN,
        bankSWIFT
    );

    // Reset the form
    document.getElementById('invoiceForm').reset();
    document.getElementById('invoiceFormStep2').reset();
    document.getElementById('invoiceFormStep3').reset();
    document.getElementById('invoiceFormStep4').reset();
    document.getElementById('billableItems').innerHTML = '';
    addBillableItem();
    document.querySelector('.currency-btn[data-value="GBP"]').classList.add('active');
    document.querySelectorAll('.currency-btn:not([data-value="GBP"])').forEach(b => b.classList.remove('active'));
    document.querySelector('.tax-btn[data-tax="20"]').classList.add('active');
    document.querySelector('.tax-btn[data-tax="0"]').classList.remove('active');
    selectedCurrency = 'GBP';
    selectedTaxRate = 0.20;
    setDefaultDate();
    showStep(1);
    gdprCheckbox.checked = false;
    generateBtn.disabled = true;
});

function currencySymbol(currency) {
    return { 'GBP': '£', 'USD': '$', 'EUR': '€' }[currency];
}

function downloadInvoice(invoicerName, invoicerPhone, invoicerEmail, clientName, dueDate, items, subtotal, tax, total, currency, taxRate, bankAccountNumber, bankSortCode, bankIBAN, bankSWIFT) {
    const doc = new jsPDF();
    const symbol = currencySymbol(currency);
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;

    doc.setFontSize(24);
    doc.setTextColor(0, 0, 0);
    doc.text('InvoiceAI', pageWidth / 2, margin, { align: 'center' });

    doc.setFontSize(12);
    doc.setTextColor(0);
    let yPos = margin + 20;
    doc.text('Invoicer Details', margin, yPos);
    doc.line(margin, yPos + 2, pageWidth - margin, yPos + 2);
    yPos += 10;
    doc.text(`From: ${invoicerName}`, margin, yPos);
    if (invoicerPhone) {
        yPos += 8;
        doc.text(`Phone: ${invoicerPhone}`, margin, yPos);
    }
    if (invoicerEmail) {
        yPos += 8;
        doc.text(`Email: ${invoicerEmail}`, margin, yPos);
    }

    yPos += 15;
    doc.text('Client Details', margin, yPos);
    doc.line(margin, yPos + 2, pageWidth - margin, yPos + 2);
    yPos += 10;
    doc.text(`Client: ${clientName}`, margin, yPos);
    yPos += 8;
    doc.text(`Due Date: ${dueDate}`, margin, yPos);
    yPos += 8;
    doc.text(`Currency: ${currency}`, margin, yPos);

    yPos += 15;
    doc.setFontSize(14);
    doc.text('Billable Items', margin, yPos);
    doc.line(margin, yPos + 2, pageWidth - margin, yPos + 2);

    yPos += 10;
    doc.setFontSize(10);
    doc.text('Description', margin, yPos);
    doc.text('Qty', margin + 60, yPos, { align: 'center' });
    doc.text('Rate', margin + 90, yPos, { align: 'right' });
    doc.text('Hours', margin + 120, yPos, { align: 'right' });
    doc.text('Total', pageWidth - margin, yPos, { align: 'right' });
    yPos += 5;
    doc.line(margin, yPos, pageWidth - margin, yPos);

    items.forEach((item, index) => {
        yPos += 10;
        doc.text(item.desc, margin, yPos);
        doc.text(item.qty.toString(), margin + 60, yPos, { align: 'center' });
        doc.text(`${item.rate.toFixed(2)}`, margin + 90, yPos, { align: 'right' });
        doc.text(item.hours > 0 ? item.hours.toFixed(1) : '-', margin + 120, yPos, { align: 'right' });
        doc.text(`${symbol}${item.itemTotal.toFixed(2)}`, pageWidth - margin, yPos, { align: 'right' });
    });

    yPos += 20;
    doc.setFontSize(12);
    doc.text('Summary', margin, yPos);
    doc.line(margin, yPos + 2, pageWidth - margin, yPos + 2);
    yPos += 10;
    doc.text(`Subtotal: ${symbol}${subtotal.toFixed(2)}`, pageWidth - margin, yPos, { align: 'right' });
    yPos += 8;
    doc.text(`Tax (${(taxRate * 100)}%): ${symbol}${tax.toFixed(2)}`, pageWidth - margin, yPos, { align: 'right' });
    yPos += 10;
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(`Total: ${symbol}${total.toFixed(2)}`, pageWidth - margin, yPos, { align: 'right' });

    yPos += 20;
    doc.setFontSize(12);
    doc.setTextColor(0);
    if (bankAccountNumber || bankSortCode || bankIBAN || bankSWIFT) {
        doc.text('Payment Instructions', margin, yPos);
        doc.line(margin, yPos + 2, pageWidth - margin, yPos + 2);
        yPos += 10;
        doc.text('Please pay via bank transfer.', margin, yPos);
        yPos += 8;
        doc.text(`Account Name: ${invoicerName}`, margin, yPos);
        yPos += 8;
        if (bankAccountNumber) {
            doc.text(`Account Number: ${bankAccountNumber}`, margin, yPos);
            yPos += 8;
        }
        if (bankSortCode) {
            doc.text(`Sort Code: ${bankSortCode}`, margin, yPos);
            yPos += 8;
        }
        if (bankIBAN) {
            doc.text(`IBAN: ${bankIBAN}`, margin, yPos);
            yPos += 8;
        }
        if (bankSWIFT) {
            doc.text(`SWIFT/BIC: ${bankSWIFT}`, margin, yPos);
            yPos += 8;
        }
    }

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 255);
    doc.textWithLink('Invoices Made Easier by InvoiceAI', pageWidth / 2, pageHeight - margin, { align: 'center', url: 'https://invoiceai.com' });

    doc.save(`invoice_${clientName}_${dueDate}.pdf`);
}

function addBillableItem(desc = '', qty = 1, rate = '', hours = '') {
    const billableItems = document.getElementById('billableItems');
    const newItem = document.createElement('div');
    newItem.classList.add('billable-item');
    newItem.innerHTML = `
        <input type="text" class="item-desc" placeholder="Description" value="${desc}" required>
        <input type="number" class="item-qty" placeholder="Qty" step="1" value="${qty}" required>
        <input type="text" class="item-rate" placeholder="Rate (numbers only)" pattern="[0-9]+(\.[0-9]{1,2})?" title="Enter a number (e.g., 50 or 50.00), no currency symbols" value="${rate}" required>
        <input type="number" class="item-hours" placeholder="Hours (optional)" step="0.1" value="${hours}">
    `;
    billableItems.appendChild(newItem);
}

function setDefaultDate() {
    const today = '2025-04-06';
    document.getElementById('dueDate').value = today;
}

// Initialize
setDefaultDate();
showStep(1);
