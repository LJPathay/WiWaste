/**
 * Mock Authentication & WiWaste Platform Features
 * Demonstrates core functionality with sample data.
 */

export type UserRole = 'owner' | 'inventory' | 'cashier';

interface User {
  id: string;
  email: string;
  name: string;
  company: string;
  role: UserRole;
  loginTime: Date;
}

export interface AuthSession {
  email: string;
  name: string;
  company: string;
  role: UserRole;
}

export const AUTH_SESSION_KEY = 'wiwaste-session';

const ROLE_LABELS: Record<UserRole, string> = {
  owner: 'Owner/Administrator',
  inventory: 'Inventory Staff',
  cashier: 'Cashier',
};

const ROLE_LIMITS: Record<UserRole, number> = {
  owner: 5,
  inventory: 3,
  cashier: 2,
};

function normalizeRole(role?: string): UserRole {
  if (role === 'owner' || role === 'inventory' || role === 'cashier') return role;
  if (role === 'analyst') return 'inventory';
  return 'owner';
}

export function inferRoleFromEmail(email: string): UserRole {
  const normalized = email.toLowerCase();

  if (normalized.includes('cashier') || normalized.includes('pos')) return 'cashier';
  if (normalized.includes('inventory') || normalized.includes('staff') || normalized.includes('stock')) return 'inventory';
  if (normalized.includes('owner')) return 'owner';

  return 'owner';
}

export function getRoleDisplayName(role: UserRole): string {
  return ROLE_LABELS[role];
}

export function getStoredSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;

  const rawSession = window.localStorage.getItem(AUTH_SESSION_KEY);
  if (!rawSession) return null;

  try {
    const session = JSON.parse(rawSession) as Partial<AuthSession>;
    if (!session.name || !session.role) return null;

    return {
      email: session.email,
      name: session.name,
      company: session.company,
      role: normalizeRole(session.role),
    };
  } catch {
    return null;
  }
}

export function setStoredSession(session: AuthSession) {
  if (typeof window === 'undefined') return;

  window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
}

export function clearStoredSession() {
  if (typeof window === 'undefined') return;

  window.localStorage.removeItem(AUTH_SESSION_KEY);
}

