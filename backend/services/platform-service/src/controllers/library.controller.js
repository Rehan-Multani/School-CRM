import bcrypt from 'bcryptjs';
import { libraryService } from '../services/library.service.js';
import { SchoolUser } from '../models/SchoolUser.js';
import { School } from '../models/School.js';
import { signAccessToken } from '../../../shared/generateToken.js';
import { env } from '../config/env.js';
import { AppError } from '../../../shared/AppError.js';
import { escapeRegex } from '../../../shared/sanitize.js';

function schoolId(req) {
  const role = req.user?.role?.toUpperCase();
  if (role === 'SCHOOLADMIN') {
    return req.user?.sub;
  }
  return req.user?.schoolId || req.user?.sub || req.schoolAdmin?.schoolId;
}

function performedBy(req) {
  return req.user?.name || req.user?.email || 'Librarian';
}

// ----------------------------------------------------
// Librarian Auth Login
// ----------------------------------------------------
export async function librarianLogin(req, res, next) {
  try {
    const { username, email, password } = req.body || {};
    const identifier = (username || email || '').trim().toLowerCase();
    const rawPassword = (password || '').trim();

    if (!identifier || !rawPassword) {
      throw new AppError('Username/email and password are required', 400);
    }

    // Find the account strictly by exact identity, scoped to the Librarian role.
    // (No generic-username fallback, no cross-school "any active librarian" match,
    // no auto-provisioning — those previously let a known demo password log in as
    // an arbitrary school's librarian, which is a critical cross-tenant hole.)
    const user = await SchoolUser.findOne({
      role: 'LIBRARIAN',
      status: 'ACTIVE',
      $or: [
        { email: identifier },
        { employeeId: new RegExp(`^${escapeRegex(identifier)}$`, 'i') },
      ],
    }).select('+passwordHash');

    if (!user || !user.passwordHash) {
      throw new AppError('Invalid username or password', 401);
    }

    // Verify Password
    let passwordValid = false;
    try {
      passwordValid = await bcrypt.compare(rawPassword, user.passwordHash);
    } catch {
      passwordValid = false;
    }

    if (!passwordValid) {
      throw new AppError('Invalid username or password', 401);
    }

    // Fetch school info
    let school = null;
    if (user.schoolId) {
      school = await School.findById(user.schoolId);
    }

    const schoolIdStr = user.schoolId ? user.schoolId.toString() : school ? school._id.toString() : '';

    // Sign JWT Token
    const token = signAccessToken(
      {
        sub: user._id.toString(),
        userId: user._id.toString(),
        schoolId: schoolIdStr,
        role: 'Librarian',
        name: user.name,
        email: user.email,
        schoolName: school?.name || '',
      },
      { secret: env.jwtSecret, expiresIn: env.jwtExpiresIn || '7d' }
    );

    // Update lastLoginAt
    await SchoolUser.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } }).catch(() => {});

    const publicUser = typeof user.toPublicJSON === 'function' ? user.toPublicJSON() : {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.designation || 'Librarian',
    };

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        ...publicUser,
        schoolName: school?.name || '',
        academicSession: school?.academicSession || '',
      },
    });
  } catch (error) {
    next(error);
  }
}

// ----------------------------------------------------
// Librarian Profile (personal details)
// ----------------------------------------------------
export async function getLibrarianProfile(req, res, next) {
  try {
    const userId = req.user?.sub || req.user?.userId;
    const user = await SchoolUser.findById(userId);
    if (!user) throw new AppError('Librarian account not found', 404);
    res.json({ success: true, data: user.toPublicJSON() });
  } catch (error) {
    next(error);
  }
}

export async function updateLibrarianProfile(req, res, next) {
  try {
    const userId = req.user?.sub || req.user?.userId;
    const user = await SchoolUser.findById(userId);
    if (!user) throw new AppError('Librarian account not found', 404);

    const { firstName, lastName, phone, gender } = req.body || {};

    if (firstName !== undefined) {
      const trimmed = firstName.trim();
      if (!trimmed) throw new AppError('First name is required', 400);
      user.firstName = trimmed;
    }
    if (lastName !== undefined) user.lastName = lastName.trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (gender !== undefined && ['MALE', 'FEMALE', 'OTHER'].includes(gender.toUpperCase())) {
      user.gender = gender.toUpperCase();
    }
    user.name = `${user.firstName} ${user.lastName}`.trim();

    await user.save();
    res.json({ success: true, message: 'Profile updated successfully', data: user.toPublicJSON() });
  } catch (error) {
    next(error);
  }
}

