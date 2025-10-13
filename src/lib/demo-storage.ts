// Demo in-memory storage for specialists and patients (replace with database in production)
// This allows data persistence across API calls during the demo

export interface DemoSpecialist {
  id: string;
  name: string;
  email: string;
  role?: string;
  clinicId?: string;
  specialist: {
    id: string;
    branch: string | null;
    bio: string | null;
    defaultShare: number;
    totalPatients: number;
    totalRevenue: number;
    hourlyFee: number; // New field for hourly fee
  };
}

export interface DemoPatient {
  id: string;
  clinicId: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  reference?: string;
  assignedToId?: string;
  fee?: number;  // Added fee field
  specialistShare?: number;
  totalSessions: number;
  totalPayments: number;
  createdAt: string;
  updatedAt: string;
  specialist?: {
    id: string;
    name: string;
    role: string;
  };
}

class DemoStorage {
  private specialists: DemoSpecialist[] = [
    {
      id: "1",
      name: "Dr. Ayşe Demir",
      email: "ayse.demir@example.com",
      specialist: {
        id: "specialist-1",
        branch: "Kardiyoloji",
        bio: "15 yıllık deneyimli kardiyolog",
        defaultShare: 60.0,
        totalPatients: 25,
        totalRevenue: 45000.0,
        hourlyFee: 500.0
      }
    },
    {
      id: "2",
      name: "Dr. Mehmet Özkan",
      email: "mehmet.ozkan@example.com",
      specialist: {
        id: "specialist-2",
        branch: "Nöroloji",
        bio: "10 yıllık nöroloji uzmanı",
        defaultShare: 55.0,
        totalPatients: 18,
        totalRevenue: 32000.0,
        hourlyFee: 450.0
      }
    },
    {
      id: "3",
      name: "Dr. Zeynep Kaya",
      email: "zeynep.kaya@example.com",
      specialist: {
        id: "specialist-3",
        branch: "Psikiyatri",
        bio: "8 yıllık psikiyatri uzmanı",
        defaultShare: 50.0,
        totalPatients: 30,
        totalRevenue: 52000.0,
        hourlyFee: 400.0
      }
    }
  ];

  private patients: DemoPatient[] = [
    {
      id: "1",
      clinicId: "demo-clinic",
      name: "Ahmet Yılmaz",
      email: "ahmet@example.com",
      phone: "+90 555 123 4567",
      address: "İstanbul, Türkiye",
      reference: "Aile hekimi yönlendirmesi",
      assignedToId: "1",
      fee: 500.0,
      specialistShare: 60.0,
      totalSessions: 5,
      totalPayments: 750.0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      specialist: {
        id: "1",
        name: "Dr. Ayşe Demir",
        role: "UZMAN"
      }
    },
    {
      id: "2",
      clinicId: "demo-clinic",
      name: "Fatma Kaya",
      email: "fatma@example.com",
      phone: "+90 555 987 6543",
      address: "Ankara, Türkiye",
      reference: "Kendisi başvurdu",
      assignedToId: "2",
      fee: 450.0,
      specialistShare: 50.0,
      totalSessions: 3,
      totalPayments: 450.0,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 86400000).toISOString(),
      specialist: {
        id: "2",
        name: "Dr. Mehmet Özkan",
        role: "UZMAN"
      }
    }
  ];

  getAllSpecialists(): DemoSpecialist[] {
    return this.specialists;
  }

  getSpecialistById(id: string): DemoSpecialist | undefined {
    return this.specialists.find(s => s.id === id);
  }

  addSpecialist(specialist: DemoSpecialist): void {
    this.specialists.push(specialist);
  }

  updateSpecialist(id: string, updates: Partial<DemoSpecialist>): DemoSpecialist | null {
    const index = this.specialists.findIndex(s => s.id === id);
    if (index === -1) return null;
    
    this.specialists[index] = { ...this.specialists[index], ...updates };
    return this.specialists[index];
  }

  updateSpecialistProfile(id: string, profileUpdates: Partial<DemoSpecialist['specialist']>): DemoSpecialist | null {
    const index = this.specialists.findIndex(s => s.id === id);
    if (index === -1) return null;
    
    this.specialists[index].specialist = { 
      ...this.specialists[index].specialist, 
      ...profileUpdates 
    };
    return this.specialists[index];
  }

  emailExists(email: string): boolean {
    return this.specialists.some(s => s.email === email);
  }

  // Patient methods
  getAllPatients(): DemoPatient[] {
    return this.patients;
  }

  getPatientById(id: string): DemoPatient | undefined {
    return this.patients.find(p => p.id === id);
  }

  addPatient(patient: DemoPatient): void {
    this.patients.push(patient);
  }

  updatePatient(id: string, updates: Partial<DemoPatient>): DemoPatient | null {
    const index = this.patients.findIndex(p => p.id === id);
    if (index === -1) return null;
    
    this.patients[index] = { ...this.patients[index], ...updates };
    return this.patients[index];
  }
}

// Export a singleton instance
export const demoStorage = new DemoStorage();