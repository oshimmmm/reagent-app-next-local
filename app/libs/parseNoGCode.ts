// libs/parseCode.ts
export interface ParsedCode {
    productNumber: string;
    lotNumber: string;
    expiryDate: Date;
    expiryDateString: string; // YYYY-MM-DD 形式を想定
  }


  export function parseNoGCode(code: string): ParsedCode {
    // 例: AI(01)にプロダクト番号、AI(17)に有効期限、AI(10)にロット、など
    // 本番では正規表現やGS1ライブラリなどを用いて解析

    const productNumber = code.substring(2, 16);
    // ロットナンバー
    const lotNumber = code.substring(19, 24); 
  
    // 有効期限
    const expiration = code.substring(27, 34);
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
  