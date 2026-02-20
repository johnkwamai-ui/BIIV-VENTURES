
import React from 'react';
import { Sale } from '../types';

interface ReceiptProps {
  sale: Sale;
}

const Receipt: React.FC<ReceiptProps> = ({ sale }) => {
  const isReturned = sale.status === 'returned';

  return (
    <div className={`p-8 text-sm font-mono text-gray-800 bg-white relative ${isReturned ? 'bg-red-50' : ''}`}>
      {isReturned && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="border-8 border-red-600 text-red-600 text-6xl font-black rotate-45 px-4 py-2 opacity-20 whitespace-nowrap">
            RETURNED
          </div>
        </div>
      )}

      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold">BIIV VENTURES LTD.</h2>
        <p className={isReturned ? 'text-red-600 font-bold' : ''}>
          {isReturned ? 'RETURN SLIP' : 'Sale Receipt'}
        </p>
        <p className="text-xs">{new Date(sale.createdAt).toLocaleString()}</p>
      </div>

      <div className="border-y border-dashed py-4 mb-4 space-y-1">
        <div className="flex justify-between">
          <span>ID:</span>
          <span>{sale.id}</span>
        </div>
        <div className="flex justify-between">
          <span>Cashier:</span>
          <span>{sale.userName}</span>
        </div>
        <div className="flex justify-between">
          <span>Method:</span>
          <span>{sale.paymentMethod}</span>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        {sale.items.map((item, idx) => (
          <div key={idx}>
            <div className="flex justify-between">
              <span className={`font-bold ${isReturned ? 'line-through text-gray-400' : ''}`}>{item.productName}</span>
              <span className={isReturned ? 'line-through text-gray-400' : ''}>{(item.price * item.quantity).toLocaleString()}</span>
            </div>
            <div className="text-xs text-gray-500">
              {item.quantity} x {item.price.toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-dashed pt-4 space-y-2 font-bold">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span className={isReturned ? 'line-through text-gray-400' : ''}>KES {sale.subtotal.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-gray-600 font-normal">
          <span>Discount:</span>
          <span className={isReturned ? 'line-through text-gray-400' : ''}>KES -{sale.discount.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-lg border-t border-dashed pt-2">
          <span>Total:</span>
          <span className={isReturned ? 'text-red-600' : ''}>KES {sale.totalAmount.toLocaleString()}</span>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-dashed space-y-1">
        <div className="flex justify-between">
          <span>Amount Paid:</span>
          <span>KES {sale.amountPaid.toLocaleString()}</span>
        </div>
        <div className="flex justify-between font-bold">
          <span>{sale.balance > 0 ? 'Balance (Debt):' : 'Change:'}</span>
          <span>KES {Math.abs(sale.balance).toLocaleString()}</span>
        </div>
      </div>

      {isReturned && (
        <div className="mt-4 p-2 bg-red-100 border border-red-200 text-red-700 text-center text-xs font-bold rounded">
          * PRODUCTS RETURNED TO STOCK *
        </div>
      )}

      <div className="mt-10 text-center space-y-2 border-t pt-6">
        <p className="font-bold text-gray-700 italic">Thank you for your business!</p>
        <div className="text-xs text-gray-500 pt-4 space-y-1 border-t border-gray-100 mt-4">
          <p className="font-bold uppercase tracking-widest text-gray-600 text-[10px]">Company Information</p>
          <p className="text-gray-700 font-semibold">BIIV VENTURES LTD.</p>
          <p>Contact: 0790116787</p>
          <p>Email: biiv.ventures@gmail.com</p>
          <p className="italic pt-2">Powered by BIIV VENTURES LTD. POS Systems</p>
        </div>
      </div>
    </div>
  );
};

export default Receipt;