// ----------------------------------------------------
// Settings
// ----------------------------------------------------
export async function getLibrarySettings(req, res, next) {
  try {
    const data = await libraryService.getSettings(schoolId(req));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function updateLibrarySettings(req, res, next) {
  try {
    const data = await libraryService.updateSettings(schoolId(req), req.body);
    res.json({
      success: true,
      message: 'Library settings updated successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
}

// ----------------------------------------------------
// Stats & Aggregations
// ----------------------------------------------------
export async function getLibraryStats(req, res, next) {
  try {
    const data = await libraryService.getStats(schoolId(req));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getCategories(req, res, next) {
  try {
    const data = await libraryService.getCategories(schoolId(req));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function createCategory(req, res, next) {
  try {
    const data = await libraryService.createCategory(schoolId(req), req.body);
    res.status(201).json({ success: true, message: 'Category created successfully', data });
  } catch (error) {
    next(error);
  }
}

export async function updateCategory(req, res, next) {
  try {
    const data = await libraryService.updateCategory(schoolId(req), req.params.id, req.body);
    res.json({ success: true, message: 'Category updated successfully', data });
  } catch (error) {
    next(error);
  }
}

export async function deleteCategory(req, res, next) {
  try {
    const result = await libraryService.deleteCategory(schoolId(req), req.params.id);
    res.json({ success: true, message: result.message });
  } catch (error) {
    next(error);
  }
}

export async function getAuthors(req, res, next) {
  try {
    const data = await libraryService.getAuthors(schoolId(req));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getPublishers(req, res, next) {
  try {
    const data = await libraryService.getPublishers(schoolId(req));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

// ----------------------------------------------------
// Books Catalog CRUD
// ----------------------------------------------------
export async function listBooks(req, res, next) {
  try {
    const result = await libraryService.listBooks(schoolId(req), req.query);
    res.json({
      success: true,
      data: result.items,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getBook(req, res, next) {
  try {
    const data = await libraryService.getBook(schoolId(req), req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function createBook(req, res, next) {
  try {
    const data = await libraryService.createBook(schoolId(req), req.body);
    res.status(201).json({
      success: true,
      message: 'Library book and copies added successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateBook(req, res, next) {
  try {
    const data = await libraryService.updateBook(schoolId(req), req.params.id, req.body);
    res.json({
      success: true,
      message: 'Library book updated successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteBook(req, res, next) {
  try {
    const result = await libraryService.deleteBook(schoolId(req), req.params.id);
    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
}

// ----------------------------------------------------
// Physical Book Copies
// ----------------------------------------------------
export async function listBookCopies(req, res, next) {
  try {
    const result = await libraryService.listCopies(schoolId(req), req.query);
    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

export async function createBookCopy(req, res, next) {
  try {
    const data = await libraryService.createCopy(schoolId(req), req.body);
    res.status(201).json({
      success: true,
      message: 'Book copy registered successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateBookCopy(req, res, next) {
  try {
    const data = await libraryService.updateCopy(schoolId(req), req.params.id, req.body);
    res.json({
      success: true,
      message: 'Book copy updated successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteBookCopy(req, res, next) {
  try {
    const result = await libraryService.deleteCopy(schoolId(req), req.params.id);
    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
}

// ----------------------------------------------------
// Issues & Circulation
// ----------------------------------------------------
export async function listIssues(req, res, next) {
  try {
    const result = await libraryService.listIssues(schoolId(req), req.query);
    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

export async function issueBook(req, res, next) {
  try {
    const data = await libraryService.issueBook(schoolId(req), req.body, performedBy(req));
    res.status(201).json({
      success: true,
      message: 'Book issued successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function returnBook(req, res, next) {
  try {
    const data = await libraryService.returnBook(schoolId(req), req.params.id, req.body, performedBy(req));
    res.json({
      success: true,
      message: 'Book returned successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function renewBook(req, res, next) {
  try {
    const data = await libraryService.renewBook(schoolId(req), req.params.id, req.body, performedBy(req));
    res.json({
      success: true,
      message: 'Book loan renewed successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateFineStatus(req, res, next) {
  try {
    const data = await libraryService.updateFineStatus(schoolId(req), req.params.id, req.body?.fineStatus);
    res.json({
      success: true,
      message: 'Fine status updated successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function getEligibleBorrowers(req, res, next) {
  try {
    const data = await libraryService.getEligibleBorrowers(schoolId(req));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getNotificationRecipients(req, res, next) {
  try {
    const data = await libraryService.getNotificationRecipients(schoolId(req));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

// ----------------------------------------------------
// Reservations
// ----------------------------------------------------
export async function listReservations(req, res, next) {
  try {
    const result = await libraryService.listReservations(schoolId(req), req.query);
    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

export async function createReservation(req, res, next) {
  try {
    const data = await libraryService.createReservation(schoolId(req), req.body, performedBy(req));
    res.status(201).json({
      success: true,
      message: 'Book reservation created successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function approveReservation(req, res, next) {
  try {
    const data = await libraryService.approveReservation(schoolId(req), req.params.id, performedBy(req));
    res.json({
      success: true,
      message: 'Book reservation approved successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function rejectReservation(req, res, next) {
  try {
    const data = await libraryService.rejectReservation(schoolId(req), req.params.id, req.body?.reason);
    res.json({
      success: true,
      message: 'Book reservation rejected',
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function cancelReservation(req, res, next) {
  try {
    const data = await libraryService.cancelReservation(schoolId(req), req.params.id);
    res.json({
      success: true,
      message: 'Book reservation cancelled',
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function fulfillReservation(req, res, next) {
  try {
    const data = await libraryService.fulfillReservation(schoolId(req), req.params.id, req.body, performedBy(req));
    res.status(201).json({
      success: true,
      message: 'Reserved book issued successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
}

// ----------------------------------------------------
// Transactions Audit Trail
// ----------------------------------------------------
export async function listTransactions(req, res, next) {
  try {
    const result = await libraryService.listTransactions(schoolId(req), req.query);
    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

// ----------------------------------------------------
// Reports
// ----------------------------------------------------
export async function getReportData(req, res, next) {
  try {
    const data = await libraryService.getReportData(schoolId(req), req.params.category, req.query);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}
