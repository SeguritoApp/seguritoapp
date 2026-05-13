export type PlanContext = {
  planId: string;
  isTrialActive: boolean;
  maxClients: number;
  maxWorkers: number;
  maxReports: number;
  maxPdfsPerDay: number;
  hasDiep: boolean;
};

export const getPlanLimits = (userPlan: any): PlanContext => {
  const isTrialActive = userPlan?.isTrialActive || false;
  const planId = isTrialActive ? "corporativo" : (userPlan?.subscriptionType || "free");

  // Free: Trial is basically corporativo but marked as trial
  if (planId === "free") {
    return {
      planId: "free",
      isTrialActive,
      maxClients: 1, // Let's give them 1 client to test initially if trial ended
      maxWorkers: 10,
      maxReports: 5,
      maxPdfsPerDay: 1,
      hasDiep: false,
    };
  }

  if (planId === "basico") {
    return {
      planId: "basico",
      isTrialActive,
      maxClients: 2,
      maxWorkers: 100,
      maxReports: 20,
      maxPdfsPerDay: 3,
      hasDiep: false,
    };
  }

  if (planId === "avanzado") {
    return {
      planId: "avanzado",
      isTrialActive,
      maxClients: 8,
      maxWorkers: 500,
      maxReports: 50,
      maxPdfsPerDay: 10,
      hasDiep: true,
    };
  }

  if (planId === "profesional") {
    return {
      planId: "profesional",
      isTrialActive,
      maxClients: 15,
      maxWorkers: 3000,
      maxReports: 100,
      maxPdfsPerDay: 20,
      hasDiep: true,
    };
  }

  // corporativo or pro/full legacy
  return {
    planId: "corporativo",
    isTrialActive,
    maxClients: Infinity,
    maxWorkers: Infinity,
    maxReports: Infinity,
    maxPdfsPerDay: Infinity,
    hasDiep: true,
  };
};
