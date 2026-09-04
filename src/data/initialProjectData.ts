import type { ProjectMasterState } from '../types/projectModel.ts';

export const INITIAL_PROJECT_STATE: ProjectMasterState = {
  projectCode: 'BT-2026-H04',
  projectName: 'Horizon Commercial Tower (G+18 + 3B)',
  dataDate: '2026-05-01',
  contractOriginalValue: 14500000,
  approvedVariationsValue: 380000,

  boqItems: [
    {
      id: 'BOQ-01',
      itemCode: '03.300.01',
      description: 'Reinforced Concrete Raft Foundation C40/50 with Silica Fume',
      unit: 'm³',
      contractQty: 4200,
      unitRate: 185,
      totalBudget: 777000,
      executedQty: 3150,
      executedAmount: 582750,
      packageId: 'PKG-CIVIL',
      purchasedQty: 3300,
      wasteAllowancePercent: 5.0
    },
    {
      id: 'BOQ-02',
      itemCode: '03.300.02',
      description: 'Reinforced Concrete Columns & Core Walls Basement Levels',
      unit: 'm³',
      contractQty: 1800,
      unitRate: 240,
      totalBudget: 432000,
      executedQty: 720,
      executedAmount: 172800,
      packageId: 'PKG-CIVIL',
      purchasedQty: 750,
      wasteAllowancePercent: 5.0
    },
    {
      id: 'BOQ-03',
      itemCode: '03.300.03',
      description: 'Post-Tensioned Suspended Slabs (Ground to L1)',
      unit: 'm²',
      contractQty: 6500,
      unitRate: 95,
      totalBudget: 617500,
      executedQty: 1300,
      executedAmount: 123500,
      packageId: 'PKG-CIVIL',
      purchasedQty: 1350,
      wasteAllowancePercent: 5.0
    },
    {
      id: 'BOQ-04',
      itemCode: '15.100.01',
      description: 'Underground Drainage, Dewatering & HDPE Sleeves',
      unit: 'LM',
      contractQty: 1200,
      unitRate: 110,
      totalBudget: 132000,
      executedQty: 1080,
      executedAmount: 118800,
      packageId: 'PKG-MEP'
    },
    {
      id: 'BOQ-05',
      itemCode: '15.200.01',
      description: 'HVAC Chilled Water Heavy Risers & Plant Room Headers',
      unit: 'LM',
      contractQty: 850,
      unitRate: 260,
      totalBudget: 221000,
      executedQty: 212,
      executedAmount: 55120,
      packageId: 'PKG-MEP'
    },
    {
      id: 'BOQ-06',
      itemCode: '08.900.01',
      description: 'External Unitized Curtain Wall Facade & Double Glazed Units',
      unit: 'm²',
      contractQty: 4800,
      unitRate: 380,
      totalBudget: 1824000,
      executedQty: 0,
      executedAmount: 0,
      packageId: 'PKG-FACADE'
    }
  ],

  contracts: [
    {
      packageId: 'PKG-CIVIL',
      packageName: 'Structural Concrete & Civil Works Package',
      subcontractor: 'Apex Heavy Structures Ltd.',
      contractValue: 1826500,
      paidToDate: 640000,
      retentionHeld: 64000, // 10%
      retentionPct: 10,
      pendingIpcAmount: 178000,
      paymentPolicy: 'Back_to_Back',
      clientIpcCleared: true // Employer paid -> safe to disburse
    },
    {
      packageId: 'PKG-MEP',
      packageName: 'Mechanical, Electrical & Plumbing (MEP) Core',
      subcontractor: 'Voltaic MEP Engineering Co.',
      contractValue: 1150000,
      paidToDate: 120000,
      retentionHeld: 12000,
      retentionPct: 10,
      pendingIpcAmount: 95000,
      paymentPolicy: 'Back_to_Back',
      clientIpcCleared: false // Employer has NOT certified -> PWP rule holds payment
    },
    {
      packageId: 'PKG-FACADE',
      packageName: 'Architectural Envelope & Glazing Package',
      subcontractor: 'Skyline Glass & Cladding Systems',
      contractValue: 1824000,
      paidToDate: 0,
      retentionHeld: 0,
      retentionPct: 10,
      pendingIpcAmount: 0,
      paymentPolicy: 'Back_to_Back',
      clientIpcCleared: false
    }
  ],

  activities: [
    {
      activityId: 'ACT-1010',
      taskName: 'Substructure Raft Concrete Pour Zone A',
      wbsCode: '1.2.1',
      packageId: 'PKG-CIVIL',
      boqItemId: 'BOQ-01',
      plannedStartDate: '2026-05-01',
      plannedFinishDate: '2026-05-15',
      durationDays: 14,
      progressPct: 75,
      weightFactor: 0.25,
      isCritical: true
    },
    {
      activityId: 'ACT-1020',
      taskName: 'Basement Columns & Retaining Wall Shuttering',
      wbsCode: '1.2.2',
      packageId: 'PKG-CIVIL',
      boqItemId: 'BOQ-02',
      plannedStartDate: '2026-05-16',
      plannedFinishDate: '2026-05-28',
      durationDays: 12,
      progressPct: 40,
      weightFactor: 0.18,
      isCritical: true
    },
    {
      activityId: 'ACT-1030',
      taskName: 'Level 1 Suspended Slab Post-Tensioning',
      wbsCode: '1.3.1',
      packageId: 'PKG-CIVIL',
      boqItemId: 'BOQ-03',
      plannedStartDate: '2026-06-02',
      plannedFinishDate: '2026-06-22',
      durationDays: 20,
      progressPct: 20,
      weightFactor: 0.22,
      isCritical: true
    },
    {
      activityId: 'ACT-1040',
      taskName: 'MEP Underground Drainage & Sleeves Inspection',
      wbsCode: '2.1.1',
      packageId: 'PKG-MEP',
      boqItemId: 'BOQ-04',
      plannedStartDate: '2026-05-05',
      plannedFinishDate: '2026-05-13',
      durationDays: 8,
      progressPct: 90,
      weightFactor: 0.15,
      isCritical: false
    },
    {
      activityId: 'ACT-1050',
      taskName: 'HVAC Chilled Water Risers Installation',
      wbsCode: '2.2.1',
      packageId: 'PKG-MEP',
      boqItemId: 'BOQ-05',
      plannedStartDate: '2026-06-10',
      plannedFinishDate: '2026-07-05',
      durationDays: 25,
      progressPct: 25,
      weightFactor: 0.12,
      isCritical: false
    },
    {
      activityId: 'ACT-1090',
      taskName: 'External Facade Mockup Consultant Sign-off',
      wbsCode: '3.1.0',
      packageId: 'PKG-FACADE',
      boqItemId: 'BOQ-06',
      plannedStartDate: '2026-06-20',
      plannedFinishDate: '2026-07-05',
      durationDays: 15,
      progressPct: 0,
      weightFactor: 0.08,
      isCritical: false
    }
  ],

  wirs: [
    {
      id: 'WIR-2026-084',
      title: 'Basement 2 Raft Rebar & Sleeves Inspection',
      activityId: 'ACT-1010',
      boqItemId: 'BOQ-01',
      packageId: 'PKG-CIVIL',
      location: 'Zone B Axis 1-6',
      inspectionDate: '2026-05-01',
      quantityInspected: 350, // m3 ready for pour
      status: 'Consultant_Pending',
      consultantNotes: 'Checking top reinforcement cover and shear links',
      submittedBy: 'Eng. Tamer (Civil Site)'
    },
    {
      id: 'WIR-2026-083',
      title: 'Retaining Wall Waterstop Joint Inspection',
      activityId: 'ACT-1020',
      boqItemId: 'BOQ-02',
      packageId: 'PKG-CIVIL',
      location: 'Axis 4-8 Perimeter',
      inspectionDate: '2026-04-30',
      quantityInspected: 45, // m
      status: 'Approved',
      consultantNotes: 'Hydrophilic swellable bar approved with primer',
      submittedBy: 'Eng. Tamer (Civil Site)'
    },
    {
      id: 'WIR-2026-082',
      title: 'Underground Chilled Water Pressure Test',
      activityId: 'ACT-1040',
      boqItemId: 'BOQ-04',
      packageId: 'PKG-MEP',
      location: 'Basement Plant Room',
      inspectionDate: '2026-04-29',
      quantityInspected: 120, // LM
      status: 'Approved',
      consultantNotes: 'Tested at 12 bar for 4 hours without pressure drop',
      submittedBy: 'Eng. Mostafa (MEP Site)'
    }
  ],

  dailyLogs: [
    {
      date: '2026-05-01',
      weather: 'Clear 31°C, Humidity 45%',
      manpowerTotal: 142,
      equipmentActive: 8,
      concreteVolumePouredM3: 280,
      ongoingActivityIds: ['ACT-1010', 'ACT-1020', 'ACT-1040'],
      safetyIncidents: 0,
      submitted: false,
      signedByEngineer: undefined
    }
  ],

  approvals: [
    {
      id: 'APPR-101',
      type: 'IPC_PAYMENT',
      title: 'Consultant Employer IPC #05 Collection Certification',
      packageId: 'PKG-CIVIL',
      amount: 420000,
      scheduleImpactDays: 0,
      status: 'Pending',
      dateCreated: '2026-05-01',
      rationale: 'Certified milestone valuation unlocking downstream back-to-back trade payments.'
    },
    {
      id: 'APPR-102',
      type: 'VARIATION_ORDER',
      title: 'PVO-03: Structural Foundation Deepening Variation',
      packageId: 'PKG-CIVIL',
      amount: 85000,
      scheduleImpactDays: 12,
      status: 'Pending',
      dateCreated: '2026-04-28',
      rationale: 'Unforeseen subterranean cavity requiring additional mass concrete and 12 days EOT.'
    },
    {
      id: 'APPR-103',
      type: 'RETENTION_RELEASE',
      title: 'Subcontractor Retention Release - Earthworks Milestone',
      packageId: 'PKG-CIVIL',
      amount: 24750,
      scheduleImpactDays: 0,
      status: 'Pending',
      dateCreated: '2026-04-29',
      rationale: 'Completion certificate issued for excavation and shoring without outstanding punch list.'
    }
  ]
};
