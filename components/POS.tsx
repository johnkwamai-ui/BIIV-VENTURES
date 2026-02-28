
import React, { useState, useMemo, useEffect } from 'react';
import { Product, Sale, SaleItem, PaymentMethod, User, Customer, Payment } from '../types';
import { storage } from '../services/storage';
import Receipt from './Receipt';

interface POSProps {
  user: User;
}

const CASH_SHORTCUTS = [50, 100, 200, 500, 1000];

const POS: React.FC<POSProps> = ({ user }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [amountPaid, setAmountPaid] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('N/A');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [currentSale, setCurrentSale] = useState<Sale | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddData, setQuickAddData] = useState({ name: '', phone: '' });
  const [errorAlert, setErrorAlert] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [p, c] = await Promise.all([
          storage.getProducts(),
          storage.getCustomers()
        ]);
        setProducts(p);
        setCustomers(c);
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleCustomerSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedCustomerId(id);
    if (id) {
      const customer = customers.find(c => c.id === id);
      if (customer) {
        setCustomerName(customer.name);
        setCustomerPhone(customer.phone);
      }
    } else {
      setCustomerName('Walk-in Customer');
      setCustomerPhone('N/A');
    }
  };

  const handleQuickAdd = async () => {
    if (!quickAddData.name || !quickAddData.phone) {
      alert('Name and Phone are required for quick add');
      return;
    }

    try {
      const newCustomer: Customer = {
        id: `CUST-${Date.now()}`,
        name: quickAddData.name,
        phone: quickAddData.phone,
        debt: 0,
        createdAt: Date.now()
      };

      const updatedCustomers = [...customers, newCustomer];
      await storage.saveCustomers(updatedCustomers);
      
      setCustomers(updatedCustomers);
      setSelectedCustomerId(newCustomer.id);
      setCustomerName(newCustomer.name);
      setCustomerPhone(newCustomer.phone);
      setIsQuickAddOpen(false);
      setQuickAddData({ name: '', phone: '' });
    } catch (err) {
      alert('Error adding customer');
      console.error(err);
    }
  };

  const categories = useMemo(() => ['All', ...Array.from(new Set(products.map(p => p.category || 'General')))], [products]);

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.barcode.includes(searchQuery);
    const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const addToCart = (product: Product) => {
    if (product.stockQuantity <= 0) {
      alert("Out of stock!");
      return;
    }
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.stockQuantity) return prev;
        return prev.map(item => item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { productId: product.id, productName: product.name, quantity: 1, price: product.price, buyingPrice: product.buyingPrice || 0 }];
    });
  };

  const updateQuantity = (productId: string, qty: number) => {
    const p = products.find(prod => prod.id === productId);
    if (!p) return;
    if (qty > p.stockQuantity) return;
    if (qty <= 0) {
      setCart(prev => prev.filter(i => i.productId !== productId));
      return;
    }
    setCart(prev => prev.map(i => i.productId === productId ? { ...i, quantity: qty } : i));
  };

  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const totalAmount = Math.max(0, subtotal - discount);
  const balance = totalAmount - amountPaid;

  const processSale = async () => {
    if (cart.length === 0) return;

    // Validation: Debt requires a registered customer
    if (balance > 0 && !selectedCustomerId) {
      setErrorAlert("Debt is not allowed for Walk-in Customers. Please select a registered customer to record debt.");
      return;
    }

    const saleId = `SALE-${Date.now()}`;
    const newSale: Sale = {
      id: saleId,
      userId: user.id,
      userName: user.name,
      customerId: selectedCustomerId || undefined,
      customerName,
      customerPhone,
      subtotal,
      discount,
      totalAmount,
      amountPaid,
      balance,
      paymentMethod,
      items: cart,
      status: balance <= 0 ? 'paid' : (amountPaid > 0 ? 'partial' : 'unpaid'),
      createdAt: Date.now()
    };

    try {
      const allProducts = await storage.getProducts();
      const updatedProducts = allProducts.map(p => {
        const cartItem = cart.find(ci => ci.productId === p.id);
        return cartItem ? { ...p, stockQuantity: p.stockQuantity - cartItem.quantity } : p;
      });

      const allSales = await storage.getSales();
      
      const promises: Promise<any>[] = [
        storage.saveProducts(updatedProducts),
        storage.saveSales([newSale, ...allSales])
      ];

      // Create initial payment record if any amount was paid
      if (amountPaid > 0) {
        const initialPayment: Payment = {
          id: `PAY-${Date.now()}`,
          saleId: saleId,
          customerId: selectedCustomerId || 'WALK-IN',
          amount: amountPaid,
          paymentMode: paymentMethod,
          receivedBy: user.id,
          receivedByName: user.name,
          paidAt: Date.now()
        };
        promises.push(storage.savePayment(initialPayment));
      }

      // Update customer debt if selected
      if (selectedCustomerId && balance > 0) {
        const allCustomers = await storage.getCustomers();
        const updatedCustomers = allCustomers.map(c => 
          c.id === selectedCustomerId ? { ...c, debt: c.debt + balance } : c
        );
        promises.push(storage.saveCustomers(updatedCustomers));
        setCustomers(updatedCustomers);
      }

      await Promise.all(promises);

      setProducts(updatedProducts);
      setCurrentSale(newSale);
      setShowReceipt(true);
      setCart([]); setDiscount(0); setAmountPaid(0); setCustomerName('Walk-in Customer'); setCustomerPhone('N/A'); setSelectedCustomerId('');
    } catch (err) {
      alert('Error processing sale. Please check your connection.');
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#800000]"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full animate-in fade-in slide-in-from-left-4 duration-500">
      <div className="flex-1 flex flex-col bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map(cat => (
              <button 
                key={cat} 
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCategory === cat ? 'bg-[#800000] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >{cat}</button>
            ))}
          </div>
          <div className="relative">
            <input type="text" placeholder="Search by name or barcode..." className="w-full pl-10 pr-4 py-3 bg-gray-50 border rounded-2xl outline-none focus:ring-2 focus:ring-[#800000] transition-all" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            <span className="absolute left-3 top-3.5 text-gray-400">🔍</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredProducts.map(p => (
            <button key={p.id} onClick={() => addToCart(p)} disabled={p.stockQuantity <= 0} className={`p-4 border rounded-2xl text-left transition-all hover:border-[#800000] hover:shadow-lg hover:-translate-y-1 relative group ${p.stockQuantity <= 0 ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
              <span className="absolute top-2 right-2 text-[8px] font-black px-1.5 py-0.5 rounded bg-gray-100 text-gray-400 group-hover:bg-[#800000] group-hover:text-white">{p.category}</span>
              <p className="font-bold text-gray-800 line-clamp-2 leading-tight h-10">{p.name}</p>
              <div className="mt-4 flex items-end justify-between">
                <div>
                  <p className="text-[10px] font-black text-[#800000]">KES {p.price.toLocaleString()}</p>
                  <p className="text-[8px] text-gray-400 font-bold uppercase mt-1">STOCK: {p.stockQuantity} {p.unit}</p>
                </div>
                <div className="bg-gray-50 w-6 h-6 rounded flex items-center justify-center text-xs font-bold">+</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="w-full lg:w-[400px] flex flex-col bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden shrink-0">
        <div className="p-4 bg-[#800000] text-white flex justify-between items-center">
          <h3 className="font-black text-sm uppercase tracking-widest">Cart Checkout</h3>
          <span className="bg-white/20 text-white text-[10px] px-2 py-1 rounded-full font-bold">{cart.length} items</span>
        </div>

        <div className="p-4 space-y-3 bg-gray-50 border-b">
          <div className="flex gap-2 mb-2">
            <select 
              className="flex-1 text-xs p-2.5 border rounded-xl outline-none bg-white"
              value={selectedCustomerId}
              onChange={handleCustomerSelect}
            >
              <option value="">Walk-in Customer (No Debt Allowed)</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
              ))}
            </select>
            <button 
              onClick={() => setIsQuickAddOpen(!isQuickAddOpen)}
              className="px-3 bg-[#800000] text-white rounded-xl text-xs font-bold hover:bg-red-900 transition-all"
              title="Quick Add Customer"
            >
              {isQuickAddOpen ? '✕' : '+'}
            </button>
          </div>

          {isQuickAddOpen && (
            <div className="p-3 bg-white border rounded-xl space-y-2 animate-in slide-in-from-top-2 duration-200">
              <p className="text-[10px] font-black text-[#800000] uppercase tracking-widest">Quick Register</p>
              <input 
                type="text" 
                placeholder="Full Name" 
                className="w-full text-xs p-2 border rounded-lg outline-none" 
                value={quickAddData.name}
                onChange={e => setQuickAddData({...quickAddData, name: e.target.value})}
              />
              <input 
                type="text" 
                placeholder="Phone Number" 
                className="w-full text-xs p-2 border rounded-lg outline-none" 
                value={quickAddData.phone}
                onChange={e => setQuickAddData({...quickAddData, phone: e.target.value})}
              />
              <button 
                onClick={handleQuickAdd}
                className="w-full py-2 bg-[#800000] text-white rounded-lg text-xs font-bold hover:bg-red-900"
              >
                Save & Select
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <input type="text" placeholder="Customer Name" className="text-xs p-2.5 border rounded-xl outline-none" value={customerName} onChange={e => setCustomerName(e.target.value)} />
            <input type="text" placeholder="Phone" className="text-xs p-2.5 border rounded-xl outline-none" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {cart.map(item => (
            <div key={item.productId} className="flex items-center space-x-3 p-2 bg-white border rounded-xl group">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-800 truncate">{item.productName}</p>
                <p className="text-[10px] font-bold text-[#800000]">KES {item.price.toLocaleString()}</p>
              </div>
              <div className="flex items-center space-x-2">
                <button onClick={() => updateQuantity(item.productId, item.quantity - 1)} className="w-6 h-6 flex items-center justify-center rounded-lg bg-gray-100 font-black text-xs">-</button>
                <span className="text-xs font-black w-4 text-center">{item.quantity}</span>
                <button onClick={() => updateQuantity(item.productId, item.quantity + 1)} className="w-6 h-6 flex items-center justify-center rounded-lg bg-gray-100 font-black text-xs">+</button>
              </div>
            </div>
          ))}
          {cart.length === 0 && <div className="h-full flex flex-col items-center justify-center text-gray-300 py-10 opacity-50"><span className="text-4xl mb-2">🛒</span><p className="text-xs font-bold">CART IS EMPTY</p></div>}
        </div>

        <div className="p-5 bg-gray-50 border-t space-y-4">
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-bold text-gray-400"><span>Subtotal</span><span>KES {subtotal.toLocaleString()}</span></div>
            <div className="flex justify-between items-center text-xs font-bold text-gray-400">
              <span>Discount</span>
              <input type="number" className="w-20 text-right p-1 border rounded-lg" value={discount} onChange={e => setDiscount(Number(e.target.value))} />
            </div>
            <div className="flex justify-between text-xl font-black text-[#800000] pt-2"><span>Total</span><span>KES {totalAmount.toLocaleString()}</span></div>
          </div>

          <div className="space-y-3 pt-3 border-t">
            <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
              {Object.values(PaymentMethod).map(m => (
                <button key={m} onClick={() => setPaymentMethod(m)} className={`flex-1 py-2 rounded-xl text-[10px] font-black border transition-all ${paymentMethod === m ? 'bg-[#800000] text-white border-[#800000]' : 'bg-white text-gray-400'}`}>{m}</button>
              ))}
            </div>
            <div className="relative">
              <label className="absolute left-3 top-2.5 text-[10px] font-black text-gray-400 uppercase">Paid</label>
              <input type="number" className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-[#800000] font-black text-lg text-right" value={amountPaid} onChange={e => setAmountPaid(Number(e.target.value))} />
            </div>
            <div className="flex gap-1">
              {CASH_SHORTCUTS.map(val => (
                <button key={val} onClick={() => setAmountPaid(prev => prev + val)} className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-[10px] font-bold">+{val}</button>
              ))}
            </div>
            <div className="flex justify-between items-center py-2 px-4 bg-white rounded-2xl border border-dashed border-gray-200">
              <span className="text-[10px] font-black text-gray-400 uppercase">{balance > 0 ? 'Due' : 'Change'}</span>
              <span className={`font-black ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>KES {Math.abs(balance).toLocaleString()}</span>
            </div>
          </div>

          <button onClick={processSale} disabled={cart.length === 0} className="w-full py-4 bg-[#800000] text-white rounded-2xl font-black text-sm hover:bg-red-900 shadow-xl shadow-red-900/20 disabled:opacity-50 active:scale-[0.98] transition-all">PROCESS TRANSACTION</button>
        </div>
      </div>

      {showReceipt && currentSale && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full relative">
            <button onClick={() => setShowReceipt(false)} className="absolute -top-3 -right-3 w-10 h-10 bg-[#800000] text-white rounded-full flex items-center justify-center font-bold no-print shadow-lg hover:scale-110 transition-transform">&times;</button>
            <Receipt sale={currentSale} />
            <div className="p-6 border-t no-print flex gap-3 bg-gray-50 rounded-b-3xl">
              <button onClick={() => window.print()} className="flex-1 py-4 bg-[#800000] text-white rounded-2xl font-black text-sm shadow-lg shadow-red-900/20 hover:bg-red-900 transition-all">🖨️ PRINT RECEIPT</button>
              <button onClick={() => setShowReceipt(false)} className="flex-1 py-4 bg-gray-200 text-gray-600 rounded-2xl font-black text-sm hover:bg-gray-300 transition-all">CLOSE</button>
            </div>
          </div>
        </div>
      )}

      {errorAlert && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 text-center border border-red-100">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">⚠️</div>
            <h3 className="text-xl font-black text-gray-800 mb-2">Action Blocked</h3>
            <p className="text-sm text-gray-500 mb-8 leading-relaxed">{errorAlert}</p>
            <button 
              onClick={() => setErrorAlert(null)}
              className="w-full py-4 bg-[#800000] text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-red-900 transition-all shadow-lg shadow-red-900/20"
            >
              I Understand
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default POS;
