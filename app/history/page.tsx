"use client";

import React, { useEffect, useRef, useState } from "react";
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
  actionType: "inbound" | "outbound" | "update";
  date?: Timestamp;
  user?: string;
  oldStock?: number;
  newStock?: number;
  oldValueStock?: number;
  newValueStock?: number;
}

export default function HistoryPage() {
  const [reagents, setReagents] = useState<Reagent[]>([]);
  const [selectedProductNumber, setSelectedProductNumber] = useState("");
  const [selectedReagentName, setSelectedReagentName] = useState("");
  const [histories, setHistories] = useState<HistoryRecord[]>([]);

  // 履歴部分の表示領域にrefを立てる
  const historyContainerRef = useRef<HTMLDivElement>(null);

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

  // 「履歴表示」ボタンが押されたら、その試薬(productNumber)に関連する履歴を取得
  const handleShowHistory = async (productNumber: string) => {
    // 選択された試薬の情報を取得して保存
    const reagent = reagents.find((r) => r.productNumber === productNumber);
    setSelectedReagentName(reagent?.name || "");
    setSelectedProductNumber(productNumber);

    // Firestoreの"histories"コレクションから該当するデータを取得
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
        user: data.user,
        oldStock: data.oldStock,
        newStock: data.newStock,
      });
    });
    console.log("list is", list);
    setHistories(list);

    // 履歴をstateにセットした直後、スクロールを実行
    // setTimeoutやrequestAnimationFrameで、再レンダリング後にスクロールするようタイミングをずらす
    setTimeout(() => {
      if (historyContainerRef.current) {
        historyContainerRef.current.scrollIntoView({ behavior: "smooth" });
      }
    }, 0);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 画面上部の見出し(印刷時に不要なため hide-on-print) */}
      <h1 className="text-3xl font-bold text-center mb-8 hide-on-print">
        履歴管理
      </h1>

      {/* ▼ 印刷時に不要な要素は「hide-on-print」クラスで非表示にする */}
      <div className="hide-on-print">
        <table className="border-collapse w-full sm:w-3/4 lg:w-1/2 mx-auto mb-8 shadow-md">
          <thead>
            <tr className="bg-gray-200">
              <th className="border p-4 text-left text-sm font-semibold">
                試薬名
              </th>
              <th className="border p-4 text-center text-sm font-semibold">
                履歴表示
              </th>
            </tr>
          </thead>
          <tbody>
            {reagents.map((r) => (
              <tr
                key={r.productNumber}
                className="odd:bg-white even:bg-gray-50"
              >
                <td className="border p-4 text-sm">{r.name}</td>
                <td className="border p-4 text-center">
                  <button
                    onClick={() => handleShowHistory(r.productNumber)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    履歴表示
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ▼ 履歴表示部分 */}
      {selectedProductNumber && (
        <div ref={historyContainerRef} className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-4">
            {selectedReagentName} の履歴情報
          </h2>

          {histories.length === 0 ? (
            <p>履歴がありません。</p>
          ) : (
            <div className="space-y-4">
              {histories.map((h) => (
                <div key={h.id} className="border-b py-4">
                  <p className="text-sm">
                    日付: {h.date?.toDate().toLocaleString() || ""}
                  </p>
    
                  {/* actionTypeごとに表示切り替え */}
                  {h.actionType === "inbound" && (
                    <>
                      <p className="text-sm">ロット番号: {h.lotNumber}</p>
                      <p className="text-sm">入庫</p>
                    </>
                  )}
                  {h.actionType === "outbound" && (
                    <>
                      <p className="text-sm">ロット番号: {h.lotNumber}</p>
                      <p className="text-sm">出庫</p>
                    </>
                  )}
                  {h.actionType === "update" && (
                    <>
                      {/* 誰が編集したか */}
                      <p className="text-sm">編集者: {h.user || "不明"}</p>
                      {/* oldStock/newStock などを表示 */}
                      <p className="text-sm">
                        在庫: {h.oldStock} → {h.newStock}
                      </p>
                      <p className="text-sm">
                      月末残量: {h.oldValueStock ?? 0} → {h.newValueStock ?? 0}
                      </p>
                      <p className="text-sm">試薬情報の編集</p>
                      </>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ▼ 「印刷」ボタン自体も印刷したくないので hide-on-print を付与 */}
          <div className="mt-4 hide-on-print">
            <button
              onClick={() => window.print()}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              印刷
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
