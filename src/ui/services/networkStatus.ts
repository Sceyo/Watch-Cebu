/**
 * Network Status & Offline Detection Service
 *
 * Tracks device connectivity status (online/offline) and provides
 * direct access to critical Cebu civic emergency hotlines.
 */

export interface EmergencyHotline {
  name: string;
  agency: string;
  phone: string;
  displayPhone: string;
  available: string;
  description: string;
}

export const CEBU_EMERGENCY_HOTLINES: EmergencyHotline[] = [
  {
    name: "Cebu City DRRMO",
    agency: "Disaster Risk Reduction & Management Office",
    phone: "tel:0322557371",
    displayPhone: "(032) 255-7371 / 166",
    available: "24/7",
    description: "City disaster response, rescue, and evacuation command."
  },
  {
    name: "VECO Emergency Hotline",
    agency: "Visayan Electric Company",
    phone: "tel:0322308326",
    displayPhone: "(032) 230-8326",
    available: "24/7",
    description: "Downed power lines, transformer fires, and emergency outages."
  },
  {
    name: "Philippine Red Cross Cebu",
    agency: "PRC Cebu Chapter",
    phone: "tel:0322555554",
    displayPhone: "(032) 255-5554",
    available: "24/7",
    description: "Ambulance, blood services, and disaster relief."
  },
  {
    name: "Cebu City Fire Station",
    agency: "Bureau of Fire Protection (BFP)",
    phone: "tel:0322560541",
    displayPhone: "(032) 256-0541 / 160",
    available: "24/7",
    description: "Fire rescue, hazardous material incidents, and structural collapse."
  },
  {
    name: "National Emergency Hotline",
    agency: "Philippine National Police / Emergency Services",
    phone: "tel:911",
    displayPhone: "911",
    available: "24/7",
    description: "General police, fire, and medical emergency assistance."
  }
];

export function isOnline(): boolean {
  if (typeof navigator !== "undefined" && typeof navigator.onLine === "boolean") {
    return navigator.onLine;
  }
  return true;
}

export function onNetworkChange(callback: (online: boolean) => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
}
