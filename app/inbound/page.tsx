"use client";

import React, { useState, useEffect, useRef } from "react";
import { parseCode } from "../libs/parseCode";
import { parseNoGCode } from "../libs/parseNoGCode";

// Reagent 用の最低限の型
interface ReagentData {
  id?: number;
  name?: string | null;
  // 旧版では maxExpiry, stock, valueStock 等がありましたが、複数ロット管理ではLotが担う想定
  maxExpiry?: Date | null; // 既存コード互換のため一時的に
  stock?: number;         // 既存コード互換
  valueStock?: number;    // 既存コード互換
}

/**
 * 複数ロット管理においては Reagent 内で maxExpiry や stock を直接更新せず、
 * Lot テーブルでロット単位の在庫を扱う。
 */
export default function InboundPage() {
  // バーコードの入力
  const [scanValue, setScanValue] = useState("");
  const [scanNoGValue, setScanNoGValue] = useState("");

  // Popupや規格の入力（valueStock が 0以外ならポップアップを表示する）
  const [showPopup, setShowPopup] = useState(false);
  const [inputValueStock, setInputValueStock] = useState<number | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentReagentData, setCurrentReagentData] = useState<ReagentData | null>(null);

  const [currentProductNumber, setCurrentProductNumber] = useState("");
  const [currentLotNumber, setCurrentLotNumber] = useState("");
  const [currentExpiryDate, setCurrentExpiryDate] = useState<Date | null>(null);

  // フォーム入力での入庫用
  const [alphabetDocs, setAlphabetDocs] = useState<{ id: string; name: string }[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>("");
  const [manualLot, setManualLot] = useState<string>("");
  const [manualExpiry, setManualExpiry] = useState<string>("");

  // 入庫ボトル数の state（初期値 1）
  const [manualBottleCount, setManualBottleCount] = useState<number>(10);

  // GS1バーコード用 input 要素へのref
  const inputRef = useRef<HTMLInputElement>(null);

  // マウント時に input へフォーカス
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  /**
   * Firestore→Prisma 移行済み: アルファベットで始まる docID (productNumber) を取得
   * DBアクセスは API Route 経由が定番
   */
  useEffect(() => {
    const fetchAlphabetDocs = async () => {
      try {
        const res = await fetch("/api/reagents-alphabet");
        if (!res.ok) throw new Error("Failed to fetch reagents");
        const data = await res.json(); // data: { id, name }[]
        setAlphabetDocs(data);
      } catch (error) {
        console.error(error);
        setErrorMessage("DB からの取得に失敗しました。");
      }
    };
    fetchAlphabetDocs();
  }, []);

  // ========== GS1 バーコード用 入庫処理 ==========
  const handleIncoming = async () => {
    if (!scanValue) return;
    try {
      const { productNumber, lotNumber, expiryDate } = parseCode(scanValue);
      if (!productNumber) {
        throw new Error("productNumber が不正です。バーコードを正しくスキャンしてください。");
      }
      await commonIncomingLogic(productNumber, lotNumber, expiryDate);
    } catch (error: unknown) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : "不明なエラーが発生しました。");
    }
  };

  // ========== Roche バーコード用 入庫処理 ==========
  const handleNoGIncoming = async () => {
    if (!scanNoGValue) return;
    try {
      const { productNumber, lotNumber, expiryDate } = parseNoGCode(scanNoGValue);
      if (!productNumber) {
        throw new Error("productNumber が不正です。バーコードを正しくスキャンしてください。");
      }
      await commonIncomingLogic(productNumber, lotNumber, expiryDate);
    } catch (error: unknown) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : "不明なエラーが発生しました。");
    }
  };

  // ========== 選択＋手入力 での入庫処理 ==========
  const handleManualIncoming = async () => {
    if (!selectedDocId) {
      setErrorMessage("試薬を選択してください。");
      return;
    }
    if (!manualLot) {
      setErrorMessage("ロット番号を入力してください。");
      return;
    }
    if (!manualExpiry) {
      setErrorMessage("使用期限を入力してください。");
      return;
    }

    // YYYY-MM-DD 形式を Date に変換
    const [year, month, day] = manualExpiry.split("-");
    if (!year || !month || !day) {
      setErrorMessage("使用期限のフォーマットが不正です。YYYY-MM-DD形式で入力してください。");
      return;
    }
    const expiryDate = new Date(+year, +month - 1, +day);
    if (isNaN(expiryDate.getTime())) {
      setErrorMessage("使用期限の日付を正しく入力してください。");
      return;
    }

    try {
      // 入庫処理時、もし選択された試薬の名称が "Bond 6ml ボトル" または "Bond 30ml ボトル" なら、manualBottleCount も渡す
      const selectedDoc = alphabetDocs.find((doc) => doc.id === selectedDocId);
      const bottleCount = (selectedDoc && (selectedDoc.name === "Bond 6mL ボトル" || selectedDoc.name === "BOND 30mL ボトル" || selectedDoc.name === "PBS(免染手染め用)50mL"))
        ? manualBottleCount
        : undefined;
      await commonIncomingLogic(selectedDocId, manualLot, expiryDate, bottleCount);
      // 正常終了後にフォームをリセット
      setSelectedDocId("");
      setManualLot("");
      setManualExpiry("");
    } catch (error: unknown) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : "不明なエラーが発生しました。");
    }
  };

  /**
   * すべてのバーコード or 手入力に共通する入庫処理
   * 1) Reagentを取得 → 2) valueStockなどを確認 → 3) Lotにアップサート → 4) History記録
   */
  const commonIncomingLogic = async (productNumber: string, lotNumber: string, expiryDate: Date, bottleCount?: number) => {
    try {
      // 1) DBからReagentを取得
      const res = await fetch(`/api/reagents/${encodeURIComponent(productNumber)}`);
      if (!res.ok) throw new Error("該当する試薬が存在しません。先に登録してください。");
      const reagentData: ReagentData = await res.json();

      setCurrentProductNumber(productNumber);
      setCurrentLotNumber(lotNumber);
      setCurrentExpiryDate(expiryDate);
      setCurrentReagentData(reagentData);

      // 2) valueStock != 0 の場合はポップアップを表示（既存ロジックを維持）
      if (reagentData.valueStock !== 0 && reagentData.valueStock !== undefined) {
        setShowPopup(true);
        return;
      }

      // 3) ポップアップ不要なら、直接入庫を完了
      await completeIncoming(reagentData, lotNumber, expiryDate, productNumber, bottleCount);
    } catch (error: unknown) {
      console.error(error);
      throw error; // 上位で setErrorMessage
    }
  };

  // 実際の入庫処理 (Lot のアップサート + 履歴登録 など)
  const completeIncoming = async (
    reagentData: ReagentData,
    lotNumber: string,
    expiryDate: Date,
    productNumber: string,
    bottleCount?: number
  ) => {
    try {
      // 既存のロジック: maxExpiry の更新や stock + 1 などがあったが、
      // 複数ロット管理ではLotモデルを操作する想定
      // 例としてLotのupsert用API "/api/lots/inbound" を呼ぶ
      const body = {
        productNumber,
        lotNumber,
        expiryDate: expiryDate.toISOString(),
        inboundQuantity: bottleCount ?? 1,
        // inputValueStock等、ポップアップの値を活用するならここで
        inputValueStock,
      };

      // 例: /api/lots/inbound でLotを探してstock += inboundQuantityし、Historyにも登録するなど
      const res = await fetch("/api/lots/inbound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "入庫処理中にエラーが発生しました");
      }

      alert(
        `入庫が完了しました: [${productNumber}] ロット: ${lotNumber} 有効期限: ${expiryDate.toLocaleDateString()}`
      );

      // 入庫処理後のリセット
      setScanValue("");
      setScanNoGValue("");
      setShowPopup(false);
      setInputValueStock(null);
    } catch (error) {
      console.error(error);
      alert("入庫処理中にエラーが発生しました。");
    }
  };

  // // 日付比較: 既存ロジックを維持 (参考: maxExpiryの更新用)
  // const compareDates = (date1: Date, date2: Date): Date => {
  //   return date1 > date2 ? date1 : date2;
  // };

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold mb-6 text-center">入庫処理</h1>

      {/* GS1 バーコード用 */}
      <div className="border p-4 rounded-lg shadow-md mb-6 bg-blue-100">
        <h2 className="text-xl font-semibold mb-4">GS1 バーコードスキャン</h2>
        <div className="flex items-center space-x-4">
          <input
            ref={inputRef}
            type="text"
            className="border px-4 py-2 w-full max-w-md rounded-lg"
            placeholder="GS1 バーコードをスキャン"
            value={scanValue}
            onChange={(e) => setScanValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleIncoming();
            }}
          />
          <button
            onClick={handleIncoming}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            入庫
          </button>
        </div>
      </div>

      {/* Roche バーコード用 */}
      <div className="border p-4 rounded-lg shadow-md mb-6 bg-blue-100">
        <h2 className="text-xl font-semibold mb-4">Roche バーコードスキャン</h2>
        <div className="flex items-center space-x-4">
          <input
            type="text"
            className="border px-4 py-2 w-full max-w-md rounded-lg"
            placeholder="Roche バーコードをスキャン"
            value={scanNoGValue}
            onChange={(e) => setScanNoGValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleNoGIncoming();
            }}
          />
          <button
            onClick={handleNoGIncoming}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Roche試薬入庫
          </button>
        </div>
      </div>

      {/* その他入庫 */}
      <div className="border p-6 rounded-lg shadow-md bg-blue-100">
        <h2 className="text-xl font-semibold mb-4">その他入庫</h2>
        <p className="mb-4 text-gray-600">
          *GATA3, HNF4α, BondⅢ6ml 30mlボトル, 手染めPBS, VENTANAクリアオーバーレイ, 各種ラベルキット, ABC液, ABC二次抗体はこちら
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

        {/* 選択された試薬が Bond 6ml ボトル または Bond 30ml ボトルの場合は、入庫ボトル数の入力を表示 */}
        {selectedDocId &&
          (alphabetDocs.find((doc) => doc.id === selectedDocId)?.name === "Bond 6mL ボトル" ||
            alphabetDocs.find((doc) => doc.id === selectedDocId)?.name === "BOND 30mL ボトル" ||
            alphabetDocs.find((doc) => doc.id === selectedDocId)?.name === "PBS(免染手染め用)50mL") && (
            <div className="mb-4">
              <label className="block font-bold mb-1">入庫ボトル数:</label>
              <input
                type="number"
                className="border px-3 py-2 rounded-lg w-full max-w-md"
                value={manualBottleCount}
                onChange={(e) => setManualBottleCount(Number(e.target.value))}
              />
            </div>
          )}

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
            <div>
              <label className="block font-bold mb-1">使用期限 (YYYY-MM-DD):</label>
              <input
                type="date"
                className="border px-3 py-2 rounded-lg w-full max-w-md"
                value={manualExpiry}
                onChange={(e) => setManualExpiry(e.target.value)}
              />
            </div>
            <button
              onClick={handleManualIncoming}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              その他入庫
            </button>
          </div>
        )}
      </div>

      {/* 注意書き */}
      <p className="mt-6 text-sm text-gray-600">
        *Arginase-1, Bond Enzyme Pretreatment, DISH試薬, MSH2, MUC6, PD-L1(SP142)はまだ試薬登録していません。
        上記試薬入庫時は大島を呼んでください。
      </p>

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

      {/* valueStock 入力ポップアップ */}
      {showPopup && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-700 bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-bold mb-4">規格を入力してください</h2>
            <div className="mb-4">
              <label className="block mb-1 font-semibold">規格 (μL) ロシュ試薬はテスト数:</label>
              <input
                type="number"
                className="border px-3 py-2 w-full rounded-lg"
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
                    currentReagentData!,
                    currentLotNumber,
                    currentExpiryDate!,
                    currentProductNumber
                  )
                }
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                入庫を完了
              </button>
              <button
                onClick={() => {
                  setShowPopup(false);
                  setInputValueStock(null);
                }}
                className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
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




