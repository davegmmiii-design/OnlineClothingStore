import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Minus, ShoppingBag, Loader2 } from 'lucide-react';
import WebApp from '@twa-dev/sdk';

const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL;

const ProductCard = ({ product, addToCart }) => (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm hover:border-primary/50 transition-all duration-300 flex flex-col h-full">
        <div className="aspect-square w-full overflow-hidden bg-white/10 relative">
            <img
                src={product.Image_URL || 'https://via.placeholder.com/400x400?text=No+Image'}
                alt={product.Name}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
            />
            {parseInt(product.Stock) <= 0 && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <span className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Out of Stock</span>
                </div>
            )}
        </div>
        <div className="p-4 flex-1 flex flex-col">
            <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-lg line-clamp-1">{product.Name}</h3>
                <span className="text-primary font-bold text-lg">${product.Price}</span>
            </div>
            <p className="text-gray-400 text-xs mb-4 line-clamp-2">{product.Description}</p>
            <div className="mt-auto">
                <button
                    onClick={() => addToCart(product)}
                    disabled={parseInt(product.Stock) <= 0}
                    className="w-full bg-primary hover:bg-primary/80 disabled:bg-gray-700 text-white font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 group"
                >
                    <Plus size={18} className="group-hover:rotate-90 transition-transform" />
                    Add to Cart
                </button>
            </div>
        </div>
    </div>
);

const Shop = ({ addToCart }) => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [category, setCategory] = useState('All');

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const response = await axios.get(`${APPS_SCRIPT_URL}?action=getProducts`);
            setProducts(response.data);
        } catch (error) {
            console.error('Error fetching products:', error);
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

    return (
        <div className="space-y-6">
            {/* Category Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setCategory(cat)}
                        className={`px-5 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${category === cat
                                ? 'bg-primary text-white shadow-lg shadow-primary/30'
                                : 'bg-white/5 text-gray-400 border border-white/10'
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
