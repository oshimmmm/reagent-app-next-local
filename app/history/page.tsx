"use client";

import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "../utils/firebase";

interface Reagent {
  productNumber: string;
  name: string;
}

interface HistoryRecord {
  id: string;
  productNumber: string;
  lotNumber: string;
  actionType: "inbound" | "outbound";
  date?: Timestamp;
}

export default function HistoryPage() {
  const [reagents, setReagents] = useState<Reagent[]>([]);
  const [selectedReagentName, setSelectedReagentName] = useState<string>(""); // 選択された試薬の名前
  const [histories, setHistories] = useState<HistoryRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [fullScreenMode, setFullScreenMode] = useState(false); // フルスクリーンモード

  useEffect(() => {
    const fetchReagents = async () => {
      const reagentsRef = collection(db, "reagents");
      const snapshot = await getDocs(reagentsRef);
      const list: Reagent[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          productNumber: docSnap.id,
          name: data.name || "",
        });
      });
      setReagents(list);
    };
    fetchReagents();
  }, []);

  const handleShowHistory = async (productNumber: string) => {
    const reagent = reagents.find((r) => r.productNumber === productNumber);
    setSelectedReagentName(reagent?.name || "");

    const historiesRef = collection(db, "histories");
    const qHistories = query(
      historiesRef,
      where("productNumber", "==", productNumber),
      orderBy("date", "desc")
    );
    const snapshot = await getDocs(qHistories);
    const list: HistoryRecord[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      list.push({
        id: docSnap.id,
        productNumber: data.productNumber,
        lotNumber: data.lotNumber,
        actionType: data.actionType,
        date: data.date,
      });
    });
    setHistories(list);
    setShowHistory(true);
  };

  return (
    <div className="flex flex-col items-center">
      <h1 className="text-2xl font-bold mb-4">履歴</h1>
      <table className="border w-full sm:w-3/4 lg:w-1/2 mb-6">
        <thead>
          <tr className="bg-gray-200">
            <th className="border p-2">試薬名</th>
            <th className="border p-2">履歴表示</th>
          </tr>
        </thead>
        <tbody>
          {reagents.map((r) => (
            <tr key={r.productNumber}>
              <td className="border p-2">{r.name}</td>
              <td className="border p-2 text-center">
                <button
                  onClick={() => handleShowHistory(r.productNumber)}
                  className="bg-blue-600 text-white px-3 py-1"
                >
                  履歴表示
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ポップアップ（モーダル） */}
      {showHistory && !fullScreenMode && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-700 bg-opacity-50 z-50">
          <div className="bg-white w-3/4 max-w-3xl rounded shadow-lg">
            <div className="flex justify-between items-center px-4 py-2 border-b">
              <h2 className="text-xl font-semibold">
                {selectedReagentName} の履歴情報
              </h2>
              <div className="flex space-x-4">
                <button
                  onClick={() => setFullScreenMode(true)}
                  className="bg-green-600 text-white px-4 py-2 rounded"
                >
                  フルスクリーン
                </button>
                <button
                  onClick={() => setShowHistory(false)}
                  className="text-red-600 font-bold text-lg"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="px-4 py-4 max-h-96 overflow-y-auto">
              {histories.map((h) => (
                <div key={h.id} className="border p-2 mb-2">
                  <p>〇日付: {h.date?.toDate().toLocaleString() || ""}</p>
                  <p>ロット: {h.lotNumber}</p>
                  <p>{h.actionType === "inbound" ? "入庫" : "出庫"}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* フルスクリーンモード */}
      {fullScreenMode && (
        <div className="fixed inset-0 bg-white z-50 overflow-auto">
          <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">{selectedReagentName} の履歴情報</h1>
            <div id="history-content">
              {histories.map((h) => (
                <div key={h.id} className="border p-2 mb-2">
                  <p>〇日付: {h.date?.toDate().toLocaleString() || ""}</p>
                  <p>ロット: {h.lotNumber}</p>
                  <p>{h.actionType === "inbound" ? "入庫" : "出庫"}</p>
                </div>
              ))}
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => {
                  setFullScreenMode(false);
                  window.print(); // 印刷
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded"
              >
                印刷
              </button>
              <button
                onClick={() => setFullScreenMode(false)}
                className="bg-red-600 text-white px-4 py-2 rounded ml-4"
              >
                戻る
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
