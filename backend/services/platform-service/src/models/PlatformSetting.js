import mongoose from 'mongoose';

// Singleton document (key: 'platform') holding platform-wide, publicly
// readable config that the Super Admin can edit — currently the mobile
// app distribution links shown on the public landing site.
const platformSettingSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, default: 'platform' },
    playStoreUrl: { type: String, default: '', trim: true },
    appStoreUrl: { type: String, default: '', trim: true },
    apkUrl: { type: String, default: '', trim: true },
    updatedBy: { type: String, default: null },
  },
  { timestamps: true }
);

platformSettingSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    playStoreUrl: this.playStoreUrl || '',
    appStoreUrl: this.appStoreUrl || '',
    apkUrl: this.apkUrl || '',
    updatedAt: this.updatedAt,
    updatedBy: this.updatedBy,
  };
};

export const PlatformSetting = mongoose.model('PlatformSetting', platformSettingSchema);
