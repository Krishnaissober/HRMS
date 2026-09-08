export type CalendarEventInput = {
  subject: string;
  startsAt: Date;
  endsAt: Date;
  timezone: string;
  attendees: string[];
  location?: string;
  meetingLink?: string;
};

export interface CalendarProvider {
  createEvent(input: CalendarEventInput): Promise<{ externalId: string }>;
  updateEvent(externalId: string, input: CalendarEventInput): Promise<void>;
  cancelEvent(externalId: string): Promise<void>;
}

class UnconfiguredCalendarProvider implements CalendarProvider {
  async createEvent(input: CalendarEventInput): Promise<{ externalId: string }> {
    void input;
    throw new Error("Calendar integration is not configured");
  }
  async updateEvent(externalId: string, input: CalendarEventInput): Promise<void> {
    void externalId;
    void input;
    throw new Error("Calendar integration is not configured");
  }
  async cancelEvent(externalId: string): Promise<void> {
    void externalId;
    throw new Error("Calendar integration is not configured");
  }
}

export function calendarProvider(): CalendarProvider {
  return new UnconfiguredCalendarProvider();
}
