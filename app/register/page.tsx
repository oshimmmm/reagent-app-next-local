// app/register/page.tsx
"use client";

import React, { useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { parseCode } from "../libs/parseCode";
import { parseNoGCode } from "../libs/parseNoGCode";
import { db } from "../utils/firebase";

export default function RegisterPage() {
  const [scanValue, setScanValue] = useState("");
  const [nonGs1ScanValue, setNonGs1ScanValue] = useState(""); // 非GS1用バーコード値
  const [reagentName, setReagentName] = useState(""); // 試薬名用の状態
  const [orderTriggerStock, setOrderTriggerStock] = useState<number>(1);
  const [orderTriggerExpiry, setOrderTriggerExpiry] = useState<boolean>(false);
  const [noOrderOnZeroStock, setNoOrderOnZeroStock] = useState<boolean>(false); // 在庫0でも発注しない
  const [orderTriggerValueStock, setOrderTriggerValueStock] = useState<number>(0); // 月末残量発注
  const [valueStock, setValueStock] = useState<number>(0);

  const handleRegister = async () => {
    try {
      if (!reagentName.trim()) {
        throw new Error("試薬名を入力してください。");
      }

      const { productNumber } = parseCode(scanValue);

      // 既に存在するか確認
      const reagentRef = doc(db, "reagents", productNumber);
      const snap = await getDoc(reagentRef);
      if (snap.exists()) {
        throw new Error("既に登録済みの試薬です。");
      }

      // 新規登録
      await setDoc(reagentRef, {
        name: reagentName.trim(),
        stock: 0,
        orderTriggerStock,
        orderTriggerExpiry,
        noOrderOnZeroStock,
        orderTriggerValueStock: noOrderOnZeroStock ? orderTriggerValueStock : null,
        valueStock, // 何μLの規格か
      });

      alert(`登録しました: [${productNumber}] 試薬名: ${reagentName}`);
      setScanValue("");
      setReagentName(""); // 入力フィールドをリセット
    } catch (error) {
      console.error(error);
      alert(error);
    }
  };

  const handleNonGs1Register = async () => {
    try {
      if (!reagentName.trim()) {
        throw new Error("試薬名を入力してください。");
      }

      const { productNumber } = parseNoGCode(nonGs1ScanValue);

      // 既に存在するか確認
      const reagentRef = doc(db, "reagents", productNumber);
      const snap = await getDoc(reagentRef);
      if (snap.exists()) {
        throw new Error("既に登録済みの試薬です。");
      }

      // 新規登録
      await setDoc(reagentRef, {
        name: reagentName.trim(),
        stock: 0,
        orderTriggerStock,
        orderTriggerExpiry,
        noOrderOnZeroStock,
        orderTriggerValueStock: noOrderOnZeroStock ? orderTriggerValueStock : null,
        valueStock, // 何μLの規格か
      });

      alert(`登録しました: [${productNumber}] 試薬名: ${reagentName}`);
      setNonGs1ScanValue("");
      setReagentName(""); // 入力フィールドをリセット
    } catch (error) {
      console.error(error);
      alert(error);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">試薬登録</h1>
      {/* 試薬名の入力フィールド */}
      <div className="mb-4">
        <label className="block mb-1 font-semibold">試薬名:</label>
        <input
          className="border px-3 py-2 w-full"
          placeholder="試薬名を入力"
          value={reagentName}
          onChange={(e) => setReagentName(e.target.value)}
        />
      </div>

      <div className="flex items-center mb-4">
        <input
          className="border px-3 py-2 mr-2"
          placeholder="GS1バーコードをスキャン"
          value={scanValue}
          onChange={(e) => setScanValue(e.target.value)}
        />
        <button onClick={handleRegister} className="bg-blue-600 text-white px-4 py-2">
          GS1登録
        </button>
      </div>

      <div className="flex items-center mb-4">
        <input
          className="border px-3 py-2 mr-2"
          placeholder="【ロシュ】 バーコードをスキャン"
          value={nonGs1ScanValue}
          onChange={(e) => setNonGs1ScanValue(e.target.value)}
        />
        <button onClick={handleNonGs1Register} className="bg-green-600 text-white px-4 py-2">
          ロシュ試薬登録
        </button>
      </div>

      <div className="mb-4">
        <label className="block mb-1 font-semibold">在庫数がいくつ以下になったら発注するか:</label>
        <input
          type="number"
          value={orderTriggerStock}
          onChange={(e) => setOrderTriggerStock(Number(e.target.value))}
          className="border px-3 py-2"
        />
      </div>
      <div className="mb-4">
        <label className="inline-flex items-center space-x-2">
          <input
            type="checkbox"
            checked={noOrderOnZeroStock}
            onChange={(e) => setNoOrderOnZeroStock(e.target.checked)}
          />
          <span>在庫が0でも発注しない</span>
        </label>
      </div>

      {noOrderOnZeroStock && (
        <div className="mb-4">
          <label className="block mb-1 font-semibold">月末残量がいくつ以下になったら発注するか:</label>
          <input
            type="number"
            value={orderTriggerValueStock}
            onChange={(e) => setOrderTriggerValueStock(Number(e.target.value))}
            className="border px-3 py-2"
          />

          <label className="block mb-1 font-semibold">何μL規格か？:</label>
          <input
            type="number"
            value={valueStock}
            onChange={(e) => setValueStock(Number(e.target.value))}
            className="border px-3 py-2"
          />
        </div>
        
      )}
      <div>
        <label className="inline-flex items-center space-x-2 mb-4">
          <input
            type="checkbox"
            checked={orderTriggerExpiry}
            onChange={(e) => setOrderTriggerExpiry(e.target.checked)}
          />
          <span>最長使用期限が1ヶ月未満となったら必ず発注する</span>
        </label>
      </div>
    </div>
  );
}
