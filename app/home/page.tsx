"use client";
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { db } from "../utils/firebase";

interface Reagent {
  productNumber: string;
  name: string;
  stock: number;
  maxExpiry: string; // "YYYY-MM-DD"
  location?: string;
  currentLot?: string;
  monthlyRemaining?: number;
  logisticCode?: string;
  orderDate?: string; // "YYYY-MM-DD"など
  orderStatus?: string; // "発注" or "未発注" など
  orderQuantity?: number;
  noOrderOnZeroStock?: boolean; // 在庫0でも発注しない
  valueStock?: number; // μL単位の規格
  orderTriggerStock?: number; // 発注トリガー在庫数
  orderTriggerExpiry?: boolean; // 最長使用期限で発注するか
  orderTriggerValueStock?: number; // 月末残量トリガー
}

export default function HomePage() {
  const { user, loading } = useAuth();
  const [reagents, setReagents] = useState<Reagent[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      // ログインしていない場合の処理（必要なら追加）
    }
  }, [loading, user]);

  useEffect(() => {
    const fetchReagents = async () => {
      setLoadingData(true);
      const colRef = collection(db, "reagents");
      const snapshot = await getDocs(colRef);
      const dataList: Reagent[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        dataList.push({
          productNumber: docSnap.id,
          name: data.name || "",
          stock: data.stock || 0,
          maxExpiry: data.maxExpiry
            ? formatTimestamp(data.maxExpiry)
            : "",
          location: data.location || "",
          currentLot: data.currentLot || "",
          monthlyRemaining: data.monthlyRemaining || 0,
          logisticCode: data.logisticCode || "",
          orderDate: data.orderDate
            ? formatTimestamp(data.orderDate)
            : "",
          noOrderOnZeroStock: data.noOrderOnZeroStock || false,
          valueStock: data.valueStock || 0,
          orderTriggerStock: data.orderTriggerStock || 0,
          orderTriggerExpiry: data.orderTriggerExpiry || false,
          orderTriggerValueStock: data.orderTriggerValueStock || 0,
          orderStatus: checkOrderStatus(
            data.stock,
            data.maxExpiry,
            data.orderTriggerStock,
            data.orderTriggerExpiry,
            data.noOrderOnZeroStock,
            data.valueStock,
            data.orderTriggerValueStock
          ),
          orderQuantity: data.orderQuantity || 0,
        });
      });
      setReagents(dataList);
      setLoadingData(false);
    };

    const formatTimestamp = (timestamp: any): string => {
      if (!timestamp || !timestamp.toDate) return "";
      const date = timestamp.toDate();
      return date.toISOString().split("T")[0];
    };

    fetchReagents();
  }, []);

  const checkOrderStatus = (
    stock: number,
    maxExpiry: string,
    orderTriggerStock?: number,
    orderTriggerExpiry?: boolean,
    noOrderOnZeroStock?: boolean,
    valueStock?: number,
    orderTriggerValueStock?: number
  ): string => {
    let needOrder = false;

    if (noOrderOnZeroStock) {
      // 在庫が0でも発注しない場合のロジック
      if (
        valueStock !== undefined &&
        orderTriggerValueStock !== undefined &&
        valueStock <= orderTriggerValueStock
      ) {
        needOrder = true;
      }
    } else {
      // 通常の在庫発注条件
      if (orderTriggerStock !== undefined && stock <= orderTriggerStock) {
        needOrder = true;
      }
    }

    // 最長使用期限による発注条件
    if (orderTriggerExpiry) {
      const expiryDate = new Date(maxExpiry);
      const now = new Date();
      const oneMonthLater = new Date();
      oneMonthLater.setMonth(now.getMonth() + 1);
      if (expiryDate < oneMonthLater) {
        needOrder = true;
      }
    }

    return needOrder ? "発注" : "";
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">ホーム</h1>
      {loadingData ? (
        <p>読み込み中...</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-200">
              <th className="p-2 border">試薬名</th>
              <th className="p-2 border">在庫数</th>
              <th className="p-2 border">使用中ロット</th>
              <th className="p-2 border">保管場所</th>
              <th className="p-2 border">最長使用期限</th>
              <th className="p-2 border">月末残量</th>
              <th className="p-2 border">発注の可否</th>
              <th className="p-2 border">発注数</th>
              <th className="p-2 border">物流コード</th>
              <th className="p-2 border">発注日</th>
            </tr>
          </thead>
          <tbody>
            {reagents.map((r) => (
              <tr key={r.productNumber} className="text-center">
                <td className="p-2 border">{r.name}</td>
                <td className="p-2 border">{r.stock}</td>
                <td className="p-2 border">{r.currentLot}</td>
                <td className="p-2 border">{r.location}</td>
                <td className="p-2 border">{r.maxExpiry}</td>
                <td className="p-2 border">{r.valueStock ?? 0}</td>
                <td className="p-2 border">{r.orderStatus}</td>
                <td className="p-2 border">{r.orderQuantity ?? 0}</td>
                <td className="p-2 border">{r.logisticCode}</td>
                <td className="p-2 border">{r.orderDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
