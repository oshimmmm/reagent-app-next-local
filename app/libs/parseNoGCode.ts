// libs/parseNoGCode.ts
export interface ParsedCode {
  productNumber: string;
  lotNumber: string;
  expiryDate: Date;
  expiryDateString: string; // YYYY-MM-DD 形式を想定
}

export function parseNoGCode(code: string): ParsedCode {
  // フォーマット1 (元の Roche コードフォーマット)
  const format1Regex = /^01\d{14}10([A-Z]{1}\d{5}|\d{8})17\d{6}.+$/;

  // フォーマット2 (新しいフォーマット)
  const format2Regex = /^01\d{14}10[A-Z]\d{7}11\d{6}17\d{6}.+$/;

  // コードがフォーマット1またはフォーマット2に一致しなければエラー
  if (!format1Regex.test(code) && !format2Regex.test(code)) {
    throw new Error("入力されたコードは有効な Roche コードではありません。");
  }

  // 商品番号を抽出
  const productNumber = code.substring(2, 16);

  // ロット番号と有効期限の抽出
  let lotNumber = "";
  let expiryDate: Date = new Date(0);
  let expiryDateString = "";

  if (format1Regex.test(code)) {
    // フォーマット1の処理
    const lotStartIndex = 16 + 2; // "10" の直後
    const lotRaw = code.substring(lotStartIndex, lotStartIndex + 8);

    // ロット番号判定
    if (/^[A-Z]\d{5}$/.test(lotRaw.substring(0, 6))) {
      lotNumber = lotRaw.substring(0, 6); // 6文字ロット
    } else if (/^\d{8}$/.test(lotRaw)) {
      lotNumber = lotRaw.substring(0, 8); // 8桁ロット
    } else {
      throw new Error("ロット番号が無効です。");
    }

    // 有効期限
    const expirationStartIndex = lotStartIndex + lotNumber.length + 2; // "17" の直後
    const expiration = code.substring(expirationStartIndex, expirationStartIndex + 6);
    expiryDate = parseExpiration(expiration);
    expiryDateString = expiryDate.toISOString().split("T")[0]; // YYYY-MM-DD

  } else if (format2Regex.test(code)) {
    // フォーマット2の処理
    const lotStartIndex = 16 + 2; // "10" の直後
    lotNumber = code.substring(lotStartIndex, lotStartIndex + 8); // 8文字ロット

    // 有効期限
    const expirationStartIndex = lotStartIndex + 8 + 2 + 6 + 2; // "17" の直後
    const expiration = code.substring(expirationStartIndex, expirationStartIndex + 6);
    expiryDate = parseExpiration(expiration);
    expiryDateString = expiryDate.toISOString().split("T")[0]; // YYYY-MM-DD

  }

  // 結果を返す
  return {
    productNumber,
    lotNumber,
    expiryDate,
    expiryDateString,
  };
}

// 有効期限を解析して Date オブジェクトを返す関数
function parseExpiration(expiration: string): Date {
  const expYear = parseInt("20" + expiration.substring(0, 2), 10); // 20XX年
  const expMonth = parseInt(expiration.substring(2, 4), 10); // 月
  const expDay = parseInt(expiration.substring(4, 6), 10); // 日
  return new Date(Date.UTC(expYear, expMonth - 1, expDay)); // 月は0始まり
}
