"use client";

import React, { useState } from "react";
import { parseCode } from "../libs/parseCode";
import { parseNoGCode } from "../libs/parseNoGCode";

export default function RegisterPage() {
  const [scanValue, setScanValue] = useState("");
  const [nonGs1ScanValue, setNonGs1ScanValue] = useState(""); // 非GS1用バーコード値
  const [reagentName, setReagentName] = useState(""); // 試薬名
  const [orderTriggerStock, setOrderTriggerStock] = useState<number>(1);
  const [orderTriggerExpiry, setOrderTriggerExpiry] = useState<boolean>(false);
  const [noOrderOnZeroStock, setNoOrderOnZeroStock] = useState<boolean>(false);
  const [orderTriggerValueStock, setOrderTriggerValueStock] = useState<number>(0);
  const [valueStock, setValueStock] = useState<number>(0);
  // 追加: 物流コード、保管場所、発注数のステート
  const [orderValue, setOrderValue] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [orderQuantity, setOrderQuantity] = useState<number>(1);

  // GS1バーコードによる登録
  const handleRegister = async () => {
    try {
      if (!reagentName.trim()) {
        throw new Error("試薬名を入力してください。");
      }

      const { productNumber } = parseCode(scanValue);

      // POST リクエストで新規登録を実施
      const response = await fetch("/api/reagents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productNumber,
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
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "登録に失敗しました。");
      }

      alert(`登録しました: [${productNumber}] 試薬名: ${reagentName}`);
      setScanValue("");
      setReagentName("");
    } catch (error: unknown) {
      console.error(error);
      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert("予期せぬエラーが発生しました");
      }
    }
  };

  // 非GS1バーコード（ロシュ試薬）の登録
  const handleNonGs1Register = async () => {
    try {
      if (!reagentName.trim()) {
        throw new Error("試薬名を入力してください。");
      }

      const { productNumber } = parseNoGCode(nonGs1ScanValue);

      // POST リクエストで新規登録を実施
      const response = await fetch("/api/reagents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productNumber,
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
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "登録に失敗しました。");
      }

      alert(`登録しました: [${productNumber}] 試薬名: ${reagentName}`);
      setNonGs1ScanValue("");
      setReagentName("");
      setOrderValue("");
    } catch (error: unknown) {
      console.error(error);
      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert("予期せぬエラーが発生しました");
      }
    }
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <h1 className="text-3xl font-bold mb-6 text-center">試薬登録</h1>

      {/* 試薬名の入力 */}
      <div className="mb-6">
        <label className="block text-lg font-semibold mb-2">試薬名:</label>
        <input
          className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="試薬名を入力"
          value={reagentName}
          onChange={(e) => setReagentName(e.target.value)}
        />
      </div>

      {/* 物流コード */}
      <div className="mb-6">
        <label className="block text-lg font-semibold mb-2">物流コード:</label>
        <input
          className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-400"
          placeholder="物流コードを入力"
          value={orderValue}
          onChange={(e) => setOrderValue(e.target.value)}
        />
      </div>

      {/* 保管場所 */}
      <div className="mb-6">
        <label className="block text-lg font-semibold mb-2">保管場所:</label>
        <input
          className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-400"
          placeholder="保管場所を入力"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
      </div>

      {/* 発注数 */}
      <div className="mb-6">
        <label className="block text-lg font-semibold mb-2">発注数:</label>
        <input
          type="number"
          className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-400"
          value={orderQuantity}
          onChange={(e) => setOrderQuantity(Number(e.target.value))}
        />
      </div>

      {/* 在庫数がいくつ以下で発注するか */}
      <div className="mb-6">
        <label className="block text-lg font-semibold mb-2">
          在庫数がいくつ以下になったら発注するか:
        </label>
        <input
          type="number"
          className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-400"
          value={orderTriggerStock}
          onChange={(e) => setOrderTriggerStock(Number(e.target.value))}
        />
      </div>

      {/* 在庫が0でも発注しない */}
      <div className="mb-6">
        <label className="inline-flex items-center space-x-3">
          <input
            type="checkbox"
            className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            checked={noOrderOnZeroStock}
            onChange={(e) => setNoOrderOnZeroStock(e.target.checked)}
          />
          <span className="text-lg font-semibold">在庫が0でも発注しない</span>
        </label>
      </div>

      {/* 月末残量と規格 */}
      {noOrderOnZeroStock && (
        <div className="space-y-6 mb-6">
          <div>
            <label className="block text-lg font-semibold mb-2">
              月末残量がいくつ以下になったら発注するか:
            </label>
            <input
              type="number"
              className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={orderTriggerValueStock}
              onChange={(e) => setOrderTriggerValueStock(Number(e.target.value))}
            />
          </div>

          <div>
            <label className="block text-lg font-semibold mb-2">何μL規格か？:</label>
            <input
              type="number"
              className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={valueStock}
              onChange={(e) => setValueStock(Number(e.target.value))}
            />
          </div>
        </div>
      )}

      {/* 最長使用期限 */}
      <div className="mb-6">
        <label className="inline-flex items-center space-x-3">
          <input
            type="checkbox"
            className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            checked={orderTriggerExpiry}
            onChange={(e) => setOrderTriggerExpiry(e.target.checked)}
          />
          <span className="text-lg font-semibold">
            最長使用期限が1ヶ月未満となったら必ず発注する
          </span>
        </label>
      </div>

      {/* GS1 バーコード */}
      <div className="flex items-center space-x-4 mb-6">
        <input
          className="border border-gray-300 rounded-lg px-4 py-2 w-1/3 focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="GS1バーコードをスキャン"
          value={scanValue}
          onChange={(e) => setScanValue(e.target.value)}
        />
        <button
          onClick={handleRegister}
          className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg hover:bg-blue-700 transition-colors"
        >
          GS1登録
        </button>
      </div>

      {/* ロシュ試薬用バーコード */}
      <div className="flex items-center space-x-4 mb-6">
        <input
          className="border border-gray-300 rounded-lg px-4 py-2 w-1/3 focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="【ロシュ】 バーコードをスキャン"
          value={nonGs1ScanValue}
          onChange={(e) => setNonGs1ScanValue(e.target.value)}
        />
        <button
          onClick={handleNonGs1Register}
          className="bg-green-600 text-white px-8 py-4 rounded-lg text-lg hover:bg-green-700 transition-colors"
        >
          ロシュ試薬登録
        </button>
      </div>
    </div>
  );
}
