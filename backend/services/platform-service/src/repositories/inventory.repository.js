import mongoose from 'mongoose';
import { Asset, AssetCategory, StockMovement } from '../models/Asset.js';
import { escapeRegex, sanitizePagination } from '../../../shared/sanitize.js';

class InventoryRepository {
  // ---- categories ----
  async listCategories(schoolId) {
    const sId = new mongoose.Types.ObjectId(schoolId);
    const [cats, counts] = await Promise.all([
      AssetCategory.find({ schoolId }).sort({ name: 1 }),
      Asset.aggregate([{ $match: { schoolId: sId } }, { $group: { _id: '$categoryId', count: { $sum: 1 } } }]),
    ]);
    const map = {};
    counts.forEach((c) => {
      if (c._id) map[c._id.toString()] = c.count;
    });
    return cats.map((c) => c.toPublicJSON({ assetCount: map[c._id.toString()] || 0 }));
  }

  findCategoryById(schoolId, id) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return AssetCategory.findOne({ schoolId, _id: id });
  }

  findCategoryByName(schoolId, name) {
    return AssetCategory.findOne({ schoolId, name: new RegExp(`^${escapeRegex(name.trim())}$`, 'i') });
  }

  createCategory(schoolId, data) {
    return AssetCategory.create({ ...data, schoolId });
  }

  updateCategory(schoolId, id, data) {
    return AssetCategory.findOneAndUpdate({ schoolId, _id: id }, { $set: data }, { new: true });
  }

  deleteCategory(schoolId, id) {
    return AssetCategory.findOneAndDelete({ schoolId, _id: id });
  }

  countAssetsInCategory(schoolId, categoryId) {
    return Asset.countDocuments({ schoolId, categoryId });
  }

  // ---- assets ----
  async listAssets(schoolId, query = {}) {
    const filter = { schoolId };
    if (query.categoryId) filter.categoryId = query.categoryId;
    if (query.status && query.status !== 'ALL') filter.status = String(query.status).toUpperCase();
    if (query.condition && query.condition !== 'ALL') filter.condition = String(query.condition).toUpperCase();
    if (query.location) filter.location = new RegExp(escapeRegex(query.location.trim()), 'i');
    if (query.search?.trim()) {
      const regex = new RegExp(escapeRegex(query.search.trim()), 'i');
      filter.$or = [{ name: regex }, { assetCode: regex }, { vendor: regex }, { custodianName: regex }];
    }
    const { page, limit, skip } = sanitizePagination({
      page: query.page,
      limit: query.limit,
      defaultLimit: 100,
      maxLimit: 500,
    });
    const [items, total] = await Promise.all([
      Asset.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Asset.countDocuments(filter),
    ]);
    return { items: items.map((i) => i.toPublicJSON()), total, page, limit };
  }

  findAssetById(schoolId, id) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return Asset.findOne({ schoolId, _id: id });
  }

  findAssetByCode(schoolId, code) {
    return Asset.findOne({ schoolId, assetCode: String(code).toUpperCase() });
  }

  createAsset(schoolId, data) {
    return Asset.create({ ...data, schoolId });
  }

  updateAsset(schoolId, id, data) {
    return Asset.findOneAndUpdate({ schoolId, _id: id }, { $set: data }, { new: true });
  }

  deleteAsset(schoolId, id) {
    return Asset.findOneAndDelete({ schoolId, _id: id });
  }

  // ---- movements ----
  createMovement(schoolId, data) {
    return StockMovement.create({ ...data, schoolId });
  }

  async listMovements(schoolId, query = {}) {
    const filter = { schoolId };
    if (query.assetId) filter.assetId = query.assetId;
    if (query.type && query.type !== 'ALL') filter.type = String(query.type).toUpperCase();
    const { page, limit, skip } = sanitizePagination({
      page: query.page,
      limit: query.limit,
      defaultLimit: 100,
      maxLimit: 500,
    });
    const [items, total] = await Promise.all([
      StockMovement.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      StockMovement.countDocuments(filter),
    ]);
    return { items: items.map((i) => i.toPublicJSON()), total, page, limit };
  }

  async stats(schoolId) {
    const sId = new mongoose.Types.ObjectId(schoolId);
    const agg = await Asset.aggregate([
      { $match: { schoolId: sId } },
      {
        $group: {
          _id: null,
          totalAssets: { $sum: 1 },
          totalUnits: { $sum: '$quantity' },
          totalValue: { $sum: { $multiply: ['$unitCost', '$quantity'] } },
          issued: { $sum: '$issuedQuantity' },
          underRepair: { $sum: { $cond: [{ $eq: ['$status', 'UNDER_REPAIR'] }, 1, 0] } },
          writtenOff: { $sum: { $cond: [{ $eq: ['$status', 'WRITTEN_OFF'] }, 1, 0] } },
        },
      },
    ]);
    const a = agg[0] || {
      totalAssets: 0,
      totalUnits: 0,
      totalValue: 0,
      issued: 0,
      underRepair: 0,
      writtenOff: 0,
    };
    return a;
  }
}

export const inventoryRepository = new InventoryRepository();
