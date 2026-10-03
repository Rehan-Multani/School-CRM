import { Router } from 'express';
import { requireSuperAdmin } from '../middleware/requireSuperAdmin.js';
import { validateObjectId } from '../middleware/validateObjectId.js';
import {
  getPublicFaqs,
  listFaqs,
  createFaq,
  updateFaq,
  deleteFaq,
} from '../controllers/faq.controller.js';

const router = Router();

// Public: Get active FAQs for the website landing page
router.get('/faqs', getPublicFaqs);

// Super Admin: List, create, update, delete FAQs
router.get('/superadmin/faqs', requireSuperAdmin, listFaqs);
router.post('/superadmin/faqs', requireSuperAdmin, createFaq);
router.put('/superadmin/faqs/:id', requireSuperAdmin, validateObjectId('id'), updateFaq);
router.delete('/superadmin/faqs/:id', requireSuperAdmin, validateObjectId('id'), deleteFaq);

export default router;
