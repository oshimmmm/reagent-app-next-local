"use client";
import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { db } from "../utils/firebase";

// Firestore の生データ用
interface ReagentDataFromFirestore {
  currentLot?: string;
  maxExpiry?: Timestamp;  // タイムスタンプ
  name?: string;
  noOrderOnZeroStock?: boolean;
  orderDate?: Timestamp | null; // null もあり
  orderTriggerExpiry?: boolean;
  orderTriggerStock?: number;
  orderTriggerValueStock?: number | null;
  stock?: number;
  valueStock?: number;
  orderValue?: string; //物流コード
  monthlyRemaining?: number;
  orderQuantity?: number; // 発注数
  location?: string;
}

// コンポーネント内で使う型 (フォーマット後のもの)
interface Reagent {
  productNumber: string;
  name: string;
  stock: number;
  maxExpiry: string; // 文字列
  currentLot: string;
  noOrderOnZeroStock: boolean;
  orderDate: string; // 文字列
  orderTriggerExpiry: boolean;
  orderTriggerStock: number;
  orderTriggerValueStock: number | null;
  valueStock: number;
  location: string;
  orderValue: string;
  monthlyRemaining: number;
  orderQuantity: number;
  orderStatus: string; // "発注" or ""
}

// Timestamp または null を日付文字列に変換
function formatTimestamp(value: Timestamp | string | null | undefined): string {
  if (!value) {
    // null や undefined のとき
    return "";
  }

  if (value instanceof Timestamp) {
    // 本当に Firestore の Timestamp 型なら toDate() が使える
    return value.toDate().toISOString().split("T")[0];
  }

  // 文字列の場合はそのまま返す or パースして返す
  if (typeof value === "string") {
    // 例: "2025-01-01" 形式を想定しているなら、そのまま返すか Date に変換
    return value; 
  }

  // それ以外の型は想定外なので空文字を返すなど適宜調整
  return "";
}

/**
 * 在庫や有効期限から発注の可否を判定する関数
 */
function checkOrderStatus(
  stock: number,
  maxExpiryStr: string,
  orderTriggerStock: number,
  orderTriggerExpiry: boolean,
  noOrderOnZeroStock: boolean,
  valueStock: number,
  orderTriggerValueStock: number | null
): string {
  let needOrder = false;

  // 1) 在庫が0でも発注しない場合のロジック
  if (noOrderOnZeroStock) {
    if (
      orderTriggerValueStock !== null &&
      valueStock <= orderTriggerValueStock
    ) {
      needOrder = true;
    }
  } else {
    // 通常の在庫発注条件
    if (stock <= orderTriggerStock) {
      needOrder = true;
    }
  }

  // 2) 最長使用期限による発注条件
  if (orderTriggerExpiry && maxExpiryStr) {
    const expiryDate = new Date(maxExpiryStr); 
    const now = new Date();
    const oneMonthLater = new Date();
    oneMonthLater.setMonth(now.getMonth() + 1);
    if (expiryDate < oneMonthLater) {
      needOrder = true;
    }
  }

  return needOrder ? "発注" : "";
}

