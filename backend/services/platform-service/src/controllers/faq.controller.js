import { faqService } from '../services/faq.service.js';
import { sendSuccess } from '../../../shared/response.js';

export async function getPublicFaqs(req, res, next) {
  try {
    const data = await faqService.getPublicFaqs();
    return sendSuccess(res, data, 'FAQs retrieved successfully');
  } catch (error) {
    next(error);
  }
}

export async function listFaqs(req, res, next) {
  try {
    const result = await faqService.listFaqsAdmin({
      search: req.query?.search,
      category: req.query?.category,
      status: req.query?.status,
      page: req.query?.page,
      limit: req.query?.limit,
    });
    return res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function createFaq(req, res, next) {
  try {
    const data = await faqService.createFaq({
      question: req.body?.question,
      answer: req.body?.answer,
      category: req.body?.category,
      order: req.body?.order,
      isActive: req.body?.isActive,
      createdBy: req.user?.name || req.user?.email || 'Super Admin',
    });
    return sendSuccess(res, data, 'FAQ created successfully', 201);
  } catch (error) {
    next(error);
  }
}

export async function updateFaq(req, res, next) {
  try {
    const data = await faqService.updateFaq(req.params.id, {
      question: req.body?.question,
      answer: req.body?.answer,
      category: req.body?.category,
      order: req.body?.order,
      isActive: req.body?.isActive,
    });
    return sendSuccess(res, data, 'FAQ updated successfully');
  } catch (error) {
    next(error);
  }
}

export async function deleteFaq(req, res, next) {
  try {
    const data = await faqService.deleteFaq(req.params.id);
    return sendSuccess(res, data, 'FAQ deleted successfully');
  } catch (error) {
    next(error);
  }
}
