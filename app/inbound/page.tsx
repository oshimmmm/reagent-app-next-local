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

export default function InboundPage() {
  const [scanValue, setScanValue] = useState("");
  const [showPopup, setShowPopup] = useState(false);
  const [inputValueStock, setInputValueStock] = useState<number | null>(null);

  // ★修正: Refs / Data
  const [currentReagentRef, setCurrentReagentRef] =
    useState<ReturnType<typeof doc> | null>(null);
  const [currentReagentData, setCurrentReagentData] =
    useState<Record<string, any> | null>(null);

  // ★修正: これらも state に持つ
  const [currentProductNumber, setCurrentProductNumber] = useState("");
  const [currentLotNumber, setCurrentLotNumber] = useState("");
  const [currentExpiryDate, setCurrentExpiryDate] = useState<Date | null>(null);

  // バーコードをスキャンして「試薬が既に存在するかを確認」→「valueStock があればポップアップ表示」→「なければそのまま更新」
  const handleIncoming = async () => {
    if (!scanValue) return;
    try {
      // バーコードから productNumber, lotNumber, expiryDate をパース
      const { productNumber, lotNumber, expiryDate } = parseCode(scanValue);

      if (!productNumber || typeof productNumber !== "string") {
        throw new Error("productNumber が不正です。バーコードを正しくスキャンしてください。");
      }

      // reagentsコレクションから該当docを取得
      const reagentRef = doc(db, "reagents", productNumber);
      const reagentSnap = await getDoc(reagentRef);

      if (!reagentSnap.exists()) {
        throw new Error("該当する試薬が存在しません。先に登録してください。");
      }

      // データを state へ保存
      const reagentData = reagentSnap.data();
      setCurrentProductNumber(productNumber);
      setCurrentLotNumber(lotNumber);       // ★修正
      setCurrentExpiryDate(expiryDate);     // ★修正
      setCurrentReagentRef(reagentRef);
      setCurrentReagentData(reagentData);

      // 既に valueStock が存在している場合はポップアップを出す
      if (reagentData.valueStock !== 0 && reagentData.valueStock !== undefined) {
        setShowPopup(true);
        return;
      }

      // valueStock 未定義なら、直接入庫処理を実行
      await completeIncoming(reagentRef, reagentData, lotNumber, expiryDate, productNumber);
    } catch (error) {
      console.error(error);
      alert(error);
    }
  };

  /**
   * 入庫処理 (共通)
   * @param reagentRef 該当ドキュメントのリファレンス
   * @param reagentData 取得したドキュメントデータ
   * @param lotNumber バーコードから取得したロット
   * @param expiryDate バーコードから取得した有効期限
   */
  const completeIncoming = async (
    reagentRef: ReturnType<typeof doc>,
    reagentData: Record<string, any>,
    lotNumber: string,
    expiryDate: Date,
    productNumber: string,
  ) => {
    if (!reagentRef) {
      console.error("Reagent reference is null or undefined.");
      return;
    }
    try {
      // 有効期限の最大値を更新
      const currentMaxExpiry = reagentData.maxExpiry
        ? reagentData.maxExpiry.toDate()
        : new Date("2000-01-01");
      const newMaxExpiry = compareDates(expiryDate, currentMaxExpiry);
      // 個数を +1 する想定
      const newStock = (reagentData.stock || 0) + 1;

      // ドキュメントを更新
      await updateDoc(reagentRef, {
        maxExpiry: newMaxExpiry,
        stock: newStock,
        orderDate: null,
        // ポップアップで入力した valueStock があれば上書き
        ...(inputValueStock !== null && { valueStock: inputValueStock }),
      });

      // histories コレクションにログを追加
      const historyRef = collection(db, "histories");
      await addDoc(historyRef, {
        productNumber,
        lotNumber: lotNumber,
        actionType: "inbound",
        date: serverTimestamp(),
      });

      alert(`入庫が完了しました: [${currentProductNumber}] ロット: ${lotNumber}`);
      // 初期化
      setScanValue("");
      setShowPopup(false);
      setInputValueStock(null);
    } catch (error) {
      console.error(error);
      alert("入庫処理中にエラーが発生しました。");
    }
  };

  // 日付を比較し、後ろ（より遅い日付）を返す
  const compareDates = (date1: Date, date2: Date): Date => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return d1 > d2 ? date1 : date2;
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">入庫</h1>
      <div className="flex space-x-2">
        <input
          type="text"
          className="border px-3 py-2"
          placeholder="バーコードをスキャン"
          value={scanValue}
          onChange={(e) => setScanValue(e.target.value)}
        />
        <button
          onClick={handleIncoming}
          className="bg-blue-600 text-white px-4 py-2"
        >
          入庫
        </button>
      </div>

      {showPopup && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-700 bg-opacity-50">
          <div className="bg-white p-6 rounded shadow-lg">
            <h2 className="text-xl font-bold mb-4">規格を入力してください</h2>
            <div className="mb-4">
              <label className="block mb-1 font-semibold">規格 (μL):</label>
              <input
                type="number"
                className="border px-3 py-2 w-full"
                value={inputValueStock ?? ""}
                onChange={(e) =>
                  setInputValueStock(e.target.value ? Number(e.target.value) : null)
                }
              />
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() =>
                  // ★修正: lotNumber, expiryDate も state を使って正しく呼ぶ
                  completeIncoming(
                    currentReagentRef!,
                    currentReagentData!,
                    currentLotNumber,        // ポップアップでも同じ lotNumber
                    currentExpiryDate!,
                    currentProductNumber,
                  )
                }
                className="bg-green-600 text-white px-4 py-2"
              >
                入庫を完了
              </button>
              <button
                onClick={() => {
                  setShowPopup(false);
                  setInputValueStock(null);
                }}
                className="bg-red-600 text-white px-4 py-2"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
