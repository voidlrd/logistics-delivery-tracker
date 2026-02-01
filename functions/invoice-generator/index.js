const functions = require('@google-cloud/functions-framework');

functions.http('generateInvoice', async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }

    try {
        const { orderId, total, customerName } = req.body;

        if (!orderId) {
            return res.status(400).json({ 
                error: 'Missing required field: orderId' 
            });
        }

        if (!customerName) {
            return res.status(400).json({ 
                error: 'Missing required field: customerName' 
            });
        }

        if (total === undefined || total === null) {
            return res.status(400).json({ 
                error: 'Missing required field: total' 
            });
        }

        console.log('='.repeat(50));
        console.log('GENERATING INVOICE');
        console.log('='.repeat(50));
        console.log(`Order ID:       ${orderId}`);
        console.log(`Customer:       ${customerName}`);
        console.log(`Total Amount:   $${parseFloat(total).toFixed(2)}`);
        console.log(`Timestamp:      ${new Date().toISOString()}`);
        console.log('='.repeat(50));

        await new Promise(resolve => setTimeout(resolve, 100));

        const response = {
            status: 'success',
            invoiceId: `INV-${orderId}`,
            orderId: orderId,
            customerName: customerName,
            amount: parseFloat(total).toFixed(2),
            currency: 'USD',
            generatedAt: new Date().toISOString(),
            invoiceUrl: `https://storage.googleapis.com/invoices/${orderId}.pdf`,
            downloadUrl: `https://storage.googleapis.com/invoices/${orderId}.pdf?download=true`,
            message: 'Invoice generated successfully'
        };

        console.log('Invoice generated successfully');
        console.log(`Invoice URL: ${response.invoiceUrl}`);
        
        res.status(200).json(response);

    } catch (error) {
        console.error('Error generating invoice:', error);
        res.status(500).json({
            error: 'Failed to generate invoice',
            message: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});