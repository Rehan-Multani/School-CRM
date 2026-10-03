import mongoose from 'mongoose';

// Singleton document (key: 'platform') holding platform-wide, publicly
// readable config that the Super Admin can edit — the mobile app's store
// links (public landing site) and which app versions are still allowed in.
const platformSettingSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, default: 'platform' },
    playStoreUrl: { type: String, default: '', trim: true },
    appStoreUrl: { type: String, default: '', trim: true },
    apkUrl: { type: String, default: '', trim: true },
    // Mobile app version gate, read by the app on launch and on resume:
    //   installed < appMinVersion    → blocking "Update required" popup
    //   installed < appLatestVersion → dismissible "Update available" popup
    // '' switches that check off.
    appLatestVersion: { type: String, default: '', trim: true },
    appMinVersion: { type: String, default: '', trim: true },
    appUpdateMessage: { type: String, default: '', trim: true },
    // Platform logo as a `data:image/webp;base64,…` string (or '' for the
    // bundled default). Stored inline so the public /platform/app-config read
    // can serve it to unauthenticated pages (landing, every login screen).
    logo: { type: String, default: '' },
    // Public contact channels (shown on the public landing site, contact page, and footer)
    contactSalesEmail: { type: String, default: 'hello@schoolcrm.app', trim: true },
    contactSupportEmail: { type: String, default: 'support@schoolcrm.app', trim: true },
    contactPrivacyEmail: { type: String, default: 'privacy@schoolcrm.app', trim: true },
    contactPhone: { type: String, default: '+91 80 4718 2200', trim: true },
    contactAddress: {
      type: String,
      default: 'WeWork Prestige Central, Ground Floor, 36 Infantry Road, Bengaluru 560001, India',
      trim: true,
    },
    updatedBy: { type: String, default: null },
  },
  { timestamps: true }
);

platformSettingSchema.methods.toPublicJSON = function toPublicJSON() {
  const salesEmail = this.contactSalesEmail || 'hello@schoolcrm.app';
  const supportEmail = this.contactSupportEmail || 'support@schoolcrm.app';
  const privacyEmail = this.contactPrivacyEmail || 'privacy@schoolcrm.app';
  const phone = this.contactPhone || '+91 80 4718 2200';
  const address =
    this.contactAddress ||
    'WeWork Prestige Central, Ground Floor, 36 Infantry Road, Bengaluru 560001, India';

  return {
    playStoreUrl: this.playStoreUrl || '',
    appStoreUrl: this.appStoreUrl || '',
    apkUrl: this.apkUrl || '',
    appUpdate: {
      latestVersion: this.appLatestVersion || '',
      minVersion: this.appMinVersion || '',
      message: this.appUpdateMessage || '',
    },
    logoUrl: this.logo || '',
    contact: {
      salesEmail,
      supportEmail,
      privacyEmail,
      phone,
      address,
    },
    salesEmail,
    supportEmail,
    privacyEmail,
    phone,
    address,
    updatedAt: this.updatedAt,
    updatedBy: this.updatedBy,
  };
};

export const PlatformSetting = mongoose.model('PlatformSetting', platformSettingSchema);
