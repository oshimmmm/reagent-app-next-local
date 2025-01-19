"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
} from "firebase/firestore";
import { parseCode } from "../libs/parseCode";
import { parseNoGCode } from "../libs/parseNoGCode";
import { db } from "../utils/firebase";

export default function OutboundPage() {
  const [scanValue, setScanValue] = useState("");
  const [scanNoGValue, setScanNoGValue] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 手入力用
  const [alphabetDocs, setAlphabetDocs] = useState<{ id: string; name: string }[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>("");  // 選択した docID
  const [manualLot, setManualLot] = useState<string>("");          // 手入力ロット番号

  // 入力フォーカス用
  const inputRef = useRef<HTMLInputElement>(null);

  // マウント時に input にフォーカス
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  /**
   * Firestore から「docID がアルファベットで始まる」ドキュメントを取得
   */
  useEffect(() => {
    const fetchAlphabetDocs = async () => {
      try {
        const snapshot = await getDocs(collection(db, "reagents"));
        const docs: { id: string; name: string }[] = [];
        snapshot.forEach((docSnap) => {
          const docId = docSnap.id;
          // アルファベット（大文字小文字区別なし）で始まる場合のみ対象
          if (/^[A-Za-z]/.test(docId)) {
            const data = docSnap.data() as { name?: string };
            docs.push({
              id: docId,
              name: data.name ?? "",
            });
          }
        });
        setAlphabetDocs(docs);
      } catch (error) {
        console.error(error);
        setErrorMessage("Firestore からの取得に失敗しました。");
      }
    };
    fetchAlphabetDocs();
  }, []);

  /**
   * GS1 バーコードで出庫
   */
  const handleOutbound = async () => {
    if (!scanValue) return;
    try {
      const { productNumber, lotNumber } = parseCode(scanValue);
      await commonOutboundLogic(productNumber, lotNumber);
      setScanValue("");
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : "不明なエラーが発生しました。");
    }
  };

  /**
   * Roche バーコードで出庫
   */
  const handleNoGOutbound = async () => {
    if (!scanNoGValue) return;
    try {
      const { productNumber, lotNumber } = parseNoGCode(scanNoGValue);
      await commonOutboundLogic(productNumber, lotNumber);
      setScanNoGValue("");
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : "不明なエラーが発生しました。");
    }
  };

  /**
   * 手入力で出庫 (プルダウンで試薬選択、ロット番号入力)
   */
  const handleManualOutbound = async () => {
    if (!selectedDocId) {
      setErrorMessage("試薬を選択してください。");
      return;
    }
    if (!manualLot) {
      setErrorMessage("ロット番号を入力してください。");
      return;
    }
    try {
      await commonOutboundLogic(selectedDocId, manualLot);
      // 正常終了後リセット
      setSelectedDocId("");
      setManualLot("");
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : "不明なエラーが発生しました。");
    }
  };

  /**
   * 在庫を1減らし、currentLotを更新 → historiesにログ追加
   * (GS1, Roche, 手入力 いずれも同じロジック)
   */
  const commonOutboundLogic = async (productNumber: string, lotNumber: string) => {
    const reagentRef = doc(db, "reagents", productNumber);
    const reagentSnap = await getDoc(reagentRef);

    if (!reagentSnap.exists()) {
      throw new Error("該当する試薬が存在しません。");
    }

    const reagentData = reagentSnap.data();
    const currentStock = reagentData?.stock || 0;
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
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold mb-6 text-center text-indigo-700 drop-shadow-md">出庫処理</h1>
  
      {/* GS1 バーコード */}
      <div className="border p-4 rounded-lg shadow-md mb-6 bg-gray-50">
        <h2 className="text-xl font-semibold mb-4">GS1 バーコードスキャン</h2>
        <div className="flex items-center space-x-4">
          <input
            ref={inputRef}
            type="text"
            className="border px-4 py-2 w-full max-w-md rounded-lg"
            placeholder="GS1バーコードをスキャン"
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
            className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            出庫
          </button>
        </div>
      </div>
  
      {/* Roche バーコード */}
      <div className="border p-4 rounded-lg shadow-md mb-6 bg-gray-50">
        <h2 className="text-xl font-semibold mb-4">Roche バーコードスキャン</h2>
        <div className="flex items-center space-x-4">
          <input
            type="text"
            className="border px-4 py-2 w-full max-w-md rounded-lg"
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
            onClick={handleNoGOutbound}
            className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Roche試薬出庫
          </button>
        </div>
      </div>
  
      {/* 手入力による出庫 */}
      <div className="border p-6 rounded-lg shadow-md bg-gray-50">
        <h2 className="text-xl font-semibold mb-4">その他出庫</h2>
        <p className="mb-4 text-gray-600">
        *GATA3, HNF4α, BondⅢ6ml30mlボトル, 手染めPBS, VENTANAクリアオーバーレイ, 各種ラベルキット, ABC液, ABC二次抗体はこちら
        </p>
        <div className="flex items-center space-x-4 mb-4">
          <label className="font-bold">試薬選択:</label>
          <select
            value={selectedDocId}
            onChange={(e) => setSelectedDocId(e.target.value)}
            className="border px-3 py-2 rounded-lg"
          >
            <option value="">-- 選択してください --</option>
            {alphabetDocs.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.name || doc.id}
              </option>
            ))}
          </select>
        </div>
  
        {selectedDocId && (
          <div className="space-y-4">
            <div>
              <label className="block font-bold mb-1">ロット番号:</label>
              <input
                type="text"
                className="border px-3 py-2 rounded-lg w-full max-w-md"
                value={manualLot}
                onChange={(e) => setManualLot(e.target.value)}
              />
            </div>
            <button
              onClick={handleManualOutbound}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              その他出庫
            </button>
          </div>
        )}
      </div>
  
      {/* エラーメッセージのポップアップ */}
      {errorMessage && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-700 bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md text-center">
            <h2 className="text-xl font-bold text-red-600 mb-4">エラー</h2>
            <p className="mb-6">{errorMessage}</p>
            <button
              onClick={() => setErrorMessage(null)}
              className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );  
}
