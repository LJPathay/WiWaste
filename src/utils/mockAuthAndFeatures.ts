/**
 * Mock Authentication & WiWaste Platform Features
 * Demonstrates all core functionality with sample data
 */

// ============ Types & Interfaces ============

interface User {
  id: string;
  email: string;
  name: string;
  company: string;
  role: 'admin' | 'manager' | 'analyst';
  loginTime: Date;
}

interface PredictiveAnalytics {
  wasteVolumeForecast: {
    month: string;
    predicted: number;
    confidence: number;
  }[];
  seasonalTrends: string;
  anomalyDetection: {
    detected: boolean;
    severity: 'low' | 'medium' | 'high';
    description: string;
  };
}

interface PrescriptiveDecision {
  scenario: string;
  recommendation: string;
  expectedROI: number;
  riskLevel: string;
}

interface ProfitLeakage {
  category: string;
  leakageAmount: number;
  percentage: number;
  source: string;
}

interface BATCHTracking {
  batchId: string;
  expiryDate: Date;
  currentPrice: number;
  decayRate: number;
  recommendedPrice: number;
  daysToExpiry: number;
}

interface VendorReturn {
  vendorId: string;
  vendorName: string;
  returnWindowDays: number;
  eligibleCredit: number;
  returnDeadline: Date;
  status: 'pending' | 'approved' | 'recovered';
}

interface BehavioralInsight {
  patternId: string;
  description: string;
  frequency: number;
  impact: number;
  recommendation: string;
}

export const retailExamples = {
  minimart: {
    storeName: 'Barangay MiniMart Plus',
    topBrands: ['Magnolia', 'Lucky Me', 'Marlboro', 'Nescafé', 'C2', 'Tide', 'Purefoods'],
    sampleItems: [
      'Lucky Me! Pancit Canton',
      'Nescafé 3-in-1 Original',
      'C2 Green Tea Apple',
      'Tide Powder Detergent Sachet',
      'Purefoods Tender Juicy Hotdog',
    ],
    commonLossReasons: ['near-expiry snacks', 'damaged sachet packs', 'overstocked instant noodles'],
  },
  pharma: {
    storeName: 'HealthPlus Pharmacy Branch',
    topBrands: ['Unilab', 'Biogesic', 'Neozep', 'Cetaphil', 'Enervon', 'Ascof', 'RiteMed'],
    sampleItems: [
      'Biogesic 500mg',
      'Neozep Forte',
      'Cetaphil Gentle Skin Cleanser',
      'Enervon-C Tablets',
      'RiteMed Paracetamol',
    ],
    commonLossReasons: ['expired cold-chain meds', 'returned blister packs', 'damaged OTC cartons'],
  },
};

// ============ Mock Login Function ============

export async function mockLogin(email: string, password: string): Promise<User> {
  console.log(`🔐 Attempting login for: ${email}`);
  console.log(`🔑 Password received: ${'*'.repeat(Math.max(3, password.length))}`);

  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Mock user data
  const mockUser: User = {
    id: 'user_' + Math.random().toString(36).substr(2, 9),
    email: email,
    name: 'John Store Ops',
    company: 'WiWaste MiniMart + Pharma',
    role: 'manager',
    loginTime: new Date(),
  };

  console.log(`✅ Login successful! Welcome ${mockUser.name}`);
  return mockUser;
}

// ============ Feature 1: Predictive Analytics ============

export function getPredictiveAnalytics(): PredictiveAnalytics {
  console.log('📊 Fetching Predictive Analytics...');

  return {
    wasteVolumeForecast: [
      { month: 'Jan 2026', predicted: 1240, confidence: 0.92 },
      { month: 'Feb 2026', predicted: 1310, confidence: 0.89 },
      { month: 'Mar 2026', predicted: 1495, confidence: 0.85 },
      { month: 'Apr 2026', predicted: 1820, confidence: 0.88 },
      { month: 'May 2026', predicted: 2055, confidence: 0.91 },
    ],
    seasonalTrends: 'Q2 shows 40% increase in near-expiry snacks, OTC medicine cartons, and sachet packaging due to seasonal demand',
    anomalyDetection: {
      detected: true,
      severity: 'high',
      description: 'Unusual spike detected in snack shelf returns and pharmacy blister-pack waste on 2026-06-15',
    },
  };
}

// ============ Feature 2: Prescriptive Decision Support Simulation Sandbox ============