// "use client";

// import React, { useState, useEffect, useRef } from "react";
// import { parseCode } from "../libs/parseCode";
// import { parseNoGCode } from "../libs/parseNoGCode";
// // ↑ Next.jsのApp Routerでは、サーバーAPI or server actionが必要
// // なので実際には API Route を呼ぶ形が定番

// interface ReagentData {
//   maxExpiry?: Date | null;    // Firestore Timestamp → Date | null
//   stock?: number;
//   valueStock?: number;
// }

// export default function InboundPage() {
//   // バーコードの入力
//   const [scanValue, setScanValue] = useState("");
//   const [scanNoGValue, setScanNoGValue] = useState("");

//   // Popupや規格の入力
//   const [showPopup, setShowPopup] = useState(false);
//   const [inputValueStock, setInputValueStock] = useState<number | null>(null);

//   const [errorMessage, setErrorMessage] = useState<string | null>(null);
//   const [currentReagentData, setCurrentReagentData] = useState<ReagentData | null>(null);

//   const [currentProductNumber, setCurrentProductNumber] = useState("");
//   const [currentLotNumber, setCurrentLotNumber] = useState("");
//   const [currentExpiryDate, setCurrentExpiryDate] = useState<Date | null>(null);

//   // フォーム入力での入庫用
//   const [alphabetDocs, setAlphabetDocs] = useState<{ id: string; name: string }[]>([]);
//   const [selectedDocId, setSelectedDocId] = useState<string>(""); 
//   const [manualLot, setManualLot] = useState<string>("");
//   const [manualExpiry, setManualExpiry] = useState<string>("");

