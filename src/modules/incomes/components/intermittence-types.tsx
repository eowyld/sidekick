export interface IntermittenceMission {
  id: string;
  date: string; // Format ISO (YYYY-MM-DD)
  employer: string;
  type: "Spectacle" | "Répétition rémunérée" | "Enregistrement" | "Autre";
  hours: number;
  grossAmount: number;
  charges: number;
  netAmount: number;
  notes: string;
}

