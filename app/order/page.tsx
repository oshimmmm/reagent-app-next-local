"use client";

import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "../utils/firebase";

interface Reagent {
  productNumber: string;
  name: string;
  stock: number;
  maxExpiry: string;
  valueStock: number;
  orderStatus: string; // "発注" or ""
  orderDate?: string; // YYYY-MM-DD 形式
  orderQuantity?: number;
  logisticCode?: string;
  orderValue?: string; // 物流コード
}

// Firestore から取得する生データ
interface FirestoreReagent {
  name?: string;
  stock?: number;
  maxExpiry?: Timestamp;
  valueStock?: number;
  orderDate?: Timestamp | null; // 発注日
  orderQuantity?: number;
  logisticCode?: string;
  orderTriggerStock?: number;
  orderTriggerExpiry?: boolean;
  noOrderOnZeroStock?: boolean;
  orderTriggerValueStock?: number | null;
  orderValue?: string; // 物流コード
}

// Timestamp → "YYYY-MM-DD" へ変換
function formatTimestamp(ts?: Timestamp | null): string {
  if (!ts) return "";
  return ts.toDate().toISOString().split("T")[0];
}

// 発注条件を判定する関数
function checkOrderStatus(
  stock: number,
  maxExpiryStr: string,
  orderTriggerStock: number,
  orderTriggerExpiry: boolean,
  noOrderOnZeroStock: boolean,
  valueStock: number,
  orderTriggerValueStock: number | null
): boolean {
  let needOrder = false;

  // 1) 在庫が0でも発注しない場合のロジック
  if (noOrderOnZeroStock) {
    if (
      orderTriggerValueStock !== null &&
      valueStock <= orderTriggerValueStock
    ) {
      needOrder = true;
    }
  } else {
    // 通常の在庫発注条件
    if (stock <= orderTriggerStock) {
      needOrder = true;
    }
  }

  // 2) 最長使用期限による発注条件
  if (orderTriggerExpiry && maxExpiryStr) {
    const expiryDate = new Date(maxExpiryStr);
    const now = new Date();
    const oneMonthLater = new Date();
    oneMonthLater.setMonth(now.getMonth() + 1);
    if (expiryDate < oneMonthLater) {
      needOrder = true;
    }
  }

  return needOrder;
}

export default function OrderPage() {
  const [reagents, setReagents] = useState<Reagent[]>([]);

  useEffect(() => {
    const fetchReagents = async () => {
      const snapshot = await getDocs(collection(db, "reagents"));
      const list: Reagent[] = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as FirestoreReagent;

        // maxExpiry を文字列に変換
        const maxExpiryStr = data.maxExpiry
          ? formatTimestamp(data.maxExpiry)
          : "";

        // 発注条件を判定
        const isOrder = checkOrderStatus(
          data.stock ?? 0,
          maxExpiryStr,
          data.orderTriggerStock ?? 0,
          data.orderTriggerExpiry ?? false,
          data.noOrderOnZeroStock ?? false,
          data.valueStock ?? 0,
          data.orderTriggerValueStock ?? null
          

        );

        if (isOrder) {
          list.push({
            productNumber: docSnap.id,
            name: data.name ?? "",
            stock: data.stock ?? 0,
            maxExpiry: maxExpiryStr,
            valueStock: data.valueStock ?? 0,
            orderStatus: "発注",
            orderDate: data.orderDate
              ? formatTimestamp(data.orderDate)
              : "",
            orderQuantity: data.orderQuantity ?? 1,
            orderValue: data.orderValue ?? "",
          });
        }
      });

      setReagents(list);
    };

    fetchReagents();
  }, []);

  const handleCheck = async (r: Reagent, checked: boolean) => {
    const reagentRef = doc(db, "reagents", r.productNumber);
    const updatedOrderDate = checked ? serverTimestamp() : null;

    await updateDoc(reagentRef, {
      orderDate: updatedOrderDate,
    });

    setReagents((prev) =>
      prev.map((item) =>
        item.productNumber === r.productNumber
          ? {
              ...item,
              orderDate: checked
                ? new Date().toISOString().split("T")[0]
                : "",
            }
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
            <th className="border p-2">月末残量</th>
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
              <td className="border p-2">{r.valueStock !== undefined && r.valueStock !== 0 ? r.valueStock : ""}</td>
              <td className="border p-2">{r.orderStatus}</td>
              <td className="border p-2">{r.orderQuantity}</td>
              <td className="border p-2">{r.orderValue}</td>
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
        ※物流システムで入力したら、”発注する”のところにチェックを付けてください。
        入庫すると自動でこのリストから消えて、ホーム画面の”発注”と”発注日”も自動で消えます。
      </p>
    </div>
  );
}
