"use client";

import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { 
  KpiId, Scenario, ScenarioOutput, ReverseStressResult, 
  ForecastPoint, MonteCarloResult, BoardBrief, PipelineHealth 
} from '@/lib/types';
import { GlobalVariables, AllScenarioInputs } from '@/lib/scenarioAutomate/types';
import { User } from '@/lib/auth';
import { fetchCurrentUser } from '@/lib/api';

export interface AppState {
  baseCase: Record<KpiId, number>;
  scenarioLibrary: Scenario[];
  activeScenario: Scenario | null;
  scenarioOutput: ScenarioOutput | null;
  comparisonA: Scenario | null;
  comparisonB: Scenario | null;
  reverseStressResult: ReverseStressResult | null;
  forecast: ForecastPoint[];
  monteCarloResult: MonteCarloResult | null;
  briefs: BoardBrief[];
  pipelineHealth: PipelineHealth | null;
  globalLoading: boolean;
  briefSlideover: { open: boolean; brief?: BoardBrief };
  activeForecastKpi: KpiId;
  scenarioAutomateGlobals: GlobalVariables | null;
  scenarioAutomateInputs: AllScenarioInputs | null;
  
  // Auth State
  currentUser: User | null;
  isAuthLoading: boolean;
}

const initialState: AppState = {
  baseCase: {} as Record<KpiId, number>,
  scenarioLibrary: [],
  activeScenario: null,
  scenarioOutput: null,
  comparisonA: null,
  comparisonB: null,
  reverseStressResult: null,
  forecast: [],
  monteCarloResult: null,
  briefs: [],
  pipelineHealth: null,
  globalLoading: false,
  briefSlideover: { open: false },
  activeForecastKpi: 'FIN01',
  scenarioAutomateGlobals: null,
  scenarioAutomateInputs: null,
  
  currentUser: null,
  isAuthLoading: true,
};

type Action =
  | { type: 'SET_GLOBAL_LOADING'; payload: boolean }
  | { type: 'SET_SCENARIO_LIBRARY'; payload: Scenario[] }
  | { type: 'SET_ACTIVE_SCENARIO'; payload: Scenario | null }
  | { type: 'SET_SCENARIO_OUTPUT'; payload: ScenarioOutput | null }
  | { type: 'SET_BASE_CASE'; payload: Record<KpiId, number> }
  | { type: 'SET_PIPELINE_HEALTH'; payload: PipelineHealth | null }
  | { type: 'SET_FORECAST'; payload: ForecastPoint[] }
  | { type: 'SET_MONTE_CARLO'; payload: MonteCarloResult | null }
  | { type: 'SET_BRIEFS'; payload: BoardBrief[] }
  | { type: 'SET_COMPARISON_A'; payload: Scenario | null }
  | { type: 'SET_COMPARISON_B'; payload: Scenario | null }
  | { type: 'SET_REVERSE_STRESS_RESULT'; payload: ReverseStressResult }
  | { type: 'OPEN_BRIEF_SLIDEOVER'; payload: { brief: BoardBrief } }
  | { type: 'CLOSE_BRIEF_SLIDEOVER' }
  | { type: 'SET_ACTIVE_FORECAST_KPI'; payload: KpiId }
  | { type: 'SET_SA_GLOBALS'; payload: GlobalVariables | null }
  | { type: 'SET_SA_INPUTS'; payload: AllScenarioInputs | null }
  | { type: 'SET_CURRENT_USER'; payload: User | null }
  | { type: 'SET_AUTH_LOADING'; payload: boolean };

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_GLOBAL_LOADING': return { ...state, globalLoading: action.payload };
    case 'SET_SCENARIO_LIBRARY': return { ...state, scenarioLibrary: action.payload };
    case 'SET_ACTIVE_SCENARIO': return { ...state, activeScenario: action.payload };
    case 'SET_SCENARIO_OUTPUT': return { ...state, scenarioOutput: action.payload };
    case 'SET_BASE_CASE': return { ...state, baseCase: action.payload };
    case 'SET_PIPELINE_HEALTH': return { ...state, pipelineHealth: action.payload };
    case 'SET_FORECAST': return { ...state, forecast: action.payload };
    case 'SET_MONTE_CARLO': return { ...state, monteCarloResult: action.payload };
    case 'SET_BRIEFS': return { ...state, briefs: action.payload };
    case 'SET_COMPARISON_A': return { ...state, comparisonA: action.payload };
    case 'SET_COMPARISON_B': return { ...state, comparisonB: action.payload };
    case 'SET_REVERSE_STRESS_RESULT': return { ...state, reverseStressResult: action.payload };
    case 'OPEN_BRIEF_SLIDEOVER': return { ...state, briefSlideover: { open: true, brief: action.payload.brief } };
    case 'CLOSE_BRIEF_SLIDEOVER': return { ...state, briefSlideover: { open: false, brief: state.briefSlideover.brief } };
    case 'SET_ACTIVE_FORECAST_KPI': return { ...state, activeForecastKpi: action.payload };
    case 'SET_SA_GLOBALS': return { ...state, scenarioAutomateGlobals: action.payload };
    case 'SET_SA_INPUTS': return { ...state, scenarioAutomateInputs: action.payload };
    case 'SET_CURRENT_USER': return { ...state, currentUser: action.payload };
    case 'SET_AUTH_LOADING': return { ...state, isAuthLoading: action.payload };
    default: return state;
  }
}

const AppStateContext = createContext<{ state: AppState; dispatch: React.Dispatch<Action> } | undefined>(undefined);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Check auth status from FastAPI backend on load
  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      dispatch({ type: 'SET_AUTH_LOADING', payload: true });
      try {
        const user = await fetchCurrentUser();
        if (isMounted) {
          dispatch({ type: 'SET_CURRENT_USER', payload: user });
        }
      } catch {
        if (isMounted) {
          dispatch({ type: 'SET_CURRENT_USER', payload: null });
        }
      } finally {
        if (isMounted) {
          dispatch({ type: 'SET_AUTH_LOADING', payload: false });
        }
      }
    }

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <AppStateContext.Provider value={{ state, dispatch }}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
}