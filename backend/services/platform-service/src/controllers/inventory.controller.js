import { inventoryService } from '../services/inventory.service.js';
import { auditLogService } from '../services/auditLog.service.js';

function schoolId(req) {
  const role = req.user?.role?.toUpperCase();
  if (role === 'SCHOOLADMIN') {
    return req.user?.sub;
  }
  return req.user?.schoolId || req.user?.sub || req.schoolAdmin?.schoolId;
}
function performedBy(req) {
  return req.user?.name || req.user?.email || 'School Admin';
}

// categories
export async function listAssetCategories(req, res, next) {
  try {
    const data = await inventoryService.listCategories(schoolId(req));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}
export async function createAssetCategory(req, res, next) {
  try {
    const data = await inventoryService.createCategory(schoolId(req), req.body);
    res.status(201).json({ success: true, data, message: `Category "${data.name}" created` });
  } catch (error) {
    next(error);
  }
}
export async function updateAssetCategory(req, res, next) {
  try {
    const data = await inventoryService.updateCategory(schoolId(req), req.params.id, req.body);
    res.json({ success: true, data, message: 'Category updated' });
  } catch (error) {
    next(error);
  }
}
export async function deleteAssetCategory(req, res, next) {
  try {
    const result = await inventoryService.deleteCategory(schoolId(req), req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

// stats + movements
export async function getInventoryStats(req, res, next) {
  try {
    const data = await inventoryService.stats(schoolId(req));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}
export async function listStockMovements(req, res, next) {
  try {
    const result = await inventoryService.listMovements(schoolId(req), req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

// assets
export async function listAssets(req, res, next) {
  try {
    const result = await inventoryService.listAssets(schoolId(req), req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}
export async function getAsset(req, res, next) {
  try {
    const data = await inventoryService.getAsset(schoolId(req), req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}
export async function createAsset(req, res, next) {
  try {
    const data = await inventoryService.createAsset(schoolId(req), req.body);
    auditLogService.record(req, { module: 'INVENTORY', action: 'CREATE', entityType: 'Asset', entityId: data.id, summary: `Added asset "${data.name}" (${data.assetCode})` });
    res.status(201).json({ success: true, data, message: `Asset "${data.name}" added` });
  } catch (error) {
    next(error);
  }
}
export async function updateAsset(req, res, next) {
  try {
    const data = await inventoryService.updateAsset(schoolId(req), req.params.id, req.body);
    res.json({ success: true, data, message: 'Asset updated' });
  } catch (error) {
    next(error);
  }
}
export async function deleteAsset(req, res, next) {
  try {
    const result = await inventoryService.deleteAsset(schoolId(req), req.params.id);
    auditLogService.record(req, { module: 'INVENTORY', action: 'DELETE', entityType: 'Asset', entityId: req.params.id, summary: 'Deleted an asset' });
    res.json(result);
  } catch (error) {
    next(error);
  }
}
export async function recordAssetMovement(req, res, next) {
  try {
    const data = await inventoryService.recordMovement(
      schoolId(req),
      req.params.id,
      req.body,
      performedBy(req)
    );
    auditLogService.record(req, {
      module: 'INVENTORY',
      action: `STOCK_${String(req.body?.type || 'MOVE').toUpperCase()}`,
      entityType: 'Asset',
      entityId: req.params.id,
      summary: `${String(req.body?.type || 'movement')} ${req.body?.qty ?? ''} × "${data.name}" (bal ${data.availableQuantity})`,
    });
    res.json({ success: true, data, message: `Stock ${String(req.body?.type || '').toLowerCase()} recorded` });
  } catch (error) {
    next(error);
  }
}
