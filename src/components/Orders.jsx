import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Package, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import WebApp from '@twa-dev/sdk';

const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL;

const OrderItem = ({ order }) => {
    const getStatusColor = (status) => {
        switch (status) {
            case 'Approved': return 'text-green-500 bg-green-500/10 border-green-500/20';
            case 'Pending': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
            case 'Rejected': return 'text-red-500 bg-red-500/10 border-red-500/20';
            default: return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'Approved': return <CheckCircle size={14} />;
            case 'Pending': return <Clock size={14} />;
            case 'Rejected': return <XCircle size={14} />;
            default: return <Package size={14} />;
        }
    };

    const items = JSON.parse(order.Items || '[]');

    return (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-4">
            <div className="flex justify-between items-start">
                <div>
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Order ID</span>
                    <h3 className="font-mono text-sm">{order.Order_ID}</h3>
                </div>
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold ${getStatusColor(order.Status)}`}>
                    {getStatusIcon(order.Status)}
                    {order.Status}
                </div>
            </div>

            <div className="space-y-2">
                {items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-xs text-gray-400">
                        <span>{item.name} x{item.quantity}</span>
                        <span>${item.Price * item.quantity}</span>
                    </div>
                ))}
            </div>

            <div className="pt-3 border-t border-white/10 flex justify-between items-center">
                <span className="text-gray-500 text-xs">{new Date(order.Timestamp).toLocaleDateString()}</span>
                <span className="font-bold text-lg text-primary">${order.Total_Price}</span>
            </div>
        </div>
    );
};

const Orders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const userId = WebApp.initDataUnsafe?.user?.id || '361418833'; // Default for testing

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            const response = await axios.get(`${APPS_SCRIPT_URL}?action=getMyOrders&userId=${userId}`);
            setOrders(response.data);
        } catch (error) {
            console.error('Error fetching orders:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="animate-spin text-primary mb-4" size={32} />
                <p className="text-gray-500">Fetching your orders...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold">Purchase History</h2>
            {orders.length === 0 ? (
                <div className="bg-white/5 rounded-2xl p-10 text-center border border-dashed border-white/10">
                    <p className="text-gray-500">No orders found yet.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {orders.map(order => (
                        <OrderItem key={order.Order_ID} order={order} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default Orders;