//   // input 要素へのref (GS1 バーコード用)
//   const inputRef = useRef<HTMLInputElement>(null);

//   // マウント時にinputへフォーカス
//   useEffect(() => {
//     inputRef.current?.focus();
//   }, []);

//   // Firestore→Prisma: アルファベットで始まる docID (productNumber) を取得
//   // DBアクセスはサーバーコンポーネント or API Route経由で行うのがNext.js 13の流儀
//   // ここでは簡易的にfetch("/api/reagents-alphabet")と呼ぶ例を示す
//   useEffect(() => {
//     const fetchAlphabetDocs = async () => {
//       try {
//         const res = await fetch("/api/reagents-alphabet");
//         if (!res.ok) throw new Error("Failed to fetch reagents");
//         const data = await res.json();
//         // data は { id, name }[] を想定
//         setAlphabetDocs(data);
//       } catch (error) {
//         console.error(error);
//         setErrorMessage("DB からの取得に失敗しました。");
//       }
//     };
//     fetchAlphabetDocs();
//   }, []);

//   // GS1 バーコード用 入庫処理
//   const handleIncoming = async () => {
//     if (!scanValue) return;
//     try {
//       const { productNumber, lotNumber, expiryDate } = parseCode(scanValue);
//       if (!productNumber) {
//         throw new Error("productNumber が不正です。バーコードを正しくスキャンしてください。");
//       }
//       await commonIncomingLogic(productNumber, lotNumber, expiryDate);
//     } catch (error: unknown) {
//       console.error(error);
//       setErrorMessage(error instanceof Error ? error.message : "不明なエラーが発生しました。");
//     }
//   };

