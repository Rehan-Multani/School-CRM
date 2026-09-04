import mongoose from 'mongoose';

export const ASSET_CONDITIONS = ['NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED'];
export const ASSET_STATUSES = ['IN_STORE', 'ISSUED', 'UNDER_REPAIR', 'WRITTEN_OFF'];
export const STOCK_MOVEMENT_TYPES = ['ISSUE', 'RETURN', 'ADJUST', 'WRITE_OFF'];

const assetSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true,
    },
    assetCode: { type: String, required: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'AssetCategory', default: null, index: true },
    categoryName: { type: String, default: '', trim: true },
    quantity: { type: Number, default: 1, min: 0 },
    issuedQuantity: { type: Number, default: 0, min: 0 },
    unit: { type: String, default: 'pcs', trim: true },
    location: { type: String, default: '', trim: true },
    custodianName: { type: String, default: '', trim: true },
    purchaseDate: { type: Date, default: null },
    unitCost: { type: Number, default: 0, min: 0 },
    vendor: { type: String, default: '', trim: true },
    condition: { type: String, enum: ASSET_CONDITIONS, default: 'GOOD' },
    status: { type: String, enum: ASSET_STATUSES, default: 'IN_STORE', index: true },
    warrantyExpiry: { type: Date, default: null },
    notes: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

assetSchema.index({ schoolId: 1, assetCode: 1 }, { unique: true });
assetSchema.index({ schoolId: 1, createdAt: -1 });

assetSchema.methods.toPublicJSON = function toPublicJSON() {
  const available = Math.max(0, (this.quantity || 0) - (this.issuedQuantity || 0));
  return {
    id: this._id.toString(),
    schoolId: this.schoolId.toString(),
    assetCode: this.assetCode,
    name: this.name,
    categoryId: this.categoryId ? this.categoryId.toString() : null,
    categoryName: this.categoryName || '',
    quantity: this.quantity,
    issuedQuantity: this.issuedQuantity,
    availableQuantity: available,
    unit: this.unit || 'pcs',
    location: this.location || '',
    custodianName: this.custodianName || '',
    purchaseDate: this.purchaseDate,
    unitCost: this.unitCost || 0,
    totalValue: (this.unitCost || 0) * (this.quantity || 0),
    vendor: this.vendor || '',
    condition: this.condition,
    status: this.status,
    warrantyExpiry: this.warrantyExpiry,
    notes: this.notes || '',
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

const stockMovementSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    assetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: true, index: true },
    assetName: { type: String, default: '', trim: true },
    type: { type: String, enum: STOCK_MOVEMENT_TYPES, required: true },
    qty: { type: Number, required: true },
    balanceAfter: { type: Number, default: 0 },
    toWhom: { type: String, default: '', trim: true },
    byName: { type: String, default: '', trim: true },
    note: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

stockMovementSchema.index({ schoolId: 1, createdAt: -1 });

stockMovementSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    assetId: this.assetId.toString(),
    assetName: this.assetName || '',
    type: this.type,
    qty: this.qty,
    balanceAfter: this.balanceAfter,
    toWhom: this.toWhom || '',
    byName: this.byName || '',
    note: this.note || '',
    createdAt: this.createdAt,
  };
};

export const Asset = mongoose.model('Asset', assetSchema);
export const StockMovement = mongoose.model('StockMovement', stockMovementSchema);
