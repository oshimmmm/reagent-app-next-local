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
  const [selectedReagent, setSelectedReagent] = useState<string>(""); // 選択された productNumber
  const [selectedReagentName, setSelectedReagentName] = useState<string>(""); // 選択された試薬の名前
  const [histories, setHistories] = useState<HistoryRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);

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
    setSelectedReagent(productNumber);

    // 対応する名前を取得
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
    <div>
      <h1 className="text-2xl font-bold mb-4">履歴</h1>
      <table className="border w-full mb-6">
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

      {/* 履歴表示エリア */}
      {showHistory && (
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            maxHeight: "40%",
            overflowY: "auto",
            backgroundColor: "white",
            borderTop: "1px solid #ccc",
            boxShadow: "0 -2px 5px rgba(0, 0, 0, 0.1)",
          }}
        >
          <div className="flex justify-between items-center px-4 py-2 border-b">
            <h2 className="text-xl font-semibold">
              {selectedReagentName} の履歴情報
            </h2>
            <button
              onClick={() => setShowHistory(false)}
              className="text-red-600 font-bold text-lg"
            >
              ×
            </button>
          </div>
          <div className="px-4">
            {histories.map((h) => (
              <div key={h.id} className="border p-2 mb-2">
                <p>〇日付: {h.date?.toDate().toLocaleString() || ""}</p>
                <p>ロット: {h.lotNumber}</p>
                <p>{h.actionType === "inbound" ? "入庫" : "出庫"}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
