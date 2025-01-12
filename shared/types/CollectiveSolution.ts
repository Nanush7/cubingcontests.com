import { NxNMove } from "../types.ts";

export type CollectiveSolution = {
  eventId: string;
  attemptNumber: number;
  scramble: string;
  solution: string;
  lastUserWhoInteracted: unknown;
  usersWhoMadeMoves: unknown[];
  state: 10 | 20 | 30; // 10 - ongoing solution; 20 - solved; 30 - archived (a new scramble has been generated since)
};

export type FeCollectiveSolution = Omit<CollectiveSolution, "usersWhoMadeMoves" | "lastUserWhoInteracted"> & {
  lastUserWhoInteractedId: string;
  totalUsersWhoMadeMoves: number;
};

export type IMakeMoveDto = {
  move: NxNMove;
  lastSeenSolution: string;
};