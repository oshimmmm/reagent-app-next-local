// app/history/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "../utils/firebase";

interface Reagent {
  productNumber: string;
  name: string;
}

interface HistoryRecord {
  id: string;
  productNumber: string;
  lotNumber: string;
  actionType: string; // inbound | outbound
  date?: any; // Timestamp
}

export default function HistoryPage() {
  const [reagents, setReagents] = useState<Reagent[]>([]);
  const [selectedReagent, setSelectedReagent] = useState<string>("");
  const [histories, setHistories] = useState<HistoryRecord[]>([]);

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

      {selectedReagent && (
        <div>
          <h2 className="text-xl font-semibold mb-2">
            {selectedReagent} の履歴情報
          </h2>
          {histories.map((h) => (
            <div key={h.id} className="border p-2 mb-2">
              <p>〇日付: {h.date?.toDate().toLocaleString() || ""}</p>
              <p>ロット: {h.lotNumber}</p>
              <p>{h.actionType === "inbound" ? "入庫" : "出庫"}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
