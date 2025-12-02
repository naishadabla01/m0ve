// components/PastEventsComponent.tsx - Past Events Section
import React from 'react';
import { EventListSection } from './EventListSection';
import { Event } from '../types';

interface PastEventsComponentProps {
  events: Event[];
  onShowDetails: (event: Event) => void;
}

export function PastEventsComponent({ events, onShowDetails }: PastEventsComponentProps) {
  return (
    <EventListSection
      title="Past Events"
      events={events}
      onShowDetails={onShowDetails}
      isPast={true}
      emptyIcon="📅"
      emptyMessage="No past events yet"
    />
  );
}
