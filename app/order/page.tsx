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
  orderStatus: string;     // "発注" or ""
  orderDate?: string;      // YYYY-MM-DD 形式
  orderQuantity?: number;
  logisticCode?: string;
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
}

// Timestamp → "YYYY-MM-DD" へ変換
function formatTimestamp(ts?: Timestamp | null): string {
  if (!ts) return "";
  return ts.toDate().toISOString().split("T")[0];
}

export default function OrderPage() {
  const [reagents, setReagents] = useState<Reagent[]>([]);

  useEffect(() => {
    const fetchReagents = async () => {
      const snapshot = await getDocs(collection(db, "reagents"));
      const list: Reagent[] = [];

      snapshot.forEach((docSnap) => {
        // Firestore の生データを型付け
        const data = docSnap.data() as FirestoreReagent;

        // isOrder を判定 (Home ページと類似ロジック)
        const isOrder =
          (typeof data.orderTriggerStock === "number" &&
            (data.stock ?? 0) <= data.orderTriggerStock) ||
          (data.orderTriggerExpiry && checkExpiry(data.maxExpiry));

        if (isOrder) {
          const reagent: Reagent = {
            productNumber: docSnap.id,
            name: data.name ?? "",
            stock: data.stock ?? 0,
            maxExpiry: data.maxExpiry
              ? formatTimestamp(data.maxExpiry)
              : "",
            valueStock: data.valueStock ?? 0,
            orderStatus: "発注",
            orderDate: data.orderDate
              ? formatTimestamp(data.orderDate)
              : "",
            orderQuantity: data.orderQuantity ?? 1,
            logisticCode: data.logisticCode ?? "",
          };
          list.push(reagent);
        }
      });

      setReagents(list);
    };

    fetchReagents();
  }, []);

  // maxExpiry の発注基準チェック
  // 現在日時 +1ヶ月後より期限が早いなら発注対象
  const checkExpiry = (ts?: Timestamp) => {
    if (!ts) return false;
    const now = new Date();
    const oneMonthLater = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      now.getDate()
    );
    const expiryDate = ts.toDate();
    return expiryDate < oneMonthLater;
  };

  // "発注する" のチェックボックスがクリックされたとき
  const handleCheck = async (r: Reagent, checked: boolean) => {
    const reagentRef = doc(db, "reagents", r.productNumber);
    const updatedOrderDate = checked ? serverTimestamp() : null; // Firestore 上では Timestamp or null

    await updateDoc(reagentRef, {
      orderDate: updatedOrderDate,
    });

    // ローカル state 更新 (画面に表示するため)
    setReagents((prev) =>
      prev.map((item) =>
        item.productNumber === r.productNumber
          ? {
              ...item,
              // "今日の日付" または 空文字 をセット
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
              <td className="p-2 border">{r.valueStock !== undefined && r.valueStock !== 0 ? r.valueStock : ""}</td>
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