function clampByRole<T>(items: T[], role: UserRole): T[] {
  return items.slice(0, ROLE_LIMITS[role]);
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
    topBrands: ['Magnolia', 'Lucky Me', 'Marlboro', 'Nescafe', 'C2', 'Tide', 'Purefoods'],
    sampleItems: [
      'Lucky Me! Pancit Canton',
      'Nescafe 3-in-1 Original',
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

export async function mockLogin(email: string, password: string, role?: UserRole): Promise<User> {
  console.log(`Attempting login for: ${email}`);
  console.log(`Password received: ${'*'.repeat(Math.max(3, password.length))}`);
  const resolvedRole = normalizeRole(role ?? inferRoleFromEmail(email));

  await new Promise((resolve) => setTimeout(resolve, 1500));

  const profileByRole: Record<UserRole, Pick<User, 'name' | 'company'>> = {
    owner: {
      name: 'Lia Cruz',
      company: 'WiWaste Owner Administration',
    },
    inventory: {
      name: 'Mia Stockwell',
      company: 'WiWaste Inventory Floor',
    },
    cashier: {
      name: 'Carlo Reyes',
      company: 'Ipharma Mart POS',
    },
  };

  return {
    id: 'user_' + Math.random().toString(36).substr(2, 9),
    email,
    name: profileByRole[resolvedRole].name,
    company: profileByRole[resolvedRole].company,
    role: resolvedRole,
    loginTime: new Date(),
  };
}

export function getPredictiveAnalytics(role: UserRole = 'owner'): PredictiveAnalytics {
  console.log(`Fetching Predictive Analytics for ${getRoleDisplayName(role)}...`);

  const baseForecast = [
    { month: 'Jan 2026', predicted: 1240, confidence: 0.92 },
    { month: 'Feb 2026', predicted: 1310, confidence: 0.89 },
    { month: 'Mar 2026', predicted: 1495, confidence: 0.85 },
    { month: 'Apr 2026', predicted: 1820, confidence: 0.88 },
    { month: 'May 2026', predicted: 2055, confidence: 0.91 },
    { month: 'Jun 2026', predicted: 2150, confidence: 0.87 },
    { month: 'Jul 2026', predicted: 1980, confidence: 0.93 },
    { month: 'Aug 2026', predicted: 1750, confidence: 0.86 },
    { month: 'Sep 2026', predicted: 1890, confidence: 0.84 },
    { month: 'Oct 2026', predicted: 2210, confidence: 0.82 },
    { month: 'Nov 2026', predicted: 2450, confidence: 0.85 },
    { month: 'Dec 2026', predicted: 2680, confidence: 0.80 },
  ];

  const roleForecast = clampByRole(baseForecast, role).map((point, index) => ({
    ...point,
    predicted: point.predicted + (role === 'owner' ? 45 * index : role === 'inventory' ? -30 * index : 0),
    confidence: Math.min(0.98, point.confidence + (role === 'owner' ? 0.02 : role === 'inventory' ? -0.01 : 0)),
  }));

  const seasonalTrendsByRole: Record<UserRole, string> = {
    owner: 'Corporate and store-level demand shows rising Q2 expiry risk, with recovery tied to governance checks, FEFO oversight, and supplier coordination.',
    inventory: 'Stockroom activity rises fastest before weekend closeouts, so FEFO rotation and shelf pulls need earlier cutoffs.',
    cashier: 'Checkout and returns patterns show near-expiry pharmacy items need careful receipt matching during shift operations.',
  };

  const anomalyByRole: Record<UserRole, PredictiveAnalytics['anomalyDetection']> = {
    owner: {
      detected: true,
      severity: 'high',
      description: 'Cross-store overstock and pharmacy blister-pack waste spike detected on 2026-06-15.',
    },
    inventory: {
      detected: true,
      severity: 'medium',
      description: 'Shelf pull delays and stock-in mismatches were detected during the latest inventory closeout.',
    },
    cashier: {
      detected: true,
      severity: 'low',
      description: 'Refund corrections rose during the latest POS shift closeout.',
    },
  };

  return {
    wasteVolumeForecast: roleForecast,
    seasonalTrends: seasonalTrendsByRole[role],
    anomalyDetection: anomalyByRole[role],
  };
}

export function getPrescriptiveDecisions(role: UserRole = 'owner'): PrescriptiveDecision[] {
  console.log(`Running Prescriptive Decision Support Simulations for ${getRoleDisplayName(role)}...`);

  const scenarios: Record<UserRole, PrescriptiveDecision[]> = {
    owner: [
      {
        scenario: 'Scenario A: Enforce branch-level FEFO compliance',
        recommendation: 'Require weekly inventory approvals and branch audit checkpoints before replenishment release',
        expectedROI: 35200,
        riskLevel: 'low',
      },
      {
        scenario: 'Scenario B: Improve pharmacy stock recovery',
        recommendation: 'Tighten handling for Unilab, Biogesic, and Enervon cartons; recover returns faster',
        expectedROI: 46200,
        riskLevel: 'medium',
      },
      {
        scenario: 'Scenario C: Optimize store operations',
        recommendation: 'Apply route optimization for replenishment, aisle restocking, and near-expiry promo bundles',
        expectedROI: 28500,
        riskLevel: 'low',
      },
      {
        scenario: 'Scenario D: Expand premium retail recovery',
        recommendation: 'Build a small sorting hub for mixed minimart and pharma packaging returns',
        expectedROI: 86500,
        riskLevel: 'high',
      },
    ],
    inventory: [
      {
        scenario: 'Scenario A: Keep shelves aligned with FEFO order',
        recommendation: 'Pull the nearest-expiry SKUs first and restock only the shelf quantities needed for the day',
        expectedROI: 18400,
        riskLevel: 'low',
      },
      {
        scenario: 'Scenario B: Reduce stock-in mismatch during receiving',
        recommendation: 'Scan cartons at receiving and confirm counts before moving items into the stockroom',
        expectedROI: 22100,
        riskLevel: 'medium',
      },
      {
        scenario: 'Scenario C: Prevent wastage from delayed shelf pulls',
        recommendation: 'Tag damaged or near-expiry stock immediately and separate it for review before it spreads across shelves',
        expectedROI: 9900,
        riskLevel: 'low',
      },
    ],
    cashier: [
      {
        scenario: 'Scenario A: Keep checkout stock synchronized',
        recommendation: 'Complete POS transactions only after payment confirmation so inventory deductions stay traceable',
        expectedROI: 11800,
        riskLevel: 'low',
      },
      {
        scenario: 'Scenario B: Improve returns handling',
        recommendation: 'Search original receipts and record exact returned quantities before refund processing',
        expectedROI: 7600,
        riskLevel: 'low',
      },
    ],
  };

  return scenarios[role];
}

export function getProfitLeakage(role: UserRole = 'owner'): ProfitLeakage[] {
  console.log(`Detecting Profit Leakage for ${getRoleDisplayName(role)}...`);

  const datasets: Record<UserRole, ProfitLeakage[]> = {
    owner: [
      {
        category: 'Minimart Overstock',
        leakageAmount: 9100,
        percentage: 3.2,
        source: 'Extra cases of Lucky Me, Nescafe, and C2 were received beyond display capacity',
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
        source: 'Manual SKU matching across minimart and pharmacy branches slowed approvals and replenishment decisions',
      },
    ],
    inventory: [
      {
        category: 'Shelf Overstock',
        leakageAmount: 6400,
        percentage: 2.7,
        source: 'More items were stocked on shelves than the current plan can sell before expiry',
      },
      {
        category: 'Damaged Returns',
        leakageAmount: 5100,
        percentage: 2.1,
        source: 'Damaged cartons and mixed packing waste were not separated early enough',
      },
      {
        category: 'Untracked Waste',
        leakageAmount: 3900,
        percentage: 1.5,
        source: 'Recorded wastage did not fully match the physical bin count after shift closeout',
      },
    ],
    cashier: [
      {
        category: 'Unmatched Returns',
        leakageAmount: 2400,
        percentage: 1.1,
        source: 'Refunds without original transaction lookup create reconciliation gaps at shift close',
      },
      {
        category: 'Payment Exceptions',
        leakageAmount: 1800,
        percentage: 0.8,
        source: 'Non-cash confirmations need cashier verification before receipt release',
      },
    ],
  };

  return datasets[role];
}

export function getBatchFEFOTracking(role: UserRole = 'owner'): BATCHTracking[] {
  console.log(`Running FEFO Batch Tracking & Price Decay Analysis for ${getRoleDisplayName(role)}...`);

  const now = new Date();

  const batchesByRole: Record<UserRole, BATCHTracking[]> = {
    owner: [
      {
        batchId: 'BATCH-001',
        expiryDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
        currentPrice: 2.5,
        decayRate: 0.15,
        recommendedPrice: 2.12,
        daysToExpiry: 5,
      },
      {
        batchId: 'BATCH-002',
        expiryDate: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000),
        currentPrice: 3.8,
        decayRate: 0.08,
        recommendedPrice: 3.49,
        daysToExpiry: 15,
      },
      {
        batchId: 'BATCH-003',
        expiryDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
        currentPrice: 1.2,
        decayRate: 0.25,
        recommendedPrice: 0.9,
        daysToExpiry: 2,
      },
      {
        batchId: 'BATCH-004',
        expiryDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        currentPrice: 4.5,
        decayRate: 0.05,
        recommendedPrice: 4.28,
        daysToExpiry: 30,
      },
      {
        batchId: 'BATCH-005',
        expiryDate: new Date(now.getTime() + 9 * 24 * 60 * 60 * 1000),
        currentPrice: 2.95,
        decayRate: 0.11,
        recommendedPrice: 2.71,
        daysToExpiry: 9,
      },
    ],
    inventory: [
      {
        batchId: 'STOCK-2026-001',
        expiryDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
        currentPrice: 1.2,
        decayRate: 0.25,
        recommendedPrice: 0.88,
        daysToExpiry: 2,
      },
      {
        batchId: 'STOCK-2026-002',
        expiryDate: new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000),
        currentPrice: 2.15,
        decayRate: 0.18,
        recommendedPrice: 1.95,
        daysToExpiry: 6,
      },
      {
        batchId: 'STOCK-2026-003',
        expiryDate: new Date(now.getTime() + 18 * 24 * 60 * 60 * 1000),
        currentPrice: 3.45,
        decayRate: 0.08,
        recommendedPrice: 3.16,
        daysToExpiry: 18,
      },
    ],
    cashier: [
      {
        batchId: 'POS-2026-001',
        expiryDate: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000),
        currentPrice: 25,
        decayRate: 0.12,
        recommendedPrice: 22,
        daysToExpiry: 4,
      },
      {
        batchId: 'POS-2026-002',
        expiryDate: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
        currentPrice: 12,
        decayRate: 0.08,
        recommendedPrice: 11,
        daysToExpiry: 10,
      },
    ],
  };

  return batchesByRole[role];
}

