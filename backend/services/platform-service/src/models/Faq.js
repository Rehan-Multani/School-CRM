import mongoose from 'mongoose';

const faqSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    answer: {
      type: String,
      required: true,
      trim: true,
      maxlength: 3000,
    },
    category: {
      type: String,
      default: 'General',
      trim: true,
      maxlength: 100,
    },
    order: {
      type: Number,
      default: 0,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdBy: {
      type: String,
      default: 'Super Admin',
      trim: true,
    },
  },
  { timestamps: true }
);

faqSchema.index({ isActive: 1, order: 1, createdAt: -1 });

faqSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    question: this.question,
    answer: this.answer,
    category: this.category,
    order: this.order,
    isActive: this.isActive,
    createdBy: this.createdBy,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Faq = mongoose.model('Faq', faqSchema);
