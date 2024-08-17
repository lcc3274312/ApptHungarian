import { ApptData } from "./app.model";

interface OptimizationResult {
  matchedAppointments: ApptData[];
  unmatchedUsers: string[];
}

export class AppointmentOptimizer {
  private apptData: ApptData[];
  private users: Set<string>;

  constructor(apptData: ApptData[]) {
      this.apptData = apptData;
      this.users = new Set(apptData.flatMap(data => data.users));
  }

  optimize(): OptimizationResult {
      const graph: Map<string, Date[]> = new Map();

      // Build the graph
      for (const user of this.users) {
          graph.set(user, this.apptData
              .filter(data => data.users.includes(user))
              .map(data => data.apptTime)
          );
      }

      const matches = this.hungarianAlgorithm(graph);
      return this.createOptimizationResult(matches);
  }

  private hungarianAlgorithm(graph: Map<string, Date[]>): Map<string, Date | null> {
      const matches = new Map<string, Date | null>();
      const used = new Set<string>();

      for (const [user, times] of graph.entries()) {
          this.findMatch(user, times, used, new Set(), matches);
      }

      return matches;
  }

  private findMatch(
      user: string,
      times: Date[],
      used: Set<string>,
      seen: Set<string>,
      matches: Map<string, Date | null>
  ): boolean {
      seen.add(user);

      for (const time of times) {
          const timeStr = time.toISOString();
          if (!used.has(timeStr)) {
              used.add(timeStr);
              matches.set(user, time);
              return true;
          }

          for (const [otherUser, otherTime] of matches.entries()) {
              if (otherTime && otherTime.getTime() === time.getTime() && !seen.has(otherUser)) {
                  if (this.findMatch(otherUser, graph.get(otherUser) || [], used, seen, matches)) {
                      used.add(timeStr);
                      matches.set(user, time);
                      return true;
                  }
              }
          }
      }

      matches.set(user, null);
      return false;
  }

  private createOptimizationResult(matches: Map<string, Date | null>): OptimizationResult {
      const matchedAppointments: ApptData[] = [];
      const unmatchedUsers: string[] = [];

      for (const [user, time] of matches.entries()) {
          if (time) {
              const existingAppt = matchedAppointments.find(appt => appt.apptTime.getTime() === time.getTime());
              if (existingAppt) {
                  existingAppt.users.push(user);
              } else {
                  matchedAppointments.push({ apptTime: time, users: [user] });
              }
          } else {
              unmatchedUsers.push(user);
          }
      }

      // Sort matchedAppointments by apptTime
      matchedAppointments.sort((a, b) => a.apptTime.getTime() - b.apptTime.getTime());

      return { matchedAppointments, unmatchedUsers };
  }
}
