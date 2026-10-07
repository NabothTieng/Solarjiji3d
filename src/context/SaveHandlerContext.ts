import { createContext, useContext } from "react";
import type { SolarPlannerData } from "../types/solar-planner";

export type SaveHandler = ((data: SolarPlannerData) => void) | undefined;

export const SaveHandlerContext = createContext<SaveHandler>(undefined);

export function useSaveHandler() {
  return useContext(SaveHandlerContext);
}
