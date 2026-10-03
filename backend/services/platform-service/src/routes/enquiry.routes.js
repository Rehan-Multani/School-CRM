import { Router } from 'express';
import { requireSuperAdmin } from '../middleware/requireSuperAdmin.js';
import { validateObjectId } from '../middleware/validateObjectId.js';
import { enquiryRateLimiter } from '../middleware/loginRateLimiter.js';
import {
  submitPublicEnquiry,
  listEnquiries,
  updateEnquiryStatus,
  deleteEnquiry,
} from '../controllers/enquiry.controller.js';

const router = Router();

// Public: Submit enquiry from landing/contact page
router.post('/enquiries', enquiryRateLimiter, submitPublicEnquiry);

// Super Admin: View, update status (Contacted/Pending), and delete enquiries
router.get('/superadmin/enquiries', requireSuperAdmin, listEnquiries);
router.patch('/superadmin/enquiries/:id/status', requireSuperAdmin, validateObjectId('id'), updateEnquiryStatus);
router.delete('/superadmin/enquiries/:id', requireSuperAdmin, validateObjectId('id'), deleteEnquiry);

export default router;
