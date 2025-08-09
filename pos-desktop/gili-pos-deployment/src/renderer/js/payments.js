// Payment Processing System
const { ipcRenderer } = require('electron');

class PaymentManager {
    constructor() {
        this.paymentModal = null;
        this.currentTransaction = null;
    }
    
    async init() {
        this.paymentModal = document.getElementById('payment-modal');
        this.setupPaymentEventListeners();
    }
    
    setupPaymentEventListeners() {
        // Payment method selection
        document.getElementById('payment-method').addEventListener('change', (e) => {
            this.togglePaymentFields(e.target.value);
        });
        
        // Amount received calculation
        document.getElementById('amount-received').addEventListener('input', (e) => {
            this.calculateChange();
        });
        
        // Payment buttons
        document.getElementById('cancel-payment').addEventListener('click', () => {
            this.hidePaymentModal();
        });
        
        document.getElementById('complete-payment').addEventListener('click', () => {
            this.processPayment();
        });
        
        // Quick cash buttons (add dynamically)
        this.addQuickCashButtons();
    }
    
    showPaymentModal(totalAmount) {
        this.currentTransaction = { total: totalAmount };
        
        // Update modal with total
        document.getElementById('payment-total').textContent = totalAmount.toFixed(2);
        document.getElementById('amount-received').value = totalAmount.toFixed(2);
        
        // Reset to cash payment
        document.getElementById('payment-method').value = 'cash';
        this.togglePaymentFields('cash');
        this.calculateChange();
        
        // Show modal
        this.paymentModal.classList.remove('hidden');
        
        // Focus on amount received
        setTimeout(() => {
            document.getElementById('amount-received').focus();
            document.getElementById('amount-received').select();
        }, 100);
    }
    
    hidePaymentModal() {
        this.paymentModal.classList.add('hidden');
        this.currentTransaction = null;
    }
    
    togglePaymentFields(paymentMethod) {
        const cashPayment = document.getElementById('cash-payment');
        const cardPayment = document.getElementById('card-payment');
        
        if (paymentMethod === 'cash') {
            cashPayment.classList.remove('hidden');
            cardPayment.classList.add('hidden');
        } else {
            cashPayment.classList.add('hidden');
            cardPayment.classList.remove('hidden');
        }
        
        this.calculateChange();
    }
    
    calculateChange() {
        const paymentMethod = document.getElementById('payment-method').value;
        
        if (paymentMethod === 'cash') {
            const total = parseFloat(document.getElementById('payment-total').textContent);
            const received = parseFloat(document.getElementById('amount-received').value) || 0;
            const change = received - total;
            
            document.getElementById('change-amount').textContent = Math.max(0, change).toFixed(2);
            
            // Enable/disable complete button
            const completeBtn = document.getElementById('complete-payment');
            if (received >= total) {
                completeBtn.disabled = false;
                completeBtn.classList.remove('bg-gray-400');
                completeBtn.classList.add('bg-green-500', 'hover:bg-green-600');
            } else {
                completeBtn.disabled = true;
                completeBtn.classList.add('bg-gray-400');
                completeBtn.classList.remove('bg-green-500', 'hover:bg-green-600');
            }
        } else {
            document.getElementById('change-amount').textContent = '0.00';
            document.getElementById('complete-payment').disabled = false;
        }
    }
    
