import { AppError } from '../../../shared/AppError.js';
import { enquiryRepository } from '../repositories/enquiry.repository.js';
import { toMobileDigits } from '../utils/mobile.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function trimRequired(val, name, max = 120) {
  const text = typeof val === 'string' ? val.trim() : '';
  if (!text) throw new AppError(`${name} is required`, 400);
  if (text.length > max) throw new AppError(`${name} must be ${max} characters or fewer`, 400);
  return text;
}

export class EnquiryService {
  async submitEnquiry({ name, email, schoolName, phone, message }) {
    const safeName = trimRequired(name, 'Name', 120);
    const safeEmail = trimRequired(email, 'Work email', 180).toLowerCase();

    if (!EMAIL_REGEX.test(safeEmail)) {
      throw new AppError('Please provide a valid email address', 400);
    }

    const safeMessage = trimRequired(message, 'Message', 3000);
    const safeSchoolName = typeof schoolName === 'string' ? schoolName.trim().slice(0, 200) : '';
    let safePhone = '';
    if (typeof phone === 'string' && phone.trim()) {
      const digits = toMobileDigits(phone);
      if (digits.length !== 10) {
        throw new AppError('Contact phone must be exactly 10 digits', 400);
      }
      safePhone = digits;
    }

    const enquiry = await enquiryRepository.create({
      name: safeName,
      email: safeEmail,
      schoolName: safeSchoolName,
      phone: safePhone,
      message: safeMessage,
      status: 'Pending',
    });

    return enquiry.toPublicJSON();
  }

  async listEnquiries(filters) {
    const result = await enquiryRepository.list(filters);
    const stats = await enquiryRepository.stats();

    return {
      data: result.items.map((item) => item.toPublicJSON()),
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
      stats,
    };
  }

  async updateEnquiryStatus(id, { status, contactedBy, notes }) {
    const enquiry = await enquiryRepository.findById(id);
    if (!enquiry) {
      throw new AppError('Enquiry not found', 404);
    }

    // Notes can be saved on their own: without a `status` the status stays as it is.
    const notesOnly = !status && typeof notes === 'string';
    const targetStatus = notesOnly ? enquiry.status : status || (enquiry.status === 'Pending' ? 'Contacted' : 'Pending');
    if (!['Pending', 'Contacted'].includes(targetStatus)) {
      throw new AppError('Invalid status', 400);
    }

    // Who contacted and when is recorded once, when the status actually changes —
    // saving notes on a contacted enquiry must not rewrite that history.
    if (targetStatus !== enquiry.status) {
      enquiry.status = targetStatus;
      if (targetStatus === 'Contacted') {
        enquiry.contactedAt = new Date();
        enquiry.contactedBy = contactedBy || 'Super Admin';
      } else {
        enquiry.contactedAt = null;
        enquiry.contactedBy = null;
      }
    }

    if (typeof notes === 'string') {
      enquiry.notes = notes.trim().slice(0, 2000);
    }

    await enquiryRepository.save(enquiry);
    return enquiry.toPublicJSON();
  }

  async deleteEnquiry(id) {
    const enquiry = await enquiryRepository.findById(id);
    if (!enquiry) {
      throw new AppError('Enquiry not found', 404);
    }
    await enquiryRepository.deleteById(id);
    return { id };
  }
}

export const enquiryService = new EnquiryService();
