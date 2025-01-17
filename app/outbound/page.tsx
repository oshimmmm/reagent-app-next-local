// app/outbound/page.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
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
import { parseNoGCode } from "../libs/parseNoGCode";

export default function OutboundPage() {
  const [scanValue, setScanValue] = useState("");
  const [scanNoGValue, setScanNoGValue] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null); // エラーメッセージの状態

  // ① ref を準備
  const inputRef = useRef<HTMLInputElement>(null);

  // ② マウント時に input にフォーカス
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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

      const newStock = currentStock - 1;

      // 使用中ロットナンバーを更新
      await updateDoc(reagentRef, {
        stock: newStock,
        currentLot: lotNumber,
      });

      // 出庫履歴を保存
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
      setErrorMessage(error instanceof Error ? error.message : "不明なエラーが発生しました。");
    }
  };

  const handleNoGOutbound = async () => {
    if (!scanNoGValue) return;
    try {
      const { productNumber, lotNumber } = parseNoGCode(scanNoGValue);

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

      const newStock = currentStock - 1;

      // 使用中ロットナンバーを更新
      await updateDoc(reagentRef, {
        stock: newStock,
        currentLot: lotNumber,
      });

      // 出庫履歴を保存
      const historyRef = collection(db, "histories");
      await addDoc(historyRef, {
        productNumber,
        lotNumber,
        actionType: "outbound",
        date: serverTimestamp(),
      });

      alert(`出庫が完了しました: [${productNumber}] ロット: ${lotNumber}`);
      setScanNoGValue("");
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : "不明なエラーが発生しました。");
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">出庫</h1>
      <div className="flex space-x-2">
        {/* ③ ref を割り当てる */}
        <input
          ref={inputRef}
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

      <div className="flex space-x-2 my-10">
        {/* ③ ref を割り当てる */}
        <input
          type="text"
          className="border px-3 py-2"
          placeholder="Roche バーコードをスキャン"
          value={scanNoGValue}
          onChange={(e) => setScanNoGValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleNoGOutbound();
            }
          }}
        />
        <button
          onClick={handleOutbound}
          className="bg-blue-600 text-white px-4 py-2"
        >
          Roche試薬出庫
        </button>
      </div>

      {/* エラーメッセージのポップアップ */}
      {errorMessage && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-700 bg-opacity-50">
          <div className="bg-white p-6 rounded shadow-lg max-w-lg w-full text-center">
            <h2 className="text-xl font-bold text-red-600 mb-4">エラー</h2>
            <p className="mb-6">{errorMessage}</p>
            <button
              onClick={() => setErrorMessage(null)} // エラーポップアップを閉じる
              className="bg-red-600 text-white px-4 py-2"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