//   // Roche バーコード用 入庫処理
//   const handleNoGIncoming = async () => {
//     if (!scanNoGValue) return;
//     try {
//       const { productNumber, lotNumber, expiryDate } = parseNoGCode(scanNoGValue);
//       if (!productNumber) {
//         throw new Error("productNumber が不正です。バーコードを正しくスキャンしてください。");
//       }
//       await commonIncomingLogic(productNumber, lotNumber, expiryDate);
//     } catch (error: unknown) {
//       console.error(error);
//       setErrorMessage(error instanceof Error ? error.message : "不明なエラーが発生しました。");
//     }
//   };

//   // 選択＋手入力 での入庫処理
//   const handleManualIncoming = async () => {
//     if (!selectedDocId) {
//       setErrorMessage("試薬を選択してください。");
//       return;
//     }
//     if (!manualLot) {
//       setErrorMessage("ロット番号を入力してください。");
//       return;
//     }
//     if (!manualExpiry) {
//       setErrorMessage("使用期限を入力してください。");
//       return;
//     }

//     // YYYY-MM-DD 形式を Date に変換
//     const [year, month, day] = manualExpiry.split("-");
//     if (!year || !month || !day) {
//       setErrorMessage("使用期限のフォーマットが不正です。YYYY-MM-DD形式で入力してください。");
//       return;
//     }
//     const expiryDate = new Date(+year, +month - 1, +day);
//     if (isNaN(expiryDate.getTime())) {
//       setErrorMessage("使用期限の日付を正しく入力してください。");
//       return;
//     }

