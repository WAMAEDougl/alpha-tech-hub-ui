import React, { createContext, useContext, useState } from "react";

export interface BudgetRange {
  id: string;
  label: string;
  minKes: number;
  maxKes: number | null; // null = no upper limit
}

export interface BuildRequest {
  id: string;
  name: string;
  phone: string;
  buildType: string;
  budget: string;
  useCases: string[];
  notes: string;
  status: "New" | "In Progress" | "Quoted" | "Completed";
  submittedAt: string;
}

const defaultBudgetRanges: BudgetRange[] = [
  { id: "1", label: "Under KES 50,000",          minKes: 0,      maxKes: 50000  },
  { id: "2", label: "KES 50,000 – 100,000",       minKes: 50000,  maxKes: 100000 },
  { id: "3", label: "KES 100,000 – 200,000",      minKes: 100000, maxKes: 200000 },
  { id: "4", label: "KES 200,000 – 350,000",      minKes: 200000, maxKes: 350000 },
  { id: "5", label: "Above KES 350,000",           minKes: 350000, maxKes: null   },
];

interface CustomBuildsContextValue {
  budgetRanges: BudgetRange[];
  setBudgetRanges: (ranges: BudgetRange[]) => void;
  buildRequests: BuildRequest[];
  addBuildRequest: (req: Omit<BuildRequest, "id" | "status" | "submittedAt">) => void;
  updateRequestStatus: (id: string, status: BuildRequest["status"]) => void;
  deleteRequest: (id: string) => void;
}

const CustomBuildsContext = createContext<CustomBuildsContextValue>({
  budgetRanges: defaultBudgetRanges,
  setBudgetRanges: () => {},
  buildRequests: [],
  addBuildRequest: () => {},
  updateRequestStatus: () => {},
  deleteRequest: () => {},
});

export function CustomBuildsProvider({ children }: { children: React.ReactNode }) {
  const [budgetRanges, setBudgetRanges] = useState<BudgetRange[]>(defaultBudgetRanges);
  const [buildRequests, setBuildRequests] = useState<BuildRequest[]>([]);

  function addBuildRequest(req: Omit<BuildRequest, "id" | "status" | "submittedAt">) {
    setBuildRequests(prev => [
      ...prev,
      {
        ...req,
        id: Date.now().toString(),
        status: "New",
        submittedAt: new Date().toLocaleString(),
      },
    ]);
  }

  function updateRequestStatus(id: string, status: BuildRequest["status"]) {
    setBuildRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  }

  function deleteRequest(id: string) {
    setBuildRequests(prev => prev.filter(r => r.id !== id));
  }

  return (
    <CustomBuildsContext.Provider value={{
      budgetRanges, setBudgetRanges,
      buildRequests, addBuildRequest, updateRequestStatus, deleteRequest,
    }}>
      {children}
    </CustomBuildsContext.Provider>
  );
}

export function useCustomBuilds() {
  return useContext(CustomBuildsContext);
}
