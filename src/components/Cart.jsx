import React from 'react';
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';

const Cart = ({ cart, updateQuantity, removeFromCart, totalPrice }) => {
    if (cart.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                <div className="bg-white/5 p-8 rounded-full">
                    <ShoppingBag size={64} className="text-gray-600" />
                </div>
                <h2 className="text-xl font-bold">Your cart is empty</h2>
                <p className="text-gray-500 max-w-xs">Look around the boutique and add some stylish items to your cart!</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Your Selection</h2>
                <span className="text-gray-400 text-sm">{cart.length} items</span>
            </div>

            <div className="space-y-4">
                {cart.map(item => (
                    <div key={item.ID} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex gap-4">
                        <div className="h-20 w-20 rounded-xl overflow-hidden bg-white/10">
                            <img src={item.Image_URL} alt={item.Name} className="w-full h-full object-cover" />
                        </div>

                        <div className="flex-1 flex flex-col justify-between">
                            <div className="flex justify-between items-start">
                                <h3 className="font-semibold text-sm line-clamp-1">{item.Name}</h3>
                                <button
                                    onClick={() => removeFromCart(item.ID)}
                                    className="text-gray-500 hover:text-red-500"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            <div className="flex justify-between items-end">
                                <span className="text-primary font-bold">${item.Price}</span>
                                <div className="flex items-center gap-3 bg-white/5 rounded-lg border border-white/10 p-1">
                                    <button
                                        onClick={() => updateQuantity(item.ID, -1)}
                                        className="p-1 hover:bg-white/10 rounded-md transition-colors"
                                    >
                                        <Minus size={14} />
                                    </button>
                                    <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                                    <button
                                        onClick={() => updateQuantity(item.ID, 1)}
                                        className="p-1 hover:bg-white/10 rounded-md transition-colors"
                                    >
                                        <Plus size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mt-8 space-y-3">
                <div className="flex justify-between text-gray-400">
                    <span>Subtotal</span>
                    <span>${totalPrice}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                    <span>Delivery</span>
                    <span className="text-green-500 font-medium">Calculated after approval</span>
                </div>
                <div className="pt-3 border-t border-white/10 flex justify-between items-center">
                    <span className="text-lg font-bold">Total Est.</span>
                    <span className="text-2xl font-bold text-primary">${totalPrice}</span>
                </div>
            </div>

            <p className="text-[10px] text-gray-500 text-center px-4">
                By submitting this order, you agree to our direct boutique order process. We will send you an invoice for payment once approved.
            </p>
        </div>
    );
};

export default Cart;
