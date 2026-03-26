import React, { createContext, useContext, useState } from "react";

export interface DisposalRequest {
  id: string;
  name: string;
  phone: string;
  email: string;
  items: string;        // description of what they're bringing
  quantity: number;
  preferredDate: string;
  notes: string;
  status: "Pending" | "Confirmed" | "Received" | "Processed";
  submittedAt: string;
}

interface DisposalContextValue {
  requests: DisposalRequest[];
  addRequest: (r: Omit<DisposalRequest, "id" | "status" | "submittedAt">) => void;
  updateStatus: (id: string, status: DisposalRequest["status"]) => void;
  deleteRequest: (id: string) => void;
}

const DisposalContext = createContext<DisposalContextValue>({
  requests: [],
  addRequest: () => {},
  updateStatus: () => {},
  deleteRequest: () => {},
});

export function DisposalProvider({ children }: { children: React.ReactNode }) {
  const [requests, setRequests] = useState<DisposalRequest[]>([]);

  function addRequest(r: Omit<DisposalRequest, "id" | "status" | "submittedAt">) {
    setRequests(prev => [
      ...prev,
      { ...r, id: Date.now().toString(), status: "Pending", submittedAt: new Date().toLocaleString() },
    ]);
  }

  function updateStatus(id: string, status: DisposalRequest["status"]) {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  }

  function deleteRequest(id: string) {
    setRequests(prev => prev.filter(r => r.id !== id));
  }

  return (
    <DisposalContext.Provider value={{ requests, addRequest, updateStatus, deleteRequest }}>
      {children}
    </DisposalContext.Provider>
  );
}

export function useDisposal() {
  return useContext(DisposalContext);
}