//     try {
//       await commonIncomingLogic(selectedDocId, manualLot, expiryDate);
//       // 正常終了後にフォームをリセット
//       setSelectedDocId("");
//       setManualLot("");
//       setManualExpiry("");
//     } catch (error: unknown) {
//       console.error(error);
//       setErrorMessage(error instanceof Error ? error.message : "不明なエラーが発生しました。");
//     }
//   };

//   /**
//    * すべてのバーコード or 手入力に共通する入庫処理
//    */
//   const commonIncomingLogic = async (productNumber: string, lotNumber: string, expiryDate: Date) => {
//     // 1) DBからReagentを取得
//     //    ここでは /api/reagents/[productNumber] をGETしてReagent情報を取得する例
//     try {
//       const res = await fetch(`/api/reagents/${encodeURIComponent(productNumber)}`);
//       if (!res.ok) throw new Error("該当する試薬が存在しません。先に登録してください。");
//       const reagentData: ReagentData = await res.json();

//       // 2) ステートに保存し、valueStock が 0以外ならpopup表示
//       setCurrentProductNumber(productNumber);
//       setCurrentLotNumber(lotNumber);
//       setCurrentExpiryDate(expiryDate);
//       setCurrentReagentData(reagentData);

//       if (reagentData.valueStock !== 0 && reagentData.valueStock !== undefined) {
//         setShowPopup(true);
//         return;
//       }

//       await completeIncoming(reagentData, lotNumber, expiryDate, productNumber);
//     } catch (error: unknown) {
//       console.error(error);
//       throw error; // 上位でsetErrorMessage
//     }
//   };

//   // 実際の入庫処理 (DB更新 + 履歴追加)
//   const completeIncoming = async (
//     reagentData: ReagentData,
//     lotNumber: string,
//     expiryDate: Date,
//     productNumber: string
//   ) => {
//     try {
//       const currentMaxExpiry = reagentData.maxExpiry
//         ? new Date(reagentData.maxExpiry)
//         : new Date("2000-01-01");
//       const newMaxExpiry = compareDates(expiryDate, currentMaxExpiry);
//       const newStock = (reagentData.stock || 0) + 1;

//       // ここでサーバーサイドに update + history 作成を依頼
//       // 例えば /api/inbound POST など
//       const res = await fetch("/api/inbound", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           productNumber,
//           lotNumber,
//           newMaxExpiry,
//           newStock,
//           inputValueStock,
//         }),
//       });
//       if (!res.ok) throw new Error("入庫処理中にエラーが発生しました。");
      
//       alert(`入庫が完了しました: [${productNumber}] ロット: ${lotNumber}`);
//       setScanValue("");
//       setScanNoGValue("");
//       setShowPopup(false);
//       setInputValueStock(null);
//     } catch (error) {
//       console.error(error);
//       alert("入庫処理中にエラーが発生しました。");
//     }
//   };

//   // 日付比較
//   const compareDates = (date1: Date, date2: Date): Date => {
//     return date1 > date2 ? date1 : date2;
//   };

//   return (
//     <div className="container mx-auto px-4 py-6">
//       <h1 className="text-3xl font-bold mb-6 text-center">入庫処理 (Prisma版)</h1>

//       {/* GS1 バーコード用 */}
//       <div className="border p-4 rounded-lg shadow-md mb-6 bg-gray-50">
//         <h2 className="text-xl font-semibold mb-4">GS1 バーコードスキャン</h2>
//         <div className="flex items-center space-x-4">
//           <input
//             ref={inputRef}
//             type="text"
//             className="border px-4 py-2 w-full max-w-md rounded-lg"
//             placeholder="GS1 バーコードをスキャン"
//             value={scanValue}
//             onChange={(e) => setScanValue(e.target.value)}
//             onKeyDown={(e) => {
//               if (e.key === "Enter") handleIncoming();
//             }}
//           />
//           <button
//             onClick={handleIncoming}
//             className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
//           >
//             入庫
//           </button>
//         </div>
//       </div>

//       {/* Roche バーコード用 */}
//       <div className="border p-4 rounded-lg shadow-md mb-6 bg-gray-50">
//         <h2 className="text-xl font-semibold mb-4">Roche バーコードスキャン</h2>
//         <div className="flex items-center space-x-4">
//           <input
//             type="text"
//             className="border px-4 py-2 w-full max-w-md rounded-lg"
//             placeholder="Roche バーコードをスキャン"
//             value={scanNoGValue}
//             onChange={(e) => setScanNoGValue(e.target.value)}
//             onKeyDown={(e) => {
//               if (e.key === "Enter") handleNoGIncoming();
//             }}
//           />
//           <button
//             onClick={handleNoGIncoming}
//             className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
//           >
//             Roche試薬入庫
//           </button>
//         </div>
//       </div>

