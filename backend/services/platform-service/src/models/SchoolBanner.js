import mongoose from 'mongoose';

export const MAX_BANNERS_PER_SCHOOL = 10;
// The apps a banner can be shown in. Every banner starts out for all of them.
export const BANNER_AUDIENCES = ['STUDENT', 'PARENT', 'TEACHER', 'PRINCIPAL', 'TRANSPORT'];

/**
 * A banner the school admin uploads for the mobile apps' home screens
 * (student / parent / teacher / principal / transport manager). The image is stored resized, as WebP bytes in
 * the document itself and served through a public, cacheable link, so the
 * apps need no auth or file-share for it.
 */
const schoolBannerSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    title: { type: String, default: '', trim: true, maxlength: 80 },
    // Optional: opened in the browser when the banner is tapped.
    link: { type: String, default: '', trim: true, maxlength: 500 },
    image: { type: Buffer, required: true, select: false },
    contentType: { type: String, default: 'image/webp' },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
    // Changes whenever the image does, so clients can cache the link forever.
    version: { type: String, default: '' },
    audience: { type: [String], enum: BANNER_AUDIENCES, default: () => [...BANNER_AUDIENCES] },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: String, default: '' },
  },
  { timestamps: true }
);

schoolBannerSchema.index({ schoolId: 1, order: 1, createdAt: 1 });

schoolBannerSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    title: this.title || '',
    link: this.link || '',
    audience: this.audience?.length ? this.audience : [...BANNER_AUDIENCES],
    order: this.order || 0,
    isActive: this.isActive !== false,
    width: this.width || 0,
    height: this.height || 0,
    version: this.version || '',
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const SchoolBanner = mongoose.models.SchoolBanner || mongoose.model('SchoolBanner', schoolBannerSchema);
