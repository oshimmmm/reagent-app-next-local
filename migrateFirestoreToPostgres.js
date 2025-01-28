"use strict";
// migrateFirestoreToPostgres.ts
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var firebase_admin_1 = require("firebase-admin");
var firestore_1 = require("firebase-admin/firestore");
var client_1 = require("@prisma/client");
var prisma = new client_1.PrismaClient();
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var firestore;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    // Firebase Admin の初期化
                    firebase_admin_1.default.initializeApp({
                        credential: firebase_admin_1.default.credential.cert(require('./firebaseServiceAccountKey.json')),
                    });
                    firestore = (0, firestore_1.getFirestore)();
                    // Firestoreのデータを読み込み → PostgreSQLへ保存
                    return [4 /*yield*/, migrateReagents(firestore)];
                case 1:
                    // Firestoreのデータを読み込み → PostgreSQLへ保存
                    _a.sent();
                    return [4 /*yield*/, migrateHistories(firestore)];
                case 2:
                    _a.sent();
                    console.log('Migration completed!');
                    return [2 /*return*/];
            }
        });
    });
}
main()
    .catch(function (e) {
    console.error(e);
})
    .finally(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.$disconnect()];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
function migrateReagents(firestore) {
    return __awaiter(this, void 0, void 0, function () {
        var snapshot, _i, _a, doc, data, currentLot, location_1, maxExpiry, name_1, noOrderOnZeroStock, orderDate, orderQuantity, orderTriggerExpiry, orderTriggerStock, orderTriggerValueStock, orderValue, stock, valueStock, productNumber, maxExpiryDate, orderDateVal;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, firestore.collection('reagents').get()];
                case 1:
                    snapshot = _b.sent();
                    _i = 0, _a = snapshot.docs;
                    _b.label = 2;
                case 2:
                    if (!(_i < _a.length)) return [3 /*break*/, 5];
                    doc = _a[_i];
                    data = doc.data();
                    currentLot = data.currentLot, location_1 = data.location, maxExpiry = data.maxExpiry, name_1 = data.name, noOrderOnZeroStock = data.noOrderOnZeroStock, orderDate = data.orderDate, orderQuantity = data.orderQuantity, orderTriggerExpiry = data.orderTriggerExpiry, orderTriggerStock = data.orderTriggerStock, orderTriggerValueStock = data.orderTriggerValueStock, orderValue = data.orderValue, stock = data.stock, valueStock = data.valueStock;
                    productNumber = doc.id;
                    maxExpiryDate = maxExpiry ? maxExpiry.toDate() : null;
                    orderDateVal = orderDate ? orderDate.toDate() : null;
                    // Prismaを使ってPostgreSQLへINSERT
                    return [4 /*yield*/, prisma.reagent.create({
                            data: {
                                productNumber: productNumber,
                                currentLot: currentLot || null,
                                location: location_1 || null,
                                maxExpiry: maxExpiryDate,
                                name: name_1 || null,
                                noOrderOnZeroStock: noOrderOnZeroStock !== null && noOrderOnZeroStock !== void 0 ? noOrderOnZeroStock : false,
                                orderDate: orderDateVal,
                                orderQuantity: orderQuantity !== null && orderQuantity !== void 0 ? orderQuantity : 0,
                                orderTriggerExpiry: orderTriggerExpiry !== null && orderTriggerExpiry !== void 0 ? orderTriggerExpiry : false,
                                orderTriggerStock: orderTriggerStock !== null && orderTriggerStock !== void 0 ? orderTriggerStock : 0,
                                orderTriggerValueStock: orderTriggerValueStock, // null or number
                                orderValue: orderValue || null,
                                stock: stock !== null && stock !== void 0 ? stock : 0,
                                valueStock: valueStock !== null && valueStock !== void 0 ? valueStock : 0,
                            },
                        })];
                case 3:
                    // Prismaを使ってPostgreSQLへINSERT
                    _b.sent();
                    _b.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 2];
                case 5:
                    console.log("Reagents migrated: ".concat(snapshot.size));
                    return [2 /*return*/];
            }
        });
    });
}
function migrateHistories(firestore) {
    return __awaiter(this, void 0, void 0, function () {
        var snapshot, _i, _a, doc, data, actionType, date, lotNumber, productNumber, dateVal, reagent;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, firestore.collection('histories').get()];
                case 1:
                    snapshot = _b.sent();
                    _i = 0, _a = snapshot.docs;
                    _b.label = 2;
                case 2:
                    if (!(_i < _a.length)) return [3 /*break*/, 6];
                    doc = _a[_i];
                    data = doc.data();
                    actionType = data.actionType, date = data.date, lotNumber = data.lotNumber, productNumber = data.productNumber;
                    dateVal = date ? date.toDate() : new Date();
                    return [4 /*yield*/, prisma.reagent.findUnique({
                            where: { productNumber: productNumber },
                        })
                        // PostgreSQLへINSERT
                    ];
                case 3:
                    reagent = _b.sent();
                    // PostgreSQLへINSERT
                    return [4 /*yield*/, prisma.history.create({
                            data: {
                                actionType: actionType || '',
                                date: dateVal,
                                lotNumber: lotNumber || '',
                                productNumber: productNumber || '',
                                reagentId: reagent === null || reagent === void 0 ? void 0 : reagent.id, // リレーション確立
                            },
                        })];
                case 4:
                    // PostgreSQLへINSERT
                    _b.sent();
                    _b.label = 5;
                case 5:
                    _i++;
                    return [3 /*break*/, 2];
                case 6:
                    console.log("Histories migrated: ".concat(snapshot.size));
                    return [2 /*return*/];
            }
        });
    });
}
