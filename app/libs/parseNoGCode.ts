// libs/parseNoGCode.ts

export interface ParsedCode {
  productNumber: string;
  lotNumber: string;
  expiryDate: Date;
  expiryDateString: string; // YYYY-MM-DD
}

/**
 * Roche製試薬のバーコードから情報を抽出する。フォーマット1（旧フォーマット: 6文字ロット/7文字ロット/8桁ロット）
 * またはフォーマット2（新フォーマット: 8文字ロット＋11情報）に対応。
 */
export function parseNoGCode(code: string): ParsedCode {
  // 商品番号 (GTIN 部分)：先頭2文字を除いた次の14文字
  const productNumber = code.substring(2, 16);

  // フォーマット1: 10 + (6桁ロット|7文字ロット|8桁ロット) + 17 + 有効期限(6桁)
  const format1Regex = /^01\d{14}10([A-Z]\d{5}[A-Z]|[A-Z]\d{5}|\d{8})17(\d{6}).+$/;
  // フォーマット2: 10 + 8文字ロット + 11 + 任意6桁 + 17 + 有効期限(6桁)
  const format2Regex = /^01\d{14}10([A-Z]\d{7})11\d{6}17(\d{6}).+$/;

  let lotNumber: string;
  let expirationStr: string;

  const m1 = code.match(format1Regex);
  if (m1) {
    lotNumber     = m1[1];         // 6桁 or 7文字 or 8桁ロット
    expirationStr = m1[2];         // YYMMDD
  } else {
    const m2 = code.match(format2Regex);
    if (!m2) {
      throw new Error("入力されたコードは有効な Roche コードではありません。");
    }
    lotNumber     = m2[1];         // 8文字ロット
    expirationStr = m2[2];         // YYMMDD
  }

  const expiryDate = parseExpiration(expirationStr);
  const expiryDateString = expiryDate.toISOString().split("T")[0];  // YYYY-MM-DD

  return { productNumber, lotNumber, expiryDate, expiryDateString };
}

/**
 * YYMMDD 形式の文字列を UTC Date に変換 (月は0始まり)
 */
function parseExpiration(exp: string): Date {
  const year  = parseInt("20" + exp.substring(0, 2), 10);
  const month = parseInt(exp.substring(2, 4), 10);
  const day   = parseInt(exp.substring(4, 6), 10);
  return new Date(Date.UTC(year, month - 1, day));
}
