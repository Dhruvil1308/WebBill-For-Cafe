"use client";

import { useCartStore } from "@/store/cartStore";
import { format } from "date-fns";
import React, { forwardRef, useState, useEffect } from "react";

interface ThermalReceiptProps {
  bill?: any;
  cafe?: any;
}

export const ThermalReceipt = forwardRef<HTMLDivElement, ThermalReceiptProps>(
  ({ bill, cafe }, ref) => {
    const cart = useCartStore();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
      setMounted(true);
    }, []);

    if (!mounted) return null;

    // Map properties from live bill payload or fallback to cart store
    const orderType = bill ? bill.orderType : cart.orderType;
    const paymentMethod = bill ? bill.paymentMethod : cart.paymentMethod;
    const customerName = bill ? (bill.customer?.name || bill.customerName) : cart.customerName;
    const billNumber = bill ? bill.billNumber : "#1004";
    const items = bill ? bill.items : cart.items;
    
    const subtotal = bill ? Number(bill.subtotal) : cart.getSubtotal();
    const gstAmount = bill ? Number(bill.gstAmount) : cart.getGST();
    const total = bill ? Number(bill.total) : cart.getTotal();
    const createdAt = bill ? new Date(bill.createdAt) : new Date();

    // Map branding elements from live cafe details or fallback to premium mock values
    const cafeName = cafe ? cafe.name : "WebBill Cafe";
    const cafeAddress = cafe ? cafe.address : "123 Startup Street";
    const cafePhone = cafe ? cafe.phone : "Bangalore, KA 560001";
    const cafeGst = cafe ? (cafe.gstNumber ? `GSTIN: ${cafe.gstNumber}` : "") : "GSTIN: 29AXDPA9012K1Z9";
    const cafeLogo = cafe ? cafe.logoUrl : null;

    return (
      <div
        ref={ref}
        className="bg-white p-4 font-mono text-[12px] leading-tight w-[80mm] mx-auto text-black"
      >
        {/* Header */}
        <div className="text-center mb-4">
          {cafeLogo && (
            <div className="flex justify-center mb-2">
              <img src={cafeLogo} alt="Logo" className="max-w-[120px] max-h-16 object-contain grayscale" />
            </div>
          )}
          <h1 className="font-bold text-[16px] mb-1">{cafeName}</h1>
          {cafeAddress && <p>{cafeAddress}</p>}
          {cafePhone && <p>Ph: {cafePhone}</p>}
          {cafeGst && <p>{cafeGst}</p>}
          <p className="mt-2 border-b border-black border-dashed pb-2 font-bold">
            {orderType === "DINE_IN" ? "DINE IN" : "TAKEAWAY"}
          </p>
        </div>

        {/* Meta Info */}
        <div className="flex justify-between mb-4">
          <div>
            <p>Date: {format(createdAt, "dd/MM/yyyy")}</p>
            <p>Time: {format(createdAt, "HH:mm")}</p>
            {customerName && <p>Cust: {customerName}</p>}
          </div>
          <div className="text-right">
            <p className="font-bold">Bill: {billNumber}</p>
          </div>
        </div>

        {/* Items Header */}
        <div className="flex justify-between font-bold border-y border-black border-dashed py-1 mb-2">
          <span className="w-1/2">Item</span>
          <span className="w-1/4 text-right">Qty/Price</span>
          <span className="w-1/4 text-right">Amt</span>
        </div>

        {/* Items List */}
        <div className="mb-4">
          {items.map((item: any) => {
            const name = item.menuItem?.name || item.name || "Item";
            const qty = item.quantity;
            const price = Number(item.price);
            const amt = Number(item.subtotal || (qty * price));

            return (
              <div key={item.id || item.menuItemId} className="flex justify-between mb-1">
                <span className="w-1/2 truncate pr-2">{name}</span>
                <span className="w-1/4 text-right">
                  {qty} x {price.toFixed(2)}
                </span>
                <span className="w-1/4 text-right font-bold">
                  {amt.toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Totals */}
        <div className="border-t border-black border-dashed pt-2 mb-4 space-y-1">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>CGST (2.5%)</span>
            <span>{(gstAmount / 2).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>SGST (2.5%)</span>
            <span>{(gstAmount / 2).toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-[16px] border-t border-black border-dashed mt-1 pt-1">
            <span>Total ₹</span>
            <span>{total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-[11px] mt-1">
            <span>Payment Mode:</span>
            <span className="font-bold">{paymentMethod}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 border-t border-black border-dashed pt-4">
          <p className="font-bold">Thank You & Visit Again!</p>
          <p className="mt-1 text-[10px]">Powered by WebBill</p>
        </div>
      </div>
    );
  }
);

ThermalReceipt.displayName = "ThermalReceipt";
