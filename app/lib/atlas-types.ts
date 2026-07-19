export type CalendarItem = {
  id: string;
  date: string;
  time?: string;
  title: string;
  area: string;
  categoryLabel?: string;
  colorId?: string;
  colorName?: CalendarColorName;
  allDay?: boolean;
  repeat?: CalendarRepeat;
  reminder?: CalendarReminder;
  notes?: string;
  linkedType?: CalendarLinkType;
  linkedId?: string;
  linkedName?: string;
  completed?: boolean;

  // Stores completion separately for each recurring occurrence.
  completedDates?: string[];

  source?: CalendarSource;
  originalId?: string;
  instanceId?: string;
  status?: ServiceStatus;
};