    addQuickCashButtons() {
        const cashPayment = document.getElementById('cash-payment');
        const total = this.currentTransaction?.total || 0;
        
        const quickAmounts = [
            total,
            Math.ceil(total / 5) * 5, // Round up to nearest 5
            Math.ceil(total / 10) * 10, // Round up to nearest 10
            Math.ceil(total / 20) * 20  // Round up to nearest 20
        ];
        
        // Remove duplicates and sort
        const uniqueAmounts = [...new Set(quickAmounts)].sort((a, b) => a - b);
        
        const quickButtonsDiv = document.createElement('div');
        quickButtonsDiv.className = 'grid grid-cols-2 gap-2 mt-3';
        quickButtonsDiv.innerHTML = uniqueAmounts.map(amount => `
            <button class="quick-cash-btn bg-blue-100 hover:bg-blue-200 text-blue-800 py-1 px-2 rounded text-sm"
                    data-amount="${amount}">
                $${amount.toFixed(2)}
            </button>
        `).join('');
        
        // Add event listeners to quick buttons
        quickButtonsDiv.querySelectorAll('.quick-cash-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const amount = parseFloat(e.target.dataset.amount);
                document.getElementById('amount-received').value = amount.toFixed(2);
                this.calculateChange();
            });
        });
        
        // Insert after amount received input
        const amountInput = document.getElementById('amount-received').parentElement;
        amountInput.parentNode.insertBefore(quickButtonsDiv, amountInput.nextSibling);
    }
    
    async processPayment() {
        try {
            const paymentMethod = document.getElementById('payment-method').value;
            const total = parseFloat(document.getElementById('payment-total').textContent);
            
            let paymentData = {
                method: paymentMethod,
                amount: total,
                timestamp: new Date().toISOString()
            };
            
            // Collect payment-specific data
            if (paymentMethod === 'cash') {
                const received = parseFloat(document.getElementById('amount-received').value);
                const change = received - total;
                
                paymentData.amount_received = received;
                paymentData.change = Math.max(0, change);
                
                if (received < total) {
                    this.showError('Insufficient payment amount');
                    return;
                }
            } else if (paymentMethod === 'card') {
                paymentData.reference = document.getElementById('card-reference').value;
                
                if (!paymentData.reference) {
                    this.showError('Card reference is required');
                    return;
                }
            }
            
            // Create transaction from cart
            const transactionData = app.cart.toTransaction(
                this.getSelectedCustomer(),
                paymentMethod,
                paymentData
            );
            
            // Save transaction locally
            const result = await ipcRenderer.invoke('pos:create-transaction', transactionData);
            
            if (result && result.id) {
                // Print receipt
                await this.printReceipt(transactionData, paymentData);
                
                // Show success and clear cart
                this.showPaymentSuccess(transactionData, paymentData);
                
                // Clear cart and close modal
                app.cart.clear();
                this.hidePaymentModal();
                
                // Generate new transaction ID
                app.currentTransaction.id = app.generateTransactionId();
                document.getElementById('transaction-id').textContent = app.currentTransaction.id.slice(-3);
                
            } else {
                this.showError('Failed to process payment');
            }
            
        } catch (error) {
            console.error('Payment processing error:', error);
            this.showError('Payment processing failed: ' + error.message);
        }
    }
    
    async printReceipt(transaction, paymentData) {
        try {
            const receiptData = {
                transaction: transaction,
                payment: paymentData,
                store: {
                    name: 'GiLi Store',
                    address: '',
                    phone: '',
                    email: ''
                },
                timestamp: new Date().toLocaleString()
            };
            
            await ipcRenderer.invoke('pos:print-receipt', receiptData);
            
        } catch (error) {
            console.warn('Receipt printing failed:', error);
            // Don't fail the entire transaction if printing fails
        }
    }
    
    showPaymentSuccess(transaction, paymentData) {
        let message = `Payment successful! Transaction #${transaction.id.slice(-6)}`;
        
        if (paymentData.method === 'cash' && paymentData.change > 0) {
            message += `\nChange: $${paymentData.change.toFixed(2)}`;
        }
        
        // Show success notification
        if (typeof app !== 'undefined' && app.showNotification) {
            app.showNotification(message, 'success');
        }
        
        // Open cash drawer if cash payment
        if (paymentData.method === 'cash') {
            this.openCashDrawer();
        }
    }
    
    async openCashDrawer() {
        try {
            // Send cash drawer open command
            await ipcRenderer.invoke('pos:open-cash-drawer');
        } catch (error) {
            console.warn('Could not open cash drawer:', error);
        }
    }
    
    getSelectedCustomer() {
        const customerSelect = document.getElementById('customer-select');
        return customerSelect.value || null;
    }
    
    showError(message) {
        if (typeof app !== 'undefined' && app.showNotification) {
            app.showNotification(message, 'error');
        } else {
            alert(message);
        }
    }
    
    // Process refund
    async processRefund(originalTransactionId, amount, reason = '') {
        try {
            const refundData = {
                id: this.generateRefundId(),
                original_transaction_id: originalTransactionId,
                amount: amount,
                reason: reason,
                method: 'cash', // Default to cash refund
                timestamp: new Date().toISOString()
            };
            
            const result = await ipcRenderer.invoke('pos:process-refund', refundData);
            
            if (result.success) {
                this.showPaymentSuccess({ id: refundData.id }, { method: 'refund' });
                await this.printRefundReceipt(refundData);
                return true;
            } else {
                this.showError('Refund processing failed');
                return false;
            }
            
        } catch (error) {
            console.error('Refund error:', error);
            this.showError('Refund failed: ' + error.message);
            return false;
        }
    }
    
    generateRefundId() {
        const now = new Date();
        const timestamp = now.getTime().toString().slice(-8);
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `REF${timestamp}${random}`;
    }
    
    async printRefundReceipt(refundData) {
        try {
            const receiptData = {
                type: 'refund',
                refund: refundData,
                store: {
                    name: 'GiLi Store',
                    address: '',
                    phone: '',
                    email: ''
                },
                timestamp: new Date().toLocaleString()
            };
            
            await ipcRenderer.invoke('pos:print-receipt', receiptData);
            
        } catch (error) {
            console.warn('Refund receipt printing failed:', error);
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PaymentManager;
}