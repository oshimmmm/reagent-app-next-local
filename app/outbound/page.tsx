"use client";

import React, { useState, useEffect, useRef } from "react";
import { parseCode } from "../libs/parseCode";
import { parseNoGCode } from "../libs/parseNoGCode";

export default function OutboundPage() {
  const [scanValue, setScanValue] = useState("");
  const [scanNoGValue, setScanNoGValue] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 手入力用（その他出庫）の状態
  const [alphabetDocs, setAlphabetDocs] = useState<{ id: string; name: string }[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>("");
  const [manualLot, setManualLot] = useState<string>("");

  // input要素へのref (GS1 バーコード用)
  const inputRef = useRef<HTMLInputElement>(null);

  // マウント時に input へフォーカス
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // 1) 「アルファベットで始まる」Reagent一覧を /api/reagents-alphabet から取得
  useEffect(() => {
    const fetchAlphabetDocs = async () => {
      try {
        const res = await fetch("/api/reagents-alphabet");
        if (!res.ok) throw new Error("一覧取得に失敗しました");
        const docs = await res.json();
        setAlphabetDocs(docs); // [{ id, name }, ... ]
      } catch (error) {
        console.error(error);
        setErrorMessage("DB からの取得に失敗しました。");
      }
    };
    fetchAlphabetDocs();
  }, []);

  // 2) GS1 バーコードによる出庫処理
  const handleOutbound = async () => {
    if (!scanValue) return;
    try {
      const { productNumber, lotNumber } = parseCode(scanValue);
      await commonOutboundLogic(productNumber, lotNumber);
      setScanValue("");
    } catch (error: unknown) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : "不明なエラーが発生しました。");
    }
  };

  // 3) Roche バーコードによる出庫処理
  const handleNoGOutbound = async () => {
    if (!scanNoGValue) return;
    try {
      const { productNumber, lotNumber } = parseNoGCode(scanNoGValue);
      await commonOutboundLogic(productNumber, lotNumber);
      setScanNoGValue("");
    } catch (error: unknown) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : "不明なエラーが発生しました。");
    }
  };

  // 4) 手入力による出庫処理
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
      setSelectedDocId("");
      setManualLot("");
    } catch (error: unknown) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : "不明なエラーが発生しました。");
    }
  };

  /**
   * 共通の出庫処理
   * APIエンドポイント /api/lots/outbound を呼び出し、出庫処理を実行する。
   */
  const commonOutboundLogic = async (productNumber: string, lotNumber: string) => {
    const res = await fetch("/api/lots/outbound", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productNumber, lotNumber, outboundQuantity: 1 }),
    });

    if (!res.ok) {
      const { error } = await res.json().catch(() => ({}));
      throw new Error(error || "出庫処理に失敗しました。");
    }

    alert(`出庫が完了しました: [${productNumber}] ロット: ${lotNumber}`);
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold mb-6 text-center text-indigo-700 drop-shadow-md">出庫処理</h1>

      {/* GS1 バーコード用 */}
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
              if (e.key === "Enter") handleOutbound();
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

      {/* Roche バーコード用 */}
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
              if (e.key === "Enter") handleNoGOutbound();
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

      {/* 手入力 出庫 */}
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

      {/* エラーメッセージ */}
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
