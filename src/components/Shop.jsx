import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Minus, ShoppingBag, Loader2 } from 'lucide-react';
import WebApp from '@twa-dev/sdk';

const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL;

const ProductCard = ({ product, addToCart }) => (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-300 flex flex-col h-full">
        <div className="aspect-square w-full overflow-hidden bg-gray-50 relative">
            <img
                src={product.Image_URL || 'https://via.placeholder.com/400x400?text=No+Image'}
                alt={product.Name}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
            />
            {parseInt(product.Stock) <= 0 && (
                <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                    <span className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Out of Stock</span>
                </div>
            )}
        </div>
        <div className="p-4 flex-1 flex flex-col">
            <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-sm text-gray-900 line-clamp-1">{product.Name}</h3>
                <span className="text-primary font-bold text-base">${product.Price}</span>
            </div>
            <p className="text-gray-500 text-[11px] mb-4 line-clamp-2">{product.Description}</p>
            <div className="mt-auto">
                <button
                    onClick={() => addToCart(product)}
                    disabled={parseInt(product.Stock) <= 0}
                    style={{ backgroundColor: '#ff4d8d', color: '#ffffff' }}
                    className="w-full hover:opacity-90 disabled:bg-gray-300 font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 group shadow-lg shadow-pink-200"
                >
                    <Plus size={16} className="group-hover:rotate-90 transition-transform" />
                    Add to Cart
                </button>
            </div>
        </div>
    </div>
);

const Shop = ({ addToCart }) => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [category, setCategory] = useState('All');

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const response = await axios.get(`${APPS_SCRIPT_URL}?action=getProducts`);
            if (Array.isArray(response.data)) {
                setProducts(response.data);
            } else {
                setError("Invalid data format received");
            }
        } catch (error) {
            console.error('Error fetching products:', error);
            setError("Could not connect to the boutique database");
        } finally {
            setLoading(false);
        }
    };

    const categories = ['All', ...new Set(products.map(p => p.Category))];
    const filteredProducts = category === 'All' ? products : products.filter(p => p.Category === category);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
                <Loader2 className="animate-spin text-primary mb-4" size={48} />
                <p className="text-gray-400 font-medium">Loading Boutique...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6">
                <div className="bg-red-50 p-4 rounded-full mb-4 text-red-500">
                    <ShoppingBag size={32} />
                </div>
                <h3 className="text-lg font-bold mb-2 text-gray-900">Boutique Offline</h3>
                <p className="text-gray-500 text-sm max-w-xs">{error}. Please check your connection or Apps Script settings.</p>
                <button
                    onClick={() => { setLoading(true); setError(null); fetchProducts(); }}
                    className="mt-6 px-6 py-2 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20"
                >
                    Try Again
                </button>
            </div>
        );
    }

    if (products.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6 text-gray-400">
                <ShoppingBag size={48} className="mb-4" />
                <h3 className="text-lg font-bold mb-2 text-gray-900">Boutique Empty</h3>
                <p className="text-sm">No products found in the database. Add some items to your "Products" sheet!</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Category Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setCategory(cat)}
                        className={`px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all ${category === cat
                            ? 'bg-primary text-white shadow-lg shadow-primary/30'
                            : 'bg-gray-100 text-gray-900 border border-gray-200'
                            }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-2 gap-4">
                {filteredProducts.map(product => (
                    <ProductCard key={product.ID} product={product} addToCart={addToCart} />
                ))}
            </div>
        </div>
    );
};

export default Shop;
