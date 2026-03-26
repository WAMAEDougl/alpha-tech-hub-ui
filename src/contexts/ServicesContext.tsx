import React, { createContext, useContext, useState } from "react";
import { Wrench, Monitor, HardDrive, Wifi, Shield, type LucideIcon } from "lucide-react";

export interface ServiceItem {
  id: string;
  title: string;
  desc: string;
  priceFrom: number; // KES
  icon: LucideIcon;
  active: boolean;
}

export interface ServiceBooking {
  id: string;           // ticket number e.g. SVC-0001
  customerName: string;
  phone: string;
  email: string;
  deviceBrand: string;
  deviceModel: string;
  serviceId: string;
  serviceTitle: string;
  problemDesc: string;
  status: "Received" | "Diagnostic" | "Awaiting Parts" | "In Repair" | "Ready for Pickup" | "Completed";
  technician: string;
  submittedAt: string;
  estimatedCost: number | null;
  notes: string;
}

const defaultServices: ServiceItem[] = [
  { id: "svc-1", title: "Hardware Diagnostic", desc: "Full system diagnostics and troubleshooting for all brands", priceFrom: 1500, icon: Wrench, active: true },
  { id: "svc-2", title: "OS Installation", desc: "Windows, Linux, or macOS setup with driver installation", priceFrom: 2000, icon: Monitor, active: true },
  { id: "svc-3", title: "Data Recovery", desc: "Recover lost files from damaged drives and storage media", priceFrom: 3500, icon: HardDrive, active: true },
  { id: "svc-4", title: "Network Setup", desc: "Home & office network configuration, WiFi optimization", priceFrom: 2500, icon: Wifi, active: true },
  { id: "svc-5", title: "Virus Removal", desc: "Complete malware scan, removal, and security hardening", priceFrom: 1500, icon: Shield, active: true },
  { id: "svc-6", title: "Screen Replacement", desc: "Laptop screen replacement for all major brands", priceFrom: 5000, icon: Monitor, active: true },
];

let ticketCounter = 1;
function nextTicket() {
  return `SVC-${String(ticketCounter++).padStart(4, "0")}`;
}

interface ServicesContextValue {
  services: ServiceItem[];
  updateServicePrice: (id: string, priceFrom: number) => void;
  toggleService: (id: string) => void;
  bookings: ServiceBooking[];
  addBooking: (b: Omit<ServiceBooking, "id" | "status" | "submittedAt" | "technician" | "estimatedCost" | "notes">) => string;
  updateBooking: (id: string, patch: Partial<ServiceBooking>) => void;
  deleteBooking: (id: string) => void;
  findBooking: (ticketId: string) => ServiceBooking | undefined;
}

const ServicesContext = createContext<ServicesContextValue>({
  services: defaultServices,
  updateServicePrice: () => {},
  toggleService: () => {},
  bookings: [],
  addBooking: () => "",
  updateBooking: () => {},
  deleteBooking: () => {},
  findBooking: () => undefined,
});

export function ServicesProvider({ children }: { children: React.ReactNode }) {
  const [services, setServices] = useState<ServiceItem[]>(defaultServices);
  const [bookings, setBookings] = useState<ServiceBooking[]>([]);

  function updateServicePrice(id: string, priceFrom: number) {
    setServices(prev => prev.map(s => s.id === id ? { ...s, priceFrom } : s));
  }

  function toggleService(id: string) {
    setServices(prev => prev.map(s => s.id === id ? { ...s, active: !s.active } : s));
  }

  function addBooking(b: Omit<ServiceBooking, "id" | "status" | "submittedAt" | "technician" | "estimatedCost" | "notes">): string {
    const id = nextTicket();
    setBookings(prev => [...prev, {
      ...b, id,
      status: "Received",
      technician: "Unassigned",
      estimatedCost: null,
      notes: "",
      submittedAt: new Date().toLocaleString(),
    }]);
    return id;
  }

  function updateBooking(id: string, patch: Partial<ServiceBooking>) {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, ...patch } : b));
  }

  function deleteBooking(id: string) {
    setBookings(prev => prev.filter(b => b.id !== id));
  }

  function findBooking(ticketId: string) {
    return bookings.find(b => b.id.toLowerCase() === ticketId.toLowerCase());
  }

  return (
    <ServicesContext.Provider value={{ services, updateServicePrice, toggleService, bookings, addBooking, updateBooking, deleteBooking, findBooking }}>
      {children}
    </ServicesContext.Provider>
  );
}

export function useServices() {
  return useContext(ServicesContext);
}
