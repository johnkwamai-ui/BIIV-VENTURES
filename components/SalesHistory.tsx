
import React, { useState } from 'react';
import { Sale, User, UserRole, Product, SaleItem, PaymentMethod, SaleEditLog, ReturnLog } from '../types';
import { storage } from '../services/storage';
import Receipt from './Receipt';

interface SalesHistoryProps {
  user: User;
}

const SalesHistory: React.FC<SalesHistoryProps> = ({ user }) => {
  const [sales, setSales] = useState<Sale[]>(storage.getSales());
  const [viewingSale, setViewingSale] = useState<Sale | null>(null);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  
  // Edit State
  const [editForm, setEditForm] = useState<{
    items: SaleItem[];
    discount: number;
    amountPaid: number;
    paymentMethod: PaymentMethod;
  } | null>(null);

  const isAdmin = user.role === UserRole.ADMIN;
  const filteredSales = isAdmin ? sales : sales.filter(s => s.userId === user.id);

  const handleReturnSale = (sale: Sale) => {
    if (!isAdmin) return;
    if (sale.status === 'returned') {
      alert("This transaction has already been returned.");
      return;
    }

    if (window.confirm(`Are you sure you want to RETURN this transaction (${sale.id})? All items will be added back to stock.`)) {
      // 1. Restore Stock
      const products = storage.getProducts();
      const updatedProducts = products.map(p => {
        const item = sale.items.find(i => i.productId === p.id);
        if (item) {
          return { ...p, stockQuantity: p.stockQuantity + item.quantity };
        }
        return p;
      });
      storage.saveProducts(updatedProducts);

      // 2. Update Sale Status
      const updatedSales = sales.map(s => 
        s.id === sale.id ? { ...s, status: 'returned' as const } : s
      );
      storage.saveSales(updatedSales);
      setSales(updatedSales);

      // 3. Log Return Activity
      const returnLogs = storage.getReturnLogs();
      storage.saveReturnLogs([{
        id: `RET-${Date.now()}`,
        saleId: sale.id,
        returnedBy: user.id,
        returnedByName: user.name,
        timestamp: Date.now()
      }, ...returnLogs]);

      setEditingSale(null);
      setEditForm(null);
      alert("Return processed successfully. Stock levels updated.");
    }
  };

  const handleDeleteSale = (sale: Sale) => {
    if (!isAdmin) return;
    if (window.confirm("Are you sure you want to permanently DELETE this sale? Stock will be restored if not already returned.")) {
      // Only restore stock if it hasn't been returned already
      if (sale.status !== 'returned') {
        const products = storage.getProducts();
        const updatedProducts = products.map(p => {
          const item = sale.items.find(i => i.productId === p.id);
          if (item) {
            return { ...p, stockQuantity: p.stockQuantity + item.quantity };
          }
          return p;
        });
        storage.saveProducts(updatedProducts);
      }

      const updatedSales = sales.filter(s => s.id !== sale.id);
      storage.saveSales(updatedSales);
      setSales(updatedSales);

      const logs = storage.getLogs();
      storage.saveLogs([{
        id: `LOG-${Date.now()}`,
        saleId: sale.id,
        deletedBy: user.id,
        deletedByName: user.name,
        timestamp: Date.now()
      }, ...logs]);

      alert("Sale deleted and data updated.");
    }
  };

  const startEditing = (sale: Sale) => {
    if (sale.status === 'returned') {
      alert("Cannot edit a returned transaction.");
      return;
    }
    setEditingSale(sale);
    setEditForm({
      items: JSON.parse(JSON.stringify(sale.items)),
      discount: sale.discount,
      amountPaid: sale.amountPaid,
      paymentMethod: sale.paymentMethod
    });
  };

  const handleUpdateEditItemQty = (productId: string, newQty: number) => {
    if (!editForm) return;
    if (newQty < 0) return;
    
    const product = storage.getProducts().find(p => p.id === productId);
    const originalItem = editingSale?.items.find(i => i.productId === productId);
    const originalQty = originalItem?.quantity || 0;
    const currentStock = product?.stockQuantity || 0;
    const maxAvailable = currentStock + originalQty;

    if (newQty > maxAvailable) {
      alert(`Insufficient stock! Only ${maxAvailable} available in total.`);
      return;
    }

    setEditForm({
      ...editForm,
      items: editForm.items.map(item => 
        item.productId === productId ? { ...item, quantity: newQty } : item
      )
    });
  };

  const handleSaveEdit = () => {
    if (!editingSale || !editForm) return;

    const newSubtotal = editForm.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const newTotal = Math.max(0, newSubtotal - editForm.discount);
    const newBalance = newTotal - editForm.amountPaid;

    const products = storage.getProducts();
    const updatedProducts = products.map(p => {
      const originalItem = editingSale.items.find(i => i.productId === p.id);
      const newItem = editForm.items.find(i => i.productId === p.id);
      const originalQty = originalItem?.quantity || 0;
      const newQty = newItem?.quantity || 0;
      return { ...p, stockQuantity: p.stockQuantity + originalQty - newQty };
    });

    const updatedSale: Sale = {
      ...editingSale,
      items: editForm.items.filter(item => item.quantity > 0),
      subtotal: newSubtotal,
      totalAmount: newTotal,
      discount: editForm.discount,
      amountPaid: editForm.amountPaid,
      balance: newBalance,
      paymentMethod: editForm.paymentMethod
    };

    const updatedSales = sales.map(s => s.id === updatedSale.id ? updatedSale : s);

    const editLogs = storage.getEditLogs();
    const newEditLog: SaleEditLog = {
      id: `ELOG-${Date.now()}`,
      saleId: editingSale.id,
      editedBy: user.id,
      editedByName: user.name,
      timestamp: Date.now(),
      changes: `Items, discount or payment adjusted by Admin.`
    };

    storage.saveProducts(updatedProducts);
    storage.saveSales(updatedSales);
    storage.saveEditLogs([newEditLog, ...editLogs]);

    setSales(updatedSales);
    setEditingSale(null);
    setEditForm(null);
    alert("Sale updated and stock reconciled successfully.");
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Transaction ID</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Date</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">User</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Method</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">Total</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredSales.map(sale => (
              <tr key={sale.id} className={`hover:bg-gray-50 transition-colors ${sale.status === 'returned' ? 'bg-red-50 opacity-70' : ''}`}>
                <td className="px-6 py-4 font-mono text-xs">
                  {sale.id}
                  {sale.status === 'returned' && <span className="block text-[10px] text-red-600 font-bold mt-1 uppercase">Returned</span>}
                </td>
                <td className="px-6 py-4 text-sm">{new Date(sale.createdAt).toLocaleString()}</td>
                <td className="px-6 py-4 font-medium">{sale.userName}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-gray-100 rounded text-xs">{sale.paymentMethod}</span>
                </td>
                <td className="px-6 py-4 text-right font-bold text-[#800000]">KES {sale.totalAmount.toLocaleString()}</td>
                <td className="px-6 py-4 text-right">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    sale.status === 'returned' ? 'bg-red-200 text-red-800' : 
                    sale.balance > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {sale.status === 'returned' ? 'Returned' : (sale.balance > 0 ? `Debt: KES ${sale.balance.toLocaleString()}` : 'Paid')}
                  </span>
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button onClick={() => setViewingSale(sale)} className="text-gray-600 hover:text-[#800000] text-sm font-bold">View</button>
                  {isAdmin && (
                    <>
                      {sale.status !== 'returned' && (
                        <button onClick={() => startEditing(sale)} className="text-blue-600 hover:text-blue-800 text-sm font-bold">Edit</button>
                      )}
                      <button onClick={() => handleDeleteSale(sale)} className="text-red-500 hover:text-red-700 text-sm font-bold">Delete</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {filteredSales.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-gray-400">No sales transactions found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editingSale && editForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-4">
              <h3 className="text-xl font-bold flex items-center space-x-2">
                <span className="text-[#800000]">✏️</span>
                <span>Edit Transaction: {editingSale.id}</span>
              </h3>
              <button 
                onClick={() => handleReturnSale(editingSale)}
                className="px-4 py-2 bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-sm font-bold hover:bg-amber-200 transition-colors"
              >
                🔄 Mark as Returned
              </button>
            </div>
            
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left">Item Name</th>
                    <th className="px-4 py-2 text-center">Qty</th>
                    <th className="px-4 py-2 text-right">Price</th>
                    <th className="px-4 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {editForm.items.map(item => (
                    <tr key={item.productId}>
                      <td className="px-4 py-2 font-medium">{item.productName}</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center justify-center space-x-2">
                          <button onClick={() => handleUpdateEditItemQty(item.productId, item.quantity - 1)} className="w-6 h-6 border rounded">-</button>
                          <span className="font-bold w-8 text-center">{item.quantity}</span>
                          <button onClick={() => handleUpdateEditItemQty(item.productId, item.quantity + 1)} className="w-6 h-6 border rounded">+</button>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right">KES {item.price.toLocaleString()}</td>
                      <td className="px-4 py-2 text-right">KES {(item.price * item.quantity).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-2 gap-6 bg-gray-50 p-4 rounded-lg">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Payment Method</label>
                  <select 
                    className="w-full p-2 border rounded"
                    value={editForm.paymentMethod}
                    onChange={(e) => setEditForm({...editForm, paymentMethod: e.target.value as PaymentMethod})}
                  >
                    {Object.values(PaymentMethod).map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Discount (KES)</label>
                  <input 
                    type="number" 
                    className="w-full p-2 border rounded" 
                    value={editForm.discount}
                    onChange={(e) => setEditForm({...editForm, discount: Number(e.target.value)})}
                  />
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Amount Paid (KES)</label>
                  <input 
                    type="number" 
                    className="w-full p-2 border rounded font-bold text-[#800000]" 
                    value={editForm.amountPaid}
                    onChange={(e) => setEditForm({...editForm, amountPaid: Number(e.target.value)})}
                  />
                </div>
                <div className="pt-2 border-t">
                  <div className="flex justify-between font-bold text-lg">
                    <span>New Total:</span>
                    <span className="text-[#800000]">KES {Math.max(0, editForm.items.reduce((a, b) => a + (b.price * b.quantity), 0) - editForm.discount).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex space-x-4 pt-4">
              <button 
                onClick={() => setEditingSale(null)}
                className="flex-1 py-3 border border-gray-300 rounded-xl font-bold hover:bg-gray-50 text-gray-600"
              >Discard Changes</button>
              <button 
                onClick={handleSaveEdit}
                className="flex-1 py-3 bg-[#800000] text-white rounded-xl font-bold hover:bg-red-900"
              >Save & Update Sale</button>
            </div>
          </div>
        </div>
      )}

      {viewingSale && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full relative">
            <button 
              onClick={() => setViewingSale(null)}
              className="absolute top-4 right-4 text-2xl hover:bg-gray-100 w-10 h-10 rounded-full flex items-center justify-center no-print"
            >&times;</button>
            <Receipt sale={viewingSale} />
            <div className="p-4 border-t no-print flex space-x-3">
              <button onClick={() => window.print()} className="flex-1 py-3 bg-[#800000] text-white rounded-lg font-bold">🖨️ Print</button>
              <button onClick={() => setViewingSale(null)} className="flex-1 py-3 bg-gray-200 rounded-lg font-bold">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesHistory;
