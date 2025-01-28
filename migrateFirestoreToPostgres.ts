// migrateFirestoreToPostgres.ts

import admin from 'firebase-admin'
import { getFirestore } from 'firebase-admin/firestore'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Firebase Admin の初期化
  admin.initializeApp({
    credential: admin.credential.cert(require('./firebaseServiceAccountKey.json')),
  })

  const firestore = getFirestore()

  // Firestoreのデータを読み込み → PostgreSQLへ保存
  await migrateReagents(firestore)
  await migrateHistories(firestore)

  console.log('Migration completed!')
}

main()
  .catch((e) => {
    console.error(e)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

async function migrateReagents(firestore: FirebaseFirestore.Firestore) {
  const snapshot = await firestore.collection('reagents').get()
  for (const doc of snapshot.docs) {
    const data = doc.data()
    // Firestoreのフィールドを取得
    const {
      currentLot,
      location,
      maxExpiry,
      name,
      noOrderOnZeroStock,
      orderDate,
      orderQuantity,
      orderTriggerExpiry,
      orderTriggerStock,
      orderTriggerValueStock,
      orderValue,
      stock,
      valueStock,
    } = data

    // Firestoreのdoc.id が productNumber だった場合
    const productNumber = doc.id

    // maxExpiry 等が Timestampの場合は Dateに変換
    // Firestore Timestamp は .toDate() でJavaScriptのDateオブジェクトへ
    const maxExpiryDate = maxExpiry ? maxExpiry.toDate() : null
    const orderDateVal = orderDate ? orderDate.toDate() : null

    // Prismaを使ってPostgreSQLへINSERT
    await prisma.reagent.create({
      data: {
        productNumber,
        currentLot: currentLot || null,
        location: location || null,
        maxExpiry: maxExpiryDate,
        name: name || null,
        noOrderOnZeroStock: noOrderOnZeroStock ?? false,
        orderDate: orderDateVal,
        orderQuantity: orderQuantity ?? 0,
        orderTriggerExpiry: orderTriggerExpiry ?? false,
        orderTriggerStock: orderTriggerStock ?? 0,
        orderTriggerValueStock: orderTriggerValueStock, // null or number
        orderValue: orderValue || null,
        stock: stock ?? 0,
        valueStock: valueStock ?? 0,
      },
    })
  }
  console.log(`Reagents migrated: ${snapshot.size}`)
}

async function migrateHistories(firestore: FirebaseFirestore.Firestore) {
  const snapshot = await firestore.collection('histories').get()
  for (const doc of snapshot.docs) {
    const data = doc.data()
    const {
      actionType,
      date,
      lotNumber,
      productNumber,
    } = data

    // date はタイムスタンプなら変換
    const dateVal = date ? date.toDate() : new Date()

    // Reagent との関連付けが必要なら、productNumber で Reagent のid を取得
    // ※ Reagentモデルで productNumber を unique 指定している想定
    const reagent = await prisma.reagent.findUnique({
      where: { productNumber },
    })

    // PostgreSQLへINSERT
    await prisma.history.create({
      data: {
        actionType: actionType || '',
        date: dateVal,
        lotNumber: lotNumber || '',
        productNumber: productNumber || '',
        reagentId: reagent?.id, // リレーション確立
      },
    })
  }
  console.log(`Histories migrated: ${snapshot.size}`)
}