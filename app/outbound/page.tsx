// app/outbound/page.tsx
"use client";

import React, { useState } from "react";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { parseCode } from "../libs/parseCode";
import { db } from "../utils/firebase";

export default function OutboundPage() {
  const [scanValue, setScanValue] = useState("");

  const handleOutbound = async () => {
    if (!scanValue) return;
    try {
      const { productNumber, lotNumber } = parseCode(scanValue);

      const reagentRef = doc(db, "reagents", productNumber);
      const reagentSnap = await getDoc(reagentRef);

      if (!reagentSnap.exists()) {
        throw new Error("該当する試薬が存在しません。");
      }

      const reagentData = reagentSnap.data();
      const currentStock = reagentData.stock || 0;
      if (currentStock <= 0) {
        throw new Error("在庫がありません。");
      }

      // 在庫数を -1
      const newStock = currentStock - 1;

      // 出庫したロットナンバーを「使用中ロットナンバー」として設定
      // (要件が「ホーム画面に表示される使用中ロットナンバーを更新する」という意味の場合)
      await updateDoc(reagentRef, {
        stock: newStock,
        currentLot: lotNumber,
      });

      // historiesコレクションに出庫履歴を保存
      const historyRef = collection(db, "histories");
      await addDoc(historyRef, {
        productNumber,
        lotNumber,
        actionType: "outbound",
        date: serverTimestamp(),
      });

      alert(`出庫が完了しました: [${productNumber}] ロット: ${lotNumber}`);
      setScanValue("");
    } catch (error) {
      console.error(error);
      alert(error);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">出庫</h1>
      <div className="flex space-x-2">
        <input
          type="text"
          className="border px-3 py-2"
          placeholder="バーコードをスキャン"
          value={scanValue}
          onChange={(e) => setScanValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleOutbound();
            }
          }}
        />
        <button
          onClick={handleOutbound}
          className="bg-blue-600 text-white px-4 py-2"
        >
          出庫
        </button>
      </div>
    </div>
  );
}
