import { useState, useEffect, useMemo } from "react";
import { deduplicateDrafts } from "../../../../utils/medicationListNormalizer";

export const formatFoodContext = (val: any): string => {
  if (!val) return "None";
  const str = String(val).replace(/_/g, " ").toLowerCase();
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export const formatStartDate = (val: any): string => {
  if (!val) return "None";
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const day = String(d.getDate()).padStart(2, "0");
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return String(val);
  }
};

export const isPastDate = (dateVal: any): boolean => {
  if (!dateVal || dateVal === "None") return false;
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(dateVal);
    d.setHours(0, 0, 0, 0);
    return d < today;
  } catch {
    return false;
  }
};

export const getDosageString = (med: any): string => {
  const rawDosage = med.dosage || med.dose || med.dosePerIntake || "";
  let dosage = "";
  if (rawDosage && typeof rawDosage === "object") {
    if (rawDosage.count !== undefined) {
      const typeStr = (med.type || "tablet").toLowerCase();
      dosage = `${rawDosage.count} ${typeStr}(s)`;
    } else if (rawDosage.value !== undefined) {
      dosage = `${rawDosage.value} ${rawDosage.unit || ""}`.trim();
    } else {
      dosage = JSON.stringify(rawDosage);
    }
  } else if (rawDosage) {
    dosage = String(rawDosage);
  } else {
    dosage = "1 tablet(s)";
  }
  return dosage;
};

export const getTimeString = (med: any): string => {
  const time = med.schedule || med.medicationSchedule || med.times || "";
  if (!time) return "None";
  if (typeof time === "string") return time;
  if (Array.isArray(time)) {
    return time.join(", ");
  }
  if (typeof time === "object" && time !== null) {
    const timesList = time.times || time.reminderTimes || [];
    if (Array.isArray(timesList) && timesList.length > 0) {
      return timesList.join(", ");
    }
    return Object.entries(time)
      .filter(([_, v]) => typeof v === "string" || typeof v === "number")
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ") || "None";
  }
  return "None";
};

export const hasConflict = (m: any): boolean =>
  Boolean(
    m?.duplicateInfo?.hasDuplicate ||
    m?.duplicateInfo?.conflictType ||
    (m?.duplicateInfo?.matchedMedications && m.duplicateInfo.matchedMedications.length > 0) ||
    m?.duplicateInfo?.matchedMedication
  );

export interface UseMedicineReviewStateProps {
  localMedicines: any[];
  setLocalMedicines: React.Dispatch<React.SetStateAction<any[]>>;
  readOnly?: boolean;
}

