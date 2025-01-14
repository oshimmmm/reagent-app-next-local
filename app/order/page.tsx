// app/order/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../utils/firebase";

interface Reagent {
  productNumber: string;
  name: string;
  stock: number;
  maxExpiry: string;
  orderStatus: string; // "発注" or ""
  orderDate?: string;
  orderQuantity?: number;
  logisticCode?: string;
}

export default function OrderPage() {
  const [reagents, setReagents] = useState<Reagent[]>([]);

  useEffect(() => {
    const fetchReagents = async () => {
      const snapshot = await getDocs(collection(db, "reagents"));
      const list: Reagent[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        console.log("Firestore data:", data); // Firestore データの確認

        // "発注"の表示ロジックはHomeのチェックと同様or簡略化
        const isOrder =
          (typeof data.orderTriggerStock === "number" && data.stock <= data.orderTriggerStock) ||
          (data.orderTriggerExpiry && checkExpiry(data.maxExpiry));
        if (isOrder) {
          const reagent = {
            productNumber: docSnap.id,
            name: data.name || "",
            stock: data.stock || 0,
            maxExpiry: data.maxExpiry
              ? formatTimestamp(data.maxExpiry) // maxExpiry を文字列に変換
              : "",
            orderStatus: isOrder ? "発注" : "",
            orderDate: data.orderDate
              ? formatTimestamp(data.orderDate) // orderDate を文字列に変換
              : "",
            orderQuantity: data.orderQuantity || 1,
            logisticCode: data.logisticCode || "",
          };
          console.log("Parsed reagent:", reagent); // パース後のデータ確認
      list.push(reagent);
        }
      });
      setReagents(list);
    };

    const formatTimestamp = (timestamp: any): string => {
        if (!timestamp || !timestamp.toDate) return "";
        const date = timestamp.toDate(); // Timestamp を Date に変換
        return date.toISOString().split("T")[0]; // "YYYY-MM-DD" 形式で返す
      };
    fetchReagents();
  }, []);

  const checkExpiry = (expiry: string) => {
    const now = new Date();
    const oneMonthLater = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
    const expiryDate = new Date(expiry);
    return expiryDate < oneMonthLater;
  };

  // "発注する"にチェックを付けたらorderDateを当日に設定する
  const handleCheck = async (r: Reagent, checked: boolean) => {
    const reagentRef = doc(db, "reagents", r.productNumber);
    const updatedOrderDate = checked ? serverTimestamp() : null; // Timestamp 型で保存
    await updateDoc(reagentRef, {
      orderDate: updatedOrderDate,
    });

    console.log(`Updated Firestore: ${r.productNumber}, orderDate: ${updatedOrderDate}`);
    // 画面更新
    setReagents((prev) =>
      prev.map((item) =>
        item.productNumber === r.productNumber
        ? { ...item, orderDate: checked ? new Date().toISOString().split("T")[0] : "" }
        : item
      )
    );
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">発注</h1>
      <table className="w-full border">
        <thead>
          <tr className="bg-gray-200">
            <th className="border p-2">試薬名</th>
            <th className="border p-2">在庫数</th>
            <th className="border p-2">最長使用期限</th>
            <th className="border p-2">発注の可否</th>
            <th className="border p-2">発注数</th>
            <th className="border p-2">物流コード</th>
            <th className="border p-2">発注日</th>
            <th className="border p-2">発注する</th>
          </tr>
        </thead>
        <tbody>
          {reagents.map((r) => (
            <tr key={r.productNumber}>
              <td className="border p-2">{r.name}</td>
              <td className="border p-2">{r.stock}</td>
              <td className="border p-2">{r.maxExpiry}</td>
              <td className="border p-2">{r.orderStatus}</td>
              <td className="border p-2">{r.orderQuantity}</td>
              <td className="border p-2">{r.logisticCode}</td>
              <td className="border p-2">{r.orderDate || ""}</td>
              <td className="border p-2 text-center">
                <input
                  type="checkbox"
                  checked={Boolean(r.orderDate)}
                  onChange={(e) => handleCheck(r, e.target.checked)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-4 text-sm text-gray-700">
        ※「発注する」のチェックを付けたタイミングで発注日が設定されます。
        入庫が完了すると自動でチェックが外れ、発注日がクリアされる実装が必要です。
      </p>
    </div>
  );
}
