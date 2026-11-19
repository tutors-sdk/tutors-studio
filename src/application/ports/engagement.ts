/**
 * How students used a published course (ADR 0050): per week, how many opened it and for how long, read
 * from Tutors' time data for an educator Tutors lets read it. Counts only: nothing here can name a student.
 * The default adapter is `none`, which reads nothing, so every journey runs the same with or without it.
 */
export interface WeekEngagement {
  /** The week's folder in the course. */
  path: string;
  /** How many students opened something in it. */
  students: number;
  /** The time they spent in it, all together, in minutes. */
  minutes: number;
}

export interface EngagementPort {
  /** Each week's figures for the course this adapter was bound to; null when there are none to read. */
  weeks(): Promise<WeekEngagement[] | null>;
}
