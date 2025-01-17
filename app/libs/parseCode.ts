// libs/parseCode.ts
export interface ParsedCode {
    productNumber: string;
    lotNumber: string;
    expiryDate: Date;
    expiryDateString: string; // YYYY-MM-DD 形式を想定
  }
  
/**
 * GS1コードのフォーマットから、プロダクト番号 / 有効期限 / ロット番号を抽出。
 * フォーマット:
 *   01 + [14桁のプロダクト番号] + 17 + [6桁の有効期限] + 10 + [残りの文字列: ロット番号]
 */
  export function parseCode(gs1code: string): ParsedCode {
    // 例: AI(01)にプロダクト番号、AI(17)に有効期限、AI(10)にロット、など
    // 本番では正規表現やGS1ライブラリなどを用いて解析
  
    console.log("gs1code:", gs1code);

    // フォーマット検証（例: GS1 フォーマットにマッチするか）
    const gs1Regex = /^01\d{14}17\d{6}10.+$/;
    if (!gs1Regex.test(gs1code)) {
      throw new Error("入力されたコードは有効な GS1 コードではありません。");
    }

    const productNumber = gs1code.substring(2, 16);
    console.log("productNumber:", productNumber);
    // ロットナンバー
    const lotNumber = gs1code.substring(26); 
  
    // 有効期限
    const expiration = gs1code.substring(18, 24);
    console.log("expiration", expiration);
    const expYear = parseInt('20' + expiration.substring(0, 2), 10); // 20XX年
    const expMonth = parseInt(expiration.substring(2, 4), 10); // 月
    const expDay = parseInt(expiration.substring(4, 6), 10); // 日
    const expiryDate = new Date(Date.UTC(expYear, expMonth - 1, expDay)); // 月は0始まり
    const expiryDateString = expiryDate.toISOString(); // 'YYYY-MM-DDTHH:mm:ss.sssZ'
    // 一旦ダミーで以下のように返す
    return {
      productNumber, // docIdとする
      lotNumber,
      expiryDateString,
      expiryDate,
    };
  }
  