export function useMedicineReviewState({
  localMedicines,
  setLocalMedicines,
  readOnly,
}: UseMedicineReviewStateProps) {
  const todayDateString = useMemo(() => new Date().toISOString().split("T")[0], []);
  
  const safeLocalMedicines = useMemo(() => {
    return deduplicateDrafts(localMedicines || []).map((m) => ({
      ...m,
      selected: m.selected !== false,
      startDate: m.startDate && m.startDate !== "None" ? m.startDate : todayDateString,
    }));
  }, [localMedicines, todayDateString]);

  const [checkedMeds, setCheckedMeds] = useState<string[]>(() =>
    safeLocalMedicines.filter((m) => m.selected !== false).map((m) => m.client_med_id || m.id),
  );

  const [expandedMedId, setExpandedMedId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const deduped = deduplicateDrafts(localMedicines || []);
    setCheckedMeds(
      deduped.filter((m) => m.selected !== false).map((m) => m.client_med_id || m.id),
    );
  }, [localMedicines]);

  const [resolutions, setResolutions] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    (localMedicines || []).forEach((m) => {
      const key = m.client_med_id || m.id;
      if (m.resolution) {
        initial[key] = m.resolution;
        if (m.id) initial[m.id] = m.resolution;
      } else if (!hasConflict(m)) {
        initial[key] = "KEEP_NEW";
        if (m.id) initial[m.id] = "KEEP_NEW";
      }
    });
    return initial;
  });

  useEffect(() => {
    setResolutions((prev) => {
      const next = { ...prev };
      (localMedicines || []).forEach((m) => {
        const key = m.client_med_id || m.id;
        if (m.resolution && next[key] === undefined) {
          next[key] = m.resolution;
          if (m.id) next[m.id] = m.resolution;
        } else if (!hasConflict(m) && next[key] === undefined) {
          next[key] = "KEEP_NEW";
          if (m.id) next[m.id] = "KEEP_NEW";
        }
      });
      return next;
    });
  }, [localMedicines]);

  const conflictingMeds = readOnly
    ? []
    : safeLocalMedicines.filter((m) => {
        const isChecked = Boolean(
          (m.client_med_id && checkedMeds.includes(m.client_med_id)) ||
          (m.id && checkedMeds.includes(m.id))
        );
        const isResolved =
          (m.client_med_id && resolutions[m.client_med_id] !== undefined) ||
          (m.id && resolutions[m.id] !== undefined);
        return isChecked && hasConflict(m) && !isResolved;
      });

  const [viewMode, setViewMode] = useState<"conflicts" | "list">("list");
  const [currentConflictIdx, setCurrentConflictIdx] = useState(0);

  useEffect(() => {
    if (!readOnly && conflictingMeds.length > 0) {
      setViewMode("conflicts");
    } else {
      setViewMode("list");
    }
  }, [conflictingMeds.length, readOnly]);

  const toggleCheck = (id: string) => {
    const targetMed = safeLocalMedicines.find(
      (m) => m.client_med_id === id || m.id === id
    );
    const matchKeys = [
      id,
      targetMed?.id,
      targetMed?.client_med_id,
    ].filter(Boolean) as string[];

    const isCurrentlyChecked = matchKeys.some((k) => checkedMeds.includes(k));

    if (isCurrentlyChecked) {
      setCheckedMeds((prev) => prev.filter((m) => !matchKeys.includes(m)));
      setLocalMedicines((prev) =>
        prev.map((m) => {
          const isMatch =
            (m.client_med_id && matchKeys.includes(m.client_med_id)) ||
            (m.id && matchKeys.includes(m.id));
          return isMatch ? { ...m, selected: false } : m;
        })
      );
    } else {
      const primaryKey = targetMed?.client_med_id || targetMed?.id || id;
      const nextChecked = [
        ...checkedMeds.filter((m) => !matchKeys.includes(m)),
        primaryKey,
      ];
      setCheckedMeds(nextChecked);
      setLocalMedicines((prev) =>
        prev.map((m) => {
          const isMatch =
            (m.client_med_id && matchKeys.includes(m.client_med_id)) ||
            (m.id && matchKeys.includes(m.id));
          return isMatch ? { ...m, selected: true, resolution: undefined } : m;
        })
      );
      setResolutions((prev) => {
        const next = { ...prev };
        matchKeys.forEach((k) => delete next[k]);
        return next;
      });

      if (targetMed && hasConflict(targetMed)) {
        const nextConflicting = safeLocalMedicines.filter((m) => {
          const isChecked = Boolean(
            (m.client_med_id && nextChecked.includes(m.client_med_id)) ||
            (m.id && nextChecked.includes(m.id))
          );
          const isTarget = matchKeys.includes(m.id) || (m.client_med_id && matchKeys.includes(m.client_med_id));
          const isResolved =
            (m.client_med_id && resolutions[m.client_med_id] !== undefined) ||
            (m.id && resolutions[m.id] !== undefined);
          return isChecked && hasConflict(m) && (isTarget ? true : !isResolved);
        });
        const targetIdx = nextConflicting.findIndex((m) =>
          matchKeys.includes(m.id) || (m.client_med_id && matchKeys.includes(m.client_med_id))
        );
        if (targetIdx !== -1) {
          setCurrentConflictIdx(targetIdx);
        }
        setViewMode("conflicts");
      }
    }
  };

  const toggleExpandPill = (id: string) => {
    if (expandedMedId === id) {
      setExpandedMedId(null);
    } else {
      setExpandedMedId(id);
    }
  };

  const handleResolveConflict = (medId: string, action: string) => {
    setResolutions((prev) => ({ ...prev, [medId]: action }));
    const remainingCount = safeLocalMedicines.filter((m) => {
      const isChecked = Boolean(
        (m.client_med_id && checkedMeds.includes(m.client_med_id)) ||
        (m.id && checkedMeds.includes(m.id))
      );
      const isCurrentMed = m.id === medId || m.client_med_id === medId;
      const isResolved =
        (m.client_med_id && resolutions[m.client_med_id] !== undefined) ||
        (m.id && resolutions[m.id] !== undefined);
      return isChecked && hasConflict(m) && !isCurrentMed && !isResolved;
    }).length;
    if (remainingCount === 0) {
      setViewMode("list");
      setCurrentConflictIdx(0);
    } else if (currentConflictIdx >= remainingCount) {
      setCurrentConflictIdx(Math.max(0, remainingCount - 1));
    }
  };

  return {
    safeLocalMedicines,
    checkedMeds,
    setCheckedMeds,
    expandedMedId,
    setExpandedMedId,
    isExpanded,
    setIsExpanded,
    resolutions,
    setResolutions,
    conflictingMeds,
    viewMode,
    setViewMode,
    currentConflictIdx,
    setCurrentConflictIdx,
    toggleCheck,
    toggleExpandPill,
    handleResolveConflict,
  };
}