export function getVendorReturns(role: UserRole = 'owner'): VendorReturn[] {
  console.log(`Processing Vendor Return-Window & Credit Recovery for ${getRoleDisplayName(role)}...`);

  const now = new Date();

  const vendorsByRole: Record<UserRole, VendorReturn[]> = {
    owner: [
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
        vendorName: 'Nestlé Philippines',
        returnWindowDays: 14,
        eligibleCredit: 2100,
        returnDeadline: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
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
    ],
    inventory: [
      {
        vendorId: 'VENDOR-A123',
        vendorName: 'Unilab Distribution',
        returnWindowDays: 30,
        eligibleCredit: 4500,
        returnDeadline: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000),
        status: 'pending',
      },
      {
        vendorId: 'VENDOR-C789',
        vendorName: 'Nestlé Philippines',
        returnWindowDays: 14,
        eligibleCredit: 2100,
        returnDeadline: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
        status: 'pending',
      },
      {
        vendorId: 'VENDOR-E222',
        vendorName: 'Universal Robina Corp.',
        returnWindowDays: 21,
        eligibleCredit: 1650,
        returnDeadline: new Date(now.getTime() + 11 * 24 * 60 * 60 * 1000),
        status: 'pending',
      },
    ],
    cashier: [
      {
        vendorId: 'RETURN-POS-001',
        vendorName: 'Ipharma Mart Customer Returns',
        returnWindowDays: 7,
        eligibleCredit: 1800,
        returnDeadline: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
        status: 'pending',
      },
      {
        vendorId: 'RETURN-POS-002',
        vendorName: 'Damaged OTC Counter Goods',
        returnWindowDays: 14,
        eligibleCredit: 1200,
        returnDeadline: new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000),
        status: 'pending',
      },
    ],
  };

  return vendorsByRole[role];
}

export function getBehavioralLossIntelligence(role: UserRole = 'owner'): BehavioralInsight[] {
  console.log(`Analyzing Behavioral Loss Patterns for ${getRoleDisplayName(role)}...`);

  const insightsByRole: Record<UserRole, BehavioralInsight[]> = {
    owner: [
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
        description: 'Administrative exceptions are delaying approvals',
        frequency: 4,
        impact: 12000,
        recommendation: 'Lock approval thresholds and route outlier requests through the owner queue before they stall inventory flow',
      },
      {
        patternId: 'PATTERN-004',
        description: 'Customer opt-out spikes after promo changes',
        frequency: 4,
        impact: 12000,
        recommendation: 'Improve communication around promo bundles and offer loyalty rewards for frequent buyers',
      },
    ],
    inventory: [
      {
        patternId: 'PATTERN-001',
        description: 'Shelf pulls happen too late during weekend closeout',
        frequency: 9,
        impact: 3100,
        recommendation: 'Move shelf pulls earlier and separate near-expiry items before the weekend rush',
      },
      {
        patternId: 'PATTERN-002',
        description: 'Receiving checks are skipped when the stockroom gets busy',
        frequency: 11,
        impact: 4200,
        recommendation: 'Confirm carton counts at receiving before stock is mixed into the floor inventory',
      },
      {
        patternId: 'PATTERN-003',
        description: 'Waste bins are not sorted before closeout',
        frequency: 14,
        impact: 5900,
        recommendation: 'Use separate bins for damaged goods, expiry waste, and vendor returns at every shift end',
      },
    ],
    cashier: [
      {
        patternId: 'PATTERN-POS-001',
        description: 'Cash tender entries are corrected near shift close',
        frequency: 5,
        impact: 900,
        recommendation: 'Review cash amount and change due before completing receipt',
      },
      {
        patternId: 'PATTERN-POS-002',
        description: 'Returns cluster around near-expiry pharmacy items',
        frequency: 7,
        impact: 1600,
        recommendation: 'Confirm returned quantities against original sales items before restocking',
      },
    ],
  };

  return insightsByRole[role];
}

export interface DashboardData {
  user: User;
  predictiveAnalytics: PredictiveAnalytics;
  prescriptiveDecisions: PrescriptiveDecision[];
  profitLeakage: ProfitLeakage[];
  batchFEFO: BATCHTracking[];
  vendorReturns: VendorReturn[];
  behavioralInsights: BehavioralInsight[];
}

export async function initializeDashboard(email: string, password: string, role?: UserRole): Promise<DashboardData> {
  console.log('Initializing WiWaste Dashboard...');

  const resolvedRole = normalizeRole(role ?? inferRoleFromEmail(email));
  const user = await mockLogin(email, password, resolvedRole);

  return {
    user,
    predictiveAnalytics: getPredictiveAnalytics(resolvedRole),
    prescriptiveDecisions: getPrescriptiveDecisions(resolvedRole),
    profitLeakage: getProfitLeakage(resolvedRole),
    batchFEFO: getBatchFEFOTracking(resolvedRole),
    vendorReturns: getVendorReturns(resolvedRole),
    behavioralInsights: getBehavioralLossIntelligence(resolvedRole),
  };
}

export function generateSummaryReport(data: DashboardData): string {
  const totalLeakage = data.profitLeakage.reduce((sum, leak) => sum + leak.leakageAmount, 0);
  const totalRecoverableCredit = data.vendorReturns.reduce(
    (sum, vendor) => sum + vendor.eligibleCredit,
    0
  );
  const criticalBatches = data.batchFEFO.filter((batch) => batch.daysToExpiry <= 7).length;

  return `
WiWaste Platform - Executive Summary

User: ${data.user.name} (${getRoleDisplayName(data.user.role)})
Company: ${data.user.company}
Login Time: ${data.user.loginTime.toLocaleString()}

Predictive Analytics
- Forecast Confidence: 88.7% average
- Seasonal Trend: ${data.predictiveAnalytics.seasonalTrends}
- Anomalies Detected: ${data.predictiveAnalytics.anomalyDetection.detected ? 'Yes' : 'No'}

Prescriptive Decisions
- Evaluated Scenarios: ${data.prescriptiveDecisions.length}
- Top ROI Opportunity: ${data.prescriptiveDecisions[0]?.scenario ?? 'None'}

Profit Leakage
- Total Monthly Leakage: ${totalLeakage.toLocaleString()}
- Primary Sources: ${data.profitLeakage.map((leak) => leak.category).join(', ')}

Batch FEFO Tracking
- Active Batches: ${data.batchFEFO.length}
- Critical Batches: ${criticalBatches}

Vendor Credits
- Recoverable Credits: ${totalRecoverableCredit.toLocaleString()}
- Pending Returns: ${data.vendorReturns.filter((vendor) => vendor.status === 'pending').length}

Behavioral Intelligence
- Patterns Identified: ${data.behavioralInsights.length}
- Total Impact: ${data.behavioralInsights.reduce((sum, insight) => sum + insight.impact, 0).toLocaleString()}
  `;
}