export function getPrescriptiveDecisions(): PrescriptiveDecision[] {
  console.log('🎯 Running Prescriptive Decision Support Simulations...');

  return [
    {
      scenario: 'Scenario A: Reduce near-expiry minimart write-offs by 15%',
      recommendation: 'Cross-sell Lucky Me, C2, and Magnolia items using FEFO rotation and promo bundles',
      expectedROI: 28500,
      riskLevel: 'low',
    },
    {
      scenario: 'Scenario B: Improve pharmacy stock recovery',
      recommendation: 'Tighten handling for Unilab, Biogesic, and Enervon cartons; recover returns faster',
      expectedROI: 46200,
      riskLevel: 'medium',
    },
    {
      scenario: 'Scenario C: Optimize current store operations only',
      recommendation: 'Apply AI route optimization for store replenishment and aisle-based shelf restocking',
      expectedROI: 12800,
      riskLevel: 'low',
    },
    {
      scenario: 'Scenario D: Expand premium retail recovery',
      recommendation: 'Build a small sorting hub for mixed minimart and pharma packaging returns',
      expectedROI: 86500,
      riskLevel: 'high',
    },
  ];
}

// ============ Feature 3: Profit Leakage Detection Engine ============

export function getProfitLeakage(): ProfitLeakage[] {
  console.log('💰 Detecting Profit Leakage...');

  return [
    {
      category: 'Minimart Overstock',
      leakageAmount: 9100,
      percentage: 3.2,
      source: 'Extra cases of Lucky Me, Nescafé, and C2 were received beyond display capacity',
    },
    {
      category: 'Pharmacy Expiry Waste',
      leakageAmount: 12950,
      percentage: 4.6,
      source: 'Biogesic, Neozep, and Enervon items were flagged near expiry in back stock',
    },
    {
      category: 'Unclaimed Vendor Credits',
      leakageAmount: 5600,
      percentage: 1.96,
      source: 'Return windows for Unilab and distributor cartons were missed',
    },
    {
      category: 'Promo Pricing Gaps',
      leakageAmount: 4200,
      percentage: 1.43,
      source: 'Magnolia and Purefoods bundles were sold below planned margin',
    },
    {
      category: 'Administrative Overhead',
      leakageAmount: 7300,
      percentage: 2.67,
      source: 'Manual SKU matching across minimart and pharmacy branches',
    },
  ];
}

// ============ Feature 4: Batch-Level FEFO Tracking & Dynamic Price Decay ============

export function getBatchFEFOTracking(): BATCHTracking[] {
  console.log('📦 Running FEFO Batch Tracking & Price Decay Analysis...');

  const now = new Date();

  return [
    {
      batchId: 'MINI-2026-001',
      expiryDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000), // 5 days
      currentPrice: 2.5,
      decayRate: 0.15,
      recommendedPrice: 2.12,
      daysToExpiry: 5,
    },
    {
      batchId: 'PHARMA-2026-002',
      expiryDate: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000), // 15 days
      currentPrice: 3.8,
      decayRate: 0.08,
      recommendedPrice: 3.49,
      daysToExpiry: 15,
    },
    {
      batchId: 'MINI-2026-003',
      expiryDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), // 2 days
      currentPrice: 1.2,
      decayRate: 0.25,
      recommendedPrice: 0.9,
      daysToExpiry: 2,
    },
    {
      batchId: 'PHARMA-2026-004',
      expiryDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days
      currentPrice: 4.5,
      decayRate: 0.05,
      recommendedPrice: 4.28,
      daysToExpiry: 30,
    },
  ];
}

// ============ Feature 5: Automated Vendor Return-Window & Credit Recovery Engine ============

export function getVendorReturns(): VendorReturn[] {
  console.log('🔄 Processing Vendor Return-Window & Credit Recovery...');

  const now = new Date();

  return [
    {
      vendorId: 'VENDOR-A123',
      vendorName: 'Unilab Distribution',
      returnWindowDays: 30,
      eligibleCredit: 4500,
      returnDeadline: new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000),
      status: 'pending',
    },
    {
      vendorId: 'VENDOR-B456',
      vendorName: 'Magnolia Food Service',
      returnWindowDays: 45,
      eligibleCredit: 7200,
      returnDeadline: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000),
      status: 'pending',
    },
    {
      vendorId: 'VENDOR-C789',
      vendorName: 'PascualLab Pharma Supply',
      returnWindowDays: 14,
      eligibleCredit: 2100,
      returnDeadline: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // Expired
      status: 'pending',
    },
    {
      vendorId: 'VENDOR-D012',
      vendorName: 'Purefoods Wholesale',
      returnWindowDays: 60,
      eligibleCredit: 9800,
      returnDeadline: new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000),
      status: 'approved',
    },
  ];
}

// ============ Feature 6: Behavioral Loss Intelligence Module ============

