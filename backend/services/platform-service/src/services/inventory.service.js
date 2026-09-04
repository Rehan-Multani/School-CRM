import { AppError } from '../../../shared/AppError.js';
import { inventoryRepository } from '../repositories/inventory.repository.js';
import { ASSET_CONDITIONS, ASSET_STATUSES } from '../models/Asset.js';

function pickEnum(value, list, fallback) {
  const up = String(value || '').toUpperCase();
  return list.includes(up) ? up : fallback;
}
function toNum(v, def = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

async function genAssetCode(schoolId, name) {
  const prefix = (name || 'AST').replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'AST';
  for (let i = 0; i < 6; i += 1) {
    const candidate = `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
    const clash = await inventoryRepository.findAssetByCode(schoolId, candidate);
    if (!clash) return candidate;
  }
  return `${prefix}-${Date.now().toString().slice(-6)}`;
}

class InventoryService {
  // ---- categories ----
  listCategories(schoolId) {
    return inventoryRepository.listCategories(schoolId);
  }

  async createCategory(schoolId, payload = {}) {
    const name = (payload.name || '').trim();
    if (!name) throw new AppError('Category name is required', 400);
    const existing = await inventoryRepository.findCategoryByName(schoolId, name);
    if (existing) throw new AppError('A category with this name already exists', 409);
    const doc = await inventoryRepository.createCategory(schoolId, {
      name,
      code: (payload.code || name.slice(0, 3)).toUpperCase(),
      description: (payload.description || '').trim(),
    });
    return doc.toPublicJSON();
  }

  async updateCategory(schoolId, id, payload = {}) {
    const patch = {};
    if (payload.name !== undefined) {
      const n = (payload.name || '').trim();
      if (!n) throw new AppError('Category name cannot be empty', 400);
      patch.name = n;
    }
    if (payload.code !== undefined) patch.code = String(payload.code || '').toUpperCase();
    if (payload.description !== undefined) patch.description = String(payload.description || '').trim();
    const doc = await inventoryRepository.updateCategory(schoolId, id, patch);
    if (!doc) throw new AppError('Category not found', 404);
    return doc.toPublicJSON();
  }

  async deleteCategory(schoolId, id) {
    const count = await inventoryRepository.countAssetsInCategory(schoolId, id);
    if (count > 0) {
      throw new AppError(`Cannot delete — ${count} asset(s) still use this category`, 400);
    }
    const doc = await inventoryRepository.deleteCategory(schoolId, id);
    if (!doc) throw new AppError('Category not found', 404);
    return { success: true, message: 'Category deleted' };
  }

  // ---- assets ----
  async listAssets(schoolId, query = {}) {
    const { items, total, page, limit } = await inventoryRepository.listAssets(schoolId, query);
    return { data: items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
  }

  async getAsset(schoolId, id) {
    const doc = await inventoryRepository.findAssetById(schoolId, id);
    if (!doc) throw new AppError('Asset not found', 404);
    return doc.toPublicJSON();
  }

  stats(schoolId) {
    return inventoryRepository.stats(schoolId);
  }

  listMovements(schoolId, query = {}) {
    return inventoryRepository.listMovements(schoolId, query).then((r) => ({
      data: r.items,
      pagination: { page: r.page, limit: r.limit, total: r.total, totalPages: Math.ceil(r.total / r.limit) || 1 },
    }));
  }

  async createAsset(schoolId, payload = {}) {
    const name = (payload.name || '').trim();
    if (!name) throw new AppError('Asset name is required', 400);

    let assetCode = (payload.assetCode || '').trim().toUpperCase();
    if (assetCode) {
      const clash = await inventoryRepository.findAssetByCode(schoolId, assetCode);
      if (clash) throw new AppError('An asset with this code already exists', 409);
    } else {
      assetCode = await genAssetCode(schoolId, name);
    }

    let categoryName = '';
    if (payload.categoryId) {
      const cat = await inventoryRepository.findCategoryById(schoolId, payload.categoryId);
      if (!cat) throw new AppError('Category not found', 404);
      categoryName = cat.name;
    }

    const quantity = Math.max(0, Math.floor(toNum(payload.quantity, 1)));
    const doc = await inventoryRepository.createAsset(schoolId, {
      assetCode,
      name,
      categoryId: payload.categoryId || null,
      categoryName,
      quantity,
      issuedQuantity: 0,
      unit: (payload.unit || 'pcs').trim(),
      location: (payload.location || '').trim(),
      custodianName: (payload.custodianName || '').trim(),
      purchaseDate: payload.purchaseDate ? new Date(payload.purchaseDate) : null,
      unitCost: Math.max(0, toNum(payload.unitCost, 0)),
      vendor: (payload.vendor || '').trim(),
      condition: pickEnum(payload.condition, ASSET_CONDITIONS, 'GOOD'),
      status: pickEnum(payload.status, ASSET_STATUSES, 'IN_STORE'),
      warrantyExpiry: payload.warrantyExpiry ? new Date(payload.warrantyExpiry) : null,
      notes: (payload.notes || '').trim(),
    });
    return doc.toPublicJSON();
  }

  async updateAsset(schoolId, id, payload = {}) {
    const existing = await inventoryRepository.findAssetById(schoolId, id);
    if (!existing) throw new AppError('Asset not found', 404);

    const patch = {};
    if (payload.name !== undefined) {
      const n = (payload.name || '').trim();
      if (!n) throw new AppError('Asset name cannot be empty', 400);
      patch.name = n;
    }
    if (payload.assetCode !== undefined) {
      const code = (payload.assetCode || '').trim().toUpperCase();
      if (code && code !== existing.assetCode) {
        const clash = await inventoryRepository.findAssetByCode(schoolId, code);
        if (clash) throw new AppError('An asset with this code already exists', 409);
        patch.assetCode = code;
      }
    }
    if (payload.categoryId !== undefined) {
      patch.categoryId = payload.categoryId || null;
      if (payload.categoryId) {
        const cat = await inventoryRepository.findCategoryById(schoolId, payload.categoryId);
        if (!cat) throw new AppError('Category not found', 404);
        patch.categoryName = cat.name;
      } else {
        patch.categoryName = '';
      }
    }
    if (payload.quantity !== undefined) {
      const q = Math.max(0, Math.floor(toNum(payload.quantity, existing.quantity)));
      if (q < existing.issuedQuantity) {
        throw new AppError(`Quantity cannot be below issued units (${existing.issuedQuantity})`, 400);
      }
      patch.quantity = q;
    }
    ['unit', 'location', 'custodianName', 'vendor', 'notes'].forEach((f) => {
      if (payload[f] !== undefined) patch[f] = String(payload[f] || '').trim();
    });
    if (payload.unitCost !== undefined) patch.unitCost = Math.max(0, toNum(payload.unitCost, existing.unitCost));
    if (payload.purchaseDate !== undefined) {
      patch.purchaseDate = payload.purchaseDate ? new Date(payload.purchaseDate) : null;
    }
    if (payload.warrantyExpiry !== undefined) {
      patch.warrantyExpiry = payload.warrantyExpiry ? new Date(payload.warrantyExpiry) : null;
    }
    if (payload.condition !== undefined) {
      patch.condition = pickEnum(payload.condition, ASSET_CONDITIONS, existing.condition);
    }
    if (payload.status !== undefined) {
      patch.status = pickEnum(payload.status, ASSET_STATUSES, existing.status);
    }

    const doc = await inventoryRepository.updateAsset(schoolId, id, patch);
    return doc.toPublicJSON();
  }

  async deleteAsset(schoolId, id) {
    const existing = await inventoryRepository.findAssetById(schoolId, id);
    if (!existing) throw new AppError('Asset not found', 404);
    if (existing.issuedQuantity > 0) {
      throw new AppError('Cannot delete — units are still issued out. Return them first.', 400);
    }
    await inventoryRepository.deleteAsset(schoolId, id);
    return { success: true, message: 'Asset deleted' };
  }

  async recordMovement(schoolId, id, payload = {}, actorName = '') {
    const asset = await inventoryRepository.findAssetById(schoolId, id);
    if (!asset) throw new AppError('Asset not found', 404);

    const type = pickEnum(payload.type, ['ISSUE', 'RETURN', 'ADJUST', 'WRITE_OFF'], null);
    if (!type) throw new AppError('Invalid movement type', 400);
    const qty = Math.floor(toNum(payload.qty, 0));
    if (type !== 'ADJUST' && qty <= 0) throw new AppError('Quantity must be positive', 400);

    let { quantity, issuedQuantity, status } = asset;
    const available = quantity - issuedQuantity;

    if (type === 'ISSUE') {
      if (qty > available) throw new AppError(`Only ${available} unit(s) available to issue`, 400);
      issuedQuantity += qty;
    } else if (type === 'RETURN') {
      if (qty > issuedQuantity) throw new AppError(`Only ${issuedQuantity} unit(s) are issued out`, 400);
      issuedQuantity -= qty;
    } else if (type === 'ADJUST') {
      // qty can be negative or positive; sets the new total quantity delta
      const next = quantity + qty;
      if (next < issuedQuantity) {
        throw new AppError(`Adjusted quantity (${next}) cannot be below issued units (${issuedQuantity})`, 400);
      }
      if (next < 0) throw new AppError('Adjusted quantity cannot be negative', 400);
      quantity = next;
    } else if (type === 'WRITE_OFF') {
      if (qty > available) throw new AppError(`Only ${available} unit(s) available to write off`, 400);
      quantity -= qty;
      status = quantity <= 0 ? 'WRITTEN_OFF' : status;
    }

    const nextStatus =
      status === 'WRITTEN_OFF'
        ? 'WRITTEN_OFF'
        : issuedQuantity > 0
        ? 'ISSUED'
        : quantity <= 0
        ? 'WRITTEN_OFF'
        : 'IN_STORE';

    const updated = await inventoryRepository.updateAsset(schoolId, id, {
      quantity,
      issuedQuantity,
      status: nextStatus,
    });

    await inventoryRepository.createMovement(schoolId, {
      assetId: asset._id,
      assetName: asset.name,
      type,
      qty,
      balanceAfter: quantity - issuedQuantity,
      toWhom: (payload.toWhom || '').trim(),
      byName: actorName,
      note: (payload.note || '').trim(),
    });

    return updated.toPublicJSON();
  }
}

export const inventoryService = new InventoryService();