export default function HomePage() {
  const { user, loading } = useAuth();
  const [reagents, setReagents] = useState<Reagent[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Reagent; direction: 'asc' | 'desc' } | null>(null);
  const [selectedFilters, setSelectedFilters] = useState<{ [key in keyof Reagent]?: string }>({});

  useEffect(() => {
    // 未ログインならリダイレクトなどがある場合はここで
    if (!loading && !user) {
      // ...
    }
  }, [loading, user]);

  useEffect(() => {
    const fetchReagents = async () => {
      setLoadingData(true);

      const colRef = collection(db, "reagents");
      const snapshot = await getDocs(colRef);

      const dataList: Reagent[] = [];
      snapshot.forEach((docSnap) => {
        // Firestoreの生データ
        const data = docSnap.data() as ReagentDataFromFirestore;

        // 文字列に変換した maxExpiry
        const maxExpiryStr = data.maxExpiry
          ? formatTimestamp(data.maxExpiry)
          : "";

        // 文字列に変換した orderDate
        const orderDateStr = data.orderDate
          ? formatTimestamp(data.orderDate)
          : "";

        // 発注可否を判定
        const status = checkOrderStatus(
          data.stock ?? 0,
          maxExpiryStr,
          data.orderTriggerStock ?? 0,
          data.orderTriggerExpiry ?? false,
          data.noOrderOnZeroStock ?? false,
          data.valueStock ?? 0,
          data.orderTriggerValueStock ?? null
        );

        dataList.push({
          productNumber: docSnap.id,
          name: data.name ?? "",
          stock: data.stock ?? 0,
          maxExpiry: maxExpiryStr,
          currentLot: data.currentLot ?? "",
          noOrderOnZeroStock: data.noOrderOnZeroStock ?? false,
          orderDate: orderDateStr,
          orderTriggerExpiry: data.orderTriggerExpiry ?? false,
          orderTriggerStock: data.orderTriggerStock ?? 0,
          orderTriggerValueStock: data.orderTriggerValueStock ?? null,
          valueStock: data.valueStock ?? 0,
          orderValue: data.orderValue ?? "",
          monthlyRemaining: data.monthlyRemaining ?? 0,
          orderQuantity: data.orderQuantity ?? 0,
          orderStatus: status,
          location: data.location ?? "",
        });
        console.log("dataList is:", dataList);
      });

      setReagents(dataList);
      setLoadingData(false);
    };

    fetchReagents();
  }, []);

  const requestSort = (key: keyof Reagent) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getHeaderStyle = (key: keyof Reagent) => {
    if (sortConfig?.key === key) {
      return { fontWeight: 'bold', color: sortConfig.direction === 'asc' ? 'blue' : 'red' };
    }
    return {};
  };

  const handleFilterChange = (key: keyof Reagent, value: string) => {
    setSelectedFilters((prev) => ({
      ...prev,
      [key]: value || undefined, // 空値は undefined に設定
    }));
  };
  
  
  const uniqueValues: { [key in keyof Reagent]?: string[] } = reagents.reduce((acc, reagent) => {
    Object.keys(reagent).forEach((key) => {
      const typedKey = key as keyof Reagent;
      if (!acc[typedKey]) {
        acc[typedKey] = [];
      }
      if (reagent[typedKey] && !acc[typedKey]?.includes(String(reagent[typedKey]))) {
        acc[typedKey]!.push(String(reagent[typedKey]));
      }
    });
    return acc;
  }, {} as { [key in keyof Reagent]?: string[] });

  const filteredAndSortedReagents = reagents
  .filter((reagent) =>
    Object.entries(selectedFilters).every(([key, value]) =>
      value ? String(reagent[key as keyof Reagent]).includes(value) : true
    )
  )
  .sort((a, b) => {
    if (!sortConfig) return 0;
  
    const aValue = (a[sortConfig.key] || '').toString().toLowerCase(); // 小文字に変換
    const bValue = (b[sortConfig.key] || '').toString().toLowerCase(); // 小文字に変換
  
    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });


  return (
    <div className="container mx-auto px-4">
      <h1 className="text-2xl font-bold my-4">ホーム</h1>
      {loadingData ? (
        <p>読み込み中...</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-200">
              <th className="p-2 border">
                <div
                  onClick={() => requestSort('name')}
                  style={{ ...getHeaderStyle('name') }}
                  className='text-lg cursor-pointer'
                >
                  試薬名
                </div>
                <select
                  value={selectedFilters.name || ''}
                  onChange={(e) => handleFilterChange('name', e.target.value)}
                  className="font-normal border border-gray-300 rounded w-full"
                >
                  <option value="">すべて</option>
                  {uniqueValues.name?.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </th>
              <th className="p-2 border">在庫数</th>
              <th className="p-2 border">使用中ロット</th>
              <th className="p-2 border">最長使用期限</th>
              <th className="p-2 border">月末残量</th>
              <th className="p-2 border">発注の可否</th>
              <th className="p-2 border">発注数</th>
              <th className="p-2 border">
                <div
                  onClick={() => requestSort('location')}
                  style={{ ...getHeaderStyle('location') }}
                  className='text-lg cursor-pointer'
                >
                  保管場所
                </div>
                <select
                  value={selectedFilters.location || ''}
                  onChange={(e) => handleFilterChange('location', e.target.value)}
                  className="font-normal border border-gray-300 rounded w-full"
                >
                  <option value="">すべて</option>
                  {uniqueValues.location?.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </th>
              <th className="p-2 border">物流コード</th>
              <th className="p-2 border">発注日</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedReagents.map((r) => (
              <tr key={r.productNumber} className="text-center">
                <td className="p-2 border">{r.name}</td>
                <td className="p-2 border">{r.stock}</td>
                <td className="p-2 border">{r.currentLot}</td>
                <td className="p-2 border">{r.maxExpiry}</td>
                <td className="p-2 border">{r.valueStock !== undefined && r.valueStock !== 0 ? r.valueStock : ""}</td>
                <td className="p-2 border">{r.orderStatus}</td>
                <td className="p-2 border">{r.orderQuantity}</td>
                <td className="p-2 border"> {r.location} </td>
                <td className="p-2 border">{r.orderValue}</td>
                <td className="p-2 border">{r.orderDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
