"use client";

import React, { useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { parseCode } from "../libs/parseCode";
import { parseNoGCode } from "../libs/parseNoGCode";
import { db } from "../utils/firebase";

export default function RegisterPage() {
  const [scanValue, setScanValue] = useState("");
  const [nonGs1ScanValue, setNonGs1ScanValue] = useState(""); // 非GS1用バーコード値
  const [reagentName, setReagentName] = useState(""); // 試薬名
  const [orderTriggerStock, setOrderTriggerStock] = useState<number>(1);
  const [orderTriggerExpiry, setOrderTriggerExpiry] = useState<boolean>(false);
  const [noOrderOnZeroStock, setNoOrderOnZeroStock] = useState<boolean>(false);
  const [orderTriggerValueStock, setOrderTriggerValueStock] = useState<number>(0);
  const [valueStock, setValueStock] = useState<number>(0);

  // 追加: 物流コードを入力するステート
  const [orderValue, setOrderValue] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [orderQuantity, setOrderQuantity] = useState<number>(1);

  const handleRegister = async () => {
    try {
      if (!reagentName.trim()) {
        throw new Error("試薬名を入力してください。");
      }

      const { productNumber } = parseCode(scanValue);

      // 既に登録済みかチェック
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
        valueStock,
        orderValue,
        location,
        orderQuantity,
      });

      alert(`登録しました: [${productNumber}] 試薬名: ${reagentName}`);
      setScanValue("");
      setReagentName("");
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

      // 既に登録済みかチェック
      const reagentRef = doc(db, "reagents", productNumber);
      const snap = await getDoc(reagentRef);
      if (snap.exists()) {
        throw new Error("既に登録済みの試薬です。");
      }

      // 新規登録（ロシュ試薬）
      await setDoc(reagentRef, {
        name: reagentName.trim(),
        stock: 0,
        orderTriggerStock,
        orderTriggerExpiry,
        noOrderOnZeroStock,
        orderTriggerValueStock: noOrderOnZeroStock ? orderTriggerValueStock : null,
        valueStock,
        // ここで「物流コード」を orderValue というフィールド名で Firestore に保存
        orderValue,
        location,
        orderQuantity,
      });

      alert(`登録しました: [${productNumber}] 試薬名: ${reagentName}`);
      setNonGs1ScanValue("");
      setReagentName("");
      // 入力欄もリセットしたければこちら
      setOrderValue("");
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

      {/* GS1 バーコード: */}
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

      {/* ロシュ試薬用バーコード: */}
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

      {/* ここで物流コード入力欄を追加 */}
      <div className="mb-4">
        <label className="block mb-1 font-semibold">物流コード:</label>
        <input
          className="border px-3 py-2 w-full"
          placeholder="物流コードを入力"
          value={orderValue}
          onChange={(e) => setOrderValue(e.target.value)}
        />
      </div>

      <div className="mb-4">
        <label className="block mb-1 font-semibold">保管場所:</label>
        <input
          className="border px-3 py-2 w-full"
          placeholder="物流コードを入力"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
      </div>
      
      <div className="mb-4">
        <label className="block mb-1 font-semibold">発注数:</label>
        <input
          type="number"
          value={orderQuantity}
          onChange={(e) => setOrderQuantity(Number(e.target.value))}
          className="border px-3 py-2"
        />
      </div>

      {/* 以下、既存の設定項目 */}
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
          <label className="block mb-1 font-semibold">
            月末残量がいくつ以下になったら発注するか:
          </label>
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