//       {/* その他入庫 */}
//       <div className="border p-6 rounded-lg shadow-md bg-gray-50">
//         <h2 className="text-xl font-semibold mb-4">その他入庫</h2>
//         <p className="mb-4 text-gray-600">
//         *GATA3, HNF4α, BondⅢ6ml 30mlボトル, 手染めPBS, VENTANAクリアオーバーレイ, 各種ラベルキット, ABC液, ABC二次抗体はこちら
//         </p>
//         <div className="flex items-center space-x-4 mb-4">
//           <label className="font-bold">試薬選択:</label>
//           <select
//             value={selectedDocId}
//             onChange={(e) => setSelectedDocId(e.target.value)}
//             className="border px-3 py-2 rounded-lg"
//           >
//             <option value="">-- 選択してください --</option>
//             {alphabetDocs.map((doc) => (
//               <option key={doc.id} value={doc.id}>
//                 {doc.name || doc.id}
//               </option>
//             ))}
//           </select>
//         </div>

//         {selectedDocId && (
//           <div className="space-y-4">
//             <div>
//               <label className="block font-bold mb-1">ロット番号:</label>
//               <input
//                 type="text"
//                 className="border px-3 py-2 rounded-lg w-full max-w-md"
//                 value={manualLot}
//                 onChange={(e) => setManualLot(e.target.value)}
//               />
//             </div>
//             <div>
//               <label className="block font-bold mb-1">使用期限 (YYYY-MM-DD):</label>
//               <input
//                 type="date"
//                 className="border px-3 py-2 rounded-lg w-full max-w-md"
//                 value={manualExpiry}
//                 onChange={(e) => setManualExpiry(e.target.value)}
//               />
//             </div>
//             <button
//               onClick={handleManualIncoming}
//               className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
//             >
//               その他入庫
//             </button>
//           </div>
//         )}
//       </div>

//       {/* 注意書き */}
//       <p className="mt-6 text-sm text-gray-600">
//       *Arginase-1, Bond Enzyme Pretreatment, DISH試薬, MSH2, MUC6, PD-L1(SP142)はまだ試薬登録していません。
//       上記試薬入庫時は大島を呼んでください。
//       </p>

//       {/* エラーメッセージ */}
//       {errorMessage && (
//         <div className="fixed inset-0 flex items-center justify-center bg-gray-700 bg-opacity-50">
//           <div className="bg-white p-6 rounded-lg shadow-lg max-w-md text-center">
//             <h2 className="text-xl font-bold text-red-600 mb-4">エラー</h2>
//             <p className="mb-6">{errorMessage}</p>
//             <button
//               onClick={() => setErrorMessage(null)}
//               className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
//             >
//               閉じる
//             </button>
//           </div>
//         </div>
//       )}

//       {/* valueStock 入力ポップアップ */}
//       {showPopup && (
//         <div className="fixed inset-0 flex items-center justify-center bg-gray-700 bg-opacity-50">
//           <div className="bg-white p-6 rounded-lg shadow-lg">
//             <h2 className="text-xl font-bold mb-4">規格を入力してください</h2>
//             <div className="mb-4">
//               <label className="block mb-1 font-semibold">規格 (μL) ロシュ試薬はテスト数:</label>
//               <input
//                 type="number"
//                 className="border px-3 py-2 w-full rounded-lg"
//                 value={inputValueStock ?? ""}
//                 onChange={(e) =>
//                   setInputValueStock(e.target.value ? Number(e.target.value) : null)
//                 }
//               />
//             </div>
//             <div className="flex space-x-4">
//               <button
//                 onClick={() =>
//                   completeIncoming(
//                     currentReagentData!,
//                     currentLotNumber,
//                     currentExpiryDate!,
//                     currentProductNumber
//                   )
//                 }
//                 className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
//               >
//                 入庫を完了
//               </button>
//               <button
//                 onClick={() => {
//                   setShowPopup(false);
//                   setInputValueStock(null);
//                 }}
//                 className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
//               >
//                 キャンセル
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }
