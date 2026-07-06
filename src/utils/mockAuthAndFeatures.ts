/**
 * Mock Authentication & WiWaste Platform Features
 * Demonstrates all core functionality with sample data
 */

// ============ Types & Interfaces ============

export type UserRole = 'admin' | 'manager' | 'inventory';

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
  admin: 'Administrator',
  manager: 'Business Owner / Manager',
  inventory: 'Inventory Staff',
};

const ROLE_LIMITS: Record<UserRole, number> = {
  admin: 5,
  manager: 4,
  inventory: 3,
};

function normalizeRole(role?: string): UserRole {
  if (role === 'admin' || role === 'manager' || role === 'inventory') return role;
  if (role === 'analyst') return 'inventory';
  return 'manager';
}

export function inferRoleFromEmail(email: string): UserRole {
  const normalized = email.toLowerCase();

  if (normalized.includes('admin')) return 'admin';
  if (normalized.includes('inventory') || normalized.includes('staff') || normalized.includes('stock')) return 'inventory';
  if (normalized.includes('manager') || normalized.includes('owner')) return 'manager';

  return 'manager';
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
    if (!session.email || !session.name || !session.company) return null;

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

export async function mockLogin(email: string, password: string, role?: UserRole): Promise<User> {
  console.log(`🔐 Attempting login for: ${email}`);
  console.log(`🔑 Password received: ${'*'.repeat(Math.max(3, password.length))}`);
  const resolvedRole = normalizeRole(role ?? inferRoleFromEmail(email));

  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const profileByRole: Record<UserRole, Pick<User, 'name' | 'company'>> = {
    admin: {
      name: 'Lia Cruz',
      company: 'WiWaste Central Administration',
    },
    manager: {
      name: 'John Store Ops',
      company: 'WiWaste MiniMart + Pharma',
    },
    inventory: {
      name: 'Mia Stockwell',
      company: 'WiWaste Inventory Floor',
    },
  };

  // Mock user data
  const mockUser: User = {
    id: 'user_' + Math.random().toString(36).substr(2, 9),
    email: email,
    name: profileByRole[resolvedRole].name,
    company: profileByRole[resolvedRole].company,
    role: resolvedRole,
    loginTime: new Date(),
  };

  console.log(`✅ Login successful! Welcome ${mockUser.name}`);
  return mockUser;
}

// ============ Feature 1: Predictive Analytics ============

export function getPredictiveAnalytics(role: UserRole = 'manager'): PredictiveAnalytics {
  console.log(`📊 Fetching Predictive Analytics for ${getRoleDisplayName(role)}...`);

  const baseForecast = [
    { month: 'Jan 2026', predicted: 1240, confidence: 0.92 },
    { month: 'Feb 2026', predicted: 1310, confidence: 0.89 },
    { month: 'Mar 2026', predicted: 1495, confidence: 0.85 },
    { month: 'Apr 2026', predicted: 1820, confidence: 0.88 },
    { month: 'May 2026', predicted: 2055, confidence: 0.91 },
  ];

  const roleForecast = clampByRole(baseForecast, role).map((point, index) => ({
    ...point,
    predicted: point.predicted + (role === 'admin' ? 45 * index : role === 'inventory' ? -30 * index : 0),
    confidence: Math.min(0.98, point.confidence + (role === 'admin' ? 0.02 : role === 'inventory' ? -0.01 : 0)),
  }));

  const seasonalTrendsByRole: Record<UserRole, string> = {
    admin: 'Corporate-wide Q2 demand shows the sharpest lift in expiry risk across all branches, with recovery tied to weekly governance checks.',
    manager: 'Q2 shows 40% increase in near-expiry snacks, OTC medicine cartons, and sachet packaging due to seasonal demand',
    inventory: 'Stockroom activity rises fastest before weekend closeouts, so FEFO rotation and shelf pulls need earlier cutoffs.',
  };

  const anomalyByRole: Record<UserRole, PredictiveAnalytics['anomalyDetection']> = {
    admin: {
      detected: true,
      severity: 'high',
      description: 'Cross-branch overstock spike detected across admin-managed locations on 2026-06-15',
    },
    manager: {
      detected: true,
      severity: 'high',
      description: 'Unusual spike detected in snack shelf returns and pharmacy blister-pack waste on 2026-06-15',
    },
    inventory: {
      detected: true,
      severity: 'medium',
      description: 'Shelf pull delays and stock-in mismatches were detected during the latest inventory closeout.',
    },
  };

  return {
    wasteVolumeForecast: roleForecast,
    seasonalTrends: seasonalTrendsByRole[role],
    anomalyDetection: anomalyByRole[role],
  };
}

// ============ Feature 2: Prescriptive Decision Support Simulation Sandbox ============

export function getPrescriptiveDecisions(role: UserRole = 'manager'): PrescriptiveDecision[] {
  console.log(`🎯 Running Prescriptive Decision Support Simulations for ${getRoleDisplayName(role)}...`);

  const scenarios: Record<UserRole, PrescriptiveDecision[]> = {
    admin: [
      {
        scenario: 'Scenario A: Enforce branch-level FEFO compliance',
        recommendation: 'Require weekly inventory approvals and branch audit checkpoints before replenishment release',
        expectedROI: 35200,
        riskLevel: 'low',
      },
      {
        scenario: 'Scenario B: Improve recovery across vendor returns',
        recommendation: 'Standardize claim evidence, supplier sign-off, and escalation routes for all returned stock',
        expectedROI: 49800,
        riskLevel: 'medium',
      },
      {
        scenario: 'Scenario C: Optimize store operations only',
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
    ],
    manager: [
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
  };

  return scenarios[role];
}

// ============ Feature 3: Profit Leakage Detection Engine ============

export function getProfitLeakage(role: UserRole = 'manager'): ProfitLeakage[] {
  console.log(`💰 Detecting Profit Leakage for ${getRoleDisplayName(role)}...`);

  const datasets: Record<UserRole, ProfitLeakage[]> = {
    admin: [
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
    ],
    manager: [
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
        category: 'Operational Coordination',
        leakageAmount: 7300,
        percentage: 2.67,
        source: 'Manual SKU matching across minimart and pharmacy branches slowed replenishment decisions',
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
  };

  return datasets[role];
}

// ============ Feature 4: Batch-Level FEFO Tracking & Dynamic Price Decay ============

export function getBatchFEFOTracking(role: UserRole = 'manager'): BATCHTracking[] {
  console.log(`📦 Running FEFO Batch Tracking & Price Decay Analysis for ${getRoleDisplayName(role)}...`);

  const now = new Date();

  const batchesByRole: Record<UserRole, BATCHTracking[]> = {
    admin: [
      {
        batchId: 'ADMIN-2026-001',
        expiryDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
        currentPrice: 2.5,
        decayRate: 0.15,
        recommendedPrice: 2.12,
        daysToExpiry: 5,
      },
      {
        batchId: 'ADMIN-2026-002',
        expiryDate: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000),
        currentPrice: 3.8,
        decayRate: 0.08,
        recommendedPrice: 3.49,
        daysToExpiry: 15,
      },
      {
        batchId: 'ADMIN-2026-003',
        expiryDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
        currentPrice: 1.2,
        decayRate: 0.25,
        recommendedPrice: 0.9,
        daysToExpiry: 2,
      },
      {
        batchId: 'ADMIN-2026-004',
        expiryDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        currentPrice: 4.5,
        decayRate: 0.05,
        recommendedPrice: 4.28,
        daysToExpiry: 30,
      },
      {
        batchId: 'ADMIN-2026-005',
        expiryDate: new Date(now.getTime() + 9 * 24 * 60 * 60 * 1000),
        currentPrice: 2.95,
        decayRate: 0.11,
        recommendedPrice: 2.71,
        daysToExpiry: 9,
      },
    ],
    manager: [
      {
        batchId: 'MINI-2026-001',
        expiryDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
        currentPrice: 2.5,
        decayRate: 0.15,
        recommendedPrice: 2.12,
        daysToExpiry: 5,
      },
      {
        batchId: 'PHARMA-2026-002',
        expiryDate: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000),
        currentPrice: 3.8,
        decayRate: 0.08,
        recommendedPrice: 3.49,
        daysToExpiry: 15,
      },
      {
        batchId: 'MINI-2026-003',
        expiryDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
        currentPrice: 1.2,
        decayRate: 0.25,
        recommendedPrice: 0.9,
        daysToExpiry: 2,
      },
      {
        batchId: 'PHARMA-2026-004',
        expiryDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        currentPrice: 4.5,
        decayRate: 0.05,
        recommendedPrice: 4.28,
        daysToExpiry: 30,
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
  };

  return batchesByRole[role];
}

// ============ Feature 5: Automated Vendor Return-Window & Credit Recovery Engine ============

export function getVendorReturns(role: UserRole = 'manager'): VendorReturn[] {
  console.log(`🔄 Processing Vendor Return-Window & Credit Recovery for ${getRoleDisplayName(role)}...`);

  const now = new Date();

  const vendorsByRole: Record<UserRole, VendorReturn[]> = {
    admin: [
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
    manager: [
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
        vendorName: 'PascualLab Pharma Supply',
        returnWindowDays: 14,
        eligibleCredit: 2100,
        returnDeadline: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
        status: 'pending',
      },
      {
        vendorId: 'VENDOR-E222',
        vendorName: 'Store Supply Returns',
        returnWindowDays: 21,
        eligibleCredit: 1650,
        returnDeadline: new Date(now.getTime() + 11 * 24 * 60 * 60 * 1000),
        status: 'pending',
      },
    ],
  };

  return vendorsByRole[role];
}

// ============ Feature 6: Behavioral Loss Intelligence Module ============

export function getBehavioralLossIntelligence(role: UserRole = 'manager'): BehavioralInsight[] {
  console.log(`🧠 Analyzing Behavioral Loss Patterns for ${getRoleDisplayName(role)}...`);

  const insightsByRole: Record<UserRole, BehavioralInsight[]> = {
    admin: [
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
        description: 'Administrative exceptions are delaying approvals',
        frequency: 4,
        impact: 12000,
        recommendation: 'Lock approval thresholds and route outlier requests through the admin queue before they stall inventory flow',
      },
    ],
    manager: [
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
  };

  return insightsByRole[role];
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

export async function initializeDashboard(email: string, password: string, role?: UserRole): Promise<DashboardData> {
  console.log('🚀 Initializing WiWaste Dashboard...\n');

  const resolvedRole = normalizeRole(role ?? inferRoleFromEmail(email));

  // Step 1: Login
  const user = await mockLogin(email, password, resolvedRole);
  console.log('');

  // Step 2: Fetch all features in parallel
  console.log('📥 Loading platform features...\n');

  const predictiveAnalytics = getPredictiveAnalytics(resolvedRole);
  const prescriptiveDecisions = getPrescriptiveDecisions(resolvedRole);
  const profitLeakage = getProfitLeakage(resolvedRole);
  const batchFEFO = getBatchFEFOTracking(resolvedRole);
  const vendorReturns = getVendorReturns(resolvedRole);
  const behavioralInsights = getBehavioralLossIntelligence(resolvedRole);

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
