"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { parseCode } from "../libs/parseCode";
import { db } from "../utils/firebase";

interface ReagentData {
  maxExpiry?: Timestamp;
  stock?: number;
  valueStock?: number;
}

export default function InboundPage() {
  const [scanValue, setScanValue] = useState("");
  const [showPopup, setShowPopup] = useState(false);
  const [inputValueStock, setInputValueStock] = useState<number | null>(null);

  const [currentReagentRef, setCurrentReagentRef] =
    useState<ReturnType<typeof doc> | null>(null);
  const [currentReagentData, setCurrentReagentData] =
    useState<ReagentData | null>(null);

  const [currentProductNumber, setCurrentProductNumber] = useState("");
  const [currentLotNumber, setCurrentLotNumber] = useState("");
  const [currentExpiryDate, setCurrentExpiryDate] = useState<Date | null>(null);

  // ① useRef で input エレメントを参照
  const inputRef = useRef<HTMLInputElement>(null);

  // ② マウント時に input にフォーカス
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleIncoming = async () => {
    if (!scanValue) return;
    try {
      const { productNumber, lotNumber, expiryDate } = parseCode(scanValue);

      if (!productNumber || typeof productNumber !== "string") {
        throw new Error(
          "productNumber が不正です。バーコードを正しくスキャンしてください。"
        );
      }

      const reagentRef = doc(db, "reagents", productNumber);
      const reagentSnap = await getDoc(reagentRef);
      if (!reagentSnap.exists()) {
        throw new Error("該当する試薬が存在しません。先に登録してください。");
      }

      const reagentData = reagentSnap.data() as ReagentData;

      setCurrentProductNumber(productNumber);
      setCurrentLotNumber(lotNumber);
      setCurrentExpiryDate(expiryDate);
      setCurrentReagentRef(reagentRef);
      setCurrentReagentData(reagentData);

      if (reagentData.valueStock !== 0 && reagentData.valueStock !== undefined) {
        setShowPopup(true);
        return;
      }

      await completeIncoming(
        reagentRef,
        reagentData,
        lotNumber,
        expiryDate,
        productNumber
      );
    } catch (error: unknown) {
      console.error(error);
      alert(String(error));
    }
  };

  const completeIncoming = async (
    reagentRef: ReturnType<typeof doc>,
    reagentData: ReagentData,
    lotNumber: string,
    expiryDate: Date,
    productNumber: string
  ) => {
    if (!reagentRef) {
      console.error("Reagent reference is null or undefined.");
      return;
    }
    try {
      const currentMaxExpiry = reagentData.maxExpiry
        ? reagentData.maxExpiry.toDate()
        : new Date("2000-01-01");

      const newMaxExpiry = compareDates(expiryDate, currentMaxExpiry);
      const newStock = (reagentData.stock || 0) + 1;

      await updateDoc(reagentRef, {
        maxExpiry: newMaxExpiry,
        stock: newStock,
        orderDate: null,
        ...(inputValueStock !== null && { valueStock: inputValueStock }),
      });

      const historyRef = collection(db, "histories");
      await addDoc(historyRef, {
        productNumber,
        lotNumber,
        actionType: "inbound",
        date: serverTimestamp(),
      });

      alert(`入庫が完了しました: [${currentProductNumber}] ロット: ${lotNumber}`);
      setScanValue("");
      setShowPopup(false);
      setInputValueStock(null);
    } catch (error) {
      console.error(error);
      alert("入庫処理中にエラーが発生しました。");
    }
  };

  const compareDates = (date1: Date, date2: Date): Date => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return d1 > d2 ? date1 : date2;
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">入庫</h1>
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
              handleIncoming();
            }
          }}
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
                  completeIncoming(
                    currentReagentRef!,
                    currentReagentData!,
                    currentLotNumber,
                    currentExpiryDate!,
                    currentProductNumber
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
