import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ItineraryView, DetailSubTab } from '@/components/views/ItineraryView';
import { INITIAL_DAYS } from '@/lib/seed-data';

describe('ItineraryView Comprehensive Render Test', () => {
  it('renders ItineraryView Screen 1 (List) without crashing with initial days', () => {
    const html = renderToStaticMarkup(
      React.createElement(ItineraryView, {
        days: INITIAL_DAYS,
        expenses: [],
        selectedDayIndex: 0,
        initialView: 'list',
        onSelectDayIndex: () => {},
        onEditDay: () => {},
        onAddTask: () => {},
        onToggleTask: () => {},
        onAddExpenseForDate: () => {},
        onReloadSample: () => {},
      })
    );

    expect(html).toContain('Itinerary');
    expect(html).toContain('All Days');
    expect(html).toContain('By Place');
    expect(html).toContain('By Jyotirlinga');
    expect(html).toContain('Hyderabad');
    expect(html).toContain('Shirdi');
  });

  it('renders ItineraryView without crashing when days have empty tasks or no tasks', () => {
    const daysWithoutTasks = INITIAL_DAYS.map(d => {
      const { tasks, ...rest } = d;
      return rest as any;
    });

    const html = renderToStaticMarkup(
      React.createElement(ItineraryView, {
        days: daysWithoutTasks,
        expenses: [],
        selectedDayIndex: 0,
        initialView: 'list',
        onSelectDayIndex: () => {},
        onEditDay: () => {},
        onAddTask: () => {},
        onToggleTask: () => {},
        onAddExpenseForDate: () => {},
        onReloadSample: () => {},
      })
    );

    expect(html).toContain('Itinerary');
  });

  it('renders Screen 2: Day Details Plan Tab without crashing', () => {
    const html = renderToStaticMarkup(
      React.createElement(ItineraryView, {
        days: INITIAL_DAYS,
        expenses: [],
        selectedDayIndex: 0,
        initialView: 'details',
        defaultSubTab: 'plan',
        onSelectDayIndex: () => {},
        onEditDay: () => {},
        onAddTask: () => {},
        onToggleTask: () => {},
        onAddExpenseForDate: () => {},
        onReloadSample: () => {},
      })
    );

    expect(html).toContain('Day 1');
    expect(html).toContain('Plan');
    expect(html).toContain('Add Activity');
    expect(html).toContain('Hyderabad');
    expect(html).toContain('Shirdi');
  });

  it('renders Screen 3: Route Map Tab without crashing', () => {
    const html = renderToStaticMarkup(
      React.createElement(ItineraryView, {
        days: INITIAL_DAYS,
        expenses: [],
        selectedDayIndex: 0,
        initialView: 'details',
        defaultSubTab: 'map',
        onSelectDayIndex: () => {},
        onEditDay: () => {},
        onAddTask: () => {},
        onToggleTask: () => {},
        onAddExpenseForDate: () => {},
        onReloadSample: () => {},
      })
    );

    expect(html).toContain('View on Google Maps');
    expect(html).toContain('Route:');
  });

  it('renders Screen 4: Checklist Tab without crashing', () => {
    const html = renderToStaticMarkup(
      React.createElement(ItineraryView, {
        days: INITIAL_DAYS,
        expenses: [],
        selectedDayIndex: 0,
        initialView: 'details',
        defaultSubTab: 'checklist',
        onSelectDayIndex: () => {},
        onEditDay: () => {},
        onAddTask: () => {},
        onToggleTask: () => {},
        onAddExpenseForDate: () => {},
        onReloadSample: () => {},
      })
    );

    expect(html).toContain('Day 1 Checklist');
    expect(html).toContain('Add Checklist Item');
  });

  it('renders Notes Tab without crashing', () => {
    const html = renderToStaticMarkup(
      React.createElement(ItineraryView, {
        days: INITIAL_DAYS,
        expenses: [],
        selectedDayIndex: 0,
        initialView: 'details',
        defaultSubTab: 'notes',
        onSelectDayIndex: () => {},
        onEditDay: () => {},
        onAddTask: () => {},
        onToggleTask: () => {},
        onAddExpenseForDate: () => {},
        onReloadSample: () => {},
      })
    );

    expect(html).toContain('Notes &amp; Tips');
  });

  it('handles empty days array gracefully', () => {
    const html = renderToStaticMarkup(
      React.createElement(ItineraryView, {
        days: [],
        expenses: [],
        selectedDayIndex: 0,
        onSelectDayIndex: () => {},
        onEditDay: () => {},
        onAddTask: () => {},
        onToggleTask: () => {},
        onAddExpenseForDate: () => {},
        onReloadSample: () => {},
      })
    );

    expect(html).toContain('No Itinerary Days Planned Yet');
  });

  it('handles out of bounds selectedDayIndex gracefully by displaying safe Day Not Found state', () => {
    const html = renderToStaticMarkup(
      React.createElement(ItineraryView, {
        days: INITIAL_DAYS,
        expenses: [],
        selectedDayIndex: 999,
        initialView: 'details',
        onSelectDayIndex: () => {},
        onEditDay: () => {},
        onAddTask: () => {},
        onToggleTask: () => {},
        onAddExpenseForDate: () => {},
        onReloadSample: () => {},
      })
    );

    expect(html).toContain('Day Not Found');
  });
});
