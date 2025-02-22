"use client";

import React, { useState } from "react";

export default function BackupPage() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handleBackup = () => {
    if (!startDate || !endDate) {
      alert("開始日と終了日を指定してください。");
      return;
    }
    // API ルートにクエリパラメータ付きでリダイレクトすると、ブラウザはダウンロードを開始します
    const url = `/api/backups?start=${encodeURIComponent(
      startDate
    )}&end=${encodeURIComponent(endDate)}`;
    window.location.href = url;
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <h1 className="text-3xl font-bold mb-6 text-center">バックアップ作成</h1>
      <div className="max-w-md mx-auto">
        <div className="mb-4">
          <label className="block font-semibold mb-1">開始日</label>
          <input
            type="date"
            className="border rounded px-3 py-2 w-full"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="mb-4">
          <label className="block font-semibold mb-1">終了日</label>
          <input
            type="date"
            className="border rounded px-3 py-2 w-full"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <button
          onClick={handleBackup}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          バックアップ作成＆ダウンロード
        </button>
      </div>
    </div>
  );
}
