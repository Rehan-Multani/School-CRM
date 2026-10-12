import { boardService } from '../services/board.service.js';
import { sendSuccess } from '../../../shared/response.js';

const actor = (req) => req.user?.name || req.user?.email || 'Super Admin';

export async function listBoards(req, res, next) {
  try {
    const data = await boardService.list({ status: req.query?.status });
    return sendSuccess(res, data, 'Boards retrieved successfully');
  } catch (error) {
    next(error);
  }
}

// Active board names only — the dropdown source for school-admin config.
export async function listActiveBoardNames(req, res, next) {
  try {
    const data = await boardService.activeNames();
    return sendSuccess(res, data, 'Boards retrieved successfully');
  } catch (error) {
    next(error);
  }
}

export async function createBoard(req, res, next) {
  try {
    const data = await boardService.create(req.body, actor(req));
    return sendSuccess(res, data, 'Board created successfully', 201);
  } catch (error) {
    next(error);
  }
}

export async function updateBoard(req, res, next) {
  try {
    const data = await boardService.update(req.params.id, req.body, actor(req));
    return sendSuccess(res, data, 'Board updated successfully');
  } catch (error) {
    next(error);
  }
}

export async function updateBoardStatus(req, res, next) {
  try {
    const data = await boardService.setActive(req.params.id, req.body?.isActive, actor(req));
    return sendSuccess(res, data, data.isActive ? 'Board activated' : 'Board deactivated');
  } catch (error) {
    next(error);
  }
}
