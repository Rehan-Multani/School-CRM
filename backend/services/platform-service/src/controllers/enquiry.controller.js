import { enquiryService } from '../services/enquiry.service.js';
import { sendSuccess } from '../../../shared/response.js';

export async function submitPublicEnquiry(req, res, next) {
  try {
    // Honeypot: the contact form has a hidden "website" field no person fills
    // in. A bot that does gets the normal success answer and nothing is saved.
    if (typeof req.body?.website === 'string' && req.body.website.trim()) {
      return sendSuccess(res, null, 'Your enquiry has been submitted successfully. Our team will contact you soon.', 201);
    }
    const data = await enquiryService.submitEnquiry({
      name: req.body?.name,
      email: req.body?.email,
      schoolName: req.body?.school || req.body?.schoolName,
      phone: req.body?.phone,
      message: req.body?.message,
    });
    return sendSuccess(res, data, 'Your enquiry has been submitted successfully. Our team will contact you soon.', 201);
  } catch (error) {
    next(error);
  }
}

export async function listEnquiries(req, res, next) {
  try {
    const result = await enquiryService.listEnquiries({
      search: req.query?.search,
      status: req.query?.status,
      sort: req.query?.sort,
      page: req.query?.page,
      limit: req.query?.limit,
    });
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function updateEnquiryStatus(req, res, next) {
  try {
    const data = await enquiryService.updateEnquiryStatus(req.params.id, {
      status: req.body?.status,
      contactedBy: req.user?.name || req.user?.email || 'Super Admin',
      notes: req.body?.notes,
    });
    return sendSuccess(res, data, 'Enquiry status updated successfully');
  } catch (error) {
    next(error);
  }
}

export async function deleteEnquiry(req, res, next) {
  try {
    const data = await enquiryService.deleteEnquiry(req.params.id);
    return sendSuccess(res, data, 'Enquiry deleted successfully');
  } catch (error) {
    next(error);
  }
}
