import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Package, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import WebApp from '@twa-dev/sdk';

const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL;

const OrderItem = ({ order }) => {
    const getStatusColor = (status) => {
        switch (status) {
            case 'Approved': return 'text-green-600 bg-green-50 border-green-100';
            case 'Pending': return 'text-amber-600 bg-amber-50 border-amber-100';
            case 'Rejected': return 'text-red-600 bg-red-50 border-red-100';
            default: return 'text-gray-600 bg-gray-50 border-gray-100';
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
        <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-4 shadow-sm">
            <div className="flex justify-between items-start">
                <div>
                    <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Order ID</span>
                    <h3 className="font-mono text-sm text-gray-700 font-bold">{order.Order_ID}</h3>
                </div>
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-black uppercase tracking-tight ${getStatusColor(order.Status)}`}>
                    {getStatusIcon(order.Status)}
                    {order.Status}
                </div>
            </div>

            <div className="space-y-2">
                {items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-xs font-medium">
                        <span className="text-gray-600">{item.name} <span className="text-gray-400">×{item.quantity}</span></span>
                        <span className="text-gray-900">${item.price * item.quantity}</span>
                    </div>
                ))}
            </div>

            <div className="pt-3 border-t border-gray-50 flex justify-between items-center">
                <span className="text-gray-400 text-[10px] font-bold uppercase">{new Date(order.Timestamp).toLocaleDateString()}</span>
                <span className="font-black text-xl text-primary">${order.Total_Price}</span>
            </div>
        </div>
    );
};

const Orders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const userId = WebApp.initDataUnsafe?.user?.id || '361418833';

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
                <p className="text-gray-400 font-medium italic">Fetching your history...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold font-outfit uppercase tracking-wider text-gray-900">Purchase History</h2>
            {orders.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-gray-200 shadow-inner">
                    <p className="text-gray-400 font-medium">No orders found yet.</p>
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
