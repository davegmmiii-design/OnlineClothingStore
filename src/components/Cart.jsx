import React from 'react';
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';

const Cart = ({ cart, updateQuantity, removeFromCart, totalPrice }) => {
    if (cart.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                <div className="bg-gray-100 p-8 rounded-full">
                    <ShoppingBag size={64} className="text-gray-300" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Your cart is empty</h2>
                <p className="text-gray-500 max-w-xs">Look around the boutique and add some stylish items to your cart!</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center px-1">
                <h2 className="text-xl font-bold text-gray-900 font-outfit uppercase tracking-wider">Your Selection</h2>
                <span className="text-gray-400 text-sm font-medium">{cart.length} items</span>
            </div>

            <div className="space-y-3">
                {cart.map(item => (
                    <div key={item.ID} className="bg-white border border-gray-100 rounded-2xl p-3 flex gap-4 shadow-sm">
                        <div className="h-20 w-20 rounded-xl overflow-hidden bg-gray-50 shrink-0">
                            <img src={item.Image_URL} alt={item.Name} className="w-full h-full object-cover" />
                        </div>

                        <div className="flex-1 flex flex-col justify-between py-0.5">
                            <div className="flex justify-between items-start">
                                <h3 className="font-bold text-gray-800 text-sm line-clamp-1">{item.Name}</h3>
                                <button
                                    onClick={() => removeFromCart(item.ID)}
                                    className="text-gray-400 hover:text-red-500 transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            <div className="flex justify-between items-end">
                                <span className="text-primary font-black text-base">${item.Price}</span>
                                <div className="flex items-center gap-3 bg-gray-50 rounded-lg border border-gray-100 p-1">
                                    <button
                                        onClick={() => updateQuantity(item.ID, -1)}
                                        className="p-1 hover:bg-gray-200 rounded-md transition-colors text-gray-500"
                                    >
                                        <Minus size={14} />
                                    </button>
                                    <span className="text-sm font-bold text-gray-900 w-4 text-center">{item.quantity}</span>
                                    <button
                                        onClick={() => updateQuantity(item.ID, 1)}
                                        className="p-1 hover:bg-gray-200 rounded-md transition-colors text-gray-500"
                                    >
                                        <Plus size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-white border border-gray-100 rounded-3xl p-6 mt-8 space-y-4 shadow-xl shadow-black/[0.03]">
                <div className="space-y-2">
                    <div className="flex justify-between text-gray-400 text-sm font-medium">
                        <span>Subtotal</span>
                        <span className="text-gray-900 font-bold">${totalPrice}</span>
                    </div>
                    <div className="flex justify-between text-gray-400 text-sm font-medium">
                        <span>Boutique Delivery</span>
                        <span className="text-green-600 font-bold">Free</span>
                    </div>
                </div>
                <div className="pt-4 border-t border-gray-50 flex justify-between items-center">
                    <span className="text-base font-bold text-gray-900">Total Est.</span>
                    <span className="text-2xl font-black text-primary">${totalPrice}</span>
                </div>
            </div>

            <p className="text-[10px] text-gray-400 text-center px-8 leading-relaxed">
                By submitting this order, you agree to our direct boutique process. We will send you an invoice for payment once approved.
            </p>
        </div>
    );
};

export default Cart;
