import { AppError } from '../../../shared/AppError.js';
import { Board } from '../models/Board.js';
import { School } from '../models/School.js';

// Boards a fresh install starts with — managed from Super Admin afterwards.
const DEFAULT_BOARDS = ['CBSE', 'ICSE', 'State Board', 'IB', 'Cambridge', 'Other'];

const keyOf = (name) => name.trim().toLowerCase();

function cleanName(value) {
  const name = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
  if (!name) throw new AppError('Board name is required', 400);
  if (name.length > 80) throw new AppError('Board name is too long', 400);
  return name;
}

function mapDuplicate(error) {
  if (error?.code === 11000) throw new AppError('A board with this name already exists', 409);
  throw error;
}

let defaultsEnsured = false;

class BoardService {
  // First use on an empty collection (or an existing install that predates
  // boards): create the default list. Runs once per process.
  async ensureDefaults() {
    if (defaultsEnsured) return;
    if ((await Board.estimatedDocumentCount()) === 0) {
      try {
        await Board.insertMany(
          DEFAULT_BOARDS.map((name) => ({ name, nameKey: keyOf(name), createdBy: 'system' })),
          { ordered: false }
        );
      } catch (error) {
        if (error?.code !== 11000 && !error?.writeErrors) throw error;
      }
    }
    defaultsEnsured = true;
  }

  async list({ status } = {}) {
    await this.ensureDefaults();
    const query = {};
    if (status === 'active') query.isActive = true;
    else if (status === 'inactive') query.isActive = false;

    const boards = await Board.find(query).sort({ name: 1 });
    // How many schools use each board (by name).
    const usage = await School.aggregate([{ $group: { _id: '$board', count: { $sum: 1 } } }]);
    const counts = new Map(usage.map((row) => [row._id, row.count]));
    return boards.map((board) => ({ ...board.toPublicJSON(), schoolCount: counts.get(board.name) || 0 }));
  }

  // Names selectable when creating / editing a school.
  async activeNames() {
    await this.ensureDefaults();
    const boards = await Board.find({ isActive: true }).sort({ name: 1 }).select('name');
    return boards.map((board) => board.name);
  }

  async create(payload, actor) {
    await this.ensureDefaults();
    const name = cleanName(payload?.name);
    try {
      const board = await Board.create({
        name,
        nameKey: keyOf(name),
        description: typeof payload?.description === 'string' ? payload.description.trim() : '',
        isActive: payload?.isActive === undefined ? true : Boolean(payload.isActive),
        createdBy: actor,
        updatedBy: actor,
      });
      return board.toPublicJSON();
    } catch (error) {
      return mapDuplicate(error);
    }
  }

  async update(id, payload, actor) {
    const board = await Board.findById(id);
    if (!board) throw new AppError('Board not found', 404);

    const previousName = board.name;
    if (payload?.name !== undefined) {
      board.name = cleanName(payload.name);
      board.nameKey = keyOf(board.name);
    }
    if (payload?.description !== undefined) {
      board.description = typeof payload.description === 'string' ? payload.description.trim() : '';
    }
    board.updatedBy = actor;

    try {
      await board.save();
    } catch (error) {
      return mapDuplicate(error);
    }

    // Schools store the board by name — keep them pointing at the renamed board.
    if (board.name !== previousName) {
      await School.updateMany({ board: previousName }, { $set: { board: board.name } });
    }
    return board.toPublicJSON();
  }

  async setActive(id, isActive, actor) {
    if (typeof isActive !== 'boolean') throw new AppError('isActive must be true or false', 400);
    const board = await Board.findById(id);
    if (!board) throw new AppError('Board not found', 404);
    board.isActive = isActive;
    board.updatedBy = actor;
    await board.save();
    return board.toPublicJSON();
  }
}

export const boardService = new BoardService();
