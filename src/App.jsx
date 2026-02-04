import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import WebApp from '@twa-dev/sdk'
import { ShoppingBag, History, Store } from 'lucide-react'
import Shop from './components/Shop'
import Cart from './components/Cart'
import Orders from './components/Orders'

const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL;

function App() {
    const [activeTab, setActiveTab] = useState('shop');
    const [cart, setCart] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const totalPrice = cart.reduce((acc, item) => acc + (item.Price * item.quantity), 0);

    // Sync Telegram MainButton
    useEffect(() => {
        if (activeTab === 'cart' && cart.length > 0) {
            WebApp.MainButton.setText(`SUBMIT ORDER ($${totalPrice})`);
            WebApp.MainButton.show();
            if (isSubmitting) WebApp.MainButton.showProgress(); else WebApp.MainButton.hideProgress();
        } else {
            WebApp.MainButton.hide();
        }
    }, [activeTab, cart, totalPrice, isSubmitting]);

    // Handle Order Submission
    const handleSubmitOrder = useCallback(async () => {
        if (isSubmitting) return;

        setIsSubmitting(true);
        const userId = WebApp.initDataUnsafe?.user?.id || '361418833';
        const customerName = WebApp.initDataUnsafe?.user?.first_name || 'Anonymous';

        try {
            const response = await axios.post(APPS_SCRIPT_URL, {
                action: 'createOrder',
                userId: userId,
                customerName: customerName,
                items: cart.map(i => ({ id: i.ID, name: i.Name, quantity: i.quantity, price: i.Price })),
                totalPrice: totalPrice
            });

            if (response.data.success) {
                WebApp.showAlert(`Order Submitted! ID: ${response.data.orderId}\n\nPlease wait for admin approval and your invoice.`);
                setCart([]);
                setActiveTab('orders');
            } else {
                WebApp.showAlert('Submission failed. Please try again.');
            }
        } catch (error) {
            console.error('Order error:', error);
            WebApp.showAlert('Connection error. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    }, [cart, totalPrice, isSubmitting]);

    useEffect(() => {
        WebApp.ready();
        WebApp.expand();
        WebApp.MainButton.onClick(handleSubmitOrder);
        return () => WebApp.MainButton.offClick(handleSubmitOrder);
    }, [handleSubmitOrder]);

    const addToCart = (product) => {
        setCart(prev => {
            const existing = prev.find(item => item.ID === product.ID);
            if (existing) {
                return prev.map(item => item.ID === product.ID ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...prev, { ...product, quantity: 1 }];
        });
        WebApp.HapticFeedback.impactOccurred('light');
    };

    const updateQuantity = (id, delta) => {
        setCart(prev => prev.map(item => {
            if (item.ID === id) {
                const newQty = Math.max(1, item.quantity + delta);
                return { ...item, quantity: newQty };
            }
            return item;
        }));
    };

    const removeFromCart = (id) => {
        setCart(prev => prev.filter(item => item.ID !== id));
        WebApp.HapticFeedback.notificationOccurred('warning');
    };

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 pb-24">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100 p-4 flex justify-between items-center">
                <div>
                    <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-pink-500 bg-clip-text text-transparent">
                        OnlineClothingStore
                    </h1>
                    <p className="text-[10px] text-gray-400 font-medium tracking-widest uppercase">Direct Boutique</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setActiveTab('cart')}
                        className="relative bg-gray-100 p-2.5 rounded-xl border border-gray-200 hover:bg-primary/10 transition-all text-gray-700"
                    >
                        <ShoppingBag size={20} />
                        {cart.length > 0 && (
                            <span className="absolute -top-1 -right-1 bg-primary text-[10px] font-bold h-5 w-5 flex items-center justify-center rounded-full border-2 border-white text-white">
                                {cart.length}
                            </span>
                        )}
                    </button>
                </div>
            </header>

            {/* Content */}
            <main className="p-4 max-w-lg mx-auto">
                {activeTab === 'shop' && <Shop addToCart={addToCart} />}
                {activeTab === 'cart' && (
                    <Cart
                        cart={cart}
                        updateQuantity={updateQuantity}
                        removeFromCart={removeFromCart}
                        totalPrice={totalPrice}
                    />
                )}
                {activeTab === 'orders' && <Orders />}
            </main>

            {/* Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-t border-gray-100 px-6 py-3 flex justify-around items-center shadow-lg shadow-black/5">
                <button
                    onClick={() => setActiveTab('shop')}
                    className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'shop' ? 'text-primary scale-110' : 'text-gray-400'}`}
                >
                    <Store size={22} />
                    <span className="text-[10px] font-bold uppercase tracking-tighter">Boutique</span>
                </button>
                <button
                    onClick={() => setActiveTab('cart')}
                    className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'cart' ? 'text-primary scale-110' : 'text-gray-400'}`}
                >
                    <ShoppingBag size={22} />
                    <span className="text-[10px] font-bold uppercase tracking-tighter">Cart</span>
                </button>
                <button
                    onClick={() => setActiveTab('orders')}
                    className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'orders' ? 'text-primary scale-110' : 'text-gray-400'}`}
                >
                    <History size={22} />
                    <span className="text-[10px] font-bold uppercase tracking-tighter">My Orders</span>
                </button>
            </nav>
        </div>
    )
}

export default App
