import { AppError } from '../../../shared/AppError.js';
import { faqRepository } from '../repositories/faq.repository.js';

export const DEFAULT_FAQS = [
  {
    question: 'How long does onboarding and data migration take?',
    answer:
      'Most schools go live in under 48 hours. Our bulk CSV/Excel importers let you upload your existing student, parent, and faculty rosters seamlessly with zero data loss.',
    category: 'Onboarding',
    order: 1,
    isActive: true,
  },
  {
    question: 'Is our student and financial data completely isolated and secure?',
    answer:
      'Yes. School CRM operates on strict multi-tenant isolation. Every query is tenant-scoped with encrypted databases, role-based access control, and bank-grade SSL encryption.',
    category: 'Security',
    order: 2,
    isActive: true,
  },
  {
    question: 'Do teachers and parents need separate apps?',
    answer:
      'No. We provide a single unified Android & mobile web experience. When a user logs in, the platform automatically switches to their authorized role dashboard.',
    category: 'Mobile Apps',
    order: 3,
    isActive: true,
  },
  {
    question: 'Can we customize fee heads, grades, and report card templates?',
    answer:
      'Absolutely. You have total flexibility to define custom academic terms, grading systems (CBSE, ICSE, IB, State Boards), fee categories, scholarships, and custom branding.',
    category: 'Academics & Fees',
    order: 4,
    isActive: true,
  },
  {
    question: 'Does it work with existing biometric machines or GPS trackers?',
    answer:
      'Yes. School CRM supports universal API webhooks for biometric attendance terminals, RFID turnstiles, and standard vehicle GPS hardware.',
    category: 'Hardware & IoT',
    order: 5,
    isActive: true,
  },
  {
    question: 'How does parent fee payment work?',
    answer:
      'Parents receive push notifications and payment links. They can pay using UPI, NetBanking, Credit/Debit cards, or EMI. Receipts are instantly archived and synced with the accountant’s ledger.',
    category: 'Payments',
    order: 6,
    isActive: true,
  },
];

function trimRequired(val, name, max = 500) {
  const text = typeof val === 'string' ? val.trim() : '';
  if (!text) throw new AppError(`${name} is required`, 400);
  if (text.length > max) throw new AppError(`${name} must be ${max} characters or fewer`, 400);
  return text;
}

export class FaqService {
  async ensureSeeded() {
    const count = await faqRepository.countDocuments();
    if (count === 0) {
      await faqRepository.insertMany(DEFAULT_FAQS);
    }
  }

  async getPublicFaqs() {
    await this.ensureSeeded();
    const faqs = await faqRepository.listPublic();
    return faqs.map((faq) => ({
      id: faq._id.toString(),
      question: faq.question,
      q: faq.question,
      answer: faq.answer,
      a: faq.answer,
      category: faq.category || 'General',
      order: faq.order || 0,
    }));
  }

  async listFaqsAdmin(filters = {}) {
    await this.ensureSeeded();
    const result = await faqRepository.listAdmin(filters);
    return {
      items: result.items.map((faq) => faq.toPublicJSON()),
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    };
  }

  async createFaq({ question, answer, category, order, isActive = true, createdBy = 'Super Admin' }) {
    const safeQuestion = trimRequired(question, 'Question', 500);
    const safeAnswer = trimRequired(answer, 'Answer', 3000);
    const safeCategory = typeof category === 'string' && category.trim() ? category.trim().slice(0, 100) : 'General';
    const safeOrder = typeof order === 'number' ? order : parseInt(order, 10) || 0;

    const faq = await faqRepository.create({
      question: safeQuestion,
      answer: safeAnswer,
      category: safeCategory,
      order: safeOrder,
      isActive: Boolean(isActive),
      createdBy: typeof createdBy === 'string' ? createdBy.trim().slice(0, 120) : 'Super Admin',
    });

    return faq.toPublicJSON();
  }

  async updateFaq(id, { question, answer, category, order, isActive }) {
    const faq = await faqRepository.findById(id);
    if (!faq) {
      throw new AppError('FAQ not found', 404);
    }

    if (question !== undefined) {
      faq.question = trimRequired(question, 'Question', 500);
    }
    if (answer !== undefined) {
      faq.answer = trimRequired(answer, 'Answer', 3000);
    }
    if (category !== undefined) {
      faq.category = typeof category === 'string' && category.trim() ? category.trim().slice(0, 100) : 'General';
    }
    if (order !== undefined) {
      faq.order = typeof order === 'number' ? order : parseInt(order, 10) || 0;
    }
    if (isActive !== undefined) {
      faq.isActive = Boolean(isActive);
    }

    await faqRepository.save(faq);
    return faq.toPublicJSON();
  }

  async deleteFaq(id) {
    const faq = await faqRepository.findById(id);
    if (!faq) {
      throw new AppError('FAQ not found', 404);
    }
    await faqRepository.deleteById(id);
    return { id };
  }
}

export const faqService = new FaqService();
