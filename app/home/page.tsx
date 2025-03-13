"use client";

import { useEffect, useState } from "react";

// =========================
// データベース(Reagent)から取得する型 (DB直後の生データ)
// =========================
interface ReagentFromDB {
  id: number;                       // DBがInt主キーなら
  productNumber: string;
  currentLot: string | null;
  location: string | null;
  maxExpiry: string | null;        // Prisma JSON化で ISO8601文字列になる場合が多い
  name: string | null;
  noOrderOnZeroStock: boolean;
  orderDate: string | null;
  orderQuantity: number;
  orderTriggerExpiry: boolean;
  orderTriggerStock: number;
  orderTriggerValueStock: number | null;
  orderValue: string | null;
  stock: number;
  valueStock: number;
  createdAt: string;
  updatedAt: string;
}

// =========================
// フロント用に整形した型 (UI表示のため、nullを除去しやすくする等)
// =========================
interface Reagent {
  productNumber: string;
  name: string;
  stock: number;
  maxExpiry: string;       // "YYYY-MM-DD" 等
  currentLot: string;
  noOrderOnZeroStock: boolean;
  orderDate: string;       // "YYYY-MM-DD" 等
  orderTriggerExpiry: boolean;
  orderTriggerStock: number;
  orderTriggerValueStock: number | null;
  valueStock: number;
  orderValue: string;
  orderQuantity: number;
  orderStatus: string;     // "発注" or ""
  location: string;
}

// =========================
// 日付文字列(ISO8601など)を "YYYY-MM-DD" に整形
// =========================
function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  // new Date()でパースしてYYYY-MM-DDに変換
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return ""; // パース失敗
  return d.toISOString().split("T")[0];
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

  // 1) 在庫が0でも発注しない設定 (noOrderOnZeroStock)
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

  // 2) 使用期限による発注条件
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
  const [reagents, setReagents] = useState<Reagent[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // ソート・フィルタ用の state (従来通り)
  const [sortConfig, setSortConfig] = useState<{ key: keyof Reagent; direction: 'asc' | 'desc' } | null>(null);
  const [selectedFilters, setSelectedFilters] = useState<{ [key in keyof Reagent]?: string }>({});

  // valueStock が 0 以外のデータのみ表示するかを制御する state
  const [filterValueStockNonZero, setFilterValueStockNonZero] = useState<boolean>(false);

  // =========================
  // 1) DBからreagentsを取得
  // =========================
  useEffect(() => {
    const fetchReagents = async () => {
      setLoadingData(true);

      try {
        const res = await fetch("/api/reagents");
        if (!res.ok) {
          throw new Error("Failed to fetch reagents");
        }
        const dbData: ReagentFromDB[] = await res.json();

        // 取得したデータをUI用に整形
        const dataList: Reagent[] = dbData.map((item) => {
          const maxExpiryStr = formatDate(item.maxExpiry);
          const orderDateStr = formatDate(item.orderDate);

          // 発注可否判定
          const status = checkOrderStatus(
            item.stock ?? 0,
            maxExpiryStr,
            item.orderTriggerStock ?? 0,
            item.orderTriggerExpiry ?? false,
            item.noOrderOnZeroStock ?? false,
            item.valueStock ?? 0,
            item.orderTriggerValueStock ?? null
          );

          return {
            productNumber: item.productNumber,
            name: item.name ?? "",
            stock: item.stock ?? 0,
            maxExpiry: maxExpiryStr,
            currentLot: item.currentLot ?? "",
            noOrderOnZeroStock: item.noOrderOnZeroStock,
            orderDate: orderDateStr,
            orderTriggerExpiry: item.orderTriggerExpiry,
            orderTriggerStock: item.orderTriggerStock,
            orderTriggerValueStock: item.orderTriggerValueStock,
            valueStock: item.valueStock,
            orderValue: item.orderValue ?? "",
            orderQuantity: item.orderQuantity,
            orderStatus: status,
            location: item.location ?? "",
          };
        });

        setReagents(dataList);
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingData(false);
      }
    };

    fetchReagents();
  }, []);


  // =========================
  // ソート機能
  // =========================
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

  // =========================
  // フィルタ機能
  // =========================
  const handleFilterChange = (key: keyof Reagent, value: string) => {
    setSelectedFilters((prev) => ({
      ...prev,
      [key]: value || undefined, // 空は undefined に
    }));
  };

  // 抽出可能な値のリストを作る
  const uniqueValues: { [key in keyof Reagent]?: string[] } = reagents.reduce((acc, reagent) => {
    (Object.keys(reagent) as (keyof Reagent)[]).forEach((key) => {
      if (!acc[key]) {
        acc[key] = [];
      }
      const val = String(reagent[key] ?? "");
      if (val && !acc[key]!.includes(val)) {
        acc[key]!.push(val);
      }
    });
    return acc;
  }, {} as { [key in keyof Reagent]?: string[] });

  // =========================
  // フィルタ + ソート
  // =========================
  const filteredAndSortedReagents = reagents
    .filter((reagent) => {
      // 既存のフィルタ
      let passes = Object.entries(selectedFilters).every(([key, value]) =>
        value ? String(reagent[key as keyof Reagent]).includes(value) : true
      );
      // 新たに、filterValueStockNonZero が true の場合、valueStock が 0 以外であるものだけ残す
      if (filterValueStockNonZero) {
        passes = passes && reagent.valueStock !== 0;
      }
      return passes;
    })
    .sort((a, b) => {
      if (!sortConfig) return 0;

      const aValue = (a[sortConfig.key] || '').toString().toLowerCase();
      const bValue = (b[sortConfig.key] || '').toString().toLowerCase();

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });


  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold my-4">ホーム</h1>
      <p className="text-xl font-bold my-4">＊月末残量に数値が入力されている試薬は、在庫数が0になっても発注しない試薬です。</p>

      {loadingData ? (
        <p>読み込み中...</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-200">
              <th className="p-2 border">
                <div
                  onClick={() => requestSort('name')}
                  style={getHeaderStyle('name')}
                  className="text-lg cursor-pointer"
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
              <th className="p-2 border">
                <div
                  onClick={() => requestSort('maxExpiry')}
                  style={getHeaderStyle('maxExpiry')}
                  className="text-lg cursor-pointer"
                >
                  最長使用期限
                </div>
                <select
                  value={selectedFilters.maxExpiry || ''}
                  onChange={(e) => handleFilterChange('maxExpiry', e.target.value)}
                  className="font-normal border border-gray-300 rounded w-full"
                >
                  <option value="">すべて</option>
                  {uniqueValues.maxExpiry?.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </th>
              <th
                className="p-2 border cursor-pointer flex flex-col items-center justify-center hover:bg-blue-50"
                onClick={() => setFilterValueStockNonZero(!filterValueStockNonZero)}
                title="クリックしてフィルターを切り替え"
              >
                <span>月末残量 {filterValueStockNonZero ? "(フィルタ中)" : ""}</span>
                <span className="mt-1 text-xs text-gray-500">クリックでソート</span>
              </th>
              <th className="p-2 border">発注の可否</th>
              <th className="p-2 border">発注数</th>
              <th className="p-2 border">
                <div
                  onClick={() => requestSort('location')}
                  style={getHeaderStyle('location')}
                  className="text-lg cursor-pointer"
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
                <td className="p-2 border">
                  {r.valueStock !== undefined && r.valueStock !== 0 ? r.valueStock : ""}
                </td>
                <td className="p-2 border">{r.orderStatus}</td>
                <td className="p-2 border">{r.orderQuantity}</td>
                <td className="p-2 border">{r.location}</td>
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
