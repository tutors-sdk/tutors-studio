/** What a week's engagement says beside it (STU-0201): counts only, never a name. */
export function engagementWords(figures: { students: number; minutes: number }): string {
  const students = figures.students === 1 ? "1 student" : `${figures.students} students`;
  const hours = Math.floor(figures.minutes / 60);
  const minutes = Math.round(figures.minutes % 60);
  const time = hours === 0 ? `${minutes} min` : minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`;
  return `Opened by ${students}, ${time} in all`;
}
