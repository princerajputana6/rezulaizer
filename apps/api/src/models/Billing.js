const mongoose = require('mongoose');

const subscriptionPlanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    enum: ['Free', 'Basic', 'Professional', 'Enterprise', 'Custom']
  },
  price: {
    monthly: {
      type: Number,
      default: 0
    },
    yearly: {
      type: Number,
      default: 0
    }
  },
  limits: {
    maxCandidates: {
      type: Number,
      default: 10
    },
    maxTests: {
      type: Number,
      default: 5
    },
    maxInterviews: {
      type: Number,
      default: 10
    },
    maxUsers: {
      type: Number,
      default: 1
    },
    storageGB: {
      type: Number,
      default: 1
    },
    aiCredits: {
      type: Number,
      default: 100
    }
  },
  features: [{
    name: String,
    included: {
      type: Boolean,
      default: false
    }
  }]
});

const invoiceSchema = new mongoose.Schema({
  // Invoice Details
  invoiceNumber: {
    type: String,
    unique: true,
    required: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  
  // Billing Period
  billingPeriod: {
    start: {
      type: Date,
      required: true
    },
    end: {
      type: Date,
      required: true
    }
  },
  
  // Line Items
  lineItems: [{
    description: String,
    quantity: {
      type: Number,
      default: 1
    },
    unitPrice: {
      type: Number,
      required: true
    },
    totalPrice: {
      type: Number,
      required: true
    },
    type: {
      type: String,
      enum: ['Subscription', 'Usage', 'One-time', 'Credit', 'Discount']
    }
  }],
  
  // Amounts
  subtotal: {
    type: Number,
    required: true
  },
  tax: {
    rate: {
      type: Number,
      default: 0
    },
    amount: {
      type: Number,
      default: 0
    }
  },
  discount: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    required: true
  },
  
  // Status
  status: {
    type: String,
    enum: ['Draft', 'Sent', 'Paid', 'Overdue', 'Cancelled', 'Refunded'],
    default: 'Draft'
  },
  
  // Payment Details
  dueDate: {
    type: Date,
    required: true
  },
  paidAt: Date,
  paymentMethod: {
    type: String,
    enum: ['Credit Card', 'Bank Transfer', 'PayPal', 'Stripe', 'Other']
  },
  transactionId: String,
  
  // Metadata
  currency: {
    type: String,
    default: 'USD'
  },
  notes: String
}, {
  timestamps: true
});

const billingSchema = new mongoose.Schema({
  // Company Reference
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    unique: true
  },
  
  // Current Subscription
  currentPlan: subscriptionPlanSchema,
  
  // Billing Cycle
  billingCycle: {
    type: String,
    enum: ['Monthly', 'Yearly'],
    default: 'Monthly'
  },
  
  // Subscription Status
  subscriptionStatus: {
    type: String,
    enum: ['Active', 'Cancelled', 'Suspended', 'Trial', 'Expired'],
    default: 'Trial'
  },
  
  // Important Dates
  subscriptionStartDate: {
    type: Date,
    default: Date.now
  },
  subscriptionEndDate: Date,
  trialEndDate: Date,
  nextBillingDate: Date,
  
  // Usage Tracking
  currentUsage: {
    candidates: {
      type: Number,
      default: 0
    },
    tests: {
      type: Number,
      default: 0
    },
    interviews: {
      type: Number,
      default: 0
    },
    users: {
      type: Number,
      default: 1
    },
    storageUsedGB: {
      type: Number,
      default: 0
    },
    aiCreditsUsed: {
      type: Number,
      default: 0
    }
  },
  
  // Payment Information
  paymentMethod: {
    type: {
      type: String,
      enum: ['Credit Card', 'Bank Account', 'PayPal']
    },
    last4: String,
    brand: String,
    expiryMonth: Number,
    expiryYear: Number,
    isDefault: {
      type: Boolean,
      default: true
    }
  },
  
  // Billing Address
  billingAddress: {
    street: String,
    city: String,
    state: String,
    country: String,
    zipCode: String
  },
  
  // Tax Information
  taxId: String,
  taxExempt: {
    type: Boolean,
    default: false
  },
  
  // Invoices
  invoices: [invoiceSchema],
  
  // Credits and Balance
  accountBalance: {
    type: Number,
    default: 0
  },
  credits: {
    type: Number,
    default: 0
  },
  
  // Notifications
  notifications: {
    paymentReminders: {
      type: Boolean,
      default: true
    },
    usageAlerts: {
      type: Boolean,
      default: true
    },
    billingUpdates: {
      type: Boolean,
      default: true
    }
  },
  
  // Discounts and Coupons
  appliedCoupons: [{
    code: String,
    discount: {
      type: String, // '10%' or '$50'
    },
    appliedAt: Date,
    expiresAt: Date
  }],
  
  // Payment History
  paymentHistory: [{
    amount: Number,
    currency: {
      type: String,
      default: 'USD'
    },
    status: {
      type: String,
      enum: ['Success', 'Failed', 'Pending', 'Refunded']
    },
    transactionId: String,
    paymentMethod: String,
    processedAt: Date,
    failureReason: String
  }],
  
  // Auto-renewal
  autoRenewal: {
    type: Boolean,
    default: true
  },
  
  // Cancellation
  cancellationRequested: {
    type: Boolean,
    default: false
  },
  cancellationDate: Date,
  cancellationReason: String,
  
  // Metadata
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for days until next billing
billingSchema.virtual('daysUntilNextBilling').get(function() {
  if (!this.nextBillingDate) return null;
  const now = new Date();
  const diff = this.nextBillingDate.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// Virtual for trial days remaining
billingSchema.virtual('trialDaysRemaining').get(function() {
  if (!this.trialEndDate) return 0;
  const now = new Date();
  const diff = this.trialEndDate.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
});

// Virtual for usage percentage
billingSchema.virtual('usagePercentage').get(function() {
  const usage = this.currentUsage;
  const limits = this.currentPlan.limits;
  
  return {
    candidates: limits.maxCandidates > 0 ? (usage.candidates / limits.maxCandidates) * 100 : 0,
    tests: limits.maxTests > 0 ? (usage.tests / limits.maxTests) * 100 : 0,
    interviews: limits.maxInterviews > 0 ? (usage.interviews / limits.maxInterviews) * 100 : 0,
    storage: limits.storageGB > 0 ? (usage.storageUsedGB / limits.storageGB) * 100 : 0
  };
});

// Generate invoice number
invoiceSchema.pre('save', function() {
  if (!this.invoiceNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.invoiceNumber = `INV-${year}${month}-${random}`;
  }
});

// Indexes
billingSchema.index({ company: 1 });
billingSchema.index({ subscriptionStatus: 1 });
billingSchema.index({ nextBillingDate: 1 });
billingSchema.index({ 'invoices.status': 1 });

module.exports = mongoose.model('Billing', billingSchema);
