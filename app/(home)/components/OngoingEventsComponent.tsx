// components/OngoingEventsComponent.tsx - Ongoing Events Section
import React from 'react';
import { EventListSection } from './EventListSection';
import { Event } from '../types';

interface OngoingEventsComponentProps {
  events: Event[];
  onShowDetails: (event: Event) => void;
}

export function OngoingEventsComponent({ events, onShowDetails }: OngoingEventsComponentProps) {
  return (
    <EventListSection
      title="Ongoing Events"
      events={events}
      onShowDetails={onShowDetails}
      isPast={false}
      emptyIcon="🎉"
      emptyMessage="No ongoing events right now"
    />
  );
}