export function getBehavioralLossIntelligence(): BehavioralInsight[] {
  console.log('🧠 Analyzing Behavioral Loss Patterns...');

  return [
    {
      patternId: 'PATTERN-001',
      description: 'Weekend overloading in minimart shelf replenishment',
      frequency: 8,
      impact: 2300,
      recommendation: 'Shift Lucky Me, C2, and Magnolia restocks to Thursday to avoid weekend congestion',
    },
    {
      patternId: 'PATTERN-002',
      description: 'High contamination rates in pharmacy return bins',
      frequency: 12,
      impact: 5600,
      recommendation: 'Separate medicine cartons, blister packs, and medical waste signage by color code',
    },
    {
      patternId: 'PATTERN-003',
      description: 'Staff efficiency drops on Mondays after inventory closeout',
      frequency: 6,
      impact: 1800,
      recommendation: 'Rotate cashier and stockroom duties across minimart and pharmacy teams',
    },
    {
      patternId: 'PATTERN-004',
      description: 'Material missorting by contract partners',
      frequency: 15,
      impact: 8900,
      recommendation: 'Implement automated sorting verification for Unilab, Nescafé, and Purefoods returns',
    },
    {
      patternId: 'PATTERN-005',
      description: 'Customer opt-out spikes after promo changes',
      frequency: 4,
      impact: 12000,
      recommendation: 'Improve communication around promo bundles and offer loyalty rewards for frequent buyers',
    },
  ];
}

// ============ Complete Dashboard Data (All Features) ============

export interface DashboardData {
  user: User;
  predictiveAnalytics: PredictiveAnalytics;
  prescriptiveDecisions: PrescriptiveDecision[];
  profitLeakage: ProfitLeakage[];
  batchFEFO: BATCHTracking[];
  vendorReturns: VendorReturn[];
  behavioralInsights: BehavioralInsight[];
}

export async function initializeDashboard(email: string, password: string): Promise<DashboardData> {
  console.log('🚀 Initializing WiWaste Dashboard...\n');

  // Step 1: Login
  const user = await mockLogin(email, password);
  console.log('');

  // Step 2: Fetch all features in parallel
  console.log('📥 Loading platform features...\n');

  const predictiveAnalytics = getPredictiveAnalytics();
  const prescriptiveDecisions = getPrescriptiveDecisions();
  const profitLeakage = getProfitLeakage();
  const batchFEFO = getBatchFEFOTracking();
  const vendorReturns = getVendorReturns();
  const behavioralInsights = getBehavioralLossIntelligence();

  console.log('\n✨ Dashboard Ready!\n');

  return {
    user,
    predictiveAnalytics,
    prescriptiveDecisions,
    profitLeakage,
    batchFEFO,
    vendorReturns,
    behavioralInsights,
  };
}

// ============ Summary & Reporting ============

export function generateSummaryReport(data: DashboardData): string {
  const totalLeakage = data.profitLeakage.reduce((sum, leak) => sum + leak.leakageAmount, 0);
  const totalRecoverableCredit = data.vendorReturns.reduce(
    (sum, vendor) => sum + vendor.eligibleCredit,
    0
  );
  const criticalBatches = data.batchFEFO.filter((b) => b.daysToExpiry <= 7).length;

  return `
╔════════════════════════════════════════════════════════════╗
║           WiWaste Platform - Executive Summary             ║
╚════════════════════════════════════════════════════════════╝

👤 User: ${data.user.name} (${data.user.role})
🏢 Company: ${data.user.company}
⏰ Login Time: ${data.user.loginTime.toLocaleString()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 PREDICTIVE ANALYTICS
   • Forecast Confidence: 88.7% average
   • Seasonal Trend: Q2 +40% waste volume
   • Anomalies Detected: 1 (HIGH severity)

🎯 PRESCRIPTIVE DECISIONS
   • Top ROI Opportunity: Scenario D ($85,000)
   • Low-Risk Alternative: Scenario A ($28,000)
   • Evaluated Scenarios: 4

💰 PROFIT LEAKAGE
   • Total Monthly Leakage: $${totalLeakage.toLocaleString()}
   • Primary Sources: Processing Waste (4.6%), Logistics (3.2%)
   • Recoverable: ~$15,000 through optimization

📦 BATCH FEFO TRACKING
   • Active Batches: ${data.batchFEFO.length}
   • Critical (≤7 days): ${criticalBatches} batches
   • Price Optimization Potential: ${data.batchFEFO.map((b) => b.currentPrice - b.recommendedPrice).reduce((a, b) => a + b, 0).toFixed(2)}

🔄 VENDOR CREDITS
   • Recoverable Credits: $${totalRecoverableCredit.toLocaleString()}
   • Pending Returns: ${data.vendorReturns.filter((v) => v.status === 'pending').length}
   • At Risk (expired windows): 1

🧠 BEHAVIORAL INTELLIGENCE
   • Patterns Identified: ${data.behavioralInsights.length}
   • Total Impact: $${data.behavioralInsights.reduce((sum, b) => sum + b.impact, 0).toLocaleString()}
   • Top Priority: Material missorting ($8,900 impact)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✅ All systems operational | 🟢 Data synchronized
╔════════════════════════════════════════════════════════════╗
  `;
}
